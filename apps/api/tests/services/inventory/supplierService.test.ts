const createSupplierRecord = jest.fn()
const getSupplierRecord = jest.fn()
const listSupplierRecords = jest.fn()
const purchaseCount = jest.fn()
const supplierPaymentCount = jest.fn()
const prismaTransaction = jest.fn()
const supplierCreate = jest.fn()
const supplierPaymentCreate = jest.fn()
const supplierLedgerCreate = jest.fn()
const replaceSupplierLedgerEntry = jest.fn()
const removeSupplierLedgerEntry = jest.fn()

jest.mock('../../../src/repositories/inventory/supplierRepository', () => ({
  getSupplier: (...args: unknown[]) => getSupplierRecord(...args),
  listSuppliers: (...args: unknown[]) => listSupplierRecords(...args),
  updateSupplier: jest.fn(),
  softDeleteSupplier: jest.fn(),
}))

jest.mock('../../../src/services/ledgerService', () => ({
  appendSupplierLedgerEntry: jest.fn(),
  replaceSupplierLedgerEntry: (...args: unknown[]) => replaceSupplierLedgerEntry(...args),
  removeSupplierLedgerEntry: (...args: unknown[]) => removeSupplierLedgerEntry(...args),
}))

jest.mock('../../../src/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => prismaTransaction(...args),
    purchase: {
      count: (...args: unknown[]) => purchaseCount(...args),
    },
    supplierPayment: {
      count: (...args: unknown[]) => supplierPaymentCount(...args),
    },
  },
}))

const allocateDocumentNumber = jest.fn()

jest.mock('../../../src/services/sequenceService', () => ({
  allocateDocumentNumber: (...args: unknown[]) => allocateDocumentNumber(...args),
}))

import {
  createSupplier,
  deleteSupplierPayment,
  getSupplier,
  listSuppliers,
  recordSupplierPayment,
  softDeleteSupplier,
  updateSupplierPayment,
} from '../../../src/services/inventory/supplierService'

