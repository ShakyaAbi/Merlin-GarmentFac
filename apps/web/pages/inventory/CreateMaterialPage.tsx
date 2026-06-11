import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'

type FormState = {
  name: string
  sku: string
  defaultUnit: string
  reorderLevel: string
  costPrice: string
  description: string
  categoryId: string
  notes: string
}

export default function CreateMaterialPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState<FormState>({
    name: '',
    sku: '',
    defaultUnit: 'm',
    reorderLevel: '',
    costPrice: '',
    description: '',
    categoryId: '',
    notes: '',
  })

  useEffect(() => {
    let alive = true
    api
      .get('/inventory/material-categories')
      .then((data: any) => {
        if (!alive) return
        setCategories(Array.isArray(data) ? data : [])
      })
      .catch((err: any) => {
        if (!alive) return
        setError(err?.message || 'Failed to load material categories.')
      })
      .finally(() => {
        if (alive) setLoadingCategories(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const canSave = useMemo(() => {
    return Boolean(form.name.trim() && form.defaultUnit.trim() && !saving)
  }, [form.defaultUnit, form.name, saving])

  const save = async () => {
    if (!canSave) {
      setError('Name and default unit are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const created: any = await api.post('/inventory/materials', {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        defaultUnit: form.defaultUnit.trim(),
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        description: form.description.trim() || undefined,
        categoryId: form.categoryId || undefined,
        notes: form.notes.trim() || undefined,
      })
      navigate(`/inventory/materials/${created.id}`)
    } catch (err: any) {
      setError(err?.message || 'Failed to create material.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title="Create Material"
      description="Add a fabric, trim, or accessory."
      backTo={{ to: '/inventory/materials', label: 'Back to materials' }}
      actions={[{ label: 'View Materials', variant: 'outline', to: '/inventory/materials' }]}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InventorySectionCard title="Material Details" description="Create the material record used in purchases and BOMs.">
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Name</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Cotton fabric"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">SKU</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="Optional stock keeping unit"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Default Unit</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    value={form.defaultUnit}
                    onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}
                    placeholder="m, pcs, kg..."
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Reorder Level</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    min={0}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Cost Price</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    min={0}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Description</span>
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe this material..."
                />
              </label>
            </div>
          </InventorySectionCard>
        </div>

        <div className="space-y-6">
          <InventorySectionCard
            title="Classification"
            description="Optional category and notes for internal tracking."
          >
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Category</span>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  disabled={loadingCategories}
                >
                  <option value="">{loadingCategories ? 'Loading categories...' : 'Uncategorized'}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.categoryName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Notes</span>
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Internal notes..."
                />
              </label>
            </div>
          </InventorySectionCard>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!canSave}
              onClick={save}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? 'Saving...' : 'Save Material'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </InventoryPageShell>
  )
}
