import { Request, Response } from 'express'
import { recordAudit } from '../utils/auditLog'
import { AppError } from '../utils/errors'
import { createExpenseSchema, updateExpenseSchema } from '../validators/expenseValidators'
import * as svc from '../services/expenseService'
import { asyncHandler } from '../utils/asyncHandler'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.listExpenses({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    category: req.query.category as string | undefined,
  })
  res.json(data)
})

export const get = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getExpense(req.params.id)
  if (!data) return res.status(404).send('Not found')
  res.json(data)
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = createExpenseSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid expense payload', { errors: parsed.error.errors })
  }
  const created = await svc.createExpense(parsed.data, user)
  try { await recordAudit({ action: 'expense.create', userId: user, after: { expenseId: created.id } }) } catch {}
  res.status(201).json(created)
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = updateExpenseSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid expense payload', { errors: parsed.error.errors })
  }
  const updated = await svc.updateExpense(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'expense.update', userId: user, after: { expenseId: updated.id } }) } catch {}
  res.json(updated)
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const deleted = await svc.deleteExpense(req.params.id, user)
  try { await recordAudit({ action: 'expense.delete', userId: user, after: { expenseId: deleted.id, deletedAt: deleted.deletedAt } }) } catch {}
  res.json(deleted)
})
