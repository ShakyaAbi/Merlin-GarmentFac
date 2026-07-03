const customerLedgerFindFirst = jest.fn()
const customerLedgerFindMany = jest.fn()
const supplierLedgerFindFirst = jest.fn()
const supplierLedgerFindMany = jest.fn()
const customerFindUnique = jest.fn()
const supplierFindUnique = jest.fn()
const customerLedgerCreate = jest.fn()
const supplierLedgerCreate = jest.fn()
const customerLedgerUpdate = jest.fn()
const customerLedgerDelete = jest.fn()
const supplierLedgerUpdate = jest.fn()
const supplierLedgerDelete = jest.fn()

jest.mock('../../src/prisma', () => ({
  prisma: {
    customerLedgerEntry: {
      findFirst: (...args: unknown[]) => customerLedgerFindFirst(...args),
      findMany: (...args: unknown[]) => customerLedgerFindMany(...args),
      create: (...args: unknown[]) => customerLedgerCreate(...args),
      update: (...args: unknown[]) => customerLedgerUpdate(...args),
      delete: (...args: unknown[]) => customerLedgerDelete(...args),
    },
    supplierLedgerEntry: {
      findFirst: (...args: unknown[]) => supplierLedgerFindFirst(...args),
      findMany: (...args: unknown[]) => supplierLedgerFindMany(...args),
      create: (...args: unknown[]) => supplierLedgerCreate(...args),
      update: (...args: unknown[]) => supplierLedgerUpdate(...args),
      delete: (...args: unknown[]) => supplierLedgerDelete(...args),
    },
    customer: { findUnique: (...args: unknown[]) => customerFindUnique(...args) },
    supplier: { findUnique: (...args: unknown[]) => supplierFindUnique(...args) },
  },
}))

import {
  appendCustomerLedgerEntry,
  appendSupplierLedgerEntry,
  removeCustomerLedgerEntry,
  removeSupplierLedgerEntry,
  replaceCustomerLedgerEntry,
  replaceSupplierLedgerEntry,
} from '../../src/services/ledgerService'

