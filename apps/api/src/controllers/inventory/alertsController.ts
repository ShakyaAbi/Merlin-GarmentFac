import { Request, Response } from 'express'
import { prisma } from '../../prisma'

export const list = async (req: Request, res: Response) => {
  const alerts = await prisma.lowStockAlert.findMany({ where: {}, include: { rawMaterial: true } })
  res.json(alerts)
}

export const acknowledge = async (req: Request, res: Response) => {
  const id = req.params.id
  await prisma.lowStockAlert.update({ where: { id }, data: { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: (req as any).user?.id } })
  res.status(204).end()
}
