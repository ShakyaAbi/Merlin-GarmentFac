import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('toast stack uses simple animated severity cards', () => {
  const source = fs.readFileSync(path.resolve('apps/web/components/layout/ToastStack.tsx'), 'utf8')

  assert.match(source, /AnimatePresence/)
  assert.match(source, /motion\.div/)
  assert.match(source, /absolute inset-y-0 left-0 w-1/)
  assert.match(source, /rounded-2xl border/)
  assert.doesNotMatch(source, /tracking-\[0\.18em\]|bg-gradient-to-b|rounded-full border border-current\/10/)
  assert.match(source, /BadgeCheck|TriangleAlert|AlertCircle|Info/)
})
