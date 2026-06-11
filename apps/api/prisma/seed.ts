import {
  IndicatorDataType,
  NodeType,
  Prisma,
  PrismaClient,
  ProjectStatus,
  Role,
} from "@prisma/client";
import { hashPassword } from "../src/utils/password";
import { seedInventory } from "./seed_inventory";
import { seedSalesInvoices } from "./seed_sales_invoices";
import { main as seedMlTest } from "./seed_ml_test";

const prisma = new PrismaClient();

// Static seed credentials so reseeding doesn't depend on .env
const SEED_ADMIN_EMAIL = "admin@gmail.com";
const SEED_ADMIN_PASSWORD = "admin1234";

// Nepal's 77 districts for realistic disaggregation data
const NEPAL_DISTRICTS = [
  "Kathmandu",
  "Lalitpur",
  "Bhaktapur",
  "Kavrepalanchok",
  "Sindhupalchok",
  "Dhading",
  "Nuwakot",
  "Rasuwa",
  "Makwanpur",
  "Chitwan",
  "Pokhara",
  "Kaski",
  "Syangja",
  "Tanahu",
  "Lamjung",
  "Gorkha",
  "Manang",
  "Mustang",
  "Parbat",
  "Baglung",
  "Myagdi",
  "Beni",
  "Nawalparasi East",
  "Nawalparasi West",
  "Rupandehi",
  "Kapilvastu",
  "Palpa",
  "Arghakhanchi",
  "Gulmi",
  "Pyuthan",
  "Rolpa",
  "Rukum East",
  "Rukum West",
  "Salyan",
  "Dang",
  "Banke",
  "Bardiya",
  "Surkhet",
  "Dailekh",
  "Jajarkot",
  "Dolpa",
  "Jumla",
  "Kalikot",
  "Mugu",
  "Humla",
  "Bajura",
  "Bajhang",
  "Achham",
  "Doti",
  "Kailali",
  "Kanchanpur",
  "Dadeldhura",
  "Baitadi",
  "Darchula",
  "Mahottari",
  "Dhanusha",
  "Siraha",
  "Saptari",
  "Sunsari",
  "Morang",
  "Jhapa",
  "Ilam",
  "Panchthar",
  "Taplejung",
  "Sankhuwasabha",
  "Terhathum",
  "Dhankuta",
  "Bhojpur",
  "Solukhumbu",
  "Okhaldhunga",
  "Khotang",
  "Udayapur",
  "Sarlahi",
  "Rautahat",
  "Bara",
  "Parsa",
  "Sindhuli",
];

type NodeKey = "goal" | "outcome" | "output" | "activity";

type SeedProject = {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date | null;
  nodes: Record<NodeKey, { title: string; description?: string }>;
  indicators: Array<{
    nodeKey: NodeKey;
    name: string;
    unit: string;
    dataType: IndicatorDataType;
    baselineValue?: number | null;
    targetValue?: number | null;
    baselineCategory?: string | null;
    targetCategory?: string | null;
    minValue?: number | null;
    maxValue?: number | null;
    anomalyConfig?: {
      enabled?: boolean;
      mode?: "RULES" | "ML";
      ml?: {
        method?: "ISOLATION_FOREST";
        contamination?: number;
        windowSize?: number;
        minPoints?: number;
        seed?: number;
      };
      fallback?: {
        useRangeChecks?: boolean;
        useRulesWhenInsufficientData?: boolean;
        useRulesOnServiceError?: boolean;
      };
    };
    categories?: Array<{ id: string; label: string; color?: string }>;
    categoryConfig?: {
      allowMultiple?: boolean;
      required?: boolean;
      disaggregationDimensions?: Array<{
        key: string;
        label: string;
        values: string[];
      }>;
      expectedReportingEntities?: number;
    };
  }>;
};

