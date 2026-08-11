import { prisma } from '../prisma'

type SequenceEntity =
  | 'customer'
  | 'supplier'
  | 'article'
  | 'product'
  | 'sales_invoice'
  | 'purchase_invoice'
  | 'payment'
  | 'production_order'

type SequenceOptions = {
  fiscalYear?: string | null
  resetByFiscalYear?: boolean
  initialNumber?: number
  tx?: any
}

const sequenceConfig: Record<SequenceEntity, { prefix: string; usesFiscalYear: boolean }> = {
  customer: { prefix: 'CUS', usesFiscalYear: false },
  supplier: { prefix: 'SUP', usesFiscalYear: false },
  article: { prefix: 'ART', usesFiscalYear: false },
  product: { prefix: 'PRD', usesFiscalYear: false },
  sales_invoice: { prefix: 'INV', usesFiscalYear: true },
  purchase_invoice: { prefix: 'PINV', usesFiscalYear: true },
  payment: { prefix: 'PAY', usesFiscalYear: true },
  production_order: { prefix: 'PO', usesFiscalYear: true },
}

function padSequence(value: number) {
  return String(value).padStart(5, '0')
}

export function buildDocumentNumber(prefix: string, sequence: number, fiscalYear?: string | null) {
  return fiscalYear ? `${prefix}-${fiscalYear}-${padSequence(sequence)}` : `${prefix}-${padSequence(sequence)}`
}

export function getFiscalSequenceSegment(date: Date, fiscalYear?: string | null) {
  if (fiscalYear?.trim()) return fiscalYear.trim()
  const fiscalYearStart = date.getMonth() > 6 || (date.getMonth() === 6 && date.getDate() >= 17)
  return String(date.getFullYear() - (fiscalYearStart ? 0 : 1))
}

export async function allocateDocumentNumber(entity: SequenceEntity, options: SequenceOptions = {}) {
  const config = sequenceConfig[entity]
  const fiscalYear = config.usesFiscalYear && options.resetByFiscalYear !== false
    ? getFiscalSequenceSegment(new Date(), options.fiscalYear)
    : null
  const sequenceKey = fiscalYear ? `${entity}:${fiscalYear}` : entity
  const execute = async (tx: any) =>
    tx.documentSequence.upsert({
      where: { key: sequenceKey },
      create: {
        key: sequenceKey,
        nextNumber: Math.max(1, Math.floor(options.initialNumber || 1)),
      },
      update: {
        nextNumber: {
          increment: 1,
        },
      },
    })
  const current = options.tx ? await execute(options.tx) : await prisma.$transaction(execute)

  return buildDocumentNumber(config.prefix, current.nextNumber, fiscalYear)
}

export async function previewDocumentNumber(entity: SequenceEntity, options: SequenceOptions = {}) {
  const config = sequenceConfig[entity]
  const fiscalYear = config.usesFiscalYear && options.resetByFiscalYear !== false
    ? getFiscalSequenceSegment(new Date(), options.fiscalYear)
    : null
  const sequenceKey = fiscalYear ? `${entity}:${fiscalYear}` : entity
  const record = await prisma.documentSequence.findUnique({
    where: { key: sequenceKey },
    select: { nextNumber: true },
  })
  return buildDocumentNumber(config.prefix, record?.nextNumber || Math.max(1, Math.floor(options.initialNumber || 1)), fiscalYear)
}

export async function setNextDocumentNumber(entity: SequenceEntity, nextNumber: number, options: SequenceOptions = {}) {
  const config = sequenceConfig[entity]
  const fiscalYear = config.usesFiscalYear && options.resetByFiscalYear !== false
    ? getFiscalSequenceSegment(new Date(), options.fiscalYear)
    : null
  const sequenceKey = fiscalYear ? `${entity}:${fiscalYear}` : entity
  const value = Math.max(1, Math.floor(nextNumber))
  const execute = async (tx: any) => tx.documentSequence.upsert({
    where: { key: sequenceKey },
    create: { key: sequenceKey, nextNumber: value },
    update: { nextNumber: value },
  })
  return options.tx ? execute(options.tx) : prisma.$transaction(execute)
}
