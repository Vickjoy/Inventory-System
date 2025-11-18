// src/pages/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryData, salesData] = await Promise.all([
        api.getDashboardSummary(),
        api.getRecentSales()
      ]);
      setStats(summaryData);
      setRecentSales(salesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        Error loading dashboard: {error}
      </div>
    );
  }

  // Quick Links Configuration
  const quickLinks = [
    {
      title: 'Total Products',
      value: stats?.total_products || 0,
      icon: '📦',
      color: '#3b82f6',
      bgColor: '#dbeafe',
      onClick: () => navigate('/products')
    },
    {
      title: 'Low Stock',
      value: stats?.low_stock_items || 0,
      icon: '⚠️',
      color: '#ef4444',
      bgColor: '#fee2e2',
      onClick: () => navigate('/products?filter=low')
    },
    {
      title: 'Outstanding Supplies',
      value: stats?.outstanding_invoices || 0,
      icon: '📋',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      onClick: () => navigate('/sales?tab=outstanding')
    },
    {
      title: 'Sales',
      value: `KES ${Number(stats?.total_revenue || 0).toLocaleString()}`,
      icon: '💰',
      color: '#10b981',
      bgColor: '#d1fae5',
      onClick: () => navigate('/sales')
    },
    {
      title: 'Stock Entries',
      value: 'View All',
      icon: '📊',
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      onClick: () => navigate('/stock-entries')
    },
    {
      title: 'Reports',
      value: 'Generate',
      icon: '📈',
      color: '#06b6d4',
      bgColor: '#cffafe',
      onClick: () => navigate('/reports')
    }
  ];

  const getStatusBadge = (status) => {
    const badges = {
      'Paid': 'badge-success',
      'Outstanding': 'badge-danger',
      'Partial': 'badge-warning'
    };
    return badges[status] || 'badge-secondary';
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Quick access to your inventory system</p>
      </div>

      <div className={styles.statsGrid}>
        {quickLinks.map((link, index) => (
          <div 
            key={index} 
            className={styles.statCard}
            style={{ borderLeftColor: link.color, cursor: 'pointer' }}
            onClick={link.onClick}
          >
            <div 
              className={styles.statIcon}
              style={{ backgroundColor: link.bgColor }}
            >
              <span style={{ fontSize: '2rem' }}>{link.icon}</span>
            </div>
            <div className={styles.statContent}>
              <p className={styles.statTitle}>{link.title}</p>
              <p className={styles.statValue} style={{ color: link.color }}>
                {link.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.recentSalesSection}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Sales</h2>
          </div>
          <div className="card-body">
            {recentSales.length === 0 ? (
              <p className={styles.noData}>No recent sales found</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.slice(0, 10).map(sale => (
                      <tr key={sale.id}>
                        <td className={styles.invoiceNumber}>
                          {sale.invoice_number}
                        </td>
                        <td>{sale.customer_name}</td>
                        <td className={styles.amount}>
                          KES {Number(sale.total_amount).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(sale.status)}`}>
                            {sale.status}
                          </span>
                        </td>
                        <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;