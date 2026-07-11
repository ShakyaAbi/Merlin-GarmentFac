import { Prisma, PrismaClient } from '@prisma/client'

type SeedSalesInvoicesOptions = {
  prisma: PrismaClient
  createdByUserId?: number
}

type CustomerSeed = {
  id: string
  customerCode: string
  name: string
  panVatNumber: string
  phone: string
  email: string
  billingAddress: string
  shippingAddress: string
  contactPerson: string
  notes: string
}

type FinishedGoodSeed = {
  id: string
  sku: string
  name: string
  description: string
  unit: string
  reorderLevel: number
  costPrice: number
  averageUnitCost: number
  openingStock: number
  openingReferenceId: string
}

type InvoiceItemSeed = {
  id: string
  productId: string
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  costPrice: number
  warehouseId: string | null
}

type StockMovementSeed = {
  id: string
  rawMaterialId: string
  change: number
  unit: string
  transactionType: string
  reason: string
  referenceId: string
  unitCost: number
  createdAt: Date
}

type PaymentSeed = {
  id: string
  paymentDate: Date
  amount: number | 'FULL'
  method: string
  referenceNumber: string
  notes: string
}

type InvoiceSeed = {
  id: string
  invoiceNumber: string
  fiscalYear: string
  customerCode: string
  invoiceDate: Date
  dueDate: Date
  invoiceStatus: 'DRAFT' | 'ISSUED' | 'CANCELLED'
  paymentStatus: 'UNPAID' | 'PAID'
  printedCount: number
  syncStatus: string
  syncReference: string | null
  cancellationReason: string | null
  remarks: string
  items: InvoiceItemSeed[]
  stockMovements: StockMovementSeed[]
  payments: PaymentSeed[]
}

const TAX_RATE = 0.13

const roundMoney = (value: number) => Number(value.toFixed(2))

const calculateTotals = (items: InvoiceItemSeed[]) => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))
  const discountAmount = roundMoney(items.reduce((sum, item) => sum + item.discountAmount, 0))
  const taxableAmount = roundMoney(subtotal - discountAmount)
  const taxAmount = roundMoney(taxableAmount * TAX_RATE)
  const grandTotal = roundMoney(taxableAmount + taxAmount)
  return { subtotal, discountAmount, taxableAmount, taxAmount, grandTotal }
}

const salesCustomers: CustomerSeed[] = [
  {
    id: 'cus_kathmandu_boutique',
    customerCode: 'CUS-KTM-001',
    name: 'Kathmandu Boutique House',
    panVatNumber: '302145678',
    phone: '+977-1-4510201',
    email: 'orders@kathmanduboutique.example',
    billingAddress: 'Durbar Marg, Kathmandu',
    shippingAddress: 'Durbar Marg, Kathmandu',
    contactPerson: 'Anita Shrestha',
    notes: 'Wholesale fashion retailer with frequent seasonal restocks.',
  },
  {
    id: 'cus_patan_lifestyle',
    customerCode: 'CUS-LTP-002',
    name: 'Patan Lifestyle Store',
    panVatNumber: '305678912',
    phone: '+977-1-5521130',
    email: 'buying@patanlifestyle.example',
    billingAddress: 'Jawalakhel, Lalitpur',
    shippingAddress: 'Jawalakhel, Lalitpur',
    contactPerson: 'Suman Karki',
    notes: 'Curated lifestyle concept store serving premium apparel buyers.',
  },
  {
    id: 'cus_pokhara_resort',
    customerCode: 'CUS-PKR-003',
    name: 'Pokhara Lakeside Resort Supply',
    panVatNumber: '309884501',
    phone: '+977-61-463210',
    email: 'procurement@pkresort.example',
    billingAddress: 'Lakeside, Pokhara',
    shippingAddress: 'Lakeside, Pokhara',
    contactPerson: 'Maya Gurung',
    notes: 'Hospitality buyer that orders guest uniforms and retail basics.',
  },
  {
    id: 'cus_bhaktapur_concept',
    customerCode: 'CUS-BKT-004',
    name: 'Bhaktapur Concept Corner',
    panVatNumber: '308770114',
    phone: '+977-1-6612102',
    email: 'hello@bhaktapurcorner.example',
    billingAddress: 'Suryabinayak, Bhaktapur',
    shippingAddress: 'Suryabinayak, Bhaktapur',
    contactPerson: 'Rabin Thapa',
    notes: 'Lifestyle retailer that mixes apparel with home and craft goods.',
  },
]

