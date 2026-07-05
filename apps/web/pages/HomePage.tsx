import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BarChart3, Package, ShoppingCart, Truck, FileText, FolderKanban, Settings, Users, Layers } from 'lucide-react'
import { InventoryPageShell } from '../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../components/inventory/InventorySectionCard'

const shortcutGroups = [
  {
    title: 'Your Shortcuts',
    items: [
      { label: 'Projects', to: '/projects/list', icon: FolderKanban },
      { label: 'Materials', to: '/inventory/materials', icon: Package },
      { label: 'Purchases', to: '/inventory/purchases', icon: ShoppingCart },
      { label: 'Production', to: '/inventory/production', icon: Layers },
    ],
  },
  {
    title: 'Reports & Masters',
    items: [
      { label: 'Sales Invoices', to: '/sales-invoices', icon: FileText },
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Suppliers', to: '/inventory/suppliers', icon: Truck },
      { label: 'Customers', to: '/inventory/customers', icon: Users },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export default function HomePage() {
  return (
    <InventoryPageShell
      eyebrow="Public"
      title="Home"
      description="Quick access to core manufacturing, inventory, and reporting areas."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <InventorySectionCard title="P&L" description="High-level operating view with a clean landing-page layout.">
          <div className="min-h-[320px] rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">Current period</div>
                <button className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  Filter
                </button>
              </div>
              <div className="text-center text-sm text-slate-500">2026-2027</div>
            </div>
          </div>
        </InventorySectionCard>

        <div className="space-y-6">
          <InventorySectionCard title="Quick Snapshot" description="Jump into the most common areas.">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Projects', value: 'Open', href: '/projects/list' },
                { label: 'Materials', value: 'Catalog', href: '/inventory/materials' },
                { label: 'Purchases', value: 'Register', href: '/inventory/purchases' },
                { label: 'Production', value: 'Orders', href: '/inventory/production' },
              ].map((item) => (
                <Link key={item.label} to={item.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200">
                  <div className="text-xs font-semibold text-slate-400">{item.label}</div>
                  <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                    {item.value}
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          </InventorySectionCard>

          {shortcutGroups.map((group) => (
            <InventorySectionCard key={group.title} title={group.title}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                  >
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </InventorySectionCard>
          ))}
        </div>
      </div>
    </InventoryPageShell>
  )
}
