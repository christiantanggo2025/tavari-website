// hooks/useYTDCalculations.js - FIXED: Removed circular imports, corrected database queries
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useSecurityContext } from '../Security';
import { usePOSAuth } from './usePOSAuth';

/**
 * Comprehensive YTD (Year-to-Date) calculations hook for Tavari HR system
 * FIXED: Removed circular component imports, corrected database schema references
 * 
 * @param {string} businessId - Business ID to load YTD data for
 * @returns {Object} YTD calculation functions and data management
 */
export const useYTDCalculations = (businessId) => {
  const [ytdData, setYTDData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastCalculation, setLastCalculation] = useState(null);

  // Security context for sensitive YTD calculations
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'useYTDCalculations',
    sensitiveComponent: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    securityLevel: 'critical'
  });

  // Authentication context
  const {
    selectedBusinessId,
    authUser,
    userRole,
    businessData
  } = usePOSAuth({
    requiredRoles: ['owner', 'manager', 'hr_admin'],
    requireBusiness: true,
    componentName: 'useYTDCalculations'
  });

  /**
   * Load YTD data when businessId changes
   */
  useEffect(() => {
    if (businessId) {
      loadYTDData(businessId);
    } else {
      setYTDData({});
      setLoading(false);
    }
  }, [businessId]);

  /**
   * Load existing YTD data from database
   */
  const loadYTDData = async (businessId) => {
    setLoading(true);
    setError(null);
    
    try {
      await logSecurityEvent('ytd_data_accessed', {
        business_id: businessId,
        action: 'load_ytd_data'
      }, 'medium');

      const currentYear = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from('hrpayroll_ytd_data')
        .select('*')
        .eq('business_id', businessId)
        .eq('tax_year', currentYear);

      if (error) throw error;

      // Convert array to object with user_id as key for easy lookup
      const ytdDataMap = {};
      data.forEach(ytd => {
        ytdDataMap[ytd.user_id] = ytd;
      });

      setYTDData(ytdDataMap);
      setLastCalculation(new Date().toISOString());

    } catch (error) {
      console.error('Error loading YTD data:', error);
      setError(error.message);
      await logSecurityEvent('ytd_data_load_error', {
        business_id: businessId,
        error: error.message
      }, 'high');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate YTD totals for a specific employee up to a specific date
   * FIXED: Corrected database schema and field references
   */
  const calculateEmployeeYTD = useCallback(async (userId, upToDate = null) => {
    if (!businessId) return null;

    try {
      const targetDate = upToDate ? new Date(upToDate) : new Date();
      const currentYear = targetDate.getFullYear();
      const yearStart = new Date(currentYear, 0, 1);

      // Get stored YTD data
      const storedYTD = ytdData[userId] || {
        hours_worked: 0,
        regular_income: 0,
        overtime_income: 0,
        lieu_income: 0,
        vacation_pay: 0,
        shift_premiums: 0,
        stat_earnings: 0,
        holiday_earnings: 0,
        bonus: 0,
        federal_tax: 0,
        provincial_tax: 0,
        cpp_deduction: 0,
        ei_deduction: 0,
        additional_tax: 0,
        gross_pay: 0,
        net_pay: 0,
        last_updated: yearStart.toISOString()
      };

      // Get any payroll entries since last YTD update
      const lastUpdated = new Date(storedYTD.last_updated || yearStart);
      
      // FIXED: Proper database query with correct relationships
      const { data: recentEntries, error } = await supabase
        .from('hrpayroll_entries')
        .select(`
          *,
          hrpayroll_runs!inner (
            pay_date,
            business_id
          )
        `)
        .eq('user_id', userId)
        .eq('hrpayroll_runs.business_id', businessId)
        .gte('hrpayroll_runs.pay_date', lastUpdated.toISOString().split('T')[0])
        .lte('hrpayroll_runs.pay_date', targetDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Get employee wage info separately to avoid complex joins
      const { data: employeeData, error: empError } = await supabase
        .from('user_roles')
        .select(`
          users!inner (
            id,
            hourly_wage,
            wage
          )
        `)
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .eq('active', true)
        .single();

      if (empError) {
        console.warn('Could not get employee wage data:', empError);
      }

      // Use hourly_wage if available, fallback to wage, default to 0
      const employeeWage = parseFloat(
        employeeData?.users?.hourly_wage || 
        employeeData?.users?.wage || 
        0
      );

      // Start with stored YTD totals
      const ytdTotals = {
        regular_hours: parseFloat(storedYTD.regular_hours || 0),
        overtime_hours: parseFloat(storedYTD.overtime_hours || 0),
        lieu_hours: parseFloat(storedYTD.lieu_hours || 0),
        stat_hours: parseFloat(storedYTD.stat_hours || 0),
        holiday_hours: parseFloat(storedYTD.holiday_hours || 0),
        hours_worked: parseFloat(storedYTD.hours_worked || 0),
        regular_income: parseFloat(storedYTD.regular_income || 0),
        overtime_income: parseFloat(storedYTD.overtime_income || 0),
        lieu_income: parseFloat(storedYTD.lieu_income || 0),
        vacation_pay: parseFloat(storedYTD.vacation_pay || 0),
        shift_premiums: parseFloat(storedYTD.shift_premiums || 0),
        stat_earnings: parseFloat(storedYTD.stat_earnings || 0),
        holiday_earnings: parseFloat(storedYTD.holiday_earnings || 0),
        bonus: parseFloat(storedYTD.bonus || 0),
        federal_tax: parseFloat(storedYTD.federal_tax || 0),
        provincial_tax: parseFloat(storedYTD.provincial_tax || 0),
        cpp_deduction: parseFloat(storedYTD.cpp_deduction || 0),
        ei_deduction: parseFloat(storedYTD.ei_deduction || 0),
        additional_tax: parseFloat(storedYTD.additional_tax || 0),
        gross_pay: parseFloat(storedYTD.gross_pay || 0),
        net_pay: parseFloat(storedYTD.net_pay || 0)
      };

      // Add recent entries to YTD totals
      recentEntries.forEach(entry => {
        // Hours
        const regularHours = parseFloat(entry.regular_hours || 0);
        const overtimeHours = parseFloat(entry.overtime_hours || 0);
        const lieuHours = parseFloat(entry.lieu_hours || 0);
        
        ytdTotals.regular_hours += regularHours;
        ytdTotals.overtime_hours += overtimeHours;
        ytdTotals.lieu_hours += lieuHours;
        ytdTotals.hours_worked += regularHours + overtimeHours + lieuHours;
        
        // FIXED: Only calculate earnings from wage if we have hourly wage
        if (employeeWage > 0) {
          ytdTotals.regular_income += regularHours * employeeWage;
          ytdTotals.overtime_income += overtimeHours * employeeWage * 1.5;
          ytdTotals.lieu_income += lieuHours * employeeWage;
        }
        
        // Calculate premium pay from JSONB premiums field
        let entryPremiumTotal = 0;
        try {
          const premiums = typeof entry.premiums === 'string' ?
            JSON.parse(entry.premiums) : (entry.premiums || {});
          
          Object.values(premiums).forEach(premium => {
            if (premium.total_pay) {
              entryPremiumTotal += parseFloat(premium.total_pay);
            }
          });
        } catch (e) {
          console.warn('Error parsing premiums for YTD:', e);
        }
        
        ytdTotals.shift_premiums += entryPremiumTotal;
        
        // Tax deductions and totals from payroll entry
        ytdTotals.vacation_pay += parseFloat(entry.vacation_pay || 0);
        ytdTotals.gross_pay += parseFloat(entry.gross_pay || 0);
        ytdTotals.federal_tax += parseFloat(entry.federal_tax || 0);
        ytdTotals.provincial_tax += parseFloat(entry.provincial_tax || 0);
        ytdTotals.ei_deduction += parseFloat(entry.ei_deduction || 0);
        ytdTotals.cpp_deduction += parseFloat(entry.cpp_deduction || 0);
        ytdTotals.additional_tax += parseFloat(entry.additional_tax || 0);
        ytdTotals.net_pay += parseFloat(entry.net_pay || 0);
      });

      return {
        ...ytdTotals,
        user_id: userId,
        business_id: businessId,
        tax_year: currentYear,
        calculation_date: targetDate.toISOString(),
        entries_included: recentEntries.length,
        last_stored_update: storedYTD.last_updated,
        is_current: recentEntries.length === 0
      };

    } catch (error) {
      console.error('Error calculating employee YTD:', error);
      await logSecurityEvent('ytd_calculation_error', {
        business_id: businessId,
        user_id: userId,
        error: error.message
      }, 'high');
      return null;
    }
  }, [businessId, ytdData, logSecurityEvent]);

  /**
   * Update YTD totals after a payroll run is finalized
   */
  const updateYTDAfterPayroll = useCallback(async (payrollRunId) => {
    if (!businessId) return;

    try {
      const rateLimitCheck = await checkRateLimit('ytd_update_after_payroll', payrollRunId);
      if (!rateLimitCheck.allowed) {
        throw new Error('Rate limit exceeded for YTD updates');
      }

      await recordAction('ytd_update_after_payroll', payrollRunId, true);
      
      await logSecurityEvent('ytd_automatic_update_started', {
        business_id: businessId,
        payroll_run_id: payrollRunId
      }, 'medium');

      // Get all entries from this payroll run
      const { data: entries, error } = await supabase
        .from('hrpayroll_entries')
        .select(`
          *,
          hrpayroll_runs!inner (
            pay_date,
            business_id
          )
        `)
        .eq('payroll_run_id', payrollRunId);

      if (error) throw error;

      const currentYear = new Date().getFullYear();
      const updatedEmployees = [];

      // Process each employee in this payroll run
      for (const entry of entries) {
        try {
          const currentYTD = await calculateEmployeeYTD(entry.user_id);
          
          if (!currentYTD) {
            console.warn(`Could not calculate YTD for employee ${entry.user_id}`);
            continue;
          }

          const ytdRecord = {
            user_id: entry.user_id,
            business_id: businessId,
            tax_year: currentYear,
            regular_hours: currentYTD.regular_hours,
            overtime_hours: currentYTD.overtime_hours,
            lieu_hours: currentYTD.lieu_hours,
            stat_hours: currentYTD.stat_hours,
            holiday_hours: currentYTD.holiday_hours,
            hours_worked: currentYTD.hours_worked,
            regular_income: currentYTD.regular_income,
            overtime_income: currentYTD.overtime_income,
            lieu_income: currentYTD.lieu_income,
            vacation_pay: currentYTD.vacation_pay,
            shift_premiums: currentYTD.shift_premiums,
            stat_earnings: currentYTD.stat_earnings,
            holiday_earnings: currentYTD.holiday_earnings,
            bonus: currentYTD.bonus,
            federal_tax: currentYTD.federal_tax,
            provincial_tax: currentYTD.provincial_tax,
            cpp_deduction: currentYTD.cpp_deduction,
            ei_deduction: currentYTD.ei_deduction,
            additional_tax: currentYTD.additional_tax,
            gross_pay: currentYTD.gross_pay,
            net_pay: currentYTD.net_pay,
            last_updated: new Date().toISOString(),
            last_payroll_run_id: payrollRunId
          };

          const { error: upsertError } = await supabase
            .from('hrpayroll_ytd_data')
            .upsert(ytdRecord, { 
              onConflict: 'user_id,business_id,tax_year',
              ignoreDuplicates: false 
            });

          if (upsertError) {
            console.error(`Error upserting YTD for employee ${entry.user_id}:`, upsertError);
            continue;
          }

          updatedEmployees.push(entry.user_id);

        } catch (employeeError) {
          console.error(`Error processing YTD for employee ${entry.user_id}:`, employeeError);
        }
      }

      // Reload YTD data to reflect changes
      await loadYTDData(businessId);

      return {
        success: true,
        employeesUpdated: updatedEmployees.length,
        updatedEmployeeIds: updatedEmployees
      };

    } catch (error) {
      console.error('Error updating YTD after payroll:', error);
      await recordAction('ytd_update_after_payroll', payrollRunId, false);
      throw error;
    }
  }, [businessId, calculateEmployeeYTD, checkRateLimit, recordAction, logSecurityEvent]);

  /**
   * Manual YTD entry/correction
   */
  const updateManualYTD = useCallback(async (userId, ytdDataUpdate, reason = 'Manual entry') => {
    if (!businessId) return;

    try {
      const rateLimitCheck = await checkRateLimit('manual_ytd_update', userId);
      if (!rateLimitCheck.allowed) {
        throw new Error('Rate limit exceeded for manual YTD updates');
      }

      await recordAction('manual_ytd_update', userId, true);
      
      const currentYear = new Date().getFullYear();

      // Validate YTD data
      const validatedData = {};
      const allowedFields = [
        'regular_hours', 'overtime_hours', 'lieu_hours', 'stat_hours', 'holiday_hours',
        'hours_worked', 'regular_income', 'overtime_income', 'lieu_income',
        'vacation_pay', 'shift_premiums', 'stat_earnings', 'holiday_earnings',
        'bonus', 'federal_tax', 'provincial_tax', 'cpp_deduction', 
        'ei_deduction', 'additional_tax', 'gross_pay', 'net_pay'
      ];

      allowedFields.forEach(field => {
        if (ytdDataUpdate[field] !== undefined) {
          const value = parseFloat(ytdDataUpdate[field]);
          if (!isNaN(value) && value >= 0) {
            validatedData[field] = value;
          }
        }
      });

      if (Object.keys(validatedData).length === 0) {
        throw new Error('No valid YTD data provided');
      }

      const ytdRecord = {
        user_id: userId,
        business_id: businessId,
        tax_year: currentYear,
        ...validatedData,
        last_updated: new Date().toISOString(),
        manual_entry: true,
        manual_entry_reason: reason,
        manual_entry_by: authUser?.id
      };

      const { data, error } = await supabase
        .from('hrpayroll_ytd_data')
        .upsert(ytdRecord, { 
          onConflict: 'user_id,business_id,tax_year',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;

      // Reload YTD data
      await loadYTDData(businessId);

      return {
        success: true,
        updatedRecord: data,
        fieldsUpdated: Object.keys(validatedData)
      };

    } catch (error) {
      console.error('Error updating manual YTD:', error);
      await recordAction('manual_ytd_update', userId, false);
      throw error;
    }
  }, [businessId, authUser, checkRateLimit, recordAction]);

  /**
   * Validate YTD data integrity
   */
  const validateYTDIntegrity = useCallback(async (userId = null) => {
    if (!businessId) return { isValid: false, errors: ['No business ID provided'] };

    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        checkedEmployees: 0
      };

      const employeesToCheck = userId ? [userId] : Object.keys(ytdData);

      for (const empId of employeesToCheck) {
        const storedYTD = ytdData[empId];
        const calculatedYTD = await calculateEmployeeYTD(empId);

        if (!storedYTD || !calculatedYTD) {
          validation.warnings.push(`Missing YTD data for employee ${empId}`);
          continue;
        }

        // Check for significant discrepancies
        const discrepancyThreshold = 0.50;
        const fields = ['gross_pay', 'federal_tax', 'provincial_tax', 'cpp_deduction', 'ei_deduction', 'net_pay'];

        fields.forEach(field => {
          const stored = parseFloat(storedYTD[field] || 0);
          const calculated = parseFloat(calculatedYTD[field] || 0);
          const difference = Math.abs(stored - calculated);

          if (difference > discrepancyThreshold) {
            validation.errors.push(
              `Employee ${empId} ${field}: Stored=${stored.toFixed(2)}, Calculated=${calculated.toFixed(2)}, Difference=${difference.toFixed(2)}`
            );
            validation.isValid = false;
          }
        });

        validation.checkedEmployees++;
      }

      return validation;

    } catch (error) {
      console.error('Error validating YTD integrity:', error);
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
        checkedEmployees: 0
      };
    }
  }, [businessId, ytdData, calculateEmployeeYTD]);

  // FIXED: Simple format function without circular dependencies
  const formatYTDAmount = useCallback((amount, precision = 2) => {
    return Number(amount || 0).toFixed(precision);
  }, []);

  return {
    // Data state
    ytdData,
    loading,
    error,
    lastCalculation,
    
    // Core calculation functions
    calculateEmployeeYTD,
    
    // Automatic update functions
    updateYTDAfterPayroll,
    
    // Manual entry functions
    updateManualYTD,
    
    // Utility functions
    formatYTDAmount,
    validateYTDIntegrity,
    
    // Data management
    refreshYTDData: () => loadYTDData(businessId),
    
    // Helper functions for integration
    getEmployeeYTD: (userId, upToDate = null) => calculateEmployeeYTD(userId, upToDate),
    hasYTDData: (userId) => !!ytdData[userId]
  };
};

export default useYTDCalculations;