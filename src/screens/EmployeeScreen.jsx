// src/screens/EmployeeScreen.jsx - Updated to use same data structure as EmployeeProfiles
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Import all required consistency files
import { SecurityWrapper } from '../Security';
import { useSecurityContext } from '../Security';
import { usePOSAuth } from '../hooks/usePOSAuth';
import { useTaxCalculations } from '../hooks/useTaxCalculations';
import POSAuthWrapper from '../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../components/UI/TavariCheckbox';
import { TavariStyles } from '../utils/TavariStyles';

import SessionManager from '../components/SessionManager';

const EmployeeScreen = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Security context for sensitive employee data
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'EmployeeScreen',
    sensitiveComponent: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    securityLevel: 'high'
  });

  // Authentication using standardized hook
  const {
    selectedBusinessId,
    authUser,
    userRole,
    businessData,
    authLoading,
    authError,
    isManager,
    isOwner
  } = usePOSAuth({
    requiredRoles: ['owner', 'manager', 'admin'],
    requireBusiness: true,
    componentName: 'EmployeeScreen'
  });

  // Tax calculations for formatting
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId);

  // Load employees using the same structure as EmployeeProfiles
  useEffect(() => {
    if (selectedBusinessId && !authLoading) {
      fetchEmployees();
    }
  }, [selectedBusinessId, authLoading]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      logSecurityEvent('employee_data_access', {
        action: 'load_employee_list',
        business_id: selectedBusinessId
      }, 'low');
      
      // Use the same query structure as EmployeeProfiles for consistency
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id, 
          first_name,
          last_name,
          full_name, 
          email,
          phone,
          position,
          department,
          employment_status,
          hire_date,
          termination_date,
          wage,
          employee_number,
          created_at,
          business_users!inner(business_id, role)
        `)
        .eq('business_users.business_id', selectedBusinessId)
        .order('first_name');

      if (userError) throw userError;

      // Transform the data to match expected format
      const transformedEmployees = (userData || []).map(user => {
        return {
          id: user.id,
          first_name: user.first_name || user.full_name?.split(' ')[0] || 'Unknown',
          last_name: user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '',
          full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email,
          phone: user.phone,
          position: user.position,
          department: user.department,
          employment_status: user.employment_status || 'active',
          hire_date: user.hire_date,
          termination_date: user.termination_date,
          wage: user.wage,
          employee_number: user.employee_number,
          created_at: user.created_at,
          role: user.business_users?.role || 'employee', // Get role from business_users
          business_name: businessData?.name || 'Current Business',
          tenure: user.hire_date ? calculateTenure(user.hire_date) : null
        };
      });
      
      setEmployees(transformedEmployees);
      console.log('Loaded employees with complete data:', transformedEmployees);
      
    } catch (error) {
      console.error('Error loading employees:', error);
      logSecurityEvent('employee_data_access_failed', {
        error_message: error.message,
        business_id: selectedBusinessId
      }, 'medium');
      setError('Failed to load employees: ' + error.message);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTenure = (hireDate) => {
    if (!hireDate) return null;
    
    const hire = new Date(hireDate);
    const now = new Date();
    const diffTime = Math.abs(now - hire);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''}`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return TavariStyles.colors.success;
      case 'probation': return TavariStyles.colors.warning;
      case 'suspended': return TavariStyles.colors.danger;
      case 'terminated': return TavariStyles.colors.gray500;
      case 'on_leave': return TavariStyles.colors.info;
      default: return TavariStyles.colors.gray500;
    }
  };

  const handleEmployeeClick = (employee) => {
    recordAction('view_employee_details', employee.id);
    navigate(`/dashboard/employee/${employee.id}`);
  };

  const handleAddEmployee = () => {
    recordAction('navigate_add_employee');
    navigate('/dashboard/add-user');
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.position?.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Enhanced styles using TavariStyles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing['3xl'],
      paddingTop: '100px', // Account for header
      boxSizing: 'border-box'
    },
    header: {
      marginBottom: TavariStyles.spacing['3xl'],
      textAlign: 'center'
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.sm
    },
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },
    headerRow: {
      display: 'flex',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing['3xl'],
      alignItems: 'center'
    },
    searchInput: {
      ...TavariStyles.components.form?.input,
      flex: 3,
      fontSize: TavariStyles.typography.fontSize.md
    },
    addButton: {
      ...TavariStyles.components.button?.base,
      ...TavariStyles.components.button?.variants?.primary,
      flex: 1,
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: TavariStyles.spacing.sm
    },
    errorBanner: {
      backgroundColor: TavariStyles.colors.errorBg,
      color: TavariStyles.colors.errorText,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      border: `1px solid ${TavariStyles.colors.danger}`,
      marginBottom: TavariStyles.spacing.md,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    gridContainer: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      overflow: 'hidden',
      boxShadow: TavariStyles.shadows?.base || '0 2px 4px rgba(0,0,0,0.1)',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    gridHeader: {
      display: 'grid',
      gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 1fr 1fr 1fr',
      backgroundColor: TavariStyles.colors.gray100,
      padding: TavariStyles.spacing.lg,
      borderBottom: `2px solid ${TavariStyles.colors.gray200}`,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    gridRow: {
      display: 'grid',
      gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 1fr 1fr 1fr',
      padding: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      fontSize: TavariStyles.typography.fontSize.sm,
      alignItems: 'center'
    },
    gridRowHover: {
      backgroundColor: TavariStyles.colors.gray50
    },
    link: {
      color: TavariStyles.colors.primary,
      textDecoration: 'none',
      fontWeight: TavariStyles.typography.fontWeight.semibold
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      textAlign: 'center',
      textTransform: 'uppercase'
    },
    employeeNumber: {
      fontFamily: TavariStyles.typography.fontFamilyMono,
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      backgroundColor: TavariStyles.colors.gray100,
      padding: '2px 6px',
      borderRadius: TavariStyles.borderRadius?.sm || '4px'
    },
    wage: {
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.primary
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: TavariStyles.colors.gray500
    },
    emptyTitle: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      marginBottom: TavariStyles.spacing.md,
      color: TavariStyles.colors.gray700
    },
    emptyText: {
      fontSize: TavariStyles.typography.fontSize.lg,
      marginBottom: TavariStyles.spacing['3xl']
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    }
  };

  return (
    <POSAuthWrapper
      requiredRoles={['owner', 'manager', 'admin']}
      requireBusiness={true}
      componentName="EmployeeScreen"
    >
      <SecurityWrapper>
        <SessionManager>
          <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
              <h1 style={styles.title}>Employee Directory</h1>
              <p style={styles.subtitle}>View and manage your team members</p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={styles.errorBanner}>
                {error}
              </div>
            )}

            {/* Search and Add Controls */}
            <div style={styles.headerRow}>
              <input
                type="text"
                placeholder="Search employees by name, email, position, department, or employee #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              <button style={styles.addButton} onClick={handleAddEmployee}>
                <span>+</span>
                Add Employee
              </button>
            </div>

            {/* Employee Grid */}
            <div style={styles.gridContainer}>
              <div style={styles.gridHeader}>
                <span>Name</span>
                <span>Email</span>
                <span>Position</span>
                <span>Department</span>
                <span>Status</span>
                <span>Employee #</span>
                <span>Wage</span>
              </div>

              {loading ? (
                <div style={styles.loading}>Loading employees...</div>
              ) : filteredEmployees.length === 0 ? (
                <div style={styles.emptyState}>
                  <h3 style={styles.emptyTitle}>
                    {search ? 'No employees found' : 'No employees yet'}
                  </h3>
                  <p style={styles.emptyText}>
                    {search 
                      ? 'Try adjusting your search terms.'
                      : 'Get started by adding your first employee.'
                    }
                  </p>
                  {!search && (
                    <button style={styles.addButton} onClick={handleAddEmployee}>
                      Add First Employee
                    </button>
                  )}
                </div>
              ) : (
                filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    style={styles.gridRow}
                    onClick={() => handleEmployeeClick(emp)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = TavariStyles.colors.gray50;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={styles.link}>
                      {emp.full_name}
                      {emp.termination_date && (
                        <div style={{
                          fontSize: TavariStyles.typography.fontSize.xs,
                          color: TavariStyles.colors.danger,
                          fontWeight: 'normal'
                        }}>
                          Terminated: {new Date(emp.termination_date).toLocaleDateString()}
                        </div>
                      )}
                      {emp.tenure && !emp.termination_date && (
                        <div style={{
                          fontSize: TavariStyles.typography.fontSize.xs,
                          color: TavariStyles.colors.gray500,
                          fontWeight: 'normal'
                        }}>
                          {emp.tenure}
                        </div>
                      )}
                    </span>
                    
                    <span>{emp.email}</span>
                    
                    <span>{emp.position || '-'}</span>
                    
                    <span>{emp.department || '-'}</span>
                    
                    <span>
                      <div
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: `${getStatusColor(emp.employment_status)}20`,
                          color: getStatusColor(emp.employment_status),
                          border: `1px solid ${getStatusColor(emp.employment_status)}40`
                        }}
                      >
                        {emp.employment_status?.replace('_', ' ') || 'Active'}
                      </div>
                    </span>
                    
                    <span>
                      {emp.employee_number ? (
                        <span style={styles.employeeNumber}>
                          #{emp.employee_number}
                        </span>
                      ) : (
                        <span style={{color: TavariStyles.colors.gray400}}>-</span>
                      )}
                    </span>
                    
                    <span style={styles.wage}>
                      {emp.wage ? `$${formatTaxAmount(emp.wage)}/hr` : '-'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </SessionManager>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default EmployeeScreen;