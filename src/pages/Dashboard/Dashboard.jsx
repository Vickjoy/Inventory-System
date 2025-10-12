// src/pages/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.total_products || 0,
      icon: '📦',
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      title: 'Low Stock Items',
      value: stats?.low_stock_items || 0,
      icon: '⚠️',
      color: '#ef4444',
      bgColor: '#fee2e2'
    },
    {
      title: 'Outstanding Invoices',
      value: stats?.outstanding_invoices || 0,
      icon: '🧾',
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    {
      title: 'Pending LPOs',
      value: stats?.pending_lpos || 0,
      icon: '📋',
      color: '#8b5cf6',
      bgColor: '#ede9fe'
    },
    {
      title: 'Total Revenue',
      value: `KES ${Number(stats?.total_revenue || 0).toLocaleString()}`,
      icon: '💰',
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      title: 'Outstanding Amount',
      value: `KES ${Number(stats?.total_outstanding || 0).toLocaleString()}`,
      icon: '💳',
      color: '#ef4444',
      bgColor: '#fee2e2'
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
        <p className={styles.pageSubtitle}>Overview of your inventory system</p>
      </div>

      <div className={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className={styles.statCard}
            style={{ borderLeftColor: stat.color }}
          >
            <div 
              className={styles.statIcon}
              style={{ backgroundColor: stat.bgColor }}
            >
              <span style={{ fontSize: '2rem' }}>{stat.icon}</span>
            </div>
            <div className={styles.statContent}>
              <p className={styles.statTitle}>{stat.title}</p>
              <p className={styles.statValue} style={{ color: stat.color }}>
                {stat.value}
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