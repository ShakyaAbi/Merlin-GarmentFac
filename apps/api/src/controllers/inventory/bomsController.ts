import { Request, Response } from 'express'
import * as repo from '../../repositories/inventory/bomRepository'

// Lists BOM items for a material
export async function listBomsForMaterial(req: Request, res: Response){
  const { id } = req.params
  const items = await repo.listBomsForMaterial(id)
  // map to friendly shape
  const mapped = items.map((i: any) => ({ id: i.id, bomId: i.bomId, garmentStyle: i.bom?.garmentStyle, consumption: i.consumption, unit: i.unit, yield: i.yield }))
  res.json(mapped)
}

// Lists all BOMs
export async function listBoms(req: Request, res: Response) {
  const items = await repo.listBoms()
  res.json(items)
}

// Creates a new BOM
export async function createBom(req: Request, res: Response){
  const payload = req.body
  const created = await repo.createBom(payload)
  res.status(201).json(created)
}
