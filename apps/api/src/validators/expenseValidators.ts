import { z } from 'zod'

export const createExpenseSchema = z.object({
  expenseDate: z.string().trim().optional(),
  category: z.string().trim().min(1, 'Expense category is required'),
  vendor: z.string().trim().optional(),
  description: z.string().trim().min(1, 'Expense description is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.string().trim().min(1).optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'PAID', 'VOID']).optional(),
  paymentDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial()
