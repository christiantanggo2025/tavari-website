// hooks/usePOSAuth.js - Standardized Authentication Hook for POS Components
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

/**
 * Standardized authentication hook for POS components
 * Handles user authentication, business context, and role verification
 * 
 * @param {Object} options - Configuration options
 * @param {string[]} options.requiredRoles - Required user roles (default: any role)
 * @param {boolean} options.requireBusiness - Whether business selection is required (default: true)
 * @param {string} options.componentName - Component name for logging (default: 'Component')
 * @returns {Object} Authentication state and methods
 */
export const usePOSAuth = (options = {}) => {
  const {
    requiredRoles = null, // null means any role is allowed
    requireBusiness = true,
    componentName = 'Component'
  } = options;

  const navigate = useNavigate();

  // Authentication state
  const [authUser, setAuthUser] = useState(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log(`${componentName}: Initializing authentication...`);
      
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log(`${componentName}: Session check result:`, { session: !!session, error: sessionError });

      if (sessionError || !session?.user) {
        console.error(`${componentName}: No valid session, redirecting to login`);
        navigate('/login');
        return;
      }

      setAuthUser(session.user);
      console.log(`${componentName}: Authenticated as:`, session.user.email);

      // Get business context if required
      if (requireBusiness) {
        const currentBusinessId = localStorage.getItem('currentBusinessId');
        console.log(`${componentName}: Business ID from localStorage:`, currentBusinessId);

        if (!currentBusinessId) {
          setAuthError('No business selected. Please select a business from the dashboard.');
          setAuthLoading(false);
          return;
        }

        setSelectedBusinessId(currentBusinessId);

        // Verify user has access to this business and get role
        const { data: userRoles, error: roleError } = await supabase
          .from('user_roles')
          .select('role, active')
          .eq('user_id', session.user.id)
          .eq('business_id', currentBusinessId)
          .eq('active', true);

        if (roleError || !userRoles || userRoles.length === 0) {
          console.error(`${componentName}: User not authorized for this business:`, roleError);
          setAuthError('Not authorized for this business. Please contact your administrator.');
          setAuthLoading(false);
          return;
        }

        const primaryRole = userRoles[0].role;
        setUserRole(primaryRole);
        console.log(`${componentName}: User role verified:`, primaryRole);

        // Check if user has required role
        if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(primaryRole)) {
          console.error(`${componentName}: Insufficient permissions. Required: ${requiredRoles.join(', ')}, Has: ${primaryRole}`);
          setAuthError(`Insufficient permissions. This feature requires: ${requiredRoles.join(' or ')}`);
          setAuthLoading(false);
          return;
        }

        // Load business data
        try {
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', currentBusinessId)
            .single();

          if (businessError) {
            console.warn(`${componentName}: Could not load business data:`, businessError);
          } else {
            setBusinessData(business);
            console.log(`${componentName}: Business data loaded:`, business.name);
          }
        } catch (businessErr) {
          console.warn(`${componentName}: Business data fetch failed:`, businessErr);
        }
      }

      setAuthLoading(false);
      console.log(`${componentName}: Authentication completed successfully`);

    } catch (err) {
      console.error(`${componentName}: Authentication error:`, err);
      setAuthError(err.message || 'An unexpected authentication error occurred');
      setAuthLoading(false);
    }
  };

  /**
   * Check if user has specific role
   * @param {string|string[]} roles - Role or array of roles to check
   * @returns {boolean} Whether user has the role(s)
   */
  const hasRole = (roles) => {
    if (!userRole) return false;
    if (typeof roles === 'string') return userRole === roles;
    if (Array.isArray(roles)) return roles.includes(userRole);
    return false;
  };

  /**
   * Check if user has manager-level permissions
   * @returns {boolean} Whether user is manager or owner
   */
  const isManager = () => {
    return hasRole(['manager', 'owner']);
  };

  /**
   * Check if user is owner
   * @returns {boolean} Whether user is owner
   */
  const isOwner = () => {
    return hasRole('owner');
  };

  /**
   * Validate manager PIN for sensitive operations
   * @param {string} pin - PIN to validate
   * @returns {Promise<boolean>} Whether PIN is valid
   */
  const validateManagerPin = async (pin) => {
    if (!authUser || !selectedBusinessId) {
      console.log(`${componentName}: No authenticated user or business for PIN validation`);
      return false;
    }

    if (!isManager()) {
      console.log(`${componentName}: User is not a manager for PIN validation`);
      return false;
    }

    try {
      console.log(`${componentName}: Validating PIN for user:`, authUser.id);

      // Get user's PIN from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('pin')
        .eq('id', authUser.id)
        .single();

      if (userError || !userData?.pin) {
        console.error(`${componentName}: PIN lookup error:`, userError);
        return false;
      }

      const storedPin = userData.pin;

      // Check if PIN is hashed (bcrypt format)
      if (storedPin.startsWith('$2b$') || storedPin.startsWith('$2a$')) {
        try {
          const bcrypt = await import('bcryptjs');
          const isValid = await bcrypt.compare(pin, storedPin);
          console.log(`${componentName}: Bcrypt PIN validation result:`, isValid);
          return isValid;
        } catch (bcryptError) {
          console.warn(`${componentName}: Bcrypt not available, using plain comparison:`, bcryptError);
          return String(pin) === String(storedPin);
        }
      } else {
        // Plain text PIN comparison
        console.log(`${componentName}: Using plain text PIN validation`);
        return String(pin) === String(storedPin);
      }
      
    } catch (err) {
      console.error(`${componentName}: PIN validation error:`, err);
      return false;
    }
  };

  /**
   * Refresh authentication state
   */
  const refreshAuth = () => {
    setAuthLoading(true);
    initializeAuth();
  };

  /**
   * Clear authentication error
   */
  const clearAuthError = () => {
    setAuthError(null);
  };

  /**
   * Navigate to login page
   */
  const goToLogin = () => {
    navigate('/login');
  };

  /**
   * Navigate to dashboard
   */
  const goToDashboard = () => {
    navigate('/dashboard');
  };

  return {
    // Authentication state
    authUser,
    selectedBusinessId,
    userRole,
    businessData,
    authLoading,
    authError,
    
    // Authentication status
    isAuthenticated: !!authUser && !authLoading && !authError,
    isReady: !authLoading && !!authUser && (!requireBusiness || !!selectedBusinessId),
    
    // Role checking methods
    hasRole,
    isManager,
    isOwner,
    
    // Utility methods
    validateManagerPin,
    refreshAuth,
    clearAuthError,
    goToLogin,
    goToDashboard,
    
    // Raw authentication data for custom logic
    rawAuthData: {
      authUser,
      selectedBusinessId,
      userRole,
      businessData
    }
  };
};

export default usePOSAuth;