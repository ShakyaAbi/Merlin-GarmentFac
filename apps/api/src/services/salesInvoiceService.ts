import { Prisma } from '@prisma/client'
import { stringify } from 'csv-stringify/sync'
import { prisma } from '../prisma'
import * as repo from '../repositories/salesInvoiceRepository'
import { AppError } from '../utils/errors'

type InvoiceItemInput = {
  productId: string
  quantity: number
  unitPrice?: number
  discountAmount?: number
  warehouseId?: string
}

function toDate(value?: string | Date | null) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

async function buildInvoiceData(payload: any) {
  const customer = await prisma.customer.findUnique({ where: { id: payload.customerId } })
  if (!customer) {
    throw new AppError(404, 'NOT_FOUND', 'Customer not found')
  }

  const items: InvoiceItemInput[] = payload.items || []
  const productIds = [...new Set(items.map((item) => item.productId))]
  const products = await prisma.finishedGoodProduct.findMany({
    where: { id: { in: productIds }, deletedAt: null },
  })
  const productMap = new Map(products.map((product) => [product.id, product]))

  if (productMap.size !== productIds.length) {
    const missing = productIds.filter((id) => !productMap.has(id))
    throw new AppError(400, 'INVALID_PRODUCT', `Unknown finished-good product(s): ${missing.join(', ')}`)
  }

  const invoiceDiscount = new Prisma.Decimal(payload.discountAmount || 0)
  const taxAmount = new Prisma.Decimal(payload.taxAmount || 0)
  const preparedItems: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>> = []
  let subtotal = new Prisma.Decimal(0)
  let totalProfit = new Prisma.Decimal(0)

  for (const item of items) {
    const product = productMap.get(item.productId)!
    const quantity = new Prisma.Decimal(item.quantity)
    const unitPrice = new Prisma.Decimal(item.unitPrice ?? product.sellingPrice ?? 0)
    const itemDiscount = new Prisma.Decimal(item.discountAmount || 0)
    const lineGross = quantity.mul(unitPrice)
    const lineTotal = lineGross.minus(itemDiscount)
    const costPrice = new Prisma.Decimal(product.costPrice || 0)
    const profitAmount = lineTotal.minus(quantity.mul(costPrice))

    subtotal = subtotal.plus(lineTotal)
    totalProfit = totalProfit.plus(profitAmount)

    preparedItems.push({
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      quantity: Number(item.quantity),
      unitPrice,
      discountAmount: itemDiscount,
      taxableAmount: lineTotal,
      taxAmount: new Prisma.Decimal(0),
      lineTotal,
      costPrice,
      profitAmount,
      warehouseId: item.warehouseId || null,
    })
  }

  if (invoiceDiscount.greaterThan(subtotal)) {
    throw new AppError(400, 'INVALID_DISCOUNT', 'Invoice discount cannot exceed the subtotal')
  }

  const taxableAmount = subtotal.minus(invoiceDiscount)
  const grandTotal = taxableAmount.plus(taxAmount)
  const invoiceDate = toDate(payload.invoiceDate) || new Date()
  const dueDate = toDate(payload.dueDate)

  return {
    invoiceData: {
      invoiceNumber: payload.invoiceNumber || null,
      fiscalYear: payload.fiscalYear || `FY${invoiceDate.getFullYear()}`,
      customerId: payload.customerId,
      salesOrderId: payload.salesOrderId ?? null,
      invoiceDate,
      dueDate,
      subtotal,
      discountAmount: invoiceDiscount,
      taxableAmount,
      nonTaxableAmount: new Prisma.Decimal(0),
      taxAmount,
      grandTotal,
      paidAmount: new Prisma.Decimal(0),
      dueAmount: grandTotal,
      paymentStatus: 'UNPAID',
      invoiceStatus: 'DRAFT',
      remarks: payload.remarks || null,
      createdBy: payload.createdBy ?? null,
    } as Prisma.SalesInvoiceUncheckedCreateInput,
    items: preparedItems,
  }
}

function invoiceDraftable(invoice: any) {
  return invoice.invoiceStatus === 'DRAFT' || invoice.invoiceStatus === 'PENDING_APPROVAL'
}

function invoiceEditable(invoice: any) {
  return invoice.invoiceStatus === 'DRAFT'
}

