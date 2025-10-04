// Login.jsx - Updated to remove 3AM logic and add indefinite stay logged in
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { TavariStyles } from '../utils/TavariStyles';
import TavariCheckbox from '../components/UI/TavariCheckbox';
import { 
  SecurityWrapper, 
  useSecurityContext, 
  SECURITY_PRESETS,
  validateFormSecurity 
} from '../Security';

const LoginComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const passwordInputRef = useRef(null);
  const emailInputRef = useRef(null);

  // Initialize security context with admin-level security for login
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent,
    clearValidationErrors,
    securityState
  } = useSecurityContext({
    componentName: 'LoginForm',
    sensitiveComponent: true,
    enableRateLimiting: true,
    enableDeviceTracking: true,
    enableInputValidation: true,
    enableAuditLogging: true,
    sessionTimeout: 10 * 60 * 1000, // 10 minutes for login page
    onSessionTimeout: () => {
      setErrorMsg('Login session timed out for security. Please refresh the page.');
    }
  });

  const handleLogin = async () => {
    // Prevent multiple simultaneous login attempts
    if (isLoading) return;
    
    setErrorMsg('');
    setIsLoading(true);
    clearValidationErrors();

    try {
      // Validate inputs using security context
      const emailValidation = await validateInput(email, 'email', 'email');
      const passwordValidation = await validateInput(password, 'password', 'password');

      if (!emailValidation.valid) {
        setErrorMsg(emailValidation.error);
        setIsLoading(false);
        return;
      }

      if (!passwordValidation.valid) {
        setErrorMsg(passwordValidation.error);
        setIsLoading(false);
        return;
      }

      // Use sanitized inputs
      const sanitizedEmail = emailValidation.sanitized;
      const sanitizedPassword = passwordValidation.sanitized;

      // Check rate limiting before attempting login
      const rateLimitCheck = await checkRateLimit('login', sanitizedEmail);
      if (!rateLimitCheck.allowed) {
        setErrorMsg(rateLimitCheck.message);
        setIsLoading(false);
        return;
      }

      // Log login attempt with enhanced security context
      await logSecurityEvent('login_attempt', {
        login_method: 'email_password',
        stay_logged_in: stayLoggedIn,
        data_type: 'authentication',
        data_action: 'login_attempt'
      }, 'medium');

      // Check if user is locked out by database lookup
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      let lockedUserId = null;
      const { data: userLookup } = await supabase
        .from('users')
        .select('id, failed_login_count, last_failed_login')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      if (userLookup?.id) {
        lockedUserId = userLookup.id;

        // Check recent failed attempts in audit logs
        const { data: recentFails } = await supabase
          .from('audit_logs')
          .select('id')
          .eq('event_type', 'failed_login')
          .eq('user_id', lockedUserId)
          .gte('created_at', since);

        if (recentFails && recentFails.length >= 3) {
          await logSecurityEvent('account_lockout', {
            failed_attempt_count: recentFails.length,
            lockout_reason: 'Too many recent failed attempts',
            threat_type: 'brute_force_attempt',
            threat_details: {
              attempts_in_window: recentFails.length,
              window_minutes: 10
            }
          }, 'high');
          
          await recordAction('login', false, sanitizedEmail);
          setErrorMsg('Account is temporarily locked. Please try again in 10 minutes.');
          setIsLoading(false);
          return;
        }

        // Log suspicious activity for new devices
        const { data: recentLogins } = await supabase
          .from('audit_logs')
          .select('details')
          .eq('event_type', 'login')
          .eq('user_id', lockedUserId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentLogins && recentLogins.length > 0) {
          const knownDevices = recentLogins.some(login => 
            login.details?.device_fingerprint === securityState.deviceFingerprint
          );
          
          if (!knownDevices) {
            await logSecurityEvent('unusual_device_login', {
              threat_type: 'device_anomaly',
              threat_details: {
                new_device: true,
                known_device_count: recentLogins.length,
                days_since_last_login: 0
              }
            }, 'medium');
          }
        }
      }

      // Attempt Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      if (error) {
        console.warn("⛔ LOGIN ERROR:", error.message);
        
        // Record failed login attempt
        await recordAction('login', false, sanitizedEmail);

        // Log failed login with enhanced security context
        await logSecurityEvent('failed_login', {
          login_method: 'email_password',
          login_success: false,
          failed_attempt_count: 1,
          lockout_reason: error.message,
          error_message: error.message,
          data_type: 'authentication',
          data_action: 'login_failed',
          threat_type: 'authentication_failure'
        }, 'medium');

        // Insert into audit_logs table for database tracking
        await supabase.from("audit_logs").insert({
          user_id: userLookup?.id || null,
          event_type: "failed_login",
          details: {
            email_attempted: sanitizedEmail,
            reason: error.message,
            timestamp: new Date().toISOString(),
            device_fingerprint: securityState.deviceFingerprint,
            user_ip: securityState.userIP
          },
        });

        // Generic error message to prevent user enumeration
        setErrorMsg('Invalid credentials. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      // Login successful - record success
      await recordAction('login', true, sanitizedEmail);

      // Log successful login with enhanced security details
      const user = data?.user;
      if (user?.id) {
        await logSecurityEvent('login_attempt', {
          login_method: 'email_password',
          login_success: true,
          stay_logged_in: stayLoggedIn,
          data_type: 'authentication',
          data_action: 'login_successful'
        }, 'low');

        // Insert successful login into audit_logs
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          event_type: "login",
          details: {
            method: "email_password",
            stay_logged_in: stayLoggedIn,
            device_fingerprint: securityState.deviceFingerprint,
            user_ip: securityState.userIP
          },
        });
      }

      // Handle session persistence - UPDATED LOGIC
      if (stayLoggedIn) {
        // Set indefinite session flag
        localStorage.setItem('stayLoggedIn', 'true');
        localStorage.removeItem('expiresAt'); // Remove any old expiry data
        
        await logSecurityEvent('indefinite_session_created', {
          data_type: 'session_management',
          data_action: 'indefinite_session_created',
          details: {
            session_type: 'indefinite',
            inactivity_timeout_enabled: true
          }
        }, 'low');
      } else {
        // Standard session - will timeout on browser close
        localStorage.removeItem('expiresAt');
        localStorage.removeItem('stayLoggedIn');
      }

      // Get user authentication data
      const {
        data: authData,
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError || !authData?.user?.id) {
        await logSecurityEvent('system_error', {
          error_message: getUserError?.message || 'Unable to retrieve user after login',
          data_type: 'authentication',
          data_action: 'post_login_verification',
          threat_type: 'authentication_system_error'
        }, 'high');
        
        setErrorMsg('Unable to retrieve user after login.');
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;

      // Get user roles
      const { data: roleList, error: roleError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true);

      if (roleError || !roleList || roleList.length === 0) {
        await logSecurityEvent('unauthorized_access', {
          data_type: 'role_verification',
          data_action: 'no_active_roles',
          threat_type: 'unauthorized_access',
          threat_details: {
            role_error: roleError?.message,
            roles_found: roleList?.length || 0
          }
        }, 'high');
        
        setErrorMsg('Login succeeded, but no active business roles found.');
        setIsLoading(false);
        return;
      }

      // Store business data
      localStorage.setItem('businessList', JSON.stringify(roleList));
      const currentBusiness = roleList[0];
      localStorage.setItem('currentBusinessId', currentBusiness.business_id);

      // Generate new session ID for authenticated session
      const sessionId = btoa(Date.now() + Math.random() + userId);
      sessionStorage.setItem('sessionId', sessionId);

      await logSecurityEvent('session_start', {
        data_type: 'session_management',
        data_action: 'authenticated_session_created',
        details: {
          business_id: currentBusiness.business_id,
          role: currentBusiness.role,
          session_id: sessionId
        }
      }, 'low');

      // Navigate based on role
      if (['owner', 'admin', 'manager', 'employee'].includes(currentBusiness.role)) {
        navigate('/dashboard/home');
      } else {
        await logSecurityEvent('unauthorized_access', {
          data_type: 'role_verification',
          data_action: 'invalid_role_access_attempt',
          threat_type: 'privilege_escalation',
          threat_details: {
            attempted_role: currentBusiness.role,
            valid_roles: ['owner', 'admin', 'manager', 'employee']
          }
        }, 'high');
        navigate('/locked');
      }

    } catch (error) {
      console.error('Login process error:', error);
      
      await logSecurityEvent('system_error', {
        error_message: error.message,
        error_stack: error.stack,
        data_type: 'authentication',
        data_action: 'login_system_error',
        system_context: {
          email_attempted: email,
          component: 'login_form'
        }
      }, 'high');
      
      await recordAction('login', false, email);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle paste prevention for password field
  const handlePasswordPaste = (e) => {
    e.preventDefault();
    setErrorMsg('Pasting passwords is not allowed for security reasons.');
    
    logSecurityEvent('suspicious_activity', {
      threat_type: 'password_paste_attempt',
      data_type: 'input_validation',
      data_action: 'paste_blocked',
      threat_details: {
        field: 'password',
        component: 'login_form'
      }
    }, 'low');
    
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const styles = {
    container: {
      ...TavariStyles.layout.flexCenter,
      minHeight: '100vh',
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing.xl,
      fontFamily: TavariStyles.typography.fontFamily
    },
    
    loginCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing['4xl'],
      maxWidth: '400px',
      width: '100%',
      textAlign: 'center',
      position: 'relative'
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing['2xl'],
      margin: '0 0 32px 0'
    },
    
    inputGroup: {
      marginBottom: TavariStyles.spacing.lg,
      textAlign: 'left',
      position: 'relative'
    },
    
    label: {
      ...TavariStyles.components.form.label,
      textAlign: 'left'
    },
    
    input: {
      ...TavariStyles.components.form.input,
      width: '100%',
      boxSizing: 'border-box',
      transition: TavariStyles.transitions.normal
    },
    
    inputFocus: {
      borderColor: TavariStyles.colors.primary,
      outline: 'none',
      boxShadow: `0 0 0 2px ${TavariStyles.colors.primary}20`
    },
    
    inputError: {
      borderColor: TavariStyles.colors.danger,
      boxShadow: `0 0 0 2px ${TavariStyles.colors.danger}20`
    },
    
    passwordContainer: {
      position: 'relative',
      width: '100%'
    },
    
    passwordToggle: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.sm,
      zIndex: 1
    },
    
    validationError: {
      color: TavariStyles.colors.danger,
      fontSize: TavariStyles.typography.fontSize.xs,
      marginTop: TavariStyles.spacing.xs,
      textAlign: 'left'
    },
    
    checkboxContainer: {
      marginBottom: TavariStyles.spacing.xl,
      textAlign: 'left'
    },
    
    loginButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg,
      width: '100%',
      marginBottom: TavariStyles.spacing.lg,
      opacity: isLoading ? 0.6 : 1,
      cursor: isLoading ? 'not-allowed' : 'pointer'
    },
    
    loginButtonHover: {
      backgroundColor: TavariStyles.colors.primaryDark,
      transform: 'translateY(-1px)',
      boxShadow: TavariStyles.shadows.md
    },
    
    forgotPassword: {
      color: TavariStyles.colors.primary,
      cursor: 'pointer',
      marginTop: TavariStyles.spacing.md,
      fontSize: TavariStyles.typography.fontSize.sm,
      textAlign: 'center',
      textDecoration: 'underline',
      transition: TavariStyles.transitions.normal
    },
    
    forgotPasswordHover: {
      color: TavariStyles.colors.primaryDark
    },
    
    registerText: {
      marginTop: TavariStyles.spacing.xl,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    
    registerLink: {
      color: TavariStyles.colors.primary,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      cursor: 'pointer',
      textDecoration: 'underline',
      transition: TavariStyles.transitions.normal
    },
    
    registerLinkHover: {
      color: TavariStyles.colors.primaryDark
    },
    
    errorMessage: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.lg,
      textAlign: 'center',
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    loadingSpinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid #ffffff40',
      borderTop: '2px solid #ffffff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '8px'
    },
    
    securityIndicator: {
      position: 'absolute',
      top: TavariStyles.spacing.sm,
      right: TavariStyles.spacing.sm,
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: securityState.isSecure ? TavariStyles.colors.success : TavariStyles.colors.warning
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        {/* Security indicator */}
        <div style={styles.securityIndicator} title={securityState.isSecure ? 'Secure Connection' : 'Security Warning'} />
        
        <h2 style={styles.title}>Welcome Back</h2>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email Address</label>
          <input
            ref={emailInputRef}
            style={{
              ...styles.input,
              ...(securityState.validationErrors?.email ? styles.inputError : {})
            }}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, styles.input)}
            disabled={isLoading}
            maxLength={254}
            autoComplete="off"
            spellCheck={false}
          />
          {securityState.validationErrors?.email && (
            <div style={styles.validationError}>
              {securityState.validationErrors.email}
            </div>
          )}
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>
          <div style={styles.passwordContainer}>
            <input
              ref={passwordInputRef}
              style={{
                ...styles.input, 
                paddingRight: '40px',
                ...(securityState.validationErrors?.password ? styles.inputError : {})
              }}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, {...styles.input, paddingRight: '40px'})}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleLogin();
                }
              }}
              onPaste={handlePasswordPaste}
              disabled={isLoading}
              maxLength={128}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              style={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              disabled={isLoading}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {securityState.validationErrors?.password && (
            <div style={styles.validationError}>
              {securityState.validationErrors.password}
            </div>
          )}
        </div>

        {errorMsg && (
          <div style={styles.errorMessage}>
            {errorMsg}
          </div>
        )}

        <div style={styles.checkboxContainer}>
          <TavariCheckbox
            checked={stayLoggedIn}
            onChange={(checked) => setStayLoggedIn(checked)}
            label="Stay logged in (requires PIN after 5 minutes of inactivity)"
            size="md"
            id="stayLoggedIn"
            disabled={isLoading}
          />
        </div>

        <button 
          style={styles.loginButton} 
          onClick={handleLogin}
          onMouseEnter={(e) => !isLoading && Object.assign(e.target.style, styles.loginButtonHover)}
          onMouseLeave={(e) => Object.assign(e.target.style, styles.loginButton)}
          disabled={isLoading}
        >
          {isLoading && <span style={styles.loadingSpinner}></span>}
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>

        <p
          style={styles.forgotPassword}
          onClick={() => !isLoading && navigate("/forgot-password")}
          onMouseEnter={(e) => !isLoading && Object.assign(e.target.style, styles.forgotPasswordHover)}
          onMouseLeave={(e) => Object.assign(e.target.style, styles.forgotPassword)}
        >
          Forgot your password?
        </p>

        <p style={styles.registerText}>
          Don't have an account?{' '}
          <span 
            style={styles.registerLink} 
            onClick={() => !isLoading && navigate('/register')}
            onMouseEnter={(e) => !isLoading && Object.assign(e.target.style, styles.registerLinkHover)}
            onMouseLeave={(e) => Object.assign(e.target.style, styles.registerLink)}
          >
            Create Account
          </span>
        </p>
      </div>
      
      {/* Add CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

// Wrap the login component with security
const Login = () => {
  return (
    <SecurityWrapper
      componentName="LoginPage"
      enableRateLimiting={true}
      enableDeviceTracking={true}
      enableInputValidation={true}
      enableAuditLogging={true}
      sensitiveComponent={true}
      requireSecureConnection={true}
      sessionTimeout={10 * 60 * 1000} // 10 minutes
      securityLevel="high"
      autoBlock={false}
      showSecurityStatus={process.env.NODE_ENV === 'development'}
      onSecurityThreat={(threat) => {
        console.warn('🚨 Security threat detected on login page:', threat);
      }}
      onSessionTimeout={() => {
        console.log('🕐 Login page session timed out');
      }}
      onRateLimitExceeded={(blockedActions) => {
        console.warn('🚫 Rate limit exceeded on login page:', blockedActions);
      }}
    >
      <LoginComponent />
    </SecurityWrapper>
  );
};

export default Login;