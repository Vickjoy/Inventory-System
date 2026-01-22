// src/pages/ResetPassword/ResetPassword.jsx - Refined version
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './ResetPassword.module.css';
import companyLogo from '../../assets/CompanyIcon.png';

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidLink, setIsValidLink] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
      
      try {
        const response = await fetch(
          `${apiUrl}/password-reset/validate/${uid}/${token}/`
        );
        
        if (response.ok) {
          setIsValidLink(true);
        } else {
          const data = await response.json();
          setError(data.error || 'This password reset link is invalid or has expired.');
          setIsValidLink(false);
        }
      } catch (err) {
        setError('Failed to validate reset link. Please try again.');
        setIsValidLink(false);
        console.error('Token validation error:', err);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [uid, token]);

  // Auto-focus password field when link is valid
  useEffect(() => {
    if (isValidLink && !validating) {
      document.getElementById('newPassword')?.focus();
    }
  }, [isValidLink, validating]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Client-side validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

    try {
      const response = await fetch(`${apiUrl}/password-reset/confirm/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          uid, 
          token, 
          new_password: newPassword,
          confirm_password: confirmPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password successfully reset!');
        setResetSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(
          data.token?.[0] || 
          data.new_password?.[0] || 
          data.confirm_password?.[0] ||
          data.error || 
          'Failed to reset password. Please try again.'
        );
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clear errors when typing
  const handlePasswordChange = (setter) => (e) => {
    setError('');
    setter(e.target.value);
  };

  if (validating) {
    return (
      <div className={styles.resetPasswordContainer}>
        <div className={styles.resetPasswordCard}>
          <div className={styles.header}>
            <div className={styles.logoContainer}>
              <img 
                src={companyLogo} 
                alt="Edge Systems Logo" 
                className={styles.companyLogo}
              />
            </div>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidLink) {
    return (
      <div className={styles.resetPasswordContainer}>
        <div className={styles.resetPasswordCard}>
          <div className={styles.header}>
            <div className={styles.logoContainer}>
              <img 
                src={companyLogo} 
                alt="Edge Systems Logo" 
                className={styles.companyLogo}
              />
            </div>
            <h1 className={styles.title}>Invalid Link</h1>
          </div>
          
          <div className={styles.errorMessage}>
            <div className={styles.errorIcon}>✕</div>
            <p className={styles.errorText}>{error}</p>
            <p className={styles.errorHelp}>
              This link may have expired or been already used. Please request a new password reset link.
            </p>
          </div>

          <div className={styles.footer}>
            <Link to="/forgot-password" className={styles.footerLink}>
              Request New Reset Link
            </Link>
            <span className={styles.separator}>•</span>
            <Link to="/login" className={styles.footerLink}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.resetPasswordContainer}>
      <div className={styles.resetPasswordCard}>
        {/* Logo and Title Section */}
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <img 
              src={companyLogo} 
              alt="Edge Systems Logo" 
              className={styles.companyLogo}
            />
          </div>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>
            Enter your new password below
          </p>
        </div>

        {/* Form Section */}
        {!resetSuccess ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorAlert} role="alert" aria-live="polite">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="newPassword" className={styles.formLabel}>
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={handlePasswordChange(setNewPassword)}
                className={styles.formInput}
                placeholder="Enter new password (min. 8 characters)"
                required
                autoComplete="new-password"
                minLength={8}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.formLabel}>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={handlePasswordChange(setConfirmPassword)}
                className={styles.formInput}
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
                minLength={8}
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
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        ) : (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successText}>{message}</p>
            <p className={styles.redirectText}>Redirecting to login...</p>
            <button 
              onClick={() => navigate('/login')} 
              className={styles.loginButton}
            >
              Go to Login Now
            </button>
          </div>
        )}

        {/* Footer */}
        {!resetSuccess && (
          <div className={styles.footer}>
            <Link to="/login" className={styles.backLink}>
              ← Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;