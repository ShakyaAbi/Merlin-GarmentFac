jest.mock('../../src/prisma', () => {
  const sequenceState = new Map<string, { nextNumber: number }>()

  return {
    prisma: {
      documentSequence: {
        findUnique: async ({ where }: any) => sequenceState.get(where.key) || null,
      },
      $transaction: async (callback: (tx: any) => unknown) => callback({
        documentSequence: {
          upsert: async ({ where, create, update }: any) => {
            const current = sequenceState.get(where.key)
            const record = current
              ? { key: where.key, nextNumber: current.nextNumber }
              : { key: create.key, nextNumber: create.nextNumber }
            const nextRecord = current
              ? { ...record, nextNumber: update.nextNumber.increment + record.nextNumber }
              : record
            sequenceState.set(where.key, nextRecord)
            return nextRecord
          },
          findUnique: async ({ where }: any) => sequenceState.get(where.key) || null,
        },
      }),
      __sequenceState: sequenceState,
    },
  }
})

import { prisma } from '../../src/prisma'
import { allocateDocumentNumber, buildDocumentNumber, getFiscalSequenceSegment, previewDocumentNumber } from '../../src/services/sequenceService'

describe('sequenceService', () => {
  beforeEach(() => {
    ;(prisma as any).__sequenceState.clear()
  })

  test('buildDocumentNumber formats plain sequential entity numbers', () => {
    expect(buildDocumentNumber('CUS', 1)).toBe('CUS-00001')
    expect(buildDocumentNumber('SUP', 42)).toBe('SUP-00042')
    expect(buildDocumentNumber('ART', 99999)).toBe('ART-99999')
  })

  test('buildDocumentNumber formats fiscal document numbers', () => {
    expect(buildDocumentNumber('INV', 7, '2081')).toBe('INV-2081-00007')
    expect(buildDocumentNumber('PAY', 12, '2081')).toBe('PAY-2081-00012')
  })

  test('getFiscalSequenceSegment returns the provided fiscal year when present', () => {
    expect(getFiscalSequenceSegment(new Date('2026-06-13T00:00:00.000Z'), '2081')).toBe('2081')
  })

  test('getFiscalSequenceSegment follows Nepal fiscal year boundary', () => {
    expect(getFiscalSequenceSegment(new Date('2026-07-16T00:00:00.000Z'))).toBe('2025')
    expect(getFiscalSequenceSegment(new Date('2026-07-17T00:00:00.000Z'))).toBe('2026')
  })

  test('allocateDocumentNumber increments non-fiscal sequences without reusing numbers', async () => {
    await expect(allocateDocumentNumber('customer')).resolves.toBe('CUS-00001')
    await expect(allocateDocumentNumber('customer')).resolves.toBe('CUS-00002')
    await expect(allocateDocumentNumber('supplier')).resolves.toBe('SUP-00001')
  })

  test('allocateDocumentNumber increments fiscal sequences independently per fiscal year', async () => {
    await expect(allocateDocumentNumber('sales_invoice', { fiscalYear: '2081' })).resolves.toBe('INV-2081-00001')
    await expect(allocateDocumentNumber('sales_invoice', { fiscalYear: '2081' })).resolves.toBe('INV-2081-00002')
    await expect(allocateDocumentNumber('sales_invoice', { fiscalYear: '2082' })).resolves.toBe('INV-2082-00001')
  })

  test('sales invoice numbering can continue globally when fiscal-year reset is disabled', async () => {
    await expect(allocateDocumentNumber('sales_invoice', { fiscalYear: '2081', resetByFiscalYear: false })).resolves.toBe('INV-00001')
    await expect(allocateDocumentNumber('sales_invoice', { fiscalYear: '2082', resetByFiscalYear: false })).resolves.toBe('INV-00002')
  })

  test('preview does not consume the next sales invoice number', async () => {
    await expect(previewDocumentNumber('sales_invoice', { fiscalYear: '2081' })).resolves.toBe('INV-2081-00001')
    await expect(previewDocumentNumber('sales_invoice', { fiscalYear: '2081' })).resolves.toBe('INV-2081-00001')
  })
})
