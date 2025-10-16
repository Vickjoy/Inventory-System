// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import Sales from './pages/Sales/Sales';
import Invoices from './pages/Invoices/Invoices';
import LPOs from './pages/LPOs/LPOs';
import Customers from './pages/Customers/Customers';
import Suppliers from './pages/Suppliers/Suppliers';
import StockEntries from './pages/StockEntries/StockEntries';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
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
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/lpos" element={<LPOs />} /> 
        <Route path="/customers" element={<Customers />} /> 
        <Route path="/suppliers" element={<Suppliers />} /> 
        <Route path="/stock-entries" element={<StockEntries />} />
        <Route path="/reports" element={<Reports />} /> 
        <Route path="/settings" element={<Settings />} /> 
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;