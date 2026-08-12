type PurchaseItemLike = {
  quantity?: number | string | null
  unitPrice?: number | string | null
  lineTotal?: number | string | null
}

type PurchaseLike = {
  totalAmount?: number | string | null
  items?: PurchaseItemLike[] | null
}

const VAT_RATE = 0.13

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const roundMoney = (value: number) => Number(value.toFixed(2))

const approxEqual = (left: number, right: number, tolerance = 0.01) => Math.abs(left - right) <= tolerance

export function calculatePurchaseSubtotal(purchase: PurchaseLike) {
  const items = Array.isArray(purchase.items) ? purchase.items : []
  return roundMoney(
    items.reduce((sum, item) => {
      const explicit = toNumber(item.lineTotal)
      if (explicit > 0) return sum + explicit
      return sum + toNumber(item.quantity) * toNumber(item.unitPrice)
    }, 0),
  )
}

export function calculatePurchaseGrandTotal(purchase: PurchaseLike, vatRate = VAT_RATE) {
  const subtotal = calculatePurchaseSubtotal(purchase)
  const storedTotal = roundMoney(toNumber(purchase.totalAmount))

  if (storedTotal > 0 && !approxEqual(storedTotal, subtotal)) {
    return storedTotal
  }

  return roundMoney(subtotal + subtotal * vatRate)
}

