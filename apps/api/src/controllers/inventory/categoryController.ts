import { Request, Response } from 'express'
import * as svc from '../../services/inventory/categoryService'
import { createCategorySchema } from '../../validators/inventoryValidators'
import { AppError } from '../../utils/errors'
import { recordAudit } from '../../utils/auditLog'

export const list = async (req: Request, res: Response) => {
  const data = await svc.listCategories()
  res.json(data)
}

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = createCategorySchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid category data', { errors: parsed.error.errors })
  const created = await svc.createCategory(parsed.data)
  try { await recordAudit({ action: 'category.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}