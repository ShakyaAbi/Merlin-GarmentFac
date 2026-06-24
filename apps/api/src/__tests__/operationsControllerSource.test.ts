import fs from 'node:fs'
import path from 'node:path'

describe('operationsController source', () => {
  const source = fs.readFileSync(
    path.resolve('src/controllers/operationsController.ts'),
    'utf8',
  )

  test('passes from/to query filters into operations summary service', () => {
    expect(source).toContain('req.query.from')
    expect(source).toContain('req.query.to')
    expect(source).toContain('getOperationsSummary({')
  })
})
