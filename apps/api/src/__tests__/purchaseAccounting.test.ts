import { calculatePurchaseGrandTotal, calculatePurchaseSubtotal } from '../services/inventory/purchaseAccounting'

describe('purchase accounting helpers', () => {
  it('recomputes VAT-inclusive grand total from purchase items when stored total matches subtotal', () => {
    const subtotal = calculatePurchaseSubtotal({
      items: [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50 },
      ],
    })

    expect(subtotal).toBe(250)

    const grandTotal = calculatePurchaseGrandTotal({
      totalAmount: 250,
      items: [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50 },
      ],
    })

    expect(grandTotal).toBe(282.5)
  })

  it('keeps a stored grand total when it already differs from subtotal', () => {
    const grandTotal = calculatePurchaseGrandTotal({
      totalAmount: 282.5,
      items: [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50 },
      ],
    })

    expect(grandTotal).toBe(282.5)
  })
})
