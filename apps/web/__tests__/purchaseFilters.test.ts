import test from 'node:test'
import assert from 'node:assert/strict'
import { filterPurchases, type PurchaseFilterRow } from '../utils/purchaseFilters.ts'

const rows: PurchaseFilterRow[] = [
  {
    id: 'p-old',
    invoiceDate: '2026-04-05T00:00:00.000Z',
    createdAt: '2026-04-06T00:00:00.000Z',
    materialIds: ['mat-a'],
    materialNames: ['Cotton'],
    invoiceNumber: 'PINV-OLD',
    supplierName: 'Old Supplier',
  },
  {
    id: 'p-in-range',
    invoiceDate: '2026-06-10T00:00:00.000Z',
    createdAt: '2026-06-11T00:00:00.000Z',
    materialIds: ['mat-b'],
    materialNames: ['Bamboo'],
    invoiceNumber: 'PINV-NEW',
    supplierName: 'New Supplier',
  },
  {
    id: 'p-fallback-date',
    invoiceDate: null,
    createdAt: '2026-06-12T08:30:00.000Z',
    materialIds: ['mat-b'],
    materialNames: ['Bamboo'],
    invoiceNumber: 'PINV-FALLBACK',
    supplierName: 'Fallback Supplier',
  },
]

test('filterPurchases applies inclusive invoice date range and falls back to created date', () => {
  const filtered = filterPurchases(rows, {
    search: '',
    materialFilter: 'ALL',
    fromDate: '2026-06-10',
    toDate: '2026-06-12',
  })

  assert.deepEqual(filtered.map((row) => row.id), ['p-in-range', 'p-fallback-date'])
})

test('filterPurchases combines search, material, and date filters', () => {
  const filtered = filterPurchases(rows, {
    search: 'fallback',
    materialFilter: 'mat-b',
    fromDate: '2026-06-01',
    toDate: '2026-06-30',
  })

  assert.deepEqual(filtered.map((row) => row.id), ['p-fallback-date'])
})
