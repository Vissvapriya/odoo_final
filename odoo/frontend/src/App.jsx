import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store/store';
import theme from './theme';
import { SocketProvider } from './context/SocketContext';
import RoleGuard from './components/RoleGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import Products from './pages/admin/Products';
import Vendors from './pages/admin/Vendors';
import Boms from './pages/admin/Boms';
import SalesOrders from './pages/admin/SalesOrders';
import PurchaseOrders from './pages/admin/PurchaseOrders';
import ManufacturingOrders from './pages/admin/ManufacturingOrders';
import AuditLogs from './pages/admin/AuditLogs';
import Customers from './pages/admin/Customers';
import StockLedger from './pages/admin/StockLedger';

import OwnerDashboard from './pages/dashboard/OwnerDashboard';
import SalesDashboard from './pages/dashboard/SalesDashboard';
import PurchaseDashboard from './pages/dashboard/PurchaseDashboard';
import ManufacturingDashboard from './pages/dashboard/ManufacturingDashboard';
import InventoryDashboard from './pages/dashboard/InventoryDashboard';

const App = () => {
  const allRoles = ['ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'];

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Private Protected Routes */}
              <Route path="/" element={<Layout />}>
                {/* Admin and Core shared Entity Routes */}
                <Route
                  path="admin/dashboard"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <AdminDashboard />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <UserManagement />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/products"
                  element={
                    <RoleGuard allowedRoles={allRoles}>
                      <Products />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/vendors"
                  element={
                    <RoleGuard allowedRoles={allRoles}>
                      <Vendors />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/customers"
                  element={
                    <RoleGuard allowedRoles={allRoles}>
                      <Customers />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/boms"
                  element={
                    <RoleGuard allowedRoles={allRoles}>
                      <Boms />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/sales-orders"
                  element={
                    <RoleGuard allowedRoles={allRoles}>
                      <SalesOrders />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/purchase-orders"
                  element={
                    <RoleGuard allowedRoles={allRoles}>
                      <PurchaseOrders />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/manufacturing-orders"
                  element={
                    <RoleGuard allowedRoles={allRoles}>
                      <ManufacturingOrders />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/audit-logs"
                  element={
                    <RoleGuard allowedRoles={['ADMIN', 'OWNER']}>
                      <AuditLogs />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/stock-ledger"
                  element={
                    <RoleGuard allowedRoles={allRoles}>
                      <StockLedger />
                    </RoleGuard>
                  }
                />

                {/* Other Role Landing Placeholders */}
                <Route
                  path="owner/dashboard"
                  element={
                    <RoleGuard allowedRoles={['OWNER']}>
                      <OwnerDashboard />
                    </RoleGuard>
                  }
                />
                <Route
                  path="sales/dashboard"
                  element={
                    <RoleGuard allowedRoles={['SALES']}>
                      <SalesDashboard />
                    </RoleGuard>
                  }
                />
                <Route
                  path="purchase/dashboard"
                  element={
                    <RoleGuard allowedRoles={['PURCHASE']}>
                      <PurchaseDashboard />
                    </RoleGuard>
                  }
                />
                <Route
                  path="manufacturing/dashboard"
                  element={
                    <RoleGuard allowedRoles={['MANUFACTURING']}>
                      <ManufacturingDashboard />
                    </RoleGuard>
                  }
                />
                <Route
                  path="inventory/dashboard"
                  element={
                    <RoleGuard allowedRoles={['INVENTORY']}>
                      <InventoryDashboard />
                    </RoleGuard>
                  }
                />

                {/* Default Fallback Redirect based on Login Status */}
                <Route index element={<Navigate to="/login" replace />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