const createLogframeAndIndicators = async (
  projectId: number,
  project: SeedProject,
  createdByUserId: number,
  organizationId: number,
) => {
  const existingNode = await prisma.logframeNode.findFirst({
    where: { projectId },
  });
  if (!existingNode) {
    const goal = await prisma.logframeNode.create({
      data: {
        projectId,
        type: NodeType.GOAL,
        title: project.nodes.goal.title,
        description: project.nodes.goal.description ?? null,
        sortOrder: 1,
      },
    });

    const outcome = await prisma.logframeNode.create({
      data: {
        projectId,
        type: NodeType.OUTCOME,
        title: project.nodes.outcome.title,
        description: project.nodes.outcome.description ?? null,
        parentId: goal.id,
        sortOrder: 2,
      },
    });

    const output = await prisma.logframeNode.create({
      data: {
        projectId,
        type: NodeType.OUTPUT,
        title: project.nodes.output.title,
        description: project.nodes.output.description ?? null,
        parentId: outcome.id,
        sortOrder: 3,
      },
    });

    const activity = await prisma.logframeNode.create({
      data: {
        projectId,
        type: NodeType.ACTIVITY,
        title: project.nodes.activity.title,
        description: project.nodes.activity.description ?? null,
        parentId: output.id,
        sortOrder: 4,
      },
    });

    const nodeIds: Record<NodeKey, number> = {
      goal: goal.id,
      outcome: outcome.id,
      output: output.id,
      activity: activity.id,
    };

    const existingIndicators = await prisma.indicator.findFirst({
      where: { projectId },
    });
    if (!existingIndicators) {
      await prisma.indicator.createMany({
        data: project.indicators.map((indicator) => ({
          projectId,
          logframeNodeId: nodeIds[indicator.nodeKey],
          name: indicator.name,
          unit: indicator.unit,
          baselineValue: indicator.baselineValue ?? null,
          targetValue: indicator.targetValue ?? null,
          baselineCategory: indicator.baselineCategory ?? null,
          targetCategory: indicator.targetCategory ?? null,
          dataType: indicator.dataType,
          minValue: indicator.minValue ?? null,
          maxValue: indicator.maxValue ?? null,
          anomalyConfig: indicator.anomalyConfig ? (indicator.anomalyConfig as any) : null,
          categories: indicator.categories as any,
          categoryConfig: indicator.categoryConfig as any,
          createdByUserId,
        })),
      });
    }

    return;
  }

  const existingIndicators = await prisma.indicator.findFirst({
    where: { projectId },
  });
  if (!existingIndicators) {
    console.log(
      `Indicators missing for project ${project.name}, but logframe exists; add manually if needed.`,
    );
  }
};

