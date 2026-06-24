import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', '..', '..', relativePath), 'utf8')

const routesSource = readSource('api/src/routes/productionRoutes.ts')
const controllerSource = readSource('api/src/controllers/inventory/productionController.ts')
const serviceSource = readSource('api/src/services/productionService.ts')
const validatorSource = readSource('api/src/validators/productionValidators.ts')
const listPageSource = readSource('web/pages/inventory/ProductionOrdersPage.tsx')
const detailPageSource = readSource('web/pages/inventory/ProductionOrderDetailPage.tsx')

describe('draft production batch edit and delete source wiring', () => {
  it('exposes authenticated manager/admin update and delete routes', () => {
    expect(routesSource).toMatch(/router\.put\('\/:id'/)
    expect(routesSource).toMatch(/updateProductionOrderSchema/)
    expect(routesSource).toMatch(/router\.delete\('\/:id'/)
    expect(routesSource).toMatch(/production\.remove/)
  })

  it('controllers call draft edit and delete services with audit actions', () => {
    expect(controllerSource).toMatch(/export const update/)
    expect(controllerSource).toMatch(/svc\.updateProductionOrder/)
    expect(controllerSource).toMatch(/production\.update/)
    expect(controllerSource).toMatch(/export const remove/)
    expect(controllerSource).toMatch(/svc\.deleteProductionOrder/)
    expect(controllerSource).toMatch(/production\.delete/)
  })

  it('services enforce draft-only update and delete', () => {
    expect(serviceSource).toMatch(/export async function updateProductionOrder/)
    expect(serviceSource).toMatch(/Only draft production batches can be edited/)
    expect(serviceSource).toMatch(/export async function deleteProductionOrder/)
    expect(serviceSource).toMatch(/Only draft production batches can be deleted/)
  })

  it('validators and UI include draft edit and delete controls', () => {
    expect(validatorSource).toMatch(/updateProductionOrderSchema/)
    expect(listPageSource).toMatch(/openEditBatch/)
    expect(listPageSource).toMatch(/deleteBatch/)
    expect(listPageSource).toMatch(/Edit Batch/)
    expect(detailPageSource).toMatch(/deleteBatch/)
    expect(detailPageSource).toMatch(/Edit Batch/)
  })
})
