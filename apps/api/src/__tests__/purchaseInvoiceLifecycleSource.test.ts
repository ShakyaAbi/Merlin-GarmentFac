import fs from 'node:fs'
import path from 'node:path'

const routeSource = fs.readFileSync(path.resolve(__dirname, '../routes/inventoryRoutes.ts'), 'utf8')
const repositorySource = fs.readFileSync(path.resolve(__dirname, '../repositories/inventory/purchaseRepository.ts'), 'utf8')
const pageSource = fs.readFileSync(path.resolve(__dirname, '../../../web/pages/inventory/PurchaseDetailPage.tsx'), 'utf8')

describe('purchase invoice lifecycle', () => {
  it('exposes invoice payment mutations and admin-only cancellation', () => {
    expect(routeSource).toContain("router.post('/purchases/:id/payment'")
    expect(routeSource).toContain("router.patch('/purchases/:id/payments/:paymentId'")
    expect(routeSource).toContain("router.delete('/purchases/:id/payments/:paymentId'")
    expect(routeSource).not.toContain("router.delete('/purchases/:id/payments/:paymentId', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY)")
    expect(routeSource).toContain("router.post('/purchases/:id/cancel', authenticate, requireRoles(Role.ADMIN)")
  })

  it('keeps purchase payment totals and cancellation stock reversal in the repository', () => {
    expect(repositorySource).toContain('paymentStatus')
    expect(repositorySource).toContain('removeSupplierLedgerEntry')
    expect(repositorySource).toContain("reason: 'purchase.cancel'")
  })

  it('renders payment status, payment history, and cancellation state', () => {
    expect(pageSource).toContain('paymentStatus')
    expect(pageSource).toContain('Payment History')
    expect(pageSource).toContain('This purchase has already been cancelled.')
  })
})
