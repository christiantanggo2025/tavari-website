// utils/hrPermissions.js
import { supabase } from '../supabaseClient';

/**
 * HR Permission Constants
 */
export const HR_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin', 
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  GUEST: 'guest'
};

export const HR_PERMISSIONS = {
  // Employee Management
  VIEW_ALL_EMPLOYEES: 'VIEW_ALL_EMPLOYEES',
  VIEW_OWN_PROFILE: 'VIEW_OWN_PROFILE',
  VIEW_DIRECT_REPORTS: 'VIEW_DIRECT_REPORTS',
  CREATE_EMPLOYEE: 'CREATE_EMPLOYEE',
  EDIT_EMPLOYEE: 'EDIT_EMPLOYEE',
  EDIT_OWN_PROFILE: 'EDIT_OWN_PROFILE',
  DELETE_EMPLOYEE: 'DELETE_EMPLOYEE',
  TERMINATE_EMPLOYEE: 'TERMINATE_EMPLOYEE',
  REACTIVATE_EMPLOYEE: 'REACTIVATE_EMPLOYEE',
  
  // Wage & Compensation
  VIEW_ALL_WAGES: 'VIEW_ALL_WAGES',
  VIEW_OWN_WAGE: 'VIEW_OWN_WAGE',
  VIEW_DIRECT_REPORT_WAGES: 'VIEW_DIRECT_REPORT_WAGES',
  EDIT_WAGES: 'EDIT_WAGES',
  VIEW_WAGE_HISTORY: 'VIEW_WAGE_HISTORY',
  
  // Contract Management
  VIEW_ALL_CONTRACTS: 'VIEW_ALL_CONTRACTS',
  VIEW_OWN_CONTRACT: 'VIEW_OWN_CONTRACT',
  CREATE_CONTRACT: 'CREATE_CONTRACT',
  EDIT_CONTRACT: 'EDIT_CONTRACT',
  SIGN_CONTRACT: 'SIGN_CONTRACT',
  APPROVE_CONTRACT: 'APPROVE_CONTRACT',
  DELETE_CONTRACT: 'DELETE_CONTRACT',
  
  // Document Management
  VIEW_ALL_DOCUMENTS: 'VIEW_ALL_DOCUMENTS',
  VIEW_OWN_DOCUMENTS: 'VIEW_OWN_DOCUMENTS',
  UPLOAD_DOCUMENTS: 'UPLOAD_DOCUMENTS',
  DELETE_DOCUMENTS: 'DELETE_DOCUMENTS',
  APPROVE_DOCUMENTS: 'APPROVE_DOCUMENTS',
  
  // Onboarding
  VIEW_ALL_ONBOARDING: 'VIEW_ALL_ONBOARDING',
  VIEW_OWN_ONBOARDING: 'VIEW_OWN_ONBOARDING',
  MANAGE_ONBOARDING: 'MANAGE_ONBOARDING',
  CREATE_ONBOARDING_TASKS: 'CREATE_ONBOARDING_TASKS',
  COMPLETE_ONBOARDING_TASKS: 'COMPLETE_ONBOARDING_TASKS',
  
  // Write-ups & Disciplinary
  VIEW_ALL_WRITEUPS: 'VIEW_ALL_WRITEUPS',
  VIEW_OWN_WRITEUPS: 'VIEW_OWN_WRITEUPS',
  CREATE_WRITEUP: 'CREATE_WRITEUP',
  EDIT_WRITEUP: 'EDIT_WRITEUP',
  DELETE_WRITEUP: 'DELETE_WRITEUP',
  ACKNOWLEDGE_WRITEUP: 'ACKNOWLEDGE_WRITEUP',
  
  // Policy Management
  VIEW_POLICIES: 'VIEW_POLICIES',
  MANAGE_POLICIES: 'MANAGE_POLICIES',
  CREATE_POLICY: 'CREATE_POLICY',
  EDIT_POLICY: 'EDIT_POLICY',
  DELETE_POLICY: 'DELETE_POLICY',
  ACKNOWLEDGE_POLICY: 'ACKNOWLEDGE_POLICY',
  
  // HR Settings & Configuration
  VIEW_HR_SETTINGS: 'VIEW_HR_SETTINGS',
  EDIT_HR_SETTINGS: 'EDIT_HR_SETTINGS',
  MANAGE_HR_USERS: 'MANAGE_HR_USERS',
  VIEW_HR_ANALYTICS: 'VIEW_HR_ANALYTICS',
  EXPORT_HR_DATA: 'EXPORT_HR_DATA',
  
  // HR Module Access
  ACCESS_HR_MODULE: 'ACCESS_HR_MODULE',
  ACCESS_HR_DASHBOARD: 'ACCESS_HR_DASHBOARD'
};

