import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../../utils/api';
import styles from './Dashboard.module.css';
import DashboardBanner from '../../assets/banner.jpg';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData(false);

    const refreshInterval = setInterval(() => {
      loadDashboardData(true);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const loadDashboardData = async (isRefresh) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const summaryData = await api.getDashboardSummary();
      setStats(summaryData);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  if (loading && !stats) {
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
      hasValue: true,
      onClick: () => navigate('/products')
    },
    {
      title: 'Low Stock',
      value: stats?.low_stock_items || 0,
      hasValue: true,
      onClick: () => navigate('/products?filter=low')
    },
    {
      title: 'Outstanding Supplies',
      value: stats?.outstanding_invoices || 0,
      hasValue: true,
      onClick: () => navigate('/outstanding-supplies')
    },
    {
      title: 'Sales',
      hasValue: false,
      onClick: () => navigate('/sales')
    },
    {
      title: 'Stock In/Out',
      hasValue: false,
      onClick: () => navigate('/stock-entries')
    },
    {
      title: 'Reports & Analytics',
      hasValue: false,
      onClick: () => navigate('/reports')
    }
  ];

  const pieColors = [
    '#667eea',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#06b6d4'
  ];

  const currentYear = new Date().getFullYear();

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
        <p className={styles.pageSubtitle}>
          Overview of your inventory management system
        </p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        {quickLinks.map((link, index) => (
          <div
            key={index}
            className={`${styles.statCard} ${styles[`statCard${index + 1}`]} ${
              !link.hasValue ? styles.statCardNoValue : ''
            }`}
            onClick={link.onClick}
          >
            <div className={styles.statContent}>
              <p className={styles.statTitle}>{link.title}</p>
              {link.hasValue && (
                <p className={styles.statValue}>{link.value}</p>
              )}
            </div>
            <div className={styles.statCardDecoration}></div>
          </div>
        ))}
      </div>

      {/* Banner */}
      <div className={styles.bannerContainer}>
        <img
          src={DashboardBanner}
          alt="Dashboard Banner"
          className={styles.bannerImage}
        />
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>
            Monthly Sales Summary - {currentYear}
          </h2>
          <p className={styles.chartSubtitle}>
            Total sales revenue by month
          </p>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={stats?.monthly_sales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis
                stroke="#64748b"
                domain={[0, 20000000]}
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
              />
              <Tooltip content={<CustomLineTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#667eea"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                name="Total Sales (KES)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Top Selling Products</h2>
          <p className={styles.chartSubtitle}>
            Best performing products by quantity sold
          </p>

          <div className={styles.pieChartContainer}>
            <ResponsiveContainer width="55%" height={400}>
              <PieChart>
                <Pie
                  data={stats?.top_products || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  dataKey="value"
                >
                  {(stats?.top_products || []).map((_, index) => (
                    <Cell
                      key={index}
                      fill={pieColors[index % pieColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className={styles.pieChartLegend}>
              <h3 className={styles.legendTitle}>Products</h3>
              {(stats?.top_products || []).map((product, index) => (
                <div key={index} className={styles.legendItem}>
                  <div
                    className={styles.legendColor}
                    style={{
                      backgroundColor:
                        pieColors[index % pieColors.length]
                    }}
                  ></div>
                  <div className={styles.legendText}>
                    <span className={styles.legendName}>
                      {product.name}
                    </span>
                    <span className={styles.legendValue}>
                      {product.value} units
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
