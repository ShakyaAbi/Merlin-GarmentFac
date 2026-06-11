import { Request, Response } from 'express'
import * as svc from '../../services/inventory/purchaseService'
import { recordAudit } from '../../utils/auditLog'
import { createPurchaseSchema } from '../../validators/inventoryValidators'
import { AppError } from '../../utils/errors'

// Creates a purchase order
export const create = async (req: Request, res: Response) => {
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
      currency: body.currency,
      notes: body.notes,
    },
    items,
    user,
  )
  try { await recordAudit({ action: 'purchase.create', userId: user, after: { purchaseId, total } }) } catch (e) {}
  res.status(201).json({ id: purchaseId, totalAmount: total })
}

// Returns an empty purchase response
export const get = async (req: Request, res: Response) => {
  const purchase = await svc.getPurchase(req.params.id)
  if (!purchase) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Purchase not found' } })
  }
  res.status(200).json(purchase)
}
