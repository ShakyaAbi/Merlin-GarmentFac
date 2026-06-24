import type { InvoicePaperDocumentProps, InvoicePaperLine } from './InvoicePaperDocument'
import { formatNepaliDateTime } from '../../utils/nepaliDate'

type InvoiceParty = {
  label: string
  name: string
  address?: string
  panVatNumber?: string
  phone?: string
  email?: string
}

type InvoicePaperSource = {
  id: string
  invoiceNumber?: string | null
  invoiceDate?: string | null
  createdAt?: string | null
  notes?: string | null
  currency?: string | null
  discountAmount?: number | string | null
  items?: Array<{
    id: string
    code?: string | null
    description: string
    quantity?: number | string | null
    rate?: number | string | null
    amount?: number | string | null
    unit?: string | null
  }>
}

const toLine = (line: NonNullable<InvoicePaperSource['items']>[number]): InvoicePaperLine => ({
  id: line.id,
  code: line.code || '',
  description: line.description,
  quantity: Number(line.quantity ?? 0),
  rate: Number(line.rate ?? 0),
  amount: Number(line.amount ?? Number(line.quantity ?? 0) * Number(line.rate ?? 0)),
  unit: line.unit || undefined,
})

const buildMeta = (entries: Array<{ label: string; value: string }>) => entries.filter((row) => row.value)

export function buildSalesInvoicePaperDocumentProps(invoice: any, customerName: string): InvoicePaperDocumentProps | null {
  if (!invoice) return null

  return {
    companyName: 'Merlin Lite',
    companyAddress: 'Nepal',
    invoiceTitle: 'Sales Invoice',
    invoiceNumber: invoice.invoiceNumber || invoice.id,
    invoiceDate: invoice.invoiceDate || invoice.createdAt || undefined,
    party: {
      label: 'Buyer',
      name: customerName,
      address: invoice.customer?.address || '',
      panVatNumber: (invoice.customer as any)?.panVatNumber || '',
      phone: invoice.customer?.phone || '',
      email: invoice.customer?.email || '',
    },
    meta: buildMeta([
      { label: 'Invoice Date', value: formatNepaliDateTime(invoice.invoiceDate || invoice.createdAt) },
      { label: 'Due Date', value: formatNepaliDateTime(invoice.dueDate) },
      { label: 'Fiscal Year', value: invoice.fiscalYear || '-' },
      { label: 'Payment Status', value: invoice.paymentStatus || 'UNKNOWN' },
    ]),
    items: (invoice.items || []).map((item: any) =>
      toLine({
        id: item.id,
        code: item.productCode || item.productId || '',
        description: item.productName || 'Untitled item',
        quantity: Number(item.quantity ?? 0),
        rate: Number(item.unitPrice ?? 0),
        amount: Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0),
        unit: item.unit || item.productUnit || undefined,
      }),
    ),
    discountAmount: (invoice.items || []).reduce((sum: number, item: any) => sum + Number(item.discountAmount ?? 0), 0),
    notes: invoice.remarks || invoice.notes || invoice.memo || undefined,
  }
}

export function buildPurchaseInvoicePaperDocumentProps(purchase: any): InvoicePaperDocumentProps | null {
  if (!purchase) return null

  return {
    companyName: 'Merlin Lite',
    companyAddress: 'Nepal',
    invoiceTitle: 'Purchase Invoice',
    invoiceNumber: purchase.invoiceNumber || purchase.id || '-',
    invoiceDate: purchase.invoiceDate || purchase.createdAt || undefined,
    party: {
      label: 'Supplier',
      name: purchase.supplier?.name || purchase.supplierName || '-',
      address: purchase.supplier?.address || '',
      panVatNumber: purchase.supplier?.panVatNumber || '',
      phone: purchase.supplier?.phone || '',
      email: purchase.supplier?.email || '',
    },
    meta: buildMeta([
      { label: 'Invoice Date', value: formatNepaliDateTime(purchase.invoiceDate) },
      { label: 'Status', value: purchase.status || '-' },
      { label: 'Currency', value: purchase.currency || 'NPR' },
    ]),
    items: (purchase.items || []).map((item: any) =>
      toLine({
        id: item.id,
        code: item.rawMaterial?.sku || item.rawMaterialId || '',
        description: item.rawMaterial?.name || item.rawMaterialId || 'Untitled item',
        quantity: Number(item.quantity ?? 0),
        rate: Number(item.unitPrice ?? 0),
        amount: Number(item.lineTotal ?? Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)),
        unit: item.unit || item.rawMaterial?.defaultUnit || undefined,
      }),
    ),
    discountAmount: Number(purchase.discountAmount ?? 0),
    notes: purchase.notes || undefined,
  }
}
