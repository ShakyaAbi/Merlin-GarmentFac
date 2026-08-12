import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const apiClientSource = fs.readFileSync(path.resolve('apps/web/services/apiClient.ts'), 'utf8')

test('forbidden actions do not clear the current session', () => {
  assert.match(apiClientSource, /const isAuthFailure = res\.status === 401;/)
  assert.doesNotMatch(apiClientSource, /res\.status === 401 \|\| res\.status === 403/)
})
