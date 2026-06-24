import { Prisma, PrismaClient, SalesStockTransactionType, SupplierStatus } from '@prisma/client'

type SeedInventoryOptions = {
  prisma: PrismaClient
  createdByUserId?: number
}

type CategorySeed = {
  id: string
  categoryName: string
  description: string
}

type SupplierSeed = {
  id: string
  name: string
  contactName: string
  phone: string
  email: string
  address: string
  notes: string
  externalRef: string
  openingBalance: number
}

type MaterialSeed = {
  id: string
  sku: string
  name: string
  description: string
  defaultUnit: string
  categoryKey: string
  reorderLevel: number
  costPrice: number
  averageUnitCost: number
  notes: string
}

type BomSeed = {
  id: string
  name: string
  garmentStyle: string
  items: Array<{
    rawMaterialKey: string
    consumption: number
    unit: string
    yield: number
  }>
}

type PurchaseSeed = {
  id: string
  supplierKey: string
  invoiceNumber: string
  invoiceDate: string
  notes: string
  items: Array<{
    rawMaterialKey: string
    quantity: number
    unit: string
    unitPrice: number
  }>
}

type CustomerSeed = {
  id: string
  customerName: string
  phone: string
  address: string
  email: string
  notes: string
  openingBalance: number
}

type FinishedGoodSeed = {
  id: string
  sku: string
  productCode: string
  name: string
  description: string
  category: string
  unit: string
  sellingPrice: number
  costPrice: number
  reorderLevel: number
  notes: string
  openingStock: number
}

const categories: CategorySeed[] = [
  {
    id: 'cat_bamboo_fabrics',
    categoryName: 'Bamboo Fabrics',
    description: 'Bamboo jersey and bamboo-linen blends used for soft apparel.',
  },
  {
    id: 'cat_linen_fabrics',
    categoryName: 'Linen Fabrics',
    description: 'Woven and slub linen bases for shirts, trousers, and overshirts.',
  },
  {
    id: 'cat_trims',
    categoryName: 'Trims & Notions',
    description: 'Thread, buttons, labels, and finishing components.',
  },
  {
    id: 'cat_packaging',
    categoryName: 'Packaging',
    description: 'Mailers, hangtags, and retail-ready packaging.',
  },
]

const suppliers: SupplierSeed[] = [
  {
    id: 'sup_bamboo_grove',
    name: 'Bamboo Grove Fibers',
    contactName: 'Niraj Shrestha',
    phone: '+977-1-4102001',
    email: 'orders@bamboogrove.example',
    address: 'Balaju Industrial Area, Kathmandu',
    notes: 'Primary bamboo knits supplier for the core apparel line.',
    externalRef: 'BGF-001',
    openingBalance: 0,
  },
  {
    id: 'sup_himalayan_linen',
    name: 'Himalayan Linen Mills',
    contactName: 'Sita Karki',
    phone: '+977-1-4102002',
    email: 'sales@himalayanlinen.example',
    address: 'Lalitpur Textile Park, Lalitpur',
    notes: 'Supplies linen woven and linen slub fabric.',
    externalRef: 'HLM-001',
    openingBalance: 12500,
  },
  {
    id: 'sup_green_stitch',
    name: 'Green Stitch Trims',
    contactName: 'Rabin Lama',
    phone: '+977-1-4102003',
    email: 'hello@greenstitch.example',
    address: 'Industrial Estate, Bhaktapur',
    notes: 'Threads, buttons, labels, and small textile accessories.',
    externalRef: 'GST-001',
    openingBalance: 4200,
  },
  {
    id: 'sup_leafpack',
    name: 'LeafPack Packaging',
    contactName: 'Maya Tamang',
    phone: '+977-1-4102004',
    email: 'orders@leafpack.example',
    address: 'Thimi Packaging Hub, Bhaktapur',
    notes: 'Compostable packaging and retail presentation materials.',
    externalRef: 'LPK-001',
    openingBalance: 1800,
  },
]

