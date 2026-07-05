import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Creates a supplier
export const createSupplier = async (data: {
  supplierNumber?: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  panVatNumber?: string
  notes?: string
  status?: 'ACTIVE' | 'INACTIVE'
  externalRef?: string
  openingBalance?: number
  createdBy?: number
}) => {
  return prisma.supplier.create({ data })
}

// Fetches one supplier
export const getSupplier = async (id: string) => {
  return prisma.supplier.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { invoiceDate: 'desc' },
        include: {
          items: true,
        },
      },
      supplierPayments: { orderBy: { paymentDate: 'desc' } },
      ledgerEntries: { orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }] },
    },
  })
}

// Lists suppliers
export const listSuppliers = async (opts: { skip?: number; take?: number; search?: string } = {}) => {
  const where: any = opts.search ? { name: { contains: opts.search, mode: 'insensitive' } } : {}
  return prisma.supplier.findMany({
    where,
    skip: opts.skip,
    take: opts.take,
    include: {
      purchases: {
        orderBy: { invoiceDate: 'desc' },
        include: {
          items: true,
        },
      },
      supplierPayments: { orderBy: { paymentDate: 'desc' } },
      ledgerEntries: { orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }] },
    },
  })
}

// Updates a supplier
export const updateSupplier = async (id: string, data: any) => {
  return prisma.supplier.update({ where: { id }, data })
}

// Soft-delete: mark inactive (if schema adds deletedAt later)
// Soft-deletes a supplier
export const softDeleteSupplier = async (id: string) => {
  return prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } })
}
