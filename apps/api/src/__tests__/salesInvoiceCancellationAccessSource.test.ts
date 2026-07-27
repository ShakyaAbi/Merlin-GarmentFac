import fs from 'node:fs'
import path from 'node:path'

const invoiceRouteSource = fs.readFileSync(path.resolve(__dirname, '../routes/salesInvoiceRoutes.ts'), 'utf8')
const invoicePageSource = fs.readFileSync(path.resolve(__dirname, '../../../web/pages/sales/SalesInvoiceDetailPage.tsx'), 'utf8')

describe('sales invoice cancellation access', () => {
  it('allows only admins to cancel invoices', () => {
    expect(invoiceRouteSource).toContain("router.post('/:id/cancel', authenticate, requireRoles(Role.ADMIN)")
  })

  it('shows permission text for active invoices and already-cancelled text only for cancelled invoices', () => {
    expect(invoicePageSource).toContain("user?.role === 'ADMIN'")
    expect(invoicePageSource).toContain('Cannot cancel this invoice.')
    expect(invoicePageSource).toContain('This invoice has already been cancelled.')
    expect(invoicePageSource).toMatch(/invoiceStatus\s*===\s*['"]CANCELLED['"]/)
  })
})
