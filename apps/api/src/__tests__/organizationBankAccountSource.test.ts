import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, '../../../..', relativePath), 'utf8')

describe('organization bank-account workflow', () => {
  it('defines admin account management and payment bank-account links', () => {
    const schema = read('apps/api/prisma/schema.prisma')
    const routes = read('apps/api/src/routes/organizationBankAccountRoutes.ts')
    const index = read('apps/api/src/routes/index.ts')
    const settings = read('apps/web/pages/Settings.tsx')
    const customerPayment = read('apps/web/pages/sales/SalesInvoiceDetailPage.tsx')
    const supplierPayment = read('apps/web/pages/inventory/SupplierDetailPage.tsx')

    expect(schema).toContain('model OrganizationBankAccount')
    expect(schema).toContain('bankAccountId')
    expect(routes).toContain("router.post('/', authenticate, requireRoles(Role.ADMIN)")
    expect(routes).toContain("router.patch('/:id', authenticate, requireRoles(Role.ADMIN)")
    expect(index).toContain('organizationBankAccountRoutes')
    expect(settings).toContain('Bank Accounts')
    expect(customerPayment).toContain('bankAccountId')
    expect(supplierPayment).toContain('bankAccountId')
  })
})
