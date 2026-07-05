import { PrismaClient } from '@prisma/client'
import { AppError } from '../../utils/errors'
const prisma = new PrismaClient()

export const listCategories = async () => {
  return prisma.rawMaterialCategory.findMany({
    where: { deletedAt: null },
    orderBy: { categoryName: 'asc' },
  })
}

export const createCategory = async (data: { categoryName: string; description?: string }) => {
  const normalizedData = {
    categoryName: data.categoryName.trim(),
    description: data.description?.trim() || undefined,
  }

  try {
    return await prisma.rawMaterialCategory.create({ data: normalizedData })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new AppError(409, 'DUPLICATE_CATEGORY', 'Category name already exists', {
        field: 'categoryName',
      })
    }

    throw error
  }
}

export const getCategory = async (id: string) => {
  return prisma.rawMaterialCategory.findUnique({ where: { id } })
}

export const deleteCategory = async (id: string) => {
  return prisma.rawMaterialCategory.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}
