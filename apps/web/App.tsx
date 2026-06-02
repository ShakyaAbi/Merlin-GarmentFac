
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
import SuppliersPage from './pages/inventory/SuppliersPage'
import MaterialsPage from './pages/inventory/MaterialsPage'
import PurchasesPage from './pages/inventory/PurchasesPage'
import PurchaseCreate from './pages/inventory/PurchaseCreate'
import AlertsPage from './pages/inventory/AlertsPage'
import MaterialDetail from './pages/inventory/MaterialDetail'

import { PrivateRoute } from './components/PrivateRoute';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/google-callback" element={<GoogleCallback />} />

        <Route element={<PrivateRoute><Layout><Outlet /></Layout></PrivateRoute>}>
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/indicators/:id" element={<IndicatorDetail />} />
            <Route path="/inventory/suppliers" element={<SuppliersPage />} />
            <Route path="/inventory/materials" element={<MaterialsPage />} />
            <Route path="/inventory/purchases" element={<PurchasesPage />} />
            <Route path="/inventory/purchases/create" element={<PurchaseCreate />} />
            <Route path="/inventory/alerts" element={<AlertsPage />} />
            <Route path="/inventory/materials/:id" element={<MaterialDetail />} />
            <Route path="/data-entry" element={<DataEntry />} />
            <Route path="/settings" element={<Settings />} />
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
