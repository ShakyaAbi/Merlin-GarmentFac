import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'

type FinishedGoodForm = {
  sku: string
  productCode: string
  name: string
  description: string
  category: string
  unit: string
  sellingPrice: string
  costPrice: string
  reorderLevel: string
  notes: string
}

const emptyForm: FinishedGoodForm = {
  sku: '',
  productCode: '',
  name: '',
  description: '',
  category: '',
  unit: 'pcs',
  sellingPrice: '0',
  costPrice: '0',
  reorderLevel: '',
  notes: '',
}

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value ?? 0))

export default function FinishedGoodsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FinishedGoodForm>(emptyForm)

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<any>('/inventory/finished-goods')
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load finished goods.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [item.name, item.sku, item.productCode, item.category, item.unit].filter(Boolean).some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [items, search])

  const stats = useMemo(() => {
    const totalStock = items.reduce((sum, item) => sum + Number(item.currentStock ?? 0), 0)
    const lowStock = items.filter((item) => item.reorderLevel != null && Number(item.currentStock ?? 0) <= Number(item.reorderLevel)).length
    const totalValue = items.reduce((sum, item) => sum + Number(item.currentStock ?? 0) * Number(item.sellingPrice ?? 0), 0)
    return { total: items.length, totalStock, lowStock, totalValue }
  }, [items])

  const saveItem = async () => {
    if (!form.name.trim() || !form.unit.trim()) {
      setError('Name and unit are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await api.post('/inventory/finished-goods', {
        sku: form.sku.trim() || undefined,
        productCode: form.productCode.trim() || undefined,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        unit: form.unit.trim(),
        sellingPrice: Number(form.sellingPrice || 0),
        costPrice: Number(form.costPrice || 0),
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        notes: form.notes.trim() || undefined,
      })
      setForm(emptyForm)
      await loadItems()
    } catch (err: any) {
      setError(err?.message || 'Failed to create finished good.')
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (id: string) => {
    if (!window.confirm('Delete this finished good?')) return
    setError(null)
    try {
      await api.delete(`/inventory/finished-goods/${id}`)
      await loadItems()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete finished good.')
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Sales Master"
      title="Finished Goods"
      description="Manage sellable products used by sales invoices and inventory completion."
      backTo={{ to: '/inventory/materials', label: 'Back to materials' }}
      actions={[{ label: 'New Invoice', variant: 'outline', to: '/sales-invoices/create' }]}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <InventorySectionCard title="New Finished Good" description="Create products that can be sold once production completes.">
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Product name"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">SKU</span>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="SKU"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Product Code</span>
                <input
                  value={form.productCode}
                  onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Internal product code"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Unit</span>
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Category</span>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Shirts, trousers, accessories..."
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Selling Price</span>
                <input
                  type="number"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  min={0}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Cost Price</span>
                <input
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  min={0}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Reorder Level</span>
                <input
                  type="number"
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  min={0}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Notes</span>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Optional notes"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Product description"
              />
            </label>
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" onClick={saveItem} isLoading={saving}>
                Save Finished Good
              </Button>
              <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
                Clear
              </Button>
            </div>
          </div>
        </InventorySectionCard>

        <div className="space-y-6">
          <InventorySectionCard
            title="Finished-Goods Catalog"
            description="Search and manage the products used by the sales flow."
            action={
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search finished goods"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:w-72"
              />
            }
          >
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading finished goods...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                {search.trim() ? 'No matching finished goods found.' : 'No finished goods yet.'}
              </div>
            ) : (
              <InventoryDataTable
                caption="Finished goods register"
                columns={[
                  { label: 'Product' },
                  { label: 'Category' },
                  { label: 'Stock' },
                  { label: 'Selling Price' },
                  { label: 'Status' },
                  { label: 'Actions' },
                ]}
              >
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-3 py-4 align-top">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.productCode || item.sku || '-'}</div>
                    </td>
                    <td className="px-3 py-4 align-top text-slate-600">{item.category || '-'}</td>
                    <td className="px-3 py-4 align-top text-slate-700">{Number(item.currentStock ?? 0)}</td>
                    <td className="px-3 py-4 align-top text-slate-700">{money(item.sellingPrice)}</td>
                    <td className="px-3 py-4 align-top">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${item.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => deleteItem(item.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Products</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total stock</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.totalStock}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Low stock</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.lowStock}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Stock value</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{money(stats.totalValue)}</div>
            </div>
          </div>
        </div>
      </div>
    </InventoryPageShell>
  )
}
