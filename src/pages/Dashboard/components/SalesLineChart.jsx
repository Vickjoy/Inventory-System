import { memo, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import styles from '../Dashboard.module.css';

const CustomLineTooltip = memo(({ active, payload }) => {
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
});

CustomLineTooltip.displayName = 'CustomLineTooltip';

const SalesLineChart = memo(({ salesData }) => {
  const [timeFilter, setTimeFilter] = useState('all'); // all, q1, q2, q3, q4
  const currentYear = new Date().getFullYear();

  const quarterFilters = {
    q1: ['Jan', 'Feb', 'Mar'],
    q2: ['Apr', 'May', 'Jun'],
    q3: ['Jul', 'Aug', 'Sep'],
    q4: ['Oct', 'Nov', 'Dec']
  };

  const filteredData = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];
    
    if (timeFilter === 'all') return salesData;
    
    const allowedMonths = quarterFilters[timeFilter];
    return salesData.filter(item => allowedMonths.includes(item.month));
  }, [salesData, timeFilter]);

  const chartDomain = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [0, 20000000];
    
    const maxValue = Math.max(...filteredData.map(item => item.total || 0));
    // Add 20% padding above the highest value
    const padding = maxValue * 0.2;
    const upperBound = Math.ceil((maxValue + padding) / 1000000) * 1000000;
    
    // Use at least 20 million as the max, or the calculated value if higher
    return [0, Math.max(upperBound, 20000000)];
  }, [filteredData]);

  if (!salesData || salesData.length === 0) {
    return (
      <div className={styles.chartCard}>
        <h2 className={styles.chartTitle}>Monthly Sales Summary - {currentYear}</h2>
        <p className={styles.chartSubtitle}>Total sales revenue by month</p>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <p className={styles.emptyStateText}>No sales data available yet</p>
          <p className={styles.emptyStateSubtext}>
            Sales data will appear here once transactions are recorded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h2 className={styles.chartTitle}>
            Monthly Sales Summary - {currentYear}
          </h2>
          <p className={styles.chartSubtitle}>
            Total sales revenue by month
          </p>
        </div>
        
        <div className={styles.chartFilters}>
          <button
            className={`${styles.filterButton} ${timeFilter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setTimeFilter('all')}
            aria-pressed={timeFilter === 'all'}
          >
            All
          </button>
          <button
            className={`${styles.filterButton} ${timeFilter === 'q1' ? styles.filterActive : ''}`}
            onClick={() => setTimeFilter('q1')}
            aria-pressed={timeFilter === 'q1'}
          >
            Q1
          </button>
          <button
            className={`${styles.filterButton} ${timeFilter === 'q2' ? styles.filterActive : ''}`}
            onClick={() => setTimeFilter('q2')}
            aria-pressed={timeFilter === 'q2'}
          >
            Q2
          </button>
          <button
            className={`${styles.filterButton} ${timeFilter === 'q3' ? styles.filterActive : ''}`}
            onClick={() => setTimeFilter('q3')}
            aria-pressed={timeFilter === 'q3'}
          >
            Q3
          </button>
          <button
            className={`${styles.filterButton} ${timeFilter === 'q4' ? styles.filterActive : ''}`}
            onClick={() => setTimeFilter('q4')}
            aria-pressed={timeFilter === 'q4'}
          >
            Q4
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" stroke="#64748b" />
          <YAxis
            stroke="#64748b"
            domain={chartDomain}
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
  );
});

SalesLineChart.displayName = 'SalesLineChart';

export default SalesLineChart;