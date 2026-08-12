import { prisma } from '../prisma'
import { AppError } from '../utils/errors'
import { appendCustomerLedgerEntry } from './ledgerService'
import { allocateDocumentNumber, previewDocumentNumber } from './sequenceService'

function toNumber(value: unknown) {
  return Number(value ?? 0)
}

function sortLedgerEntriesAscending<T extends { entryDate?: Date | string | null; createdAt?: Date | string | null }>(entries: T[] = []) {
  return [...entries].sort((a, b) => {
    const dateDiff = new Date(a.entryDate || 0).getTime() - new Date(b.entryDate || 0).getTime()
    if (dateDiff !== 0) return dateDiff
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  })
}

function buildCustomerLedgerEntries(customer: any) {
  const invoices = Array.isArray(customer?.salesInvoices) ? customer.salesInvoices : []
  const openingBalance = toNumber(customer?.openingBalance)
  const entries: Array<any> = []

  if (openingBalance > 0) {
    entries.push({
      id: `${customer.id}-opening-balance`,
      entryDate: customer?.createdAt || new Date().toISOString(),
      entryType: 'OPENING_BALANCE',
      referenceType: null,
      referenceId: null,
      documentNumber: customer?.customerNumber || null,
      description: 'Opening balance',
      debit: openingBalance,
      credit: 0,
      sourceDate: customer?.createdAt || new Date().toISOString(),
      sourceCreatedAt: customer?.createdAt || new Date().toISOString(),
    })
  }

  for (const invoice of invoices) {
    if (invoice?.invoiceStatus !== 'ISSUED') continue
    entries.push({
      id: invoice.id,
      entryDate: invoice.invoiceDate || invoice.createdAt || new Date().toISOString(),
      entryType: 'SALES_INVOICE',
      referenceType: 'sales_invoice',
      referenceId: invoice.id,
      documentNumber: invoice.invoiceNumber || null,
      description: `Sales invoice ${invoice.invoiceNumber || invoice.id}`,
      debit: toNumber(invoice.grandTotal),
      credit: 0,
      sourceDate: invoice.invoiceDate || invoice.createdAt || new Date().toISOString(),
      sourceCreatedAt: invoice.createdAt || invoice.invoiceDate || new Date().toISOString(),
    })

    for (const payment of Array.isArray(invoice.payments) ? invoice.payments : []) {
      entries.push({
        id: payment.id,
        entryDate: payment.paymentDate || payment.createdAt || new Date().toISOString(),
        entryType: 'PAYMENT_RECEIVED',
        referenceType: 'sales_invoice_payment',
        referenceId: payment.id,
        documentNumber: payment.paymentNumber || null,
        description: `Payment received for ${invoice.invoiceNumber || invoice.id}`,
        debit: 0,
        credit: toNumber(payment.amount),
        sourceDate: payment.paymentDate || payment.createdAt || new Date().toISOString(),
        sourceCreatedAt: payment.createdAt || payment.paymentDate || new Date().toISOString(),
      })
    }
  }

  entries.sort((a, b) => {
    const dateDiff = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    if (dateDiff !== 0) return dateDiff
    return new Date(a.sourceCreatedAt).getTime() - new Date(b.sourceCreatedAt).getTime()
  })

  let runningBalance = openingBalance
  return entries.map((entry) => {
    runningBalance = runningBalance + toNumber(entry.debit) - toNumber(entry.credit)
    return {
      ...entry,
      runningBalance,
      entryDate: entry.entryDate,
    }
  })
}

function buildCustomerSummary(customer: any) {
  const invoices = Array.isArray(customer?.salesInvoices) ? customer.salesInvoices : []
  const payments = invoices.flatMap((invoice: any) => (Array.isArray(invoice.payments) ? invoice.payments : []))
  const issuedInvoices = invoices.filter((invoice: any) => invoice.invoiceStatus === 'ISSUED')
  const totalInvoiced = issuedInvoices.reduce((sum: number, invoice: any) => sum + toNumber(invoice.grandTotal), 0)
  const totalPaid = payments.reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0)
  const outstandingAmount = Math.max(totalInvoiced - totalPaid, 0)
  const ledgerEntries = Array.isArray(customer?.ledgerEntries) && customer.ledgerEntries.length > 0
    ? sortLedgerEntriesAscending(customer.ledgerEntries)
    : buildCustomerLedgerEntries(customer)
  const currentBalance = ledgerEntries.length > 0 ? toNumber(ledgerEntries[ledgerEntries.length - 1]?.runningBalance) : outstandingAmount
  return {
    currentBalance,
    totalInvoiced,
    totalPaid,
    outstandingAmount,
    lastInvoiceDate: invoices[0]?.invoiceDate || null,
    lastPaymentDate: payments.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]?.paymentDate || null,
  }
}

