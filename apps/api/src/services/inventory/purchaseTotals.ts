type PurchaseLine = {
  quantity?: number | string | null
  unitPrice?: number | string | null
  lineTotal?: number | string | null
}

const VAT_RATE = 0.13

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const roundMoney = (value: number) => Number(value.toFixed(2))

const lineSubtotal = (line: PurchaseLine) => {
  const explicit = toNumber(line.lineTotal)
  if (explicit > 0) return explicit
  return toNumber(line.quantity) * toNumber(line.unitPrice)
}

export function calculatePurchaseTotals(lines: PurchaseLine[], vatRate = VAT_RATE) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + lineSubtotal(line), 0))
  return calculatePurchaseTotalsWithDiscount(lines, 0, vatRate)
}

export function calculatePurchaseTotalsWithDiscount(lines: PurchaseLine[], discountAmount = 0, vatRate = VAT_RATE) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + lineSubtotal(line), 0))
  const safeDiscount = roundMoney(Math.max(0, Number(discountAmount ?? 0)))
  const taxableAmount = roundMoney(Math.max(subtotal - safeDiscount, 0))
  const taxAmount = roundMoney(taxableAmount * vatRate)
  const grandTotal = roundMoney(taxableAmount + taxAmount)

  return {
    subtotal,
    discountAmount: safeDiscount,
    taxableAmount,
    taxAmount,
    grandTotal,
    vatRate,
  }
}
