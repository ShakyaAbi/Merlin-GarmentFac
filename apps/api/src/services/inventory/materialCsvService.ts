import Papa from 'papaparse'
import { Prisma } from '@prisma/client'
import { stringify } from 'csv-stringify/sync'
import { prisma } from '../../prisma'
import * as materialRepo from '../../repositories/inventory/materialRepository'

type MaterialCsvFilters = {
  ids?: string[]
  search?: string
  categoryId?: string
  active?: boolean
}

type MaterialCsvRow = {
  id?: string
  name: string
  sku?: string
  defaultUnit: string
  categoryId?: string
  categoryName?: string
  description?: string
  reorderLevel?: string
  costPrice?: string
  active?: string
  notes?: string
}

const csvColumns = [
  'id',
  'name',
  'sku',
  'defaultUnit',
  'categoryId',
  'categoryName',
  'description',
  'reorderLevel',
  'costPrice',
  'active',
  'notes',
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

const normalizeRow = (row: Record<string, unknown>): MaterialCsvRow => ({
  id: toStringValue(row.id) || undefined,
  name: toStringValue(row.name).trim(),
  sku: toStringValue(row.sku).trim() || undefined,
  defaultUnit: toStringValue(row.defaultUnit).trim(),
  categoryId: toStringValue(row.categoryId).trim() || undefined,
  categoryName: toStringValue(row.categoryName).trim() || undefined,
  description: toStringValue(row.description).trim() || undefined,
  reorderLevel: toStringValue(row.reorderLevel).trim() || undefined,
  costPrice: toStringValue(row.costPrice).trim() || undefined,
  active: toStringValue(row.active).trim() || undefined,
  notes: toStringValue(row.notes).trim() || undefined,
})

const buildWhere = (filters: MaterialCsvFilters) => {
  const where: any = { deletedAt: null }

  if (filters.ids && filters.ids.length > 0) {
    where.id = { in: filters.ids }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }

  if (filters.active !== undefined) {
    where.active = filters.active
  }

  return where
}

const resolveCategoryId = async (categoryId?: string, categoryName?: string) => {
  if (categoryId) return categoryId
  if (!categoryName) return undefined

  const category = await prisma.rawMaterialCategory.findFirst({
    where: { categoryName: { equals: categoryName, mode: 'insensitive' }, deletedAt: null },
  })

  return category?.id
}

export const generateMaterialsCsv = async (filters: MaterialCsvFilters = {}) => {
  const materials = await prisma.rawMaterial.findMany({
    where: buildWhere(filters),
    orderBy: { name: 'asc' },
    include: { category: true },
  })

  const rows = await Promise.all(
    materials.map(async (material) => ({
      id: material.id,
      name: material.name,
      sku: material.sku || '',
      defaultUnit: material.defaultUnit,
      categoryId: material.categoryId || '',
      categoryName: material.category?.categoryName || '',
      description: material.description || '',
      reorderLevel: material.reorderLevel ?? '',
      costPrice: material.costPrice?.toString() || '',
      active: material.active ? 'true' : 'false',
      notes: material.notes || '',
    })),
  )

  return stringify(rows, {
    header: true,
    columns: csvColumns as unknown as string[],
  })
}

export const generateMaterialsTemplateCsv = () =>
  stringify(
    [
      {
        id: '',
        name: 'Cotton fabric',
        sku: 'MAT-001',
        defaultUnit: 'm',
        categoryId: '',
        categoryName: 'Fabric',
        description: 'Sample material row',
        reorderLevel: '100',
        costPrice: '120.50',
        active: 'true',
        notes: 'Use as a template',
      },
    ],
    {
      header: true,
      columns: csvColumns as unknown as string[],
    },
  )

export const importMaterialsFromCsv = async (buffer: Buffer, userId?: number) => {
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
    if (!row.name || !row.defaultUnit) {
      summary.skipped += 1
      continue
    }

    const categoryId = await resolveCategoryId(row.categoryId, row.categoryName)
    const payload = {
      name: row.name,
      sku: row.sku || null,
      defaultUnit: row.defaultUnit,
      categoryId: categoryId || null,
      description: row.description || null,
      reorderLevel: parseNumber(row.reorderLevel),
      costPrice: row.costPrice ? new Prisma.Decimal(row.costPrice) : undefined,
      active: parseBoolean(row.active, true),
      notes: row.notes || null,
      updatedBy: userId,
      createdBy: userId,
    }

    let existing = null
    if (row.id) {
      existing = await prisma.rawMaterial.findFirst({ where: { id: row.id, deletedAt: null } })
    }
    if (!existing && row.sku) {
      existing = await prisma.rawMaterial.findFirst({ where: { sku: row.sku, deletedAt: null } })
    }

    if (existing) {
      await prisma.rawMaterial.update({
        where: { id: existing.id },
        data: payload,
      })
      summary.updated += 1
      continue
    }

    await materialRepo.createMaterial(payload)
    summary.created += 1
  }

  return summary
}