const finishedGoods: FinishedGoodSeed[] = [
  {
    id: 'fg_bamboo_tee',
    sku: 'FG-TEE-001',
    name: 'Bamboo Crew Neck Tee',
    description: 'Ready-to-sell bamboo jersey tee for wholesale and online orders.',
    unit: 'piece',
    reorderLevel: 8,
    costPrice: 1380,
    averageUnitCost: 1380,
    openingStock: 30,
    openingReferenceId: 'sales-fg-opening-bamboo-tee',
  },
  {
    id: 'fg_linen_overshirt',
    sku: 'FG-SHT-002',
    name: 'Linen Overshirt',
    description: 'Relaxed linen overshirt for premium retail channels.',
    unit: 'piece',
    reorderLevel: 6,
    costPrice: 1950,
    averageUnitCost: 1950,
    openingStock: 24,
    openingReferenceId: 'sales-fg-opening-linen-overshirt',
  },
  {
    id: 'fg_bamboo_linen_shirt',
    sku: 'FG-SHT-003',
    name: 'Bamboo-Linen Relaxed Shirt',
    description: 'Lightweight shirt blended for warm-weather retail orders.',
    unit: 'piece',
    reorderLevel: 6,
    costPrice: 2010,
    averageUnitCost: 2010,
    openingStock: 20,
    openingReferenceId: 'sales-fg-opening-bamboo-linen-shirt',
  },
  {
    id: 'fg_linen_pant',
    sku: 'FG-PNT-004',
    name: 'Linen Lounge Pant',
    description: 'Soft-tailoring lounge pant stocked for boutique and resort buyers.',
    unit: 'piece',
    reorderLevel: 5,
    costPrice: 2140,
    averageUnitCost: 2140,
    openingStock: 18,
    openingReferenceId: 'sales-fg-opening-linen-pant',
  },
]