const materials: MaterialSeed[] = [
  {
    id: 'mat_bamboo_jersey',
    sku: 'BMB-JSY-001',
    name: 'Bamboo Viscose Jersey',
    description: 'Soft jersey for tees and lounge basics.',
    defaultUnit: 'm',
    categoryKey: 'cat_bamboo_fabrics',
    reorderLevel: 250,
    costPrice: 6.8,
    averageUnitCost: 6.8,
    notes: 'Main body fabric for stretch basics.',
  },
  {
    id: 'mat_bamboo_linen_blend',
    sku: 'BMB-LIN-BLD-001',
    name: 'Bamboo Linen Blend',
    description: 'Lightweight woven blend for relaxed shirts and overshirts.',
    defaultUnit: 'm',
    categoryKey: 'cat_bamboo_fabrics',
    reorderLevel: 180,
    costPrice: 7.9,
    averageUnitCost: 7.9,
    notes: 'Premium blend for the bamboo-linen capsule.',
  },
  {
    id: 'mat_linen_woven',
    sku: 'LIN-WVN-001',
    name: 'Organic Linen Woven',
    description: 'Classic woven linen for shirts and trousers.',
    defaultUnit: 'm',
    categoryKey: 'cat_linen_fabrics',
    reorderLevel: 300,
    costPrice: 8.4,
    averageUnitCost: 8.4,
    notes: 'Core linen fabric for the woven program.',
  },
  {
    id: 'mat_linen_slub',
    sku: 'LIN-SLB-001',
    name: 'Linen Slub',
    description: 'Textured linen with a softer drape for lounge pieces.',
    defaultUnit: 'm',
    categoryKey: 'cat_linen_fabrics',
    reorderLevel: 220,
    costPrice: 7.1,
    averageUnitCost: 7.1,
    notes: 'Used for lounge pants and soft tailoring.',
  },
  {
    id: 'mat_thread',
    sku: 'TRD-ORG-001',
    name: 'Organic Cotton Thread',
    description: 'General sewing thread for apparel assembly.',
    defaultUnit: 'cone',
    categoryKey: 'cat_trims',
    reorderLevel: 200,
    costPrice: 2.4,
    averageUnitCost: 2.4,
    notes: 'Low-stock trigger for daily replenishment.',
  },
  {
    id: 'mat_buttons',
    sku: 'BTN-CRZ-001',
    name: 'Corozo Buttons',
    description: 'Natural buttons for shirts and overshirts.',
    defaultUnit: 'piece',
    categoryKey: 'cat_trims',
    reorderLevel: 1500,
    costPrice: 0.12,
    averageUnitCost: 0.12,
    notes: 'Bulk trim used across woven styles.',
  },
  {
    id: 'mat_labels',
    sku: 'LAB-WVN-001',
    name: 'Woven Label',
    description: 'Brand label for inside neck and side seam placement.',
    defaultUnit: 'piece',
    categoryKey: 'cat_trims',
    reorderLevel: 1200,
    costPrice: 0.18,
    averageUnitCost: 0.18,
    notes: 'Low-stock trigger for trims planning.',
  },
  {
    id: 'mat_hangtags',
    sku: 'TAG-KFT-001',
    name: 'Kraft Hangtag',
    description: 'Retail hangtag for product presentation.',
    defaultUnit: 'piece',
    categoryKey: 'cat_packaging',
    reorderLevel: 1000,
    costPrice: 0.09,
    averageUnitCost: 0.09,
    notes: 'Used across the retail collection.',
  },
  {
    id: 'mat_mailers',
    sku: 'PCK-MLR-001',
    name: 'Compostable Mailer',
    description: 'Shipping mailer for online orders.',
    defaultUnit: 'piece',
    categoryKey: 'cat_packaging',
    reorderLevel: 800,
    costPrice: 0.35,
    averageUnitCost: 0.35,
    notes: 'Sustainability-focused ecommerce packaging.',
  },
  {
    id: 'mat_drawcord',
    sku: 'TRM-DRW-001',
    name: 'Organic Drawcord',
    description: 'Drawcord used in lounge pants and relaxed waists.',
    defaultUnit: 'piece',
    categoryKey: 'cat_trims',
    reorderLevel: 400,
    costPrice: 0.28,
    averageUnitCost: 0.28,
    notes: 'Low-stock trim with repeat purchase demand.',
  },
]

