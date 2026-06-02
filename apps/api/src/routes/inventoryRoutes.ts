import { Router } from 'express'
import * as suppliers from '../controllers/inventory/suppliersController'
import * as materials from '../controllers/inventory/materialsController'
import * as purchases from '../controllers/inventory/purchasesController'
import * as alerts from '../controllers/inventory/alertsController'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import { Role } from '@prisma/client'

const router = Router()

router.post('/suppliers', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), suppliers.create)
router.get('/suppliers', authenticate, suppliers.list)
router.get('/suppliers/:id', authenticate, suppliers.get)
router.put('/suppliers/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), suppliers.update)

router.post('/materials', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), materials.create)
router.get('/materials', authenticate, materials.list)
router.get('/materials/:id', authenticate, materials.get)
router.patch('/materials/:id/adjust-stock', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), materials.adjustStock)
router.get('/materials/:id/transactions', authenticate, materials.transactions)
router.get('/materials/:id/prices', authenticate, materials.prices)
router.get('/materials/:id/boms', authenticate, materials.boms || ((req, res) => res.json([])))
router.get('/materials/:id/purchases', authenticate, materials.purchases)
router.put('/materials/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), materials.update)

router.post('/purchases', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), purchases.create)
router.get('/purchases/:id', authenticate, purchases.get)
router.get('/alerts', authenticate, alerts.list)
router.post('/alerts/:id/ack', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), alerts.acknowledge)
router.get('/alerts/summary', authenticate, alerts.summary)

export default router
