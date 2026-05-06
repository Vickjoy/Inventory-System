// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './utils/api';
import Login from './pages/Login/Login';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import Sales from './pages/Sales/Sales';
import OutstandingSupplies from './pages/Sales/OutstandingSupplies';
import Customers from './pages/Customers/Customers';
import CustomerHistory from './pages/Customers/CustomerHistory';
import Suppliers from './pages/Suppliers/Suppliers';
import StockEntries from './pages/StockEntries/StockEntries';
import Reports from './pages/Reports/Reports';
import PendingApprovals from './pages/PendingApprovals/PendingApprovals';
import ReceivePayments from './pages/ReceivePayments/ReceivePayments';
import StockDiscrepancyReport from './pages/StockDiscrepancyReport/StockDiscrepancyReport';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import AdminRoute from './components/AdminRoute/AdminRoute';
import DirectorRoute from './components/DirectorRoute/DirectorRoute';
import './App.css';

const POLL_INTERVAL_MS = 30000;

function App() {
  const { loading, isAdmin } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await api.getPendingSales();
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setPendingCount(list.length);
    } catch {
      // Silently fail
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAdmin, fetchPendingCount]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute><Layout pendingCount={pendingCount} /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/outstanding-supplies" element={<OutstandingSupplies />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:customerId/history" element={<CustomerHistory />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/stock-entries" element={<StockEntries />} />
        <Route path="/reports" element={<Reports />} />

        {/* Admin-only routes */}
        <Route
          path="/pending-approvals"
          element={
            <AdminRoute>
              <PendingApprovals onCountChange={setPendingCount} />
            </AdminRoute>
          }
        />
        <Route
          path="/receive-payments"
          element={
            <AdminRoute>
              <ReceivePayments />
            </AdminRoute>
          }
        />

        {/* Director-only route */}
        <Route
          path="/reports/stock-discrepancy"
          element={
            <DirectorRoute>
              <StockDiscrepancyReport />
            </DirectorRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;