// Generate realistic submission data for 3+ months
const generateSubmissionsForIndicator = async (
  indicatorId: number,
  indicator: SeedProject["indicators"][0],
  userId: number,
  startDate: Date,
) => {
  const submissions: any[] = [];

  if (
    indicator.dataType === IndicatorDataType.CATEGORICAL &&
    indicator.categoryConfig?.disaggregationDimensions
  ) {
    const dimension = indicator.categoryConfig.disaggregationDimensions[0];
    const categoryIds = indicator.categories?.map((c) => c.id) || [];

    // Generate 4 months of data (October 2025 - January 2026)
    for (let month = 0; month < 4; month++) {
      const reportDate = new Date(startDate);
      reportDate.setMonth(reportDate.getMonth() + month);
      reportDate.setDate(15); // Mid-month reporting

      // Each district reports (with some random missing for realism)
      for (const districtValue of dimension.values) {
        // 85% reporting compliance (some districts don't report each month)
        if (Math.random() > 0.15) {
          // Weight towards positive categories as time progresses
          let categoryValue: string;
          const progress = month / 3; // 0 to 1

          if (indicator.name.includes("Infrastructure")) {
            const rand = Math.random();
            if (rand < 0.15 + progress * 0.4) categoryValue = "completed";
            else if (rand < 0.5 + progress * 0.2) categoryValue = "ongoing";
            else if (rand < 0.85) categoryValue = "delayed";
            else categoryValue = "not_started";
          } else if (indicator.name.includes("Health Facility")) {
            const rand = Math.random();
            if (rand < 0.25 + progress * 0.3)
              categoryValue = "fully_operational";
            else if (rand < 0.8) categoryValue = "partial";
            else categoryValue = "non_operational";
          } else {
            // Agricultural extension
            const rand = Math.random();
            if (rand < 0.2 + progress * 0.25) categoryValue = "comprehensive";
            else if (rand < 0.45 + progress * 0.2) categoryValue = "moderate";
            else if (rand < 0.85) categoryValue = "limited";
            else categoryValue = "none";
          }

          const numericValue = (Math.random() * 100).toFixed(2);
          submissions.push({
            indicatorId,
            reportedAt: reportDate,
            value: numericValue,
            categoryValue,
            disaggregationKey: districtValue,
            evidence: `Monthly report from ${districtValue} - ${reportDate.toLocaleString("default", { month: "long", year: "numeric" })}`,
            createdByUserId: userId,
          });
        }
      }
    }
  } else if (
    indicator.dataType === IndicatorDataType.PERCENT ||
    indicator.dataType === IndicatorDataType.NUMBER
  ) {
    const mlConfig = indicator.anomalyConfig?.mode === "ML" ? indicator.anomalyConfig.ml : undefined;
    const isMlIndicator = Boolean(mlConfig && indicator.anomalyConfig?.mode === "ML");

    if (isMlIndicator) {
      const minimumPoints = mlConfig?.minPoints ?? 20;
      const windowSize = mlConfig?.windowSize ?? 50;
      const points = Math.max(minimumPoints * 2, windowSize, 30);

      for (let day = 0; day < points; day++) {
        const reportDate = new Date(startDate);
        reportDate.setDate(startDate.getDate() + day);

        const baseline = indicator.baselineValue || 0;
        const target = indicator.targetValue || 100;
        const progress = Math.min(day / points, 1);

        const value =
          baseline +
          (target - baseline) * progress * 0.6 +
          (Math.random() * 10 - 5);

        submissions.push({
          indicatorId,
          reportedAt: reportDate,
          value: value.toFixed(2),
          evidence: `Automated ML training report - Day ${day + 1}`,
          createdByUserId: userId,
        });
      }
    } else {
      // Generate monthly aggregate data for numeric indicators
      for (let month = 0; month < 4; month++) {
        const reportDate = new Date(startDate);
        reportDate.setMonth(reportDate.getMonth() + month);
        reportDate.setDate(15);

        const baseline = indicator.baselineValue || 0;
        const target = indicator.targetValue || 100;
        const progress = month / 3;

        // Linear interpolation with some randomness
        const value =
          baseline +
          (target - baseline) * progress * 0.6 +
          (Math.random() * 10 - 5);

        submissions.push({
          indicatorId,
          reportedAt: reportDate,
          value: value.toFixed(2),
          evidence: `Aggregate monthly report - ${reportDate.toLocaleString("default", { month: "long", year: "numeric" })}`,
          createdByUserId: userId,
        });
      }
    }
  } else if (indicator.dataType === IndicatorDataType.CATEGORICAL) {
    // At least 1 month of data for categorical indicators without disaggregation
    const reportDate = new Date(startDate);
    reportDate.setDate(15);
    const categories = indicator.categories || [];
    const fallbackCategory = categories.length > 0 ? categories[0].id : "other";
    const categoryValue =
      categories.length > 0
        ? categories[Math.floor(Math.random() * categories.length)].id
        : fallbackCategory;
    const numericValue = (Math.random() * 100).toFixed(2);

    submissions.push({
      indicatorId,
      reportedAt: reportDate,
      value: numericValue,
      categoryValue,
      evidence: `Monthly report - ${reportDate.toLocaleString("default", { month: "long", year: "numeric" })}`,
      createdByUserId: userId,
    });
  }

  return submissions;
};

