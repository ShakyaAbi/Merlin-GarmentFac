import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

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

export const getSupplier = async (id: string) => {
  return prisma.supplier.findUnique({ where: { id } })
}

export const listSuppliers = async (opts: { skip?: number; take?: number; search?: string } = {}) => {
  const where: any = opts.search ? { name: { contains: opts.search, mode: 'insensitive' } } : {}
  return prisma.supplier.findMany({ where, skip: opts.skip, take: opts.take })
}

export const updateSupplier = async (id: string, data: any) => {
  return prisma.supplier.update({ where: { id }, data })
}

// Soft-delete: mark inactive (if schema adds deletedAt later)
export const softDeleteSupplier = async (id: string) => {
  return prisma.supplier.update({ where: { id }, data: { /* placeholder for soft-delete fields */ } })
}
