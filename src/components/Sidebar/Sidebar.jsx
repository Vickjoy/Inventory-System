// src/components/Sidebar/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CompanyLogo from '../../assets/CompanyIcon.png';
import styles from './Sidebar.module.css';

const Sidebar = ({ isOpen, onClose, onOpenProductModal, onOpenSaleModal }) => {
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

  const handleNavClick = () => {
    // Close sidebar on mobile when clicking a nav item
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  const handleActionClick = (callback) => {
    callback();
    // Close sidebar on mobile when clicking action button
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className={styles.overlay} 
          onClick={onClose}
        ></div>
      )}
      
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <img src={CompanyLogo} alt="Edge Systems" className={styles.logo} />
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        
        <nav className={styles.navigation}>
          {filteredNav.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) => 
                isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Action Buttons Section */}
        <div className={styles.actionSection}>
          <button 
            className={styles.actionButton}
            onClick={() => handleActionClick(onOpenProductModal)}
          >
            <span className={styles.actionIcon}>+</span>
            <span className={styles.actionLabel}>Add Product</span>
          </button>

          <button 
            className={styles.actionButton}
            onClick={() => handleActionClick(onOpenSaleModal)}
          >
            <span className={styles.actionIcon}>+</span>
            <span className={styles.actionLabel}>New Sale</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;