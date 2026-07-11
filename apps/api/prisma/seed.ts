import { Prisma, PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/utils/password";
import { seedInventory } from "./seed_inventory";
import { seedSalesInvoices } from "./seed_sales_invoices";

const prisma = new PrismaClient();

// Static seed credentials so reseeding doesn't depend on .env
const SEED_ADMIN_EMAIL = "admin@gmail.com";
const SEED_ADMIN_PASSWORD = "admin1234";

async function main() {
  const email = SEED_ADMIN_EMAIL;
  const password = SEED_ADMIN_PASSWORD;

  const ORG_NAME = "Seed Test Organization";
  let seedOrg = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!seedOrg) {
    seedOrg = await prisma.organization.create({ data: { name: ORG_NAME } });
    console.log(`Created seed organization: ${ORG_NAME}`);
  } else {
    console.log(`Seed organization exists: ${ORG_NAME}`);
  }

  const orgId = seedOrg.id;

  let adminUser = await prisma.user.findUnique({ where: { email } });
  if (!adminUser) {
    const passwordHash = await hashPassword(password);
    adminUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN,
        organizationId: orgId,
        name: "Seed Admin",
      },
    });
    console.log(`Seeded admin user ${email}`);
  } else {
    console.log(`Admin user exists: ${email}`);
  }

  console.log("Seeding inventory demo data...");
  await seedInventory({ prisma, createdByUserId: adminUser.id });

  console.log("Seeding sales invoice demo data...");
  await seedSalesInvoices({ prisma, createdByUserId: adminUser.id });

  console.log("Seeding sales orders, expenses, and production orders...");
  await seedOperationalDocs(prisma, adminUser.id);

  console.log("\nDatabase seeding complete!");
  console.log("\nSummary:");
  console.log("   - Projects: 0");
  console.log("   - Inventory demo: included");
  console.log("   - Sales invoice demo: included");
  console.log("   - Operational docs demo: included");
  console.log(`   - Admin user: ${email} / ${password}`);
}

