import { Request, Response } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  generateMaterialsCsv,
  generateMaterialsTemplateCsv,
  importMaterialsFromCsv,
} from '../../services/inventory/materialCsvService'

const parseIds = (value: unknown) => {
  if (!value) return undefined
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return undefined
}

export const exportCSV = asyncHandler(async (req: Request, res: Response) => {
  const { search, categoryId, active, materialId, ids } = req.body?.filters || {}
  const csv = await generateMaterialsCsv({
    ids: parseIds(ids || materialId),
    search: typeof search === 'string' ? search : undefined,
    categoryId: typeof categoryId === 'string' ? categoryId : undefined,
    active: active === undefined ? undefined : active === true || active === 'true',
  })

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `materials_${timestamp}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
})

export const templateSample = asyncHandler(async (_req: Request, res: Response) => {
  const csv = generateMaterialsTemplateCsv()
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="import-template-materials.csv"')
  res.send(csv)
})

export const importCSV = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ error: 'CSV file is required' })
  }

  const userId = (req as any).user?.id
  const summary = await importMaterialsFromCsv(req.file.buffer, userId)
  res.status(201).json(summary)
})
