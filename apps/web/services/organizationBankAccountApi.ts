import { request } from './apiClient'

export type OrganizationBankAccount = {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  branchName: string
  branchCode?: string | null
  accountType: string
  currency: string
  active: boolean
}

export type OrganizationBankAccountPayload = Omit<OrganizationBankAccount, 'id' | 'active'> & { active?: boolean }

export const organizationBankAccountApi = {
  list: () => request<OrganizationBankAccount[]>('/organization/bank-accounts'),
  create: (body: OrganizationBankAccountPayload) => request<OrganizationBankAccount>('/organization/bank-accounts', { method: 'POST', body }),
  update: (id: string, body: Partial<OrganizationBankAccountPayload>) => request<OrganizationBankAccount>(`/organization/bank-accounts/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`/organization/bank-accounts/${id}`, { method: 'DELETE' }),
}
