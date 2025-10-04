// screens/TavariAdmin/TOSAEmployeePortal.jsx - Tavari Employee Login Portal
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiShield, FiLock, FiUser } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import { SecurityWrapper, useSecurityContext } from '../../Security';

/**
 * TOSAEmployeePortal - Hidden login portal for Tavari OS Admin employees
 * Accessible only via direct URL: tavarios.ca/employeeportal
 * Includes comprehensive security monitoring and audit logging
 */
const TOSAEmployeePortal = () => {
  const navigate = useNavigate();
  
  // Security context for monitoring and protection
  const security = useSecurityContext({
    componentName: 'TOSAEmployeePortal',
    sensitiveComponent: true,
    enableRateLimiting: true,
    enableDeviceTracking: true,
    enableAuditLogging: true
  });

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(null);

  // Check if user is already authenticated
  useEffect(() => {
    checkExistingAuth();
  }, []);

  // Handle lockout timer
  useEffect(() => {
    if (isLocked && lockoutTime) {
      const timer = setInterval(() => {
        const timeRemaining = lockoutTime - Date.now();
        if (timeRemaining <= 0) {
          setIsLocked(false);
          setLockoutTime(null);
          setLoginAttempts(0);
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLocked, lockoutTime]);

  /**
   * Check if user is already authenticated
   */
  const checkExistingAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Verify this is a Tavari employee
        const { data: employeeData, error: empError } = await supabase
          .from('tavari_employees')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single();

        if (!empError && employeeData) {
          await security.logSecurityEvent('existing_session_detected', {
            employee_id: employeeData.id,
            session_id: session.access_token.substring(0, 10) + '...'
          });
          
          navigate('/tosa/dashboard');
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
      await security.logSecurityEvent('session_check_error', { error: error.message }, 'high');
    }
  };

  /**
   * Handle form input changes with security validation
   */
  const handleInputChange = (field, value) => {
    // Basic validation - don't block normal typing
    if (value.length > 500) {
      setError(`${field} is too long`);
      return;
    }

    // Update form data immediately for better UX
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error on input change
    if (error) setError('');

    // Optional: Security validation in background (don't block input)
    if (security?.validateInput) {
      const validation = security.validateInput(value, {
        maxLength: field === 'email' ? 255 : 128,
        allowedPatterns: field === 'email' ? 'email' : 'password'
      });

      // Only show validation errors, don't prevent typing
      if (!validation.isValid) {
        console.warn(`Input validation warning for ${field}:`, validation.errors);
      }
    }
  };

  /**
   * Handle login form submission
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      const timeRemaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      setError(`Account locked. Try again in ${timeRemaining} seconds.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Record login attempt
      await security.recordAction('tosa_login_attempt', formData.email, false);
      
      // Validate form data
      if (!formData.email || !formData.password) {
        throw new Error('Email and password are required');
      }

      // Attempt authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (authError) {
        throw authError;
      }

      // Verify user is a Tavari employee
      const { data: employeeData, error: empError } = await supabase
        .from('tavari_employees')
        .select(`
          *,
          tavari_employee_roles (
            role_name,
            permissions
          )
        `)
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .single();

      if (empError || !employeeData) {
        // This is a critical security event - someone tried to access TOSA without employee credentials
        await security.logSecurityEvent('unauthorized_tosa_access_attempt', {
          email: formData.email,
          user_id: authData.user?.id,
          ip_address: security.securityState.userIP,
          device_fingerprint: security.securityState.deviceFingerprint
        }, 'critical');

        // Sign out the user immediately
        await supabase.auth.signOut();
        throw new Error('Access denied. This portal is restricted to authorized personnel only.');
      }

      // Successful login - log security event
      await security.logSecurityEvent('tosa_login_success', {
        employee_id: employeeData.id,
        employee_name: employeeData.full_name,
        role: employeeData.tavari_employee_roles?.role_name,
        last_login: employeeData.last_login
      });

      // Update employee last login
      await supabase
        .from('tavari_employees')
        .update({ 
          last_login: new Date().toISOString(),
          login_count: (employeeData.login_count || 0) + 1
        })
        .eq('id', employeeData.id);

      // Store employee data in localStorage for quick access
      localStorage.setItem('tosa_employee', JSON.stringify({
        id: employeeData.id,
        email: employeeData.email,
        full_name: employeeData.full_name,
        role: employeeData.tavari_employee_roles?.role_name,
        permissions: employeeData.tavari_employee_roles?.permissions
      }));

      // Record successful action
      await security.recordAction('tosa_login_attempt', formData.email, true);
      
      // Navigate to dashboard
      navigate('/tosa/dashboard');

    } catch (error) {
      console.error('Login error:', error);
      
      // Increment login attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      // Lock account after 3 failed attempts
      if (newAttempts >= 3) {
        const lockUntil = Date.now() + (5 * 60 * 1000); // 5 minutes
        setIsLocked(true);
        setLockoutTime(lockUntil);
        
        await security.logSecurityEvent('tosa_account_locked', {
          email: formData.email,
          attempts: newAttempts,
          locked_until: new Date(lockUntil).toISOString()
        }, 'high');
        
        setError('Too many failed attempts. Account locked for 5 minutes.');
      } else {
        setError(error.message || 'Login failed. Please check your credentials.');
        
        await security.logSecurityEvent('tosa_login_failure', {
          email: formData.email,
          error: error.message,
          attempts: newAttempts
        }, 'medium');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get lockout time remaining in seconds
   */
  const getLockoutTimeRemaining = () => {
    if (!isLocked || !lockoutTime) return 0;
    return Math.max(0, Math.ceil((lockoutTime - Date.now()) / 1000));
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${TavariStyles.colors.primaryDark} 0%, ${TavariStyles.colors.primary} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: TavariStyles.spacing.xl,
      fontFamily: TavariStyles.typography.fontFamily
    },

    loginCard: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.xl,
      padding: TavariStyles.spacing['3xl'],
      boxShadow: TavariStyles.shadows.modal,
      width: '100%',
      maxWidth: '450px',
      position: 'relative'
    },

    header: {
      textAlign: 'center',
      marginBottom: TavariStyles.spacing['3xl']
    },

    logo: {
      fontSize: '48px',
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.lg
    },

    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.sm
    },

    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },

    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xl
    },

    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },

    label: {
      ...TavariStyles.components.form.label,
      color: TavariStyles.colors.gray700
    },

    inputWrapper: {
      position: 'relative',
      width: '100%'
    },

    input: {
      ...TavariStyles.components.form.input,
      width: '100%',
      paddingRight: '50px',
      fontSize: TavariStyles.typography.fontSize.lg,
      border: `2px solid ${TavariStyles.colors.gray200}`,
      boxSizing: 'border-box'
    },

    inputFocused: {
      borderColor: TavariStyles.colors.primary,
      outline: 'none',
      boxShadow: `0 0 0 3px ${TavariStyles.colors.primary}20`
    },

    eyeButton: {
      position: 'absolute',
      right: TavariStyles.spacing.md,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.lg,
      padding: TavariStyles.spacing.xs
    },

    rememberMe: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },

    submitButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg,
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      padding: TavariStyles.spacing.lg,
      marginTop: TavariStyles.spacing.md,
      opacity: (loading || isLocked) ? 0.6 : 1,
      cursor: (loading || isLocked) ? 'not-allowed' : 'pointer'
    },

    error: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      textAlign: 'center',
      marginBottom: TavariStyles.spacing.xl
    },

    lockoutWarning: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.warning,
      textAlign: 'center',
      marginBottom: TavariStyles.spacing.xl
    },

    footer: {
      textAlign: 'center',
      marginTop: TavariStyles.spacing['3xl'],
      padding: TavariStyles.spacing.xl,
      borderTop: `1px solid ${TavariStyles.colors.gray200}`
    },

    footerText: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      lineHeight: TavariStyles.typography.lineHeight.relaxed
    },

    securityBadge: {
      position: 'absolute',
      top: TavariStyles.spacing.md,
      right: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.success,
      color: TavariStyles.colors.white,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    }
  };

  return (
    <SecurityWrapper
      componentName="TOSAEmployeePortal"
      sensitiveComponent={true}
      showSecurityStatus={false}
    >
      <div style={styles.container}>
        <div style={styles.loginCard}>
          {/* Security Badge */}
          <div style={styles.securityBadge}>
            <FiShield size={12} />
            <span>SECURE</span>
          </div>

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.logo}>
              <FiLock />
            </div>
            <h1 style={styles.title}>Tavari OS Admin</h1>
            <p style={styles.subtitle}>Employee Portal</p>
          </div>

          {/* Error Messages */}
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {/* Lockout Warning */}
          {isLocked && (
            <div style={styles.lockoutWarning}>
              Account locked for security. Time remaining: {getLockoutTimeRemaining()}s
            </div>
          )}

          {/* Login Form */}
          <form style={styles.form} onSubmit={handleLogin}>
            {/* Email Input */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <input
                  type="email"
                  style={styles.input}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocused)}
                  onBlur={(e) => {
                    e.target.style.borderColor = TavariStyles.colors.gray200;
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Enter your Tavari email"
                  disabled={loading || isLocked}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={styles.input}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocused)}
                  onBlur={(e) => {
                    e.target.style.borderColor = TavariStyles.colors.gray200;
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Enter your password"
                  disabled={loading || isLocked}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || isLocked}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={styles.rememberMe}>
              <TavariCheckbox
                checked={formData.rememberMe}
                onChange={(checked) => setFormData(prev => ({ ...prev, rememberMe: checked }))}
                label="Keep me signed in"
                disabled={loading || isLocked}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading || isLocked}
            >
              {loading ? 'Authenticating...' : 'Access Portal'}
            </button>
          </form>

          {/* Footer */}
          <div style={styles.footer}>
            <p style={styles.footerText}>
              This portal is restricted to authorized Tavari employees only.<br />
              All access attempts are monitored and logged for security purposes.<br />
              <strong>Unauthorized access is prohibited.</strong>
            </p>
          </div>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default TOSAEmployeePortal;