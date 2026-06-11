import { Request, Response } from 'express'
import { recordAudit } from '../../utils/auditLog'
import { AppError } from '../../utils/errors'
import { createProductionOrderSchema, completeProductionOrderSchema, issueProductionOrderSchema } from '../../validators/productionValidators'
import * as svc from '../../services/productionService'

export const list = async (req: Request, res: Response) => {
  const data = await svc.listProductionOrders({ search: req.query.search as string | undefined })
  res.json(data)
}

export const get = async (req: Request, res: Response) => {
  const data = await svc.getProductionOrder(req.params.id)
  if (!data) return res.status(404).send('Not found')
  res.json(data)
}

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = createProductionOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid production order payload', { errors: parsed.error.errors })
  }
  const created = await svc.createProductionOrder(parsed.data, user)
  try { await recordAudit({ action: 'production.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}

export const issue = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = issueProductionOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid production issue payload', { errors: parsed.error.errors })
  }
  const updated = await svc.issueProductionOrder(req.params.id, user, parsed.data.issueReason)
  try { await recordAudit({ action: 'production.issue', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
}

export const complete = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = completeProductionOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid production completion payload', { errors: parsed.error.errors })
  }
  const updated = await svc.completeProductionOrder(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'production.complete', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
}
