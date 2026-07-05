import { prisma } from '../prisma'

type ReportingPeriod = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
type ReportingGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

function toNumber(value: any) {
  return Number(value ?? 0)
}

function money(value: any) {
  return Number(value ?? 0)
}

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date)
  const day = copy.getDay()
  const offset = (day + 6) % 7
  copy.setDate(copy.getDate() - offset)
  return copy
}

function startOfMonth(date: Date) {
  const copy = startOfDay(date)
  copy.setDate(1)
  return copy
}

function startOfQuarter(date: Date) {
  const copy = startOfDay(date)
  const quarterStartMonth = Math.floor(copy.getMonth() / 3) * 3
  copy.setMonth(quarterStartMonth, 1)
  return copy
}

function startOfYear(date: Date) {
  const copy = startOfDay(date)
  copy.setMonth(0, 1)
  return copy
}

function resolvePeriodWindow(opts: { period?: ReportingPeriod; from?: string; to?: string }) {
  const now = new Date()
  const period = opts.period || 'all'

  if (period === 'all') {
    return { period, fromDate: null as Date | null, toDate: null as Date | null, label: 'All time' }
  }

  if (period === 'custom') {
    const fromDate = opts.from ? startOfDay(new Date(opts.from)) : null
    const toDate = opts.to ? endOfDay(new Date(opts.to)) : null
    return {
      period,
      fromDate,
      toDate,
      label: fromDate || toDate
        ? `${fromDate ? fromDate.toISOString().slice(0, 10) : 'Any'} to ${toDate ? toDate.toISOString().slice(0, 10) : 'Any'}`
        : 'Custom range',
    }
  }

  switch (period) {
    case 'today':
      return { period, fromDate: startOfDay(now), toDate: endOfDay(now), label: 'Today' }
    case 'week': {
      const fromDate = startOfWeek(now)
      return { period, fromDate, toDate: endOfDay(now), label: 'This week' }
    }
    case 'month': {
      const fromDate = startOfMonth(now)
      return { period, fromDate, toDate: endOfDay(now), label: 'This month' }
    }
    case 'quarter': {
      const fromDate = startOfQuarter(now)
      return { period, fromDate, toDate: endOfDay(now), label: 'This quarter' }
    }
    case 'year': {
      const fromDate = startOfYear(now)
      return { period, fromDate, toDate: endOfDay(now), label: 'This year' }
    }
    default:
      return { period: 'all' as const, fromDate: null, toDate: null, label: 'All time' }
  }
}

function parseDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? new Date(value) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function includesDateRange(dateField: string, fromDate: Date | null, toDate: Date | null) {
  if (!fromDate && !toDate) return undefined
  const where: any = {}
  if (fromDate) where.gte = fromDate
  if (toDate) where.lte = toDate
  return { [dateField]: where }
}

function costFromBomItems(order: any) {
  const plannedQty = toNumber(order.quantityPlanned)
  const bomItems = Array.isArray(order.finishedGood?.bomData?.items) ? order.finishedGood.bomData.items : []
  return bomItems.reduce((sum: number, item: any) => {
    const unitCost = toNumber(item.rawMaterial?.costPrice ?? item.rawMaterial?.averageUnitCost ?? 0)
    const consumption = toNumber(item.consumption)
    return sum + unitCost * consumption * plannedQty
  }, 0)
}

function productionCostBase(order: any) {
  return costFromBomItems(order)
}

function classifyOverheadExpense(expense: any) {
  const text = `${expense?.category || ''} ${expense?.description || ''} ${expense?.vendor || ''}`.toLowerCase()
  return [
    'rent',
    'utilities',
    'electric',
    'power',
    'water',
    'factory',
    'maintenance',
    'repair',
    'salary',
    'wage',
    'payroll',
    'supervisor',
    'admin',
    'insurance',
    'depreciation',
    'transport',
    'freight',
    'packing',
    'consumable',
  ].some((keyword) => text.includes(keyword))
}

function classifyOverheadBucket(expense: any) {
  const text = `${expense?.category || ''} ${expense?.description || ''} ${expense?.vendor || ''}`.toLowerCase()
  if (['rent', 'utilities', 'electric', 'power', 'water', 'factory', 'maintenance', 'repair', 'insurance', 'depreciation'].some((keyword) => text.includes(keyword))) {
    return 'Factory overhead'
  }
  if (['salary', 'wage', 'payroll', 'supervisor', 'operator', 'production', 'line', 'shift'].some((keyword) => text.includes(keyword))) {
    return 'Production labor'
  }
  if (['transport', 'freight', 'packing', 'consumable', 'admin', 'office', 'stationery', 'marketing', 'selling'].some((keyword) => text.includes(keyword))) {
    return 'Selling and admin'
  }
  return 'Other overhead'
}

