import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import * as service from '../services/organizationBankAccountService'
import { createOrganizationBankAccountSchema, updateOrganizationBankAccountSchema } from '../validators/organizationBankAccountValidators'
import { AppError } from '../utils/errors'

const organizationId = (req: Request) => {
  const id = Number((req as any).user?.organizationId)
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_ORGANIZATION', 'Organization is required')
  return id
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listActiveOrganizationBankAccounts(organizationId(req)))
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createOrganizationBankAccountSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid bank account payload', { errors: parsed.error.errors })
  res.status(201).json(await service.createOrganizationBankAccount(organizationId(req), parsed.data))
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateOrganizationBankAccountSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid bank account payload', { errors: parsed.error.errors })
  res.json(await service.updateOrganizationBankAccount(req.params.id, organizationId(req), parsed.data))
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deactivateOrganizationBankAccount(req.params.id, organizationId(req))
  res.status(204).end()
})
