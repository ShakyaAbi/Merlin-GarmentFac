import fs from 'node:fs'
import path from 'node:path'

const pageSource = fs.readFileSync(path.resolve(__dirname, '../../../web/pages/finance/PaymentsPage.tsx'), 'utf8')

describe('payments register', () => {
  it('loads and labels both sales receipts and purchase payments', () => {
    expect(pageSource).toContain("api.get<any[]>('/inventory/purchases?limit=500')")
    expect(pageSource).toContain("source: 'PURCHASE'")
    expect(pageSource).toContain('All payment directions')
    expect(pageSource).toContain('Purchase paid')
  })

  it('keeps payment editing and deletion manager/admin-only in the register', () => {
    expect(pageSource).toContain('const canManagePayments = normalizedRole === \'ADMIN\' || normalizedRole === \'MANAGER\'')
    expect(pageSource).toContain('{canManagePayments ? <Button')
  })
})
