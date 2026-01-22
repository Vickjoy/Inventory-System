// src/pages/Login/Login.jsx - Refined version
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.module.css';
import companyLogo from '../../assets/CompanyIcon.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Auto-focus username field on mount
  useEffect(() => {
    document.getElementById('username')?.focus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear error when user starts typing
  const handleInputChange = (setter) => (e) => {
    setError('');
    setter(e.target.value);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {/* Logo and Title Section */}
        <div className={styles.loginHeader}>
          <div className={styles.logoContainer}>
            <img 
              src={companyLogo} 
              alt="Edge Systems Logo" 
              className={styles.companyLogo}
            />
          </div>
          <h1 className={styles.loginTitle}>EDGE SYSTEMS INVENTORY</h1>
        </div>
        
        {/* Form Section */}
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && (
            <div className={styles.errorAlert} role="alert" aria-live="polite">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.formLabel}>
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={handleInputChange(setUsername)}
              className={styles.formInput}
              placeholder="Enter your username"
              required
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handleInputChange(setPassword)}
              className={styles.formInput}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {/* Forgot Password Link */}
          <div className={styles.forgotPasswordContainer}>
            <Link to="/forgot-password" className={styles.forgotPasswordLink}>
              Forgot Password?
            </Link>
          </div>

          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.loginFooter}>
          <p className={styles.footerText}>
            © Edge Systems 2025. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;