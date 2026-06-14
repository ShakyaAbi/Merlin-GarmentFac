const customerLedgerFindFirst = jest.fn()
const supplierLedgerFindFirst = jest.fn()
const customerFindUnique = jest.fn()
const supplierFindUnique = jest.fn()
const customerLedgerCreate = jest.fn()
const supplierLedgerCreate = jest.fn()

jest.mock('../../src/prisma', () => ({
  prisma: {
    customerLedgerEntry: { findFirst: (...args: unknown[]) => customerLedgerFindFirst(...args), create: (...args: unknown[]) => customerLedgerCreate(...args) },
    supplierLedgerEntry: { findFirst: (...args: unknown[]) => supplierLedgerFindFirst(...args), create: (...args: unknown[]) => supplierLedgerCreate(...args) },
    customer: { findUnique: (...args: unknown[]) => customerFindUnique(...args) },
    supplier: { findUnique: (...args: unknown[]) => supplierFindUnique(...args) },
  },
}))

import { appendCustomerLedgerEntry, appendSupplierLedgerEntry } from '../../src/services/ledgerService'

describe('ledgerService', () => {
  beforeEach(() => {
    customerLedgerFindFirst.mockReset()
    supplierLedgerFindFirst.mockReset()
    customerFindUnique.mockReset()
    supplierFindUnique.mockReset()
    customerLedgerCreate.mockReset()
    supplierLedgerCreate.mockReset()
  })

  test('appendCustomerLedgerEntry uses opening balance when no prior ledger row exists', async () => {
    customerLedgerFindFirst.mockResolvedValue(null)
    customerFindUnique.mockResolvedValue({ id: 'customer-1', openingBalance: 100 })
    customerLedgerCreate.mockImplementation(async ({ data }: any) => data)

    const entry = await appendCustomerLedgerEntry({
      customerId: 'customer-1',
      entryType: 'SALES_INVOICE',
      debit: 250,
      credit: 0,
      documentNumber: 'INV-2081-00001',
    })

    expect(customerLedgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-1',
        runningBalance: expect.anything(),
      }),
    })
    expect(String(entry.runningBalance)).toBe('350')
  })

  test('appendSupplierLedgerEntry adds credit invoices and subtracts debit payments from the running balance', async () => {
    supplierLedgerFindFirst.mockResolvedValue({ runningBalance: 600 })
    supplierLedgerCreate.mockImplementation(async ({ data }: any) => data)

    const entry = await appendSupplierLedgerEntry({
      supplierId: 'supplier-1',
      entryType: 'PAYMENT_MADE',
      debit: 150,
      credit: 0,
      documentNumber: 'PAY-2081-00001',
    })

    expect(supplierLedgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supplierId: 'supplier-1',
        runningBalance: expect.anything(),
      }),
    })
    expect(String(entry.runningBalance)).toBe('450')
  })
})
