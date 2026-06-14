import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { AppError } from '../utils/errors'
import * as salesInvoiceSvc from './salesInvoiceService'

function toDate(value?: string | Date | null) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

async function loadOrder(tx: any, id: string) {
  return tx.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
      invoices: true,
    },
  })
}

async function validateProducts(items: any[]) {
  const productIds = [...new Set(items.map((item: { productId: string }) => item.productId))]
  const products = await prisma.finishedGoodProduct.findMany({ where: { id: { in: productIds }, deletedAt: null } })
  const productMap = new Map(products.map((product) => [product.id, product]))
  if (productMap.size !== productIds.length) {
    const missing = productIds.filter((id) => !productMap.has(id))
    throw new AppError(400, 'INVALID_PRODUCT', `Unknown article product(s): ${missing.join(', ')}`)
  }
  return productMap
}

type SalesOrderInputLine = {
  productId: string
  quantity: number
  unitPrice?: number | string | null
  discountAmount?: number | string | null
  taxAmount?: number | string | null
}

export async function listSalesOrders(opts: { search?: string; status?: string; customerId?: string } = {}) {
  const where: any = {}
  if (opts.customerId) where.customerId = opts.customerId
  if (opts.status) where.status = opts.status
  if (opts.search) {
    where.OR = [
      { orderNumber: { contains: opts.search, mode: 'insensitive' } },
      { notes: { contains: opts.search, mode: 'insensitive' } },
      { customer: { customerName: { contains: opts.search, mode: 'insensitive' } } },
    ]
  }
  return prisma.salesOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { customer: true, items: { include: { product: true } }, invoices: true },
  } as any)
}

export async function getSalesOrder(id: string) {
  return loadOrder(prisma as any, id)
}

export async function createSalesOrder(payload: any, userId?: number) {
  const customer = await prisma.customer.findUnique({ where: { id: payload.customerId } })
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found')
  const items = payload.items || []
  const productMap = await validateProducts(items)
  const orderDate = toDate(payload.orderDate) || new Date()
  const requiredBy = toDate(payload.requiredBy)

  const preparedItems = items.map((item: SalesOrderInputLine) => {
    const product = productMap.get(item.productId)!
    const unitPrice = new Prisma.Decimal(item.unitPrice ?? product.sellingPrice ?? 0)
    const discountAmount = new Prisma.Decimal(item.discountAmount || 0)
    const taxAmount = new Prisma.Decimal(item.taxAmount || 0)
    const lineTotal = new Prisma.Decimal(item.quantity).mul(unitPrice).minus(discountAmount).plus(taxAmount)
    return {
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      quantity: Number(item.quantity),
      unitPrice,
      discountAmount,
      taxAmount,
      lineTotal,
    }
  })

  const subtotal = preparedItems.reduce((sum: Prisma.Decimal, item: (typeof preparedItems)[number]) => sum.plus(item.lineTotal), new Prisma.Decimal(0))

  return prisma.$transaction(async (tx) => {
    const created = await tx.salesOrder.create({
      data: {
        customerId: payload.customerId,
        orderDate,
        requiredBy,
        notes: payload.notes || null,
        subtotal,
        discountAmount: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        grandTotal: subtotal,
        status: 'DRAFT',
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
      },
    })
    await tx.salesOrderItem.createMany({
    data: preparedItems.map((item: (typeof preparedItems)[number]) => ({ ...item, salesOrderId: created.id })),
    })
    return loadOrder(tx as any, created.id)
  })
}

export async function updateSalesOrder(id: string, payload: any, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await loadOrder(tx as any, id)
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Sales order not found')
    if (existing.status !== 'DRAFT') throw new AppError(409, 'INVALID_STATUS', 'Only draft sales orders can be updated')

    const customerId = payload.customerId ?? existing.customerId
    const customer = await tx.customer.findUnique({ where: { id: customerId } })
    if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found')

    const items: SalesOrderInputLine[] = payload.items || existing.items
    const productMap = await validateProducts(items)
    const preparedItems = items.map((item: SalesOrderInputLine) => {
      const product = productMap.get(item.productId)!
      const unitPrice = new Prisma.Decimal(item.unitPrice ?? product.sellingPrice ?? 0)
      const discountAmount = new Prisma.Decimal(item.discountAmount || 0)
      const taxAmount = new Prisma.Decimal(item.taxAmount || 0)
      const lineTotal = new Prisma.Decimal(item.quantity).mul(unitPrice).minus(discountAmount).plus(taxAmount)
      return {
        productId: product.id,
        productCode: product.productCode,
        productName: product.name,
        quantity: Number(item.quantity),
        unitPrice,
        discountAmount,
        taxAmount,
        lineTotal,
      }
    })
    const subtotal = preparedItems.reduce((sum: Prisma.Decimal, item: (typeof preparedItems)[number]) => sum.plus(item.lineTotal), new Prisma.Decimal(0))

    await tx.salesOrder.update({
      where: { id },
      data: {
        customerId,
        orderDate: toDate(payload.orderDate) || existing.orderDate,
        requiredBy: toDate(payload.requiredBy) ?? existing.requiredBy,
        notes: payload.notes ?? existing.notes,
        subtotal,
        discountAmount: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        grandTotal: subtotal,
        updatedBy: userId ?? null,
      },
    })
    await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } })
    await tx.salesOrderItem.createMany({
    data: preparedItems.map((item: (typeof preparedItems)[number]) => ({ ...item, salesOrderId: id })),
    })
    return loadOrder(tx as any, id)
  })
}

export async function confirmSalesOrder(id: string, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx as any, id)
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Sales order not found')
    if (order.status !== 'DRAFT') throw new AppError(409, 'INVALID_STATUS', 'Only draft sales orders can be confirmed')
    await tx.salesOrder.update({ where: { id }, data: { status: 'CONFIRMED', updatedBy: userId ?? null } })
    return loadOrder(tx as any, id)
  })
}

export async function fulfillSalesOrder(id: string, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx as any, id)
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Sales order not found')
    if (order.status !== 'CONFIRMED') throw new AppError(409, 'INVALID_STATUS', 'Only confirmed sales orders can be fulfilled')
    await tx.salesOrder.update({ where: { id }, data: { status: 'FULFILLED', updatedBy: userId ?? null } })
    return loadOrder(tx as any, id)
  })
}

export async function cancelSalesOrder(id: string, reason?: string, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx as any, id)
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Sales order not found')
    if (order.status === 'FULFILLED') throw new AppError(409, 'INVALID_STATUS', 'Fulfilled sales orders cannot be cancelled')
    await tx.salesOrder.update({ where: { id }, data: { status: 'CANCELLED', notes: order.notes || reason || null, updatedBy: userId ?? null } })
    return loadOrder(tx as any, id)
  })
}

export async function convertToInvoice(id: string, userId?: number) {
  const order = await loadOrder(prisma as any, id)
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Sales order not found')
  if (order.status === 'CANCELLED') throw new AppError(409, 'INVALID_STATUS', 'Cancelled sales orders cannot be invoiced')

  return salesInvoiceSvc.createInvoice({
    customerId: order.customerId,
    invoiceDate: order.orderDate.toISOString().slice(0, 10),
    dueDate: order.requiredBy ? order.requiredBy.toISOString().slice(0, 10) : undefined,
    remarks: order.notes || undefined,
    salesOrderId: order.id,
    items: order.items.map((item: { productId: string; quantity: number; unitPrice?: any; discountAmount?: any; taxAmount?: any }) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice ?? 0),
      discountAmount: Number(item.discountAmount ?? 0),
      taxAmount: Number(item.taxAmount ?? 0),
    })),
  }, userId)
}
