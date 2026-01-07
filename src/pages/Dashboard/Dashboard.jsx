// src/pages/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import styles from './Dashboard.module.css';
import DashboardBanner from '../../assets/banner.jpg';

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
      onClick: () => navigate('/products')
    },
    {
      title: 'Low Stock',
      value: stats?.low_stock_items || 0,
      onClick: () => navigate('/products?filter=low')
    },
    {
      title: 'Outstanding Supplies',
      value: stats?.outstanding_invoices || 0,
      onClick: () => navigate('/sales?tab=outstanding')
    },
    {
      title: 'Sales',
      value: stats?.total_sales || 0,
      onClick: () => navigate('/sales')
    },
    {
      title: 'Stock In/Out',
      value: stats?.stock_entries_count || 0,
      onClick: () => navigate('/stock-entries')
    },
    {
      title: 'Reports & Analytics',
      value: stats?.total_revenue ? `KES ${parseFloat(stats.total_revenue).toLocaleString()}` : 'KES 0',
      onClick: () => navigate('/reports')
    }
  ];

  // Colors for pie chart
  const pieColors = ['#667eea', '#f5576c', '#00f2fe', '#38f9d7', '#fee140', '#fa709a', '#30cfd0'];

  // Custom tooltip for line chart
  const CustomLineTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{payload[0].payload.month}</p>
          <p className={styles.tooltipValue}>
            KES {parseFloat(payload[0].value).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{payload[0].name}</p>
          <p className={styles.tooltipValue}>
            {payload[0].value} units sold
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Overview of your inventory management system</p>
      </div>

      {/* Colorful Stats Cards */}
      <div className={styles.statsGrid}>
        {quickLinks.map((link, index) => (
          <div 
            key={index} 
            className={`${styles.statCard} ${styles[`statCard${index + 1}`]}`}
            onClick={link.onClick}
          >
            <div className={styles.statContent}>
              <p className={styles.statTitle}>{link.title}</p>
              <p className={styles.statValue}>{link.value}</p>
            </div>
            <div className={styles.statCardDecoration}></div>
          </div>
        ))}
      </div>

      {/* Dashboard Banner */}
      <div className={styles.bannerContainer}>
        <img 
          src={DashboardBanner} 
          alt="Dashboard Banner" 
          className={styles.bannerImage}
        />
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Monthly Sales Line Chart */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Monthly Sales Summary</h2>
          <p className={styles.chartSubtitle}>Total sales revenue by month</p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={stats?.monthly_sales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b"
                style={{ fontSize: '14px' }}
              />
              <YAxis 
                stroke="#64748b"
                style={{ fontSize: '14px' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomLineTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#667eea" 
                strokeWidth={3}
                dot={{ fill: '#667eea', r: 5 }}
                activeDot={{ r: 7 }}
                name="Total Sales (KES)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Products Pie Chart */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Top Selling Products</h2>
          <p className={styles.chartSubtitle}>Best performing products by quantity sold</p>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={stats?.top_products || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
              >
                {(stats?.top_products || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;