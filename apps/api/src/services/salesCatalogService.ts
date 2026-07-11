import { prisma } from '../prisma'
import { AppError } from '../utils/errors'

type SalesCatalogSearchOpts = {
  search?: string
}

type SalesCatalogProduct = {
  id: string
  sku?: string | null
  productCode?: string | null
  name: string
  description?: string | null
  category?: string | null
  unit?: string | null
  sellingPrice?: any
  costPrice?: any
  active?: boolean
  notes?: string | null
  currentStock: number
  bomItemCount: number
  materialRequirements: SalesCatalogMaterialRequirement[]
}

type SalesCatalogMaterialRequirement = {
  materialId?: string | null
  materialName: string
  sku?: string | null
  unit?: string | null
  quantityPerUnit: number
}

const salesCatalogSelect = {
  id: true,
  sku: true,
  productCode: true,
  name: true,
  description: true,
  category: true,
  unit: true,
  sellingPrice: true,
  costPrice: true,
  active: true,
  notes: true,
  bomData: true as any,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

function bomItemCount(product: { bomData?: unknown }) {
  const items = Array.isArray((product as any)?.bomData?.items) ? (product as any).bomData.items : []
  return items.length
}

function materialRequirements(product: { bomData?: unknown }): SalesCatalogMaterialRequirement[] {
  const items: any[] = Array.isArray((product as any)?.bomData?.items) ? (product as any).bomData.items : []
  return items.map((item: any) => ({
    materialId: item.materialId ?? item.rawMaterialId ?? item.id ?? null,
    materialName: item.materialName ?? item.rawMaterialName ?? item.name ?? item.material?.name ?? 'Material',
    sku: item.sku ?? item.materialSku ?? item.material?.sku ?? null,
    unit: item.unit ?? item.materialUnit ?? item.material?.unit ?? null,
    quantityPerUnit: Number(item.consumption ?? item.quantity ?? item.quantityPerUnit ?? item.qty ?? 0),
  })).filter((item: SalesCatalogMaterialRequirement) => item.quantityPerUnit > 0)
}

async function currentStockByProductIds(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, number>()
  const stockRows = await prisma.finishedGoodStockTransaction.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _sum: { change: true },
  })

  return new Map(stockRows.map((row) => [row.productId, Number(row._sum.change || 0)]))
}

function buildCatalogProduct(product: any, currentStock: number): SalesCatalogProduct {
  return {
    ...product,
    currentStock,
    bomItemCount: bomItemCount(product),
    materialRequirements: materialRequirements(product),
  }
}

export async function listSalesCatalogProducts(opts: SalesCatalogSearchOpts = {}) {
  const where: any = { deletedAt: null }
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
      { productCode: { contains: opts.search, mode: 'insensitive' } },
      { category: { contains: opts.search, mode: 'insensitive' } },
      { description: { contains: opts.search, mode: 'insensitive' } },
    ]
  }

  const products = await prisma.finishedGoodProduct.findMany({
    where,
    orderBy: { name: 'asc' },
    select: salesCatalogSelect,
  })
  const saleableProducts = products.filter((product) => !product.bomData)
  const stockByProductId = await currentStockByProductIds(saleableProducts.map((product) => product.id))

  return saleableProducts.map((product) => buildCatalogProduct(product, stockByProductId.get(product.id) || 0))
}

export async function getSalesCatalogProductsByIds(productIds: string[]) {
  const distinctIds = [...new Set(productIds)].filter(Boolean)
  if (distinctIds.length === 0) return new Map<string, SalesCatalogProduct>()

  const products = await prisma.finishedGoodProduct.findMany({
    where: { id: { in: distinctIds }, deletedAt: null },
    select: salesCatalogSelect,
  })
  const saleableProducts = products.filter((product) => !product.bomData)

  if (saleableProducts.length !== distinctIds.length) {
    const found = new Set(saleableProducts.map((product) => product.id))
    const missing = distinctIds.filter((id) => !found.has(id))
    throw new AppError(400, 'INVALID_PRODUCT', `Unknown article product(s): ${missing.join(', ')}`)
  }

  const stockByProductId = await currentStockByProductIds(distinctIds)
  return new Map(saleableProducts.map((product) => [product.id, buildCatalogProduct(product, stockByProductId.get(product.id) || 0)]))
}
