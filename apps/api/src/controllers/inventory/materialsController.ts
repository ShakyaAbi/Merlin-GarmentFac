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

export const transactions = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const pageSize = Number(req.query.pageSize) || 20
  const data = await svc.listTransactions(req.params.id, { page, pageSize })
  res.json(data)
}

export const prices = async (req: Request, res: Response) => {
  const data = await svc.listPrices(req.params.id)
  res.json(data)
}

export const purchases = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const pageSize = Number(req.query.pageSize) || 20
  const data = await svc.listPurchasesForMaterial(req.params.id, { page, pageSize })
  res.json(data)
}

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const updated = await svc.updateMaterialWithUser(req.params.id, req.body, user)
  try { await recordAudit({ action: 'material.update', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
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
