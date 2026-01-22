// src/pages/ForgotPassword/ForgotPassword.jsx - Refined version
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './ForgotPassword.module.css';
import companyLogo from '../../assets/CompanyIcon.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [canResend, setCanResend] = useState(false);

  // Auto-focus email field
  useEffect(() => {
    document.getElementById('email')?.focus();
  }, []);

  // Enable resend after 30 seconds
  useEffect(() => {
    if (emailSent) {
      const timer = setTimeout(() => setCanResend(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [emailSent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

    try {
      const response = await fetch(`${apiUrl}/password-reset/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'A password reset link has been sent to your email address. Please check your inbox.');
        setEmailSent(true);
        setEmail('');
      } else {
        setError(data.email?.[0] || data.error || 'Failed to send reset email. Please check your email address.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setEmailSent(false);
    setCanResend(false);
    setMessage('');
  };

  return (
    <div className={styles.forgotPasswordContainer}>
      <div className={styles.forgotPasswordCard}>
        {/* Logo and Title Section */}
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <img 
              src={companyLogo} 
              alt="Edge Systems Logo" 
              className={styles.companyLogo}
            />
          </div>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Form Section */}
        {!emailSent ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorAlert} role="alert" aria-live="polite">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.formLabel}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className={styles.formInput}
                placeholder="Enter your registered email"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        ) : (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successText}>{message}</p>
            <p className={styles.checkEmailText}>
              Please check your email and click the reset link to continue.
            </p>
            {canResend && (
              <button 
                onClick={handleResend}
                className={styles.resendButton}
              >
                Didn't receive the email? Resend
              </button>
            )}
          </div>
        )}

        {/* Back to Login Link */}
        <div className={styles.footer}>
          <Link to="/login" className={styles.backLink}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;