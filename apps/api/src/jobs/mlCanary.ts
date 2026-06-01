import { IndicatorDataType } from "@prisma/client";
import { scoreBatch, scoreSubmission } from "../services/mlService";

const ensureFinite = (value: number, field: string) => {
  if (!Number.isFinite(value)) {
    throw new Error(`Non-finite numeric value for ${field}`);
  }
};

const runCanary = async () => {
  const series = [10, 11, 9, 12, 10, 11, 200];

  const single = await scoreSubmission({
    indicatorId: 0,
    dataType: IndicatorDataType.NUMBER,
    values: series.slice(0, -1),
    newValue: series[series.length - 1],
    config: {
      method: "ISOLATION_FOREST",
      contamination: 0.05,
      windowSize: 50,
      minPoints: 3,
      seed: 42,
    },
  });

  if (typeof single.isAnomaly !== "boolean") {
    throw new Error("Invalid canary response: isAnomaly must be boolean");
  }
  ensureFinite(single.score, "single.score");
  ensureFinite(single.threshold, "single.threshold");
  if (!single.method) {
    throw new Error("Invalid canary response: method is required");
  }

  const batch = await scoreBatch({
    indicatorId: 0,
    dataType: IndicatorDataType.NUMBER,
    values: series,
    config: {
      method: "ISOLATION_FOREST",
      contamination: 0.05,
      windowSize: 50,
      minPoints: 3,
      seed: 42,
    },
  });

  if (!Array.isArray(batch.results) || batch.results.length !== series.length) {
    throw new Error("Invalid canary batch response: results shape mismatch");
  }

  batch.results.forEach((result, idx) => {
    if (typeof result.isAnomaly !== "boolean") {
      throw new Error(`Invalid canary batch result at index ${idx}: isAnomaly`);
    }
    ensureFinite(result.score, `batch[${idx}].score`);
    ensureFinite(result.threshold, `batch[${idx}].threshold`);
    if (!result.method) {
      throw new Error(`Invalid canary batch result at index ${idx}: method`);
    }
  });

  console.log(
    JSON.stringify({
      status: "ok",
      checkedAt: new Date().toISOString(),
      single,
      batchSummary: {
        count: batch.results.length,
        anomalies: batch.results.filter((r) => r.isAnomaly).length,
      },
    }),
  );
};

if (require.main === module) {
  runCanary().catch((error) => {
    console.error("ML canary failed", error);
    process.exit(1);
  });
}

// Runs a health check on the ML anomaly service
export { runCanary };
