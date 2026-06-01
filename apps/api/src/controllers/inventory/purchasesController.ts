import { Request, Response } from 'express'
import * as svc from '../../services/inventory/purchaseService'
import { recordAudit } from '../../utils/auditLog'

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const body = req.body
  const { items } = body
  const { purchaseId, total } = await svc.createPurchase({ supplierId: body.supplierId, invoiceNumber: body.invoiceNumber, invoiceDate: new Date(body.invoiceDate), currency: body.currency }, items, user)
  try { await recordAudit({ action: 'purchase.create', userId: user, after: { purchaseId, total } }) } catch (e) {}
  res.status(201).json({ id: purchaseId, totalAmount: total })
}

export const get = async (req: Request, res: Response) => {
  res.status(200).json({})
}
