import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('standalone material entry page is removed from navigation and old route redirects', () => {
  const app = read('apps/web/App.tsx')
  const nav = read('apps/web/components/layout/layoutNav.ts')
  const materialsPage = read('apps/web/pages/inventory/MaterialsPage.tsx')
  const materialDetail = read('apps/web/pages/inventory/MaterialDetail.tsx')
  const materialCard = read('apps/web/components/inventory/MaterialCard.tsx')

  assert.doesNotMatch(nav, /Material Entry/)
  assert.doesNotMatch(nav, /\/inventory\/materials\/entry/)
  assert.doesNotMatch(materialsPage, /Record Entry/)
  assert.doesNotMatch(materialsPage, /materials\/entry/)
  assert.doesNotMatch(materialDetail, /Record Entry/)
  assert.doesNotMatch(materialDetail, /materials\/entry/)
  assert.doesNotMatch(materialCard, /onRecordEntry/)
  assert.doesNotMatch(materialCard, />\s*Entry\s*</)
  assert.doesNotMatch(app, /import MaterialEntryPage/)
  assert.match(app, /path="\/inventory\/materials\/entry" element=\{<Navigate to="\/inventory\/materials" replace \/>\}/)
})
