// routing/HRRouter.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getHRUserContext, canAccessHRModule, hasHRPermission, HR_PERMISSIONS } from '../utils/hrPermissions';
import { handleHRError, useHRError } from '../utils/hrErrorHandling';

// HR Screen Components (these would be imported from their respective files)
import HRDashboard from '../screens/HR/HRDashboard';
import EmployeeProfiles from '../screens/HR/EmployeeProfiles';
import EmployeeDetail from '../screens/HR/EmployeeDetail';
import ContractManagement from '../screens/HR/ContractManagement';
import ContractDetail from '../screens/HR/ContractDetail';
import OnboardingCenter from '../screens/HR/OnboardingCenter';
import OnboardingDetail from '../screens/HR/OnboardingDetail';
import WriteupManagement from '../screens/HR/WriteupManagement';
import WriteupDetail from '../screens/HR/WriteupDetail';
import PolicyCenter from '../screens/HR/PolicyCenter';
import PolicyDetail from '../screens/HR/PolicyDetail';
import HRSettings from '../screens/HR/HRSettings';
import HRAnalytics from '../screens/HR/HRAnalytics';

/**
 * HR Route Definitions with Permission Requirements
 */
const HR_ROUTES = [
  {
    path: '/dashboard/hr',
    component: HRDashboard,
    permissions: [HR_PERMISSIONS.ACCESS_HR_MODULE],
    exact: true,
    title: 'HR Dashboard'
  },
  {
    path: '/dashboard/hr/dashboard',
    component: HRDashboard,
    permissions: [HR_PERMISSIONS.ACCESS_HR_MODULE],
    redirect: '/dashboard/hr',
    title: 'HR Dashboard'
  },
  {
    path: '/dashboard/hr/employees',
    component: EmployeeProfiles,
    permissions: [HR_PERMISSIONS.VIEW_ALL_EMPLOYEES, HR_PERMISSIONS.VIEW_DIRECT_REPORTS, HR_PERMISSIONS.VIEW_OWN_PROFILE],
    requiresAny: true,
    title: 'Employee Profiles'
  },
  {
    path: '/dashboard/hr/employee/:employeeId',
    component: EmployeeDetail,
    permissions: [HR_PERMISSIONS.VIEW_ALL_EMPLOYEES, HR_PERMISSIONS.VIEW_DIRECT_REPORTS, HR_PERMISSIONS.VIEW_OWN_PROFILE],
    requiresAny: true,
    validateAccess: 'employee',
    title: 'Employee Details'
  },
  {
    path: '/dashboard/hr/contracts',
    component: ContractManagement,
    permissions: [HR_PERMISSIONS.VIEW_ALL_CONTRACTS, HR_PERMISSIONS.VIEW_OWN_CONTRACT],
    requiresAny: true,
    title: 'Contract Management'
  },
  {
    path: '/dashboard/hr/contract/:contractId',
    component: ContractDetail,
    permissions: [HR_PERMISSIONS.VIEW_ALL_CONTRACTS, HR_PERMISSIONS.VIEW_OWN_CONTRACT],
    requiresAny: true,
    validateAccess: 'contract',
    title: 'Contract Details'
  },
  {
    path: '/dashboard/hr/onboarding',
    component: OnboardingCenter,
    permissions: [HR_PERMISSIONS.VIEW_ALL_ONBOARDING, HR_PERMISSIONS.MANAGE_ONBOARDING, HR_PERMISSIONS.VIEW_OWN_ONBOARDING],
    requiresAny: true,
    title: 'Onboarding Center'
  },
  {
    path: '/dashboard/hr/onboarding/:employeeId',
    component: OnboardingDetail,
    permissions: [HR_PERMISSIONS.VIEW_ALL_ONBOARDING, HR_PERMISSIONS.MANAGE_ONBOARDING, HR_PERMISSIONS.VIEW_OWN_ONBOARDING],
    requiresAny: true,
    validateAccess: 'onboarding',
    title: 'Onboarding Details'
  },
  {
    path: '/dashboard/hr/writeups',
    component: WriteupManagement,
    permissions: [HR_PERMISSIONS.VIEW_ALL_WRITEUPS, HR_PERMISSIONS.VIEW_OWN_WRITEUPS, HR_PERMISSIONS.CREATE_WRITEUP],
    requiresAny: true,
    title: 'Disciplinary Management'
  },
  {
    path: '/dashboard/hr/writeup/:writeupId',
    component: WriteupDetail,
    permissions: [HR_PERMISSIONS.VIEW_ALL_WRITEUPS, HR_PERMISSIONS.VIEW_OWN_WRITEUPS],
    requiresAny: true,
    validateAccess: 'writeup',
    title: 'Writeup Details'
  },
  {
    path: '/dashboard/hr/policies',
    component: PolicyCenter,
    permissions: [HR_PERMISSIONS.VIEW_POLICIES],
    title: 'Policy Center'
  },
  {
    path: '/dashboard/hr/policy/:policyId',
    component: PolicyDetail,
    permissions: [HR_PERMISSIONS.VIEW_POLICIES],
    validateAccess: 'policy',
    title: 'Policy Details'
  },
  {
    path: '/dashboard/hr/settings',
    component: HRSettings,
    permissions: [HR_PERMISSIONS.VIEW_HR_SETTINGS],
    title: 'HR Settings'
  },
  {
    path: '/dashboard/hr/analytics',
    component: HRAnalytics,
    permissions: [HR_PERMISSIONS.VIEW_HR_ANALYTICS],
    title: 'HR Analytics'
  }
];

