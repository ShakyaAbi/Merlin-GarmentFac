import { Request, Response } from 'express'
import * as svc from '../services/salesInvoiceService'
import { recordAudit } from '../utils/auditLog'
import {
  cancelSalesInvoiceSchema,
  createSalesInvoiceSchema,
  salesInvoicePaymentSchema,
  updateSalesInvoiceSchema,
} from '../validators/salesInvoiceValidators'
import { AppError } from '../utils/errors'

export const list = async (req: Request, res: Response) => {
  const data = await svc.listInvoices({
    search: req.query.search as string | undefined,
    customerId: req.query.customerId as string | undefined,
    invoiceStatus: req.query.invoiceStatus as any,
    paymentStatus: req.query.paymentStatus as any,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
  })
  res.json(data)
}

export const exportList = async (req: Request, res: Response) => {
  const csv = await svc.exportInvoices({
    search: req.query.search as string | undefined,
    customerId: req.query.customerId as string | undefined,
    invoiceStatus: req.query.invoiceStatus as any,
    paymentStatus: req.query.paymentStatus as any,
  })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="sales-invoices.csv"')
  res.send(csv)
}

export const listCustomers = async (req: Request, res: Response) => {
  const data = await svc.listCustomers({
    search: req.query.search as string | undefined,
  })
  res.json(data)
}

export const listProducts = async (req: Request, res: Response) => {
  const data = await svc.listProducts({
    search: req.query.search as string | undefined,
  })
  res.json(data)
}

export const get = async (req: Request, res: Response) => {
  const invoice = await svc.getInvoice(req.params.id)
  if (!invoice) return res.status(404).send('Not found')
  res.json(invoice)
}

export const exportOne = async (req: Request, res: Response) => {
  const csv = await svc.exportInvoice(req.params.id)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="sales-invoice-${req.params.id}.csv"`)
  res.send(csv)
}

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = createSalesInvoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid sales invoice payload', { errors: parsed.error.errors })
  }

  const created = await svc.createInvoice(parsed.data, user)
  try { await recordAudit({ action: 'sales_invoice.create', userId: user, after: { invoiceId: created.id } }) } catch (error) {}
  res.status(201).json(created)
}

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = updateSalesInvoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid sales invoice payload', { errors: parsed.error.errors })
  }

  const updated = await svc.updateInvoice(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'sales_invoice.update', userId: user, after: { invoiceId: updated.id } }) } catch (error) {}
  res.json(updated)
}

export const submit = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const updated = await svc.submitInvoice(req.params.id, user)
  try { await recordAudit({ action: 'sales_invoice.submit', userId: user, after: { invoiceId: updated.id, status: updated.invoiceStatus } }) } catch (error) {}
  res.json(updated)
}

export const issue = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const updated = await svc.issueInvoice(req.params.id, user)
  try { await recordAudit({ action: 'sales_invoice.issue', userId: user, after: { invoiceId: updated.id, status: updated.invoiceStatus } }) } catch (error) {}
  res.json(updated)
}

export const payment = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = salesInvoicePaymentSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid payment payload', { errors: parsed.error.errors })
  }

  const updated = await svc.recordPayment(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'sales_invoice.payment', userId: user, after: { invoiceId: updated.id, paymentStatus: updated.paymentStatus } }) } catch (error) {}
  res.json(updated)
}

export const cancel = async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = cancelSalesInvoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid cancel payload', { errors: parsed.error.errors })
  }

  const updated = await svc.cancelInvoice(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'sales_invoice.cancel', userId: user, after: { invoiceId: updated.id, status: updated.invoiceStatus } }) } catch (error) {}
  res.json(updated)
}
