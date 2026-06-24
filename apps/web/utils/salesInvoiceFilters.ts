export type SalesInvoiceFilterRow = {
  id: string
  invoiceDate?: string | null
  createdAt?: string | null
  invoiceNumber?: string | null
  customerName?: string | null
  customer?: { customerName?: string | null } | null
  remarks?: string | null
  invoiceStatus?: string | null
  paymentStatus?: string | null
  items?: Array<{ productCode?: string | null; productName?: string | null }>
}

export type SalesInvoiceFilters = {
  search: string
  statusFilter: string
  paymentFilter: string
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

export const getSalesInvoiceFilterDate = (invoice: SalesInvoiceFilterRow) =>
  parseDay(invoice.invoiceDate) || parseDay(invoice.createdAt)

export function filterSalesInvoices<T extends SalesInvoiceFilterRow>(invoices: T[], filters: SalesInvoiceFilters) {
  const query = filters.search.trim().toLowerCase()
  const from = parseDay(filters.fromDate)
  const to = parseDay(filters.toDate, true)

  return invoices.filter((invoice) => {
    const customerName = invoice.customer?.customerName || invoice.customerName || ''
    const invoiceDate = getSalesInvoiceFilterDate(invoice)
    const matchesStatus = filters.statusFilter === 'ALL' ? true : invoice.invoiceStatus === filters.statusFilter
    const matchesPayment = filters.paymentFilter === 'ALL' ? true : invoice.paymentStatus === filters.paymentFilter
    const matchesFrom = from && invoiceDate ? invoiceDate >= from : true
    const matchesTo = to && invoiceDate ? invoiceDate <= to : true
    const haystack = [
      invoice.invoiceNumber,
      customerName,
      invoice.remarks,
      invoice.items?.map((item) => `${item.productCode || ''} ${item.productName || ''}`).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return matchesStatus && matchesPayment && matchesFrom && matchesTo && (query ? haystack.includes(query) : true)
  })
}
