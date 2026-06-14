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

export function getFiscalSequenceSegment(_date: Date, fiscalYear?: string | null) {
  return fiscalYear?.trim() || String(new Date().getFullYear())
}

export async function allocateDocumentNumber(entity: SequenceEntity, options: SequenceOptions = {}) {
  const config = sequenceConfig[entity]
  const fiscalYear = config.usesFiscalYear ? getFiscalSequenceSegment(new Date(), options.fiscalYear) : null
  const sequenceKey = fiscalYear ? `${entity}:${fiscalYear}` : entity
  const execute = async (tx: any) =>
    tx.documentSequence.upsert({
      where: { key: sequenceKey },
      create: {
        key: sequenceKey,
        nextNumber: 1,
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
  const fiscalYear = config.usesFiscalYear ? getFiscalSequenceSegment(new Date(), options.fiscalYear) : null
  const sequenceKey = fiscalYear ? `${entity}:${fiscalYear}` : entity
  const record = await prisma.documentSequence.findUnique({
    where: { key: sequenceKey },
    select: { nextNumber: true },
  })
  return buildDocumentNumber(config.prefix, record?.nextNumber || 1, fiscalYear)
}
