import { Request, Response } from 'express'
import * as svc from '../services/salesInvoiceService'
import * as orgRepo from '../repositories/organizationRepository'
import { recordAudit } from '../utils/auditLog'
import {
  cancelSalesInvoiceSchema,
  createSalesInvoiceSchema,
  salesInvoicePaymentSchema,
  updateSalesInvoicePaymentSchema,
  updateSalesInvoiceSchema,
} from '../validators/salesInvoiceValidators'
import { AppError } from '../utils/errors'
import { asyncHandler } from '../utils/asyncHandler'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.listInvoices({
    search: req.query.search as string | undefined,
    customerId: req.query.customerId as string | undefined,
    invoiceStatus: req.query.invoiceStatus as any,
    paymentStatus: req.query.paymentStatus as any,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
  })
  res.json(data)
})

export const exportList = asyncHandler(async (req: Request, res: Response) => {
  const csv = await svc.exportInvoices({
    search: req.query.search as string | undefined,
    customerId: req.query.customerId as string | undefined,
    invoiceStatus: req.query.invoiceStatus as any,
    paymentStatus: req.query.paymentStatus as any,
  })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="sales-invoices.csv"')
  res.send(csv)
})

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.listCustomers({
    search: req.query.search as string | undefined,
  })
  res.json(data)
})

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.listProducts({
    search: req.query.search as string | undefined,
  })
  res.json(data)
})

export const nextNumber = asyncHandler(async (req: Request, res: Response) => {
  const invoiceDate = req.query.invoiceDate ? new Date(req.query.invoiceDate as string) : new Date()
  if (Number.isNaN(invoiceDate.getTime())) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid invoice date')
  }

  const organizationId = (req as any).user?.organizationId as number | undefined
  const organization = organizationId ? await orgRepo.findById(organizationId) : null
  const invoiceNumber = await svc.previewNextInvoiceNumber(
    invoiceDate,
    organization?.resetSalesInvoiceSequenceEachFiscalYear ?? true,
    organization?.nextSalesInvoiceNumber ?? 1,
  )
  res.json({ invoiceNumber })
})

export const get = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await svc.getInvoice(req.params.id)
  if (!invoice) return res.status(404).send('Not found')
  res.json(invoice)
})

export const exportOne = asyncHandler(async (req: Request, res: Response) => {
  const csv = await svc.exportInvoice(req.params.id)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="sales-invoice-${req.params.id}.csv"`)
  res.send(csv)
})

export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = (req as any).user?.organizationId as number | undefined
  const organization = organizationId ? await orgRepo.findById(organizationId) : null
  const pdf = await svc.exportInvoicePdf(req.params.id, organization?.name || 'Merlin Lite', organization)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="sales-invoice-${req.params.id}.pdf"`)
  res.send(pdf)
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = createSalesInvoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid sales invoice payload', { errors: parsed.error.errors })
  }

  const created = await svc.createInvoice(parsed.data, user)
  try { await recordAudit({ action: 'sales_invoice.create', userId: user, after: { invoiceId: created.id } }) } catch (error) {}
  res.status(201).json(created)
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = updateSalesInvoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid sales invoice payload', { errors: parsed.error.errors })
  }

  const updated = await svc.updateInvoice(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'sales_invoice.update', userId: user, after: { invoiceId: updated.id } }) } catch (error) {}
  res.json(updated)
})

export const issue = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const updated = await svc.issueInvoice(req.params.id, user)
  try { await recordAudit({ action: 'sales_invoice.issue', userId: user, after: { invoiceId: updated.id, status: updated.invoiceStatus } }) } catch (error) {}
  res.json(updated)
})

export const payment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = salesInvoicePaymentSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid payment payload', { errors: parsed.error.errors })
  }

  const updated = await svc.recordPayment(req.params.id, parsed.data, user, (req as any).user?.organizationId)
  try { await recordAudit({ action: 'sales_invoice.payment', userId: user, after: { invoiceId: updated.id, paymentStatus: updated.paymentStatus } }) } catch (error) {}
  res.json(updated)
})

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.listInvoicePayments(req.params.id)
  res.json({ payments: data })
})

export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = updateSalesInvoicePaymentSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid payment payload', { errors: parsed.error.errors })
  }

  const updated = await svc.updatePayment(req.params.id, req.params.paymentId, parsed.data, user, (req as any).user?.organizationId)
  try { await recordAudit({ action: 'sales_invoice.payment.update', userId: user, after: { invoiceId: updated.id } }) } catch (error) {}
  res.json(updated)
})

export const removePayment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const updated = await svc.deletePayment(req.params.id, req.params.paymentId)
  try { await recordAudit({ action: 'sales_invoice.payment.delete', userId: user, after: { invoiceId: updated.id } }) } catch (error) {}
  res.status(204).send()
})

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user?.id as number | undefined
  const parsed = cancelSalesInvoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid cancel payload', { errors: parsed.error.errors })
  }

  const updated = await svc.cancelInvoice(req.params.id, parsed.data, user)
  try { await recordAudit({ action: 'sales_invoice.cancel', userId: user, after: { invoiceId: updated.id, status: updated.invoiceStatus } }) } catch (error) {}
  res.json(updated)
})
