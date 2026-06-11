import { Prisma, SalesPaymentStatus, SalesInvoiceStatus, SalesStockTransactionType } from '@prisma/client'
import { prisma } from '../prisma'
import { AppError } from '../utils/errors'

const userSelect = {
  id: true,
  email: true,
  name: true,
} as const

const productSelect = {
  id: true,
  sku: true,
  productCode: true,
  name: true,
  unit: true,
  sellingPrice: true,
  costPrice: true,
  active: true,
} as const

const invoiceInclude = {
  customer: true,
  items: { include: { product: { select: productSelect } } },
  payments: { include: { receivedByUser: { select: userSelect } } },
  createdByUser: { select: userSelect },
  approvedByUser: { select: userSelect },
  issuedByUser: { select: userSelect },
  cancelledByUser: { select: userSelect },
} as const

type Tx = Prisma.TransactionClient

async function loadInvoice(tx: Prisma.TransactionClient | typeof prisma, id: string) {
  return tx.salesInvoice.findUnique({
    where: { id },
    include: invoiceInclude,
  })
}

async function getInvoiceOrThrow(tx: Prisma.TransactionClient | typeof prisma, id: string) {
  const invoice = await loadInvoice(tx, id)
  if (!invoice) {
    throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  }
  return invoice
}

function mapPaymentStatus(paidAmount: Prisma.Decimal, grandTotal: Prisma.Decimal): SalesPaymentStatus {
  if (paidAmount.greaterThanOrEqualTo(grandTotal)) return 'PAID'
  if (paidAmount.greaterThan(0)) return 'PARTIAL'
  return 'UNPAID'
}

export async function listInvoices(opts: {
  search?: string
  customerId?: string
  invoiceStatus?: SalesInvoiceStatus
  paymentStatus?: SalesPaymentStatus
  page?: number
  pageSize?: number
} = {}) {
  const page = opts.page || 1
  const pageSize = opts.pageSize || 20
  const skip = (page - 1) * pageSize
  const where: Prisma.SalesInvoiceWhereInput = {}

  if (opts.customerId) {
    where.customerId = opts.customerId
  }
  if (opts.invoiceStatus) {
    where.invoiceStatus = opts.invoiceStatus
  }
  if (opts.paymentStatus) {
    where.paymentStatus = opts.paymentStatus
  }
  if (opts.search) {
    where.OR = [
      { invoiceNumber: { contains: opts.search, mode: 'insensitive' } },
      { remarks: { contains: opts.search, mode: 'insensitive' } },
      { customer: { customerName: { contains: opts.search, mode: 'insensitive' } } },
    ]
  }

  const [total, items] = await Promise.all([
    prisma.salesInvoice.count({ where }),
    prisma.salesInvoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: invoiceInclude,
    }),
  ])

  return { items, total, page, pageSize }
}

export async function getInvoice(id: string) {
  return loadInvoice(prisma, id)
}

export async function createDraftInvoice(
  data: Prisma.SalesInvoiceUncheckedCreateInput,
  items: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>>,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.create({ data })

    await tx.salesInvoiceItem.createMany({
      data: items.map((item) => ({
        ...item,
        invoiceId: invoice.id,
      })),
    })

    return getInvoiceOrThrow(tx, invoice.id)
  })
}

export async function updateDraftInvoice(
  id: string,
  data: Prisma.SalesInvoiceUncheckedUpdateInput,
  items?: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>>,
) {
  return prisma.$transaction(async (tx) => {
    await getInvoiceOrThrow(tx, id)
    await tx.salesInvoice.update({ where: { id }, data })

    if (items) {
      await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } })
      await tx.salesInvoiceItem.createMany({
        data: items.map((item) => ({
          ...item,
          invoiceId: id,
        })),
      })
    }

    return getInvoiceOrThrow(tx, id)
  })
}

export async function submitInvoice(id: string) {
  return prisma.$transaction(async (tx) => {
    await getInvoiceOrThrow(tx, id)
    await tx.salesInvoice.update({
      where: { id },
      data: {
        invoiceStatus: SalesInvoiceStatus.PENDING_APPROVAL,
      },
    })
    return getInvoiceOrThrow(tx, id)
  })
}

function computeStockBalance(tx: Tx, productId: string) {
  return tx.finishedGoodStockTransaction.aggregate({
    _sum: { change: true },
    where: { productId },
  }).then((aggregate) => Number(aggregate._sum.change || 0))
}

