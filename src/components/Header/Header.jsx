// src/components/Header/Header.jsx
import { useAuth } from '../../context/AuthContext';
import CompanyLogo from '../../assets/Company_logo.webp';
import styles from './Header.module.css';

const Header = () => {
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
          <img src={CompanyLogo} alt="Edge Systems" className={styles.logo} />
          <h1 className={styles.companyName}>Edge Systems</h1>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <span className={styles.username}>{user?.username}</span>
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