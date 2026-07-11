import request from 'supertest'
import app from '../../../src/app'
import { prisma } from '../../../src/prisma'
import { signAccessToken } from '../../../src/utils/jwt'

const createToken = async () => {
  const organization = await prisma.organization.create({ data: { name: `Material Test Org ${Date.now()}` } })
  const user = await prisma.user.create({
    data: {
      email: `material-test-${Date.now()}@example.com`,
      passwordHash: 'test-only',
      name: 'Material Test Admin',
      role: 'ADMIN',
      organizationId: organization.id,
    },
  })

  return signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: organization.id,
  })
}

describe('materialsController', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('GET /api/v1/inventory/materials/:id/purchases returns purchase history for a material', async () => {
    const token = await createToken()

    const supplierRes = await request(app)
      .post('/api/v1/inventory/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Purchase History Supplier' })
    expect(supplierRes.status).toBe(201)

    const materialRes = await request(app)
      .post('/api/v1/inventory/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Purchase History Cloth', sku: `PHC-${Date.now()}`, defaultUnit: 'meter' })
    expect(materialRes.status).toBe(201)

    const purchaseRes = await request(app)
      .post('/api/v1/inventory/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierId: supplierRes.body.id,
        invoiceNumber: `PH-${Date.now()}`,
        invoiceDate: new Date().toISOString(),
        items: [{ rawMaterialId: materialRes.body.id, quantity: 12, unit: 'meter', unitPrice: '25.00' }],
      })

    expect(purchaseRes.status).toBe(201)

    const historyRes = await request(app)
      .get(`/api/v1/inventory/materials/${materialRes.body.id}/purchases`)
      .set('Authorization', `Bearer ${token}`)

    expect(historyRes.status).toBe(200)
    expect(historyRes.body).toEqual([
      expect.objectContaining({
        id: purchaseRes.body.purchaseId || purchaseRes.body.id,
        supplier: expect.objectContaining({ id: supplierRes.body.id, name: 'Purchase History Supplier' }),
      }),
    ])

    const pricesRes = await request(app)
      .get(`/api/v1/inventory/materials/${materialRes.body.id}/prices`)
      .set('Authorization', `Bearer ${token}`)

    expect(pricesRes.status).toBe(200)
    expect(pricesRes.body).toEqual([
      expect.objectContaining({
        purchaseId: purchaseRes.body.purchaseId || purchaseRes.body.id,
        supplier: expect.objectContaining({ id: supplierRes.body.id, name: 'Purchase History Supplier' }),
      }),
    ])
  })

  test('GET /api/v1/inventory/materials/:id/boms returns article BOM usages for a raw material', async () => {
    const token = await createToken()

    const materialRes = await request(app)
      .post('/api/v1/inventory/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'BOM Usage Cloth', sku: `BOM-${Date.now()}`, defaultUnit: 'meter' })

    expect(materialRes.status).toBe(201)

    const article = await prisma.finishedGoodProduct.create({
      data: {
        name: 'BOM Usage Shirt',
        sku: `bom-usage-${Date.now()}`,
        productCode: `BOM-USAGE-${Date.now()}`,
        unit: 'pcs',
        bomData: {
          name: 'BOM Usage Shirt',
          garmentStyle: 'BOM Usage Shirt',
          items: [
            {
              rawMaterialId: materialRes.body.id,
              consumption: 2.5,
              unit: 'meter',
              rate: 100,
              yield: 96,
            },
          ],
        },
      },
    })

    const res = await request(app)
      .get(`/api/v1/inventory/materials/${materialRes.body.id}/boms`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      expect.objectContaining({
        finishedGoodId: article.id,
        garmentStyle: 'BOM Usage Shirt',
        rawMaterialId: materialRes.body.id,
        consumption: 2.5,
        unit: 'meter',
        yield: 96,
      }),
    ])
  })
})
