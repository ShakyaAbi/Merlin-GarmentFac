import test from 'node:test'
import assert from 'node:assert/strict'
import { filterSalesInvoices, type SalesInvoiceFilterRow } from '../utils/salesInvoiceFilters.ts'

const rows: SalesInvoiceFilterRow[] = [
  {
    id: 'inv-old',
    invoiceDate: '2026-04-05T00:00:00.000Z',
    createdAt: '2026-04-06T00:00:00.000Z',
    invoiceNumber: 'INV-OLD',
    customerName: 'Old Customer',
    invoiceStatus: 'ISSUED',
    paymentStatus: 'PAID',
    remarks: 'April invoice',
  },
  {
    id: 'inv-in-range',
    invoiceDate: '2026-06-10T00:00:00.000Z',
    createdAt: '2026-06-11T00:00:00.000Z',
    invoiceNumber: 'INV-NEW',
    customerName: 'New Customer',
    invoiceStatus: 'DRAFT',
    paymentStatus: 'UNPAID',
    remarks: 'June invoice',
  },
  {
    id: 'inv-fallback-date',
    invoiceDate: null,
    createdAt: '2026-06-12T08:30:00.000Z',
    invoiceNumber: 'INV-FALLBACK',
    customer: { customerName: 'Fallback Customer' },
    invoiceStatus: 'ISSUED',
    paymentStatus: 'PARTIAL',
    remarks: 'Created date fallback',
  },
]

test('filterSalesInvoices applies inclusive invoice date range and falls back to created date', () => {
  const filtered = filterSalesInvoices(rows, {
    search: '',
    statusFilter: 'ALL',
    paymentFilter: 'ALL',
    fromDate: '2026-06-10',
    toDate: '2026-06-12',
  })

  assert.deepEqual(filtered.map((row) => row.id), ['inv-in-range', 'inv-fallback-date'])
})

test('filterSalesInvoices combines search, status, payment, and date filters', () => {
  const filtered = filterSalesInvoices(rows, {
    search: 'fallback',
    statusFilter: 'ISSUED',
    paymentFilter: 'PARTIAL',
    fromDate: '2026-06-01',
    toDate: '2026-06-30',
  })

  assert.deepEqual(filtered.map((row) => row.id), ['inv-fallback-date'])
})
