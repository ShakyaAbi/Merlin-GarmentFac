import { Router } from 'express'
import { Role } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import { validate } from '../middleware/validate'
import { createExpenseSchema, updateExpenseSchema } from '../validators/expenseValidators'
import * as expense from '../controllers/expenseController'

const router = Router()

router.get('/', authenticate, expense.list)
router.get('/:id', authenticate, expense.get)
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY), validate({ body: createExpenseSchema }), expense.create)
router.patch('/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: updateExpenseSchema }), expense.update)
router.delete('/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), expense.remove)

export default router
