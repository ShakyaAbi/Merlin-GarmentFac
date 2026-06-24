import { Router } from 'express'
import { Role } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import { validate } from '../middleware/validate'
import { createSalesOrderSchema, updateSalesOrderSchema } from '../validators/salesOrderValidators'
import * as salesOrders from '../controllers/salesOrderController'

const router = Router()

router.get('/', authenticate, salesOrders.list)
router.get('/products', authenticate, salesOrders.listProducts)
router.get('/:id', authenticate, salesOrders.get)
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), validate({ body: createSalesOrderSchema }), salesOrders.create)
router.patch('/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), validate({ body: updateSalesOrderSchema }), salesOrders.update)
router.post('/:id/confirm', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), salesOrders.confirm)
router.post('/:id/fulfill', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), salesOrders.fulfill)
router.post('/:id/cancel', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), salesOrders.cancel)
router.post('/:id/invoice', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), salesOrders.invoice)

export default router
