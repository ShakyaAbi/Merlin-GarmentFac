import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readPage = (relativePath: string) =>
  fs.readFileSync(path.resolve('apps/web/pages/inventory', relativePath), 'utf8')

test('materials page stays focused on raw materials, not article creation', () => {
  const source = readPage('MaterialsPage.tsx')

  assert.match(source, /title="Raw Materials"/)
  assert.doesNotMatch(source, /Create Article/)
  assert.doesNotMatch(source, /New Article/)
})

test('articles page describes sellable products separately from raw materials', () => {
  const source = readPage('FinishedGoodsPage.tsx')

  assert.match(source, /title="Articles"/)
  assert.match(source, /sellable products/)
  assert.doesNotMatch(source, /Back to materials/)
})

test('article creation explains that materials are only components', () => {
  const source = readPage('CreateArticlePage.tsx')

  assert.doesNotMatch(source, /Articles and material definition now live together/)
  assert.match(source, /raw materials are components/i)
})