/**
 * Authentication Guard Component
 */
const HRAuthGuard = ({ children, route, userContext }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleError } = useHRError(userContext);

  // Check if user has required permissions
  const hasPermission = () => {
    if (!userContext || !route.permissions) return false;

    if (route.requiresAny) {
      // User needs at least one of the specified permissions
      return route.permissions.some(permission => 
        hasHRPermission(userContext, permission)
      );
    } else {
      // User needs all specified permissions
      return route.permissions.every(permission => 
        hasHRPermission(userContext, permission)
      );
    }
  };

  // Validate specific resource access (e.g., can user view this specific employee?)
  const validateResourceAccess = async () => {
    if (!route.validateAccess) return true;

    try {
      const pathParams = extractPathParams(location.pathname, route.path);
      
      switch (route.validateAccess) {
        case 'employee':
          return await validateEmployeeAccess(pathParams.employeeId, userContext);
        case 'contract':
          return await validateContractAccess(pathParams.contractId, userContext);
        case 'writeup':
          return await validateWriteupAccess(pathParams.writeupId, userContext);
        case 'policy':
          return await validatePolicyAccess(pathParams.policyId, userContext);
        case 'onboarding':
          return await validateOnboardingAccess(pathParams.employeeId, userContext);
        default:
          return true;
      }
    } catch (error) {
      handleError(error, { 
        operation: 'resource_validation', 
        resourceType: route.validateAccess,
        route: route.path 
      });
      return false;
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      // First check basic permissions
      if (!hasPermission()) {
        const errorContext = {
          requiredPermissions: route.permissions,
          userRole: userContext?.role,
          route: route.path
        };
        
        handleError(new Error('Insufficient permissions'), errorContext);
        
        // Redirect based on what user can access
        const fallbackRoute = getFallbackRoute(userContext);
        navigate(fallbackRoute, { replace: true });
        return;
      }

      // Then validate specific resource access if needed
      if (route.validateAccess) {
        const hasResourceAccess = await validateResourceAccess();
        if (!hasResourceAccess) {
          navigate('/dashboard/hr', { replace: true });
          return;
        }
      }
    };

    if (userContext) {
      checkAccess();
    }
  }, [userContext, location.pathname]);

  if (!hasPermission()) {
    return null; // Will redirect via useEffect
  }

  return children;
};

/**
 * Extract path parameters from URL
 */
const extractPathParams = (pathname, routePath) => {
  const pathParts = pathname.split('/');
  const routeParts = routePath.split('/');
  const params = {};

  routeParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      params[paramName] = pathParts[index];
    }
  });

  return params;
};

/**
 * Resource Access Validation Functions
 */
