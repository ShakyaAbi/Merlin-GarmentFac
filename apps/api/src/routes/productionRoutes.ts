import { Router } from 'express'
import { Role } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import { validate } from '../middleware/validate'
import { completeProductionOrderSchema, createProductionOrderSchema, issueProductionOrderSchema } from '../validators/productionValidators'
import * as production from '../controllers/inventory/productionController'

const router = Router()

router.get('/', authenticate, production.list)
router.get('/:id', authenticate, production.get)
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createProductionOrderSchema }), production.create)
router.post('/:id/issue', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: issueProductionOrderSchema }), production.issue)
router.post('/:id/complete', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: completeProductionOrderSchema }), production.complete)

export default router
