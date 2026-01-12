// src/components/Layout/Layout.jsx
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import styles from './Layout.module.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleOpenProductModal = () => {
    navigate('/products?action=add');
  };

  const handleOpenSaleModal = () => {
    navigate('/sales?action=new');
  };

  return (
    <div className={styles.layout}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        onOpenProductModal={handleOpenProductModal}
        onOpenSaleModal={handleOpenSaleModal}
      />
      <div className={styles.mainContainer}>
        <Header onMenuToggle={toggleSidebar} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © EdgeSystems 2025. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Layout;