describe('ledgerService', () => {
  beforeEach(() => {
    customerLedgerFindFirst.mockReset()
    supplierLedgerFindFirst.mockReset()
    customerFindUnique.mockReset()
    supplierFindUnique.mockReset()
    customerLedgerCreate.mockReset()
    supplierLedgerCreate.mockReset()
    customerLedgerFindMany.mockReset()
    supplierLedgerFindMany.mockReset()
    customerLedgerUpdate.mockReset()
    customerLedgerDelete.mockReset()
    supplierLedgerUpdate.mockReset()
    supplierLedgerDelete.mockReset()
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

  test('replaceSupplierLedgerEntry updates an existing payment row and recalculates later balances', async () => {
    const supplierLedgerFindMany = jest.fn().mockResolvedValue([
      { id: 'opening', supplierId: 'supplier-1', entryDate: new Date('2026-06-01'), createdAt: new Date('2026-06-01'), debit: 0, credit: 500, runningBalance: 500 },
      { id: 'payment-ledger', supplierId: 'supplier-1', entryDate: new Date('2026-06-10'), createdAt: new Date('2026-06-10'), debit: 120, credit: 0, runningBalance: 380, referenceType: 'supplier_payment', referenceId: 'payment-1' },
      { id: 'purchase-ledger', supplierId: 'supplier-1', entryDate: new Date('2026-06-12'), createdAt: new Date('2026-06-12'), debit: 0, credit: 50, runningBalance: 450 },
    ])
    const supplierLedgerUpdate = jest.fn().mockResolvedValue(null)

    await replaceSupplierLedgerEntry({
      tx: {
        supplierLedgerEntry: {
          findMany: supplierLedgerFindMany,
          updateMany: jest.fn(),
          create: jest.fn(),
          update: supplierLedgerUpdate,
          findFirst: jest.fn().mockResolvedValue({ id: 'payment-ledger', supplierId: 'supplier-1' }),
        },
      } as any,
      supplierId: 'supplier-1',
      entryType: 'PAYMENT_MADE',
      referenceType: 'supplier_payment',
      referenceId: 'payment-1',
      documentNumber: 'PAY-2083-00001',
      entryDate: new Date('2026-06-10'),
      debit: 120,
      credit: 0,
    })

    expect(supplierLedgerUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'payment-ledger' },
      data: expect.objectContaining({
        debit: expect.anything(),
        credit: expect.anything(),
        documentNumber: 'PAY-2083-00001',
        entryType: 'PAYMENT_MADE',
      }),
    }))
    expect(supplierLedgerUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: 'opening' },
      data: expect.objectContaining({ runningBalance: expect.anything() }),
    }))
    expect(String(supplierLedgerUpdate.mock.calls[1][0].data.runningBalance)).toBe('500')
    expect(supplierLedgerUpdate).toHaveBeenNthCalledWith(3, expect.objectContaining({
      where: { id: 'payment-ledger' },
      data: expect.objectContaining({ runningBalance: expect.anything() }),
    }))
    expect(String(supplierLedgerUpdate.mock.calls[2][0].data.runningBalance)).toBe('380')
    expect(supplierLedgerUpdate).toHaveBeenNthCalledWith(4, expect.objectContaining({
      where: { id: 'purchase-ledger' },
      data: expect.objectContaining({ runningBalance: expect.anything() }),
    }))
    expect(String(supplierLedgerUpdate.mock.calls[3][0].data.runningBalance)).toBe('430')
  })

  test('removeCustomerLedgerEntry deletes the payment row and recalculates remaining balances', async () => {
    const customerLedgerDelete = jest.fn().mockResolvedValue(null)
    const customerLedgerUpdate = jest.fn().mockResolvedValue(null)

    await removeCustomerLedgerEntry({
      tx: {
        customerLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue({ id: 'payment-ledger', customerId: 'customer-1' }),
          delete: customerLedgerDelete,
          findMany: jest.fn().mockResolvedValue([
            { id: 'opening', customerId: 'customer-1', entryDate: new Date('2026-06-01'), createdAt: new Date('2026-06-01'), debit: 200, credit: 0, runningBalance: 200 },
            { id: 'invoice-ledger', customerId: 'customer-1', entryDate: new Date('2026-06-05'), createdAt: new Date('2026-06-05'), debit: 300, credit: 0, runningBalance: 500 },
          ]),
          update: customerLedgerUpdate,
        },
      } as any,
      customerId: 'customer-1',
      referenceType: 'sales_invoice_payment',
      referenceId: 'payment-1',
    })

    expect(customerLedgerDelete).toHaveBeenCalledWith({ where: { id: 'payment-ledger' } })
    expect(customerLedgerUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'opening' },
      data: expect.objectContaining({ runningBalance: expect.anything() }),
    }))
    expect(String(customerLedgerUpdate.mock.calls[0][0].data.runningBalance)).toBe('200')
    expect(customerLedgerUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: 'invoice-ledger' },
      data: expect.objectContaining({ runningBalance: expect.anything() }),
    }))
    expect(String(customerLedgerUpdate.mock.calls[1][0].data.runningBalance)).toBe('500')
  })

  test('replaceCustomerLedgerEntry updates an existing payment row and recalculates later balances', async () => {
    const customerRows = [
      { id: 'opening', customerId: 'customer-1', entryDate: new Date('2026-06-01'), createdAt: new Date('2026-06-01'), debit: 250, credit: 0, runningBalance: 250 },
      { id: 'payment-ledger', customerId: 'customer-1', entryDate: new Date('2026-06-10'), createdAt: new Date('2026-06-10'), debit: 0, credit: 100, runningBalance: 150, referenceType: 'sales_invoice_payment', referenceId: 'payment-1' },
      { id: 'invoice-ledger', customerId: 'customer-1', entryDate: new Date('2026-06-12'), createdAt: new Date('2026-06-12'), debit: 200, credit: 0, runningBalance: 350 },
    ]
    const customerLedgerFindMany = jest.fn().mockImplementation(async () => customerRows.map((row) => ({ ...row })))
    const customerLedgerUpdate = jest.fn().mockImplementation(async ({ where, data }: any) => {
      const index = customerRows.findIndex((row) => row.id === where.id)
      if (index >= 0) {
        customerRows[index] = { ...customerRows[index], ...data }
      }
      return data
    })

    await replaceCustomerLedgerEntry({
      tx: {
        customerLedgerEntry: {
          findMany: customerLedgerFindMany,
          findFirst: jest.fn().mockResolvedValue({ id: 'payment-ledger', customerId: 'customer-1' }),
          create: jest.fn(),
          update: customerLedgerUpdate,
          delete: jest.fn(),
        },
      } as any,
      customerId: 'customer-1',
      entryType: 'PAYMENT_RECEIVED',
      referenceType: 'sales_invoice_payment',
      referenceId: 'payment-1',
      documentNumber: 'RCPT-2083-00001',
      entryDate: new Date('2026-06-10'),
      debit: 0,
      credit: 120,
    })

    expect(customerLedgerUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'payment-ledger' },
      data: expect.objectContaining({
        debit: expect.anything(),
        credit: expect.anything(),
        documentNumber: 'RCPT-2083-00001',
        entryType: 'PAYMENT_RECEIVED',
      }),
    }))
    expect(String(customerLedgerUpdate.mock.calls[1][0].data.runningBalance)).toBe('250')
    expect(String(customerLedgerUpdate.mock.calls[2][0].data.runningBalance)).toBe('130')
    expect(String(customerLedgerUpdate.mock.calls[3][0].data.runningBalance)).toBe('330')
  })

  test('removeSupplierLedgerEntry deletes the payment row and recalculates remaining balances', async () => {
    const supplierLedgerDelete = jest.fn().mockResolvedValue(null)
    const supplierLedgerUpdate = jest.fn().mockResolvedValue(null)

    await removeSupplierLedgerEntry({
      tx: {
        supplierLedgerEntry: {
          findFirst: jest.fn().mockResolvedValue({ id: 'payment-ledger', supplierId: 'supplier-1' }),
          delete: supplierLedgerDelete,
          findMany: jest.fn().mockResolvedValue([
            { id: 'opening', supplierId: 'supplier-1', entryDate: new Date('2026-06-01'), createdAt: new Date('2026-06-01'), debit: 0, credit: 500, runningBalance: 500 },
            { id: 'purchase-ledger', supplierId: 'supplier-1', entryDate: new Date('2026-06-12'), createdAt: new Date('2026-06-12'), debit: 0, credit: 50, runningBalance: 550 },
          ]),
          update: supplierLedgerUpdate,
        },
      } as any,
      supplierId: 'supplier-1',
      referenceType: 'supplier_payment',
      referenceId: 'payment-1',
    })

    expect(supplierLedgerDelete).toHaveBeenCalledWith({ where: { id: 'payment-ledger' } })
    expect(supplierLedgerUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'opening' },
      data: expect.objectContaining({ runningBalance: expect.anything() }),
    }))
    expect(String(supplierLedgerUpdate.mock.calls[0][0].data.runningBalance)).toBe('500')
    expect(supplierLedgerUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: 'purchase-ledger' },
      data: expect.objectContaining({ runningBalance: expect.anything() }),
    }))
    expect(String(supplierLedgerUpdate.mock.calls[1][0].data.runningBalance)).toBe('550')
  })
})
