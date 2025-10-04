// components/HR/HRPayrollComponents/EETRT-DataHook.js - Enhanced with YTD Integration
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import { useYTDCalculations } from '../../../hooks/useYTDCalculations';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';
import { EETRT_calculateROEData, EETRT_calculateT4Data, EETRT_processPayrollForROE, EETRT_detectPaymentFrequency } from './EETRT-Calculations';
import { EETRT_generateReportHTML } from './EETRT-ReportGenerator';

export const useEETRTData = (selectedBusinessId, businessData) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [reportConfig, setReportConfig] = useState({
    lastDayWorked: '',
    separationReason: '',
    expectedReturnDate: '',
    dateRangeType: 'rolling_12_months',
    customStartDate: '',
    customEndDate: '',
    paymentFrequency: 'auto_detect',
    paymentFrequencyOverride: false,
    detectedFrequency: null,
    frequencyConfidence: 0,
    isT4Report: false,
    useYTDOptimization: true // New: Option to use YTD data for faster calculations
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [calculatedData, setCalculatedData] = useState(null);
  const [error, setError] = useState(null);

  // Security context for sensitive tax report operations
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'useEETRTData',
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
    componentName: 'useEETRTData'
  });

  // Tax calculations for formatting
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId);

  // YTD calculations hook for optimized T4 data
  const ytd = useYTDCalculations(selectedBusinessId);

  // Use effective business ID
  const effectiveBusinessId = selectedBusinessId || authBusinessId;
  const effectiveBusinessData = businessData || authBusinessData;

  // Load employees on mount
  useEffect(() => {
    if (effectiveBusinessId) {
      loadEmployees();
    }
  }, [effectiveBusinessId]);

  // Detect payment frequency when payroll history loads
  useEffect(() => {
    if (payrollHistory.length > 0 && !reportConfig.paymentFrequencyOverride) {
      const detection = EETRT_detectPaymentFrequency(payrollHistory);
      setReportConfig(prev => ({
        ...prev,
        detectedFrequency: detection.frequency,
        frequencyConfidence: detection.confidence,
        paymentFrequency: detection.frequency || 'bi_weekly'
      }));
    }
  }, [payrollHistory, reportConfig.paymentFrequencyOverride]);

  // Calculate data when dependencies change
  useEffect(() => {
    if (selectedEmployee && (payrollHistory.length > 0 || reportConfig.useYTDOptimization)) {
      calculateComprehensiveData();
    }
  }, [selectedEmployee, payrollHistory, reportConfig]);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const rateLimitCheck = await checkRateLimit('load_eetrt_employees');
      if (!rateLimitCheck.allowed) {
        throw new Error('Rate limit exceeded. Please wait before loading employee data.');
      }

      await recordAction('eetrt_employee_data_access', authUser?.id);
      
      await logSecurityEvent('comprehensive_tax_report_employee_data_accessed', {
        business_id: effectiveBusinessId,
        action: 'load_employees_for_tax_report'
      }, 'medium');

      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          users!inner (
            id, first_name, last_name, email, hire_date, wage,
            employment_status, phone, employee_number, claim_code
          )
        `)
        .eq('business_id', effectiveBusinessId)
        .eq('active', true);

      if (error) throw error;
      
      const validEmployees = userRoles?.filter(role => role.users) || [];
      setEmployees(validEmployees);

      await logSecurityEvent('eetrt_employees_loaded', {
        business_id: effectiveBusinessId,
        employee_count: validEmployees.length
      }, 'low');

    } catch (error) {
      console.error('Error loading employees:', error);
      setError(error.message);
      await logSecurityEvent('eetrt_employee_load_error', {
        business_id: effectiveBusinessId,
        error: error.message
      }, 'high');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeePayrollHistory = async (employeeId) => {
    if (!employeeId || !effectiveBusinessId) return;

    setGenerating(true);
    setError(null);

    try {
      await recordAction('eetrt_payroll_history_access', employeeId);

      // Load 15 months of payroll history for comprehensive ROE calculations
      const fifteenMonthsAgo = new Date();
      fifteenMonthsAgo.setMonth(fifteenMonthsAgo.getMonth() - 15);

      const { data: entries, error } = await supabase
        .from('hrpayroll_entries')
        .select(`
          *, 
          hrpayroll_runs!inner (
            pay_date, 
            pay_period_start, 
            pay_period_end, 
            business_id
          )
        `)
        .eq('user_id', employeeId)
        .eq('hrpayroll_runs.business_id', effectiveBusinessId)
        .gte('hrpayroll_runs.pay_date', fifteenMonthsAgo.toISOString().split('T')[0]);

      if (error) throw error;

      const sortedEntries = (entries || []).sort((a, b) => 
        new Date(b.hrpayroll_runs.pay_date) - new Date(a.hrpayroll_runs.pay_date)
      );
      
      setPayrollHistory(sortedEntries);

      await logSecurityEvent('eetrt_payroll_history_loaded', {
        business_id: effectiveBusinessId,
        employee_id: employeeId,
        entries_count: sortedEntries.length,
        date_range: {
          from: fifteenMonthsAgo.toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        }
      }, 'medium');

    } catch (error) {
      console.error('Error loading payroll history:', error);
      setError(`Error loading payroll data: ${error.message}`);
      await logSecurityEvent('eetrt_payroll_history_error', {
        business_id: effectiveBusinessId,
        employee_id: employeeId,
        error: error.message
      }, 'high');
    } finally {
      setGenerating(false);
    }
  };

  const handleEmployeeChange = async (employeeId) => {
    try {
      const employee = employees.find(emp => emp.users.id === employeeId);
      setSelectedEmployee(employee);
      setPayrollHistory([]);
      setCalculatedData(null);
      setError(null);
      
      setReportConfig(prev => ({
        ...prev,
        detectedFrequency: null,
        frequencyConfidence: 0,
        paymentFrequency: 'auto_detect',
        paymentFrequencyOverride: false
      }));

      if (employeeId) {
        await recordAction('eetrt_employee_selected', employeeId);
        await loadEmployeePayrollHistory(employeeId);
      }
    } catch (error) {
      console.error('Error changing employee:', error);
      setError(`Error selecting employee: ${error.message}`);
    }
  };

  const calculateComprehensiveData = useCallback(async () => {
    if (!selectedEmployee) return;

    const employee = selectedEmployee.users;
    setGenerating(true);
    setError(null);

    try {
      await recordAction('eetrt_calculation_started', employee.id);
      
      await logSecurityEvent('eetrt_calculation_started', {
        business_id: effectiveBusinessId,
        employee_id: employee.id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        report_type: reportConfig.isT4Report ? 'T4' : 'ROE',
        use_ytd_optimization: reportConfig.useYTDOptimization,
        date_range_type: reportConfig.dateRangeType
      }, 'medium');

      const { startDate, endDate } = getCalculationDateRange();
      
      // Filter payroll entries for the calculation period
      const periodEntries = payrollHistory.filter(entry => {
        const payDate = new Date(entry.hrpayroll_runs.pay_date);
        return payDate >= startDate && payDate <= endDate;
      });

      let roeData = null;
      let t4Data = null;
      let dataSource = 'payroll_entries';

      // ROE Calculation (always uses detailed payroll history for accuracy)
      if (!reportConfig.isT4Report || periodEntries.length > 0) {
        roeData = EETRT_calculateROEData(periodEntries);
      }

      // T4 Calculation - Enhanced with YTD optimization
      if (reportConfig.isT4Report && reportConfig.useYTDOptimization && ytd && !ytd.loading) {
        try {
          // Attempt to use YTD data for faster T4 calculation
          const employeeYTD = await ytd.calculateEmployeeYTD(
            employee.id,
            endDate.toISOString().split('T')[0]
          );

          if (employeeYTD && employeeYTD.is_current) {
            // Use YTD data for T4 calculation (much faster)
            t4Data = {
              box14_employmentIncome: employeeYTD.gross_pay + employeeYTD.vacation_pay,
              box16_cppContributions: employeeYTD.cpp_deduction,
              box18_eiPremiums: employeeYTD.ei_deduction,
              box22_incomeTax: employeeYTD.federal_tax + employeeYTD.provincial_tax,
              box24_eiInsurableEarnings: Math.min(employeeYTD.gross_pay, 65700), // 2025 EI max
              box26_cppPensionableEarnings: Math.min(employeeYTD.gross_pay, 71300), // 2025 CPP max
              box52_pensionAdjustment: 0, // Placeholder for future pension integration
              box56_cppQppExemption: 0, // Placeholder for future exemption integration
              
              // Enhanced breakdown from YTD
              ytd_regular_income: employeeYTD.regular_income,
              ytd_overtime_income: employeeYTD.overtime_income,
              ytd_lieu_income: employeeYTD.lieu_income,
              ytd_vacation_pay: employeeYTD.vacation_pay,
              ytd_premium_pay: employeeYTD.shift_premiums,
              ytd_hours_worked: employeeYTD.hours_worked,
              ytd_federal_tax: employeeYTD.federal_tax,
              ytd_provincial_tax: employeeYTD.provincial_tax,
              
              // Calculation metadata
              calculation_method: 'ytd_optimized',
              calculation_date: employeeYTD.calculation_date,
              last_ytd_update: employeeYTD.last_stored_update,
              tax_year: employeeYTD.tax_year
            };

            dataSource = 'ytd_optimized';
            
            await logSecurityEvent('eetrt_ytd_calculation_used', {
              business_id: effectiveBusinessId,
              employee_id: employee.id,
              ytd_tax_year: employeeYTD.tax_year,
              ytd_is_current: employeeYTD.is_current
            }, 'low');

          } else {
            // Fall back to traditional calculation if YTD data is not current
            t4Data = EETRT_calculateT4Data(periodEntries);
            dataSource = 'payroll_entries_fallback';
            
            await logSecurityEvent('eetrt_ytd_fallback', {
              business_id: effectiveBusinessId,
              employee_id: employee.id,
              reason: 'ytd_data_not_current_or_missing'
            }, 'medium');
          }

        } catch (ytdError) {
          console.warn('YTD calculation failed, falling back to traditional method:', ytdError);
          t4Data = EETRT_calculateT4Data(periodEntries);
          dataSource = 'payroll_entries_ytd_error';
          
          await logSecurityEvent('eetrt_ytd_error_fallback', {
            business_id: effectiveBusinessId,
            employee_id: employee.id,
            ytd_error: ytdError.message
          }, 'medium');
        }
      } else {
        // Traditional T4 calculation or YTD optimization disabled
        t4Data = EETRT_calculateT4Data(periodEntries);
        dataSource = reportConfig.useYTDOptimization ? 'ytd_not_available' : 'ytd_disabled';
      }

      // Process payroll for ROE breakdown (always needed for ROE reports)
      const payPeriodBreakdown = EETRT_processPayrollForROE(periodEntries);
      
      // Prepare employee contact information
      const contactInfo = {
        fullName: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        phone: employee.phone,
        hireDate: employee.hire_date,
        baseWage: employee.wage,
        status: employee.employment_status,
        employeeNumber: employee.employee_number,
        claimCode: employee.claim_code
      };

      const calculatedResult = {
        employee: contactInfo,
        roeData,
        t4Data,
        payPeriodBreakdown,
        paymentFrequency: {
          effective: getEffectivePaymentFrequency(),
          detected: reportConfig.detectedFrequency,
          confidence: reportConfig.frequencyConfidence,
          isOverridden: reportConfig.paymentFrequencyOverride,
          periodsPerYear: getPayPeriodsPerYear()
        },
        calculationPeriod: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: reportConfig.dateRangeType
        },
        metadata: {
          dataSource,
          payrollEntriesUsed: periodEntries.length,
          calculationTimestamp: new Date().toISOString(),
          ytdOptimizationEnabled: reportConfig.useYTDOptimization,
          ytdDataAvailable: !!ytd && !ytd.loading && !!ytd.ytdData[employee.id]
        }
      };

      setCalculatedData(calculatedResult);

      await logSecurityEvent('eetrt_calculation_completed', {
        business_id: effectiveBusinessId,
        employee_id: employee.id,
        report_type: reportConfig.isT4Report ? 'T4' : 'ROE',
        data_source: dataSource,
        payroll_entries_used: periodEntries.length,
        calculation_period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }, 'medium');

    } catch (error) {
      console.error('Error calculating comprehensive data:', error);
      setError(`Calculation error: ${error.message}`);
      
      await logSecurityEvent('eetrt_calculation_error', {
        business_id: effectiveBusinessId,
        employee_id: employee?.id,
        error: error.message
      }, 'high');
    } finally {
      setGenerating(false);
    }
  }, [selectedEmployee, payrollHistory, reportConfig, ytd, effectiveBusinessId]);

  const getCalculationDateRange = () => {
    const today = new Date();
    const lastDayWorked = reportConfig.lastDayWorked ? new Date(reportConfig.lastDayWorked) : today;

    switch (reportConfig.dateRangeType) {
      case 'rolling_12_months':
        const twelveMonthsAgo = new Date(lastDayWorked);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        return { startDate: twelveMonthsAgo, endDate: lastDayWorked };
      case 'calendar_year':
        return { startDate: new Date(today.getFullYear(), 0, 1), endDate: new Date(today.getFullYear(), 11, 31) };
      case 'previous_year':
        return { startDate: new Date(today.getFullYear() - 1, 0, 1), endDate: new Date(today.getFullYear() - 1, 11, 31) };
      case 'employment_period':
        return { startDate: new Date(selectedEmployee.users.hire_date), endDate: lastDayWorked };
      case 'custom':
        if (!reportConfig.customStartDate || !reportConfig.customEndDate) {
          return { startDate: new Date(today.getFullYear(), 0, 1), endDate: today };
        }
        return { startDate: new Date(reportConfig.customStartDate), endDate: new Date(reportConfig.customEndDate) };
      default:
        return { startDate: new Date(today.getFullYear(), 0, 1), endDate: today };
    }
  };

  const getEffectivePaymentFrequency = () => {
    if (reportConfig.paymentFrequencyOverride && reportConfig.paymentFrequency !== 'auto_detect') {
      return reportConfig.paymentFrequency;
    }
    return reportConfig.detectedFrequency || 'bi_weekly';
  };

  const getPayPeriodsPerYear = () => {
    const frequencies = {
      'weekly': 52, 'bi_weekly': 26, 'semi_monthly': 24, 'monthly': 12
    };
    return frequencies[getEffectivePaymentFrequency()] || 26;
  };

  const generateComprehensiveReport = async () => {
    if (!selectedEmployee || !calculatedData) {
      setError('No employee selected or calculation data available');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const rateLimitCheck = await checkRateLimit('generate_eetrt_report', selectedEmployee.users.id);
      if (!rateLimitCheck.allowed) {
        throw new Error('Rate limit exceeded. Please wait before generating another report.');
      }

      await recordAction('generate_comprehensive_tax_report', selectedEmployee.users.id, true);
      
      await logSecurityEvent('eetrt_report_generation_started', {
        business_id: effectiveBusinessId,
        employee_id: selectedEmployee.users.id,
        employee_name: `${selectedEmployee.users.first_name} ${selectedEmployee.users.last_name}`,
        report_type: reportConfig.isT4Report ? 'T4' : 'ROE',
        data_source: calculatedData.metadata?.dataSource
      }, 'medium');
      
      const reportHTML = EETRT_generateReportHTML(
        calculatedData, 
        reportConfig, 
        effectiveBusinessData, 
        formatTaxAmount
      );
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site to generate the report.');
      }
      
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      }, 500);

      await logSecurityEvent('eetrt_report_generated', {
        business_id: effectiveBusinessId,
        employee_id: selectedEmployee.users.id,
        report_type: reportConfig.isT4Report ? 'T4' : 'ROE',
        data_source: calculatedData.metadata?.dataSource,
        generation_method: 'browser_print'
      }, 'medium');

    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      setError(`Report generation error: ${error.message}`);
      
      await recordAction('generate_comprehensive_tax_report', selectedEmployee.users.id, false);
      await logSecurityEvent('eetrt_report_generation_error', {
        business_id: effectiveBusinessId,
        employee_id: selectedEmployee?.users?.id,
        error: error.message
      }, 'high');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle YTD optimization
  const toggleYTDOptimization = (enabled) => {
    setReportConfig(prev => ({
      ...prev,
      useYTDOptimization: enabled
    }));
  };

  // Get YTD status for UI
  const getYTDStatus = () => {
    if (!ytd || ytd.loading) return { status: 'loading', message: 'Loading YTD data...' };
    if (ytd.error) return { status: 'error', message: `YTD Error: ${ytd.error}` };
    if (!selectedEmployee) return { status: 'no_employee', message: 'No employee selected' };
    
    const employeeYTD = ytd.ytdData[selectedEmployee.users.id];
    if (!employeeYTD) return { status: 'no_data', message: 'No YTD data available' };
    
    const isUpToDate = employeeYTD.is_current;
    return { 
      status: isUpToDate ? 'current' : 'outdated', 
      message: isUpToDate ? 'YTD data is current' : 'YTD data needs updating',
      lastUpdate: employeeYTD.last_updated
    };
  };

  return {
    // Employee and payroll data
    employees,
    selectedEmployee,
    payrollHistory,
    reportConfig,
    calculatedData,
    
    // State management
    loading,
    generating,
    error,
    
    // Core functions
    handleEmployeeChange,
    setReportConfig,
    generateComprehensiveReport,
    
    // Utility functions
    getEffectivePaymentFrequency,
    getPayPeriodsPerYear,
    getCalculationDateRange,
    
    // YTD integration functions
    toggleYTDOptimization,
    getYTDStatus,
    ytdData: ytd?.ytdData,
    ytdLoading: ytd?.loading,
    
    // Refresh functions
    refreshEmployees: loadEmployees,
    refreshPayrollHistory: () => selectedEmployee && loadEmployeePayrollHistory(selectedEmployee.users.id),
    refreshCalculation: calculateComprehensiveData,
    
    // Validation functions
    canGenerate: !!(selectedEmployee && calculatedData && !generating),
    hasPayrollData: payrollHistory.length > 0,
    hasYTDData: !!(ytd && !ytd.loading && selectedEmployee && ytd.ytdData[selectedEmployee.users.id])
  };
};