const boms: BomSeed[] = [
  {
    id: 'bom_bamboo_tee',
    name: 'Bamboo Crew Neck Tee BOM',
    garmentStyle: 'Bamboo Crew Neck Tee',
    items: [
      { rawMaterialKey: 'mat_bamboo_jersey', consumption: 1.8, unit: 'm', yield: 0.92 },
      { rawMaterialKey: 'mat_thread', consumption: 0.03, unit: 'cone', yield: 0.98 },
      { rawMaterialKey: 'mat_labels', consumption: 1, unit: 'piece', yield: 1 },
      { rawMaterialKey: 'mat_hangtags', consumption: 1, unit: 'piece', yield: 1 },
    ],
  },
  {
    id: 'bom_linen_shirt',
    name: 'Linen Overshirt BOM',
    garmentStyle: 'Linen Overshirt',
    items: [
      { rawMaterialKey: 'mat_linen_woven', consumption: 2.4, unit: 'm', yield: 0.9 },
      { rawMaterialKey: 'mat_buttons', consumption: 7, unit: 'piece', yield: 1 },
      { rawMaterialKey: 'mat_thread', consumption: 0.05, unit: 'cone', yield: 0.98 },
      { rawMaterialKey: 'mat_labels', consumption: 1, unit: 'piece', yield: 1 },
    ],
  },
  {
    id: 'bom_bamboo_linen_shirt',
    name: 'Bamboo-Linen Relaxed Shirt BOM',
    garmentStyle: 'Bamboo-Linen Relaxed Shirt',
    items: [
      { rawMaterialKey: 'mat_bamboo_linen_blend', consumption: 2.1, unit: 'm', yield: 0.91 },
      { rawMaterialKey: 'mat_buttons', consumption: 6, unit: 'piece', yield: 1 },
      { rawMaterialKey: 'mat_thread', consumption: 0.05, unit: 'cone', yield: 0.98 },
      { rawMaterialKey: 'mat_labels', consumption: 1, unit: 'piece', yield: 1 },
      { rawMaterialKey: 'mat_hangtags', consumption: 1, unit: 'piece', yield: 1 },
    ],
  },
  {
    id: 'bom_linen_pant',
    name: 'Linen Lounge Pant BOM',
    garmentStyle: 'Linen Lounge Pant',
    items: [
      { rawMaterialKey: 'mat_linen_slub', consumption: 2.3, unit: 'm', yield: 0.89 },
      { rawMaterialKey: 'mat_drawcord', consumption: 1, unit: 'piece', yield: 1 },
      { rawMaterialKey: 'mat_thread', consumption: 0.04, unit: 'cone', yield: 0.98 },
      { rawMaterialKey: 'mat_labels', consumption: 1, unit: 'piece', yield: 1 },
    ],
  },
]

const purchases: PurchaseSeed[] = [
  {
    id: 'pur_bamboo_2026_01',
    supplierKey: 'sup_bamboo_grove',
    invoiceNumber: 'BGF-2401',
    invoiceDate: '2026-01-05',
    notes: 'Opening stock for the bamboo jersey capsule.',
    items: [
      { rawMaterialKey: 'mat_bamboo_jersey', quantity: 520, unit: 'm', unitPrice: 6.8 },
      { rawMaterialKey: 'mat_bamboo_linen_blend', quantity: 260, unit: 'm', unitPrice: 7.9 },
    ],
  },
  {
    id: 'pur_linen_2026_01',
    supplierKey: 'sup_himalayan_linen',
    invoiceNumber: 'HLM-2407',
    invoiceDate: '2026-01-09',
    notes: 'Initial linen fabric buy for woven styles.',
    items: [
      { rawMaterialKey: 'mat_linen_woven', quantity: 620, unit: 'm', unitPrice: 8.4 },
      { rawMaterialKey: 'mat_linen_slub', quantity: 280, unit: 'm', unitPrice: 7.1 },
    ],
  },
  {
    id: 'pur_trims_2026_01',
    supplierKey: 'sup_green_stitch',
    invoiceNumber: 'GST-1182',
    invoiceDate: '2026-01-12',
    notes: 'Bulk trims for the first production run.',
    items: [
      { rawMaterialKey: 'mat_thread', quantity: 100, unit: 'cone', unitPrice: 2.35 },
      { rawMaterialKey: 'mat_buttons', quantity: 1800, unit: 'piece', unitPrice: 0.12 },
      { rawMaterialKey: 'mat_labels', quantity: 700, unit: 'piece', unitPrice: 0.18 },
    ],
  },
  {
    id: 'pur_trims_2026_02',
    supplierKey: 'sup_green_stitch',
    invoiceNumber: 'GST-1204',
    invoiceDate: '2026-02-07',
    notes: 'Follow-up trims purchase after first sampling run.',
    items: [
      { rawMaterialKey: 'mat_thread', quantity: 30, unit: 'cone', unitPrice: 2.45 },
      { rawMaterialKey: 'mat_labels', quantity: 200, unit: 'piece', unitPrice: 0.19 },
      { rawMaterialKey: 'mat_hangtags', quantity: 1200, unit: 'piece', unitPrice: 0.09 },
      { rawMaterialKey: 'mat_drawcord', quantity: 250, unit: 'piece', unitPrice: 0.28 },
    ],
  },
  {
    id: 'pur_packaging_2026_01',
    supplierKey: 'sup_leafpack',
    invoiceNumber: 'LPK-0310',
    invoiceDate: '2026-02-10',
    notes: 'Mailer stock for ecommerce dispatch.',
    items: [
      { rawMaterialKey: 'mat_mailers', quantity: 900, unit: 'piece', unitPrice: 0.35 },
    ],
  },
]

