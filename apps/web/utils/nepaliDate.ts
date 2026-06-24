type BsAnchor = {
  ad: string
  year: number
  month: number
}

const BS_MONTHS = [
  'Baisakh',
  'Jestha',
  'Asar',
  'Shrawan',
  'Bhadra',
  'Ashoj',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
]

// Civil BS month starts for the current working data range in this app.
// These anchors keep UI display in BS while API/storage remains Gregorian.
const BS_ANCHORS: Array<BsAnchor & { time: number }> = [
  { ad: '2025-04-14', year: 2082, month: 1 },
  { ad: '2025-05-15', year: 2082, month: 2 },
  { ad: '2025-06-15', year: 2082, month: 3 },
  { ad: '2025-07-17', year: 2082, month: 4 },
  { ad: '2025-08-17', year: 2082, month: 5 },
  { ad: '2025-09-17', year: 2082, month: 6 },
  { ad: '2025-10-18', year: 2082, month: 7 },
  { ad: '2025-11-17', year: 2082, month: 8 },
  { ad: '2025-12-16', year: 2082, month: 9 },
  { ad: '2026-01-15', year: 2082, month: 10 },
  { ad: '2026-02-13', year: 2082, month: 11 },
  { ad: '2026-03-15', year: 2082, month: 12 },
  { ad: '2026-04-14', year: 2083, month: 1 },
  { ad: '2026-05-15', year: 2083, month: 2 },
  { ad: '2026-06-15', year: 2083, month: 3 },
  { ad: '2026-07-17', year: 2083, month: 4 },
  { ad: '2026-08-17', year: 2083, month: 5 },
  { ad: '2026-09-17', year: 2083, month: 6 },
  { ad: '2026-10-18', year: 2083, month: 7 },
  { ad: '2026-11-17', year: 2083, month: 8 },
  { ad: '2026-12-16', year: 2083, month: 9 },
  { ad: '2027-01-15', year: 2083, month: 10 },
  { ad: '2027-02-13', year: 2083, month: 11 },
  { ad: '2027-03-15', year: 2083, month: 12 },
  { ad: '2027-04-14', year: 2084, month: 1 },
].map((anchor) => ({ ...anchor, time: Date.parse(`${anchor.ad}T00:00:00.000Z`) }))

const MS_PER_DAY = 24 * 60 * 60 * 1000

const parseDate = (value?: string | null | Date) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const utcMidnight = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

export const toNepaliDateParts = (value?: string | null | Date) => {
  const parsed = parseDate(value)
  if (!parsed) return null

  const time = utcMidnight(parsed)
  let active = BS_ANCHORS[0]
  for (const anchor of BS_ANCHORS) {
    if (anchor.time <= time) active = anchor
    else break
  }

  if (time < BS_ANCHORS[0].time || time >= BS_ANCHORS[BS_ANCHORS.length - 1].time) {
    return null
  }

  return {
    year: active.year,
    month: active.month,
    monthName: BS_MONTHS[active.month - 1],
    day: Math.floor((time - active.time) / MS_PER_DAY) + 1,
  }
}

export const formatNepaliDate = (value?: string | null | Date, fallback = '-') => {
  if (!value) return fallback
  const parts = toNepaliDateParts(value)
  if (!parts) {
    const parsed = parseDate(value)
    return parsed ? parsed.toLocaleDateString('en-NP') : String(value)
  }
  return `${parts.day} ${parts.monthName} ${parts.year} BS`
}

export const formatNepaliDateTime = (value?: string | null | Date, fallback = '-') => {
  if (!value) return fallback
  const parsed = parseDate(value)
  if (!parsed) return String(value)
  const time = parsed.toLocaleTimeString('en-NP', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatNepaliDate(parsed, fallback)}, ${time}`
}

export const formatNepaliDateRange = (start?: string | null, end?: string | null) =>
  `${formatNepaliDate(start)} - ${formatNepaliDate(end)}`