const invoiceSeeds: InvoiceSeed[] = [
  {
    id: 'sales_invoice_draft_0001',
    invoiceNumber: 'SI-2526-0001',
    fiscalYear: '2025/26',
    customerCode: 'CUS-KTM-001',
    invoiceDate: new Date('2026-05-18T09:00:00.000Z'),
    dueDate: new Date('2026-06-02T09:00:00.000Z'),
    invoiceStatus: 'DRAFT',
    paymentStatus: 'UNPAID',
    printedCount: 0,
    syncStatus: 'LOCAL_DRAFT',
    syncReference: null,
    cancellationReason: null,
    remarks: 'Draft wholesale order reserved for Kathmandu Boutique House.',
    items: [
      {
        id: 'sales_invoice_draft_0001_item_1',
        productId: 'fg_bamboo_tee',
        productCode: 'FG-TEE-001',
        productName: 'Bamboo Crew Neck Tee',
        quantity: 5,
        unitPrice: 2450,
        discountAmount: 0,
        costPrice: 1380,
        warehouseId: null,
      },
      {
        id: 'sales_invoice_draft_0001_item_2',
        productId: 'fg_linen_pant',
        productCode: 'FG-PNT-004',
        productName: 'Linen Lounge Pant',
        quantity: 2,
        unitPrice: 3490,
        discountAmount: 0,
        costPrice: 2140,
        warehouseId: null,
      },
    ],
    stockMovements: [],
    payments: [],
  },
  {
    id: 'sales_invoice_issued_0002',
    invoiceNumber: 'SI-2526-0002',
    fiscalYear: '2025/26',
    customerCode: 'CUS-LTP-002',
    invoiceDate: new Date('2026-05-21T09:00:00.000Z'),
    dueDate: new Date('2026-06-05T09:00:00.000Z'),
    invoiceStatus: 'ISSUED',
    paymentStatus: 'UNPAID',
    printedCount: 1,
    syncStatus: 'READY_TO_SYNC',
    syncReference: 'SYNC-2526-0002',
    cancellationReason: null,
    remarks: 'Issued invoice for the Patan lifestyle store seasonal restock.',
    items: [
      {
        id: 'sales_invoice_issued_0002_item_1',
        productId: 'fg_linen_overshirt',
        productCode: 'FG-SHT-002',
        productName: 'Linen Overshirt',
        quantity: 6,
        unitPrice: 3850,
        discountAmount: 0,
        costPrice: 1950,
        warehouseId: null,
      },
    ],
    stockMovements: [
      {
        id: 'sales_invoice_issued_0002_stock_1',
        rawMaterialId: 'fg_linen_overshirt',
        change: -6,
        unit: 'piece',
        transactionType: 'SALE_ISSUE',
        reason: 'Issued sales invoice SI-2526-0002',
        referenceId: 'sales_invoice_issued_0002_stock_1',
        unitCost: 1950,
        createdAt: new Date('2026-05-21T10:15:00.000Z'),
      },
    ],
    payments: [],
  },
  {
    id: 'sales_invoice_paid_0003',
    invoiceNumber: 'SI-2526-0003',
    fiscalYear: '2025/26',
    customerCode: 'CUS-PKR-003',
    invoiceDate: new Date('2026-05-25T09:00:00.000Z'),
    dueDate: new Date('2026-06-09T09:00:00.000Z'),
    invoiceStatus: 'ISSUED',
    paymentStatus: 'PAID',
    printedCount: 2,
    syncStatus: 'SYNCED',
    syncReference: 'SYNC-2526-0003',
    cancellationReason: null,
    remarks: 'Settled hotel supply order with mixed article lines.',
    items: [
      {
        id: 'sales_invoice_paid_0003_item_1',
        productId: 'fg_bamboo_linen_shirt',
        productCode: 'FG-SHT-003',
        productName: 'Bamboo-Linen Relaxed Shirt',
        quantity: 3,
        unitPrice: 4290,
        discountAmount: 150,
        costPrice: 2010,
        warehouseId: null,
      },
      {
        id: 'sales_invoice_paid_0003_item_2',
        productId: 'fg_bamboo_tee',
        productCode: 'FG-TEE-001',
        productName: 'Bamboo Crew Neck Tee',
        quantity: 2,
        unitPrice: 2450,
        discountAmount: 0,
        costPrice: 1380,
        warehouseId: null,
      },
    ],
    stockMovements: [
      {
        id: 'sales_invoice_paid_0003_stock_1',
        rawMaterialId: 'fg_bamboo_linen_shirt',
        change: -3,
        unit: 'piece',
        transactionType: 'SALE_ISSUE',
        reason: 'Issued sales invoice SI-2526-0003',
        referenceId: 'sales_invoice_paid_0003_stock_1',
        unitCost: 2010,
        createdAt: new Date('2026-05-25T10:05:00.000Z'),
      },
      {
        id: 'sales_invoice_paid_0003_stock_2',
        rawMaterialId: 'fg_bamboo_tee',
        change: -2,
        unit: 'piece',
        transactionType: 'SALE_ISSUE',
        reason: 'Issued sales invoice SI-2526-0003',
        referenceId: 'sales_invoice_paid_0003_stock_2',
        unitCost: 1380,
        createdAt: new Date('2026-05-25T10:06:00.000Z'),
      },
    ],
    payments: [
      {
        id: 'sales_invoice_paid_0003_payment_1',
        paymentDate: new Date('2026-05-25T13:30:00.000Z'),
        amount: 'FULL',
        method: 'BANK_TRANSFER',
        referenceNumber: 'EFT-2526-5521',
        notes: 'Full settlement received the same day the invoice was issued.',
      },
    ],
  },
  {
    id: 'sales_invoice_cancelled_0004',
    invoiceNumber: 'SI-2526-0004',
    fiscalYear: '2025/26',
    customerCode: 'CUS-BKT-004',
    invoiceDate: new Date('2026-05-29T09:00:00.000Z'),
    dueDate: new Date('2026-06-13T09:00:00.000Z'),
    invoiceStatus: 'CANCELLED',
    paymentStatus: 'UNPAID',
    printedCount: 1,
    syncStatus: 'VOIDED',
    syncReference: 'SYNC-2526-0004',
    cancellationReason: 'Customer postponed the showroom launch and cancelled the shipment before delivery.',
    remarks: 'Cancelled after issue; stock was reversed back into articles.',
    items: [
      {
        id: 'sales_invoice_cancelled_0004_item_1',
        productId: 'fg_linen_pant',
        productCode: 'FG-PNT-004',
        productName: 'Linen Lounge Pant',
        quantity: 4,
        unitPrice: 3490,
        discountAmount: 0,
        costPrice: 2140,
        warehouseId: null,
      },
    ],
    stockMovements: [
      {
        id: 'sales_invoice_cancelled_0004_stock_1',
        rawMaterialId: 'fg_linen_pant',
        change: -4,
        unit: 'piece',
        transactionType: 'SALE_ISSUE',
        reason: 'Issued sales invoice SI-2526-0004 before cancellation',
        referenceId: 'sales_invoice_cancelled_0004_stock_1',
        unitCost: 2140,
        createdAt: new Date('2026-05-29T10:00:00.000Z'),
      },
      {
        id: 'sales_invoice_cancelled_0004_stock_2',
        rawMaterialId: 'fg_linen_pant',
        change: 4,
        unit: 'piece',
        transactionType: 'SALE_CANCEL_REVERSE',
        reason: 'Reversed stock for cancelled sales invoice SI-2526-0004',
        referenceId: 'sales_invoice_cancelled_0004_stock_2',
        unitCost: 2140,
        createdAt: new Date('2026-05-30T08:30:00.000Z'),
      },
    ],
    payments: [],
  },
]