/**
 * Permission Matrix - Maps roles to permissions
 */
const PERMISSION_MATRIX = {
  [HR_ROLES.OWNER]: [
    // Full access to everything
    ...Object.values(HR_PERMISSIONS)
  ],
  
  [HR_ROLES.ADMIN]: [
    // Nearly full access, except some owner-only settings
    HR_PERMISSIONS.VIEW_ALL_EMPLOYEES,
    HR_PERMISSIONS.VIEW_OWN_PROFILE,
    HR_PERMISSIONS.VIEW_DIRECT_REPORTS,
    HR_PERMISSIONS.CREATE_EMPLOYEE,
    HR_PERMISSIONS.EDIT_EMPLOYEE,
    HR_PERMISSIONS.EDIT_OWN_PROFILE,
    HR_PERMISSIONS.TERMINATE_EMPLOYEE,
    HR_PERMISSIONS.REACTIVATE_EMPLOYEE,
    
    HR_PERMISSIONS.VIEW_ALL_WAGES,
    HR_PERMISSIONS.VIEW_OWN_WAGE,
    HR_PERMISSIONS.EDIT_WAGES,
    HR_PERMISSIONS.VIEW_WAGE_HISTORY,
    
    HR_PERMISSIONS.VIEW_ALL_CONTRACTS,
    HR_PERMISSIONS.VIEW_OWN_CONTRACT,
    HR_PERMISSIONS.CREATE_CONTRACT,
    HR_PERMISSIONS.EDIT_CONTRACT,
    HR_PERMISSIONS.SIGN_CONTRACT,
    HR_PERMISSIONS.APPROVE_CONTRACT,
    
    HR_PERMISSIONS.VIEW_ALL_DOCUMENTS,
    HR_PERMISSIONS.VIEW_OWN_DOCUMENTS,
    HR_PERMISSIONS.UPLOAD_DOCUMENTS,
    HR_PERMISSIONS.DELETE_DOCUMENTS,
    HR_PERMISSIONS.APPROVE_DOCUMENTS,
    
    HR_PERMISSIONS.VIEW_ALL_ONBOARDING,
    HR_PERMISSIONS.VIEW_OWN_ONBOARDING,
    HR_PERMISSIONS.MANAGE_ONBOARDING,
    HR_PERMISSIONS.CREATE_ONBOARDING_TASKS,
    HR_PERMISSIONS.COMPLETE_ONBOARDING_TASKS,
    
    HR_PERMISSIONS.VIEW_ALL_WRITEUPS,
    HR_PERMISSIONS.VIEW_OWN_WRITEUPS,
    HR_PERMISSIONS.CREATE_WRITEUP,
    HR_PERMISSIONS.EDIT_WRITEUP,
    HR_PERMISSIONS.ACKNOWLEDGE_WRITEUP,
    
    HR_PERMISSIONS.VIEW_POLICIES,
    HR_PERMISSIONS.MANAGE_POLICIES,
    HR_PERMISSIONS.CREATE_POLICY,
    HR_PERMISSIONS.EDIT_POLICY,
    HR_PERMISSIONS.DELETE_POLICY,
    HR_PERMISSIONS.ACKNOWLEDGE_POLICY,
    
    HR_PERMISSIONS.VIEW_HR_SETTINGS,
    HR_PERMISSIONS.VIEW_HR_ANALYTICS,
    HR_PERMISSIONS.EXPORT_HR_DATA,
    
    HR_PERMISSIONS.ACCESS_HR_MODULE,
    HR_PERMISSIONS.ACCESS_HR_DASHBOARD
  ],
  
  [HR_ROLES.MANAGER]: [
    // Can manage direct reports and own data
    HR_PERMISSIONS.VIEW_DIRECT_REPORTS,
    HR_PERMISSIONS.VIEW_OWN_PROFILE,
    HR_PERMISSIONS.EDIT_OWN_PROFILE,
    
    HR_PERMISSIONS.VIEW_OWN_WAGE,
    HR_PERMISSIONS.VIEW_DIRECT_REPORT_WAGES,
    
    HR_PERMISSIONS.VIEW_OWN_CONTRACT,
    HR_PERMISSIONS.SIGN_CONTRACT,
    
    HR_PERMISSIONS.VIEW_OWN_DOCUMENTS,
    HR_PERMISSIONS.UPLOAD_DOCUMENTS,
    
    HR_PERMISSIONS.VIEW_OWN_ONBOARDING,
    HR_PERMISSIONS.MANAGE_ONBOARDING, // For direct reports
    HR_PERMISSIONS.COMPLETE_ONBOARDING_TASKS,
    
    HR_PERMISSIONS.VIEW_OWN_WRITEUPS,
    HR_PERMISSIONS.CREATE_WRITEUP, // For direct reports
    HR_PERMISSIONS.ACKNOWLEDGE_WRITEUP,
    
    HR_PERMISSIONS.VIEW_POLICIES,
    HR_PERMISSIONS.ACKNOWLEDGE_POLICY,
    
    HR_PERMISSIONS.ACCESS_HR_MODULE,
    HR_PERMISSIONS.ACCESS_HR_DASHBOARD
  ],
  
  [HR_ROLES.EMPLOYEE]: [
    // Self-service only
    HR_PERMISSIONS.VIEW_OWN_PROFILE,
    HR_PERMISSIONS.EDIT_OWN_PROFILE,
    
    HR_PERMISSIONS.VIEW_OWN_WAGE,
    
    HR_PERMISSIONS.VIEW_OWN_CONTRACT,
    HR_PERMISSIONS.SIGN_CONTRACT,
    
    HR_PERMISSIONS.VIEW_OWN_DOCUMENTS,
    HR_PERMISSIONS.UPLOAD_DOCUMENTS, // Own documents only
    
    HR_PERMISSIONS.VIEW_OWN_ONBOARDING,
    HR_PERMISSIONS.COMPLETE_ONBOARDING_TASKS,
    
    HR_PERMISSIONS.VIEW_OWN_WRITEUPS,
    HR_PERMISSIONS.ACKNOWLEDGE_WRITEUP,
    
    HR_PERMISSIONS.VIEW_POLICIES,
    HR_PERMISSIONS.ACKNOWLEDGE_POLICY
  ],
  
  [HR_ROLES.GUEST]: [
    // Very limited access
    HR_PERMISSIONS.VIEW_POLICIES,
    HR_PERMISSIONS.ACKNOWLEDGE_POLICY
  ]
};

