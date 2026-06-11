import { z } from 'zod'

export const salesOrderItemSchema = z.object({
  productId: z.string().trim().min(1, 'Finished good is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitPrice: z.coerce.number().nonnegative().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  taxAmount: z.coerce.number().nonnegative().optional(),
})

export const createSalesOrderSchema = z.object({
  customerId: z.string().trim().min(1, 'Customer is required'),
  orderDate: z.string().trim().optional(),
  requiredBy: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one line item is required'),
})

export const updateSalesOrderSchema = createSalesOrderSchema.partial().extend({
  items: z.array(salesOrderItemSchema).min(1).optional(),
})