export async function issueInvoice(id: string, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const invoice = await getInvoiceOrThrow(tx, id)
    if (invoice.invoiceStatus !== SalesInvoiceStatus.PENDING_APPROVAL) {
      throw new AppError(409, 'INVALID_STATUS', 'Invoice must be pending approval before it can be issued')
    }

    const quantitiesByProductId = new Map<string, number>()
    for (const item of invoice.items) {
      quantitiesByProductId.set(item.productId, (quantitiesByProductId.get(item.productId) || 0) + Number(item.quantity || 0))
    }

    const productIds = [...quantitiesByProductId.keys()]
    const products = await tx.finishedGoodProduct.findMany({
      where: { id: { in: productIds }, deletedAt: null },
      select: productSelect,
    })
    const productMap = new Map(products.map((product) => [product.id, product]))

    for (const [productId, quantity] of quantitiesByProductId.entries()) {
      const product = productMap.get(productId)
      if (!product) {
        throw new AppError(400, 'INVALID_PRODUCT', `Finished-good product ${productId} is missing`)
      }

      const available = await computeStockBalance(tx, product.id)
      if (available < quantity) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${product.name}`)
      }
    }

    const invoiceYear = invoice.invoiceDate.getFullYear()
    const fiscalYear = invoice.fiscalYear || `FY${invoiceYear}`
    const invoiceNumber = invoice.invoiceNumber || `SI-${invoiceYear}-${String(
      (await tx.salesInvoice.count({
        where: {
          invoiceNumber: { startsWith: `SI-${invoiceYear}-` },
        },
      })) + 1,
    ).padStart(5, '0')}`
    const issuedAt = new Date()
    const paidAmount = new Prisma.Decimal(invoice.paidAmount || 0)
    const grandTotal = new Prisma.Decimal(invoice.grandTotal || 0)
    const dueAmount = grandTotal.minus(paidAmount)

    for (const [productId, quantity] of quantitiesByProductId.entries()) {
      const product = productMap.get(productId)!
      const currentBalance = await computeStockBalance(tx, product.id)
      const nextBalance = currentBalance - quantity
      const firstLine = invoice.items.find((line) => line.productId === productId)!
      await tx.finishedGoodStockTransaction.create({
        data: {
          productId: product.id,
          change: -Number(quantity),
          unit: product.unit,
          transactionType: SalesStockTransactionType.SALE_OUT,
          balanceAfter: nextBalance,
          unitCost: firstLine.costPrice,
          reason: 'invoice.issue',
          referenceId: invoice.id,
          createdBy: userId ?? null,
        },
      })
    }

    await tx.salesInvoice.update({
      where: { id },
      data: {
        invoiceNumber,
        fiscalYear,
        invoiceStatus: SalesInvoiceStatus.ISSUED,
        approvedBy: userId ?? invoice.approvedBy,
        approvedAt: issuedAt,
        issuedBy: userId ?? null,
        issuedAt,
        paymentStatus: mapPaymentStatus(paidAmount, grandTotal),
        dueAmount,
      },
    })

    return getInvoiceOrThrow(tx, id)
  })
}

export async function recordPayment(
  id: string,
  payment: {
    amount: number
    paymentMethod: string
    paymentDate?: Date
    note?: string
  },
  userId?: number,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await getInvoiceOrThrow(tx, id)
    if (invoice.invoiceStatus === SalesInvoiceStatus.CANCELLED) {
      throw new AppError(409, 'INVALID_STATUS', 'Cannot record a payment for a cancelled invoice')
    }
    if (invoice.invoiceStatus !== SalesInvoiceStatus.ISSUED) {
      throw new AppError(409, 'INVALID_STATUS', 'Payments can only be recorded after an invoice is issued')
    }

    const amount = new Prisma.Decimal(payment.amount)
    const grandTotal = new Prisma.Decimal(invoice.grandTotal || 0)
    const paidAmount = new Prisma.Decimal(invoice.paidAmount || 0)
    const dueBefore = grandTotal.minus(paidAmount)
    if (amount.greaterThan(dueBefore)) {
      throw new AppError(400, 'PAYMENT_EXCEEDS_DUE', 'Payment amount exceeds the remaining due amount')
    }

    await tx.salesInvoicePayment.create({
      data: {
        invoiceId: id,
        paymentDate: payment.paymentDate || new Date(),
        amount,
        paymentMethod: payment.paymentMethod,
        note: payment.note || null,
        receivedBy: userId ?? null,
      },
    })

    const updatedPaidAmount = paidAmount.plus(amount)
    const dueAmount = grandTotal.minus(updatedPaidAmount)

    await tx.salesInvoice.update({
      where: { id },
      data: {
        paidAmount: updatedPaidAmount,
        dueAmount,
        paymentStatus: mapPaymentStatus(updatedPaidAmount, grandTotal),
      },
    })

    return getInvoiceOrThrow(tx, id)
  })
}

export async function cancelInvoice(
  id: string,
  reason: string,
  userId?: number,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await getInvoiceOrThrow(tx, id)
    if (invoice.invoiceStatus === SalesInvoiceStatus.CANCELLED) {
      throw new AppError(409, 'INVALID_STATUS', 'Invoice is already cancelled')
    }

    if (invoice.invoiceStatus === SalesInvoiceStatus.ISSUED) {
      for (const item of invoice.items) {
        const currentBalance = await computeStockBalance(tx, item.productId)
        const nextBalance = currentBalance + item.quantity
        await tx.finishedGoodStockTransaction.create({
          data: {
            productId: item.productId,
            change: Number(item.quantity),
            unit: item.product.unit,
            transactionType: SalesStockTransactionType.SALE_RETURN,
            balanceAfter: nextBalance,
            unitCost: item.costPrice,
            reason: 'invoice.cancel',
            referenceId: invoice.id,
            createdBy: userId ?? null,
          },
        })
      }
    }

    await tx.salesInvoice.update({
      where: { id },
      data: {
        invoiceStatus: SalesInvoiceStatus.CANCELLED,
        cancelledBy: userId ?? null,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    })

    return getInvoiceOrThrow(tx, id)
  })
}
