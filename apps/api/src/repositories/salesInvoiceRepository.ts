import { Prisma, SalesPaymentStatus, SalesInvoiceStatus, SalesStockTransactionType } from '@prisma/client'
import { prisma } from '../prisma'
import {
  appendCustomerLedgerEntry,
  removeCustomerLedgerEntry,
  replaceCustomerLedgerEntry,
} from '../services/ledgerService'
import { allocateDocumentNumber, getFiscalSequenceSegment, previewDocumentNumber } from '../services/sequenceService'
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
  payments: { include: { receivedByUser: { select: userSelect }, bankAccount: { select: { id: true, bankName: true, accountName: true, accountNumber: true, branchName: true, branchCode: true } } } },
  createdByUser: { select: userSelect },
  approvedByUser: { select: userSelect },
  issuedByUser: { select: userSelect },
  cancelledByUser: { select: userSelect },
} as const

function parseSalesInvoiceSequence(invoiceNumber?: string | null) {
  const match = invoiceNumber?.match(/^SI-(\d{4})-(\d{4,})$/)
  if (!match) return null
  return {
    year: Number(match[1]),
    sequence: Number(match[2]),
  }
}

function getSalesInvoiceFiscalYear(data: Prisma.SalesInvoiceUncheckedCreateInput) {
  const invoiceDate = data.invoiceDate instanceof Date
    ? data.invoiceDate
    : data.invoiceDate
      ? new Date(data.invoiceDate as any)
      : new Date()
  return data.fiscalYear?.toString().trim() || String(invoiceDate.getFullYear())
}

function isInvoiceNumberConflict(error: unknown) {
  const candidate = error as { code?: string; meta?: { target?: unknown } } | null | undefined
  if (candidate?.code !== 'P2002') return false
  const target = candidate?.meta?.target
  const targets = Array.isArray(target) ? target : [target]
  return targets.some((value) => String(value || '').includes('invoiceNumber'))
}

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

async function refreshInvoicePaymentTotals(tx: Tx, invoiceId: string) {
  const invoice = await tx.salesInvoice.findUnique({
    where: { id: invoiceId },
    select: { grandTotal: true },
  })
  if (!invoice) {
    throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  }

  const aggregate = await tx.salesInvoicePayment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  })
  const paidAmount = new Prisma.Decimal(aggregate._sum.amount || 0)
  const grandTotal = new Prisma.Decimal(invoice.grandTotal || 0)
  const dueAmount = grandTotal.minus(paidAmount)

  await tx.salesInvoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount,
      dueAmount,
      paymentStatus: mapPaymentStatus(paidAmount, grandTotal),
    },
  })

  return { paidAmount, dueAmount, grandTotal }
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
      { invoiceNumber: { contains: opts.search } },
      { remarks: { contains: opts.search } },
      { customer: { customerName: { contains: opts.search } } },
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

export async function listInvoicePayments(id: string) {
  const invoice = await getInvoice(id)
  return invoice?.payments || []
}

export async function previewNextInvoiceNumber(invoiceDate: Date, resetByFiscalYear = true, initialNumber = 1) {
  return previewDocumentNumber('sales_invoice', {
    fiscalYear: getFiscalSequenceSegment(invoiceDate),
    resetByFiscalYear,
    initialNumber,
  })
}

