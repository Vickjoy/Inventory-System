import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import styles from './Dashboard.module.css';
import DashboardBanner from '../../assets/banner.jpg';
import DashboardStats from './components/DashboardStats';
import SalesLineChart from './components/SalesLineChart';
import TopProductsPie from './components/TopProductsPie';
import { quickLinksConfig } from './config/quickLinksConfig';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);

  const navigate = useNavigate();

  // Guards
  const isFetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const loadDashboardData = async (isRefresh = false) => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;

    try {
      if (!isRefresh) {
        setLoading(true);
      }

      setError(null);
      setErrorType(null);

      const summaryData = await api.getDashboardSummary();

      setPreviousStats(prev => (prev ? prev : summaryData));
      setStats(summaryData);
    } catch (err) {
      const message = err?.message || 'An unexpected error occurred';
      setError(message);

      if (message.includes('Network') || message.includes('fetch')) {
        setErrorType('network');
      } else if (message.includes('401') || message.includes('auth')) {
        setErrorType('auth');
      } else if (message.includes('500') || message.includes('server')) {
        setErrorType('server');
      } else {
        setErrorType('unknown');
      }
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Prevent StrictMode double-fetch in development
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      loadDashboardData(false);
    }

    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(true);
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRetry = () => {
    loadDashboardData(false);
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
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>
            {errorType === 'network' && 'Network Error'}
            {errorType === 'auth' && 'Authentication Error'}
            {errorType === 'server' && 'Server Error'}
            {errorType === 'unknown' && 'Error Loading Dashboard'}
          </h2>
          <p className={styles.errorMessage}>{error}</p>
          <button
            onClick={handleRetry}
            className={styles.retryButton}
            aria-label="Retry loading dashboard"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const quickLinks = quickLinksConfig(stats, navigate);

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>
          Overview of your inventory management system
        </p>
      </div>

      {/* Stats Cards */}
      <DashboardStats quickLinks={quickLinks} />

      {/* Banner */}
      <div className={styles.bannerContainer}>
        <img
          src={DashboardBanner}
          alt="Dashboard Banner"
          className={styles.bannerImage}
          loading="lazy"
        />
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <SalesLineChart salesData={stats?.monthly_sales} />
        <TopProductsPie productsData={stats?.top_products} />
      </div>
    </div>
  );
};

export default Dashboard;
