import { Request, Response } from 'express'

// Minimal controller to return BOMs referencing a material.
// For now return an empty array or sample structure. Will be expanded later.
export async function listBomsForMaterial(req: Request, res: Response){
  const { id } = req.params
  // sample response shape: [{ id, name, consumption: 0.5, unit: 'm', garmentStyle: 'T-Shirt' }]
  res.json([])
}
