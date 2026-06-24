import test from 'node:test'
import assert from 'node:assert/strict'
import { formatNepaliDate, formatNepaliDateTime } from '../utils/nepaliDate'

test('formatNepaliDate renders known Bikram Sambat dates in English', () => {
  assert.equal(formatNepaliDate('2026-05-01'), '18 Baisakh 2083 BS')
  assert.equal(formatNepaliDate('2026-05-29'), '15 Jestha 2083 BS')
  assert.equal(formatNepaliDate('2026-09-19'), '3 Ashoj 2083 BS')
})

test('formatNepaliDate handles empty and invalid values safely', () => {
  assert.equal(formatNepaliDate(), '-')
  assert.equal(formatNepaliDate('not-a-date'), 'not-a-date')
})

test('formatNepaliDateTime appends the local time without changing the BS date', () => {
  assert.match(formatNepaliDateTime('2026-06-16T09:30:00.000Z'), /^2 Asar 2083 BS/)
})
