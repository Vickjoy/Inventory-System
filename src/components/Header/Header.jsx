// src/components/Header/Header.jsx
import { useAuth } from '../../context/AuthContext';
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
          <h1 className={styles.pageTitle}>Welcome back, {user?.username}!</h1>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <p className={styles.userName}>{user?.username}</p>
              <p className={styles.userRole}>
                {user?.is_superuser ? 'Super Admin' : user?.is_staff ? 'Admin' : 'Staff'}
              </p>
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