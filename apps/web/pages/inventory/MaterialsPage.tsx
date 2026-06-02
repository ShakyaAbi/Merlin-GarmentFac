import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { api } from '../../services/api'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    api.get('/inventory/materials')
      .then((data: any) => {
        if (!alive) return
        setMaterials(Array.isArray(data) ? data : [])
      })
      .catch((err: any) => {
        if (!alive) return
        setError(err?.message || 'Failed to load materials.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [])

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((m) =>
      [m.name, m.sku, m.defaultUnit, m.type, m.description]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [materials, search])

  const lowStockMaterials = useMemo(
    () => materials.filter((m) => m.reorderLevel != null && Number(m.currentStock ?? 0) <= Number(m.reorderLevel)),
    [materials],
  )

  const totalStock = useMemo(
    () => materials.reduce((sum, m) => sum + Number(m.currentStock ?? 0), 0),
    [materials],
  )

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading materials...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/inventory/purchases" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4">
          ← Back to Purchases
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Garment Factory
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Materials</h1>
            <p className="text-slate-600 mt-1">Manage fabric, trims, accessories, and stock levels.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Button variant="outline" onClick={() => navigate('/inventory/boms/create')}>
              Create BOM
            </Button>
            <Button onClick={() => navigate('/inventory/materials/create')}>
              Create Material
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Material Catalog</h2>
                <p className="text-sm text-slate-500">Search and open a material to manage BOM links and stock.</p>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search materials"
                className="w-full md:w-72 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-3 font-medium">Name</th>
                    <th className="py-3 font-medium">SKU</th>
                    <th className="py-3 font-medium">Unit</th>
                    <th className="py-3 font-medium">Stock</th>
                    <th className="py-3 font-medium">Reorder</th>
                    <th className="py-3 font-medium">Type</th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 font-medium text-slate-900">
                        <Link to={`/inventory/materials/${m.id}`} className="text-blue-600 hover:text-blue-700">
                          {m.name}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-600">{m.sku || '—'}</td>
                      <td className="py-3 text-slate-600">{m.defaultUnit || '—'}</td>
                      <td className="py-3 text-slate-900">{m.currentStock ?? 0}</td>
                      <td className="py-3 text-slate-600">{m.reorderLevel ?? '—'}</td>
                      <td className="py-3 text-slate-600">{m.type || 'material'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/inventory/materials/${m.id}`)}>
                            View
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/inventory/boms/create?material=${m.id}`)}>
                            Create BOM
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMaterials.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-500">No materials found.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-900">Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total materials</span>
                <span className="font-semibold text-slate-900">{materials.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Low stock items</span>
                <span className="font-semibold text-amber-700">{lowStockMaterials.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total stock</span>
                <span className="font-semibold text-slate-900">{totalStock}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-900">Low Stock</h3>
            <div className="mt-3 space-y-3">
              {lowStockMaterials.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{m.name}</div>
                    <div className="text-slate-500">Reorder {m.reorderLevel ?? '—'}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/inventory/materials/${m.id}`)}>
                    Open
                  </Button>
                </div>
              ))}
              {lowStockMaterials.length === 0 && (
                <div className="text-sm text-slate-500">No low-stock materials.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate('/inventory/materials/create')}>New Material</Button>
              <Button variant="outline" onClick={() => navigate('/inventory/boms/create')}>New BOM</Button>
              <Button variant="outline" onClick={() => navigate('/inventory/suppliers')}>Suppliers</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
