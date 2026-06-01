import { prisma } from "../prisma";
import { IndicatorDataType, Prisma } from "@prisma/client";
import { normalizeAnomalyConfig } from "../services/anomalyConfig";
import { scoreBatch } from "../services/mlService";
import { config } from "../config/env";

const isNumericDataType = (dataType: IndicatorDataType) =>
  dataType === "NUMBER" ||
  dataType === "PERCENT";

const DEFAULT_LIMIT = 200;

const runBackfill = async () => {
  const indicators = await prisma.indicator.findMany({
    where: {
      anomalyConfig: { not: Prisma.JsonNull },
    },
    orderBy: { id: "asc" },
  });

  for (const indicator of indicators) {
    if (!isNumericDataType(indicator.dataType)) continue;
    try {
      const anomalyConfig = normalizeAnomalyConfig(
        (indicator.anomalyConfig as any) ?? null,
      );

      if (!anomalyConfig.enabled || anomalyConfig.mode !== "ML") continue;

      const windowSize = anomalyConfig.ml?.windowSize ?? DEFAULT_LIMIT;
      const minPoints = anomalyConfig.ml?.minPoints ?? 20;
      const limit = Math.max(windowSize, minPoints);

      const recentDesc = await prisma.submission.findMany({
        where: { indicatorId: indicator.id, deletedAt: null } as any,
        orderBy: { reportedAt: "desc" },
        take: limit,
      });
      const submissions = [...recentDesc].reverse();
      const scoredSubmissions = submissions
        .map((s) => ({ submission: s, value: Number(s.value) }))
        .filter((item) => Number.isFinite(item.value));
      const values = scoredSubmissions.map((item) => item.value);

      if (values.length < minPoints) {
        console.log(
          `anomalyBackfill skip indicator=${indicator.id} reason=insufficient_data observed=${values.length} required=${minPoints}`,
        );
        continue;
      }

      const { results } = await scoreBatch({
        indicatorId: indicator.id,
        dataType: indicator.dataType,
        values,
        config: {
          method: anomalyConfig.ml?.method ?? "ISOLATION_FOREST",
          contamination: anomalyConfig.ml?.contamination ?? 0.05,
          windowSize: anomalyConfig.ml?.windowSize ?? 50,
          minPoints,
          seed: anomalyConfig.ml?.seed ?? 42,
        },
      });

      const attemptedAt = new Date().toISOString();
      const updates = scoredSubmissions.map((item, i) => {
        const result = results[i];
        return prisma.submission.update({
          where: { id: item.submission.id },
          data: {
            isAnomaly: result.isAnomaly,
            anomalyReason: result.reason,
            anomalyStatus: result.isAnomaly ? "DETECTED" : null,
            anomalyScore: result.score,
            anomalyThreshold: result.threshold,
            anomalyMethod: result.method,
            anomalyMeta: {
              ...(result.meta ?? {}),
              mlValidation: {
                status: "ML_OK",
                attemptedAt,
                source: "BACKFILL",
              },
            } as any,
          },
        });
      });

      for (let i = 0; i < updates.length; i += config.anomalyBackfillBatchSize) {
        const batch = updates.slice(i, i + config.anomalyBackfillBatchSize);
        await prisma.$transaction(batch);
      }

      console.log(
        `anomalyBackfill indicator=${indicator.id} processed=${updates.length}`,
      );
    } catch (error) {
      console.error(`anomalyBackfill indicator=${indicator.id} failed`, error);
    }
  }
};

if (require.main === module) {
  runBackfill()
    .then(() => {
      console.log("Anomaly backfill complete");
      return prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error("Anomaly backfill failed", error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

// Runs ML anomaly detection on all enabled indicators
export { runBackfill };
