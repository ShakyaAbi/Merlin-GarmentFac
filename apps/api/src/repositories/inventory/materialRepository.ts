import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const createMaterial = async (data: any) => prisma.rawMaterial.create({ data })
export const getMaterial = async (id: string) => prisma.rawMaterial.findUnique({ where: { id } })
export const listMaterials = async (opts: { skip?: number; take?: number; lowStock?: boolean } = {}) => {
  const where: any = {}
  if (opts.lowStock) where.reorderLevel = { not: null }
  return prisma.rawMaterial.findMany({ where, skip: opts.skip, take: opts.take })
}
export const updateMaterial = async (id: string, data: any) => prisma.rawMaterial.update({ where: { id }, data })

export const computeCurrentStock = async (rawMaterialId: string) => {
  const res = await prisma.stockTransaction.aggregate({
    _sum: { change: true },
    where: { rawMaterialId }
  })
  return res._sum.change || 0
}
