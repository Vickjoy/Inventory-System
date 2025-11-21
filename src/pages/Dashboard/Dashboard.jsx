// src/pages/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const summaryData = await api.getDashboardSummary();
      setStats(summaryData);
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

  const quickLinks = [
    {
      title: 'Total Products',
      value: stats?.total_products || 0,
      color: '#2563eb',
      onClick: () => navigate('/products')
    },
    {
      title: 'Low Stock',
      value: stats?.low_stock_items || 0,
      color: '#ef4444',
      onClick: () => navigate('/products?filter=low')
    },
    {
      title: 'Outstanding Supplies',
      value: stats?.outstanding_invoices || 0,
      color: '#f59e0b',
      onClick: () => navigate('/sales?tab=outstanding')
    },
    {
      title: 'Sales',
      value: 'View Sales',
      color: '#10b981',
      onClick: () => navigate('/sales')
    },
    {
      title: 'Stock In/Out',
      value: 'View Entries',
      color: '#8b5cf6',
      onClick: () => navigate('/stock-entries')
    },
    {
      title: 'Reports & Analytics',
      value: 'Generate Report',
      color: '#06b6d4',
      onClick: () => navigate('/reports')
    }
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Overview of your inventory management system</p>
      </div>

      <div className={styles.statsGrid}>
        {quickLinks.map((link, index) => (
          <div 
            key={index} 
            className={styles.statCard}
            style={{ borderLeftColor: link.color }}
            onClick={link.onClick}
          >
            <div className={styles.statContent}>
              <p className={styles.statTitle}>{link.title}</p>
              <p className={styles.statValue} style={{ color: link.color }}>
                {link.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;