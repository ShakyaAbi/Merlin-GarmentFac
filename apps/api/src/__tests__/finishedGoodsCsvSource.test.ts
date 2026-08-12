import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('finished goods csv service and controller expose import export hooks', () => {
  const service = read('apps/api/src/services/inventory/finishedGoodsCsvService.ts')
  const controller = read('apps/api/src/controllers/inventory/finishedGoodsCsvController.ts')
  const routes = read('apps/api/src/routes/inventoryRoutes.ts')

  assert.match(service, /generateFinishedGoodsCsv/)
  assert.match(service, /generateFinishedGoodsTemplateCsv/)
  assert.match(service, /importFinishedGoodsFromCsv/)
  assert.match(controller, /exportCSV/)
  assert.match(controller, /templateSample/)
  assert.match(controller, /importCSV/)
  assert.match(routes, /finished-goods\/export/)
  assert.match(routes, /finished-goods\/import-template-sample/)
  assert.match(routes, /finished-goods\/import/)
})
