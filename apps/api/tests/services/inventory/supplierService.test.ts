const createSupplierRecord = jest.fn()
const getSupplierRecord = jest.fn()
const listSupplierRecords = jest.fn()
const prismaTransaction = jest.fn()
const supplierCreate = jest.fn()
const supplierPaymentCreate = jest.fn()
const supplierLedgerCreate = jest.fn()

jest.mock('../../../src/repositories/inventory/supplierRepository', () => ({
  getSupplier: (...args: unknown[]) => getSupplierRecord(...args),
  listSuppliers: (...args: unknown[]) => listSupplierRecords(...args),
  updateSupplier: jest.fn(),
  softDeleteSupplier: jest.fn(),
}))

jest.mock('../../../src/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => prismaTransaction(...args),
  },
}))

const allocateDocumentNumber = jest.fn()

jest.mock('../../../src/services/sequenceService', () => ({
  allocateDocumentNumber: (...args: unknown[]) => allocateDocumentNumber(...args),
}))

import { createSupplier, getSupplier, listSuppliers, recordSupplierPayment } from '../../../src/services/inventory/supplierService'

describe('supplierService', () => {
  beforeEach(() => {
    createSupplierRecord.mockReset()
    getSupplierRecord.mockReset()
    listSupplierRecords.mockReset()
    prismaTransaction.mockReset()
    supplierCreate.mockReset()
    supplierPaymentCreate.mockReset()
    supplierLedgerCreate.mockReset()
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
      ledgerEntries: [{ id: 'ledger-1', runningBalance: 550 }],
    })

    const supplier = await getSupplier('supplier-1') as any

    expect(supplier.summary).toEqual({
      currentBalance: 550,
      totalPurchases: 800,
      totalPaid: 250,
      outstandingPayable: 550,
      lastPurchaseDate: new Date('2026-06-09T00:00:00.000Z'),
      lastPaymentDate: new Date('2026-06-11T00:00:00.000Z'),
    })
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
    expect(supplierLedgerCreate).toHaveBeenCalled()
    expect(payment.paymentNumber).toBe('PAY-2081-00001')
  })
})
