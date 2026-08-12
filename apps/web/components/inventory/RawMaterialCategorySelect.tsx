import React, { useEffect, useMemo, useState } from 'react'
import { rawMaterialApi } from '../../services/rawMaterialApi'

type RawMaterialCategory = {
  id: string
  categoryName: string
  description?: string
}

type Props = {
  value: string
  onChange: (categoryId: string) => void
  label?: string
  disabled?: boolean
  allowAllOption?: boolean
  allLabel?: string
}

export function RawMaterialCategorySelect({
  value,
  onChange,
  label = 'Category',
  disabled = false,
  allowAllOption = false,
  allLabel = 'All categories',
}: Props) {
  const [categories, setCategories] = useState<RawMaterialCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    rawMaterialApi
      .getCategories()
      .then((data: any) => {
        if (!alive) return
        setCategories(Array.isArray(data) ? data : [])
      })
      .catch((err: any) => {
        if (!alive) return
        setError(err?.message || 'Failed to load material categories.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const selectedValue = useMemo(() => value || '', [value])

  return (
    <div>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">{label}</span>
        <select
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
          value={selectedValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
        >
          {allowAllOption ? (
            <option value="">{loading ? 'Loading categories...' : allLabel}</option>
          ) : (
            <option value="">{loading ? 'Loading categories...' : 'Uncategorized'}</option>
          )}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.categoryName}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
