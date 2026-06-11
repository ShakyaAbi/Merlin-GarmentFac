import { Router } from 'express'
import * as suppliers from '../controllers/inventory/suppliersController'
import * as categories from '../controllers/inventory/categoryController'
import * as materials from '../controllers/inventory/materialsController'
import * as materialsCsv from '../controllers/inventory/materialsCsvController'
import * as purchases from '../controllers/inventory/purchasesController'
import * as finishedGoods from '../controllers/inventory/finishedGoodsController'
import * as alerts from '../controllers/inventory/alertsController'
import * as boms from '../controllers/inventory/bomsController'
import * as bomAdmin from '../controllers/inventory/bomAdminController'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import { validate } from '../middleware/validate'
import { uploadCSV } from '../middleware/upload'
import { Role } from '@prisma/client'
import { adjustStockSchema, createCategorySchema, createMaterialSchema, createPurchaseSchema, toggleMaterialStatusSchema, updateMaterialSchema } from '../validators/inventoryValidators'
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplierValidators'
import { createFinishedGoodSchema, updateFinishedGoodSchema } from '../validators/finishedGoodsValidators'
import { createBomSchema } from '../validators/bomValidators'

const router = Router()

router.post('/suppliers', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createSupplierSchema }), suppliers.create)
router.get('/suppliers', authenticate, suppliers.list)
router.get('/suppliers/:id', authenticate, suppliers.get)
router.put('/suppliers/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: updateSupplierSchema }), suppliers.update)
router.delete('/suppliers/:id', authenticate, requireRoles(Role.ADMIN), suppliers.remove)

router.post('/material-categories', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createCategorySchema }), categories.create)
router.get('/material-categories', authenticate, categories.list)

router.post('/materials/export', authenticate, materialsCsv.exportCSV)
router.get('/materials/import-template-sample', authenticate, materialsCsv.templateSample)
router.post('/materials/import', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), uploadCSV, materialsCsv.importCSV)
router.post('/materials', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createMaterialSchema }), materials.create)
router.get('/materials', authenticate, materials.list)
router.get('/materials/:id', authenticate, materials.get)
router.patch('/materials/:id/adjust-stock', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: adjustStockSchema }), materials.adjustStock)
router.get('/materials/:id/transactions', authenticate, materials.transactions)
router.get('/materials/:id/prices', authenticate, materials.prices)
router.get('/materials/:id/boms', authenticate, (req, res) => import('../controllers/inventory/bomsController').then(m => m.listBomsForMaterial(req as any, res as any)).catch(()=>res.json([])))
router.get('/materials/:id/purchases', authenticate, materials.purchases)
router.put('/materials/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: updateMaterialSchema }), materials.update)
router.patch('/materials/:id/status', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: toggleMaterialStatusSchema }), materials.toggleStatus)
router.delete('/materials/:id', authenticate, requireRoles(Role.ADMIN), materials.remove)

router.post('/finished-goods', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createFinishedGoodSchema }), finishedGoods.create)
router.get('/finished-goods', authenticate, finishedGoods.list)
router.get('/finished-goods/:id', authenticate, finishedGoods.get)
router.put('/finished-goods/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: updateFinishedGoodSchema }), finishedGoods.update)
router.get('/finished-goods/:id/transactions', authenticate, finishedGoods.transactions)

router.post('/purchases', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createPurchaseSchema }), purchases.create)
router.get('/purchases/:id', authenticate, purchases.get)
router.get('/boms', authenticate, boms.listBoms)
router.get('/materials/:id/boms', authenticate, boms.listBomsForMaterial)
router.post('/boms', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createBomSchema }), bomAdmin.create)
router.get('/alerts', authenticate, alerts.list)
router.post('/alerts/:id/ack', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), alerts.acknowledge)
router.get('/alerts/summary', authenticate, alerts.summary)

export default router
