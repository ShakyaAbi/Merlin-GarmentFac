const prismaCustomerFindUnique = jest.fn()
const createDraftInvoice = jest.fn()
const getSalesCatalogProductsByIds = jest.fn()

jest.mock('../../src/prisma', () => ({
  prisma: {
    customer: {
      findUnique: (...args: unknown[]) => prismaCustomerFindUnique(...args),
    },
  },
}))

jest.mock('../../src/repositories/salesInvoiceRepository', () => ({
  createDraftInvoice: (...args: unknown[]) => createDraftInvoice(...args),
}))

jest.mock('../../src/services/salesCatalogService', () => ({
  getSalesCatalogProductsByIds: (...args: unknown[]) => getSalesCatalogProductsByIds(...args),
}))

import { AppError } from '../../src/utils/errors'
import { createInvoice } from '../../src/services/salesInvoiceService'

describe('salesInvoiceService discount handling', () => {
  beforeEach(() => {
    prismaCustomerFindUnique.mockReset()
    createDraftInvoice.mockReset()
    getSalesCatalogProductsByIds.mockReset()
  })

  test('derives the saved invoice discount from per-item discounts', async () => {
    prismaCustomerFindUnique.mockResolvedValue({ id: 'customer-1' })
    getSalesCatalogProductsByIds.mockResolvedValue(
      new Map([
        [
          'product-1',
          {
            id: 'product-1',
            productCode: 'FG-001',
            name: 'Finished Good 1',
            sellingPrice: 100,
            costPrice: 40,
          },
        ],
        [
          'product-2',
          {
            id: 'product-2',
            productCode: 'FG-002',
            name: 'Finished Good 2',
            sellingPrice: 500,
            costPrice: 200,
          },
        ],
      ]),
    )
    createDraftInvoice.mockResolvedValue({ id: 'invoice-1' })

    await createInvoice({
      customerId: 'customer-1',
      invoiceDate: '2026-07-03',
      items: [
        { productId: 'product-1', quantity: 2, unitPrice: 100, discountAmount: 10 },
        { productId: 'product-2', quantity: 1, unitPrice: 500, discountAmount: 50 },
      ],
    })

    expect(createDraftInvoice).toHaveBeenCalledTimes(1)
    const [invoiceData, items] = createDraftInvoice.mock.calls[0]

    expect(String(invoiceData.subtotal)).toBe('700')
    expect(String(invoiceData.discountAmount)).toBe('60')
    expect(String(invoiceData.taxableAmount)).toBe('640')
    expect(String(invoiceData.taxAmount)).toBe('83.2')
    expect(String(invoiceData.grandTotal)).toBe('723.2')
    expect(String(items[0].discountAmount)).toBe('10')
    expect(String(items[1].discountAmount)).toBe('50')
  })

  test('rejects a line discount that exceeds the line subtotal', async () => {
    prismaCustomerFindUnique.mockResolvedValue({ id: 'customer-1' })
    getSalesCatalogProductsByIds.mockResolvedValue(
      new Map([
        [
          'product-1',
          {
            id: 'product-1',
            productCode: 'FG-001',
            name: 'Finished Good 1',
            sellingPrice: 100,
            costPrice: 40,
          },
        ],
      ]),
    )

    await expect(
      createInvoice({
        customerId: 'customer-1',
        items: [
          { productId: 'product-1', quantity: 1, unitPrice: 100, discountAmount: 120 },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_DISCOUNT',
    } satisfies Partial<AppError>)

    expect(createDraftInvoice).not.toHaveBeenCalled()
  })
})