function bucketStart(date: Date, granularity: ReportingGranularity) {
  switch (granularity) {
    case 'day':
      return startOfDay(date)
    case 'week':
      return startOfWeek(date)
    case 'month':
      return startOfMonth(date)
    case 'quarter':
      return startOfQuarter(date)
    case 'year':
      return startOfYear(date)
  }
}

function bucketLabel(date: Date, granularity: ReportingGranularity) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: granularity === 'year' ? 'numeric' : undefined,
  })

  switch (granularity) {
    case 'day':
      return formatter.format(date)
    case 'week': {
      const end = new Date(date)
      end.setDate(end.getDate() + 6)
      return `${formatter.format(date)} - ${formatter.format(end)}`
    }
    case 'month':
      return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date)
    case 'quarter': {
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `Q${quarter} ${date.getFullYear()}`
    }
    case 'year':
      return String(date.getFullYear())
  }
}

function buildTrendBuckets(rows: Array<{ date: Date; sales: number; purchases: number; expenses: number }>, granularity: ReportingGranularity) {
  const buckets = new Map<string, { period: string; sales: number; purchases: number; expenses: number; grossProfit: number; netProfit: number }>()

  for (const row of rows) {
    const keyDate = bucketStart(row.date, granularity)
    const key = keyDate.toISOString()
    const existing =
      buckets.get(key) ||
      {
        period: bucketLabel(keyDate, granularity),
        sales: 0,
        purchases: 0,
        expenses: 0,
        grossProfit: 0,
        netProfit: 0,
      }
    existing.sales += row.sales
    existing.purchases += row.purchases
    existing.expenses += row.expenses
    existing.grossProfit = existing.sales - existing.purchases
    existing.netProfit = existing.grossProfit - existing.expenses
    buckets.set(key, existing)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value)
}

function buildTransactionRows(input: {
  invoices: any[]
  purchases: any[]
  expenses: any[]
  productionOrders: any[]
}) {
  const rows: Array<{
    id: string
    entryDate: string
    transactionType: string
    transactionKey: string
    name: string
    totalAmount: number
    recPaidAmount: number | null
    balanceAmount: number | null
    note?: string | null
    href?: string
    tone: 'slate' | 'emerald' | 'amber' | 'rose'
  }> = []

  for (const invoice of input.invoices) {
    rows.push({
      id: `invoice-${invoice.id}`,
      entryDate: invoice.invoiceDate || invoice.createdAt || new Date().toISOString(),
      transactionType: 'Sales Invoice',
      transactionKey: 'SALES_INVOICE',
      name: invoice.customer?.customerName || invoice.customerName || invoice.invoiceNumber || invoice.id,
      totalAmount: Number(invoice.grandTotal ?? 0),
      recPaidAmount: Number(invoice.paidAmount ?? 0),
      balanceAmount: Number(invoice.dueAmount ?? 0),
      note: invoice.invoiceNumber || null,
      href: `/sales-invoices/${invoice.id}`,
      tone: 'emerald',
    })
  }

  for (const purchase of input.purchases) {
    rows.push({
      id: `purchase-${purchase.id}`,
      entryDate: purchase.invoiceDate || purchase.createdAt || new Date().toISOString(),
      transactionType: 'Purchase',
      transactionKey: 'PURCHASE',
      name: purchase.supplier?.name || purchase.supplierName || purchase.invoiceNumber || purchase.id,
      totalAmount: Number(purchase.totalAmount ?? 0),
      recPaidAmount: null,
      balanceAmount: Number(purchase.totalAmount ?? 0),
      note: purchase.invoiceNumber || null,
      href: purchase.id ? `/inventory/purchases/${purchase.id}` : undefined,
      tone: 'slate',
    })
  }

  for (const expense of input.expenses) {
    rows.push({
      id: `expense-${expense.id}`,
      entryDate: expense.expenseDate || expense.createdAt || new Date().toISOString(),
      transactionType: 'Expense',
      transactionKey: 'EXPENSE',
      name: expense.description || expense.category || expense.vendor || expense.id,
      totalAmount: Number(expense.amount ?? 0),
      recPaidAmount: Number(expense.amount ?? 0),
      balanceAmount: null,
      note: expense.vendor || null,
      tone: 'rose',
    })
  }

  for (const order of input.productionOrders) {
    rows.push({
      id: `production-${order.id}`,
      entryDate: order.createdAt || new Date().toISOString(),
      transactionType: 'Production Batch',
      transactionKey: 'PRODUCTION',
      name: order.finishedGoodName || order.finishedGood?.name || order.orderNumber || order.id,
      totalAmount: Number(order.fullyAbsorbedCost ?? order.baseCost ?? 0),
      recPaidAmount: null,
      balanceAmount: null,
      note: order.status || null,
      href: order.id ? `/inventory/production/${order.id}` : undefined,
      tone: 'amber',
    })
  }

  return rows.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
}

