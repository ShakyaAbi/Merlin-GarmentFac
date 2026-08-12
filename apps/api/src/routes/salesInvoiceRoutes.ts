import { Router } from 'express'
import { Role } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import { validate } from '../middleware/validate'
import { cancelSalesInvoiceSchema, createSalesInvoiceSchema, salesInvoicePaymentSchema, updateSalesInvoicePaymentSchema, updateSalesInvoiceSchema } from '../validators/salesInvoiceValidators'
import * as salesInvoices from '../controllers/salesInvoiceController'

const router = Router()

router.get('/', authenticate, salesInvoices.list)
router.post('/export', authenticate, salesInvoices.exportList)
router.get('/customers', authenticate, salesInvoices.listCustomers)
router.get('/products', authenticate, salesInvoices.listProducts)
router.get('/next-number', authenticate, salesInvoices.nextNumber)
router.get('/:id/export', authenticate, salesInvoices.exportOne)
router.get('/:id/pdf', authenticate, salesInvoices.exportPdf)
router.get('/:id', authenticate, salesInvoices.get)
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), validate({ body: createSalesInvoiceSchema }), salesInvoices.create)
router.patch('/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: updateSalesInvoiceSchema }), salesInvoices.update)
router.post('/:id/issue', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), salesInvoices.issue)
router.post('/:id/payment', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), validate({ body: salesInvoicePaymentSchema }), salesInvoices.payment)
router.get('/:id/payments', authenticate, salesInvoices.listPayments)
router.patch('/:id/payments/:paymentId', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: updateSalesInvoicePaymentSchema }), salesInvoices.updatePayment)
router.delete('/:id/payments/:paymentId', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), salesInvoices.removePayment)
router.post('/:id/cancel', authenticate, requireRoles(Role.ADMIN), validate({ body: cancelSalesInvoiceSchema }), salesInvoices.cancel)

export default router
