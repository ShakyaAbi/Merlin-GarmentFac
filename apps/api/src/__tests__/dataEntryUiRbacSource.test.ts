import fs from 'node:fs'
import path from 'node:path'

const readWeb = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../../web', relativePath), 'utf8')

describe('data-entry UI capability guards', () => {
  it('defines and provides the current-user capability contract', () => {
    const contextSource = readWeb('components/auth/CurrentUserContext.tsx')
    const layoutSource = readWeb('components/Layout.tsx')

    expect(contextSource).toContain('export const CurrentUserProvider')
    expect(contextSource).toContain('export const useCurrentUser')
    expect(contextSource).toContain('canEdit')
    expect(contextSource).toContain('canDelete')
    expect(layoutSource).toContain('CurrentUserProvider')
  })

  it('guards existing-record controls while retaining data-entry production workflow controls', () => {
    const articleSource = readWeb('pages/inventory/FinishedGoodsPage.tsx')
    const materialSource = readWeb('pages/inventory/MaterialsPage.tsx')
    const materialCardSource = readWeb('components/inventory/MaterialCard.tsx')
    const productionSource = readWeb('pages/inventory/ProductionOrdersPage.tsx')
    const invoiceSource = readWeb('pages/sales/SalesInvoiceDetailPage.tsx')

    for (const source of [articleSource, materialSource, productionSource, invoiceSource]) {
      expect(source).toContain('useCurrentUser')
    }
    expect(productionSource).toContain('canIssue')
    expect(productionSource).toContain('canComplete')
    expect(invoiceSource).toContain('canEdit')
    expect(materialCardSource).toContain('MaterialCard({ material, onEdit, onDelete }')
  })
})
