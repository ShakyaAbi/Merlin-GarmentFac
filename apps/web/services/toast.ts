export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export type ToastPayload = {
  id?: string
  title: string
  description?: string
  tone?: ToastTone
  durationMs?: number
}

const TOAST_EVENT = 'merlin:toast'

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`

const asString = (value: unknown) => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

const extractDetails = (details: any) => {
  if (!details) return ''
  if (typeof details === 'string') return details
  if (Array.isArray(details)) {
    const first = details[0]
    return asString(first?.message || first?.path?.join?.('.') || '')
  }
  if (Array.isArray(details?.errors)) {
    const first = details.errors[0]
    return asString(first?.message || first?.path?.join?.('.') || '')
  }
  if (typeof details === 'object') {
    return asString(details.message || details.error || details.reason || '')
  }
  return ''
}

export const showToast = (toast: ToastPayload) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, {
      detail: { ...toast, id: toast.id || createId() },
    }),
  )
}

export const showErrorToast = (title: string, description?: string) => {
  showToast({ title, description, tone: 'error' })
}

export const showApiErrorToast = (error: any, fallback = 'Request failed') => {
  const title = error?.message || fallback
  const description = extractDetails(error?.details)
  showErrorToast(title, description || undefined)
}

export const toastEventName = TOAST_EVENT
