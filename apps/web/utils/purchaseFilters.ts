export type PurchaseFilterRow = {
  id: string
  invoiceDate?: string | null
  createdAt?: string | null
  invoiceNumber?: string | null
  supplierName?: string | null
  supplier?: { name?: string | null } | null
  notes?: string | null
  materialIds: string[]
  materialNames: string[]
  status?: string | null
}

export type PurchaseFilters = {
  search: string
  materialFilter: string
  fromDate: string
  toDate: string
}

const parseDay = (value?: string | null, endOfDay = false) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  }
  return date
}

export const getPurchaseFilterDate = (purchase: PurchaseFilterRow) =>
  parseDay(purchase.invoiceDate) || parseDay(purchase.createdAt)

export function filterPurchases<T extends PurchaseFilterRow>(purchases: T[], filters: PurchaseFilters) {
  const query = filters.search.trim().toLowerCase()
  const from = parseDay(filters.fromDate)
  const to = parseDay(filters.toDate, true)

  return purchases.filter((purchase) => {
    const matchesMaterial = filters.materialFilter === 'ALL' ? true : purchase.materialIds.includes(filters.materialFilter)
    const purchaseDate = getPurchaseFilterDate(purchase)
    const matchesFrom = from && purchaseDate ? purchaseDate >= from : true
    const matchesTo = to && purchaseDate ? purchaseDate <= to : true
    const haystack = [
      purchase.invoiceNumber,
      purchase.supplierName,
      purchase.supplier?.name,
      purchase.notes,
      purchase.materialNames.join(' '),
      purchase.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return matchesMaterial && matchesFrom && matchesTo && (query ? haystack.includes(query) : true)
  })
}
