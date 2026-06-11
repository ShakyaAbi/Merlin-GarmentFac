import { Request, Response } from 'express'
import * as svc from '../../services/inventory/supplierService'
import { recordAudit } from '../../utils/auditLog'
import { AppError } from '../../utils/errors'
import { createSupplierSchema, updateSupplierSchema } from '../../validators/supplierValidators'

// Creates a supplier
export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = createSupplierSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid supplier payload', { errors: parsed.error.errors })
  const created = await svc.createSupplier({ ...parsed.data, createdBy: user })
  try { await recordAudit({ action: 'supplier.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}

// Lists suppliers
export const list = async (req: Request, res: Response) => {
  const data = await svc.listSuppliers({ skip: Number(req.query.skip) || 0, take: Number(req.query.take) || 50, search: req.query.search as string })
  res.json(data)
}

// Returns one supplier
export const get = async (req: Request, res: Response) => {
  const data = await svc.getSupplier(req.params.id)
  if (!data) return res.status(404).send('Not found')
  res.json(data)
}

// Updates a supplier
export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = updateSupplierSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid supplier payload', { errors: parsed.error.errors })
  const updated = await svc.updateSupplier(req.params.id, parsed.data)
  try { await recordAudit({ action: 'supplier.update', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
}

// Soft-deletes a supplier
export const remove = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const removed = await svc.softDeleteSupplier(req.params.id)
  try { await recordAudit({ action: 'supplier.delete', userId: user, after: removed }) } catch (e) {}
  res.status(204).send()
}
