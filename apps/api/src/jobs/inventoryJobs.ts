import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const runLowStockChecker = async () => {
  const mats = await prisma.rawMaterial.findMany({ where: { reorderLevel: { not: null } } })
  for (const m of mats) {
    const sum = await prisma.stockTransaction.aggregate({ _sum: { change: true }, where: { rawMaterialId: m.id } })
    const qty = sum._sum.change || 0
    if (m.reorderLevel !== null && qty < Number(m.reorderLevel)) {
      const exists = await prisma.lowStockAlert.findFirst({ where: { rawMaterialId: m.id, acknowledged: false } })
      if (!exists) {
        await prisma.lowStockAlert.create({ data: { rawMaterialId: m.id } })
        // Notification hook can be wired to existing notification service
      }
    }
  }
}
