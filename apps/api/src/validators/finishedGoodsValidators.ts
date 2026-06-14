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
  bomData: z.object({
    name: z.string().trim().optional(),
    garmentStyle: z.string().trim().optional(),
    items: z.array(z.object({
      rawMaterialId: z.string().trim().min(1),
      consumption: z.coerce.number().nonnegative(),
      unit: z.string().trim().min(1),
      rate: z.coerce.number().nonnegative().optional(),
      yield: z.coerce.number().nonnegative().optional(),
    })).optional(),
  }).optional(),
})

export const updateFinishedGoodSchema = createFinishedGoodSchema.partial()
