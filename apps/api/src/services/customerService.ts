import { prisma } from '../prisma'

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
        select: { id: true, invoiceNumber: true, invoiceStatus: true, paymentStatus: true, grandTotal: true, dueAmount: true, invoiceDate: true },
        take: 3,
        orderBy: { invoiceDate: 'desc' },
      },
    },
  })
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      salesInvoices: {
        select: { id: true, invoiceNumber: true, invoiceStatus: true, paymentStatus: true, grandTotal: true, dueAmount: true, invoiceDate: true },
        orderBy: { invoiceDate: 'desc' },
      },
    },
  })
}

export async function createCustomer(data: any) {
  return prisma.customer.create({ data })
}

export async function updateCustomer(id: string, data: any) {
  return prisma.customer.update({ where: { id }, data })
}

export async function softDeleteCustomer(id: string) {
  return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
}
