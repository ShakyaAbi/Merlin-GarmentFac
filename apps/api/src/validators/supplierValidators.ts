import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required'),
  contactName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().optional(),
  panVatNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  externalRef: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  name: z.string().trim().min(1, 'Supplier name is required').optional(),
})
