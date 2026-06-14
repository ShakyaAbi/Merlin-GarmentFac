export type InvoiceTotalLine = {
  id: string
  quantity?: number | string | null
  rate?: number | string | null
  amount?: number | string | null
  discountAmount?: number | string | null
}

export type InvoiceTotalsInput = {
  lines: InvoiceTotalLine[]
  discountAmount?: number | string | null
  vatRate?: number | null
}

export type InvoiceTotals = {
  subtotal: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  grandTotal: number
  vatRate: number
}

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const clampMoney = (value: number) => (value > 0 ? value : 0)

const lineSubtotal = (line: InvoiceTotalLine) => {
  const quantity = clampMoney(toNumber(line.quantity))
  const rate = clampMoney(toNumber(line.rate))
  const amount = clampMoney(toNumber(line.amount))
  const derived = quantity * rate
  return amount > 0 ? amount : derived
}

export function calculateInvoiceTotals({ lines, discountAmount = 0, vatRate = 0.13 }: InvoiceTotalsInput): InvoiceTotals {
  const subtotal = lines.reduce((sum, line) => sum + lineSubtotal(line), 0)
  const lineDiscountAmount = lines.reduce((sum, line) => sum + clampMoney(toNumber(line.discountAmount)), 0)
  const totalDiscountAmount = clampMoney(toNumber(discountAmount)) + lineDiscountAmount
  const taxableAmount = clampMoney(subtotal - totalDiscountAmount)
  const taxAmount = taxableAmount * vatRate
  const grandTotal = taxableAmount + taxAmount

  return {
    subtotal,
    discountAmount: totalDiscountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    vatRate,
  }
}
