import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Creates a supplier
export const createSupplier = async (data: {
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  externalRef?: string
  createdBy?: number
}) => {
  return prisma.supplier.create({ data })
}

// Fetches one supplier
export const getSupplier = async (id: string) => {
  return prisma.supplier.findUnique({ where: { id } })
}

// Lists suppliers
export const listSuppliers = async (opts: { skip?: number; take?: number; search?: string } = {}) => {
  const where: any = opts.search ? { name: { contains: opts.search, mode: 'insensitive' } } : {}
  return prisma.supplier.findMany({ where, skip: opts.skip, take: opts.take })
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
