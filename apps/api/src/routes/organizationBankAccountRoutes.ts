import { Router } from 'express'
import { Role } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { requireRoles } from '../middleware/rbac'
import * as controller from '../controllers/organizationBankAccountController'

const router = Router()

router.get('/', authenticate, controller.list)
router.post('/', authenticate, requireRoles(Role.ADMIN), controller.create)
router.patch('/:id', authenticate, requireRoles(Role.ADMIN), controller.update)
router.delete('/:id', authenticate, requireRoles(Role.ADMIN), controller.remove)

export default router
