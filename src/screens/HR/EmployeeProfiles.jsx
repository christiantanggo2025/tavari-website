// screens/HR/EmployeeProfiles.jsx - Refactored with Component-Based Architecture
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Plus, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';

// Import all required consistency files
import { SecurityWrapper } from '../../Security';
import { useSecurityContext } from '../../Security';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../utils/TavariStyles';

// Import existing modals (keep as is)
import AddEmployeeModal from '../../components/HR/AddEmployeeModal';
import EmployeeEditModal from '../../components/HR/EmployeeEditModal';
import EmployeeAuditHistory from '../../components/HR/EmployeeAuditHistory';

// Import NEW component-based modals from HREmployeeProfilesComponents
import EmployeeCard from '../../components/HR/HREmployeeProfilesComponents/EmployeeCard';
import EmployeePremiumAssignmentModal from '../../components/HR/HREmployeeProfilesComponents/EmployeePremiumAssignmentModal';
import EmployeeCertificateManagementModal from '../../components/HR/HREmployeeProfilesComponents/EmployeeCertificateManagementModal';
import EmployeeLieuTimeTrackingModal from '../../components/HR/HREmployeeProfilesComponents/EmployeeLieuTimeTrackingModal';
import EmployeeVacationPayModal from '../../components/HR/HREmployeeProfilesComponents/EmployeeVacationPayModal';
import EmployeeBirthdayManager from '../../components/HR/HREmployeeProfilesComponents/EmployeeBirthdayManager';
import EmployeeSINManager from '../../components/HR/HREmployeeProfilesComponents/EmployeeSINManager';
import EmployeeStudentPaySettings from '../../components/HR/HREmployeeProfilesComponents/EmployeeStudentPaySettings';

