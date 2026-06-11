import { z } from 'zod'

export const createFinishedGoodSchema = z.object({
  sku: z.string().trim().optional(),
  productCode: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Product name is required'),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  unit: z.string().trim().min(1).default('pcs'),
  sellingPrice: z.coerce.number().nonnegative().default(0),
  costPrice: z.coerce.number().nonnegative().default(0),
  reorderLevel: z.coerce.number().nonnegative().optional(),
  active: z.coerce.boolean().optional(),
  notes: z.string().trim().optional(),
})

export const updateFinishedGoodSchema = createFinishedGoodSchema.partial()

