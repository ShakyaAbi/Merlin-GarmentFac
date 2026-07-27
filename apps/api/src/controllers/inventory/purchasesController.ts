import { Request, Response } from 'express'
import * as svc from '../../services/inventory/purchaseService'
import { recordAudit } from '../../utils/auditLog'
import { cancelPurchaseSchema, createPurchaseSchema, purchasePaymentSchema, updatePurchasePaymentSchema } from '../../validators/inventoryValidators'
import { AppError } from '../../utils/errors'
import { asyncHandler } from '../../utils/asyncHandler'

const parseOptionalDate = (value?: string | null) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// Creates a purchase order
export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = createPurchaseSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid purchase payload', { errors: parsed.error.errors })
  const body = parsed.data
  const { items } = body
  const { purchaseId, total } = await svc.createPurchase(
    {
      supplierId: body.supplierId,
      invoiceNumber: body.invoiceNumber,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      dueDate: parseOptionalDate(body.dueDate),
      currency: body.currency,
      discountAmount: body.discountAmount,
      notes: body.notes,
    },
    items,
    user,
  )
  try { await recordAudit({ action: 'purchase.create', userId: user, after: { purchaseId, total } }) } catch (e) {}
  res.status(201).json({ id: purchaseId, totalAmount: total })
})

// Returns an empty purchase response
export const get = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await svc.getPurchase(req.params.id)
  if (!purchase) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Purchase not found' } })
  }
  res.status(200).json(purchase)
})

export const list = asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 500)
  res.json(await svc.listPurchases(Number.isFinite(limit) ? limit : 500))
})

export const payments = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await svc.getPurchase(req.params.id)
  if (!purchase) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Purchase not found' } })
  res.json({ payments: await svc.listPurchasePayments(req.params.id) })
})

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const parsed = purchasePaymentSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid payment payload', { errors: parsed.error.errors })
  const updated = await svc.recordPurchasePayment(req.params.id, parsed.data, (req as any).user?.id, (req as any).user?.organizationId)
  res.json(updated)
})

export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updatePurchasePaymentSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid payment payload', { errors: parsed.error.errors })
  const updated = await svc.updatePurchasePayment(req.params.id, req.params.paymentId, parsed.data, (req as any).user?.id, (req as any).user?.organizationId)
  res.json(updated)
})

export const removePayment = asyncHandler(async (req: Request, res: Response) => {
  await svc.deletePurchasePayment(req.params.id, req.params.paymentId)
  res.status(204).send()
})

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const parsed = cancelPurchaseSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid cancellation payload', { errors: parsed.error.errors })
  res.json(await svc.cancelPurchase(req.params.id, parsed.data.reason, (req as any).user?.id))
})
