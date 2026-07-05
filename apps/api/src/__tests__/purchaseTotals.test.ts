import { calculatePurchaseTotals, calculatePurchaseTotalsWithDiscount } from '../services/inventory/purchaseTotals'

describe('calculatePurchaseTotals', () => {
  it('adds VAT on top of the line subtotal', () => {
    const totals = calculatePurchaseTotals([
      { quantity: 2, unitPrice: 100 },
      { quantity: 1, unitPrice: 50 },
    ])

    expect(totals.subtotal).toBe(250)
    expect(totals.taxAmount).toBe(32.5)
    expect(totals.grandTotal).toBe(282.5)
  })

  it('prefers explicit line totals when present', () => {
    const totals = calculatePurchaseTotals([
      { quantity: 2, unitPrice: 100, lineTotal: 180 },
    ])

    expect(totals.subtotal).toBe(180)
    expect(totals.grandTotal).toBe(203.4)
  })

  it('applies purchase-level discount before VAT', () => {
    const totals = calculatePurchaseTotalsWithDiscount([{ quantity: 2, unitPrice: 100 }], 20)

    expect(totals.subtotal).toBe(200)
    expect(totals.discountAmount).toBe(20)
    expect(totals.taxAmount).toBe(23.4)
    expect(totals.grandTotal).toBe(203.4)
  })
})
