// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
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
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import './App.css';

function App() {
  const { loading } = useAuth();

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
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;