const seedProjects: SeedProject[] = [
  {
    name: "National Infrastructure Development Program",
    description:
      "Track infrastructure project status across all 77 districts of Nepal",
    status: ProjectStatus.ACTIVE,
    startDate: new Date("2025-10-01"),
    endDate: new Date("2026-09-30"),
    nodes: {
      goal: {
        title: "Complete infrastructure development nationwide",
        description:
          "Achieve 85% project completion rate across all districts.",
      },
      outcome: {
        title: "District-level infrastructure completion",
        description: "Track monthly progress and compliance across districts.",
      },
      output: {
        title: "Infrastructure projects operational",
        description: "Monitor project status and quality standards.",
      },
      activity: {
        title: "Monthly district reporting",
        description: "Districts submit monthly status reports.",
      },
    },
    indicators: [
      {
        nodeKey: "outcome",
        name: "District Infrastructure Project Status",
        unit: "status",
        dataType: IndicatorDataType.CATEGORICAL,
        baselineCategory: "not_started",
        targetCategory: "completed",
        categories: [
          { id: "completed", label: "Completed", color: "#10b981" },
          { id: "ongoing", label: "Ongoing", color: "#f59e0b" },
          { id: "delayed", label: "Delayed", color: "#ef4444" },
          { id: "not_started", label: "Not Started", color: "#6b7280" },
        ],
        categoryConfig: {
          allowMultiple: false,
          required: true,
          disaggregationDimensions: [
            {
              key: "district",
              label: "District",
              values: NEPAL_DISTRICTS,
            },
          ],
          expectedReportingEntities: 77,
        },
      },
      {
        nodeKey: "goal",
        name: "Overall Completion Rate",
        unit: "%",
        dataType: IndicatorDataType.PERCENT,
        baselineValue: 15,
        targetValue: 85,
        minValue: 0,
        maxValue: 100,
      },
      {
        nodeKey: "output",
        name: "Projects Meeting Quality Standards",
        unit: "projects",
        dataType: IndicatorDataType.NUMBER,
        baselineValue: 20,
        targetValue: 65,
        minValue: 0,
        maxValue: 77,
      },
    ],
  },
  {
    name: "Community Health Program - Province 1",
    description:
      "Monitor health service delivery across 14 districts in Province 1",
    status: ProjectStatus.ACTIVE,
    startDate: new Date("2025-09-01"),
    endDate: new Date("2027-08-31"),
    nodes: {
      goal: {
        title: "Improve health outcomes in Province 1",
        description: "Achieve 90% service coverage across all districts.",
      },
      outcome: {
        title: "Health facility operational status",
        description:
          "Track monthly health facility operations and service delivery.",
      },
      output: {
        title: "Healthcare workers trained",
        description: "Train and deploy healthcare workers across districts.",
      },
      activity: {
        title: "Monthly service delivery reporting",
        description: "Districts report on health service delivery monthly.",
      },
    },
    indicators: [
      {
        nodeKey: "outcome",
        name: "Health Facility Service Status",
        unit: "status",
        dataType: IndicatorDataType.CATEGORICAL,
        baselineCategory: "partial",
        targetCategory: "fully_operational",
        categories: [
          {
            id: "fully_operational",
            label: "Fully Operational",
            color: "#10b981",
          },
          { id: "partial", label: "Partial Services", color: "#f59e0b" },
          { id: "non_operational", label: "Non-Operational", color: "#ef4444" },
        ],
        categoryConfig: {
          allowMultiple: false,
          required: true,
          disaggregationDimensions: [
            {
              key: "district",
              label: "District",
              values: [
                "Jhapa",
                "Ilam",
                "Panchthar",
                "Taplejung",
                "Sankhuwasabha",
                "Terhathum",
                "Dhankuta",
                "Bhojpur",
                "Solukhumbu",
                "Okhaldhunga",
                "Khotang",
                "Udayapur",
                "Morang",
                "Sunsari",
              ],
            },
          ],
          expectedReportingEntities: 14,
        },
      },
      {
        nodeKey: "goal",
        name: "Service Coverage Rate",
        unit: "%",
        dataType: IndicatorDataType.PERCENT,
        baselineValue: 55,
        targetValue: 90,
        minValue: 0,
        maxValue: 100,
      },
    ],
  },
  {
    name: "Agricultural Productivity Enhancement - Terai Region",
    description: "Track agricultural interventions across 16 Terai districts",
    status: ProjectStatus.ACTIVE,
    startDate: new Date("2025-08-15"),
    endDate: new Date("2028-08-14"),
    nodes: {
      goal: {
        title: "Increase agricultural productivity in Terai",
        description: "Double crop yields through improved practices.",
      },
      outcome: {
        title: "Farmer adoption of improved practices",
        description: "Monitor adoption rates across districts.",
      },
      output: {
        title: "Extension services operational",
        description: "Track agricultural extension service delivery.",
      },
      activity: {
        title: "Monthly agricultural extension reporting",
        description:
          "Districts submit monthly progress on extension activities.",
      },
    },
    indicators: [
      {
        nodeKey: "outcome",
        name: "Extension Service Delivery Status",
        unit: "status",
        dataType: IndicatorDataType.CATEGORICAL,
        baselineCategory: "limited",
        targetCategory: "comprehensive",
        categories: [
          {
            id: "comprehensive",
            label: "Comprehensive Coverage",
            color: "#10b981",
          },
          { id: "moderate", label: "Moderate Coverage", color: "#3b82f6" },
          { id: "limited", label: "Limited Coverage", color: "#f59e0b" },
          { id: "none", label: "No Services", color: "#ef4444" },
        ],
        categoryConfig: {
          allowMultiple: false,
          required: true,
          disaggregationDimensions: [
            {
              key: "district",
              label: "District",
              values: [
                "Jhapa",
                "Morang",
                "Sunsari",
                "Saptari",
                "Siraha",
                "Dhanusha",
                "Mahottari",
                "Sarlahi",
                "Rautahat",
                "Bara",
                "Parsa",
                "Rupandehi",
                "Kapilvastu",
                "Banke",
                "Bardiya",
                "Kailali",
              ],
            },
          ],
          expectedReportingEntities: 16,
        },
      },
      {
        nodeKey: "goal",
        name: "Average Crop Yield Increase",
        unit: "%",
        dataType: IndicatorDataType.PERCENT,
        baselineValue: 0,
        targetValue: 100,
        minValue: -20,
        maxValue: 200,
        anomalyConfig: {
          enabled: true,
          mode: "ML",
          ml: {
            method: "ISOLATION_FOREST",
            contamination: 0.05,
            windowSize: 20,
            minPoints: 5,
            seed: 123,
          },
          fallback: {
            useRulesWhenInsufficientData: true,
            useRulesOnServiceError: true,
          },
        },
      },
    ],
  },
];

