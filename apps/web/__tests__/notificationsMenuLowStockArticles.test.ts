import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('notifications menu links inventory alerts and low stock articles to detail pages', () => {
  const source = read('apps/web/components/layout/NotificationsMenu.tsx')

  assert.match(source, /Low Stock Articles/)
  assert.match(source, /\/inventory\/finished-goods\/\$\{item\.id\}/)
  assert.match(source, /\/inventory\/materials\/\$\{alert\.rawMaterialId\}/)
})
