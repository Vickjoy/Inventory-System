import { memo, useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import styles from '../Dashboard.module.css';

const PIE_COLORS = [
  '#0ea5e9', // Sky Blue
  '#f97316', // Orange
  '#ef4444', // Red
  '#1e40af', // Navy Blue
  '#10b981', // Green
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#eab308', // Yellow
  '#06b6d4', // Cyan
  '#f59e0b'  // Amber
];

const CustomPieTooltip = memo(({ active, payload }) => {
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
});

CustomPieTooltip.displayName = 'CustomPieTooltip';

const TopProductsPie = memo(({ productsData }) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const categories = useMemo(() => {
    if (!productsData || productsData.length === 0) return [];
    
    const uniqueCategories = [...new Set(
      productsData
        .map(p => p.category)
        .filter(Boolean)
    )];
    
    return uniqueCategories;
  }, [productsData]);

  const filteredProducts = useMemo(() => {
    if (!productsData || productsData.length === 0) return [];
    if (categoryFilter === 'all') return productsData;
    return productsData.filter(p => p.category === categoryFilter);
  }, [productsData, categoryFilter]);

  if (!productsData || productsData.length === 0) {
    return (
      <div className={styles.chartCard}>
        <h2 className={styles.chartTitle}>Top Selling Products</h2>
        <p className={styles.chartSubtitle}>
          Best performing products by quantity sold
        </p>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>🏆</div>
          <p className={styles.emptyStateText}>No product sales data yet</p>
          <p className={styles.emptyStateSubtext}>
            Top products will be displayed here once sales are recorded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h2 className={styles.chartTitle}>Top Selling Products</h2>
          <p className={styles.chartSubtitle}>
            Best performing products by quantity sold
          </p>
        </div>
        
        {categories.length > 0 && (
          <div className={styles.chartFilters}>
            <button
              className={`${styles.filterButton} ${categoryFilter === 'all' ? styles.filterActive : ''}`}
              onClick={() => setCategoryFilter('all')}
              aria-pressed={categoryFilter === 'all'}
            >
              All
            </button>
            {categories.slice(0, 3).map(cat => (
              <button
                key={cat}
                className={`${styles.filterButton} ${categoryFilter === cat ? styles.filterActive : ''}`}
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={categoryFilter === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.pieChartContainer}>
        <ResponsiveContainer width="55%" height={400}>
          <PieChart>
            <Pie
              data={filteredProducts}
              cx="50%"
              cy="50%"
              outerRadius={140}
              dataKey="value"
              isAnimationActive={false}  
            >
              {filteredProducts.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className={styles.pieChartLegend}>
          <h3 className={styles.legendTitle}>Products</h3>
          <div className={styles.legendItemsContainer}>
            {filteredProducts.map((product, index) => (
              <div key={index} className={styles.legendItem}>
                <div
                  className={styles.legendColor}
                  style={{
                    backgroundColor: PIE_COLORS[index % PIE_COLORS.length]
                  }}
                  aria-hidden="true"
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
  );
});

TopProductsPie.displayName = 'TopProductsPie';

export default TopProductsPie;
