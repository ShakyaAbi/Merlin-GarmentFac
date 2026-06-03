import { Router } from 'express'
import * as suppliers from '../controllers/inventory/suppliersController'
import * as categories from '../controllers/inventory/categoryController'
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

router.post('/material-categories', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), categories.create)
router.get('/material-categories', authenticate, categories.list)

router.post('/materials', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), materials.create)
router.get('/materials', authenticate, materials.list)
router.get('/materials/:id', authenticate, materials.get)
router.patch('/materials/:id/adjust-stock', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), materials.adjustStock)
router.get('/materials/:id/transactions', authenticate, materials.transactions)
router.get('/materials/:id/prices', authenticate, materials.prices)
router.get('/materials/:id/boms', authenticate, (req, res) => import('../controllers/inventory/bomsController').then(m => m.listBomsForMaterial(req as any, res as any)).catch(()=>res.json([])))
router.get('/materials/:id/purchases', authenticate, materials.purchases)
router.put('/materials/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), materials.update)
router.patch('/materials/:id/status', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), materials.toggleStatus)
router.delete('/materials/:id', authenticate, requireRoles(Role.ADMIN), materials.remove)

router.post('/purchases', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), purchases.create)
router.get('/purchases/:id', authenticate, purchases.get)
router.post('/boms', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), (req, res) => import('../controllers/inventory/bomAdminController').then(m => m.create(req as any, res as any)).catch(err=>{ res.status(500).json({ error: 'failed' }) }))
router.get('/alerts', authenticate, alerts.list)
router.post('/alerts/:id/ack', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), alerts.acknowledge)
router.get('/alerts/summary', authenticate, alerts.summary)

export default router