describe('supplierService', () => {
  beforeEach(() => {
    createSupplierRecord.mockReset()
    getSupplierRecord.mockReset()
    listSupplierRecords.mockReset()
    purchaseCount.mockReset()
    supplierPaymentCount.mockReset()
    prismaTransaction.mockReset()
    supplierCreate.mockReset()
    supplierPaymentCreate.mockReset()
    supplierLedgerCreate.mockReset()
    replaceSupplierLedgerEntry.mockReset()
    removeSupplierLedgerEntry.mockReset()
    allocateDocumentNumber.mockReset()
    prismaTransaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
      supplier: {
        create: supplierCreate,
        findUnique: jest.fn().mockResolvedValue({ id: 'supplier-1', openingBalance: 0 }),
      },
      supplierPayment: {
        create: supplierPaymentCreate,
      },
      supplierLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: supplierLedgerCreate,
      },
    }))
  })

  test('createSupplier assigns the next non-editable supplier number', async () => {
    allocateDocumentNumber.mockResolvedValue('SUP-00001')
    supplierCreate.mockResolvedValue({ id: 'supplier-1', supplierNumber: 'SUP-00001', name: 'ACME Textiles' })
    getSupplierRecord.mockResolvedValue({ id: 'supplier-1', supplierNumber: 'SUP-00001', name: 'ACME Textiles' })

    const s = await createSupplier({ name: 'ACME Textiles' }) as any

    expect(allocateDocumentNumber).toHaveBeenCalledWith('supplier')
    expect(supplierCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'ACME Textiles', supplierNumber: 'SUP-00001' }) })
    const loaded = await getSupplier(s.id) as any
    expect(loaded?.supplierNumber).toBe('SUP-00001')
  })

  test('getSupplier returns summary fields from purchases, payments, and ledger entries', async () => {
    getSupplierRecord.mockResolvedValue({
      id: 'supplier-1',
      supplierNumber: 'SUP-00001',
      name: 'ACME Textiles',
      purchases: [
        { id: 'purchase-1', invoiceNumber: 'PINV-2081-00001', totalAmount: 800, invoiceDate: new Date('2026-06-09T00:00:00.000Z') },
      ],
      supplierPayments: [
        { id: 'payment-1', paymentNumber: 'PAY-2081-00001', amount: 250, paymentDate: new Date('2026-06-11T00:00:00.000Z') },
      ],
      ledgerEntries: [
        { id: 'ledger-2', runningBalance: 750, entryDate: new Date('2026-06-11T00:00:00.000Z'), createdAt: new Date('2026-06-11T00:00:00.000Z') },
        { id: 'ledger-1', runningBalance: 550, entryDate: new Date('2026-06-09T00:00:00.000Z'), createdAt: new Date('2026-06-09T00:00:00.000Z') },
      ],
    })

    const supplier = await getSupplier('supplier-1') as any

    expect(supplier.summary).toEqual({
      currentBalance: 750,
      totalPurchases: 800,
      totalPaid: 250,
      outstandingPayable: 550,
      lastPurchaseDate: new Date('2026-06-09T00:00:00.000Z'),
      lastPaymentDate: new Date('2026-06-11T00:00:00.000Z'),
    })
    expect(supplier.ledgerEntries.map((entry: any) => entry.id)).toEqual(['ledger-1', 'ledger-2'])
  })

  test('recordSupplierPayment creates a supplier payment and ledger debit entry', async () => {
    allocateDocumentNumber.mockResolvedValue('PAY-2081-00001')
    supplierPaymentCreate.mockResolvedValue({ id: 'payment-1', paymentNumber: 'PAY-2081-00001', amount: 250 })
    getSupplierRecord.mockResolvedValue({
      id: 'supplier-1',
      supplierNumber: 'SUP-00001',
      name: 'ACME Textiles',
      purchases: [],
      supplierPayments: [],
      ledgerEntries: [],
    })

    const payment = await recordSupplierPayment('supplier-1', {
      amount: 250,
      paymentMethod: 'cash',
      paymentDate: '2026-06-11',
      note: 'Advance settlement',
    }, 7) as any

    expect(allocateDocumentNumber).toHaveBeenCalledWith('payment', expect.anything())
    expect(supplierPaymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supplierId: 'supplier-1',
        paymentNumber: 'PAY-2081-00001',
        paymentMethod: 'cash',
      }),
    })
    expect(payment.paymentNumber).toBe('PAY-2081-00001')
  })

  test('updateSupplierPayment rewrites the matching supplier ledger row', async () => {
    const supplierPaymentUpdate = jest.fn().mockResolvedValue({
      id: 'payment-1',
      paymentNumber: 'PAY-2081-00001',
      amount: 325,
      paymentDate: new Date('2026-06-15T00:00:00.000Z'),
      createdBy: 9,
    })

    prismaTransaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      supplierPayment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'payment-1',
          supplierId: 'supplier-1',
          paymentNumber: 'PAY-2081-00001',
          amount: 250,
          paymentDate: new Date('2026-06-11T00:00:00.000Z'),
          note: 'Original note',
          createdBy: 3,
        }),
        update: supplierPaymentUpdate,
      },
      supplierLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: supplierLedgerCreate,
      },
    }))

    await updateSupplierPayment('supplier-1', 'payment-1', {
      amount: 325,
      paymentMethod: 'bank',
      paymentDate: '2026-06-15',
      note: 'Corrected amount',
    }, 9)

    expect(supplierPaymentUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: expect.objectContaining({
        amount: 325,
        paymentMethod: 'bank',
        paymentDate: new Date('2026-06-15T00:00:00.000Z'),
        note: 'Corrected amount',
        createdBy: 9,
      }),
    })
    expect(replaceSupplierLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      supplierId: 'supplier-1',
      referenceType: 'supplier_payment',
      referenceId: 'payment-1',
      debit: 325,
    }))
  })

  test('deleteSupplierPayment removes the matching supplier ledger row', async () => {
    const supplierPaymentDelete = jest.fn().mockResolvedValue({
      id: 'payment-1',
      supplierId: 'supplier-1',
    })

    prismaTransaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      supplierPayment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'payment-1',
          supplierId: 'supplier-1',
          paymentNumber: 'PAY-2081-00001',
          amount: 250,
          paymentDate: new Date('2026-06-11T00:00:00.000Z'),
          note: 'Original note',
          createdBy: 3,
        }),
        delete: supplierPaymentDelete,
      },
      supplierLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: supplierLedgerCreate,
      },
    }))

    await deleteSupplierPayment('supplier-1', 'payment-1')

    expect(supplierPaymentDelete).toHaveBeenCalledWith({ where: { id: 'payment-1' } })
    expect(removeSupplierLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      supplierId: 'supplier-1',
      referenceType: 'supplier_payment',
      referenceId: 'payment-1',
    }))
  })

  test('softDeleteSupplier blocks deletion when purchases or payments exist', async () => {
    purchaseCount.mockResolvedValue(1)
    supplierPaymentCount.mockResolvedValue(0)

    await expect(softDeleteSupplier('supplier-1'))
      .rejects
      .toMatchObject({
        statusCode: 409,
        code: 'DELETE_BLOCKED',
      })
  })
})
