import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const listCategories = async () => {
  return prisma.rawMaterialCategory.findMany({
    where: { deletedAt: null },
    orderBy: { categoryName: 'asc' },
  })
}

export const createCategory = async (data: { categoryName: string; description?: string }) => {
  return prisma.rawMaterialCategory.create({ data })
}

export const getCategory = async (id: string) => {
  return prisma.rawMaterialCategory.findUnique({ where: { id } })
}