async function main() {
  const email = SEED_ADMIN_EMAIL;
  const password = SEED_ADMIN_PASSWORD;

  // Create or find seed Organization
  const ORG_NAME = 'Seed Test Organization';
  let seedOrg = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!seedOrg) {
    seedOrg = await prisma.organization.create({ data: { name: ORG_NAME } });
    console.log(`✓ Created seed organization: ${ORG_NAME}`);
  } else {
    console.log(`✓ Seed organization exists: ${ORG_NAME}`);
  }
  const orgId = seedOrg.id;

  // Get or create admin user in that org
  let adminUser = await prisma.user.findUnique({ where: { email } });
  if (!adminUser) {
    const passwordHash = await hashPassword(password);
    adminUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN,
        organizationId: orgId,
        name: 'Seed Admin',
      },
    });
    console.log(`✓ Seeded admin user ${email}`);
  } else {
    console.log(`✓ Admin user exists: ${email}`);
  }

  // Seed projects with indicators and submissions
  for (const project of seedProjects) {
    const existingProject = await prisma.project.findFirst({
      where: { name: project.name },
    });
    if (existingProject) {
      console.log(`⚠ Project already exists: ${project.name}`);
      continue;
    }

    const createdProject = await prisma.project.create({
      data: {
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate ?? null,
        organizationId: orgId,
      },
    });

    await createLogframeAndIndicators(createdProject.id, project, adminUser.id, orgId);
    console.log(`✓ Created project: ${project.name}`);

    // Generate submission data for all indicators
    const indicators = await prisma.indicator.findMany({
      where: { projectId: createdProject.id },
    });

    for (const indicator of indicators) {
      const indicatorConfig = project.indicators.find(
        (ind) => ind.name === indicator.name,
      );

      if (indicatorConfig) {
        const submissions = await generateSubmissionsForIndicator(
          indicator.id,
          indicatorConfig,
          adminUser.id,
          project.startDate,
        );

        if (submissions.length > 0) {
          // Use upsert to handle duplicates
          for (const submission of submissions) {
            await prisma.submission.upsert({
              where: {
                indicatorId_reportedAt_disaggregationKey: {
                  indicatorId: submission.indicatorId,
                  reportedAt: submission.reportedAt,
                  disaggregationKey: submission.disaggregationKey || "",
                },
              },
              create: submission,
              update: submission,
            });
          }
          console.log(
            `  ✓ Generated ${submissions.length} submissions for "${indicator.name}"`,
          );
        }
      }
    }
  }

  // Also seed the ML validation project and its high-density ML indicators
  await seedMlTest();

  // Seed the inventory demo data for the bamboo/linen company
  console.log("Seeding inventory demo data...")
  await seedInventory({ prisma, createdByUserId: adminUser.id });

  // Seed the sales demo data and finished-goods stock activity
  console.log("Seeding sales invoice demo data...")
  await seedSalesInvoices({ prisma, createdByUserId: adminUser.id });

  console.log("Seeding sales orders, expenses, and production orders...")
  await seedOperationalDocs(prisma, adminUser.id)

  console.log("\n✅ Database seeding complete!");
  console.log(`\n📊 Summary:`);
  console.log(`   - Projects: ${seedProjects.length}`);
  console.log(`   - Admin user: ${email} / ${password}`);
  console.log(`   - Data period: October 2025 - January 2026 (4 months)`);
}

