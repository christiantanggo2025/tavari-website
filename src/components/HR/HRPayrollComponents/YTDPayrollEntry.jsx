// components/HR/HRPayrollComponents/YTDPayrollEntry.jsx - Year-to-Date Payroll Information Entry
// Updated to match actual hrpayroll_ytd_data table structure
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import { useCanadianTaxCalculations } from '../../../hooks/useCanadianTaxCalculations';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const YTDPayrollEntry = ({ selectedBusinessId, businessData }) => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('active');
  const [allPremiums, setAllPremiums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // YTD Data State - UPDATED to match actual table columns
  const [ytdData, setYtdData] = useState({
    // Hours fields
    regular_hours: '',
    overtime_hours: '',
    lieu_hours: '',
    stat_hours: '',
    holiday_hours: '',
    hours_worked: '',
    
    // Income fields
    regular_income: '',
    overtime_income: '',
    lieu_income: '',
    vacation_pay: '',
    shift_premiums: '',
    stat_earnings: '',
    holiday_earnings: '',
    bonus: '', // Note: "bonus" not "bonus_pay"
    
    // Deduction fields
    federal_tax: '',
    provincial_tax: '',
    cpp_deduction: '',
    ei_deduction: '',
    additional_tax: '',
    
    // Manual entry fields
    manual_entry_reason: ''
  });

  // Security context for YTD entry
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'YTDPayrollEntry',
    sensitiveComponent: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    securityLevel: 'critical'
  });

  // Authentication context
  const {
    selectedBusinessId: authBusinessId,
    authUser,
    userRole,
    businessData: authBusinessData
  } = usePOSAuth({
    requiredRoles: ['owner', 'manager', 'hr_admin'],
    requireBusiness: true,
    componentName: 'YTDPayrollEntry'
  });

  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId || authBusinessId);
  const canadianTax = useCanadianTaxCalculations(selectedBusinessId || authBusinessId);

  const effectiveBusinessId = selectedBusinessId || authBusinessId;

  // Load employees and premiums
  useEffect(() => {
    if (effectiveBusinessId) {
      loadEmployees();
      loadPremiums();
    }
  }, [effectiveBusinessId]);

  // Filter employees when status filter changes
  useEffect(() => {
    filterEmployees();
  }, [employees, employeeStatusFilter]);

  // Load existing YTD data when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      loadExistingYTDData();
    } else {
      clearForm();
    }
  }, [selectedEmployee]);

  // Load employees using business_users table
  const loadEmployees = async () => {
    try {
      await logSecurityEvent('ytd_employee_data_access', {
        action: 'load_employees_for_ytd',
        business_id: effectiveBusinessId
      }, 'low');

      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          full_name,
          email,
          employment_status,
          employee_number,
          position,
          department,
          hire_date,
          termination_date,
          business_users!inner(business_id)
        `)
        .eq('business_users.business_id', effectiveBusinessId)
        .order('first_name');

      if (error) throw error;

      const employeeList = (userData || []).map(user => ({
        id: user.id,
        name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        employee_number: user.employee_number,
        position: user.position,
        department: user.department,
        hire_date: user.hire_date,
        termination_date: user.termination_date,
        employment_status: user.employment_status || 'active'
      }))
      .filter(emp => emp.name.trim())
      .sort((a, b) => a.name.localeCompare(b.name));

      setEmployees(employeeList);
      console.log('Loaded all employees for filtering:', employeeList.length);
    } catch (error) {
      console.error('Error loading employees:', error);
      await logSecurityEvent('ytd_employee_load_failed', {
        error_message: error.message,
        business_id: effectiveBusinessId
      }, 'medium');
      setEmployees([]);
    }
  };

  // Filter employees based on status selection
  const filterEmployees = () => {
    let filtered = employees;

    switch (employeeStatusFilter) {
      case 'active':
        filtered = employees.filter(emp => emp.employment_status === 'active');
        break;
      case 'terminated':
        filtered = employees.filter(emp => emp.employment_status === 'terminated');
        break;
      case 'probation':
        filtered = employees.filter(emp => emp.employment_status === 'probation');
        break;
      case 'suspended':
        filtered = employees.filter(emp => emp.employment_status === 'suspended');
        break;
      case 'on_leave':
        filtered = employees.filter(emp => emp.employment_status === 'on_leave');
        break;
      case 'current':
        filtered = employees.filter(emp => 
          ['active', 'probation', 'on_leave'].includes(emp.employment_status)
        );
        break;
      case 'all':
      default:
        filtered = employees;
        break;
    }

    setFilteredEmployees(filtered);
    
    if (selectedEmployee && !filtered.find(emp => emp.id === selectedEmployee)) {
      setSelectedEmployee('');
    }
  };

  const loadPremiums = async () => {
    try {
      const { data: premiums, error } = await supabase
        .from('hrpremiums')
        .select('*')
        .eq('business_id', effectiveBusinessId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAllPremiums(premiums || []);
    } catch (error) {
      console.error('Error loading premiums:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingYTDData = async () => {
    try {
      setLoading(true);
      
      const currentYear = new Date().getFullYear();
      const { data: existingData, error } = await supabase
        .from('hrpayroll_ytd_data')
        .select('*')
        .eq('user_id', selectedEmployee)
        .eq('business_id', effectiveBusinessId)
        .eq('tax_year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (existingData) {
        // UPDATED: Load data using actual column names
        setYtdData({
          regular_hours: existingData.regular_hours || '',
          overtime_hours: existingData.overtime_hours || '',
          lieu_hours: existingData.lieu_hours || '',
          stat_hours: existingData.stat_hours || '',
          holiday_hours: existingData.holiday_hours || '',
          hours_worked: existingData.hours_worked || '',
          regular_income: existingData.regular_income || '',
          overtime_income: existingData.overtime_income || '',
          lieu_income: existingData.lieu_income || '',
          vacation_pay: existingData.vacation_pay || '',
          shift_premiums: existingData.shift_premiums || '',
          stat_earnings: existingData.stat_earnings || '',
          holiday_earnings: existingData.holiday_earnings || '',
          bonus: existingData.bonus || '',
          federal_tax: existingData.federal_tax || '',
          provincial_tax: existingData.provincial_tax || '',
          cpp_deduction: existingData.cpp_deduction || '',
          ei_deduction: existingData.ei_deduction || '',
          additional_tax: existingData.additional_tax || '',
          manual_entry_reason: existingData.manual_entry_reason || ''
        });
      } else {
        clearForm();
      }
    } catch (error) {
      console.error('Error loading existing YTD data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setYtdData({
      regular_hours: '',
      overtime_hours: '',
      lieu_hours: '',
      stat_hours: '',
      holiday_hours: '',
      hours_worked: '',
      regular_income: '',
      overtime_income: '',
      lieu_income: '',
      vacation_pay: '',
      shift_premiums: '',
      stat_earnings: '',
      holiday_earnings: '',
      bonus: '',
      federal_tax: '',
      provincial_tax: '',
      cpp_deduction: '',
      ei_deduction: '',
      additional_tax: '',
      manual_entry_reason: ''
    });
  };

  const updateYTDField = (field, value) => {
    setYtdData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveYTDData = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee first.');
      return;
    }

    const rateLimitCheck = await checkRateLimit('ytd_data_save');
    if (!rateLimitCheck.allowed) {
      alert('Rate limit exceeded. Please wait before saving again.');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      await recordAction('ytd_payroll_save_started', true);

      const currentYear = new Date().getFullYear();
      
      // Calculate totals
      const grossPay = (parseFloat(ytdData.regular_income) || 0) +
                      (parseFloat(ytdData.overtime_income) || 0) +
                      (parseFloat(ytdData.lieu_income) || 0) +
                      (parseFloat(ytdData.vacation_pay) || 0) +
                      (parseFloat(ytdData.shift_premiums) || 0) +
                      (parseFloat(ytdData.stat_earnings) || 0) +
                      (parseFloat(ytdData.holiday_earnings) || 0) +
                      (parseFloat(ytdData.bonus) || 0);

      const totalDeductions = (parseFloat(ytdData.federal_tax) || 0) +
                             (parseFloat(ytdData.provincial_tax) || 0) +
                             (parseFloat(ytdData.cpp_deduction) || 0) +
                             (parseFloat(ytdData.ei_deduction) || 0) +
                             (parseFloat(ytdData.additional_tax) || 0);

      const netPay = grossPay - totalDeductions;

      // UPDATED: Use actual column names for the insert/update
      const ytdRecord = {
        user_id: selectedEmployee,
        business_id: effectiveBusinessId,
        tax_year: currentYear,
        
        // Hours
        regular_hours: parseFloat(ytdData.regular_hours) || 0,
        overtime_hours: parseFloat(ytdData.overtime_hours) || 0,
        lieu_hours: parseFloat(ytdData.lieu_hours) || 0,
        stat_hours: parseFloat(ytdData.stat_hours) || 0,
        holiday_hours: parseFloat(ytdData.holiday_hours) || 0,
        hours_worked: parseFloat(ytdData.hours_worked) || 0,
        
        // Income
        regular_income: parseFloat(ytdData.regular_income) || 0,
        overtime_income: parseFloat(ytdData.overtime_income) || 0,
        lieu_income: parseFloat(ytdData.lieu_income) || 0,
        vacation_pay: parseFloat(ytdData.vacation_pay) || 0,
        shift_premiums: parseFloat(ytdData.shift_premiums) || 0,
        stat_earnings: parseFloat(ytdData.stat_earnings) || 0,
        holiday_earnings: parseFloat(ytdData.holiday_earnings) || 0,
        bonus: parseFloat(ytdData.bonus) || 0,
        
        // Deductions
        federal_tax: parseFloat(ytdData.federal_tax) || 0,
        provincial_tax: parseFloat(ytdData.provincial_tax) || 0,
        cpp_deduction: parseFloat(ytdData.cpp_deduction) || 0,
        ei_deduction: parseFloat(ytdData.ei_deduction) || 0,
        additional_tax: parseFloat(ytdData.additional_tax) || 0,
        
        // Calculated totals
        gross_pay: grossPay,
        net_pay: netPay,
        
        // Manual entry tracking
        manual_entry: true,
        manual_entry_reason: ytdData.manual_entry_reason || 'Manual YTD entry',
        manual_entry_by: authUser.id,
        
        // Timestamps
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Upsert YTD data using id, user_id, business_id, tax_year as conflict resolution
      const { error } = await supabase
        .from('hrpayroll_ytd_data')
        .upsert(ytdRecord, {
          onConflict: 'user_id,business_id,tax_year'
        });

      if (error) throw error;

      await logSecurityEvent('ytd_payroll_data_saved', {
        employee_id: selectedEmployee,
        business_id: effectiveBusinessId,
        tax_year: currentYear,
        gross_pay: grossPay,
        net_pay: netPay
      }, 'medium');

      setSaveMessage('YTD payroll data saved successfully!');

    } catch (error) {
      console.error('Error saving YTD data:', error);
      setSaveMessage(`Error saving data: ${error.message}`);
      await recordAction('ytd_payroll_save_failed', false);
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals for display
  const calculateTotals = () => {
    const totalIncome = (parseFloat(ytdData.regular_income) || 0) +
                       (parseFloat(ytdData.overtime_income) || 0) +
                       (parseFloat(ytdData.lieu_income) || 0) +
                       (parseFloat(ytdData.vacation_pay) || 0) +
                       (parseFloat(ytdData.shift_premiums) || 0) +
                       (parseFloat(ytdData.stat_earnings) || 0) +
                       (parseFloat(ytdData.holiday_earnings) || 0) +
                       (parseFloat(ytdData.bonus) || 0);

    const totalHours = (parseFloat(ytdData.regular_hours) || 0) +
                      (parseFloat(ytdData.overtime_hours) || 0) +
                      (parseFloat(ytdData.lieu_hours) || 0) +
                      (parseFloat(ytdData.stat_hours) || 0) +
                      (parseFloat(ytdData.holiday_hours) || 0);

    const totalDeductions = (parseFloat(ytdData.federal_tax) || 0) +
                           (parseFloat(ytdData.provincial_tax) || 0) +
                           (parseFloat(ytdData.cpp_deduction) || 0) +
                           (parseFloat(ytdData.ei_deduction) || 0) +
                           (parseFloat(ytdData.additional_tax) || 0);

    const netIncome = totalIncome - totalDeductions;

    return {
      totalIncome,
      totalHours,
      totalDeductions,
      netIncome
    };
  };

  const totals = calculateTotals();

  const styles = {
    container: {
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      minHeight: '100vh'
    },
    section: {
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.sm || '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: TavariStyles.spacing.lg
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.md,
      color: TavariStyles.colors.gray800,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      paddingBottom: TavariStyles.spacing.sm
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: TavariStyles.spacing.lg
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs
    },
    label: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },
    input: {
      padding: '12px 16px',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      fontSize: TavariStyles.typography.fontSize.sm,
      transition: 'border-color 0.2s',
      fontFamily: 'inherit',
      backgroundColor: TavariStyles.colors.white
    },
    select: {
      padding: '12px 16px',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      fontSize: TavariStyles.typography.fontSize.sm,
      backgroundColor: TavariStyles.colors.white,
      cursor: 'pointer'
    },
    button: {
      ...TavariStyles.components.button?.base || {
        padding: '12px 24px',
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        border: 'none',
        fontSize: TavariStyles.typography.fontSize.sm,
        fontWeight: TavariStyles.typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      },
      ...TavariStyles.components.button?.variants?.primary || {
        backgroundColor: TavariStyles.colors.primary,
        color: TavariStyles.colors.white
      }
    },
    totalsCard: {
      backgroundColor: TavariStyles.colors.primary + '10',
      border: `1px solid ${TavariStyles.colors.primary}30`,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.lg || '12px'
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${TavariStyles.spacing.sm} 0`,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    totalLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },
    totalValue: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary
    },
    successMessage: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.success,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginBottom: TavariStyles.spacing.md,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    employeeInfo: {
      backgroundColor: TavariStyles.colors.info + '10',
      border: `1px solid ${TavariStyles.colors.info}30`,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginBottom: TavariStyles.spacing.md
    },
    employeeInfoTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm
    },
    employeeInfoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    filterInfo: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      marginTop: TavariStyles.spacing.xs,
      fontStyle: 'italic'
    }
  };

  if (loading) {
    return (
      <POSAuthWrapper
        componentName="YTDPayrollEntry"
        requiredRoles={['owner', 'manager', 'hr_admin']}
        requireBusiness={true}
      >
        <div style={styles.container}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Loading...</h3>
            <p>Loading employees and YTD data...</p>
          </div>
        </div>
      </POSAuthWrapper>
    );
  }

  const selectedEmployeeDetails = filteredEmployees.find(emp => emp.id === selectedEmployee);

  return (
    <POSAuthWrapper
      componentName="YTDPayrollEntry"
      requiredRoles={['owner', 'manager', 'hr_admin']}
      requireBusiness={true}
    >
      <SecurityWrapper
        componentName="YTDPayrollEntry"
        securityLevel="critical"
        enableAuditLogging={true}
        sensitiveComponent={true}
      >
        <div style={styles.container}>
          {/* Employee Selection */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Year-to-Date Payroll Entry</h3>
            
            {/* Employee Status Filter */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Employee Status Filter:</label>
              <select
                style={styles.select}
                value={employeeStatusFilter}
                onChange={(e) => setEmployeeStatusFilter(e.target.value)}
              >
                <option value="active">Active Employees Only</option>
                <option value="current">Current Employees (Active + Probation + On Leave)</option>
                <option value="terminated">Terminated Employees Only</option>
                <option value="probation">Probation Employees Only</option>
                <option value="suspended">Suspended Employees Only</option>
                <option value="on_leave">On Leave Employees Only</option>
                <option value="all">All Employees (Any Status)</option>
              </select>
              <div style={styles.filterInfo}>
                Showing {filteredEmployees.length} of {employees.length} employees
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Select Employee:</label>
              <select
                style={styles.select}
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">-- Select Employee --</option>
                {filteredEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.employee_number ? `(#${emp.employee_number})` : ''} 
                    {emp.employment_status !== 'active' ? ` - ${emp.employment_status.toUpperCase()}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {saveMessage && (
              <div style={styles.successMessage}>
                {saveMessage}
              </div>
            )}

            {/* Employee Information Display */}
            {selectedEmployeeDetails && (
              <div style={styles.employeeInfo}>
                <div style={styles.employeeInfoTitle}>
                  Selected Employee Information
                </div>
                <div style={styles.employeeInfoGrid}>
                  <div><strong>Name:</strong> {selectedEmployeeDetails.name}</div>
                  <div><strong>Email:</strong> {selectedEmployeeDetails.email}</div>
                  {selectedEmployeeDetails.employee_number && (
                    <div><strong>Employee #:</strong> {selectedEmployeeDetails.employee_number}</div>
                  )}
                  {selectedEmployeeDetails.position && (
                    <div><strong>Position:</strong> {selectedEmployeeDetails.position}</div>
                  )}
                  {selectedEmployeeDetails.department && (
                    <div><strong>Department:</strong> {selectedEmployeeDetails.department}</div>
                  )}
                  {selectedEmployeeDetails.hire_date && (
                    <div><strong>Hire Date:</strong> {new Date(selectedEmployeeDetails.hire_date).toLocaleDateString()}</div>
                  )}
                  {selectedEmployeeDetails.termination_date && (
                    <div><strong>Termination Date:</strong> {new Date(selectedEmployeeDetails.termination_date).toLocaleDateString()}</div>
                  )}
                  <div>
                    <strong>Status:</strong> 
                    <span style={{
                      marginLeft: TavariStyles.spacing.xs,
                      padding: '2px 6px',
                      borderRadius: TavariStyles.borderRadius?.sm || '4px',
                      backgroundColor: selectedEmployeeDetails.employment_status === 'active' 
                        ? TavariStyles.colors.successBg 
                        : selectedEmployeeDetails.employment_status === 'terminated'
                        ? TavariStyles.colors.errorBg
                        : TavariStyles.colors.warningBg,
                      color: selectedEmployeeDetails.employment_status === 'active' 
                        ? TavariStyles.colors.success 
                        : selectedEmployeeDetails.employment_status === 'terminated'
                        ? TavariStyles.colors.danger
                        : TavariStyles.colors.warning,
                      fontSize: TavariStyles.typography.fontSize.xs,
                      fontWeight: TavariStyles.typography.fontWeight.semibold
                    }}>
                      {selectedEmployeeDetails.employment_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedEmployee && (
            <>
              {/* YTD Hours Data */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Year-to-Date Hours</h3>
                
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Total Hours Worked:</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      style={styles.input}
                      value={ytdData.hours_worked}
                      onChange={(e) => updateYTDField('hours_worked', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Regular Hours:</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      style={styles.input}
                      value={ytdData.regular_hours}
                      onChange={(e) => updateYTDField('regular_hours', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Overtime Hours:</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      style={styles.input}
                      value={ytdData.overtime_hours}
                      onChange={(e) => updateYTDField('overtime_hours', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Lieu Time Hours:</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      style={styles.input}
                      value={ytdData.lieu_hours}
                      onChange={(e) => updateYTDField('lieu_hours', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Stat Holiday Hours:</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      style={styles.input}
                      value={ytdData.stat_hours}
                      onChange={(e) => updateYTDField('stat_hours', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Holiday Hours:</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      style={styles.input}
                      value={ytdData.holiday_hours}
                      onChange={(e) => updateYTDField('holiday_hours', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* YTD Income Data */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Year-to-Date Income</h3>
                
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Regular Income:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.regular_income}
                      onChange={(e) => updateYTDField('regular_income', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Overtime Income:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.overtime_income}
                      onChange={(e) => updateYTDField('overtime_income', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Lieu Time Income:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.lieu_income}
                      onChange={(e) => updateYTDField('lieu_income', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Vacation Pay:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.vacation_pay}
                      onChange={(e) => updateYTDField('vacation_pay', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Shift Premiums:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.shift_premiums}
                      onChange={(e) => updateYTDField('shift_premiums', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Stat Holiday Earnings:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.stat_earnings}
                      onChange={(e) => updateYTDField('stat_earnings', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Holiday Earnings:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.holiday_earnings}
                      onChange={(e) => updateYTDField('holiday_earnings', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Bonus:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.bonus}
                      onChange={(e) => updateYTDField('bonus', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* YTD Deductions */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Year-to-Date Deductions</h3>
                
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Federal Tax:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.federal_tax}
                      onChange={(e) => updateYTDField('federal_tax', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Provincial Tax:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.provincial_tax}
                      onChange={(e) => updateYTDField('provincial_tax', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>CPP Deduction:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.cpp_deduction}
                      onChange={(e) => updateYTDField('cpp_deduction', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>EI Deduction:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.ei_deduction}
                      onChange={(e) => updateYTDField('ei_deduction', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Additional Tax:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={ytdData.additional_tax}
                      onChange={(e) => updateYTDField('additional_tax', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Manual Entry Reason */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Manual Entry Information</h3>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Reason for Manual Entry:</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={ytdData.manual_entry_reason}
                    onChange={(e) => updateYTDField('manual_entry_reason', e.target.value)}
                    placeholder="e.g., Prior year correction, System migration, etc."
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>YTD Summary</h3>
                
                <div style={styles.totalsCard}>
                  <div style={styles.totalRow}>
                    <span style={styles.totalLabel}>Total Hours:</span>
                    <span style={styles.totalValue}>{formatTaxAmount(totals.totalHours)} hours</span>
                  </div>
                  
                  <div style={styles.totalRow}>
                    <span style={styles.totalLabel}>Total Income:</span>
                    <span style={{...styles.totalValue, fontSize: TavariStyles.typography.fontSize.xl}}>
                      ${formatTaxAmount(totals.totalIncome)}
                    </span>
                  </div>
                  
                  <div style={styles.totalRow}>
                    <span style={styles.totalLabel}>Total Deductions:</span>
                    <span style={{...styles.totalValue, color: TavariStyles.colors.danger}}>
                      ${formatTaxAmount(totals.totalDeductions)}
                    </span>
                  </div>
                  
                  <div style={{...styles.totalRow, borderBottom: 'none', borderTop: `2px solid ${TavariStyles.colors.primary}`}}>
                    <span style={{...styles.totalLabel, fontWeight: TavariStyles.typography.fontWeight.bold}}>
                      Net Income:
                    </span>
                    <span style={{...styles.totalValue, fontSize: TavariStyles.typography.fontSize['2xl']}}>
                      ${formatTaxAmount(totals.netIncome)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div style={{ textAlign: 'center', marginBottom: TavariStyles.spacing.xl }}>
                <button
                  style={styles.button}
                  onClick={saveYTDData}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save YTD Payroll Data'}
                </button>
              </div>
            </>
          )}
        </div>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default YTDPayrollEntry;