const customers: CustomerSeed[] = [
  {
    id: 'cust_atelier_one',
    customerName: 'Atelier One',
    phone: '+977-1-5551001',
    address: 'Jhamsikhel, Lalitpur',
    email: 'orders@atelierone.example',
    notes: 'Primary wholesale boutique customer.',
    openingBalance: 0,
  },
  {
    id: 'cust_river_market',
    customerName: 'River Market Retail',
    phone: '+977-1-5551002',
    address: 'Thamel, Kathmandu',
    email: 'purchasing@rivermarket.example',
    notes: 'Retail stockist for capsule drops.',
    openingBalance: 8600,
  },
]

const articleCategories = [
  { id: 'article_cat_tops', name: 'Tops', description: 'T-shirts, shirts, and overshirts.' },
  { id: 'article_cat_bottoms', name: 'Bottoms', description: 'Pants and other lower-body articles.' },
  { id: 'article_cat_wovens', name: 'Wovens', description: 'Structured woven garments.' },
  { id: 'article_cat_accessories', name: 'Accessories', description: 'Small sellable add-ons and packaging-led articles.' },
]

const finishedGoods: FinishedGoodSeed[] = [
  {
    id: 'fg_bamboo_tee',
    sku: 'FG-BAM-TEE-001',
    productCode: 'BAM-TEE',
    name: 'Bamboo Crew Neck Tee',
    description: 'Soft bamboo jersey tee for daily wear.',
    category: 'Tops',
    unit: 'pcs',
    sellingPrice: 24,
    costPrice: 9.5,
    reorderLevel: 50,
    notes: 'Core catalog item for article sales.',
    openingStock: 120,
  },
  {
    id: 'fg_linen_shirt',
    sku: 'FG-LIN-SHT-001',
    productCode: 'LIN-SHT',
    name: 'Linen Overshirt',
    description: 'Relaxed woven overshirt with natural drape.',
    category: 'Wovens',
    unit: 'pcs',
    sellingPrice: 42,
    costPrice: 17.25,
    reorderLevel: 35,
    notes: 'Premium woven finished good.',
    openingStock: 80,
  },
  {
    id: 'fg_linen_pant',
    sku: 'FG-LIN-PNT-001',
    productCode: 'LIN-PNT',
    name: 'Linen Lounge Pant',
    description: 'Loose-fit linen pant for lounge and travel wear.',
    category: 'Bottoms',
    unit: 'pcs',
    sellingPrice: 38,
    costPrice: 15.8,
    reorderLevel: 30,
    notes: 'High-rotation article SKU.',
    openingStock: 65,
  },
]

const decimal = (value: number | string) => new Prisma.Decimal(String(value))

const upsertCategory = async (prisma: PrismaClient, category: CategorySeed) =>
  prisma.rawMaterialCategory.upsert({
    where: { id: category.id },
    create: category,
    update: {
      categoryName: category.categoryName,
      description: category.description,
      deletedAt: null,
    },
  })

const upsertSupplier = async (prisma: PrismaClient, supplier: SupplierSeed, userId?: number) =>
  prisma.supplier.upsert({
    where: { id: supplier.id },
    create: {
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: SupplierStatus.ACTIVE,
      notes: supplier.notes,
      externalRef: supplier.externalRef,
      openingBalance: decimal(supplier.openingBalance),
      balance: decimal(0),
      createdBy: userId,
      updatedBy: userId,
    },
    update: {
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: SupplierStatus.ACTIVE,
      notes: supplier.notes,
      externalRef: supplier.externalRef,
      openingBalance: decimal(supplier.openingBalance),
      updatedBy: userId,
      deletedAt: null,
    },
  })

const upsertMaterial = async (
  prisma: PrismaClient,
  material: MaterialSeed,
  categoryId: string,
  userId?: number,
) =>
  prisma.rawMaterial.upsert({
    where: { id: material.id },
    create: {
      id: material.id,
      sku: material.sku,
      name: material.name,
      description: material.description,
      defaultUnit: material.defaultUnit,
      categoryId,
      active: true,
      costPrice: decimal(material.costPrice),
      reorderLevel: material.reorderLevel,
      averageUnitCost: decimal(material.averageUnitCost),
      notes: material.notes,
      createdBy: userId,
      updatedBy: userId,
    },
    update: {
      sku: material.sku,
      name: material.name,
      description: material.description,
      defaultUnit: material.defaultUnit,
      categoryId,
      active: true,
      costPrice: decimal(material.costPrice),
      reorderLevel: material.reorderLevel,
      averageUnitCost: decimal(material.averageUnitCost),
      notes: material.notes,
      updatedBy: userId,
      deletedAt: null,
    },
  })

