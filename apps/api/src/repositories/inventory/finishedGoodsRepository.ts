import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma'

const productSelect = {
  id: true,
  sku: true,
  productCode: true,
  name: true,
  description: true,
  category: true,
  articleCategoryId: true,
  unit: true,
  sellingPrice: true,
  costPrice: true,
  reorderLevel: true,
  active: true,
  notes: true,
  imageUrl: true,
  bomData: true as any,
  articleCategory: { select: { id: true, name: true, description: true, status: true } },
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export async function createFinishedGood(data: Prisma.FinishedGoodProductUncheckedCreateInput) {
  return prisma.finishedGoodProduct.create({ data, select: productSelect })
}

export async function updateFinishedGood(id: string, data: Prisma.FinishedGoodProductUncheckedUpdateInput) {
  return prisma.finishedGoodProduct.update({ where: { id }, data, select: productSelect })
}

export async function getFinishedGood(id: string) {
  return prisma.finishedGoodProduct.findUnique({ where: { id }, select: productSelect })
}

export async function listFinishedGoods(opts: {
  search?: string
  active?: boolean
  page?: number
  pageSize?: number
} = {}) {
  const page = opts.page || 1
  const pageSize = opts.pageSize || 20
  const skip = (page - 1) * pageSize
  const where: Prisma.FinishedGoodProductWhereInput = { deletedAt: null }

  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
      { productCode: { contains: opts.search, mode: 'insensitive' } },
    ]
  }

  if (opts.active !== undefined) {
    where.active = opts.active
  }

  const [total, products] = await Promise.all([
    prisma.finishedGoodProduct.count({ where }),
    prisma.finishedGoodProduct.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
      select: productSelect,
    }),
  ])

  const stockRows = products.length
    ? await prisma.finishedGoodStockTransaction.groupBy({
        by: ['productId'],
        where: { productId: { in: products.map((product) => product.id) } },
        _sum: { change: true },
      })
    : []

  const stockByProductId = new Map(
    stockRows.map((row) => [row.productId, Number(row._sum.change || 0)]),
  )

  return {
    items: products.map((product) => ({
      ...product,
      currentStock: stockByProductId.get(product.id) || 0,
    })),
    total,
    page,
    pageSize,
  }
}

export async function currentStock(productId: string) {
  const aggregate = await prisma.finishedGoodStockTransaction.aggregate({
    _sum: { change: true },
    where: { productId },
  })

  return Number(aggregate._sum.change || 0)
}

export async function listTransactions(productId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = opts.page || 1
  const pageSize = opts.pageSize || 20
  const skip = (page - 1) * pageSize

  return prisma.finishedGoodStockTransaction.findMany({
    where: { productId },
    skip,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  })
}
