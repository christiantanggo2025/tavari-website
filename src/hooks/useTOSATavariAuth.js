// hooks/useTOSATavariAuth.js - TOSA Authentication Hook
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

/**
 * TOSA (Tavari OS Admin) Authentication Hook
 * Handles authentication and authorization for Tavari employees
 * 
 * @param {Object} options - Configuration options
 * @param {string[]} options.requiredPermissions - Required permissions (default: any permission)
 * @param {string} options.componentName - Component name for logging (default: 'TOSAComponent')
 * @returns {Object} Authentication state and methods
 */
export const useTOSATavariAuth = (options = {}) => {
  const {
    requiredPermissions = null,
    componentName = 'TOSAComponent'
  } = options;

  const navigate = useNavigate();

  // Authentication state
  const [authUser, setAuthUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    initializeTOSAAuth();
  }, []);

  const initializeTOSAAuth = async () => {
    try {
      console.log(`${componentName}: Initializing TOSA authentication...`);
      
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log(`${componentName}: Session check result:`, { session: !!session, error: sessionError });

      if (sessionError || !session?.user) {
        console.error(`${componentName}: No valid session, redirecting to employee portal`);
        navigate('/employeeportal');
        return;
      }

      setAuthUser(session.user);
      console.log(`${componentName}: Authenticated as:`, session.user.email);

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
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (empError || !employeeData) {
        console.error(`${componentName}: User is not a valid Tavari employee`);
        setAuthError('Access denied. This area is restricted to Tavari employees only.');
        
        // Critical security event - non-employee trying to access TOSA
        await supabase.from('security_audit_logs').insert({
          event_type: 'unauthorized_tosa_access',
          user_id: session.user.id,
          severity: 'critical',
          details: {
            component: componentName,
            email: session.user.email,
            timestamp: new Date().toISOString()
          }
        });

        // Sign out immediately
        await supabase.auth.signOut();
        navigate('/employeeportal');
        return;
      }

      setEmployee(employeeData);
      
      // Extract permissions from role
      const rolePermissions = employeeData.tavari_employee_roles?.permissions || {};
      const permissionsList = Object.keys(rolePermissions).filter(key => rolePermissions[key]);
      setPermissions(permissionsList);

      console.log(`${componentName}: Employee loaded:`, {
        name: employeeData.full_name,
        role: employeeData.tavari_employee_roles?.role_name,
        permissions: permissionsList
      });

      // Check required permissions
      if (requiredPermissions && !hasPermissions(permissionsList, requiredPermissions)) {
        setAuthError(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
        console.error(`${componentName}: Missing required permissions:`, requiredPermissions);
        return;
      }

      // Update last activity
      await supabase
        .from('tavari_employees')
        .update({ 
          last_activity: new Date().toISOString(),
          activity_count: (employeeData.activity_count || 0) + 1
        })
        .eq('id', employeeData.id);

      // Log successful component access
      await supabase.from('security_audit_logs').insert({
        event_type: 'tosa_component_access',
        user_id: session.user.id,
        severity: 'low',
        details: {
          component: componentName,
          employee_id: employeeData.id,
          employee_name: employeeData.full_name,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error(`${componentName}: Authentication error:`, error);
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Check if user has required permissions
   */
  const hasPermissions = (userPermissions, requiredPerms) => {
    if (!requiredPerms || requiredPerms.length === 0) return true;
    return requiredPerms.every(perm => userPermissions.includes(perm));
  };

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  /**
   * Check if user is a super admin
   */
  const isSuperAdmin = () => {
    return employee?.tavari_employee_roles?.role_name === 'super_admin' || 
           hasPermission('super_admin');
  };

  /**
   * Check if user is a support agent
   */
  const isSupportAgent = () => {
    return employee?.tavari_employee_roles?.role_name === 'support' || 
           hasPermission('customer_support');
  };

  /**
   * Check if user is a security analyst
   */
  const isSecurityAnalyst = () => {
    return employee?.tavari_employee_roles?.role_name === 'security' || 
           hasPermission('security_monitoring');
  };

  /**
   * Check if user can manage businesses
   */
  const canManageBusinesses = () => {
    return hasPermission('business_management') || isSuperAdmin();
  };

  /**
   * Check if user can view system health
   */
  const canViewSystemHealth = () => {
    return hasPermission('system_monitoring') || isSuperAdmin();
  };

  /**
   * Refresh authentication data
   */
  const refreshAuth = async () => {
    setAuthLoading(true);
    await initializeTOSAAuth();
  };

  /**
   * Clear authentication error
   */
  const clearAuthError = () => {
    setAuthError(null);
  };

  /**
   * Navigate to employee portal
   */
  const goToEmployeePortal = () => {
    navigate('/employeeportal');
  };

  /**
   * Navigate to TOSA dashboard
   */
  const goToDashboard = () => {
    navigate('/tosa/dashboard');
  };

  /**
   * Log user action for audit trail
   */
  const logUserAction = async (action, details = {}) => {
    if (!employee) return;

    try {
      await supabase.from('security_audit_logs').insert({
        event_type: 'tosa_user_action',
        user_id: authUser?.id,
        severity: 'low',
        details: {
          action,
          employee_id: employee.id,
          employee_name: employee.full_name,
          component: componentName,
          timestamp: new Date().toISOString(),
          ...details
        }
      });
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  };

  return {
    // Authentication state
    authUser,
    employee,
    permissions,
    authLoading,
    authError,
    
    // Computed state
    isAuthenticated: !!authUser && !!employee,
    needsAuth: !authUser && !authLoading && !authError,
    isReady: !authLoading && !!authUser && !!employee,
    
    // Permission checking methods
    hasPermission,
    hasPermissions: (perms) => hasPermissions(permissions, perms),
    isSuperAdmin,
    isSupportAgent,
    isSecurityAnalyst,
    canManageBusinesses,
    canViewSystemHealth,
    
    // Utility methods
    refreshAuth,
    clearAuthError,
    goToEmployeePortal,
    goToDashboard,
    logUserAction,
    
    // Raw authentication data for custom logic
    rawAuthData: {
      authUser,
      employee,
      permissions
    }
  };
};

export default useTOSATavariAuth;