export async function listCustomers(opts: { search?: string; skip?: number; take?: number } = {}) {
  const where: any = { deletedAt: null }
  if (opts.search) {
    where.OR = [
      { customerName: { contains: opts.search, mode: 'insensitive' } },
      { phone: { contains: opts.search, mode: 'insensitive' } },
      { email: { contains: opts.search, mode: 'insensitive' } },
      { panVatNumber: { contains: opts.search, mode: 'insensitive' } },
      { customerType: { contains: opts.search, mode: 'insensitive' } },
      { address: { contains: opts.search, mode: 'insensitive' } },
    ]
  }

  return prisma.customer.findMany({
    where,
    skip: opts.skip || 0,
    take: opts.take || 100,
    orderBy: { customerName: 'asc' },
    include: {
      salesInvoices: {
        select: {
          id: true,
          invoiceNumber: true,
          invoiceStatus: true,
          paymentStatus: true,
          grandTotal: true,
          dueAmount: true,
          invoiceDate: true,
          payments: {
            select: {
              id: true,
              amount: true,
              paymentDate: true,
              paymentNumber: true,
            },
          },
        },
        take: 3,
        orderBy: { invoiceDate: 'desc' },
      },
      ledgerEntries: {
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })
    .then((rows) => rows.map((customer) => ({ ...customer, summary: buildCustomerSummary(customer) })))
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      salesInvoices: {
        select: {
          id: true,
          invoiceNumber: true,
          invoiceStatus: true,
          paymentStatus: true,
          grandTotal: true,
          dueAmount: true,
          invoiceDate: true,
          payments: {
            select: {
              id: true,
              amount: true,
              paymentDate: true,
              paymentNumber: true,
            },
          },
        },
        orderBy: { invoiceDate: 'desc' },
      },
      ledgerEntries: {
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
      },
    },
  }).then((customer) => (customer ? { ...customer, ledgerEntries: sortLedgerEntriesAscending(customer.ledgerEntries || []), summary: buildCustomerSummary(customer) } : null))
}

export async function getCustomerLedger(id: string) {
  const customer = await getCustomer(id)
  return customer?.ledgerEntries || []
}

export async function createCustomer(data: any) {
  const customerNumber = await allocateDocumentNumber('customer')
  return prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({ data: { ...data, customerNumber } })
    const openingBalance = Number(data.openingBalance ?? 0)
    if (openingBalance > 0) {
      await appendCustomerLedgerEntry({
        tx,
        customerId: created.id,
        entryType: 'OPENING_BALANCE',
        debit: openingBalance,
        credit: 0,
        description: 'Opening balance',
        documentNumber: customerNumber,
        createdBy: data.createdBy ?? null,
      })
    }
    return created
  })
}

export async function previewNextCustomerNumber() {
  return previewDocumentNumber('customer')
}

export async function updateCustomer(id: string, data: any) {
  return prisma.customer.update({ where: { id }, data })
}

export async function softDeleteCustomer(id: string) {
  const [salesInvoiceCount, salesOrderCount] = await Promise.all([
    prisma.salesInvoice.count({ where: { customerId: id } }),
    prisma.salesOrder.count({ where: { customerId: id } }),
  ])

  const references: Array<{ label: string; count: number }> = []
  if (salesInvoiceCount > 0) references.push({ label: 'sales invoice', count: salesInvoiceCount })
  if (salesOrderCount > 0) references.push({ label: 'sales order', count: salesOrderCount })

  if (references.length > 0) {
    const summary = references.map((ref) => `${ref.count} ${ref.label}${ref.count === 1 ? '' : 's'}`).join(' and ')
    throw new AppError(409, 'DELETE_BLOCKED', `Cannot delete customer because it is referenced by ${summary}.`, {
      references,
    })
  }

  return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
}
