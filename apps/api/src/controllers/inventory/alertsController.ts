import { Request, Response } from 'express'
import { prisma } from '../../prisma'

// Lists low-stock alerts
export const list = async (req: Request, res: Response) => {
  const alerts = await prisma.lowStockAlert.findMany({ where: {} })
  const rawMaterials = await prisma.rawMaterial.findMany({
    where: { id: { in: [...new Set(alerts.map((alert) => alert.rawMaterialId))] } },
  })
  const materialById = new Map(rawMaterials.map((material) => [material.id, material]))
  res.json(
    alerts.map((alert) => ({
      ...alert,
      createdAt: alert.triggeredAt,
      rawMaterial: materialById.get(alert.rawMaterialId) ?? null,
    })),
  )
}

// Marks an alert as acknowledged
export const acknowledge = async (req: Request, res: Response) => {
  const id = req.params.id
  await prisma.lowStockAlert.update({ where: { id }, data: { acknowledged: true, acknowledgedBy: (req as any).user?.id } })
  res.status(204).end()
}

// Returns alert summary counts
export const summary = async (req: Request, res: Response) => {
  const totalUnread = await prisma.lowStockAlert.count({ where: { acknowledged: false } })
  res.json({ totalUnread })
}
