import fs from 'node:fs'
import path from 'node:path'

const readRoute = (name: string) => fs.readFileSync(path.resolve(__dirname, `../routes/${name}`), 'utf8')

const inventorySource = readRoute('inventoryRoutes.ts')
const invoiceSource = readRoute('salesInvoiceRoutes.ts')
const productionSource = readRoute('productionRoutes.ts')
const salesOrderSource = readRoute('salesOrderRoutes.ts')
const expenseSource = readRoute('expenseRoutes.ts')
const routeLine = (source: string, method: string, route: string) =>
  source.split(/\r?\n/).find((line) => line.includes(`router.${method}('${route}'`)) || ''

describe('data-entry RBAC route policy', () => {
  it('allows data entry to create articles, materials, and production batches', () => {
    expect(routeLine(inventorySource, 'post', '/materials')).toContain('Role.DATA_ENTRY')
    expect(routeLine(inventorySource, 'post', '/finished-goods')).toContain('Role.DATA_ENTRY')
    expect(productionSource).toContain("router.post('/', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY)")
  })

  it('allows data entry to issue and complete production batches', () => {
    expect(routeLine(productionSource, 'post', '/:id/issue')).toContain('Role.DATA_ENTRY')
    expect(routeLine(productionSource, 'post', '/:id/complete')).toContain('Role.DATA_ENTRY')
  })

  it('allows invoice creation, issuing, and payment recording', () => {
    const invoiceDetailSource = fs.readFileSync(path.resolve(__dirname, '../../../web/pages/sales/SalesInvoiceDetailPage.tsx'), 'utf8')
    expect(invoiceSource).toContain("router.post('/', authenticate, requireRoles(Role.ADMIN, Role.MANAGER, Role.DATA_ENTRY)")
    expect(routeLine(invoiceSource, 'post', '/:id/issue')).toContain('Role.DATA_ENTRY')
    expect(routeLine(invoiceSource, 'post', '/:id/payment')).toContain('Role.DATA_ENTRY')
    expect(routeLine(invoiceSource, 'delete', '/:id/payments/:paymentId')).not.toContain('Role.DATA_ENTRY')
    expect(invoiceDetailSource).toContain('canRecordPayment && canEdit')
  })

  it('allows direct data-entry issuing while keeping draft saving available', () => {
    const createSource = fs.readFileSync(path.resolve(__dirname, '../../../web/pages/sales/SalesInvoiceCreatePage.tsx'), 'utf8')
    const detailSource = fs.readFileSync(path.resolve(__dirname, '../../../web/pages/sales/SalesInvoiceDetailPage.tsx'), 'utf8')
    const serviceSource = fs.readFileSync(path.resolve(__dirname, '../services/salesInvoiceService.ts'), 'utf8')

    expect(routeLine(invoiceSource, 'post', '/:id/issue')).toContain('Role.DATA_ENTRY')
    expect(createSource).not.toContain("saveInvoice(['submit'])")
    expect(createSource).toContain("saveInvoice(['issue'])")
    expect(detailSource).not.toContain('Submit')
    expect(serviceSource).toContain("invoice.invoiceStatus !== 'DRAFT' && invoice.invoiceStatus !== 'PENDING_APPROVAL'")
  })

  it('keeps data entry off existing-record edit and delete routes', () => {
    expect(routeLine(inventorySource, 'put', '/materials/:id')).not.toContain('Role.DATA_ENTRY')
    expect(routeLine(inventorySource, 'put', '/finished-goods/:id')).not.toContain('Role.DATA_ENTRY')
    expect(routeLine(productionSource, 'put', '/:id')).not.toContain('Role.DATA_ENTRY')
    expect(routeLine(productionSource, 'delete', '/:id')).not.toContain('Role.DATA_ENTRY')
    expect(routeLine(invoiceSource, 'patch', '/:id')).not.toContain('Role.DATA_ENTRY')
    expect(routeLine(invoiceSource, 'patch', '/:id/payments/:paymentId')).not.toContain('Role.DATA_ENTRY')
    expect(routeLine(invoiceSource, 'post', '/:id/cancel')).not.toContain('Role.DATA_ENTRY')
    expect(routeLine(salesOrderSource, 'patch', '/:id')).not.toContain('Role.DATA_ENTRY')
    expect(routeLine(expenseSource, 'patch', '/:id')).not.toContain('Role.DATA_ENTRY')
  })
})
