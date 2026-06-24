import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Creates a material
export const createMaterial = async (data: any) => prisma.rawMaterial.create({ data })
// Fetches one material
export const getMaterial = async (id: string) => prisma.rawMaterial.findUnique({ where: { id } })
// Lists materials with filters
export const listMaterials = async (opts: {
  skip?: number
  take?: number
  lowStock?: boolean
  search?: string
  categoryId?: string
  active?: boolean
} = {}) => {
  const where: any = { deletedAt: null }
  if (opts.lowStock) where.reorderLevel = { not: null }
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
    ]
  }
  if (opts.categoryId) where.categoryId = opts.categoryId
  if (opts.active !== undefined) where.active = opts.active
  return prisma.rawMaterial.findMany({
    where,
    skip: opts.skip || 0,
    take: opts.take || 20,
    orderBy: { name: 'asc' },
    include: { category: true },
  })
}
// Updates a material
export const updateMaterial = async (id: string, data: any) => prisma.rawMaterial.update({ where: { id }, data })

// Calculates current stock
export const computeCurrentStock = async (rawMaterialId: string) => {
  const res = await prisma.stockTransaction.aggregate({
    _sum: { change: true },
    where: { rawMaterialId }
  })
  return res._sum.change || 0
}

// Lists stock transactions
export const listStockTransactions = async (rawMaterialId: string, opts: any = {}) => {
  const skip = ((opts.page || 1) - 1) * (opts.pageSize || 20)
  const take = opts.pageSize || 50
  return prisma.stockTransaction.findMany({ where: { rawMaterialId }, orderBy: { createdAt: 'desc' }, skip, take })
}

export const listBomUsagesForMaterial = async (rawMaterialId: string) => {
  const products = await prisma.finishedGoodProduct.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      sku: true,
      productCode: true,
      bomData: true,
    } as any,
    orderBy: { name: 'asc' },
  } as any)

  return products.flatMap((product: any) => {
    const items = Array.isArray(product?.bomData?.items) ? product.bomData.items : []
    return items
      .map((item: any, index: number) => ({ item, index }))
      .filter(({ item }: any) => item?.rawMaterialId === rawMaterialId)
      .map(({ item, index }: any) => ({
        id: `${product.id}:${index}`,
        finishedGoodId: product.id,
        articleName: product.name,
        sku: product.sku,
        productCode: product.productCode,
        garmentStyle: product.bomData?.garmentStyle || product.name,
        rawMaterialId: item.rawMaterialId,
        consumption: Number(item.consumption ?? 0),
        unit: item.unit || '',
        rate: Number(item.rate ?? 0),
        yield: item.yield ?? null,
      }))
  })
}

// For compatibility we can forward to purchaseRepository for prices/purchases

// Soft delete material (mark as deleted and inactive)
export const softDeleteMaterial = async (id: string) => {
  return prisma.rawMaterial.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
  })
}

// Count materials with filters
export const countMaterials = async (opts: { search?: string; categoryId?: string } = {}) => {
  const where: any = { deletedAt: null }
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
    ]
  }
  if (opts.categoryId) where.categoryId = opts.categoryId
  return prisma.rawMaterial.count({ where })
}
