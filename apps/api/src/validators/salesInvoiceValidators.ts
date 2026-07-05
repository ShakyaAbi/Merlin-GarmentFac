import { z } from 'zod'

export const salesInvoiceItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  warehouseId: z.string().trim().optional(),
})

export const createSalesInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().optional(),
  fiscalYear: z.string().trim().optional(),
  customerId: z.string().trim().min(1),
  salesOrderId: z.string().trim().optional(),
  invoiceDate: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  taxAmount: z.coerce.number().nonnegative().optional(),
  remarks: z.string().trim().optional(),
  items: z.array(salesInvoiceItemSchema).min(1),
})

export const updateSalesInvoiceSchema = createSalesInvoiceSchema.partial().extend({
  items: z.array(salesInvoiceItemSchema).min(1).optional(),
})

export const salesInvoicePaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.string().trim().min(1),
  paymentDate: z.string().trim().optional(),
  note: z.string().trim().optional(),
})

export const updateSalesInvoicePaymentSchema = salesInvoicePaymentSchema.partial().extend({
  amount: z.coerce.number().positive().optional(),
  paymentMethod: z.string().trim().min(1).optional(),
})

export const cancelSalesInvoiceSchema = z.object({
  reason: z.string().trim().min(1, 'Cancellation reason is required'),
})
