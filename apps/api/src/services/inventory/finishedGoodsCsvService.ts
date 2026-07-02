import Papa from 'papaparse'
import { Prisma } from '@prisma/client'
import { stringify } from 'csv-stringify/sync'
import { prisma } from '../../prisma'

type FinishedGoodCsvFilters = {
  ids?: string[]
  search?: string
  articleCategoryId?: string
  active?: boolean
}

type FinishedGoodCsvRow = {
  id?: string
  sku: string
  productCode: string
  name: string
  articleCategoryId?: string
  articleCategoryName?: string
  category?: string
  unit: string
  sellingPrice?: string
  costPrice?: string
  reorderLevel?: string
  active?: string
  notes?: string
  description?: string
}

const csvColumns = [
  'id',
  'sku',
  'productCode',
  'name',
  'articleCategoryId',
  'articleCategoryName',
  'category',
  'unit',
  'sellingPrice',
  'costPrice',
  'reorderLevel',
  'active',
  'notes',
  'description',
] as const

const toStringValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

const parseBoolean = (value: unknown, fallback = true) => {
  if (value === null || value === undefined || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false
  return fallback
}

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizeRow = (row: Record<string, unknown>): FinishedGoodCsvRow => ({
  id: toStringValue(row.id) || undefined,
  sku: toStringValue(row.sku).trim(),
  productCode: toStringValue(row.productCode).trim(),
  name: toStringValue(row.name).trim(),
  articleCategoryId: toStringValue(row.articleCategoryId).trim() || undefined,
  articleCategoryName: toStringValue(row.articleCategoryName).trim() || undefined,
  category: toStringValue(row.category).trim() || undefined,
  unit: toStringValue(row.unit).trim(),
  sellingPrice: toStringValue(row.sellingPrice).trim() || undefined,
  costPrice: toStringValue(row.costPrice).trim() || undefined,
  reorderLevel: toStringValue(row.reorderLevel).trim() || undefined,
  active: toStringValue(row.active).trim() || undefined,
  notes: toStringValue(row.notes).trim() || undefined,
  description: toStringValue(row.description).trim() || undefined,
})

const buildWhere = (filters: FinishedGoodCsvFilters) => {
  const where: any = { deletedAt: null }

  if (filters.ids && filters.ids.length > 0) {
    where.id = { in: filters.ids }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
      { productCode: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters.articleCategoryId) {
    where.articleCategoryId = filters.articleCategoryId
  }

  if (filters.active !== undefined) {
    where.active = filters.active
  }

  return where
}

const resolveArticleCategoryId = async (articleCategoryId?: string, articleCategoryName?: string) => {
  if (articleCategoryId) return articleCategoryId
  if (!articleCategoryName) return undefined

  const category = await prisma.articleCategory.findFirst({
    where: { name: { equals: articleCategoryName, mode: 'insensitive' }, deletedAt: null },
  })

  return category?.id
}

const resolveExistingFinishedGood = async (row: FinishedGoodCsvRow) => {
  if (row.id) {
    const existing = await prisma.finishedGoodProduct.findFirst({ where: { id: row.id, deletedAt: null } })
    if (existing) return existing
  }

  if (row.sku) {
    const existing = await prisma.finishedGoodProduct.findFirst({ where: { sku: row.sku, deletedAt: null } })
    if (existing) return existing
  }

  if (row.productCode) {
    const existing = await prisma.finishedGoodProduct.findFirst({ where: { productCode: row.productCode, deletedAt: null } })
    if (existing) return existing
  }

  return null
}

export const generateFinishedGoodsCsv = async (filters: FinishedGoodCsvFilters = {}) => {
  const articles = await prisma.finishedGoodProduct.findMany({
    where: buildWhere(filters),
    orderBy: { name: 'asc' },
    include: { articleCategory: true },
  })

  const rows = articles.map((article) => ({
    id: article.id,
    sku: article.sku || '',
    productCode: article.productCode || '',
    name: article.name,
    articleCategoryId: article.articleCategoryId || '',
    articleCategoryName: article.articleCategory?.name || '',
    category: article.category || '',
    unit: article.unit,
    sellingPrice: article.sellingPrice?.toString() || '',
    costPrice: article.costPrice?.toString() || '',
    reorderLevel: article.reorderLevel ?? '',
    active: article.active ? 'true' : 'false',
    notes: article.notes || '',
    description: article.description || '',
  }))

  return stringify(rows, {
    header: true,
    columns: csvColumns as unknown as string[],
  })
}

export const generateFinishedGoodsTemplateCsv = () =>
  stringify(
    [
      {
        id: '',
        sku: 'FG-BAM-TEE-001',
        productCode: 'BAM-TEE',
        name: 'Bamboo Crew Neck Tee',
        articleCategoryId: '',
        articleCategoryName: 'Tops',
        category: 'Tops',
        unit: 'pcs',
        sellingPrice: '24.00',
        costPrice: '9.50',
        reorderLevel: '50',
        active: 'true',
        notes: 'Use as a template',
        description: 'Sample finished good row',
      },
    ],
    {
      header: true,
      columns: csvColumns as unknown as string[],
    },
  )

export const importFinishedGoodsFromCsv = async (buffer: Buffer, userId?: number) => {
  const csv = buffer.toString('utf8')
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message || 'Failed to parse CSV')
  }

  const rows = (parsed.data || []).map(normalizeRow)

  const summary = {
    totalRows: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
  }

  for (const row of rows) {
    if (!row.name || !row.unit || !row.sku || !row.productCode) {
      summary.skipped += 1
      continue
    }

    const articleCategoryId = await resolveArticleCategoryId(row.articleCategoryId, row.articleCategoryName)
    const payload = {
      sku: row.sku,
      productCode: row.productCode,
      name: row.name,
      articleCategoryId: articleCategoryId || null,
      category: row.category || null,
      unit: row.unit,
      sellingPrice: new Prisma.Decimal(row.sellingPrice || '0'),
      costPrice: new Prisma.Decimal(row.costPrice || '0'),
      reorderLevel: parseNumber(row.reorderLevel),
      active: parseBoolean(row.active, true),
      notes: row.notes || null,
      description: row.description || null,
      updatedBy: userId,
      createdBy: userId,
    }

    const existing = await resolveExistingFinishedGood(row)

    if (existing) {
      await prisma.finishedGoodProduct.update({
        where: { id: existing.id },
        data: payload,
      })
      summary.updated += 1
      continue
    }

    await prisma.finishedGoodProduct.create({ data: payload as any })
    summary.created += 1
  }

  return summary
}
