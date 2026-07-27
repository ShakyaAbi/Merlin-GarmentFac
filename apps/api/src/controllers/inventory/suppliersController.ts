import { Request, Response } from 'express'
import * as svc from '../../services/inventory/supplierService'
import { recordAudit } from '../../utils/auditLog'
import { AppError } from '../../utils/errors'
import { createSupplierPaymentSchema, createSupplierSchema, updateSupplierPaymentSchema, updateSupplierSchema } from '../../validators/supplierValidators'
import { asyncHandler } from '../../utils/asyncHandler'

// Creates a supplier
export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = createSupplierSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid supplier payload', { errors: parsed.error.errors })
  const created = await svc.createSupplier({ ...parsed.data, createdBy: user })
  try { await recordAudit({ action: 'supplier.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
})

export const nextNumber = asyncHandler(async (_req: Request, res: Response) => {
  const data = await svc.previewNextSupplierNumber()
  res.json({ supplierNumber: data })
})

// Lists suppliers
export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.listSuppliers({ skip: Number(req.query.skip) || 0, take: Number(req.query.take) || 50, search: req.query.search as string })
  res.json(data)
})

// Returns one supplier
export const get = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSupplier(req.params.id)
  if (!data) return res.status(404).send('Not found')
  res.json(data)
})

export const ledger = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await svc.getSupplier(req.params.id)
  if (!supplier) return res.status(404).send('Not found')
  const entries = await svc.getSupplierLedger(req.params.id)
  res.json({ entries, summary: (supplier as any).summary, supplierId: supplier.id, supplierNumber: (supplier as any).supplierNumber || null })
})

export const payments = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await svc.getSupplier(req.params.id)
  if (!supplier) return res.status(404).send('Not found')
  const payments = await svc.listSupplierPayments(req.params.id)
  res.json({ payments, summary: (supplier as any).summary, supplierId: supplier.id, supplierNumber: (supplier as any).supplierNumber || null })
})

export const payment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await svc.getSupplierPayment(req.params.id, req.params.paymentId)
  if (!payment) return res.status(404).send('Not found')
  res.json(payment)
})

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = createSupplierPaymentSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid supplier payment payload', { errors: parsed.error.errors })
  const created = await svc.recordSupplierPayment(req.params.id, parsed.data, user, req.user!.organizationId)
  try { await recordAudit({ action: 'supplier.payment.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
})

export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = updateSupplierPaymentSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid supplier payment payload', { errors: parsed.error.errors })
  const updated = await svc.updateSupplierPayment(req.params.id, req.params.paymentId, parsed.data, user, req.user!.organizationId)
  try { await recordAudit({ action: 'supplier.payment.update', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
})

export const removePayment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const removed = await svc.deleteSupplierPayment(req.params.id, req.params.paymentId)
  try { await recordAudit({ action: 'supplier.payment.delete', userId: user, after: removed }) } catch (e) {}
  res.status(204).send()
})

// Updates a supplier
export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = updateSupplierSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid supplier payload', { errors: parsed.error.errors })
  const updated = await svc.updateSupplier(req.params.id, parsed.data)
  try { await recordAudit({ action: 'supplier.update', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
})

// Soft-deletes a supplier
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const removed = await svc.softDeleteSupplier(req.params.id)
  try { await recordAudit({ action: 'supplier.delete', userId: user, after: removed }) } catch (e) {}
  res.status(204).send()
})
