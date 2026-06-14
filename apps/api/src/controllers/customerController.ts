import { Request, Response } from 'express'
import { recordAudit } from '../utils/auditLog'
import { AppError } from '../utils/errors'
import { createCustomerSchema, updateCustomerSchema } from '../validators/customerValidators'
import * as svc from '../services/customerService'

export const list = async (req: Request, res: Response) => {
  const data = await svc.listCustomers({
    search: req.query.search as string | undefined,
    skip: Number(req.query.skip) || 0,
    take: Number(req.query.take) || 100,
  })
  res.json(data)
}

export const nextNumber = async (_req: Request, res: Response) => {
  const data = await svc.previewNextCustomerNumber()
  res.json({ customerNumber: data })
}

export const get = async (req: Request, res: Response) => {
  const customer = await svc.getCustomer(req.params.id)
  if (!customer) return res.status(404).send('Not found')
  res.json(customer)
}

export const ledger = async (req: Request, res: Response) => {
  const customer = await svc.getCustomer(req.params.id)
  if (!customer) return res.status(404).send('Not found')
  const entries = await svc.getCustomerLedger(req.params.id)
  res.json({ entries, summary: customer.summary, customerId: customer.id, customerNumber: (customer as any).customerNumber || null })
}

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = createCustomerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid customer payload', { errors: parsed.error.errors })
  }

  const created = await svc.createCustomer({ ...parsed.data, createdBy: user, updatedBy: user })
  try { await recordAudit({ action: 'customer.create', userId: user, after: created }) } catch {}
  res.status(201).json(created)
}

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = updateCustomerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid customer payload', { errors: parsed.error.errors })
  }

  const updated = await svc.updateCustomer(req.params.id, { ...parsed.data, updatedBy: user })
  try { await recordAudit({ action: 'customer.update', userId: user, after: updated }) } catch {}
  res.json(updated)
}

export const remove = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const removed = await svc.softDeleteCustomer(req.params.id)
  try { await recordAudit({ action: 'customer.delete', userId: user, after: removed }) } catch {}
  res.status(204).send()
}
