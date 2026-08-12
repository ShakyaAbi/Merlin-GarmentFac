import * as repo from '../repositories/organizationBankAccountRepository'
import { AppError } from '../utils/errors'

export const listActiveOrganizationBankAccounts = (organizationId: number) => repo.listActive(organizationId)

export const createOrganizationBankAccount = (organizationId: number, data: any) => repo.create(organizationId, {
  bankName: data.bankName,
  accountName: data.accountName,
  accountNumber: data.accountNumber,
  branchName: data.branchName,
  branchCode: data.branchCode || null,
  accountType: data.accountType || 'CURRENT',
  currency: data.currency || 'NPR',
  active: data.active ?? true,
})

export const updateOrganizationBankAccount = async (id: string, organizationId: number, data: any) => {
  const existing = await repo.findActive(id, organizationId)
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Bank account not found')
  return repo.update(id, organizationId, {
    ...data,
    branchCode: data.branchCode || null,
  })
}

export const deactivateOrganizationBankAccount = (id: string, organizationId: number) =>
  updateOrganizationBankAccount(id, organizationId, { active: false })

export const requireActiveOrganizationBankAccount = async (id: string | undefined | null, organizationId: number) => {
  if (!id) return null
  const account = await repo.findActive(id, organizationId)
  if (!account) throw new AppError(400, 'INVALID_BANK_ACCOUNT', 'Selected bank account is not active for this organization')
  return account
}
