import React from 'react'
import {
  BarChart3,
  ClipboardCheck,
  Command,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Home,
  Layers,
  Settings,
  Users,
  AlertCircle,
} from 'lucide-react'

export type SidebarItem = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
}

export type SidebarSectionConfig = {
  key: string
  label: string
  items: SidebarItem[]
  collapsible?: boolean
}

export const routeLabelMap: Record<string, string> = {
  admin: 'Admin',
  projects: 'Home',
  indicators: 'Indicators',
  settings: 'Settings',
  'sales-invoices': 'Sales Invoices',
  'sales-orders': 'Sales Orders',
  customers: 'Customers',
  inventory: 'Inventory',
  suppliers: 'Suppliers',
  purchases: 'Purchase Invoices',
  reports: 'Reports',
}

export const sidebarSections: SidebarSectionConfig[] = [
  {
    key: 'public',
    label: 'Public',
    collapsible: true,
    items: [
      { icon: Home, label: 'Home', path: '/projects' },
      { icon: BarChart3, label: 'Reports', path: '/reports' },
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    collapsible: true,
    items: [
      { icon: FileText, label: 'Expenses', path: '/expenses' },
      { icon: FileText, label: 'Payments', path: '/payments' },
    ],
  },
  {
    key: 'buying',
    label: 'Buying',
    collapsible: true,
    items: [
      { icon: ClipboardCheck, label: 'Purchase Invoices', path: '/inventory/purchases' },
      { icon: Command, label: 'Suppliers', path: '/inventory/suppliers' },
    ],
  },
  {
    key: 'selling',
    label: 'Selling',
    collapsible: true,
    items: [
      { icon: FileText, label: 'Sales Invoices', path: '/sales-invoices' },
      { icon: Users, label: 'Customers', path: '/inventory/customers' },
    ],
  },
  {
    key: 'stock',
    label: 'Stock',
    collapsible: true,
    items: [
      { icon: FolderKanban, label: 'Raw Materials', path: '/inventory/materials' },
      { icon: Layers, label: 'Articles', path: '/inventory/finished-goods' },
      { icon: Layers, label: 'Production Batches', path: '/inventory/production' },
      { icon: AlertCircle, label: 'Alerts', path: '/inventory/alerts' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    collapsible: true,
    items: [
      { icon: Users, label: 'Invitations', path: '/admin/invitations' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    collapsible: true,
    items: [
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: FileSpreadsheet, label: 'Exports', path: '/exports' },
      { icon: Users, label: 'Team', path: '/admin/users' },
    ],
  },
]
