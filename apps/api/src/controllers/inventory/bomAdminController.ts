import { Request, Response } from 'express'
import * as repo from '../../repositories/inventory/bomRepository'
import { createBomSchema } from '../../validators/bomValidators'
import { AppError } from '../../utils/errors'

// Creates a BOM from admin input
export async function create(req: Request, res: Response){
  const parsed = createBomSchema.safeParse({
    ...req.body,
    createdBy: (req as any).user?.id ?? null,
  })

  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Invalid BOM payload', { errors: parsed.error.errors })
  }

  const created = await repo.createBom(parsed.data)
  res.status(201).json(created)
}
