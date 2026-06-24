import { z } from 'zod'

export const createProductionOrderSchema = z.object({
  finishedGoodId: z.string().trim().min(1, 'Finished good is required'),
  quantityPlanned: z.coerce.number().positive('Planned quantity must be greater than zero'),
  notes: z.string().trim().optional(),
})

export const updateProductionOrderSchema = createProductionOrderSchema

export const issueProductionOrderSchema = z.object({
  issueReason: z.string().trim().optional(),
})

export const completeProductionOrderSchema = z.object({
  quantityProduced: z.coerce.number().positive('Produced quantity must be greater than zero'),
  completionNote: z.string().trim().optional(),
})
