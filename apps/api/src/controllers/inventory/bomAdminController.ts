import { Request, Response } from 'express'
import * as repo from '../../repositories/inventory/bomRepository'

export async function create(req: Request, res: Response){
  // simple admin-only create for BOM with items
  const payload = req.body
  const created = await repo.createBom(payload)
  res.status(201).json(created)
}