const upsertBom = async (prisma: PrismaClient, bom: BomSeed, materialByKey: Record<string, { id: string }>, userId?: number) => {
  const article = await prisma.finishedGoodProduct.findUnique({
    where: { id: bom.id },
  })

  const bomData = {
    name: bom.name,
    garmentStyle: bom.garmentStyle,
    items: bom.items.map((item) => ({
      rawMaterialId: materialByKey[item.rawMaterialKey].id,
      consumption: item.consumption,
      unit: item.unit,
      rate: 0,
      yield: item.yield,
    })),
  }

  if (article) {
    return prisma.finishedGoodProduct.update({
      where: { id: article.id },
      data: { bomData: bomData as any },
    })
  }

  return prisma.finishedGoodProduct.create({
    data: {
      id: bom.id,
      sku: bom.id,
      productCode: bom.id,
      name: bom.name,
      description: bom.garmentStyle,
      category: bom.garmentStyle,
      unit: 'pcs',
      sellingPrice: new Prisma.Decimal(0),
      costPrice: new Prisma.Decimal(0),
      reorderLevel: 0,
      active: true,
      notes: null,
      bomData: bomData as any,
      createdBy: userId,
    } as any,
  })
}

const upsertPurchase = async (
  prisma: PrismaClient,
  purchase: PurchaseSeed,
  supplierId: string,
  materialByKey: Record<string, { id: string }>,
  userId?: number,
) => {
  const existing = await prisma.purchase.findUnique({
    where: { id: purchase.id },
    include: { items: true },
  })

  if (existing) return existing

  const total = purchase.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  const created = await prisma.$transaction(async (tx) => {
    const record = await tx.purchase.create({
      data: {
        id: purchase.id,
        supplierId,
        invoiceNumber: purchase.invoiceNumber,
        invoiceDate: new Date(purchase.invoiceDate),
        currency: 'NPR',
        totalAmount: decimal(total),
        status: 'received',
        notes: purchase.notes,
        createdBy: userId,
      },
    })

    for (const item of purchase.items) {
      const rawMaterialId = materialByKey[item.rawMaterialKey].id
      const lineTotal = item.quantity * item.unitPrice

      await tx.purchaseItem.create({
        data: {
          purchaseId: record.id,
          rawMaterialId,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: decimal(item.unitPrice),
          lineTotal: decimal(lineTotal),
        },
      })

      const current = await tx.stockTransaction.aggregate({
        _sum: { change: true },
        where: { rawMaterialId },
      })

      const currentStock = Number(current._sum.change || 0)
      await tx.stockTransaction.create({
        data: {
          rawMaterialId,
          change: item.quantity,
          unit: item.unit,
          transactionType: 'PURCHASE',
          balanceAfter: currentStock + item.quantity,
          unitCost: decimal(item.unitPrice),
          reason: 'purchase',
          referenceId: record.id,
          createdBy: userId,
        },
      })

      await tx.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
          costPrice: decimal(item.unitPrice),
          averageUnitCost: decimal(item.unitPrice),
          updatedBy: userId,
        },
      })
    }

    return record
  })

  return created
}

const upsertCustomer = async (prisma: PrismaClient, customer: CustomerSeed, userId?: number) =>
  prisma.customer.upsert({
    where: { id: customer.id },
    create: {
      id: customer.id,
      customerName: customer.customerName,
      phone: customer.phone,
      address: customer.address,
      email: customer.email,
      notes: customer.notes,
      openingBalance: decimal(customer.openingBalance),
      createdBy: userId,
      updatedBy: userId,
    },
    update: {
      customerName: customer.customerName,
      phone: customer.phone,
      address: customer.address,
      email: customer.email,
      notes: customer.notes,
      openingBalance: decimal(customer.openingBalance),
      updatedBy: userId,
      deletedAt: null,
    },
  })

