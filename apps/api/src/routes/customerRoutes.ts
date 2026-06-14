import { Router } from 'express'
import { Role } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import { validate } from '../middleware/validate'
import { createCustomerSchema, updateCustomerSchema } from '../validators/customerValidators'
import * as customers from '../controllers/customerController'

const router = Router()

router.get('/', authenticate, customers.list)
router.get('/next-number', authenticate, customers.nextNumber)
router.get('/:id', authenticate, customers.get)
router.get('/:id/ledger', authenticate, customers.ledger)
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createCustomerSchema }), customers.create)
router.put('/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: updateCustomerSchema }), customers.update)
router.delete('/:id', authenticate, requireRoles(Role.ADMIN), customers.remove)

export default router