async function seedOperationalDocs(prisma: PrismaClient, userId: number) {
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: "asc" } });
  const finishedGoods = await prisma.finishedGoodProduct.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const materials = await prisma.rawMaterial.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  if (customers.length === 0 || finishedGoods.length === 0 || materials.length === 0) {
    console.log("Skipping operational doc seed because prerequisite inventory records are missing.");
    return;
  }

  const salesOrderSeeds = [
    {
      orderNumber: "SO-2526-0001",
      customerId: customers[0].id,
      orderDate: new Date("2026-05-24T09:00:00.000Z"),
      requiredBy: new Date("2026-06-08T09:00:00.000Z"),
      notes: "Wholesale restock for the spring capsule.",
      items: [
        {
          productId: finishedGoods[0].id,
          quantity: 6,
          unitPrice: Number(finishedGoods[0].sellingPrice),
          discountAmount: 0,
          taxAmount: 0,
        },
        {
          productId: finishedGoods[1].id,
          quantity: 3,
          unitPrice: Number(finishedGoods[1].sellingPrice),
          discountAmount: 0,
          taxAmount: 0,
        },
      ],
    },
    {
      orderNumber: "SO-2526-0002",
      customerId: customers[1]?.id || customers[0].id,
      orderDate: new Date("2026-05-28T09:00:00.000Z"),
      requiredBy: new Date("2026-06-12T09:00:00.000Z"),
      notes: "Lifestyle boutique order for linen program.",
      items: [
        {
          productId: finishedGoods[2]?.id || finishedGoods[0].id,
          quantity: 4,
          unitPrice: Number(finishedGoods[2]?.sellingPrice ?? finishedGoods[0].sellingPrice),
          discountAmount: 0,
          taxAmount: 0,
        },
        {
          productId: finishedGoods[3]?.id || finishedGoods[1].id,
          quantity: 2,
          unitPrice: Number(finishedGoods[3]?.sellingPrice ?? finishedGoods[1].sellingPrice),
          discountAmount: 0,
          taxAmount: 0,
        },
      ],
    },
  ];

  for (const order of salesOrderSeeds) {
    const existing = await prisma.salesOrder.findUnique({ where: { orderNumber: order.orderNumber } });
    if (existing) continue;

    const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
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
        status: "CONFIRMED",
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await prisma.salesOrderItem.createMany({
      data: order.items.map((item, index) => ({
        id: `${order.orderNumber}-item-${index + 1}`,
        salesOrderId: created.id,
        productId: item.productId,
        productCode: finishedGoods.find((fg) => fg.id === item.productId)?.productCode || null,
        productName: finishedGoods.find((fg) => fg.id === item.productId)?.name || "Product",
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        discountAmount: new Prisma.Decimal(item.discountAmount),
        taxAmount: new Prisma.Decimal(item.taxAmount),
        lineTotal: new Prisma.Decimal(item.quantity * item.unitPrice),
      })),
    });
    console.log(`Seeded sales order ${order.orderNumber}`);
  }

  const expenseSeeds = [
    {
      expenseNumber: "EXP-2526-0001",
      expenseDate: new Date("2026-05-20T09:00:00.000Z"),
      category: "Factory Overhead",
      vendor: "Kathmandu Utilities",
      description: "Electricity bill for production floor.",
      amount: 18000,
      currency: "NPR",
      status: "PAID",
      paymentDate: new Date("2026-05-22T09:00:00.000Z"),
      notes: "Allocated to factory overhead bucket.",
    },
    {
      expenseNumber: "EXP-2526-0002",
      expenseDate: new Date("2026-05-23T09:00:00.000Z"),
      category: "Production Labor",
      vendor: "Payroll",
      description: "Monthly stitching and cutting labor payroll.",
      amount: 42000,
      currency: "NPR",
      status: "PAID",
      paymentDate: new Date("2026-05-24T09:00:00.000Z"),
      notes: "Includes line supervisors and operators.",
    },
    {
      expenseNumber: "EXP-2526-0003",
      expenseDate: new Date("2026-05-26T09:00:00.000Z"),
      category: "Selling & Admin",
      vendor: "Office Supply Co.",
      description: "Packaging and office consumables.",
      amount: 8500,
      currency: "NPR",
      status: "APPROVED",
      paymentDate: null,
      notes: "Non-manufacturing expense bucket.",
    },
  ];

  for (const expense of expenseSeeds) {
    const existing = await prisma.expense.findUnique({ where: { expenseNumber: expense.expenseNumber } });
    if (existing) continue;
    await prisma.expense.create({
      data: {
        ...expense,
        amount: new Prisma.Decimal(expense.amount),
        status: expense.status as any,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    console.log(`Seeded expense ${expense.expenseNumber}`);
  }

  const productionSeeds = [
    {
      orderNumber: "PROD-2526-0001",
      finishedGoodId: finishedGoods[0].id,
      quantityPlanned: 18,
      quantityProduced: 18,
      notes: "Pilot run for the bamboo tee line.",
      status: "COMPLETED" as const,
    },
    {
      orderNumber: "PROD-2526-0002",
      finishedGoodId: finishedGoods[1].id,
      quantityPlanned: 12,
      quantityProduced: 12,
      notes: "Completed linen overshirt batch.",
      status: "COMPLETED" as const,
    },
    {
      orderNumber: "PROD-2526-0003",
      finishedGoodId: finishedGoods[2]?.id || finishedGoods[0].id,
      quantityPlanned: 8,
      quantityProduced: 0,
      notes: "Draft order awaiting material issue.",
      status: "DRAFT" as const,
    },
  ];

  for (const production of productionSeeds) {
    const existing = await prisma.productionOrder.findUnique({ where: { orderNumber: production.orderNumber } });
    if (existing) continue;

    const created = await prisma.productionOrder.create({
      data: {
        orderNumber: production.orderNumber,
        finishedGoodId: production.finishedGoodId,
        finishedGoodName: finishedGoods.find((fg) => fg.id === production.finishedGoodId)?.name || "Article",
        quantityPlanned: production.quantityPlanned,
        quantityProduced: production.quantityProduced,
        status: production.status,
        notes: production.notes,
        createdBy: userId,
        updatedBy: userId,
        issuedAt: production.status !== "DRAFT" ? new Date() : null,
        startedAt: production.status !== "DRAFT" ? new Date() : null,
        completedAt: production.status === "COMPLETED" ? new Date() : null,
      },
    });

    if (production.status !== "DRAFT") {
      const finishedGood = await prisma.finishedGoodProduct.findUnique({
        where: { id: production.finishedGoodId },
      });
      const bomItems = Array.isArray((finishedGood as any)?.bomData?.items)
        ? (finishedGood as any).bomData.items
        : [];

      for (const item of bomItems) {
        const requiredQty = Number(item.consumption ?? 0) * production.quantityPlanned;
        const currentStock = await prisma.stockTransaction.aggregate({
          _sum: { change: true },
          where: { rawMaterialId: item.rawMaterialId },
        });
        const balance = Number(currentStock._sum.change || 0);
        await prisma.stockTransaction.create({
          data: {
            rawMaterialId: item.rawMaterialId,
            change: -requiredQty,
            unit: item.unit || item.rawMaterial.defaultUnit,
            transactionType: "PRODUCTION_ISSUE",
            balanceAfter: balance - requiredQty,
            reason: `seed_production_issue:${created.id}`,
            referenceId: created.id,
            createdBy: userId,
          },
        });
        await prisma.productionIssueLine.create({
          data: {
            productionOrderId: created.id,
            rawMaterialId: item.rawMaterialId,
            quantity: requiredQty,
            unit: item.unit || item.rawMaterial.defaultUnit,
            bomConsumption: Number(item.consumption ?? 0),
          },
        });
      }

      const fg = await prisma.finishedGoodProduct.findUnique({ where: { id: production.finishedGoodId } });
      if (fg && production.quantityProduced > 0) {
        const currentFgStock = await prisma.finishedGoodStockTransaction.aggregate({
          _sum: { change: true },
          where: { productId: fg.id },
        });
        const fgBalance = Number(currentFgStock._sum.change || 0);
        await prisma.finishedGoodStockTransaction.create({
          data: {
            productId: fg.id,
            change: production.quantityProduced,
            unit: fg.unit,
            transactionType: "SALE_RETURN",
            balanceAfter: fgBalance + production.quantityProduced,
            unitCost: new Prisma.Decimal(fg.costPrice || 0),
            reason: `seed_production_complete:${created.id}`,
            referenceId: created.id,
            createdBy: userId,
          },
        });
        await prisma.productionCompletionLine.create({
          data: {
            productionOrderId: created.id,
            finishedGoodId: fg.id,
            quantity: production.quantityProduced,
            unit: fg.unit,
          },
        });
      }
    }

    console.log(`Seeded production order ${production.orderNumber}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
