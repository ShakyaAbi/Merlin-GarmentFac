import { createSupplier, getSupplier } from '../../../src/services/inventory/supplierService'
import { prisma } from '../../../src/prisma'

describe('supplierService', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('createSupplier creates and returns supplier', async () => {
    const s = await createSupplier({ name: 'ACME Textiles' })
    expect(s).toHaveProperty('id')
    const loaded = await getSupplier(s.id)
    expect(loaded?.name).toBe('ACME Textiles')
    // cleanup
    await prisma.supplier.deleteMany({ where: { id: s.id } })
  })
})
