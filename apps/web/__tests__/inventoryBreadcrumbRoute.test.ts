import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const appSource = fs.readFileSync(path.resolve('apps/web/App.tsx'), 'utf8')
const navSource = fs.readFileSync(path.resolve('apps/web/components/layout/layoutNav.ts'), 'utf8')

test('inventory breadcrumb route redirects inside the protected app instead of falling to login', () => {
  assert.match(appSource, /path="\/inventory" element=\{<Navigate to="\/inventory\/materials" replace \/>\}/)
  assert.match(navSource, /inventory: 'Inventory'/)
})

test('admin breadcrumb route redirects inside the protected app instead of falling to login', () => {
  assert.match(appSource, /path="\/admin" element=\{<Navigate to="\/admin\/users" replace \/>\}/)
  assert.match(navSource, /admin: 'Admin'/)
})
