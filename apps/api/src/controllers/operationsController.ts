import { Request, Response } from 'express'
import { getOperationsSummary } from '../services/operationsSummaryService'

export const summary = async (_req: Request, res: Response) => {
  const data = await getOperationsSummary()
  res.json(data)
}
