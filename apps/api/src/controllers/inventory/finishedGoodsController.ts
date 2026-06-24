import { Request, Response } from 'express'
import * as svc from '../../services/inventory/finishedGoodsService'
import { recordAudit } from '../../utils/auditLog'
import { AppError } from '../../utils/errors'
import { createFinishedGoodSchema, updateFinishedGoodSchema } from '../../validators/finishedGoodsValidators'
import { adjustStockSchema } from '../../validators/inventoryValidators'
import path from 'path'

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = createFinishedGoodSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid article payload', { errors: parsed.error.errors })
  }

  const created = await svc.createFinishedGood(parsed.data, user)
  try { await recordAudit({ action: 'finished_good.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}

export const list = async (req: Request, res: Response) => {
  const data = await svc.listFinishedGoods({
    search: req.query.search as string | undefined,
    active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
  })
  res.json(data)
}

export const nextNumber = async (_req: Request, res: Response) => {
  const articleNumber = await svc.previewNextArticleNumber()
  res.json({ articleNumber })
}

export const get = async (req: Request, res: Response) => {
  const data = await svc.getFinishedGood(req.params.id)
  if (!data) return res.status(404).send('Not found')
  res.json(data)
}

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = updateFinishedGoodSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid article payload', { errors: parsed.error.errors })
  }

  const updated = await svc.updateFinishedGood(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'finished_good.update', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
}

export const transactions = async (req: Request, res: Response) => {
  const data = await svc.listTransactions(req.params.id, {
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
  })
  res.json(data)
}

export const adjustStock = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = adjustStockSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid article stock adjustment payload', { errors: parsed.error.errors })
  const { change, reason, unit, referenceId } = parsed.data
  const tx = await svc.adjustFinishedGoodStock({
    productId: req.params.id,
    change,
    unit,
    reason,
    referenceId,
    createdBy: user,
  })
  try { await recordAudit({ action: 'finished_good.adjust_stock', userId: user, after: tx }) } catch (e) {}
  res.status(201).json(tx)
}

export const uploadImage = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) {
    throw new AppError(400, 'INVALID_INPUT', 'Article image file is required')
  }

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/articles/${path.basename(file.path)}`
  const updated = await svc.updateFinishedGood(req.params.id, { imageUrl }, user)
  try { await recordAudit({ action: 'finished_good.upload_image', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
}
