const ONES = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
]

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const twoDigitWords = (value: number) => {
  if (value < 20) return ONES[value]
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return ones ? `${TENS[tens]}-${ONES[ones]}` : TENS[tens]
}

const threeDigitWords = (value: number) => {
  const hundreds = Math.floor(value / 100)
  const remainder = value % 100

  if (!hundreds) return twoDigitWords(remainder)
  if (!remainder) return `${ONES[hundreds]} Hundred`
  return `${ONES[hundreds]} Hundred ${twoDigitWords(remainder)}`
}

const chunkWords = (value: number): string => {
  if (value < 100) return twoDigitWords(value)
  if (value < 1000) return threeDigitWords(value)
  return amountToWordsInteger(value)
}

const amountToWordsInteger = (value: number) => {
  if (value === 0) return 'Zero'

  const parts: string[] = []
  let remainder = value

  const crore = Math.floor(remainder / 10000000)
  if (crore) {
    parts.push(`${chunkWords(crore)} Crore`)
    remainder %= 10000000
  }

  const lakh = Math.floor(remainder / 100000)
  if (lakh) {
    parts.push(`${chunkWords(lakh)} Lakh`)
    remainder %= 100000
  }

  const thousand = Math.floor(remainder / 1000)
  if (thousand) {
    parts.push(`${chunkWords(thousand)} Thousand`)
    remainder %= 1000
  }

  if (remainder) {
    parts.push(threeDigitWords(remainder))
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function amountInWords(value: number | string | null | undefined) {
  const amount = Math.max(toNumber(value), 0)
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100
  const rupees = Math.floor(rounded)
  const paisa = Math.round((rounded - rupees) * 100)

  const parts: string[] = []
  if (rupees > 0) {
    parts.push(`${amountToWordsInteger(rupees)} Rupees`)
  }
  if (paisa > 0) {
    parts.push(`${twoDigitWords(paisa)} Paisa`)
  }

  if (parts.length === 0) {
    return 'Zero Rupees Only'
  }

  return `${parts.join(' and ')} Only`
}
