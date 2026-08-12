import { z } from 'zod'

export const createOrganizationBankAccountSchema = z.object({
  bankName: z.string().trim().min(1, 'Bank name is required'),
  accountName: z.string().trim().min(1, 'Account name is required'),
  accountNumber: z.string().trim().min(1, 'Account number is required'),
  branchName: z.string().trim().min(1, 'Branch name is required'),
  branchCode: z.string().trim().optional(),
  accountType: z.string().trim().min(1).default('CURRENT'),
  currency: z.string().trim().min(1).default('NPR'),
  active: z.boolean().optional(),
})

export const updateOrganizationBankAccountSchema = createOrganizationBankAccountSchema.partial()
