import { Request, Response } from 'express'
import * as svc from '../../services/inventory/articleCategoryService'
import { AppError } from '../../utils/errors'
import { recordAudit } from '../../utils/auditLog'
import { z } from 'zod'

const createArticleCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  description: z.string().trim().optional(),
})

export const list = async (req: Request, res: Response) => {
  const data = await svc.listCategories()
  res.json(data)
}

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = createArticleCategorySchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid category data', { errors: parsed.error.errors })
  const created = await svc.createCategory(parsed.data)
  try { await recordAudit({ action: 'article_category.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}

export const remove = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const deleted = await svc.deleteCategory(req.params.id)
  try { await recordAudit({ action: 'article_category.delete', userId: user, after: deleted }) } catch (e) {}
  res.status(204).send()
}
