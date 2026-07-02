import { Request, Response } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  generateFinishedGoodsCsv,
  generateFinishedGoodsTemplateCsv,
  importFinishedGoodsFromCsv,
} from '../../services/inventory/finishedGoodsCsvService'

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
  const { search, articleCategoryId, active, finishedGoodId, ids } = req.body?.filters || {}
  const csv = await generateFinishedGoodsCsv({
    ids: parseIds(ids || finishedGoodId),
    search: typeof search === 'string' ? search : undefined,
    articleCategoryId: typeof articleCategoryId === 'string' ? articleCategoryId : undefined,
    active: active === undefined ? undefined : active === true || active === 'true',
  })

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `finished-goods_${timestamp}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
})

export const templateSample = asyncHandler(async (_req: Request, res: Response) => {
  const csv = generateFinishedGoodsTemplateCsv()
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="import-template-finished-goods.csv"')
  res.send(csv)
})

export const importCSV = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ error: 'CSV file is required' })
  }

  const userId = (req as any).user?.id
  const summary = await importFinishedGoodsFromCsv(req.file.buffer, userId)
  res.status(201).json(summary)
})
