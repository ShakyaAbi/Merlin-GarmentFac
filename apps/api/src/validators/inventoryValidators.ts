import { z } from 'zod'

export const purchaseItemSchema = z.object({
  rawMaterialId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.coerce.string().trim().min(1),
})

export const createCategorySchema = z.object({
  categoryName: z.string().trim().min(1, 'Category name is required'),
  description: z.string().trim().optional(),
})

export const createMaterialSchema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1, 'Exim code is required'),
  defaultUnit: z.string().trim().min(1),
  description: z.string().trim().optional(),
  reorderLevel: z.coerce.number().optional(),
  costPrice: z.coerce.number().optional(),
  active: z.coerce.boolean().optional(),
  unitConversions: z.unknown().optional(),
  categoryId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  averageUnitCost: z.coerce.number().optional(),
})

export const updateMaterialSchema = createMaterialSchema.partial().extend({
  name: z.string().trim().min(1).optional(),
  defaultUnit: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1, 'Exim code is required').optional(),
})

export const adjustStockSchema = z.object({
  change: z.coerce.number(),
  unit: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  referenceId: z.string().trim().optional(),
  transactionType: z.string().trim().optional(),
  unitCost: z.coerce.number().optional(),
})

export const toggleMaterialStatusSchema = z.object({
  active: z.coerce.boolean(),
})

export const createPurchaseSchema = z.object({
  supplierId: z.string().trim().min(1),
  invoiceNumber: z.string().trim().min(1),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  items: z.array(purchaseItemSchema).min(1),
  notes: z.string().optional(),
})
