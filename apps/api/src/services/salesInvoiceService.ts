import { Prisma } from '@prisma/client'
import { stringify } from 'csv-stringify/sync'
import { prisma } from '../prisma'
import * as repo from '../repositories/salesInvoiceRepository'
import { AppError } from '../utils/errors'
import { getSalesCatalogProductsByIds, listSalesCatalogProducts } from './salesCatalogService'

type InvoiceItemInput = {
  productId: string
  quantity: number
  unitPrice?: number
  discountAmount?: number
  warehouseId?: string
}

const VAT_RATE = new Prisma.Decimal('0.13')

function toDate(value?: string | Date | null) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function decimal(value: number | string | Prisma.Decimal | null | undefined, fallback = 0) {
  return new Prisma.Decimal(value ?? fallback)
}

function deriveLineTaxableAmount(quantity: Prisma.Decimal, unitPrice: Prisma.Decimal, discountAmount: Prisma.Decimal) {
  const taxableAmount = quantity.mul(unitPrice).minus(discountAmount)
  return taxableAmount.lessThan(0) ? new Prisma.Decimal(0) : taxableAmount
}

function deriveLineAmounts(item: InvoiceItemInput, unitPrice: Prisma.Decimal, product: any) {
  const quantity = decimal(item.quantity)
  const discountAmount = decimal(item.discountAmount)
  const taxableAmount = deriveLineTaxableAmount(quantity, unitPrice, discountAmount)
  const taxAmount = taxableAmount.mul(VAT_RATE)
  const lineTotal = taxableAmount.plus(taxAmount)
  const costPrice = decimal(product.costPrice)
  const profitAmount = lineTotal.minus(quantity.mul(costPrice))

  return {
    quantity,
    unitPrice,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
    costPrice,
    profitAmount,
  }
}

function sumExistingItemTaxableAmount(item: any) {
  if (item.taxableAmount != null) return decimal(item.taxableAmount)
  if (item.lineTotal != null && item.taxAmount != null) {
    return decimal(item.lineTotal).minus(decimal(item.taxAmount))
  }
  return deriveLineTaxableAmount(decimal(item.quantity), decimal(item.unitPrice), decimal(item.discountAmount))
}

function buildInvoiceTotalsFromItems(items: any[], invoiceDiscountValue: number | string | Prisma.Decimal | null | undefined) {
  const subtotal = items.reduce((sum, item) => sum.plus(sumExistingItemTaxableAmount(item)), new Prisma.Decimal(0))
  const invoiceDiscount = decimal(invoiceDiscountValue)

  if (invoiceDiscount.greaterThan(subtotal)) {
    throw new AppError(400, 'INVALID_DISCOUNT', 'Invoice discount cannot exceed the subtotal')
  }

  const taxableAmount = subtotal.minus(invoiceDiscount)
  const taxAmount = taxableAmount.mul(VAT_RATE)
  const grandTotal = taxableAmount.plus(taxAmount)

  return { subtotal, invoiceDiscount, taxableAmount, taxAmount, grandTotal }
}

async function buildInvoiceData(payload: any) {
  const customer = await prisma.customer.findUnique({ where: { id: payload.customerId } })
  if (!customer) {
    throw new AppError(404, 'NOT_FOUND', 'Customer not found')
  }

  const items: InvoiceItemInput[] = payload.items || []
  const productMap = await getSalesCatalogProductsByIds(items.map((item) => item.productId))

  const invoiceDiscountValue = payload.discountAmount ?? 0
  const preparedItems: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>> = []

  for (const item of items) {
    const product = productMap.get(item.productId)!
    const unitPrice = decimal(item.unitPrice ?? product.sellingPrice ?? 0)
    const lineAmounts = deriveLineAmounts(item, unitPrice, product)

    preparedItems.push({
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      quantity: Number(lineAmounts.quantity),
      unitPrice: lineAmounts.unitPrice,
      discountAmount: lineAmounts.discountAmount,
      taxableAmount: lineAmounts.taxableAmount,
      taxAmount: lineAmounts.taxAmount,
      lineTotal: lineAmounts.lineTotal,
      costPrice: lineAmounts.costPrice,
      profitAmount: lineAmounts.profitAmount,
      warehouseId: item.warehouseId || null,
    })
  }

  const totals = buildInvoiceTotalsFromItems(preparedItems, invoiceDiscountValue)

  const invoiceDate = toDate(payload.invoiceDate) || new Date()
  const dueDate = toDate(payload.dueDate)

  return {
    invoiceData: {
      invoiceNumber: payload.invoiceNumber ?? null,
      fiscalYear: payload.fiscalYear || `FY${invoiceDate.getFullYear()}`,
      customerId: payload.customerId,
      salesOrderId: payload.salesOrderId ?? null,
      invoiceDate,
      dueDate,
      subtotal: totals.subtotal,
      discountAmount: totals.invoiceDiscount,
      taxableAmount: totals.taxableAmount,
      nonTaxableAmount: new Prisma.Decimal(0),
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      paidAmount: new Prisma.Decimal(0),
      dueAmount: totals.grandTotal,
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
  const invoiceDiscountValue = payload.discountAmount ?? invoice.discountAmount ?? 0
  const preparedItems: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>> = []

  for (const item of invoice.items) {
    const quantity = decimal(item.quantity)
    const unitPrice = decimal(item.unitPrice)
    const discountAmount = decimal(item.discountAmount)
    const taxableAmount = sumExistingItemTaxableAmount(item)
    const taxAmount = taxableAmount.mul(VAT_RATE)
    const lineTotal = taxableAmount.plus(taxAmount)
    const costPrice = decimal(item.costPrice)

    preparedItems.push({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: Number(quantity),
      unitPrice,
      discountAmount,
      taxableAmount,
      taxAmount,
      lineTotal,
      costPrice,
      profitAmount: lineTotal.minus(quantity.mul(costPrice)),
      warehouseId: item.warehouseId || null,
    })
  }

  const totals = buildInvoiceTotalsFromItems(invoice.items, invoiceDiscountValue)
  const paidAmount = decimal(invoice.paidAmount)
  const dueAmount = totals.grandTotal.minus(paidAmount)

  return {
    invoiceData: {
      invoiceNumber: payload.invoiceNumber ?? invoice.invoiceNumber ?? null,
      fiscalYear: payload.fiscalYear ?? invoice.fiscalYear ?? `FY${new Date(invoice.invoiceDate).getFullYear()}`,
      customerId: payload.customerId ?? invoice.customerId,
      invoiceDate: toDate(payload.invoiceDate) || invoice.invoiceDate,
      dueDate: toDate(payload.dueDate) ?? invoice.dueDate,
      subtotal: totals.subtotal,
      discountAmount: totals.invoiceDiscount,
      taxableAmount: totals.taxableAmount,
      nonTaxableAmount: invoice.nonTaxableAmount ?? new Prisma.Decimal(0),
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      paidAmount,
      dueAmount,
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
  return listSalesCatalogProducts(opts)
}

export async function getInvoice(id: string) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) return null
  return invoice
}

export async function previewNextInvoiceNumber(invoiceDate: Date) {
  return repo.previewNextInvoiceNumber(invoiceDate)
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
    ? await buildInvoiceData({
        ...payload,
        invoiceNumber: payload.invoiceNumber ?? invoice.invoiceNumber ?? null,
        customerId: payload.customerId || invoice.customerId,
        createdBy: userId,
      })
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
