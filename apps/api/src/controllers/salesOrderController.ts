import { Request, Response } from 'express'
import { recordAudit } from '../utils/auditLog'
import { AppError } from '../utils/errors'
import { createSalesOrderSchema, updateSalesOrderSchema } from '../validators/salesOrderValidators'
import * as svc from '../services/salesOrderService'

export const list = async (req: Request, res: Response) => {
  const data = await svc.listSalesOrders({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    customerId: req.query.customerId as string | undefined,
  })
  res.json(data)
}

export const get = async (req: Request, res: Response) => {
  const data = await svc.getSalesOrder(req.params.id)
  if (!data) return res.status(404).send('Not found')
  res.json(data)
}

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = createSalesOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid sales order payload', { errors: parsed.error.errors })
  }
  const created = await svc.createSalesOrder(parsed.data, user)
  try { await recordAudit({ action: 'sales_order.create', userId: user, after: { salesOrderId: created.id } }) } catch {}
  res.status(201).json(created)
}

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = updateSalesOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid sales order payload', { errors: parsed.error.errors })
  }
  const updated = await svc.updateSalesOrder(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'sales_order.update', userId: user, after: { salesOrderId: updated.id } }) } catch {}
  res.json(updated)
}

export const confirm = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const updated = await svc.confirmSalesOrder(req.params.id, user)
  try { await recordAudit({ action: 'sales_order.confirm', userId: user, after: { salesOrderId: updated.id, status: updated.status } }) } catch {}
  res.json(updated)
}

export const fulfill = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const updated = await svc.fulfillSalesOrder(req.params.id, user)
  try { await recordAudit({ action: 'sales_order.fulfill', userId: user, after: { salesOrderId: updated.id, status: updated.status } }) } catch {}
  res.json(updated)
}

export const cancel = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const updated = await svc.cancelSalesOrder(req.params.id, (req.body?.reason as string | undefined) || undefined, user)
  try { await recordAudit({ action: 'sales_order.cancel', userId: user, after: { salesOrderId: updated.id, status: updated.status } }) } catch {}
  res.json(updated)
}

export const invoice = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const invoice = await svc.convertToInvoice(req.params.id, user)
  try { await recordAudit({ action: 'sales_order.invoice', userId: user, after: { salesOrderId: req.params.id, invoiceId: invoice.id } }) } catch {}
  res.status(201).json(invoice)
}