async function seedOperationalDocs(prisma: PrismaClient, userId: number) {
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'asc' } })
  const finishedGoods = await prisma.finishedGoodProduct.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } })
  const boms = await prisma.billOfMaterials.findMany({ include: { items: { include: { rawMaterial: true } } } })
  const materials = await prisma.rawMaterial.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } })

  if (customers.length === 0 || finishedGoods.length === 0 || boms.length === 0 || materials.length === 0) {
    console.log('Skipping operational doc seed because prerequisite inventory records are missing.')
    return
  }

  const salesOrderSeeds = [
    {
      orderNumber: 'SO-2526-0001',
      customerId: customers[0].id,
      orderDate: new Date('2026-05-24T09:00:00.000Z'),
      requiredBy: new Date('2026-06-08T09:00:00.000Z'),
      notes: 'Wholesale restock for the spring capsule.',
      items: [
        { productId: finishedGoods[0].id, quantity: 6, unitPrice: Number(finishedGoods[0].sellingPrice), discountAmount: 0, taxAmount: 0 },
        { productId: finishedGoods[1].id, quantity: 3, unitPrice: Number(finishedGoods[1].sellingPrice), discountAmount: 0, taxAmount: 0 },
      ],
    },
    {
      orderNumber: 'SO-2526-0002',
      customerId: customers[1]?.id || customers[0].id,
      orderDate: new Date('2026-05-28T09:00:00.000Z'),
      requiredBy: new Date('2026-06-12T09:00:00.000Z'),
      notes: 'Lifestyle boutique order for linen program.',
      items: [
        { productId: finishedGoods[2]?.id || finishedGoods[0].id, quantity: 4, unitPrice: Number(finishedGoods[2]?.sellingPrice ?? finishedGoods[0].sellingPrice), discountAmount: 0, taxAmount: 0 },
        { productId: finishedGoods[3]?.id || finishedGoods[1].id, quantity: 2, unitPrice: Number(finishedGoods[3]?.sellingPrice ?? finishedGoods[1].sellingPrice), discountAmount: 0, taxAmount: 0 },
      ],
    },
  ]

  for (const order of salesOrderSeeds) {
    const existing = await prisma.salesOrder.findUnique({ where: { orderNumber: order.orderNumber } })
    if (existing) continue
    const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const created = await prisma.salesOrder.create({
      data: {
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        orderDate: order.orderDate,
        requiredBy: order.requiredBy,
        notes: order.notes,
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        grandTotal: subtotal,
        status: 'CONFIRMED',
        createdBy: userId,
        updatedBy: userId,
      },
    })
    await prisma.salesOrderItem.createMany({
      data: order.items.map((item, index) => ({
        id: `${order.orderNumber}-item-${index + 1}`,
        salesOrderId: created.id,
        productId: item.productId,
        productCode: finishedGoods.find((fg) => fg.id === item.productId)?.productCode || null,
        productName: finishedGoods.find((fg) => fg.id === item.productId)?.name || 'Product',
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        discountAmount: new Prisma.Decimal(item.discountAmount),
        taxAmount: new Prisma.Decimal(item.taxAmount),
        lineTotal: new Prisma.Decimal(item.quantity * item.unitPrice),
      })),
    })
    console.log(`✓ Seeded sales order ${order.orderNumber}`)
  }

  const expenseSeeds = [
    {
      expenseNumber: 'EXP-2526-0001',
      expenseDate: new Date('2026-05-20T09:00:00.000Z'),
      category: 'Factory Overhead',
      vendor: 'Kathmandu Utilities',
      description: 'Electricity bill for production floor.',
      amount: 18000,
      currency: 'NPR',
      status: 'PAID',
      paymentDate: new Date('2026-05-22T09:00:00.000Z'),
      notes: 'Allocated to factory overhead bucket.',
    },
    {
      expenseNumber: 'EXP-2526-0002',
      expenseDate: new Date('2026-05-23T09:00:00.000Z'),
      category: 'Production Labor',
      vendor: 'Payroll',
      description: 'Monthly stitching and cutting labor payroll.',
      amount: 42000,
      currency: 'NPR',
      status: 'PAID',
      paymentDate: new Date('2026-05-24T09:00:00.000Z'),
      notes: 'Includes line supervisors and operators.',
    },
    {
      expenseNumber: 'EXP-2526-0003',
      expenseDate: new Date('2026-05-26T09:00:00.000Z'),
      category: 'Selling & Admin',
      vendor: 'Office Supply Co.',
      description: 'Packaging and office consumables.',
      amount: 8500,
      currency: 'NPR',
      status: 'APPROVED',
      paymentDate: null,
      notes: 'Non-manufacturing expense bucket.',
    },
  ]

  for (const expense of expenseSeeds) {
    const existing = await prisma.expense.findUnique({ where: { expenseNumber: expense.expenseNumber } })
    if (existing) continue
    await prisma.expense.create({
      data: {
        ...expense,
        amount: new Prisma.Decimal(expense.amount),
        status: expense.status as any,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    console.log(`✓ Seeded expense ${expense.expenseNumber}`)
  }

  const productionSeeds = [
    {
      orderNumber: 'PROD-2526-0001',
      bomId: boms[0].id,
      finishedGoodId: finishedGoods[0].id,
      quantityPlanned: 18,
      quantityProduced: 18,
      notes: 'Pilot run for the bamboo tee line.',
      status: 'COMPLETED' as const,
    },
    {
      orderNumber: 'PROD-2526-0002',
      bomId: boms[1]?.id || boms[0].id,
      finishedGoodId: finishedGoods[1].id,
      quantityPlanned: 12,
      quantityProduced: 12,
      notes: 'Completed linen overshirt batch.',
      status: 'COMPLETED' as const,
    },
    {
      orderNumber: 'PROD-2526-0003',
      bomId: boms[0].id,
      finishedGoodId: finishedGoods[2]?.id || finishedGoods[0].id,
      quantityPlanned: 8,
      quantityProduced: 0,
      notes: 'Draft order awaiting material issue.',
      status: 'DRAFT' as const,
    },
  ]

  for (const production of productionSeeds) {
    const existing = await prisma.productionOrder.findUnique({ where: { orderNumber: production.orderNumber } })
    if (existing) continue
    const created = await prisma.productionOrder.create({
      data: {
        orderNumber: production.orderNumber,
        bomId: production.bomId,
        finishedGoodId: production.finishedGoodId,
        finishedGoodName: finishedGoods.find((fg) => fg.id === production.finishedGoodId)?.name || 'Finished good',
        quantityPlanned: production.quantityPlanned,
        quantityProduced: production.quantityProduced,
        status: production.status,
        notes: production.notes,
        createdBy: userId,
        updatedBy: userId,
        issuedAt: production.status !== 'DRAFT' ? new Date() : null,
        startedAt: production.status !== 'DRAFT' ? new Date() : null,
        completedAt: production.status === 'COMPLETED' ? new Date() : null,
      },
    })

    if (production.status !== 'DRAFT') {
      const bom = await prisma.billOfMaterials.findUnique({
        where: { id: production.bomId },
        include: { items: { include: { rawMaterial: true } } },
      })
      if (bom) {
        for (const item of bom.items) {
          const requiredQty = Number(item.consumption ?? 0) * production.quantityPlanned
          const currentStock = await prisma.stockTransaction.aggregate({
            _sum: { change: true },
            where: { rawMaterialId: item.rawMaterialId },
          })
          const balance = Number(currentStock._sum.change || 0)
          await prisma.stockTransaction.create({
            data: {
              rawMaterialId: item.rawMaterialId,
              change: -requiredQty,
              unit: item.unit || item.rawMaterial.defaultUnit,
              transactionType: 'PRODUCTION_ISSUE',
              balanceAfter: balance - requiredQty,
              reason: `seed_production_issue:${created.id}`,
              referenceId: created.id,
              createdBy: userId,
            },
          })
          await prisma.productionIssueLine.create({
            data: {
              productionOrderId: created.id,
              rawMaterialId: item.rawMaterialId,
              quantity: requiredQty,
              unit: item.unit || item.rawMaterial.defaultUnit,
              bomConsumption: Number(item.consumption ?? 0),
            },
          })
        }
      }

      const fg = await prisma.finishedGoodProduct.findUnique({ where: { id: production.finishedGoodId } })
      if (fg && production.quantityProduced > 0) {
        const currentFgStock = await prisma.finishedGoodStockTransaction.aggregate({
          _sum: { change: true },
          where: { productId: fg.id },
        })
        const fgBalance = Number(currentFgStock._sum.change || 0)
        await prisma.finishedGoodStockTransaction.create({
          data: {
            productId: fg.id,
            change: production.quantityProduced,
            unit: fg.unit,
            transactionType: 'SALE_RETURN',
            balanceAfter: fgBalance + production.quantityProduced,
            unitCost: new Prisma.Decimal(fg.costPrice || 0),
            reason: `seed_production_complete:${created.id}`,
            referenceId: created.id,
            createdBy: userId,
          },
        })
        await prisma.productionCompletionLine.create({
          data: {
            productionOrderId: created.id,
            finishedGoodId: fg.id,
            quantity: production.quantityProduced,
            unit: fg.unit,
          },
        })
      }
    }

    console.log(`✓ Seeded production order ${production.orderNumber}`)
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
