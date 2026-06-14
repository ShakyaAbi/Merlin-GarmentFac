import { prisma } from '../prisma'
import { appendCustomerLedgerEntry } from './ledgerService'
import { allocateDocumentNumber, previewDocumentNumber } from './sequenceService'

function toNumber(value: unknown) {
  return Number(value ?? 0)
}

function buildCustomerSummary(customer: any) {
  const invoices = Array.isArray(customer?.salesInvoices) ? customer.salesInvoices : []
  const ledgerEntries = Array.isArray(customer?.ledgerEntries) ? customer.ledgerEntries : []
  const payments = invoices.flatMap((invoice: any) => (Array.isArray(invoice.payments) ? invoice.payments : []))
  const totalInvoiced = invoices.reduce((sum: number, invoice: any) => sum + toNumber(invoice.grandTotal), 0)
  const totalPaid = payments.reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0)
  const outstandingAmount = invoices.reduce((sum: number, invoice: any) => sum + toNumber(invoice.dueAmount), 0)
  const currentBalance = ledgerEntries.length > 0 ? toNumber(ledgerEntries[0]?.runningBalance) : outstandingAmount
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
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
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
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      },
    },
  }).then((customer) => (customer ? { ...customer, summary: buildCustomerSummary(customer) } : null))
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
  return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
}
