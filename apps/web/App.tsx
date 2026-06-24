
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Login } from './pages/Login';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { IndicatorDetail } from './pages/IndicatorDetail';
import { Settings } from './pages/Settings';
import { DataEntry } from './pages/DataEntry';
import { Register } from './pages/Register';
import { AdminUsers } from './pages/AdminUsers';
import { AdminInvitations } from './pages/AdminInvitations';
import { GoogleCallback } from './pages/GoogleCallback';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage'
import SuppliersPage from './pages/inventory/SuppliersPage'
import SupplierDetailPage from './pages/inventory/SupplierDetailPage'
import MaterialsPage from './pages/inventory/MaterialsPage'
import CreateMaterialPage from './pages/inventory/CreateMaterialPage'
import PurchasesPage from './pages/inventory/PurchasesPage'
import PurchaseCreate from './pages/inventory/PurchaseCreate'
import PurchaseDetailPage from './pages/inventory/PurchaseDetailPage'
import AlertsPage from './pages/inventory/AlertsPage'
import MaterialDetail from './pages/inventory/MaterialDetail'
import CreateArticlePage from './pages/inventory/CreateArticlePage'
import CustomersPage from './pages/inventory/CustomersPage'
import CustomerDetailPage from './pages/inventory/CustomerDetailPage'
import FinishedGoodsPage from './pages/inventory/FinishedGoodsPage'
import FinishedGoodDetailPage from './pages/inventory/FinishedGoodDetailPage'
import OperationsDashboardPage from './pages/inventory/OperationsDashboardPage'
import ProductionOrdersPage from './pages/inventory/ProductionOrdersPage'
import ProductionOrderDetailPage from './pages/inventory/ProductionOrderDetailPage'
import SalesInvoiceListPage from './pages/sales/SalesInvoiceListPage'
import SalesInvoiceCreatePage from './pages/sales/SalesInvoiceCreatePage'
import SalesInvoiceDetailPage from './pages/sales/SalesInvoiceDetailPage'
import SalesOrdersPage from './pages/sales/SalesOrdersPage'
import SalesOrderDetailPage from './pages/sales/SalesOrderDetailPage'
import ExpensesPage from './pages/finance/ExpensesPage'
import ExpenseDetailPage from './pages/finance/ExpenseDetailPage'
import PaymentsPage from './pages/finance/PaymentsPage'
import ExportCenterPage from './pages/ExportCenterPage'

import { PrivateRoute } from './components/PrivateRoute';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/google-callback" element={<GoogleCallback />} />

        <Route element={<PrivateRoute><Layout><Outlet /></Layout></PrivateRoute>}>
            <Route path="/projects" element={<HomePage />} />
            <Route path="/projects/list" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/indicators/:id" element={<IndicatorDetail />} />
            <Route path="/inventory/suppliers" element={<SuppliersPage />} />
            <Route path="/inventory/suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="/inventory/customers" element={<CustomersPage />} />
            <Route path="/inventory/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/inventory" element={<Navigate to="/inventory/materials" replace />} />
            <Route path="/inventory/materials" element={<MaterialsPage />} />
            <Route path="/inventory/finished-goods" element={<FinishedGoodsPage />} />
            <Route path="/inventory/finished-goods/:id" element={<FinishedGoodDetailPage />} />
            <Route path="/inventory/production" element={<ProductionOrdersPage />} />
            <Route path="/inventory/production/:id" element={<ProductionOrderDetailPage />} />
            <Route path="/inventory/materials/create" element={<CreateMaterialPage />} />
            <Route path="/inventory/materials/entry" element={<Navigate to="/inventory/materials" replace />} />
            <Route path="/inventory/purchases" element={<PurchasesPage />} />
            <Route path="/inventory/purchases/create" element={<PurchaseCreate />} />
            <Route path="/inventory/purchases/:id" element={<PurchaseDetailPage />} />
            <Route path="/inventory/alerts" element={<AlertsPage />} />
            <Route path="/inventory/materials/:id" element={<MaterialDetail />} />
            <Route path="/inventory/boms/create" element={<Navigate to="/inventory/finished-goods/create" replace />} />
            <Route path="/inventory/finished-goods/create" element={<CreateArticlePage />} />
            <Route path="/sales-invoices" element={<SalesInvoiceListPage />} />
            <Route path="/sales-invoices/create" element={<SalesInvoiceCreatePage />} />
            <Route path="/sales-invoices/:id" element={<SalesInvoiceDetailPage />} />
            <Route path="/sales-orders" element={<SalesOrdersPage />} />
            <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/exports" element={<ExportCenterPage />} />
            <Route path="/reports" element={<OperationsDashboardPage />} />
            <Route path="/data-entry" element={<DataEntry />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/invitations" element={<AdminInvitations />} />
            <Route path="/indicators" element={<Navigate to="/projects" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
