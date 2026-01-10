import { memo } from 'react';
import styles from '../Dashboard.module.css';

const DashboardStats = memo(({ quickLinks }) => {

  const handleKeyDown = (e, onClick) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div className={styles.statsGrid}>
      {quickLinks.map((link, index) => {
        
        return (
          <div
            key={index}
            className={`${styles.statCard} ${styles[`statCard${index + 1}`]} ${
              !link.hasValue ? styles.statCardNoValue : ''
            } ${link.isAlert && link.value > 0 ? styles.statCardAlert : ''}`}
            onClick={link.onClick}
            onKeyDown={(e) => handleKeyDown(e, link.onClick)}
            role="button"
            tabIndex={0}
            aria-label={link.ariaLabel || link.title}
          >
            <div className={styles.statContent}>
              <p className={styles.statTitle}>{link.title}</p>
              {link.hasValue && (
                <p className={styles.statValue}>{link.value}</p>
              )}
            </div>
            <div className={styles.statCardDecoration}></div>
          </div>
        );
      })}
    </div>
  );
});

DashboardStats.displayName = 'DashboardStats';

export default DashboardStats;