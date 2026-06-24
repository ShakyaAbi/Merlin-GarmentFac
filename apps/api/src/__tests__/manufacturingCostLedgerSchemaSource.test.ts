import fs from 'node:fs'
import path from 'node:path'

describe('manufacturing cost ledger schema', () => {
  const schema = fs.readFileSync(path.resolve('prisma/schema.prisma'), 'utf8')
  const migration = fs.readFileSync(
    path.resolve('prisma/migrations/20260617120000_add_manufacturing_cost_ledger/migration.sql'),
    'utf8',
  )

  test('defines a persisted manufacturing cost ledger entry model', () => {
    expect(schema).toContain('model ManufacturingCostLedgerEntry')
    expect(schema).toContain('periodStart')
    expect(schema).toContain('periodEnd')
    expect(schema).toContain('productionOrderId')
    expect(schema).toContain('expenseBucket')
    expect(schema).toContain('allocatedOverhead')
    expect(schema).toContain('fullyAbsorbedCost')
  })

  test('links ledger entries to production orders and expenses', () => {
    expect(schema).toContain('costLedgerEntries ManufacturingCostLedgerEntry[]')
    expect(schema).toContain('productionOrder   ProductionOrder?')
    expect(schema).toContain('expense           Expense?')
  })

  test('creates the ledger table and lookup indexes in SQL', () => {
    expect(migration).toContain('CREATE TABLE "ManufacturingCostLedgerEntry"')
    expect(migration).toContain('ManufacturingCostLedgerEntry_periodStart_periodEnd_idx')
    expect(migration).toContain('ManufacturingCostLedgerEntry_productionOrderId_idx')
    expect(migration).toContain('ManufacturingCostLedgerEntry_expenseId_idx')
    expect(migration).toContain('ManufacturingCostLedgerEntry_expenseBucket_idx')
  })
})