const validateEmployeeAccess = async (employeeId, userContext) => {
  if (!employeeId || !userContext) return false;

  // Owners and admins can view all employees
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_ALL_EMPLOYEES)) {
    return true;
  }

  // Users can view their own profile
  if (userContext.user.id === employeeId) {
    return hasHRPermission(userContext, HR_PERMISSIONS.VIEW_OWN_PROFILE);
  }

  // Managers can view direct reports (would need database check)
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_DIRECT_REPORTS)) {
    // This would require checking if employeeId reports to userContext.user.id
    // For now, we'll allow it and let the component handle the filtering
    return true;
  }

  return false;
};

const validateContractAccess = async (contractId, userContext) => {
  if (!contractId || !userContext) return false;

  // Simplified validation - would need database queries in real implementation
  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_ALL_CONTRACTS)) {
    return true;
  }

  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_OWN_CONTRACT)) {
    // Would need to check if contract belongs to user
    return true;
  }

  return false;
};

const validateWriteupAccess = async (writeupId, userContext) => {
  if (!writeupId || !userContext) return false;

  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_ALL_WRITEUPS)) {
    return true;
  }

  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_OWN_WRITEUPS)) {
    // Would need to check if writeup is about the user
    return true;
  }

  return false;
};

const validatePolicyAccess = async (policyId, userContext) => {
  // Policies are generally viewable by anyone with HR access
  return hasHRPermission(userContext, HR_PERMISSIONS.VIEW_POLICIES);
};

const validateOnboardingAccess = async (employeeId, userContext) => {
  if (!employeeId || !userContext) return false;

  if (hasHRPermission(userContext, HR_PERMISSIONS.VIEW_ALL_ONBOARDING)) {
    return true;
  }

  if (userContext.user.id === employeeId) {
    return hasHRPermission(userContext, HR_PERMISSIONS.VIEW_OWN_ONBOARDING);
  }

  if (hasHRPermission(userContext, HR_PERMISSIONS.MANAGE_ONBOARDING)) {
    // Would check if employee reports to user
    return true;
  }

  return false;
};

/**
 * Get fallback route based on user permissions
 */
const getFallbackRoute = (userContext) => {
  if (!userContext) return '/login';

  // If user has no HR access, go to main dashboard
  if (!canAccessHRModule(userContext)) {
    return '/dashboard/home';
  }

  // Find the first route user has access to
  for (const route of HR_ROUTES) {
    if (route.redirect) continue; // Skip redirect routes
    
    const hasPermission = route.requiresAny 
      ? route.permissions.some(p => hasHRPermission(userContext, p))
      : route.permissions.every(p => hasHRPermission(userContext, p));
    
    if (hasPermission) {
      return route.path;
    }
  }

  // If no specific route accessible, try HR dashboard
  return '/dashboard/hr';
};

/**
 * HR Breadcrumb Navigation
 */
