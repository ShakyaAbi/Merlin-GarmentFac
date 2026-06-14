import { z } from 'zod'

export const createCustomerSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  panVatNumber: z.string().trim().optional(),
  customerType: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  notes: z.string().trim().optional(),
  openingBalance: z.coerce.number().min(0).optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()
