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

  test('GET /api/v1/inventory/materials/:id/boms returns article BOM usages for a raw material', async () => {
    const token = await createToken()

    const materialRes = await request(app)
      .post('/api/v1/inventory/materials')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'BOM Usage Cloth', defaultUnit: 'meter' })

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
