import { Router } from 'express'
import { Role } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import { validate } from '../middleware/validate'
import { completeProductionOrderSchema, createProductionOrderSchema, issueProductionOrderSchema, updateProductionOrderSchema } from '../validators/productionValidators'
import * as production from '../controllers/inventory/productionController'

const router = Router()

router.get('/', authenticate, production.list)
router.get('/:id', authenticate, production.get)
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), validate({ body: createProductionOrderSchema }), production.create)
router.put('/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: updateProductionOrderSchema }), production.update)
router.delete('/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), production.remove)
router.post('/:id/issue', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), validate({ body: issueProductionOrderSchema }), production.issue)
router.post('/:id/complete', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), validate({ body: completeProductionOrderSchema }), production.complete)

export default router