/**
 * Get user's HR context including role and business info
 */
export const getHRUserContext = async () => {
  try {
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user's business association and role
    const { data: businessUsers, error: businessError } = await supabase
      .from('business_users')
      .select(`
        business_id, 
        role,
        businesses(id, name)
      `)
      .eq('user_id', user.id)
      .single();

    if (businessError || !businessUsers) {
      throw new Error('Unable to load business information');
    }

    // Get user profile information
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        full_name,
        email,
        employee_number,
        position,
        department,
        manager_id,
        employment_status
      `)
      .eq('id', user.id)
      .single();

    const context = {
      user: {
        id: user.id,
        email: user.email,
        ...userProfile
      },
      business: businessUsers.businesses,
      role: businessUsers.role?.toLowerCase() || HR_ROLES.GUEST,
      businessId: businessUsers.business_id,
      permissions: PERMISSION_MATRIX[businessUsers.role?.toLowerCase()] || []
    };

    return { success: true, context };
  } catch (error) {
    console.error('Error getting HR user context:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user has a specific HR permission
 */
export const hasHRPermission = (userContext, permission) => {
  if (!userContext || !userContext.permissions) {
    return false;
  }
  
  return userContext.permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions (OR logic)
 */
export const hasAnyHRPermission = (userContext, permissions) => {
  if (!userContext || !userContext.permissions || !Array.isArray(permissions)) {
    return false;
  }
  
  return permissions.some(permission => userContext.permissions.includes(permission));
};

/**
 * Check if user has all of the specified permissions (AND logic)
 */
export const hasAllHRPermissions = (userContext, permissions) => {
  if (!userContext || !userContext.permissions || !Array.isArray(permissions)) {
    return false;
  }
  
  return permissions.every(permission => userContext.permissions.includes(permission));
};

/**
 * Check if user can access HR module at all
 */
export const canAccessHRModule = (userContext) => {
  return hasHRPermission(userContext, HR_PERMISSIONS.ACCESS_HR_MODULE);
};

/**
 * Check if user can view specific employee data
 */
export const canViewEmployee = (userContext, employeeId) => {
  if (!userContext || !employeeId) return false;
  
  // Owner and admin can view all employees
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_ALL_EMPLOYEES)) {
    return true;
  }
  
  // User can always view their own profile
  if (userContext.user.id === employeeId) {
    return hasHRPermission(userContext, HR_PERMISSIONS.VIEW_OWN_PROFILE);
  }
  
  // Managers can view direct reports (would need additional logic to check reporting relationship)
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_DIRECT_REPORTS)) {
    // This would require a separate function to check if employeeId reports to userContext.user.id
    return true; // Simplified for now
  }
  
  return false;
};

/**
 * Check if user can edit specific employee data
 */
export const canEditEmployee = (userContext, employeeId) => {
  if (!userContext || !employeeId) return false;
  
  // Owner and admin can edit all employees
  if (hasHRPermission(userContext, HR_PERMISSIONS.EDIT_EMPLOYEE)) {
    return true;
  }
  
  // User can edit their own profile if they have self-edit permission
  if (userContext.user.id === employeeId) {
    return hasHRPermission(userContext, HR_PERMISSIONS.EDIT_OWN_PROFILE);
  }
  
  return false;
};

/**
 * Check if user can view wage information for specific employee
 */
export const canViewEmployeeWage = (userContext, employeeId) => {
  if (!userContext || !employeeId) return false;
  
  // Owner and admin can view all wages
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_ALL_WAGES)) {
    return true;
  }
  
  // User can view their own wage
  if (userContext.user.id === employeeId) {
    return hasHRPermission(userContext, HR_PERMISSIONS.VIEW_OWN_WAGE);
  }
  
  // Managers can view direct report wages (simplified)
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_DIRECT_REPORT_WAGES)) {
    return true; // Would need reporting relationship check
  }
  
  return false;
};

/**
 * Get filtered list of employees based on user permissions
 */
export const getEmployeeFilter = (userContext) => {
  if (!userContext) return null;
  
  // Owner and admin see all employees
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_ALL_EMPLOYEES)) {
    return { type: 'all' };
  }
  
  // Managers see direct reports + themselves
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_DIRECT_REPORTS)) {
    return { 
      type: 'manager_scope', 
      managerId: userContext.user.id 
    };
  }
  
  // Employees see only themselves
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_OWN_PROFILE)) {
    return { 
      type: 'self_only', 
      userId: userContext.user.id 
    };
  }
  
  return { type: 'none' };
};

/**
 * Helper to check if current user is manager of specified employee
 */
export const isManagerOf = async (userContext, employeeId) => {
  if (!userContext || !employeeId) return false;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('manager_id, business_users!inner(business_id)')
      .eq('id', employeeId)
      .eq('business_users.business_id', userContext.businessId)
      .single();
    
    if (error || !data) return false;
    
    return data.manager_id === userContext.user.id;
  } catch (error) {
    console.error('Error checking manager relationship:', error);
    return false;
  }
};

/**
 * Get available HR actions for a specific employee
 */
export const getAvailableHRActions = (userContext, employeeId, isOwnProfile = false) => {
  if (!userContext) return [];
  
  const actions = [];
  
  // View actions
  if (canViewEmployee(userContext, employeeId)) {
    actions.push('view_profile');
  }
  
  // Edit actions
  if (canEditEmployee(userContext, employeeId)) {
    actions.push('edit_profile');
  }
  
  // Wage actions
  if (canViewEmployeeWage(userContext, employeeId)) {
    actions.push('view_wage');
  }
  
  if (hasHRPermission(userContext, HR_PERMISSIONS.EDIT_WAGES) && !isOwnProfile) {
    actions.push('edit_wage');
  }
  
  // Contract actions
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_ALL_CONTRACTS) || 
      (isOwnProfile && hasHRPermission(userContext, HR_PERMISSIONS.VIEW_OWN_CONTRACT))) {
    actions.push('view_contract');
  }
  
  if (hasHRPermission(userContext, HR_PERMISSIONS.CREATE_CONTRACT)) {
    actions.push('create_contract');
  }
  
  // Write-up actions
  if (hasHRPermission(userContext, HR_PERMISSIONS.CREATE_WRITEUP) && !isOwnProfile) {
    actions.push('create_writeup');
  }
  
  // Termination actions
  if (hasHRPermission(userContext, HR_PERMISSIONS.TERMINATE_EMPLOYEE) && !isOwnProfile) {
    actions.push('terminate_employee');
  }
  
  return actions;
};

/**
 * Role-based UI helpers
 */
export const getRoleDisplayName = (role) => {
  const roleNames = {
    [HR_ROLES.OWNER]: 'Owner',
    [HR_ROLES.ADMIN]: 'HR Administrator',
    [HR_ROLES.MANAGER]: 'Manager',
    [HR_ROLES.EMPLOYEE]: 'Employee',
    [HR_ROLES.GUEST]: 'Guest'
  };
  
  return roleNames[role] || 'Unknown Role';
};

export const getRoleColor = (role) => {
  const roleColors = {
    [HR_ROLES.OWNER]: '#dc2626',     // Red
    [HR_ROLES.ADMIN]: '#7c2d12',     // Dark Orange
    [HR_ROLES.MANAGER]: '#0369a1',   // Blue
    [HR_ROLES.EMPLOYEE]: '#059669',  // Green
    [HR_ROLES.GUEST]: '#6b7280'      // Gray
  };
  
  return roleColors[role] || '#6b7280';
};

/**
 * Permission debugging helper
 */
export const debugPermissions = (userContext) => {
  if (!userContext) {
    console.log('No user context available');
    return;
  }
  
  console.log('HR Permission Debug:', {
    user: userContext.user?.email,
    role: userContext.role,
    business: userContext.business?.name,
    permissions: userContext.permissions,
    hasHRAccess: canAccessHRModule(userContext)
  });
};

export default {
  HR_ROLES,
  HR_PERMISSIONS,
  getHRUserContext,
  hasHRPermission,
  hasAnyHRPermission,
  hasAllHRPermissions,
  canAccessHRModule,
  canViewEmployee,
  canEditEmployee,
  canViewEmployeeWage,
  getEmployeeFilter,
  isManagerOf,
  getAvailableHRActions,
  getRoleDisplayName,
  getRoleColor,
  debugPermissions
};