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
    </div>
  );
};

export default Dashboard;
