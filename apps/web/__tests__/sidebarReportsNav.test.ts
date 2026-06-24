import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(
  path.resolve('apps/web/components/layout/layoutNav.ts'),
  'utf8',
)

test('accounting sidebar section does not duplicate the reports link', () => {
  const accountingSection = source.match(/key: 'accounting'[\s\S]*?\n  \},/)?.[0] || ''

  assert.match(accountingSection, /label: 'Expenses'/)
  assert.match(accountingSection, /label: 'Payments'/)
  assert.doesNotMatch(accountingSection, /label: 'Reports'/)
})
