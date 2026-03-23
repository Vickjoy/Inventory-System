// src/components/Sidebar/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CompanyLogo from '../../assets/CompanyIcon.png';
import styles from './Sidebar.module.css';

const Sidebar = ({ isOpen, onClose, onOpenProductModal, onOpenSaleModal }) => {
  const { isAdmin, isStaff } = useAuth();

  // ========================
  // Navigation items
  // role: 'all'   — visible to everyone
  // role: 'admin' — visible to admin only
  // role: 'staff' — visible to staff only
  // ========================
  const navigation = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      path: '/dashboard',
      role: 'all',
    },
    {
      id: 'products',
      label: 'Products & Stock',
      icon: '📦',
      path: '/products',
      role: 'all',
    },
    {
      id: 'sales',
      label: 'Sales Entry',
      icon: '💰',
      path: '/sales',
      role: 'all',
    },
    {
      id: 'stock-entries',
      label: 'Stock Entries',
      icon: '📝',
      path: '/stock-entries',
      role: 'admin',
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: '🏢',
      path: '/suppliers',
      role: 'all',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: '👥',
      path: '/customers',
      role: 'staff',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📈',
      path: '/reports',
      role: 'all',
    },
    {
      id: 'pending-approvals',
      label: 'Pending Approvals',
      icon: '✅',
      path: '/pending-approvals',
      role: 'admin',
    },
  ];

  // ========================
  // Filter nav based on role
  // ========================
  const filteredNav = navigation.filter((item) => {
    if (item.role === 'all') return true;
    if (item.role === 'admin') return isAdmin;
    if (item.role === 'staff') return isStaff;
    return false;
  });

  const handleNavClick = () => {
    if (window.innerWidth <= 768) onClose();
  };

  const handleActionClick = (callback) => {
    callback();
    if (window.innerWidth <= 768) onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={onClose}
        />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>

        {/* Header — Logo */}
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

        {/* Navigation */}
        <nav className={styles.navigation}>
          {filteredNav.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                isActive
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Action Buttons */}
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