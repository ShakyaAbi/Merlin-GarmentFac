import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')
const schema = read('apps/api/prisma/schema.prisma')
const validator = read('apps/api/src/validators/expenseValidators.ts')
const service = read('apps/api/src/services/expenseService.ts')
const expenseTypes = read('apps/web/services/expenseApi.ts')
const expensesPage = read('apps/web/pages/finance/ExpensesPage.tsx')
const detailPage = read('apps/web/pages/finance/ExpenseDetailPage.tsx')

test('expenses have no draft lifecycle and create as approved', () => {
  assert.match(schema, /enum ExpenseStatus \{\s*APPROVED\s*PAID\s*VOID\s*\}/)
  assert.doesNotMatch(validator, /'DRAFT'/)
  assert.match(service, /status: payload\.status \|\| 'APPROVED'/)
  assert.doesNotMatch(expenseTypes, /'DRAFT'/)
  assert.doesNotMatch(expensesPage, /'DRAFT'/)
})

test('expense detail exposes update and delete actions', () => {
  assert.match(detailPage, /expenseApi\.update\(/)
  assert.match(detailPage, /expenseApi\.remove\(/)
  assert.match(detailPage, /Edit Expense/)
  assert.match(detailPage, /Delete Expense/)
})