function rebuildFromExisting(invoice: any, payload: any) {
  const invoiceDiscount = new Prisma.Decimal(payload.discountAmount ?? invoice.discountAmount ?? 0)
  const taxAmount = new Prisma.Decimal(payload.taxAmount ?? invoice.taxAmount ?? 0)
  const preparedItems: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>> = []
  let subtotal = new Prisma.Decimal(0)
  let totalProfit = new Prisma.Decimal(0)

  for (const item of invoice.items) {
    const lineTotal = new Prisma.Decimal(item.lineTotal || 0)
    const quantity = new Prisma.Decimal(item.quantity || 0)
    const costPrice = new Prisma.Decimal(item.costPrice || 0)

    subtotal = subtotal.plus(lineTotal)
    totalProfit = totalProfit.plus(lineTotal.minus(quantity.mul(costPrice)))

    preparedItems.push({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: Number(item.quantity),
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      taxableAmount: item.taxableAmount,
      taxAmount: item.taxAmount,
      lineTotal: item.lineTotal,
      costPrice: item.costPrice,
      profitAmount: item.profitAmount,
      warehouseId: item.warehouseId || null,
    })
  }

  if (invoiceDiscount.greaterThan(subtotal)) {
    throw new AppError(400, 'INVALID_DISCOUNT', 'Invoice discount cannot exceed the subtotal')
  }

  const taxableAmount = subtotal.minus(invoiceDiscount)
  const grandTotal = taxableAmount.plus(taxAmount)

  return {
    invoiceData: {
      invoiceNumber: payload.invoiceNumber ?? invoice.invoiceNumber ?? null,
      fiscalYear: payload.fiscalYear ?? invoice.fiscalYear ?? `FY${new Date(invoice.invoiceDate).getFullYear()}`,
      customerId: payload.customerId ?? invoice.customerId,
      invoiceDate: toDate(payload.invoiceDate) || invoice.invoiceDate,
      dueDate: toDate(payload.dueDate) ?? invoice.dueDate,
      subtotal,
      discountAmount: invoiceDiscount,
      taxableAmount,
      nonTaxableAmount: invoice.nonTaxableAmount ?? new Prisma.Decimal(0),
      taxAmount,
      grandTotal,
      paidAmount: invoice.paidAmount ?? new Prisma.Decimal(0),
      dueAmount: grandTotal.minus(new Prisma.Decimal(invoice.paidAmount || 0)),
      remarks: payload.remarks ?? invoice.remarks ?? null,
    },
    items: preparedItems,
  }
}

export async function listInvoices(opts: any = {}) {
  return repo.listInvoices(opts)
}

export async function exportInvoices(opts: {
  search?: string
  customerId?: string
  invoiceStatus?: any
  paymentStatus?: any
} = {}) {
  const data = await repo.listInvoices({ ...opts, page: 1, pageSize: 1000 })
  const rows = data.items.map((invoice: any) => ({
    invoiceNumber: invoice.invoiceNumber || invoice.id,
    customerName: invoice.customer?.customerName || '',
    invoiceDate: invoice.invoiceDate?.toISOString?.() || invoice.invoiceDate,
    dueDate: invoice.dueDate?.toISOString?.() || invoice.dueDate || '',
    invoiceStatus: invoice.invoiceStatus || '',
    paymentStatus: invoice.paymentStatus || '',
    grandTotal: Number(invoice.grandTotal ?? 0),
    paidAmount: Number(invoice.paidAmount ?? 0),
    dueAmount: Number(invoice.dueAmount ?? 0),
    remarks: invoice.remarks || '',
  }))

  return stringify(rows, {
    header: true,
    columns: [
      { key: 'invoiceNumber', header: 'Invoice Number' },
      { key: 'customerName', header: 'Customer' },
      { key: 'invoiceDate', header: 'Invoice Date' },
      { key: 'dueDate', header: 'Due Date' },
      { key: 'invoiceStatus', header: 'Invoice Status' },
      { key: 'paymentStatus', header: 'Payment Status' },
      { key: 'grandTotal', header: 'Grand Total' },
      { key: 'paidAmount', header: 'Paid Amount' },
      { key: 'dueAmount', header: 'Due Amount' },
      { key: 'remarks', header: 'Remarks' },
    ],
  })
}

