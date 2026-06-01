import { Request, Response } from 'express'
import * as svc from '../../services/inventory/supplierService'
import { recordAudit } from '../../utils/auditLog'

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const created = await svc.createSupplier({ ...req.body, createdBy: user })
  try { await recordAudit({ action: 'supplier.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}

export const list = async (req: Request, res: Response) => {
  const data = await svc.listSuppliers({ skip: Number(req.query.skip) || 0, take: Number(req.query.take) || 50, search: req.query.search as string })
  res.json(data)
}

export const get = async (req: Request, res: Response) => {
  const data = await svc.getSupplier(req.params.id)
  if (!data) return res.status(404).send('Not found')
  res.json(data)
}

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const updated = await svc.updateSupplier(req.params.id, req.body)
  try { await recordAudit({ action: 'supplier.update', userId: user, after: updated }) } catch (e) {}
  res.json(updated)
}
