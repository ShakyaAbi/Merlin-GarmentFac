const KATHMANDU_TIME_ZONE = 'Asia/Kathmandu'

export const getKathmanduDateInput = (value: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KATHMANDU_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    return value.toISOString().slice(0, 10)
  }

  return `${year}-${month}-${day}`
}