export async function createDraftInvoice(
  data: Prisma.SalesInvoiceUncheckedCreateInput,
  items: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>>,
  initialNumber = 1,
) {
  return prisma.$transaction(async (tx) => {
    const fiscalYear = getSalesInvoiceFiscalYear(data)
    let invoice: Awaited<ReturnType<typeof tx.salesInvoice.create>> | null = null
    let lastError: unknown

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const invoiceNumber = attempt === 0 && data.invoiceNumber?.trim()
        ? data.invoiceNumber.trim()
        : await allocateDocumentNumber('sales_invoice', { fiscalYear, initialNumber, tx })

      try {
        invoice = await tx.salesInvoice.create({
          data: {
            ...data,
            invoiceNumber,
          },
        })
        break
      } catch (error) {
        lastError = error
        if (!isInvoiceNumberConflict(error) || attempt === 2) {
          throw error
        }
      }
    }

    if (!invoice) {
      throw lastError instanceof Error ? lastError : new AppError(500, 'INVOICE_CREATE_FAILED', 'Failed to create sales invoice')
    }

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

function computeStockBalance(tx: Tx, productId: string) {
  return tx.finishedGoodStockTransaction.aggregate({
    _sum: { change: true },
    where: { productId },
  }).then((aggregate) => Number(aggregate._sum.change || 0))
}

export async function issueInvoice(id: string, userId?: number, initialNumber = 1) {
  return prisma.$transaction(async (tx) => {
    const invoice = await getInvoiceOrThrow(tx, id)
    if (invoice.invoiceStatus !== SalesInvoiceStatus.DRAFT && invoice.invoiceStatus !== SalesInvoiceStatus.PENDING_APPROVAL) {
      throw new AppError(409, 'INVALID_STATUS', 'Invoice must be draft or pending approval before it can be issued')
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
    const fiscalYear = invoice.fiscalYear || String(invoiceYear)
    const invoiceNumber = invoice.invoiceNumber || (await allocateDocumentNumber('sales_invoice', { fiscalYear, initialNumber, tx }))
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

    await appendCustomerLedgerEntry({
      tx,
      customerId: invoice.customerId,
      entryType: 'SALES_INVOICE',
      entryDate: issuedAt,
      referenceType: 'sales_invoice',
      referenceId: invoice.id,
      documentNumber: invoiceNumber,
      description: `Sales invoice ${invoiceNumber}`,
      debit: grandTotal,
      credit: 0,
      createdBy: userId ?? null,
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
    bankAccountId?: string | null
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

    const paymentNumber = await allocateDocumentNumber('payment', {
      fiscalYear: invoice.fiscalYear || String(invoice.invoiceDate.getFullYear()),
      tx,
    })

    await tx.salesInvoicePayment.create({
      data: {
        paymentNumber,
        invoiceId: id,
        paymentDate: payment.paymentDate || new Date(),
        amount,
        paymentMethod: payment.paymentMethod,
        note: payment.note || null,
        receivedBy: userId ?? null,
        bankAccountId: payment.bankAccountId || null,
      },
    })
    await refreshInvoicePaymentTotals(tx, id)
    const createdPayment = await tx.salesInvoicePayment.findFirst({
      where: { invoiceId: id, paymentNumber },
    })
    if (!createdPayment) {
      throw new AppError(404, 'NOT_FOUND', 'Sales invoice payment not found')
    }

    await appendCustomerLedgerEntry({
      tx,
      customerId: invoice.customerId,
      entryType: 'PAYMENT_RECEIVED',
      entryDate: payment.paymentDate || new Date(),
      referenceType: 'sales_invoice_payment',
      referenceId: createdPayment.id,
      documentNumber: paymentNumber,
      description: `Payment received for ${invoice.invoiceNumber || invoice.id}`,
      debit: 0,
      credit: amount,
      createdBy: userId ?? null,
    })

    return getInvoiceOrThrow(tx, id)
  })
}

export async function updatePayment(
  invoiceId: string,
  paymentId: string,
  payment: {
    amount: number
    paymentMethod: string
    paymentDate?: Date
    note?: string
    bankAccountId?: string | null
  },
  userId?: number,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await getInvoiceOrThrow(tx, invoiceId)
    if (invoice.invoiceStatus === SalesInvoiceStatus.CANCELLED) {
      throw new AppError(409, 'INVALID_STATUS', 'Cannot update a payment for a cancelled invoice')
    }
    const existing = await tx.salesInvoicePayment.findFirst({ where: { id: paymentId, invoiceId } })
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Sales invoice payment not found')
    }

    await tx.salesInvoicePayment.update({
      where: { id: paymentId },
      data: {
        amount: new Prisma.Decimal(payment.amount),
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate || existing.paymentDate,
        note: payment.note || null,
        receivedBy: userId ?? existing.receivedBy ?? null,
        bankAccountId: payment.bankAccountId === undefined ? existing.bankAccountId : payment.bankAccountId || null,
      },
    })

    await refreshInvoicePaymentTotals(tx, invoiceId)
    await replaceCustomerLedgerEntry({
      tx,
      customerId: invoice.customerId,
      entryType: 'PAYMENT_RECEIVED',
      entryDate: payment.paymentDate || existing.paymentDate,
      referenceType: 'sales_invoice_payment',
      referenceId: existing.id,
      documentNumber: existing.paymentNumber,
      description: `Payment received for ${invoice.invoiceNumber || invoice.id}`,
      debit: 0,
      credit: new Prisma.Decimal(payment.amount),
      createdBy: userId ?? existing.receivedBy ?? null,
    })
    return getInvoiceOrThrow(tx, invoiceId)
  })
}

export async function deletePayment(invoiceId: string, paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await getInvoiceOrThrow(tx, invoiceId)
    if (invoice.invoiceStatus === SalesInvoiceStatus.CANCELLED) {
      throw new AppError(409, 'INVALID_STATUS', 'Cannot delete a payment from a cancelled invoice')
    }
    const existing = await tx.salesInvoicePayment.findFirst({ where: { id: paymentId, invoiceId } })
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Sales invoice payment not found')
    }

    await tx.salesInvoicePayment.delete({ where: { id: paymentId } })
    await refreshInvoicePaymentTotals(tx, invoiceId)
    await removeCustomerLedgerEntry({
      tx,
      customerId: invoice.customerId,
      referenceType: 'sales_invoice_payment',
      referenceId: existing.id,
    })
    return getInvoiceOrThrow(tx, invoiceId)
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
