import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const createStockTransaction = async (data: any) => prisma.stockTransaction.create({ data })
export const listStockTransactions = async (rawMaterialId: string, opts: any = {}) => prisma.stockTransaction.findMany({ where: { rawMaterialId }, orderBy: { createdAt: 'desc' }, take: opts.take || 50 })
