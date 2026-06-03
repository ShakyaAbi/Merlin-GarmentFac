import { Request, Response } from 'express'
import * as svc from '../../services/inventory/materialService'
import { recordAudit } from '../../utils/auditLog'

// Creates a raw material
export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const created = await svc.createMaterial({ ...req.body, createdBy: user })
  try { await recordAudit({ action: 'material.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}

// Lists materials with filtering and pagination
export const list = async (req: Request, res: Response) => {
  const { low, search, categoryId, active, page, pageSize } = req.query
  const data = await svc.listMaterials({
    lowStock: low === '1' || low === 'true',
    search: search as string | undefined,
    categoryId: categoryId as string | undefined,
    active: active !== undefined ? active === 'true' : undefined,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  })
  res.json(data)
}

// Returns one material with stock
export const get = async (req: Request, res: Response) => {
  const data = await svc.getMaterial(req.params.id)
  if (!data) return res.status(404).send('Not found')
  const stock = await svc.currentStock(req.params.id)
  res.json({ ...data, currentStock: stock })
}

// Lists stock transactions for a material
export const transactions = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const pageSize = Number(req.query.pageSize) || 20
  const data = await svc.listTransactions(req.params.id, { page, pageSize })
  res.json(data)
}

// Lists price history for a material
export const prices = async (req: Request, res: Response) => {
  const data = await svc.listPrices(req.params.id)
  res.json(data)
}

// Lists purchases for a material
export const purchases = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const pageSize = Number(req.query.pageSize) || 20
  const data = await svc.listPurchasesForMaterial(req.params.id, { page, pageSize })
  res.json(data)
}

// Updates a material
export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const updated = await svc.updateMaterialWithUser(req.params.id, req.body, user)
  try { await recordAudit({ action: 'material.update', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
}

// Toggles material active status
export const toggleStatus = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const { active } = req.body
  const updated = await svc.toggleMaterialStatus(req.params.id, active, user)
  try { await recordAudit({ action: 'material.toggle_status', userId: user, after: { id: req.params.id, active } }) } catch (e) {}
  res.json(updated)
}

// Soft deletes a material
export const remove = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  await svc.deleteMaterial(req.params.id)
  try { await recordAudit({ action: 'material.delete', userId: user, after: { id: req.params.id } }) } catch (e) {}
  res.status(204).end()
}

// Adjusts stock for a material
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