const salesTableNames = {
  customers: 'sales_customers',
  invoices: 'sales_invoices',
  items: 'sales_invoice_items',
  payments: 'sales_invoice_payments',
} as const

const createSalesTables = async (prisma: PrismaClient) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${salesTableNames.customers} (
      id VARCHAR(191) PRIMARY KEY,
      customer_code VARCHAR(191) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      pan_vat_number VARCHAR(191),
      phone VARCHAR(191),
      email VARCHAR(255),
      billing_address TEXT,
      shipping_address TEXT,
      contact_person VARCHAR(255),
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${salesTableNames.invoices} (
      id VARCHAR(191) PRIMARY KEY,
      invoice_number VARCHAR(191) NOT NULL UNIQUE,
      fiscal_year VARCHAR(64),
      customer_id VARCHAR(191) NOT NULL,
      invoice_date DATETIME NOT NULL,
      due_date DATETIME,
      subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      non_taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      due_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
      invoice_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
      printed_count INTEGER NOT NULL DEFAULT 0,
      sync_status VARCHAR(191),
      sync_reference VARCHAR(191),
      cancellation_reason TEXT,
      remarks TEXT,
      created_by INTEGER,
      approved_by INTEGER,
      issued_by INTEGER,
      cancelled_by INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      issued_at DATETIME,
      cancelled_at DATETIME,
      CONSTRAINT fk_sales_invoices_customer FOREIGN KEY (customer_id) REFERENCES ${salesTableNames.customers}(id) ON DELETE RESTRICT
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${salesTableNames.items} (
      id VARCHAR(191) PRIMARY KEY,
      invoice_id VARCHAR(191) NOT NULL,
      product_id VARCHAR(191) NOT NULL,
      product_code VARCHAR(191),
      product_name VARCHAR(255) NOT NULL,
      quantity NUMERIC(14,2) NOT NULL,
      unit_price NUMERIC(14,2) NOT NULL,
      discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      line_total NUMERIC(14,2) NOT NULL,
      cost_price NUMERIC(14,2) NOT NULL DEFAULT 0,
      profit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      warehouse_id VARCHAR(191),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sales_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES ${salesTableNames.invoices}(id) ON DELETE CASCADE
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${salesTableNames.payments} (
      id VARCHAR(191) PRIMARY KEY,
      invoice_id VARCHAR(191) NOT NULL,
      payment_date DATETIME NOT NULL,
      amount NUMERIC(14,2) NOT NULL,
      method VARCHAR(191) NOT NULL,
      reference_number VARCHAR(191),
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sales_invoice_payments_invoice FOREIGN KEY (invoice_id) REFERENCES ${salesTableNames.invoices}(id) ON DELETE CASCADE
    );
  `)
}

const upsertCustomer = async (
  tx: Prisma.TransactionClient,
  customer: CustomerSeed,
  createdByUserId?: number,
) => {
  await tx.$executeRaw`
    INSERT INTO ${Prisma.raw(salesTableNames.customers)} (
      id,
      customer_code,
      name,
      pan_vat_number,
      phone,
      email,
      billing_address,
      shipping_address,
      contact_person,
      notes,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      ${customer.id},
      ${customer.customerCode},
      ${customer.name},
      ${customer.panVatNumber},
      ${customer.phone},
      ${customer.email},
      ${customer.billingAddress},
      ${customer.shippingAddress},
      ${customer.contactPerson},
      ${customer.notes},
      ${createdByUserId ?? null},
      NOW(),
      NOW()
    )
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      pan_vat_number = VALUES(pan_vat_number),
      phone = VALUES(phone),
      email = VALUES(email),
      billing_address = VALUES(billing_address),
      shipping_address = VALUES(shipping_address),
      contact_person = VALUES(contact_person),
      notes = VALUES(notes),
      updated_at = VALUES(updated_at);
  `
}

const upsertFinishedGoods = async (tx: Prisma.TransactionClient, createdByUserId?: number) => {
  const category = await tx.rawMaterialCategory.upsert({
    where: { id: 'cat_finished_goods' },
    create: {
      id: 'cat_finished_goods',
      categoryName: 'Articles',
      description: 'Ready-to-sell garments backed by article stock transactions.',
    },
    update: {
      categoryName: 'Articles',
      description: 'Ready-to-sell garments backed by article stock transactions.',
      deletedAt: null,
    },
  })

  const records = []

  for (const good of finishedGoods) {
    const record = await tx.rawMaterial.upsert({
      where: { id: good.id },
      create: {
        id: good.id,
        sku: good.sku,
        name: good.name,
        description: good.description,
        defaultUnit: good.unit,
        categoryId: category.id,
        active: true,
        costPrice: new Prisma.Decimal(String(good.costPrice)),
        reorderLevel: good.reorderLevel,
        averageUnitCost: new Prisma.Decimal(String(good.averageUnitCost)),
        notes: 'Seeded article item for sales invoice demo data.',
        createdBy: createdByUserId,
        updatedBy: createdByUserId,
      },
      update: {
        sku: good.sku,
        name: good.name,
        description: good.description,
        defaultUnit: good.unit,
        categoryId: category.id,
        active: true,
        costPrice: new Prisma.Decimal(String(good.costPrice)),
        reorderLevel: good.reorderLevel,
        averageUnitCost: new Prisma.Decimal(String(good.averageUnitCost)),
        notes: 'Seeded article item for sales invoice demo data.',
        deletedAt: null,
        updatedBy: createdByUserId,
      },
    })
    records.push(record)
  }

  return records
}

const deleteSeededRows = async (tx: Prisma.TransactionClient) => {
  const invoiceIds = invoiceSeeds.map((invoice) => invoice.id)
  const paymentIds = invoiceSeeds.flatMap((invoice) => invoice.payments.map((payment) => payment.id))
  const itemIds = invoiceSeeds.flatMap((invoice) => invoice.items.map((item) => item.id))
  const stockReferenceIds = [
    ...finishedGoods.map((good) => good.openingReferenceId),
    ...invoiceSeeds.flatMap((invoice) => invoice.stockMovements.map((movement) => movement.referenceId)),
  ]

  if (paymentIds.length > 0) {
    await tx.$executeRaw`
      DELETE FROM ${Prisma.raw(salesTableNames.payments)}
      WHERE id IN (${Prisma.join(paymentIds)})
    `
  }

  if (itemIds.length > 0) {
    await tx.$executeRaw`
      DELETE FROM ${Prisma.raw(salesTableNames.items)}
      WHERE id IN (${Prisma.join(itemIds)})
    `
  }

  if (invoiceIds.length > 0) {
    await tx.$executeRaw`
      DELETE FROM ${Prisma.raw(salesTableNames.invoices)}
      WHERE id IN (${Prisma.join(invoiceIds)})
    `
  }

  if (stockReferenceIds.length > 0) {
    await tx.stockTransaction.deleteMany({
      where: {
        referenceId: { in: stockReferenceIds },
      },
    })
  }
}

const seedOpeningStock = async (tx: Prisma.TransactionClient, createdByUserId?: number) => {
  for (const good of finishedGoods) {
    const currentStock = await tx.stockTransaction.aggregate({
      _sum: { change: true },
      where: { rawMaterialId: good.id },
    })
    const balanceBefore = Number(currentStock._sum.change || 0)
    const balanceAfter = roundMoney(balanceBefore + good.openingStock)

    await tx.stockTransaction.create({
      data: {
        rawMaterialId: good.id,
        change: good.openingStock,
        unit: good.unit,
        transactionType: 'PRODUCTION_RECEIPT',
        balanceAfter,
        unitCost: new Prisma.Decimal(String(good.costPrice)),
        reason: 'Seeded opening article stock for sales invoice demo data.',
        referenceId: good.openingReferenceId,
        createdBy: createdByUserId,
        createdAt: new Date('2026-05-17T08:00:00.000Z'),
      },
    })
  }
}

const seedInvoices = async (tx: Prisma.TransactionClient, createdByUserId?: number) => {
  for (const customer of salesCustomers) {
    await upsertCustomer(tx, customer, createdByUserId)
  }

  for (const invoice of invoiceSeeds) {
    const customer = salesCustomers.find((entry) => entry.customerCode === invoice.customerCode)
    if (!customer) {
      throw new Error(`Missing customer seed for invoice ${invoice.invoiceNumber}`)
    }

    const totals = calculateTotals(invoice.items)
    const paidAmount = invoice.paymentStatus === 'PAID' ? totals.grandTotal : 0
    const dueAmount = roundMoney(totals.grandTotal - paidAmount)

    await tx.$executeRaw`
      INSERT INTO ${Prisma.raw(salesTableNames.invoices)} (
        id,
        invoice_number,
        fiscal_year,
        customer_id,
        invoice_date,
        due_date,
        subtotal,
        discount_amount,
        taxable_amount,
        non_taxable_amount,
        tax_amount,
        grand_total,
        paid_amount,
        due_amount,
        payment_status,
        invoice_status,
        printed_count,
        sync_status,
        sync_reference,
        cancellation_reason,
        remarks,
        created_by,
        approved_by,
        issued_by,
        cancelled_by,
        created_at,
        updated_at,
        approved_at,
        issued_at,
        cancelled_at
      )
      VALUES (
        ${invoice.id},
        ${invoice.invoiceNumber},
        ${invoice.fiscalYear},
        ${customer.id},
        ${invoice.invoiceDate},
        ${invoice.dueDate},
        ${totals.subtotal},
        ${totals.discountAmount},
        ${totals.taxableAmount},
        ${0},
        ${totals.taxAmount},
        ${totals.grandTotal},
        ${paidAmount},
        ${dueAmount},
        ${invoice.paymentStatus},
        ${invoice.invoiceStatus},
        ${invoice.printedCount},
        ${invoice.syncStatus},
        ${invoice.syncReference},
        ${invoice.cancellationReason},
        ${invoice.remarks},
        ${createdByUserId ?? null},
        ${invoice.invoiceStatus === 'DRAFT' ? null : createdByUserId ?? null},
        ${invoice.invoiceStatus === 'DRAFT' ? null : createdByUserId ?? null},
        ${invoice.invoiceStatus === 'CANCELLED' ? createdByUserId ?? null : null},
        ${invoice.invoiceDate},
        NOW(),
        ${invoice.invoiceStatus === 'DRAFT' ? null : invoice.invoiceDate},
        ${invoice.invoiceStatus === 'DRAFT' ? null : invoice.invoiceDate},
        ${invoice.invoiceStatus === 'CANCELLED' ? invoice.stockMovements.at(-1)?.createdAt ?? null : null}
      )
      ON DUPLICATE KEY UPDATE
        fiscal_year = VALUES(fiscal_year),
        customer_id = VALUES(customer_id),
        invoice_date = VALUES(invoice_date),
        due_date = VALUES(due_date),
        subtotal = VALUES(subtotal),
        discount_amount = VALUES(discount_amount),
        taxable_amount = VALUES(taxable_amount),
        non_taxable_amount = VALUES(non_taxable_amount),
        tax_amount = VALUES(tax_amount),
        grand_total = VALUES(grand_total),
        paid_amount = VALUES(paid_amount),
        due_amount = VALUES(due_amount),
        payment_status = VALUES(payment_status),
        invoice_status = VALUES(invoice_status),
        printed_count = VALUES(printed_count),
        sync_status = VALUES(sync_status),
        sync_reference = VALUES(sync_reference),
        cancellation_reason = VALUES(cancellation_reason),
        remarks = VALUES(remarks),
        created_by = VALUES(created_by),
        approved_by = VALUES(approved_by),
        issued_by = VALUES(issued_by),
        cancelled_by = VALUES(cancelled_by),
        updated_at = VALUES(updated_at),
        approved_at = VALUES(approved_at),
        issued_at = VALUES(issued_at),
        cancelled_at = VALUES(cancelled_at);
    `

    for (const item of invoice.items) {
      const quantity = item.quantity
      const lineSubtotal = roundMoney(quantity * item.unitPrice)
      const taxableAmount = roundMoney(lineSubtotal - item.discountAmount)
      const taxAmount = roundMoney(taxableAmount * TAX_RATE)
      const lineTotal = roundMoney(taxableAmount + taxAmount)
      const profitAmount = roundMoney(lineTotal - quantity * item.costPrice)

      await tx.$executeRaw`
        INSERT INTO ${Prisma.raw(salesTableNames.items)} (
          id,
          invoice_id,
          product_id,
          product_code,
          product_name,
          quantity,
          unit_price,
          discount_amount,
          taxable_amount,
          tax_amount,
          line_total,
          cost_price,
          profit_amount,
          warehouse_id,
          created_at
        )
        VALUES (
          ${item.id},
          ${invoice.id},
          ${item.productId},
          ${item.productCode},
          ${item.productName},
          ${quantity},
          ${item.unitPrice},
          ${item.discountAmount},
          ${taxableAmount},
          ${taxAmount},
          ${lineTotal},
          ${item.costPrice},
          ${profitAmount},
          ${item.warehouseId},
          ${invoice.invoiceDate}
        )
        ON DUPLICATE KEY UPDATE
          invoice_id = VALUES(invoice_id),
          product_id = VALUES(product_id),
          product_code = VALUES(product_code),
          product_name = VALUES(product_name),
          quantity = VALUES(quantity),
          unit_price = VALUES(unit_price),
          discount_amount = VALUES(discount_amount),
          taxable_amount = VALUES(taxable_amount),
          tax_amount = VALUES(tax_amount),
          line_total = VALUES(line_total),
          cost_price = VALUES(cost_price),
          profit_amount = VALUES(profit_amount),
          warehouse_id = VALUES(warehouse_id),
          created_at = VALUES(created_at);
      `
    }

    for (const payment of invoice.payments) {
      const paymentAmount = payment.amount === 'FULL' ? totals.grandTotal : payment.amount

      await tx.$executeRaw`
        INSERT INTO ${Prisma.raw(salesTableNames.payments)} (
          id,
          invoice_id,
          payment_date,
          amount,
          method,
          reference_number,
          notes,
          created_at
        )
        VALUES (
          ${payment.id},
          ${invoice.id},
          ${payment.paymentDate},
          ${paymentAmount},
          ${payment.method},
          ${payment.referenceNumber},
          ${payment.notes},
          ${payment.paymentDate}
        )
        ON DUPLICATE KEY UPDATE
          invoice_id = VALUES(invoice_id),
          payment_date = VALUES(payment_date),
          amount = VALUES(amount),
          method = VALUES(method),
          reference_number = VALUES(reference_number),
          notes = VALUES(notes),
          created_at = VALUES(created_at);
      `
    }

    for (const movement of invoice.stockMovements) {
      const balanceQuery = await tx.stockTransaction.aggregate({
        _sum: { change: true },
        where: { rawMaterialId: movement.rawMaterialId },
      })
      const balanceBefore = Number(balanceQuery._sum.change || 0)
      const balanceAfter = roundMoney(balanceBefore + movement.change)

      await tx.stockTransaction.create({
        data: {
          rawMaterialId: movement.rawMaterialId,
          change: movement.change,
          unit: movement.unit,
          transactionType: movement.transactionType,
          balanceAfter,
          unitCost: new Prisma.Decimal(String(movement.unitCost)),
          reason: movement.reason,
          referenceId: movement.referenceId,
          createdBy: createdByUserId,
          createdAt: movement.createdAt,
        },
      })
    }
  }
}

export async function seedSalesInvoices({ prisma, createdByUserId }: SeedSalesInvoicesOptions) {
  await createSalesTables(prisma)

  const finishedGoodsSeed = await prisma.$transaction(async (tx) => {
    await deleteSeededRows(tx)
    const goods = await upsertFinishedGoods(tx, createdByUserId)
    await seedOpeningStock(tx, createdByUserId)
    await seedInvoices(tx, createdByUserId)
    return goods
  })

  return {
    customers: salesCustomers.length,
    finishedGoods: finishedGoodsSeed.length,
    invoices: invoiceSeeds.length,
  }
}

export async function main() {
  const prisma = new PrismaClient()
  try {
    const summary = await seedSalesInvoices({ prisma })
    console.log(
      `Sales invoice seed complete: ${summary.customers} customers, ${summary.finishedGoods} articles, ${summary.invoices} invoices`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
