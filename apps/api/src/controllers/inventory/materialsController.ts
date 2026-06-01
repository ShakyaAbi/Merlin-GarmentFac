import { Request, Response } from 'express'
import * as svc from '../../services/inventory/materialService'
import { recordAudit } from '../../utils/auditLog'

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const created = await svc.createMaterial({ ...req.body, createdBy: user })
  try { await recordAudit({ action: 'material.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}

export const list = async (req: Request, res: Response) => {
  const low = req.query.low === '1' || req.query.low === 'true'
  const data = await svc.listMaterials({ lowStock: low })
  res.json(data)
}

export const get = async (req: Request, res: Response) => {
  const data = await svc.getMaterial(req.params.id)
  if (!data) return res.status(404).send('Not found')
  const stock = await svc.currentStock(req.params.id)
  res.json({ ...data, currentStock: stock })
}

export const adjustStock = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  // Expect body: { change, reason, unit, referenceId }
  const { change, reason, unit, referenceId } = req.body
  // create stock transaction via repository directly for now
  const { createStockTransaction } = await import('../../repositories/inventory/stockRepository')
  const tx = await createStockTransaction({ rawMaterialId: req.params.id, change, unit, reason, referenceId, createdBy: user })
  try { await recordAudit({ action: 'material.adjust_stock', userId: user, after: tx }) } catch (e) {}
  res.json(tx)
}
