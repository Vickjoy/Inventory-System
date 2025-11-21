// src/components/Layout/Layout.jsx
import { Outlet } from 'react-router-dom';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import styles from './Layout.module.css';

const Layout = () => {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.mainContainer}>
        <Header />
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