import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'

const accountSelect = {
  id: true,
  organizationId: true,
  bankName: true,
  accountName: true,
  accountNumber: true,
  branchName: true,
  branchCode: true,
  accountType: true,
  currency: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const

export const listActive = (organizationId: number) => prisma.organizationBankAccount.findMany({
  where: { organizationId, active: true },
  orderBy: [{ bankName: 'asc' }, { branchName: 'asc' }, { accountName: 'asc' }],
  select: accountSelect,
})

export const create = (organizationId: number, data: Omit<Prisma.OrganizationBankAccountUncheckedCreateInput, 'organizationId'>) =>
  prisma.organizationBankAccount.create({ data: { ...data, organizationId }, select: accountSelect })

export const update = (id: string, organizationId: number, data: Prisma.OrganizationBankAccountUncheckedUpdateInput) =>
  prisma.organizationBankAccount.update({ where: { id, organizationId }, data, select: accountSelect })

export const findActive = (id: string, organizationId: number) => prisma.organizationBankAccount.findFirst({
  where: { id, organizationId, active: true },
  select: accountSelect,
})
