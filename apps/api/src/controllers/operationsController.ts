import { Request, Response } from 'express'
import { getOperationsSummary } from '../services/operationsSummaryService'

export const summary = async (req: Request, res: Response) => {
  const data = await getOperationsSummary({
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
  })
  res.json(data)
}
