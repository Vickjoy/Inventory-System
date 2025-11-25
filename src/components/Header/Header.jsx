// src/components/Header/Header.jsx
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';

const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.hamburgerButton}
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>
          <h1 className={styles.companyName}>EDGE SYSTEMS INVENTORY</h1>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <div className={styles.userDetails}>
              <span className={styles.userName}>@EdgeSystems</span>
              <span className={styles.userRole}>
                {user?.is_superuser ? 'Admin' : 'Staff'}
              </span>
            </div>
            <div className={styles.userAvatar}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;