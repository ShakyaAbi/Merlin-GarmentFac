import { z } from 'zod'

export const bomItemSchema = z.object({
  rawMaterialId: z.string().trim().min(1, 'Raw material is required'),
  consumption: z.coerce.number().positive('Consumption must be greater than zero'),
  unit: z.string().trim().min(1, 'Unit is required'),
  yield: z.coerce.number().optional(),
})

export const createBomSchema = z.object({
  name: z.string().trim().min(1, 'BOM name is required'),
  garmentStyle: z.string().trim().min(1, 'Garment style is required'),
  items: z.array(bomItemSchema).min(1, 'At least one BOM item is required'),
  createdBy: z.number().optional().nullable(),
})