const upsertArticleCategories = async (prisma: PrismaClient) =>
  Promise.all(
    articleCategories.map((category) =>
      prisma.articleCategory.upsert({
        where: { id: category.id },
        create: {
          id: category.id,
          name: category.name,
          description: category.description,
          status: 'ACTIVE',
        },
        update: {
          name: category.name,
          description: category.description,
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),
    ),
  )

const seedSupplierLedgerEntry = async (
  prisma: PrismaClient,
  supplierId: string,
  payload: {
    entryType: 'OPENING_BALANCE' | 'PURCHASE_INVOICE' | 'PAYMENT_MADE'
    entryDate: Date
    referenceType: string
    referenceId: string
    documentNumber: string
    description: string
    debit: number
    credit: number
    createdBy?: number
  },
) => {
  const existing = await prisma.supplierLedgerEntry.findFirst({
    where: {
      supplierId,
      referenceId: payload.referenceId,
      entryType: payload.entryType as any,
    },
  })
  if (existing) return existing

  const lastEntry = await prisma.supplierLedgerEntry.findFirst({
    where: { supplierId },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
  })
  const currentBalance = Number(lastEntry?.runningBalance || 0)
  const runningBalance = payload.entryType === 'PAYMENT_MADE'
    ? currentBalance + payload.credit - payload.debit
    : currentBalance + payload.debit - payload.credit

  return prisma.supplierLedgerEntry.create({
    data: {
      supplierId,
      entryType: payload.entryType as any,
      entryDate: payload.entryDate,
      referenceType: payload.referenceType,
      referenceId: payload.referenceId,
      documentNumber: payload.documentNumber,
      description: payload.description,
      debit: decimal(payload.debit),
      credit: decimal(payload.credit),
      runningBalance: decimal(runningBalance),
      createdBy: payload.createdBy ?? undefined,
    },
  })
}

const seedCustomerLedgerEntry = async (
  prisma: PrismaClient,
  customerId: string,
  payload: {
    entryType: 'OPENING_BALANCE' | 'SALES_INVOICE' | 'PAYMENT_RECEIVED'
    entryDate: Date
    referenceType: string
    referenceId: string
    documentNumber: string
    description: string
    debit: number
    credit: number
    createdBy?: number
  },
) => {
  const existing = await prisma.customerLedgerEntry.findFirst({
    where: {
      customerId,
      referenceId: payload.referenceId,
      entryType: payload.entryType as any,
    },
  })
  if (existing) return existing

  const lastEntry = await prisma.customerLedgerEntry.findFirst({
    where: { customerId },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
  })
  const currentBalance = Number(lastEntry?.runningBalance || 0)
  const runningBalance = currentBalance + payload.debit - payload.credit

  return prisma.customerLedgerEntry.create({
    data: {
      customerId,
      entryType: payload.entryType as any,
      entryDate: payload.entryDate,
      referenceType: payload.referenceType,
      referenceId: payload.referenceId,
      documentNumber: payload.documentNumber,
      description: payload.description,
      debit: decimal(payload.debit),
      credit: decimal(payload.credit),
      runningBalance: decimal(runningBalance),
      createdBy: payload.createdBy ?? undefined,
    },
  })
}

const upsertFinishedGood = async (prisma: PrismaClient, product: FinishedGoodSeed, userId?: number) =>
  prisma.finishedGoodProduct.upsert({
    where: { id: product.id },
    create: {
      id: product.id,
      sku: product.sku,
      productCode: product.productCode,
      name: product.name,
      description: product.description,
      category: product.category,
      unit: product.unit,
      sellingPrice: decimal(product.sellingPrice),
      costPrice: decimal(product.costPrice),
      reorderLevel: product.reorderLevel,
      notes: product.notes,
      createdBy: userId,
      updatedBy: userId,
    },
    update: {
      sku: product.sku,
      productCode: product.productCode,
      name: product.name,
      description: product.description,
      category: product.category,
      unit: product.unit,
      sellingPrice: decimal(product.sellingPrice),
      costPrice: decimal(product.costPrice),
      reorderLevel: product.reorderLevel,
      notes: product.notes,
      updatedBy: userId,
      deletedAt: null,
    },
  })

const seedFinishedGoodOpeningStock = async (
  prisma: PrismaClient,
  productId: string,
  unit: string,
  openingStock: number,
  unitCost: number,
  userId?: number,
) => {
  const existing = await prisma.finishedGoodStockTransaction.findFirst({
    where: { productId },
  })

  if (existing) return

  const current = await prisma.finishedGoodStockTransaction.aggregate({
    _sum: { change: true },
    where: { productId },
  })

  const currentStock = Number(current._sum.change || 0)
  await prisma.finishedGoodStockTransaction.create({
    data: {
      productId,
      change: openingStock,
      unit,
      transactionType: SalesStockTransactionType.SALE_RETURN,
      balanceAfter: currentStock + openingStock,
      unitCost: decimal(unitCost),
      reason: 'seed_opening_stock',
      referenceId: 'seed',
      createdBy: userId,
    },
  })
}

export async function seedInventory({ prisma, createdByUserId }: SeedInventoryOptions) {
  await upsertArticleCategories(prisma)

  const categoryRecords = await Promise.all(categories.map((category) => upsertCategory(prisma, category)))
  const categoryByKey = Object.fromEntries(categories.map((category, index) => [category.id, categoryRecords[index]]))

  const supplierRecords = await Promise.all(suppliers.map((supplier) => upsertSupplier(prisma, supplier, createdByUserId)))
  const supplierByKey = Object.fromEntries(suppliers.map((supplier, index) => [supplier.id, supplierRecords[index]]))

  const customerRecords = await Promise.all(customers.map((customer) => upsertCustomer(prisma, customer, createdByUserId)))

  const materialRecords = await Promise.all(
    materials.map((material) =>
      upsertMaterial(prisma, material, categoryByKey[material.categoryKey].id, createdByUserId),
    ),
  )
  const materialByKey = Object.fromEntries(materials.map((material, index) => [material.id, materialRecords[index]]))

  const finishedGoodRecords = await Promise.all(
    finishedGoods.map((product) => upsertFinishedGood(prisma, product, createdByUserId)),
  )
  const finishedGoodByKey = Object.fromEntries(
    finishedGoods.map((product, index) => [product.id, finishedGoodRecords[index]]),
  )

  for (const bom of boms) {
    await upsertBom(prisma, bom, materialByKey, createdByUserId)
  }

  for (const purchase of purchases) {
    await upsertPurchase(prisma, purchase, supplierByKey[purchase.supplierKey].id, materialByKey, createdByUserId)
  }

  for (const supplier of suppliers) {
    const supplierRecord = supplierByKey[supplier.id]
    const openingExists = await prisma.supplierLedgerEntry.findFirst({
      where: {
        supplierId: supplierRecord.id,
        entryType: 'OPENING_BALANCE',
      },
    })
    if (!openingExists && supplier.openingBalance !== 0) {
      await prisma.supplierLedgerEntry.create({
        data: {
          supplierId: supplierRecord.id,
          entryType: 'OPENING_BALANCE',
          entryDate: new Date('2026-01-01T00:00:00.000Z'),
          referenceType: 'OPENING_BALANCE',
          referenceId: `supplier-opening-${supplier.id}`,
          documentNumber: `SUP-OPEN-${supplier.id}`,
          description: `${supplier.name} opening balance`,
          debit: decimal(0),
          credit: decimal(supplier.openingBalance),
          runningBalance: decimal(supplier.openingBalance),
          createdBy: createdByUserId,
        },
      })
    }
  }

  for (const purchase of purchases) {
    const supplierRecord = supplierByKey[purchase.supplierKey]
    const existingLedger = await prisma.supplierLedgerEntry.findFirst({
      where: {
        supplierId: supplierRecord.id,
        referenceId: purchase.id,
        entryType: 'PURCHASE_INVOICE',
      },
    })
    if (existingLedger) continue

    const purchaseTotal = purchase.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const lastLedger = await prisma.supplierLedgerEntry.findFirst({
      where: { supplierId: supplierRecord.id },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    })
    const startingBalance = Number(lastLedger?.runningBalance || supplierRecord.openingBalance || 0)
    const purchaseBalance = startingBalance + purchaseTotal

    await prisma.supplierLedgerEntry.create({
      data: {
        supplierId: supplierRecord.id,
        entryType: 'PURCHASE_INVOICE',
        entryDate: new Date(`${purchase.invoiceDate}T09:00:00.000Z`),
        referenceType: 'PURCHASE',
        referenceId: purchase.id,
        documentNumber: purchase.invoiceNumber,
        description: purchase.notes,
        debit: decimal(0),
        credit: decimal(purchaseTotal),
        runningBalance: decimal(purchaseBalance),
        createdBy: createdByUserId,
      },
    })
  }

  const supplierPaymentSeeds = [
    { supplierKey: 'sup_green_stitch', amount: 7500, referenceId: 'supplier-payment-gst-001', documentNumber: 'PAY-2526-0001', date: '2026-02-15T09:00:00.000Z' },
    { supplierKey: 'sup_himalayan_linen', amount: 12000, referenceId: 'supplier-payment-hlm-001', documentNumber: 'PAY-2526-0002', date: '2026-02-18T09:00:00.000Z' },
  ]

  for (const payment of supplierPaymentSeeds) {
    const supplierRecord = supplierByKey[payment.supplierKey]
    const existingLedger = await prisma.supplierLedgerEntry.findFirst({
      where: {
        supplierId: supplierRecord.id,
        referenceId: payment.referenceId,
        entryType: 'PAYMENT_MADE',
      },
    })
    if (existingLedger) continue

    const lastLedger = await prisma.supplierLedgerEntry.findFirst({
      where: { supplierId: supplierRecord.id },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    })
    const currentBalance = Number(lastLedger?.runningBalance || supplierRecord.openingBalance || 0)
    const newBalance = Math.max(0, currentBalance - payment.amount)

    await prisma.supplierLedgerEntry.create({
      data: {
        supplierId: supplierRecord.id,
        entryType: 'PAYMENT_MADE',
        entryDate: new Date(payment.date),
        referenceType: 'PAYMENT',
        referenceId: payment.referenceId,
        documentNumber: payment.documentNumber,
        description: `Seed payment to ${supplierRecord.name}`,
        debit: decimal(payment.amount),
        credit: decimal(0),
        runningBalance: decimal(newBalance),
        createdBy: createdByUserId,
      },
    })
  }

  for (const customer of customers) {
    const customerRecord = customerRecords.find((entry) => entry.customerName === customer.customerName)
    if (!customerRecord) continue

    const openingExists = await prisma.customerLedgerEntry.findFirst({
      where: {
        customerId: customerRecord.id,
        entryType: 'OPENING_BALANCE',
      },
    })
    if (!openingExists && customer.openingBalance !== 0) {
      await prisma.customerLedgerEntry.create({
        data: {
          customerId: customerRecord.id,
          entryType: 'OPENING_BALANCE',
          entryDate: new Date('2026-01-01T00:00:00.000Z'),
          referenceType: 'OPENING_BALANCE',
          referenceId: `customer-opening-${customer.id}`,
          documentNumber: `CUS-OPEN-${customer.id}`,
          description: `${customer.customerName} opening balance`,
          debit: decimal(customer.openingBalance),
          credit: decimal(0),
          runningBalance: decimal(customer.openingBalance),
          createdBy: createdByUserId,
        },
      })
    }

    const invoiceReference = `customer-demo-invoice-${customer.id}`
    const invoiceExists = await prisma.customerLedgerEntry.findFirst({
      where: {
        customerId: customerRecord.id,
        referenceId: invoiceReference,
        entryType: 'SALES_INVOICE',
      },
    })
    if (!invoiceExists) {
      const invoiceAmount = customer.customerName === 'Atelier One' ? 24850 : 16320
      const lastLedger = await prisma.customerLedgerEntry.findFirst({
        where: { customerId: customerRecord.id },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      })
      const currentBalance = Number(lastLedger?.runningBalance || customer.openingBalance || 0)
      await prisma.customerLedgerEntry.create({
        data: {
          customerId: customerRecord.id,
          entryType: 'SALES_INVOICE',
          entryDate: new Date('2026-05-18T09:00:00.000Z'),
          referenceType: 'SALES_INVOICE',
          referenceId: invoiceReference,
          documentNumber: customer.customerName === 'Atelier One' ? 'SI-2526-0001' : 'SI-2526-0002',
          description: `Seed invoice for ${customer.customerName}`,
          debit: decimal(invoiceAmount),
          credit: decimal(0),
          runningBalance: decimal(currentBalance + invoiceAmount),
          createdBy: createdByUserId,
        },
      })
    }

    const paymentReference = `customer-demo-payment-${customer.id}`
    const paymentExists = await prisma.customerLedgerEntry.findFirst({
      where: {
        customerId: customerRecord.id,
        referenceId: paymentReference,
        entryType: 'PAYMENT_RECEIVED',
      },
    })
    if (!paymentExists) {
      const paymentAmount = customer.customerName === 'Atelier One' ? 12000 : 5000
      const lastLedger = await prisma.customerLedgerEntry.findFirst({
        where: { customerId: customerRecord.id },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      })
      const currentBalance = Number(lastLedger?.runningBalance || customer.openingBalance || 0)
      await prisma.customerLedgerEntry.create({
        data: {
          customerId: customerRecord.id,
          entryType: 'PAYMENT_RECEIVED',
          entryDate: new Date('2026-05-25T13:30:00.000Z'),
          referenceType: 'PAYMENT',
          referenceId: paymentReference,
          documentNumber: customer.customerName === 'Atelier One' ? 'PAY-2526-0001' : 'PAY-2526-0002',
          description: `Seed payment from ${customer.customerName}`,
          debit: decimal(0),
          credit: decimal(paymentAmount),
          runningBalance: decimal(Math.max(0, currentBalance - paymentAmount)),
          createdBy: createdByUserId,
        },
      })
    }
  }

  for (const product of finishedGoods) {
    await seedFinishedGoodOpeningStock(
      prisma,
      finishedGoodByKey[product.id].id,
      finishedGoodByKey[product.id].unit,
      product.openingStock,
      product.costPrice,
      createdByUserId,
    )
  }

  for (const material of materialRecords) {
    const currentStock = await prisma.stockTransaction.aggregate({
      _sum: { change: true },
      where: { rawMaterialId: material.id },
    })
    const stock = Number(currentStock._sum.change || 0)
    if (material.reorderLevel != null && stock < Number(material.reorderLevel)) {
      const existingAlert = await prisma.lowStockAlert.findFirst({
        where: { rawMaterialId: material.id, acknowledged: false },
      })
      if (!existingAlert) {
        await prisma.lowStockAlert.create({
          data: {
            rawMaterialId: material.id,
            acknowledged: false,
          },
        })
      }
    }
  }

  return {
    categories: categoryRecords.length,
    suppliers: supplierRecords.length,
    customers: customerRecords.length,
    materials: materialRecords.length,
    finishedGoods: finishedGoodRecords.length,
    boms: boms.length,
    purchases: purchases.length,
    articleCategories: articleCategories.length,
  }
}

if (require.main === module) {
  const prisma = new PrismaClient()
  seedInventory({ prisma })
    .then(() => {
      console.log('inventory seed complete')
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
