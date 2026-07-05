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
  alerts: 'Alerts',
  customers: 'Customers',
  exports: 'Exports',
  'finished-goods': 'Articles',
  invitations: 'Invitations',
  materials: 'Materials',
  projects: 'Home',
  indicators: 'Indicators',
  payments: 'Payments',
  production: 'Production Batches',
  purchases: 'Purchase Invoices',
  settings: 'Settings',
  'sales-invoices': 'Sales Invoices',
  'sales-orders': 'Sales Orders',
  inventory: 'Inventory',
  suppliers: 'Suppliers',
  reports: 'Reports',
  users: 'Team',
}

export const sidebarSections: SidebarSectionConfig[] = [
  {
    key: 'workspace',
    label: 'Workspace',
    collapsible: true,
    items: [
      { icon: Home, label: 'Home', path: '/projects' },
      { icon: FolderKanban, label: 'Projects', path: '/projects/list' },
      { icon: BarChart3, label: 'Reports', path: '/reports' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    collapsible: true,
    items: [
      { icon: FolderKanban, label: 'Raw Materials', path: '/inventory/materials' },
      { icon: ClipboardCheck, label: 'Purchase Invoices', path: '/inventory/purchases' },
      { icon: Layers, label: 'Articles', path: '/inventory/finished-goods' },
      { icon: Layers, label: 'Production Batches', path: '/inventory/production' },
      { icon: AlertCircle, label: 'Alerts', path: '/inventory/alerts' },
      { icon: Command, label: 'Suppliers', path: '/inventory/suppliers' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales & Customers',
    collapsible: true,
    items: [
      { icon: FileText, label: 'Sales Invoices', path: '/sales-invoices' },
      { icon: FileText, label: 'Sales Orders', path: '/sales-orders' },
      { icon: Users, label: 'Customers', path: '/inventory/customers' },
      { icon: FileText, label: 'Payments', path: '/payments' },
    ],
  },
  {
    key: 'system',
    label: 'System',
    collapsible: false,
    items: [
      { icon: Users, label: 'Team', path: '/admin/users' },
      { icon: Users, label: 'Invitations', path: '/admin/invitations' },
      { icon: FileSpreadsheet, label: 'Exports', path: '/exports' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
  },
]
