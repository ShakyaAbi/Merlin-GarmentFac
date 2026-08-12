import { Request, Response } from 'express'
import { getOperationsSummary } from '../services/operationsSummaryService'

export const summary = async (req: Request, res: Response) => {
  const data = await getOperationsSummary({
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
    period: typeof req.query.period === 'string' ? req.query.period as any : undefined,
    granularity: typeof req.query.granularity === 'string' ? req.query.granularity as any : undefined,
  })
  res.json(data)
}