const EmployeeProfiles = () => {
  const navigate = useNavigate();
  
  // Security context for sensitive employee data
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'EmployeeProfiles',
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
    componentName: 'EmployeeProfiles'
  });

  // Tax calculations for formatting
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId);

  // Component state
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [premiumFilter, setPremiumFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [error, setError] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [showPremiumAssignment, setShowPremiumAssignment] = useState(false);
  const [showCertificateManagement, setShowCertificateManagement] = useState(false);
  const [showLieuTimeModal, setShowLieuTimeModal] = useState(false);
  const [showVacationPayModal, setShowVacationPayModal] = useState(false);
  const [showBirthdayManager, setShowBirthdayManager] = useState(false);
  const [showSINManager, setShowSINManager] = useState(false);
  const [showStudentPaySettings, setShowStudentPaySettings] = useState(false);

  // Available data for filtering
  const [departments, setDepartments] = useState([]);
  const [availablePremiums, setAvailablePremiums] = useState([]);
  const [availableCertificates, setAvailableCertificates] = useState([]);

  // User context for child components
  const userContext = {
    user: authUser,
    businessId: selectedBusinessId,
    role: userRole
  };

  // Load employees with premium and certificate data
  useEffect(() => {
    if (selectedBusinessId && !authLoading) {
      loadEmployees();
      loadAvailablePremiums();
      loadAvailableCertificates();
    }
  }, [selectedBusinessId, authLoading]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      
      await logSecurityEvent('employee_data_access', {
        action: 'load_employee_profiles',
        business_id: selectedBusinessId
      }, 'low');
      
      // Load users for the business through business_users join - UPDATED to include all fields
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
          lieu_time_enabled,
          max_paid_hours_per_period,
          lieu_time_balance,
          vacation_percent,
          birth_date,
          sin_number,
          student_pay_enabled,
          created_at,
          business_users!inner(business_id)
        `)
        .eq('business_users.business_id', selectedBusinessId)
        .order('first_name');

      if (userError) throw userError;

      // Get user IDs for loading premium and certificate data
      const userIds = (userData || []).map(user => user.id);

      // Load premium data from hrpayroll_employee_premiums table
      const { data: premiumData, error: premiumError } = await supabase
        .from('hrpayroll_employee_premiums')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .eq('is_active', true)
        .in('user_id', userIds);

      // Load certificate data with proper join to hr_certificates
      const { data: certificateData, error: certificateError } = await supabase
        .from('employee_certificates')
        .select(`
          *,
          hr_certificates!inner(
            id,
            name,
            description,
            issuing_authority,
            requires_renewal,
            renewal_period_months
          )
        `)
        .eq('business_id', selectedBusinessId)
        .eq('status', 'active')
        .in('employee_id', userIds);

      // Note: Premium and certificate errors are not fatal since tables might be empty
      console.log('Premium data loaded:', premiumData?.length || 0, 'records');
      console.log('Certificate data loaded:', certificateData?.length || 0, 'records');

      const data = userData;

      // Transform the data to match expected format with premium and certificate info
      const transformedEmployees = (data || []).map(user => {
        // Find premium assignments for this user from hrpayroll_employee_premiums
        const userPremiums = (premiumData || [])
          .filter(premium => premium.user_id === user.id)
          .map(premium => ({
            id: premium.id,
            premium: {
              id: premium.id,
              name: premium.premium_name,
              rate: premium.premium_rate,
              rate_type: 'fixed_amount',
              applies_to_all_hours: premium.applies_to_all_hours
            },
            created_at: premium.created_at
          }));

        // Find certificate assignments for this user from employee_certificates
        const userCertificates = (certificateData || [])
          .filter(cert => cert.employee_id === user.id && cert.hr_certificates)
          .map(cert => ({
            id: cert.id,
            certificate: cert.hr_certificates,
            issue_date: cert.issue_date,
            expiry_date: cert.expiry_date,
            certificate_number: cert.certificate_number,
            document_path: cert.document_path,
            status: cert.status,
            is_expired: cert.expiry_date ? new Date(cert.expiry_date) < new Date() : false,
            days_until_expiry: cert.expiry_date ? Math.ceil((new Date(cert.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
          }));

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
          // Lieu time fields
          lieu_time_enabled: user.lieu_time_enabled || false,
          max_paid_hours_per_period: user.max_paid_hours_per_period,
          lieu_time_balance: user.lieu_time_balance || 0,
          // Vacation pay field
          vacation_percent: user.vacation_percent,
          // NEW: Birthday and SIN fields
          birth_date: user.birth_date,
          sin_number: user.sin_number,
          student_pay_enabled: user.student_pay_enabled || false,
          created_at: user.created_at,
          tenure: user.hire_date ? calculateTenure(user.hire_date) : null,
          // Premium information from hrpayroll_employee_premiums
          active_premiums: userPremiums,
          // Certificate information from employee_certificates
          active_certificates: userCertificates
        };
      });
      
      setEmployees(transformedEmployees);

      // Extract unique departments for filtering
      const uniqueDepartments = [...new Set(
        transformedEmployees
          .map(emp => emp.department)
          .filter(dept => dept && dept.trim())
      )].sort();
      setDepartments(uniqueDepartments);

      console.log('Loaded employees with all data:', transformedEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      await logSecurityEvent('employee_data_access_failed', {
        error_message: error.message,
        business_id: selectedBusinessId
      }, 'medium');
      setError('Failed to load employees: ' + error.message);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePremiums = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_shift_premiums')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAvailablePremiums(data || []);
    } catch (error) {
      console.error('Error loading available premiums:', error);
    }
  };

  const loadAvailableCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_certificates')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAvailableCertificates(data || []);
    } catch (error) {
      console.error('Error loading available certificates:', error);
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

  // Event handlers for employee actions
  const handleEmployeeCreated = (newEmployee) => {
    setShowAddModal(false);
    loadEmployees();
    console.log('New employee created:', newEmployee);
    recordAction('create_employee', newEmployee.id);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
    console.log('Edit employee:', employee.id);
  };

  const handleEmployeeSaved = (updatedEmployee) => {
    setShowEditModal(false);
    setSelectedEmployee(null);
    loadEmployees();
    console.log('Employee updated:', updatedEmployee);
    recordAction('update_employee', updatedEmployee.id);
  };

  const handleViewAuditHistory = (employee) => {
    setSelectedEmployee(employee);
    setShowAuditHistory(true);
    console.log('View audit history for employee:', employee.id);
    recordAction('view_audit_history', employee.id);
  };

  const handleViewEmployee = (employee) => {
    console.log('View employee details:', employee.id);
    handleEditEmployee(employee);
  };

  const handleManagePremiums = (employee) => {
    setSelectedEmployee(employee);
    setShowPremiumAssignment(true);
    console.log('Manage premiums for employee:', employee.id);
    recordAction('manage_employee_premiums', employee.id);
  };

  const handleManageCertificates = (employee) => {
    setSelectedEmployee(employee);
    setShowCertificateManagement(true);
    console.log('Manage certificates for employee:', employee.id);
    recordAction('manage_employee_certificates', employee.id);
  };

  const handleManageLieuTime = (employee) => {
    setSelectedEmployee(employee);
    setShowLieuTimeModal(true);
    console.log('Manage lieu time for employee:', employee.id);
    recordAction('manage_employee_lieu_time', employee.id);
  };
  
  const handleManageVacationPay = (employee) => {
    setSelectedEmployee(employee);
    setShowVacationPayModal(true);
    console.log('Manage vacation pay for employee:', employee.id);
    recordAction('manage_employee_vacation_pay', employee.id);
  };

  // NEW: Birthday management handler
  const handleManageBirthday = (employee) => {
    setSelectedEmployee(employee);
    setShowBirthdayManager(true);
    console.log('Manage birthday for employee:', employee.id);
    recordAction('manage_employee_birthday', employee.id);
  };

  // NEW: SIN management handler
  const handleManageSIN = (employee) => {
    setSelectedEmployee(employee);
    setShowSINManager(true);
    console.log('Manage SIN for employee:', employee.id);
    recordAction('manage_employee_sin', employee.id);
  };

  // NEW: Student pay toggle handler
  const handleToggleStudentPay = (employee) => {
    setSelectedEmployee(employee);
    setShowStudentPaySettings(true);
    console.log('Toggle student pay for employee:', employee.id);
    recordAction('toggle_student_pay', employee.id);
  };

  // Update handlers for modal callbacks
  const handleVacationPayUpdated = (employeeId, newVacationPercent) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId ? { ...emp, vacation_percent: newVacationPercent } : emp
    );
    setEmployees(updatedEmployees);
  
    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee(prev => ({ ...prev, vacation_percent: newVacationPercent }));
    }
  
    console.log(`Updated vacation pay for employee ${employeeId}: ${(newVacationPercent * 100).toFixed(1)}%`);
  };

  const handleBirthdayUpdated = (employeeId, newBirthDate) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId ? { ...emp, birth_date: newBirthDate } : emp
    );
    setEmployees(updatedEmployees);
  
    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee(prev => ({ ...prev, birth_date: newBirthDate }));
    }
  
    console.log(`Updated birthday for employee ${employeeId}: ${newBirthDate}`);
  };

  const handleSINUpdated = (employeeId, hasSIN) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId ? { ...emp, sin_number: hasSIN ? '[PROTECTED]' : null } : emp
    );
    setEmployees(updatedEmployees);
  
    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee(prev => ({ ...prev, sin_number: hasSIN ? '[PROTECTED]' : null }));
    }
  
    console.log(`Updated SIN for employee ${employeeId}: ${hasSIN ? 'Set' : 'Removed'}`);
  };

  const handleStudentPayUpdated = (employeeId, studentPayEnabled) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId ? { ...emp, student_pay_enabled: studentPayEnabled } : emp
    );
    setEmployees(updatedEmployees);
  
    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee(prev => ({ ...prev, student_pay_enabled: studentPayEnabled }));
    }
  
    console.log(`Updated student pay for employee ${employeeId}: ${studentPayEnabled}`);
  };

  const handleDeleteEmployee = async (employee) => {
    if (confirm(`Are you sure you want to delete ${employee.full_name}? This action cannot be undone.`)) {
      try {
        await logSecurityEvent('employee_deletion_attempt', {
          employee_id: employee.id,
          employee_name: employee.full_name
        }, 'high');
        
        // TODO: Implement delete functionality
        console.log('Delete employee:', employee.id);
        recordAction('delete_employee', employee.id);
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleTerminateEmployee = async (employee) => {
    const reason = prompt(`Please provide a reason for terminating ${employee.full_name}:`);
    if (reason === null) return;
    
    const terminationDate = prompt('Enter termination date (YYYY-MM-DD) or leave blank for today:');
    if (terminationDate === null) return;
    
    const finalTerminationDate = terminationDate.trim() || new Date().toISOString().split('T')[0];
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalTerminationDate)) {
      alert('Invalid date format. Please use YYYY-MM-DD format.');
      return;
    }
    
    if (confirm(`Are you sure you want to terminate ${employee.full_name} effective ${finalTerminationDate}?`)) {
      try {
        await logSecurityEvent('employee_termination_attempt', {
          employee_id: employee.id,
          employee_name: employee.full_name,
          termination_date: finalTerminationDate,
          reason: reason
        }, 'high');
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            employment_status: 'terminated',
            termination_date: finalTerminationDate
          })
          .eq('id', employee.id);
        
        if (updateError) {
          console.error('Error terminating employee:', updateError);
          alert('Failed to terminate employee: ' + updateError.message);
          return;
        }
        
        await logSecurityEvent('employee_terminated', {
          employee_id: employee.id,
          employee_name: employee.full_name,
          termination_date: finalTerminationDate,
          terminated_by: authUser?.id,
          reason: reason
        }, 'high');
        
        console.log('Employee terminated:', employee.id);
        recordAction('terminate_employee', employee.id);
        loadEmployees();
        
        alert(`${employee.full_name} has been terminated successfully.`);
        
      } catch (error) {
        console.error('Error terminating employee:', error);
        alert('Failed to terminate employee: ' + error.message);
      }
    }
  };

  // Permission checks
  const canManageEmployees = () => {
    return userRole && ['owner', 'manager', 'admin'].includes(userRole);
  };

  const canViewAuditHistory = () => {
    return userRole && ['owner', 'manager', 'admin'].includes(userRole);
  };

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = !searchTerm || 
      employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || employee.employment_status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    
    const matchesPremium = premiumFilter === 'all' || 
      (premiumFilter === 'has_premiums' && employee.active_premiums.length > 0) ||
      (premiumFilter === 'no_premiums' && employee.active_premiums.length === 0) ||
      employee.active_premiums.some(p => p.premium.id === premiumFilter);
    
    return matchesSearch && matchesStatus && matchesDepartment && matchesPremium;
  });

  // Get employee statistics
  const stats = {
    total: employees.length,
    active: employees.filter(e => e.employment_status === 'active').length,
    probation: employees.filter(e => e.employment_status === 'probation').length,
    recent: employees.filter(e => e.hire_date && new Date(e.hire_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
    with_premiums: employees.filter(e => e.active_premiums.length > 0).length,
    with_certificates: employees.filter(e => e.active_certificates.length > 0).length,
    with_lieu_time: employees.filter(e => e.lieu_time_enabled).length,
    lieu_time_warnings: employees.filter(e => e.lieu_time_enabled && e.lieu_time_balance >= 40).length
  };

  // Styles using TavariStyles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing['3xl'],
      paddingTop: '100px',
      boxSizing: 'border-box'
    },
    header: {
      marginBottom: TavariStyles.spacing['3xl'],
      textAlign: 'center'
    },
    errorBanner: {
      ...TavariStyles.components.banner?.base,
      ...TavariStyles.components.banner?.variants?.error,
      position: 'relative'
    },
    errorClose: {
      position: 'absolute',
      right: '15px',
      background: 'none',
      border: 'none',
      color: TavariStyles.colors.danger,
      cursor: 'pointer'
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing['3xl']
    },
    statCard: {
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.xl,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      textAlign: 'center',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.sm || '0 1px 3px rgba(0,0,0,0.1)'
    },
    statValue: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.sm
    },
    statLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing['3xl'],
      gap: TavariStyles.spacing.xl,
      flexWrap: 'wrap'
    },
    searchSection: {
      display: 'flex',
      gap: TavariStyles.spacing.lg,
      flex: 1,
      flexWrap: 'wrap'
    },
    searchGroup: {
      position: 'relative',
      flex: 1,
      minWidth: '300px'
    },
    searchIcon: {
      position: 'absolute',
      left: TavariStyles.spacing.md,
      top: '50%',
      transform: 'translateY(-50%)',
      color: TavariStyles.colors.gray500
    },
    searchInput: {
      ...TavariStyles.components.form?.input,
      width: '100%',
      paddingLeft: '40px'
    },
    filterGroup: {
      position: 'relative',
      minWidth: '150px'
    },
    filterIcon: {
      position: 'absolute',
      left: TavariStyles.spacing.md,
      top: '50%',
      transform: 'translateY(-50%)',
      color: TavariStyles.colors.gray500,
      zIndex: 1
    },
    filterSelect: {
      ...TavariStyles.components.form?.select,
      width: '100%',
      paddingLeft: '40px'
    },
    createButton: {
      ...TavariStyles.components.button?.base,
      ...TavariStyles.components.button?.variants?.primary,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      whiteSpace: 'nowrap'
    },
    content: {
      marginBottom: TavariStyles.spacing['3xl']
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: TavariStyles.colors.gray500
    },
    emptyIcon: {
      color: TavariStyles.colors.gray400,
      marginBottom: TavariStyles.spacing.xl
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
    employeeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
      gap: TavariStyles.spacing.xl,
      paddingBottom: TavariStyles.spacing.xl
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
      componentName="EmployeeProfiles"
    >
      <SecurityWrapper>
        <div style={styles.container}>
          <div style={styles.header}>
            <h2>Employee Profiles</h2>
            <p>Manage employee information, premiums, certificates, lieu time, and view change history</p>
          </div>

          {error && (
            <div style={styles.errorBanner}>
              <AlertCircle size={20} style={{ marginRight: '8px' }} />
              {error}
              <button
                onClick={() => setError(null)}
                style={styles.errorClose}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Stats section */}
          <div style={styles.stats}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Employees</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: TavariStyles.colors.success}}>{stats.active}</div>
              <div style={styles.statLabel}>Active</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: TavariStyles.colors.warning}}>{stats.probation}</div>
              <div style={styles.statLabel}>On Probation</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: TavariStyles.colors.info}}>{stats.recent}</div>
              <div style={styles.statLabel}>Hired (Last 30 Days)</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: TavariStyles.colors.success}}>{stats.with_premiums}</div>
              <div style={styles.statLabel}>With Premiums</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: TavariStyles.colors.info}}>{stats.with_certificates}</div>
              <div style={styles.statLabel}>With Certificates</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: TavariStyles.colors.primary}}>{stats.with_lieu_time}</div>
              <div style={styles.statLabel}>With Lieu Time</div>
            </div>
            {stats.lieu_time_warnings > 0 && (
              <div style={styles.statCard}>
                <div style={{...styles.statValue, color: TavariStyles.colors.warning}}>{stats.lieu_time_warnings}</div>
                <div style={styles.statLabel}>High Lieu Balance</div>
              </div>
            )}
          </div>

          {/* Controls section */}
          <div style={styles.controls}>
            <div style={styles.searchSection}>
              <div style={styles.searchGroup}>
                <Search size={20} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search employees by name, email, position, or employee #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              
              <div style={styles.filterGroup}>
                <Filter size={20} style={styles.filterIcon} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="suspended">Suspended</option>
                  <option value="terminated">Terminated</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              <div style={styles.filterGroup}>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <select
                  value={premiumFilter}
                  onChange={(e) => setPremiumFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Premiums</option>
                  <option value="has_premiums">Has Premiums</option>
                  <option value="no_premiums">No Premiums</option>
                  {availablePremiums.map(premium => (
                    <option key={premium.id} value={premium.id}>
                      {premium.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {canManageEmployees() && (
              <button
                onClick={() => setShowAddModal(true)}
                style={styles.createButton}
              >
                <Plus size={20} />
                Add Employee
              </button>
            )}
          </div>

          {/* Content section */}
          <div style={styles.content}>
            {loading ? (
              <div style={styles.loading}>Loading employee profiles...</div>
            ) : filteredEmployees.length === 0 ? (
              <div style={styles.emptyState}>
                <Users size={64} style={styles.emptyIcon} />
                <h3 style={styles.emptyTitle}>No employees found</h3>
                <p style={styles.emptyText}>
                  {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || premiumFilter !== 'all'
                    ? 'Try adjusting your search filters.'
                    : 'Get started by adding your first employee.'
                  }
                </p>
                {canManageEmployees() && !searchTerm && statusFilter === 'all' && departmentFilter === 'all' && premiumFilter === 'all' && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    style={styles.createButton}
                  >
                    Add First Employee
                  </button>
                )}
              </div>
            ) : (
              <div style={styles.employeeGrid}>
                {filteredEmployees.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    formatTaxAmount={formatTaxAmount}
                    canManageEmployees={canManageEmployees}
                    canViewAuditHistory={canViewAuditHistory}
                    onViewEmployee={handleViewEmployee}
                    onEditEmployee={handleEditEmployee}
                    onManagePremiums={handleManagePremiums}
                    onManageCertificates={handleManageCertificates}
                    onManageLieuTime={handleManageLieuTime}
                    onManageVacationPay={handleManageVacationPay}
                    onViewAuditHistory={handleViewAuditHistory}
                    onTerminateEmployee={handleTerminateEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    onManageBirthday={handleManageBirthday}
                    onManageSIN={handleManageSIN}
                    onToggleStudentPay={handleToggleStudentPay}
                  />
                ))}
              </div>
            )}
          </div>

          {/* EXISTING MODALS (Keep as is) */}
          <AddEmployeeModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            businessId={selectedBusinessId}
            onEmployeeCreated={handleEmployeeCreated}
            userContext={userContext}
            mode="create"
            availablePremiums={availablePremiums}
            availableCertificates={availableCertificates}
          />

          <EmployeeEditModal
            isOpen={showEditModal}
            employee={selectedEmployee}
            userContext={userContext}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEmployee(null);
            }}
            onSave={handleEmployeeSaved}
            mode="edit"
            availablePremiums={availablePremiums}
            availableCertificates={availableCertificates}
          />

          <EmployeeAuditHistory
            isOpen={showAuditHistory}
            employee={selectedEmployee}
            userContext={userContext}
            onClose={() => {
              setShowAuditHistory(false);
              setSelectedEmployee(null);
            }}
          />

          {/* NEW COMPONENT-BASED MODALS */}
          <EmployeePremiumAssignmentModal
            isOpen={showPremiumAssignment}
            onClose={() => {
              setShowPremiumAssignment(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            availablePremiums={availablePremiums}
            onPremiumsUpdated={loadEmployees}
          />

          <EmployeeCertificateManagementModal
            isOpen={showCertificateManagement}
            onClose={() => {
              setShowCertificateManagement(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            availableCertificates={availableCertificates}
            onCertificatesUpdated={loadEmployees}
          />

          <EmployeeLieuTimeTrackingModal
            isOpen={showLieuTimeModal}
            onClose={() => {
              setShowLieuTimeModal(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            businessId={selectedBusinessId}
            onBalanceUpdate={(newBalance) => {
              if (selectedEmployee) {
                const updatedEmployees = employees.map(emp => 
                  emp.id === selectedEmployee.id ? { ...emp, lieu_time_balance: newBalance } : emp
                );
                setEmployees(updatedEmployees);
                setSelectedEmployee(prev => ({ ...prev, lieu_time_balance: newBalance }));
              }
            }}
          />

          <EmployeeVacationPayModal
            isOpen={showVacationPayModal}
            onClose={() => {
              setShowVacationPayModal(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            businessId={selectedBusinessId}
            onVacationPayUpdated={handleVacationPayUpdated}
          />

          <EmployeeBirthdayManager
            isOpen={showBirthdayManager}
            onClose={() => {
              setShowBirthdayManager(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            businessId={selectedBusinessId}
            onBirthdayUpdated={handleBirthdayUpdated}
          />

          <EmployeeSINManager
            isOpen={showSINManager}
            onClose={() => {
              setShowSINManager(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            businessId={selectedBusinessId}
            authUser={authUser}
            onSINUpdated={handleSINUpdated}
          />

          <EmployeeStudentPaySettings
            isOpen={showStudentPaySettings}
            onClose={() => {
              setShowStudentPaySettings(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            businessId={selectedBusinessId}
            businessSettings={businessData}
            authUser={authUser}
            onStudentPayUpdated={handleStudentPayUpdated}
          />
        </div>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default EmployeeProfiles;