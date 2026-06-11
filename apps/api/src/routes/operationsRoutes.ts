import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { summary } from '../controllers/operationsController'

const router = Router()

router.get('/summary', authenticate, summary)

export default router
