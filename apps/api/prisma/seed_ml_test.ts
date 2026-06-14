import {
  IndicatorDataType,
  NodeType,
  PrismaClient,
  ProjectStatus,
  Role,
} from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

export async function main() {
  console.log("🚀 Starting ML Testing Seed...");

  // 1. Get or create seed organization
  const ORG_NAME = "Seed Test Organization";
  let org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: ORG_NAME } });
    console.log(`✓ Created missing organization: ${ORG_NAME}`);
  }
  const orgId = org.id;
  console.log(`✓ Using Organization: ${org.name}`);

  // 2. Get or create Admin user
  const adminEmail = "admin@gmail.com";
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminUser) {
    const passwordHash = await hashPassword("admin1234");
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        name: "ML Testing Admin",
        organizationId: orgId,
      },
    });
    console.log(`✓ Created User: ${adminEmail}`);
  }

  // 3. Create ML Validation Project
  const projectName = "ML Service Validation Project";
  let project = await prisma.project.findFirst({ where: { name: projectName } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: projectName,
        description: "A project dedicated to testing and validating anomaly detection algorithms.",
        status: ProjectStatus.ACTIVE,
        startDate: new Date("2026-01-01"),
        organizationId: orgId,
      },
    });
    console.log(`✓ Created Project: ${projectName}`);
  }

  // 4. Create Logframe Node
  let node = await prisma.logframeNode.findFirst({ 
    where: { projectId: project.id, title: "ML Testing Node" } 
  });
  if (!node) {
    node = await prisma.logframeNode.create({
      data: {
        projectId: project.id,
        type: NodeType.OUTCOME,
        title: "ML Testing Node",
        description: "Node for high-density testing indicators",
      },
    });
    console.log(`✓ Created Logframe Node: ML Testing Node`);
  }

  // 5. Create ML Testing Indicators
  const indicatorConfigs = [
    {
      name: "High-Density Productivity Score",
      unit: "points",
      baselineValue: 50,
      targetValue: 90,
      anomalyConfig: {
        enabled: true,
        mode: "ML",
        ml: {
          method: "ISOLATION_FOREST",
          contamination: 0.05,
          minPoints: 10,
          windowSize: 100,
          seed: 42,
        },
        fallback: {
          useRangeChecks: true,
          useRulesWhenInsufficientData: true,
          useRulesOnServiceError: true,
        },
      },
      dataPattern: "productivity"
    },
    {
      name: "Health Facility Attendance Rate",
      unit: "visits",
      baselineValue: 120,
      targetValue: 200,
      anomalyConfig: {
        enabled: true,
        mode: "ML",
        ml: {
          method: "Z_SCORE",
          contamination: 0.03,
          minPoints: 15,
          windowSize: 50,
          zscore_threshold: 3.0,
          seed: 42,
        },
        fallback: {
          useRangeChecks: true,
          useRulesWhenInsufficientData: true,
          useRulesOnServiceError: true,
        },
      },
      dataPattern: "health"
    },
    {
      name: "School Enrollment Count",
      unit: "students",
      baselineValue: 300,
      targetValue: 500,
      anomalyConfig: {
        enabled: true,
        mode: "ML",
        ml: {
          method: "LOF",
          contamination: 0.08,
          minPoints: 20,
          windowSize: 80,
          seed: 42,
        },
        fallback: {
          useRangeChecks: true,
          useRulesWhenInsufficientData: true,
          useRulesOnServiceError: true,
        },
      },
      dataPattern: "education"
    },
    {
      name: "Water Point Functionality Index",
      unit: "index",
      baselineValue: 75,
      targetValue: 95,
      anomalyConfig: {
        enabled: true,
        mode: "ML",
        ml: {
          method: "DBSCAN",
          contamination: 0.04,
          minPoints: 25,
          windowSize: 60,
          seed: 42,
        },
        fallback: {
          useRangeChecks: true,
          useRulesWhenInsufficientData: true,
          useRulesOnServiceError: true,
        },
      },
      dataPattern: "wash"
    },
    {
      name: "Monthly Revenue Collection",
      unit: "NPR",
      baselineValue: 5000,
      targetValue: 10000,
      anomalyConfig: {
        enabled: true,
        mode: "ML",
        ml: {
          method: "ISOLATION_FOREST",
          contamination: 0.02,
          minPoints: 10,
          windowSize: 120,
          seed: 42,
        },
        fallback: {
          useRangeChecks: true,
          useRulesWhenInsufficientData: true,
          useRulesOnServiceError: true,
        },
      },
      dataPattern: "finance"
    }
  ];

  const indicators: { indicator: { id: number; name: string }; dataPattern: string; baselineValue: number }[] = [];
  for (const cfg of indicatorConfigs) {
    let indicator = await prisma.indicator.findFirst({ 
      where: { projectId: project.id, name: cfg.name } 
    });
    if (!indicator) {
      indicator = await prisma.indicator.create({
        data: {
          projectId: project.id,
          logframeNodeId: node.id,
          name: cfg.name,
          unit: cfg.unit,
          dataType: IndicatorDataType.NUMBER,
          baselineValue: cfg.baselineValue,
          targetValue: cfg.targetValue,
          createdByUserId: adminUser.id,
          anomalyConfig: cfg.anomalyConfig
        },
      });
      console.log(`✓ Created Indicator: ${cfg.name}`);
    }
    indicators.push({ ...cfg, indicator });
  }

  // 6. Generate submissions for each indicator
  const baseDate = new Date("2026-01-01");

  function generateData(pattern: string, i: number, baseline: number): number {
    let value = baseline + (Math.random() * 6 - 3);

    switch (pattern) {
      case "productivity":
        if (i > 30) value += (i - 30) * 0.5;
        if (i === 15) value = baseline + 25;
        if (i === 42) value = baseline + 60;
        if (i === 55) value = baseline - 25;
        break;
      case "health":
        if (i % 30 < 5) value += 20;
        if (i === 20) value = baseline + 80;
        if (i === 75) value = baseline - 40;
        if (i === 100) value = 0;
        break;
      case "education":
        if (i > 50) value += (i - 50) * 0.3;
        if (i === 25) value = baseline + 100;
        if (i === 60) value = baseline - 50;
        if (i === 90) value = baseline + 150;
        break;
      case "wash":
        value = baseline + Math.sin(i / 10) * 10;
        if (i === 35) value = baseline - 40;
        if (i === 80) value = baseline + 35;
        break;
      case "finance":
        if (i > 40) value += (i - 40) * 1.2;
        if (i === 10) value = baseline * 2.5;
        if (i === 50) value = baseline * 0.1;
        if (i === 120) value = baseline * 3;
        break;
    }

    return value;
  }

  for (const { indicator, dataPattern, baselineValue } of indicators) {
    console.log(`📊 Generating data for "${indicator.name}"...`);
    const submissions: { indicatorId: number; reportedAt: Date; value: string; createdByUserId: number; evidence: string; isAnomaly: boolean }[] = [];

    for (let i = 0; i < 250; i++) {
      const reportedAt = new Date(baseDate);
      reportedAt.setDate(baseDate.getDate() + i);

      const value = generateData(dataPattern, i, baselineValue);

      submissions.push({
        indicatorId: indicator.id,
        reportedAt,
        value: value.toFixed(2),
        createdByUserId: adminUser.id,
        evidence: `Daily automated score - Day ${i + 1}`,
        isAnomaly: false,
      });
    }

    let count = 0;
    for (const sub of submissions) {
      await prisma.submission.upsert({
        where: {
          indicatorId_reportedAt_disaggregationKey: {
            indicatorId: sub.indicatorId,
            reportedAt: sub.reportedAt,
            disaggregationKey: "",
          },
        },
        update: sub,
        create: sub,
      });
      count++;
    }

    console.log(`✅ Seeded ${count} entries for indicator "${indicator.name}"`);
  }

  console.log(`🔗 Project ID: ${project.id}`);
  console.log(`🔗 Indicator IDs: ${indicators.map(i => i.indicator.id).join(", ")}`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} else {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
