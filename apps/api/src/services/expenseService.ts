import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { AppError } from '../utils/errors'

function toDate(value?: string | Date | null) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

async function loadExpense(id: string) {
  return prisma.expense.findUnique({ where: { id } })
}

export async function listExpenses(opts: { search?: string; status?: string; category?: string } = {}) {
  const where: any = {}
  if (opts.status) where.status = opts.status
  if (opts.category) where.category = { contains: opts.category, mode: 'insensitive' }
  if (opts.search) {
    where.OR = [
      { expenseNumber: { contains: opts.search, mode: 'insensitive' } },
      { category: { contains: opts.search, mode: 'insensitive' } },
      { vendor: { contains: opts.search, mode: 'insensitive' } },
      { description: { contains: opts.search, mode: 'insensitive' } },
    ]
  }
  return prisma.expense.findMany({ where, orderBy: { expenseDate: 'desc' } })
}

export async function getExpense(id: string) {
  return loadExpense(id)
}

export async function createExpense(payload: any, userId?: number) {
  if (!payload.category || !payload.description) {
    throw new AppError(400, 'INVALID_INPUT', 'Expense category and description are required')
  }
  const created = await prisma.expense.create({
    data: {
      expenseDate: toDate(payload.expenseDate) || new Date(),
      category: payload.category,
      vendor: payload.vendor || null,
      description: payload.description,
      amount: new Prisma.Decimal(payload.amount || 0),
      currency: payload.currency || 'NPR',
      status: payload.status || 'APPROVED',
      paymentDate: toDate(payload.paymentDate) || null,
      notes: payload.notes || null,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    },
  })
  return created
}

export async function updateExpense(id: string, payload: any, userId?: number) {
  const existing = await loadExpense(id)
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Expense not found')
  return prisma.expense.update({
    where: { id },
    data: {
      expenseDate: toDate(payload.expenseDate) || existing.expenseDate,
      category: payload.category ?? existing.category,
      vendor: payload.vendor ?? existing.vendor,
      description: payload.description ?? existing.description,
      amount: payload.amount !== undefined ? new Prisma.Decimal(payload.amount) : existing.amount,
      currency: payload.currency ?? existing.currency,
      status: payload.status ?? existing.status,
      paymentDate: payload.paymentDate !== undefined ? toDate(payload.paymentDate) : existing.paymentDate,
      notes: payload.notes ?? existing.notes,
      updatedBy: userId ?? null,
    },
  })
}

export async function deleteExpense(id: string, userId?: number) {
  const existing = await loadExpense(id)
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Expense not found')
  return prisma.expense.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy: userId ?? null, status: 'VOID' },
  })
}