const HRBreadcrumb = ({ route, userContext }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const breadcrumbItems = getBreadcrumbItems(location.pathname, route);

  return (
    <nav style={{
      padding: '12px 0',
      borderBottom: '1px solid #e5e7eb',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        <button
          onClick={() => navigate('/dashboard/home')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '14px'
          }}
        >
          Dashboard
        </button>
        
        <span>→</span>
        
        <button
          onClick={() => navigate('/dashboard/hr')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '14px'
          }}
        >
          HR
        </button>

        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            <span>→</span>
            {item.active ? (
              <span style={{ color: '#111827', fontWeight: '500' }}>
                {item.title}
              </span>
            ) : (
              <button
                onClick={() => navigate(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}
              >
                {item.title}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

/**
 * Generate breadcrumb items from current path
 */
const getBreadcrumbItems = (pathname, currentRoute) => {
  const items = [];
  const pathParts = pathname.split('/').filter(Boolean);
  
  if (pathParts.includes('employees') && !pathname.includes('/employee/')) {
    items.push({ title: 'Employees', path: '/dashboard/hr/employees', active: true });
  } else if (pathname.includes('/employee/')) {
    items.push({ title: 'Employees', path: '/dashboard/hr/employees', active: false });
    items.push({ title: 'Employee Details', active: true });
  } else if (pathParts.includes('contracts') && !pathname.includes('/contract/')) {
    items.push({ title: 'Contracts', path: '/dashboard/hr/contracts', active: true });
  } else if (pathname.includes('/contract/')) {
    items.push({ title: 'Contracts', path: '/dashboard/hr/contracts', active: false });
    items.push({ title: 'Contract Details', active: true });
  } else if (pathParts.includes('onboarding') && !pathname.includes('/onboarding/')) {
    items.push({ title: 'Onboarding', path: '/dashboard/hr/onboarding', active: true });
  } else if (pathname.includes('/onboarding/') && pathname.split('/').length > 5) {
    items.push({ title: 'Onboarding', path: '/dashboard/hr/onboarding', active: false });
    items.push({ title: 'Employee Onboarding', active: true });
  } else if (pathParts.includes('writeups') && !pathname.includes('/writeup/')) {
    items.push({ title: 'Disciplinary', path: '/dashboard/hr/writeups', active: true });
  } else if (pathname.includes('/writeup/')) {
    items.push({ title: 'Disciplinary', path: '/dashboard/hr/writeups', active: false });
    items.push({ title: 'Writeup Details', active: true });
  } else if (pathParts.includes('policies') && !pathname.includes('/policy/')) {
    items.push({ title: 'Policies', path: '/dashboard/hr/policies', active: true });
  } else if (pathname.includes('/policy/')) {
    items.push({ title: 'Policies', path: '/dashboard/hr/policies', active: false });
    items.push({ title: 'Policy Details', active: true });
  } else if (pathParts.includes('settings')) {
    items.push({ title: 'Settings', active: true });
  } else if (pathParts.includes('analytics')) {
    items.push({ title: 'Analytics', active: true });
  }

  return items;
};

/**
 * Main HR Router Component
 */
const HRRouter = () => {
  const [userContext, setUserContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initializeHRContext();
  }, []);

  const initializeHRContext = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getHRUserContext();
      
      if (!result.success) {
        const hrError = handleHRError(new Error(result.error), {
          operation: 'initialize_hr_context',
          navigate
        });
        setError(hrError);
        return;
      }

      // Check if user has HR module access
      if (!canAccessHRModule(result.context)) {
        const hrError = handleHRError(new Error('HR access denied'), {
          operation: 'hr_module_access_check',
          userRole: result.context.role,
          navigate
        });
        setError(hrError);
        return;
      }

      setUserContext(result.context);
    } catch (error) {
      const hrError = handleHRError(error, {
        operation: 'initialize_hr_context',
        navigate
      });
      setError(hrError);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #14B8A6',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 8px auto'
          }}></div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
            Loading HR Module...
          </p>
        </div>
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#dc2626',
            margin: '0 0 16px 0'
          }}>
            HR Access Error
          </h2>
          
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            lineHeight: '1.5',
            margin: '0 0 24px 0'
          }}>
            {error.message || 'Unable to access HR module'}
          </p>
          
          <button
            onClick={() => navigate('/dashboard/home')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Find current route
  const currentRoute = HR_ROUTES.find(route => {
    if (route.exact) {
      return location.pathname === route.path;
    }
    
    const routePattern = route.path
      .replace(/:\w+/g, '[^/]+')
      .replace(/\//g, '\\/');
    
    return new RegExp(`^${routePattern}$`).test(location.pathname);
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingTop: '60px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Breadcrumb Navigation */}
        {currentRoute && (
          <HRBreadcrumb route={currentRoute} userContext={userContext} />
        )}

        {/* Route Content */}
        <Routes>
          {HR_ROUTES.map((route, index) => {
            // Handle redirect routes
            if (route.redirect) {
              return (
                <Route
                  key={index}
                  path={route.path}
                  element={<Navigate to={route.redirect} replace />}
                />
              );
            }

            return (
              <Route
                key={index}
                path={route.path}
                element={
                  <HRAuthGuard route={route} userContext={userContext}>
                    <route.component userContext={userContext} />
                  </HRAuthGuard>
                }
              />
            );
          })}
          
          {/* Default redirect for /dashboard/hr/* routes */}
          <Route path="*" element={
            <Navigate to={getFallbackRoute(userContext)} replace />
          } />
        </Routes>
      </div>
    </div>
  );
};

export default HRRouter;