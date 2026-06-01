import request from 'supertest'
import app from '../../../src/app'
import { prisma } from '../../../src/prisma'
import { createAdminAndToken } from '../../helpers/createAdminAndToken'

describe('purchasesController', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('POST /api/inventory/purchases creates purchase and stock transactions', async () => {
    const { token } = await createAdminAndToken()

    const supplierRes = await request(app).post('/api/v1/inventory/suppliers').set('Authorization', `Bearer ${token}`).send({ name: 'Test Supplier' })
    expect(supplierRes.status).toBe(201)
    const materialRes = await request(app).post('/api/v1/inventory/materials').set('Authorization', `Bearer ${token}`).send({ name: 'Test Cloth', defaultUnit: 'meter' })
    expect(materialRes.status).toBe(201)

    const res = await request(app).post('/api/v1/inventory/purchases').set('Authorization', `Bearer ${token}`).send({
      supplierId: supplierRes.body.id,
      invoiceNumber: 'INV-1',
      invoiceDate: new Date().toISOString(),
      items: [{ rawMaterialId: materialRes.body.id, quantity: 100, unit: 'meter', unitPrice: '50.00' }]
    })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')

    // verify stock transaction exists
    const txs = await prisma.stockTransaction.findMany({ where: { referenceId: res.body.id } })
    expect(txs.length).toBeGreaterThanOrEqual(1)
  })

  test('POST /api/inventory/purchases validates input', async () => {
    const { token } = await createAdminAndToken()
    const res = await request(app).post('/api/v1/inventory/purchases').set('Authorization', `Bearer ${token}`).send({})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})
