const customerCreate = jest.fn()
const customerFindUnique = jest.fn()
const customerCount = jest.fn()
const salesOrderCount = jest.fn()
const prismaTransaction = jest.fn()

jest.mock('../../src/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => prismaTransaction(...args),
    customer: {
      create: customerCreate,
      findUnique: (...args: unknown[]) => customerFindUnique(...args),
    },
    salesInvoice: {
      count: (...args: unknown[]) => customerCount(...args),
    },
    salesOrder: {
      count: (...args: unknown[]) => salesOrderCount(...args),
    },
  },
}))

const allocateDocumentNumber = jest.fn()

jest.mock('../../src/services/sequenceService', () => ({
  allocateDocumentNumber: (...args: unknown[]) => allocateDocumentNumber(...args),
}))

import { createCustomer, getCustomer, softDeleteCustomer } from '../../src/services/customerService'

describe('customerService', () => {
  beforeEach(() => {
    customerCreate.mockReset()
    customerFindUnique.mockReset()
    customerCount.mockReset()
    salesOrderCount.mockReset()
    prismaTransaction.mockReset()
    allocateDocumentNumber.mockReset()
    prismaTransaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
      customer: {
        create: customerCreate,
      },
      customerLedgerEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    }))
  })

  test('createCustomer assigns the next non-editable customer number', async () => {
    allocateDocumentNumber.mockResolvedValue('CUS-00001')
    customerCreate.mockResolvedValue({ id: 'customer-1', customerNumber: 'CUS-00001', customerName: 'Everest Garments' })

    const created = await createCustomer({ customerName: 'Everest Garments' }) as any

    expect(allocateDocumentNumber).toHaveBeenCalledWith('customer')
    expect(customerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerName: 'Everest Garments',
        customerNumber: 'CUS-00001',
      }),
    })
    expect(created.customerNumber).toBe('CUS-00001')
  })

  test('getCustomer returns summary fields from invoices and payments', async () => {
    customerFindUnique.mockResolvedValue({
      id: 'customer-1',
      customerNumber: 'CUS-00001',
      customerName: 'Everest Garments',
      salesInvoices: [
        {
          id: 'invoice-1',
          invoiceNumber: 'INV-2081-00001',
          invoiceStatus: 'ISSUED',
          grandTotal: 500,
          dueAmount: 200,
          invoiceDate: new Date('2026-06-10T00:00:00.000Z'),
          payments: [{ id: 'payment-1', amount: 300, paymentDate: new Date('2026-06-12T00:00:00.000Z') }],
        },
      ],
      ledgerEntries: [
        { id: 'ledger-2', runningBalance: 150, entryDate: new Date('2026-06-12T00:00:00.000Z'), createdAt: new Date('2026-06-12T00:00:00.000Z') },
        { id: 'ledger-1', runningBalance: 200, entryDate: new Date('2026-06-10T00:00:00.000Z'), createdAt: new Date('2026-06-10T00:00:00.000Z') },
      ],
    })

    const customer = await getCustomer('customer-1') as any

    expect(customer.summary).toEqual({
      currentBalance: 150,
      totalInvoiced: 500,
      totalPaid: 300,
      outstandingAmount: 200,
      lastInvoiceDate: new Date('2026-06-10T00:00:00.000Z'),
      lastPaymentDate: new Date('2026-06-12T00:00:00.000Z'),
    })
    expect(customer.ledgerEntries.map((entry: any) => entry.id)).toEqual(['ledger-1', 'ledger-2'])
  })

  test('softDeleteCustomer blocks deletion when the customer still has invoices or orders', async () => {
    customerCount.mockResolvedValue(2)
    salesOrderCount.mockResolvedValue(1)

    await expect(softDeleteCustomer('customer-1'))
      .rejects
      .toMatchObject({
        statusCode: 409,
        code: 'DELETE_BLOCKED',
      })

    expect(customerCreate).not.toHaveBeenCalled()
  })
})
