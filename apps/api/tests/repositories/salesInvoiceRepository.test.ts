const prismaTransaction = jest.fn()
const salesInvoiceFindUnique = jest.fn()
const salesInvoiceCreate = jest.fn()
const salesInvoiceUpdate = jest.fn()
const salesInvoicePaymentCreate = jest.fn()
const salesInvoicePaymentFindFirst = jest.fn()
const salesInvoicePaymentAggregate = jest.fn()
const salesInvoicePaymentDelete = jest.fn()
const salesInvoiceItemCreateMany = jest.fn()
const appendCustomerLedgerEntry = jest.fn()
const replaceCustomerLedgerEntry = jest.fn()
const removeCustomerLedgerEntry = jest.fn()
const allocateDocumentNumber = jest.fn()

jest.mock('../../src/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => prismaTransaction(...args),
    salesInvoice: {
      findUnique: (...args: unknown[]) => salesInvoiceFindUnique(...args),
      create: (...args: unknown[]) => salesInvoiceCreate(...args),
      update: (...args: unknown[]) => salesInvoiceUpdate(...args),
    },
    salesInvoicePayment: {
      create: (...args: unknown[]) => salesInvoicePaymentCreate(...args),
      findFirst: (...args: unknown[]) => salesInvoicePaymentFindFirst(...args),
      aggregate: (...args: unknown[]) => salesInvoicePaymentAggregate(...args),
      delete: (...args: unknown[]) => salesInvoicePaymentDelete(...args),
    },
    salesInvoiceItem: {
      createMany: (...args: unknown[]) => salesInvoiceItemCreateMany(...args),
    },
    finishedGoodStockTransaction: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    finishedGoodProduct: {
      findMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('../../src/services/ledgerService', () => ({
  appendCustomerLedgerEntry: (...args: unknown[]) => appendCustomerLedgerEntry(...args),
  replaceCustomerLedgerEntry: (...args: unknown[]) => replaceCustomerLedgerEntry(...args),
  removeCustomerLedgerEntry: (...args: unknown[]) => removeCustomerLedgerEntry(...args),
}))

jest.mock('../../src/services/sequenceService', () => ({
  allocateDocumentNumber: (...args: unknown[]) => allocateDocumentNumber(...args),
}))

import {
  createDraftInvoice,
  deletePayment,
  recordPayment,
  updatePayment,
} from '../../src/repositories/salesInvoiceRepository'

describe('salesInvoiceRepository payment ledger sync', () => {
  beforeEach(() => {
    prismaTransaction.mockReset()
    salesInvoiceFindUnique.mockReset()
    salesInvoiceCreate.mockReset()
    salesInvoiceUpdate.mockReset()
    salesInvoicePaymentCreate.mockReset()
    salesInvoicePaymentFindFirst.mockReset()
    salesInvoicePaymentAggregate.mockReset()
    salesInvoicePaymentDelete.mockReset()
    salesInvoiceItemCreateMany.mockReset()
    appendCustomerLedgerEntry.mockReset()
    replaceCustomerLedgerEntry.mockReset()
    removeCustomerLedgerEntry.mockReset()
    allocateDocumentNumber.mockReset()
  })

  function makeTx(overrides: Partial<any> = {}) {
    return {
      salesInvoice: {
      findUnique: salesInvoiceFindUnique,
      create: salesInvoiceCreate,
      update: salesInvoiceUpdate,
    },
      salesInvoicePayment: {
        create: salesInvoicePaymentCreate,
        findFirst: salesInvoicePaymentFindFirst,
        aggregate: salesInvoicePaymentAggregate,
        delete: salesInvoicePaymentDelete,
      },
      salesInvoiceItem: {
        createMany: salesInvoiceItemCreateMany,
      },
      ...overrides,
    }
  }

  test('recordPayment uses the created payment id as the customer ledger reference', async () => {
    allocateDocumentNumber.mockResolvedValue('PAY-2081-00001')
    salesInvoiceFindUnique.mockResolvedValue({
      id: 'invoice-1',
      customerId: 'customer-1',
      invoiceStatus: 'ISSUED',
      invoiceDate: new Date('2026-06-12T00:00:00.000Z'),
      fiscalYear: '2081',
      grandTotal: 500,
      paidAmount: 0,
      payments: [],
    })
    salesInvoicePaymentCreate.mockResolvedValue({ id: 'payment-1' })
    salesInvoicePaymentFindFirst.mockResolvedValue({ id: 'payment-1', paymentNumber: 'PAY-2081-00001', paymentDate: new Date('2026-06-12T00:00:00.000Z') })
    salesInvoicePaymentAggregate.mockResolvedValue({ _sum: { amount: 200 } })
    salesInvoiceUpdate.mockResolvedValue({ id: 'invoice-1' })

    prismaTransaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback(makeTx()))

    await recordPayment('invoice-1', {
      amount: 200,
      paymentMethod: 'cash',
      paymentDate: new Date('2026-06-12T00:00:00.000Z'),
      note: 'Partial payment',
    }, 7)

    expect(appendCustomerLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      referenceType: 'sales_invoice_payment',
      referenceId: 'payment-1',
      credit: expect.anything(),
    }))
  })

  test('createDraftInvoice retries with a fresh invoice number when the previewed number collides', async () => {
    allocateDocumentNumber.mockResolvedValue('INV-2081-00002')
    salesInvoiceCreate
      .mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: 'SalesInvoice_invoiceNumber_key' },
      }))
      .mockResolvedValueOnce({ id: 'invoice-1', invoiceNumber: 'INV-2081-00002' })
    salesInvoiceFindUnique.mockResolvedValue({ id: 'invoice-1', invoiceNumber: 'INV-2081-00002' })
    salesInvoiceItemCreateMany.mockResolvedValue({ count: 1 })

    prismaTransaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback(makeTx()))

    await createDraftInvoice(
      {
        invoiceNumber: 'INV-2081-00001',
        customerId: 'customer-1',
        invoiceDate: new Date('2026-06-12T00:00:00.000Z'),
        subtotal: 100,
        discountAmount: 0,
        taxableAmount: 100,
        nonTaxableAmount: 0,
        taxAmount: 13,
        grandTotal: 113,
        paidAmount: 0,
        dueAmount: 113,
        paymentStatus: 'UNPAID',
        invoiceStatus: 'DRAFT',
      } as any,
      [
        {
          productId: 'product-1',
          productCode: 'FG-001',
          productName: 'Finished Good 1',
          quantity: 1,
          unitPrice: 100,
          discountAmount: 0,
          taxableAmount: 100,
          taxAmount: 13,
          lineTotal: 113,
          costPrice: 40,
          profitAmount: 73,
          warehouseId: null,
        } as any,
      ],
    )

    expect(salesInvoiceCreate).toHaveBeenCalledTimes(2)
    expect(salesInvoiceCreate.mock.calls[0][0].data.invoiceNumber).toBe('INV-2081-00001')
    expect(salesInvoiceCreate.mock.calls[1][0].data.invoiceNumber).toBe('INV-2081-00002')
    expect(allocateDocumentNumber).toHaveBeenCalledWith('sales_invoice', expect.objectContaining({ tx: expect.any(Object) }))
  })

  test('updatePayment rewrites the matching customer ledger row', async () => {
    salesInvoiceFindUnique.mockResolvedValue({
      id: 'invoice-1',
      customerId: 'customer-1',
      invoiceStatus: 'ISSUED',
      invoiceDate: new Date('2026-06-12T00:00:00.000Z'),
      grandTotal: 500,
      paidAmount: 200,
      payments: [],
    })
    salesInvoicePaymentFindFirst.mockResolvedValue({
      id: 'payment-1',
      invoiceId: 'invoice-1',
      paymentNumber: 'PAY-2081-00001',
      amount: 200,
      paymentDate: new Date('2026-06-12T00:00:00.000Z'),
      note: 'Original note',
      receivedBy: 3,
    })
    salesInvoicePaymentAggregate.mockResolvedValue({ _sum: { amount: 250 } })
    salesInvoiceUpdate.mockResolvedValue({ id: 'invoice-1' })

    const salesInvoicePaymentUpdate = jest.fn().mockResolvedValue({
      id: 'payment-1',
      paymentNumber: 'PAY-2081-00001',
      amount: 250,
      paymentDate: new Date('2026-06-13T00:00:00.000Z'),
      receivedBy: 9,
    })

    prismaTransaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      salesInvoice: {
        findUnique: salesInvoiceFindUnique,
        update: salesInvoiceUpdate,
      },
      salesInvoicePayment: {
        findFirst: salesInvoicePaymentFindFirst,
        update: salesInvoicePaymentUpdate,
        aggregate: salesInvoicePaymentAggregate,
      },
    }))

    await updatePayment('invoice-1', 'payment-1', {
      amount: 250,
      paymentMethod: 'bank',
      paymentDate: new Date('2026-06-13T00:00:00.000Z'),
      note: 'Corrected payment',
    }, 9)

    expect(salesInvoicePaymentUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: expect.objectContaining({
        amount: expect.anything(),
        paymentMethod: 'bank',
      }),
    })
    expect(replaceCustomerLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      referenceType: 'sales_invoice_payment',
      referenceId: 'payment-1',
      credit: expect.anything(),
    }))
  })

  test('deletePayment removes the matching customer ledger row', async () => {
    salesInvoiceFindUnique.mockResolvedValue({
      id: 'invoice-1',
      customerId: 'customer-1',
      invoiceStatus: 'ISSUED',
      invoiceDate: new Date('2026-06-12T00:00:00.000Z'),
      grandTotal: 500,
      paidAmount: 200,
      payments: [],
    })
    salesInvoicePaymentFindFirst.mockResolvedValue({
      id: 'payment-1',
      invoiceId: 'invoice-1',
      paymentNumber: 'PAY-2081-00001',
      amount: 200,
      paymentDate: new Date('2026-06-12T00:00:00.000Z'),
      note: 'Original note',
      receivedBy: 3,
    })
    salesInvoicePaymentDelete.mockResolvedValue({ id: 'payment-1' })
    salesInvoicePaymentAggregate.mockResolvedValue({ _sum: { amount: 0 } })
    salesInvoiceUpdate.mockResolvedValue({ id: 'invoice-1' })

    prismaTransaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback(makeTx()))

    await deletePayment('invoice-1', 'payment-1')

    expect(salesInvoicePaymentDelete).toHaveBeenCalledWith({ where: { id: 'payment-1' } })
    expect(removeCustomerLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      referenceType: 'sales_invoice_payment',
      referenceId: 'payment-1',
    }))
  })
})