export async function exportInvoice(id: string) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) {
    throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  }

  const rows = [
    {
      invoiceNumber: invoice.invoiceNumber || invoice.id,
      customerName: invoice.customer?.customerName || '',
      invoiceDate: invoice.invoiceDate?.toISOString?.() || invoice.invoiceDate,
      dueDate: invoice.dueDate?.toISOString?.() || invoice.dueDate || '',
      invoiceStatus: invoice.invoiceStatus || '',
      paymentStatus: invoice.paymentStatus || '',
      grandTotal: Number(invoice.grandTotal ?? 0),
      paidAmount: Number(invoice.paidAmount ?? 0),
      dueAmount: Number(invoice.dueAmount ?? 0),
      remarks: invoice.remarks || '',
      lines: invoice.items.length,
    },
  ]

  return stringify(rows, {
    header: true,
    columns: [
      { key: 'invoiceNumber', header: 'Invoice Number' },
      { key: 'customerName', header: 'Customer' },
      { key: 'invoiceDate', header: 'Invoice Date' },
      { key: 'dueDate', header: 'Due Date' },
      { key: 'invoiceStatus', header: 'Invoice Status' },
      { key: 'paymentStatus', header: 'Payment Status' },
      { key: 'grandTotal', header: 'Grand Total' },
      { key: 'paidAmount', header: 'Paid Amount' },
      { key: 'dueAmount', header: 'Due Amount' },
      { key: 'remarks', header: 'Remarks' },
      { key: 'lines', header: 'Lines' },
    ],
  })
}

export async function listCustomers(opts: { search?: string } = {}) {
  const where: any = { deletedAt: null }
  if (opts.search) {
    where.OR = [
      { customerName: { contains: opts.search, mode: 'insensitive' } },
      { phone: { contains: opts.search, mode: 'insensitive' } },
      { panVatNumber: { contains: opts.search, mode: 'insensitive' } },
      { customerType: { contains: opts.search, mode: 'insensitive' } },
      { email: { contains: opts.search, mode: 'insensitive' } },
    ]
  }

  return prisma.customer.findMany({
    where,
    orderBy: { customerName: 'asc' },
    select: {
      id: true,
      customerName: true,
      phone: true,
      address: true,
      panVatNumber: true,
      customerType: true,
      email: true,
      notes: true,
      createdAt: true,
    },
  })
}

export async function listProducts(opts: { search?: string } = {}) {
  const where: any = { deletedAt: null }
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
      { productCode: { contains: opts.search, mode: 'insensitive' } },
      { category: { contains: opts.search, mode: 'insensitive' } },
      { description: { contains: opts.search, mode: 'insensitive' } },
    ]
  }

  const products = await prisma.finishedGoodProduct.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      sku: true,
      productCode: true,
      name: true,
      description: true,
      category: true,
      unit: true,
      sellingPrice: true,
      costPrice: true,
      active: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  })

  const stockRows = products.length
    ? await prisma.finishedGoodStockTransaction.groupBy({
        by: ['productId'],
        where: { productId: { in: products.map((product) => product.id) } },
        _sum: { change: true },
      })
    : []
  const stockByProductId = new Map(stockRows.map((row) => [row.productId, Number(row._sum.change || 0)]))

  return products.map((product) => ({
    ...product,
    currentStock: stockByProductId.get(product.id) || 0,
  }))
}

export async function getInvoice(id: string) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) return null
  return invoice
}

export async function createInvoice(payload: any, userId?: number) {
  const prepared = await buildInvoiceData({ ...payload, createdBy: userId })
  return repo.createDraftInvoice(prepared.invoiceData, prepared.items)
}

export async function updateInvoice(id: string, payload: any, userId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) {
    throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  }
  if (!invoiceDraftable(invoice)) {
    throw new AppError(409, 'INVALID_STATUS', 'Only draft or pending-approval invoices can be updated')
  }

  const prepared = payload.items?.length
    ? await buildInvoiceData({ ...payload, customerId: payload.customerId || invoice.customerId, createdBy: userId })
    : rebuildFromExisting(invoice, payload)

  return repo.updateDraftInvoice(id, prepared.invoiceData, payload.items?.length ? prepared.items : undefined)
}

export async function submitInvoice(id: string, userId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  if (!invoiceEditable(invoice)) {
    throw new AppError(409, 'INVALID_STATUS', 'Only draft invoices can be submitted for approval')
  }
  return repo.submitInvoice(id)
}

export async function issueInvoice(id: string, userId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  if (invoice.invoiceStatus !== 'PENDING_APPROVAL') {
    throw new AppError(409, 'INVALID_STATUS', 'Only pending-approval invoices can be issued')
  }
  return repo.issueInvoice(id, userId)
}

export async function recordPayment(id: string, payload: any, userId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  return repo.recordPayment(
    id,
    {
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      paymentDate: toDate(payload.paymentDate) || undefined,
      note: payload.note,
    },
    userId,
  )
}

export async function cancelInvoice(id: string, payload: any, userId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  return repo.cancelInvoice(id, payload.reason, userId)
}
