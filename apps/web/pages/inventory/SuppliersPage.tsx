import React, { useEffect, useMemo, useState } from 'react'
import { request } from '../../services/apiClient'

type SupplierForm = {
  name: string
  contactName: string
  phone: string
  email: string
  address: string
  panVatNumber: string
  externalRef: string
  notes: string
}

const emptyForm: SupplierForm = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  panVatNumber: '',
  externalRef: '',
  notes: '',
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<SupplierForm>(emptyForm)

  const loadSuppliers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await request<any[]>('/inventory/suppliers')
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load suppliers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contactName, supplier.email, supplier.phone, supplier.externalRef]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [search, suppliers])

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Supplier name is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await request('/inventory/suppliers', {
        method: 'POST',
        body: {
          ...form,
          name: form.name.trim(),
        },
      })
      setForm(emptyForm)
      await loadSuppliers()
    } catch (err: any) {
      setError(err?.message || 'Failed to create supplier.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
        <p className="mt-1 text-slate-600">Manage vendor contacts directly inside Merlin.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New Supplier</h2>
            <p className="text-sm text-slate-500">Create a vendor record for purchases.</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Name</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Supplier name"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Contact Name</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="Primary contact"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Phone</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Email</span>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email address"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Address</span>
              <textarea
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Supplier address"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">PAN / VAT</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={form.panVatNumber}
                onChange={(e) => setForm({ ...form, panVatNumber: e.target.value })}
                placeholder="Tax number"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">External Ref</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={form.externalRef}
                onChange={(e) => setForm({ ...form, externalRef: e.target.value })}
                placeholder="Optional vendor code"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Notes</span>
              <textarea
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional internal notes"
              />
            </label>
          </div>

          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? 'Saving...' : 'Create Supplier'}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Supplier Directory</h2>
              <p className="text-sm text-slate-500">Search existing vendors and review contact details.</p>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:w-72"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading suppliers...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              {search.trim() ? 'No matching suppliers found.' : 'No suppliers yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-3 font-medium">Name</th>
                    <th className="py-3 font-medium">Contact</th>
                    <th className="py-3 font-medium">Phone</th>
                    <th className="py-3 font-medium">Email</th>
                    <th className="py-3 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 font-medium text-slate-900">{supplier.name}</td>
                      <td className="py-3 text-slate-600">{supplier.contactName || '—'}</td>
                      <td className="py-3 text-slate-600">{supplier.phone || '—'}</td>
                      <td className="py-3 text-slate-600">{supplier.email || '—'}</td>
                      <td className="py-3 text-slate-600">{supplier.externalRef || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
