// src/components/Sidebar/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CompanyLogo from '../../assets/Company_logo.webp';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const { isAdmin } = useAuth();

  const navigation = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: '📊', 
      path: '/dashboard' 
    },
    { 
      id: 'products', 
      label: 'Products & Stock', 
      icon: '📦', 
      path: '/products' 
    },
    { 
      id: 'sales', 
      label: 'Sales Entry', 
      icon: '💰', 
      path: '/sales' 
    },
    { 
      id: 'suppliers', 
      label: 'Suppliers', 
      icon: '🏢', 
      path: '/suppliers',
      adminOnly: true 
    },
    { 
      id: 'customers', 
      label: 'Customers', 
      icon: '👥', 
      path: '/customers' 
    },
    { 
      id: 'stock-entries', 
      label: 'Stock Entries', 
      icon: '📝', 
      path: '/stock-entries' 
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: '📈', 
      path: '/reports' 
    }
  ];

  const filteredNav = navigation.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <img src={CompanyLogo} alt="Edge Systems" className={styles.logo} />
      </div>
      
      <nav className={styles.navigation}>
        {filteredNav.map(item => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => 
              isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;