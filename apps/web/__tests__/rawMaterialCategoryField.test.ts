import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('raw material category pieces are separated by responsibility', () => {
  const field = read('apps/web/components/inventory/RawMaterialCategoryField.tsx')
  const select = read('apps/web/components/inventory/RawMaterialCategorySelect.tsx')
  const createInline = read('apps/web/components/inventory/RawMaterialCategoryCreateInline.tsx')

  assert.match(field, /RawMaterialCategorySelect/)
  assert.match(field, /RawMaterialCategoryCreateInline/)
  assert.doesNotMatch(field, /rawMaterialApi[\s\S]*getCategories\(\)/)
  assert.doesNotMatch(field, /rawMaterialApi[\s\S]*createCategory\(/)
  assert.match(select, /rawMaterialApi[\s\S]*getCategories\(\)/)
  assert.doesNotMatch(select, /rawMaterialApi[\s\S]*createCategory\(/)
  assert.match(createInline, /rawMaterialApi[\s\S]*createCategory\(/)
  assert.doesNotMatch(createInline, /rawMaterialApi[\s\S]*getCategories\(\)/)
})

test('raw material category field is wired into material create and edit flows', () => {
  const createPage = read('apps/web/pages/inventory/CreateMaterialPage.tsx')
  const detailPage = read('apps/web/pages/inventory/MaterialDetail.tsx')

  assert.match(createPage, /<RawMaterialCategoryField/)
  assert.match(detailPage, /<RawMaterialCategoryField/)
  assert.match(detailPage, /rawMaterialApi\.update\(material\.id, payload\)/)
})
