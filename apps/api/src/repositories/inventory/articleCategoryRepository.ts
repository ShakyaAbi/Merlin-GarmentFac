import { PrismaClient } from '@prisma/client'
import { AppError } from '../../utils/errors'

const prisma = new PrismaClient()

export const listCategories = async () => {
  return prisma.articleCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  })
}

export const createCategory = async (data: { name: string; description?: string }) => {
  const normalizedData = {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
  }

  try {
    return await prisma.articleCategory.create({ data: normalizedData })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new AppError(409, 'DUPLICATE_CATEGORY', 'Article category name already exists', {
        field: 'name',
      })
    }

    throw error
  }
}

export const getCategory = async (id: string) => {
  return prisma.articleCategory.findUnique({ where: { id } })
}

export const deleteCategory = async (id: string) => {
  return prisma.articleCategory.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}