export async function getOperationsSummary(opts: { from?: string; to?: string; period?: ReportingPeriod; granularity?: ReportingGranularity } = {}) {
  const resolved = resolvePeriodWindow({ period: opts.period, from: opts.from, to: opts.to })
  const granularity = opts.granularity || (resolved.period === 'today' ? 'day' : resolved.period === 'week' ? 'day' : resolved.period === 'month' ? 'day' : resolved.period === 'quarter' ? 'week' : 'month')

  const invoiceDateWhere = includesDateRange('invoiceDate', resolved.fromDate, resolved.toDate)
  const expenseDateWhere = includesDateRange('expenseDate', resolved.fromDate, resolved.toDate)
  const productionDateWhere = includesDateRange('createdAt', resolved.fromDate, resolved.toDate)
  const purchaseDateWhere = includesDateRange('invoiceDate', resolved.fromDate, resolved.toDate)

  const [materials, finishedGoods, suppliers, customers, invoices, purchases, expenses, productionOrders] = await Promise.all([
    prisma.rawMaterial.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, reorderLevel: true },
    }),
    prisma.finishedGoodProduct.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, reorderLevel: true },
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, customerName: true },
    }),
    prisma.salesInvoice.findMany({
      include: { customer: true },
      where: invoiceDateWhere ? { invoiceDate: invoiceDateWhere.invoiceDate } : undefined,
      orderBy: { invoiceDate: 'desc' },
    }),
    prisma.purchase.findMany({
      include: { supplier: true },
      where: purchaseDateWhere ? { invoiceDate: purchaseDateWhere.invoiceDate } : undefined,
      orderBy: { invoiceDate: 'desc' },
    }),
    prisma.expense.findMany({
      where: {
        deletedAt: null,
        ...(expenseDateWhere ? expenseDateWhere : {}),
      },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.productionOrder.findMany({
      include: {
        finishedGood: true,
      },
      where: productionDateWhere ? { createdAt: productionDateWhere.createdAt } : undefined,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const rawMaterialStockRows = materials.length
    ? await prisma.stockTransaction.groupBy({
        by: ['rawMaterialId'],
        where: { rawMaterialId: { in: materials.map((item) => item.id) } },
        _sum: { change: true },
      })
    : []
  const finishedGoodStockRows = finishedGoods.length
    ? await prisma.finishedGoodStockTransaction.groupBy({
        by: ['productId'],
        where: { productId: { in: finishedGoods.map((item) => item.id) } },
        _sum: { change: true },
      })
    : []

  const rawStockMap = new Map(rawMaterialStockRows.map((row) => [row.rawMaterialId, Number(row._sum.change || 0)]))
  const fgStockMap = new Map(finishedGoodStockRows.map((row) => [row.productId, Number(row._sum.change || 0)]))

  const normalizedMaterials = materials.map((item) => ({
    ...item,
    currentStock: rawStockMap.get(item.id) || 0,
  }))
  const normalizedFinishedGoods = finishedGoods.map((item) => ({
    ...item,
    currentStock: fgStockMap.get(item.id) || 0,
  }))

  const lowStockMaterials = normalizedMaterials.filter((item) => item.reorderLevel != null && Number(item.currentStock ?? 0) <= Number(item.reorderLevel))
  const lowStockFinishedGoods = normalizedFinishedGoods.filter((item) => item.reorderLevel != null && Number(item.currentStock ?? 0) <= Number(item.reorderLevel))

  const salesTotal = invoices.reduce((sum, invoice) => sum + money(invoice.grandTotal), 0)
  const paidInvoiceTotal = invoices.reduce((sum, invoice) => sum + money(invoice.paidAmount), 0)
  const dueTotal = invoices.reduce((sum, invoice) => sum + money(invoice.dueAmount), 0)
  const expenseTotal = expenses.reduce((sum, expense) => sum + money(expense.amount), 0)
  const overheadExpenseTotal = expenses.filter(classifyOverheadExpense).reduce((sum, expense) => sum + money(expense.amount), 0)
  const nonManufacturingExpenseTotal = expenseTotal - overheadExpenseTotal
  const overheadAllocations = expenses
    .filter(classifyOverheadExpense)
    .reduce<Record<string, number>>((allocations, expense) => {
      const bucket = classifyOverheadBucket(expense)
      allocations[bucket] = (allocations[bucket] || 0) + money(expense.amount)
      return allocations
    }, {})
  const purchaseValue = purchases.reduce((sum, purchase) => sum + money(purchase.totalAmount), 0)
  const productionMaterialCost = productionOrders.reduce((sum, order) => sum + costFromBomItems(order), 0)
  const workInProgressCost = productionOrders
    .filter((order) => String(order.status || '').toUpperCase() !== 'COMPLETED')
    .reduce((sum, order) => sum + costFromBomItems(order), 0)
  const absorbedOverhead = overheadExpenseTotal
  const manufacturingMargin = salesTotal - productionMaterialCost - absorbedOverhead
  const estimatedProfit = salesTotal - purchaseValue - expenseTotal
  const totalProductionBase = productionOrders.reduce((sum, order) => sum + productionCostBase(order), 0)
  const overheadRate = totalProductionBase > 0 ? absorbedOverhead / totalProductionBase : 0
  const productionOrderAllocations = productionOrders.map((order) => {
    const baseCost = productionCostBase(order)
    const overhead = baseCost * overheadRate
    const fullyAbsorbedCost = baseCost + overhead
    return {
      id: order.id,
      createdAt: order.createdAt,
      orderNumber: order.orderNumber || order.id,
      finishedGoodName: order.finishedGoodName || order.finishedGood?.name || '-',
      status: order.status,
      quantityPlanned: toNumber(order.quantityPlanned),
      baseCost,
      allocatedOverhead: overhead,
      fullyAbsorbedCost,
    }
  })

  const transactions = buildTransactionRows({
    invoices,
    purchases,
    expenses,
    productionOrders: productionOrderAllocations,
  })

  const trendSource = transactions.map((row) => ({
    date: parseDate(row.entryDate) || new Date(),
    sales: row.transactionKey === 'SALES_INVOICE' ? row.totalAmount : 0,
    purchases: row.transactionKey === 'PURCHASE' ? row.totalAmount : 0,
    expenses: row.transactionKey === 'EXPENSE' ? row.totalAmount : 0,
  }))
  const trend = buildTrendBuckets(trendSource, granularity)

  return {
    period: {
      key: resolved.period,
      label: resolved.label,
      from: resolved.fromDate ? resolved.fromDate.toISOString() : null,
      to: resolved.toDate ? resolved.toDate.toISOString() : null,
      granularity,
    },
    counts: {
      materials: normalizedMaterials.length,
      finishedGoods: normalizedFinishedGoods.length,
      suppliers: suppliers.length,
      customers: customers.length,
      openInvoices: invoices.filter((invoice) => Number(invoice.dueAmount ?? 0) > 0).length,
      lowStockMaterials: lowStockMaterials.length,
      lowStockFinishedGoods: lowStockFinishedGoods.length,
    },
    money: {
      salesTotal,
      paidInvoiceTotal,
      dueTotal,
      purchaseValue,
      expenseTotal,
      overheadExpenseTotal,
      nonManufacturingExpenseTotal,
      overheadAllocationCount: Object.keys(overheadAllocations).length,
      productionMaterialCost,
      workInProgressCost,
      absorbedOverhead,
      grossMargin: manufacturingMargin,
      manufacturingMargin,
      overheadRate,
      estimatedProfit,
    },
    trend,
    transactions,
    recent: {
      invoices: invoices.slice(0, 8),
      purchases: purchases.slice(0, 8),
      productionOrders: productionOrders.slice(0, 8),
    },
    lists: {
      lowStockMaterials,
      lowStockFinishedGoods,
      materials: normalizedMaterials,
      finishedGoods: normalizedFinishedGoods,
      suppliers,
      customers,
      expenses: expenses.slice(0, 8),
      overheadAllocations: Object.entries(overheadAllocations)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      productionOrderAllocations: productionOrderAllocations.slice(0, 8),
    },
  }
}
