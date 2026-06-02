import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { api } from '../../services/api'

export default function CreateMaterialPage(){
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    defaultUnit: 'm',
    reorderLevel: '',
    costPrice: '',
    description: '',
  })

  const save = async () => {
    setSaving(true)
    try {
      const created: any = await api.post('/inventory/materials', {
        ...form,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      })
      navigate(`/inventory/materials/${created.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Material</h1>
        <p className="text-slate-600 mt-1">Add a fabric, trim, or accessory.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Name</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">SKU</label>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.sku} onChange={(e)=>setForm({...form, sku: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Default Unit</label>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.defaultUnit} onChange={(e)=>setForm({...form, defaultUnit: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Reorder Level</label>
            <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.reorderLevel} onChange={(e)=>setForm({...form, reorderLevel: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Cost Price</label>
            <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.costPrice} onChange={(e)=>setForm({...form, costPrice: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Description</label>
          <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2" rows={4} value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button isLoading={saving} onClick={save}>Save Material</Button>
        </div>
      </div>
    </div>
  )
}
