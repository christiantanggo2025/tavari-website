// components/HR/HRPayrollComponents/EditPayrollTab.jsx - EXACT Copy of PayStatementsTab Query Logic
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import { useCanadianTaxCalculations } from '../../../hooks/useCanadianTaxCalculations';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const EditPayrollTab = ({ selectedBusinessId, businessData }) => {
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [payrollEntries, setPayrollEntries] = useState([]);
  const [employeeHours, setEmployeeHours] = useState({});
  const [employeePremiums, setEmployeePremiums] = useState({});
  const [allPremiums, setAllPremiums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Security context
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'EditPayrollTab',
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
    componentName: 'EditPayrollTab'
  });

  // Tax calculations
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId || authBusinessId);
  const effectiveBusinessId = selectedBusinessId || authBusinessId;
  const effectiveBusinessData = businessData || authBusinessData;
  const canadianTax = useCanadianTaxCalculations(effectiveBusinessId);

  useEffect(() => {
    if (effectiveBusinessId) {
      loadPayrollRuns();
    }
  }, [effectiveBusinessId]);

  // EXACT COPY from PayStatementsTab.jsx
  const loadPayrollRuns = async () => {
    if (!effectiveBusinessId) return;

    setLoading(true);
    try {
      await logSecurityEvent('payroll_runs_accessed', {
        business_id: effectiveBusinessId,
        action: 'load_payroll_runs'
      }, 'medium');

      const { data, error } = await supabase
        .from('hrpayroll_runs')
        .select('*')
        .eq('business_id', effectiveBusinessId)
        .eq('status', 'finalized')
        .order('pay_date', { ascending: false });

      if (error) throw error;

      setPayrollRuns(data || []);
      if (data && data.length > 0) {
        setSelectedRun(data[0]);
        await loadPayrollEntries(data[0].id);
      }
    } catch (error) {
      console.error('Error loading payroll runs:', error);
      await logSecurityEvent('payroll_runs_load_error', {
        business_id: effectiveBusinessId,
        error: error.message
      }, 'high');
    } finally {
      setLoading(false);
    }
  };

  // EXACT COPY from PayStatementsTab.jsx
  const loadPayrollEntries = async (runId) => {
    if (!runId) return;

    try {
      await logSecurityEvent('payroll_entries_accessed', {
        business_id: effectiveBusinessId,
        payroll_run_id: runId,
        action: 'load_payroll_entries'
      }, 'medium');

      const { data, error } = await supabase
        .from('hrpayroll_entries')
        .select(`
          *,
          users (
            first_name,
            last_name,
            email,
            hire_date,
            wage
          )
        `)
        .eq('payroll_run_id', runId);

      if (error) throw error;

      setPayrollEntries(data || []);
      
      // Load premium data - COPIED from PayrollEntryTab logic
      if (data && data.length > 0) {
        // Load all active premiums for the business
        const { data: allPremiumsData, error: allPremiumsError } = await supabase
          .from('hr_shift_premiums')
          .select('*')
          .eq('business_id', effectiveBusinessId)
          .eq('is_active', true)
          .order('name');

        if (allPremiumsError) throw allPremiumsError;
        setAllPremiums(allPremiumsData || []);

        // Load premium assignments for employees
        const employeeIds = data.map(entry => entry.user_id);
        const { data: premiumAssignments, error: premiumError } = await supabase
          .from('hrpayroll_employee_premiums')
          .select('*')
          .eq('business_id', effectiveBusinessId)
          .in('user_id', employeeIds)
          .eq('is_active', true);

        if (premiumError) throw premiumError;

        // Organize premium assignments by employee
        const premiumsByEmployee = {};
        employeeIds.forEach(empId => {
          premiumsByEmployee[empId] = {};
        });

        if (premiumAssignments) {
          premiumAssignments.forEach(assignment => {
            if (premiumsByEmployee[assignment.user_id] !== undefined) {
              premiumsByEmployee[assignment.user_id][assignment.premium_name] = {
                rate: assignment.premium_rate,
                rate_type: assignment.rate_type || 'fixed_amount',
                enabled: true
              };
            }
          });
        }
        setEmployeePremiums(premiumsByEmployee);
      
        // Initialize employee hours from existing entries
        const initialHours = {};
        data.forEach(entry => {
          // Parse existing premiums from JSONB
          let existingPremiums = {};
          try {
            if (entry.premiums) {
              if (typeof entry.premiums === 'string') {
                existingPremiums = JSON.parse(entry.premiums);
              } else if (typeof entry.premiums === 'object') {
                existingPremiums = entry.premiums;
              }
            }
          } catch (e) {
            console.warn('Error parsing premiums for entry:', entry.id, e);
          }

          initialHours[entry.user_id] = {
            regular_hours: parseFloat(entry.regular_hours || 0),
            overtime_hours: parseFloat(entry.overtime_hours || 0),
            lieu_hours: parseFloat(entry.lieu_hours || 0),
            premium_hours: {}
          };

          // Initialize premium hours from existing data and available premiums
          (allPremiumsData || []).forEach(premium => {
            if (existingPremiums[premium.name]) {
              initialHours[entry.user_id].premium_hours[premium.name] = parseFloat(existingPremiums[premium.name].hours || 0);
            } else {
              initialHours[entry.user_id].premium_hours[premium.name] = 0;
            }
          });
        });
        setEmployeeHours(initialHours);
      }
    } catch (error) {
      console.error('Error loading payroll entries:', error);
      await logSecurityEvent('payroll_entries_load_error', {
        business_id: effectiveBusinessId,
        payroll_run_id: runId,
        error: error.message
      }, 'high');
    }
  };

  // Handle input changes
  const handleInputChange = useCallback(async (employeeId, field, value, premiumName = null) => {
    const validation = await validateInput(value, 'number', field);
    if (!validation.valid) {
      const errorKey = premiumName ? `${employeeId}_${premiumName}` : `${employeeId}_${field}`;
      setValidationErrors(prev => ({
        ...prev,
        [errorKey]: validation.error
      }));
      return;
    }

    setValidationErrors(prev => {
      const newErrors = { ...prev };
      const errorKey = premiumName ? `${employeeId}_${premiumName}` : `${employeeId}_${field}`;
      delete newErrors[errorKey];
      return newErrors;
    });

    const sanitized = parseFloat(value) || 0;
    await recordAction('edit_employee_hours_entry', employeeId, true);
    
    setEmployeeHours(prev => {
      const updated = { ...prev };
      
      if (premiumName) {
        updated[employeeId] = {
          ...updated[employeeId],
          premium_hours: {
            ...updated[employeeId].premium_hours,
            [premiumName]: sanitized
          }
        };
      } else {
        updated[employeeId] = {
          ...updated[employeeId],
          [field]: sanitized
        };
      }
      
      return updated;
    });
  }, [validateInput, recordAction]);

  // Premium helper functions - COPIED from PayrollEntryTab
  const isEmployeePremiumEnabled = useCallback((employeeId, premiumName) => {
    return employeePremiums[employeeId]?.[premiumName]?.enabled || false;
  }, [employeePremiums]);

  const getEmployeePremiumRate = useCallback((employeeId, premiumName) => {
    const premium = employeePremiums[employeeId]?.[premiumName];
    return premium ? premium.rate : 0;
  }, [employeePremiums]);

  const getEmployeePremiumRateType = useCallback((employeeId, premiumName) => {
    const premium = employeePremiums[employeeId]?.[premiumName];
    return premium ? premium.rate_type : 'fixed_amount';
  }, [employeePremiums]);

  // Get employee preview
  const getEmployeePreview = useCallback((employeeId) => {
    const entry = payrollEntries?.find(e => e.user_id === employeeId);
    const hours = employeeHours[employeeId];

    if (!entry || !hours) {
      return { 
        gross_pay: 0, vacation_pay: 0, total_deductions: 0, net_pay: 0, 
        total_hours: 0, federal_tax: 0, provincial_tax: 0,
        ei_deduction: 0, cpp_deduction: 0, premium_pay: 0, premium_details: {}
      };
    }

    const regularHours = parseFloat(hours.regular_hours) || 0;
    const overtimeHours = parseFloat(hours.overtime_hours) || 0;
    const lieuHours = parseFloat(hours.lieu_hours) || 0;
    const totalBaseHours = regularHours + overtimeHours + lieuHours;
    
    const wage = parseFloat(entry.users?.wage) || 15.00;
    const regularPay = regularHours * wage;
    const overtimePay = overtimeHours * wage * 1.5;
    const lieuPay = lieuHours * wage;
    const basePay = regularPay + overtimePay + lieuPay;
    
    const grossPay = basePay;
    const vacationPay = parseFloat(hours.vacation_pay) || (grossPay * 0.04);
    const federalTax = parseFloat(hours.federal_tax) || 0;
    const provincialTax = parseFloat(hours.provincial_tax) || 0;
    const eiDeduction = parseFloat(hours.ei_deduction) || 0;
    const cppDeduction = parseFloat(hours.cpp_deduction) || 0;
    const additionalTax = parseFloat(hours.additional_tax) || 0;
    
    const totalDeductions = federalTax + provincialTax + eiDeduction + cppDeduction + additionalTax;
    const netPay = grossPay + vacationPay - totalDeductions;

    return {
      gross_pay: grossPay,
      vacation_pay: vacationPay,
      federal_tax: federalTax,
      provincial_tax: provincialTax,
      ei_deduction: eiDeduction,
      cpp_deduction: cppDeduction,
      additional_tax: additionalTax,
      total_deductions: totalDeductions,
      net_pay: Math.max(0, netPay),
      total_hours: totalBaseHours,
      premium_pay: 0,
      premium_details: {}
    };
  }, [payrollEntries, employeeHours]);

  // Save changes
  const saveEditedPayroll = async () => {
    if (!selectedRun) {
      alert('Please select a payroll run first');
      return;
    }

    const rateLimitCheck = await checkRateLimit('edit_finalized_payroll');
    if (!rateLimitCheck.allowed) {
      alert('Rate limit exceeded. Please wait before saving changes.');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      await recordAction('payroll_edit_attempt', authUser?.id, true);

      let totalUpdated = 0;

      for (const entry of payrollEntries) {
        const hours = employeeHours[entry.user_id];
        if (hours) {
          const calculation = getEmployeePreview(entry.user_id);
          
          const updateData = {
            regular_hours: hours.regular_hours || 0,
            overtime_hours: hours.overtime_hours || 0,
            lieu_hours: hours.lieu_hours || 0,
            gross_pay: calculation.gross_pay,
            vacation_pay: calculation.vacation_pay,
            federal_tax: calculation.federal_tax,
            provincial_tax: calculation.provincial_tax,
            ei_deduction: calculation.ei_deduction,
            cpp_deduction: calculation.cpp_deduction,
            additional_tax: calculation.additional_tax,
            net_pay: calculation.net_pay,
            updated_at: new Date().toISOString()
          };

          const { error: updateError } = await supabase
            .from('hrpayroll_entries')
            .update(updateData)
            .eq('id', entry.id);

          if (updateError) {
            throw new Error(`Failed to update entry for ${entry.users.first_name} ${entry.users.last_name}: ${updateError.message}`);
          }

          totalUpdated++;
        }
      }

      await logSecurityEvent('payroll_entries_edited', {
        business_id: effectiveBusinessId,
        payroll_run_id: selectedRun.id,
        entries_updated: totalUpdated,
        edited_by: authUser?.id
      }, 'critical');

      setSaveMessage(`Successfully updated ${totalUpdated} payroll entries!`);
      await recordAction('payroll_edit_success', authUser?.id, true);

    } catch (error) {
      console.error('Save error:', error);
      await recordAction('payroll_edit_attempt', authUser?.id, false);
      alert('Error saving payroll changes: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals including premiums
  const payrollTotals = useMemo(() => {
    if (!payrollEntries || !employeeHours) return { 
      totalEmployees: 0, totalHours: 0, totalGross: 0, totalNet: 0, totalPremiums: 0
    };

    let totalEmployees = 0;
    let totalHours = 0;
    let totalGross = 0;
    let totalNet = 0;
    let totalPremiums = 0;

    payrollEntries.forEach(entry => {
      const hours = employeeHours[entry.user_id];
      if (hours) {
        const empTotalHours = (hours.regular_hours || 0) + (hours.overtime_hours || 0) + (hours.lieu_hours || 0);
        if (empTotalHours > 0) {
          totalEmployees++;
          totalHours += empTotalHours;
          
          const preview = getEmployeePreview(entry.user_id);
          totalGross += preview.gross_pay + preview.vacation_pay;
          totalNet += preview.net_pay;
          totalPremiums += preview.premium_pay;
        }
      }
    });

    return { totalEmployees, totalHours, totalGross, totalNet, totalPremiums };
  }, [payrollEntries, employeeHours, getEmployeePreview]);

  // Styles
  const styles = {
    container: {
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      minHeight: '100vh'
    },
    section: {
      marginBottom: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.sm || '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.md,
      color: TavariStyles.colors.gray800
    },
    select: {
      padding: '12px 16px',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      fontSize: TavariStyles.typography.fontSize.sm,
      backgroundColor: TavariStyles.colors.white,
      cursor: 'pointer',
      width: '100%',
      maxWidth: '500px',
      marginBottom: TavariStyles.spacing.md
    },
    saveButton: {
      padding: '15px 30px',
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: 'none',
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      cursor: 'pointer',
      backgroundColor: TavariStyles.colors.warning,
      color: TavariStyles.colors.white,
      marginTop: TavariStyles.spacing.lg
    },
    disabledButton: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: TavariStyles.typography.fontSize.sm,
      marginTop: TavariStyles.spacing.md
    },
    th: {
      padding: TavariStyles.spacing.md,
      textAlign: 'left',
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.white,
      fontSize: TavariStyles.typography.fontSize.sm,
      backgroundColor: TavariStyles.colors.warning
    },
    td: {
      padding: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
      verticalAlign: 'middle'
    },
    input: {
      padding: '8px 12px',
      border: `1px solid ${TavariStyles.colors.warning}`,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.sm,
      width: '80px',
      textAlign: 'center'
    },
    warningBanner: {
      backgroundColor: TavariStyles.colors.warning + '20',
      color: TavariStyles.colors.warning,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginBottom: TavariStyles.spacing.md,
      border: `1px solid ${TavariStyles.colors.warning}`
    },
    successBanner: {
      backgroundColor: TavariStyles.colors.success + '20',
      color: TavariStyles.colors.success,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginBottom: TavariStyles.spacing.md,
      whiteSpace: 'pre-line',
      border: `1px solid ${TavariStyles.colors.success}`
    },
    emptyState: {
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      padding: TavariStyles.spacing.xl,
      fontSize: TavariStyles.typography.fontSize.md
    }
  };

  if (loading) {
    return (
      <POSAuthWrapper
        componentName="EditPayrollTab"
        requiredRoles={['owner', 'manager', 'hr_admin']}
        requireBusiness={true}
      >
        <SecurityWrapper
          componentName="EditPayrollTab"
          securityLevel="critical"
          enableAuditLogging={true}
          sensitiveComponent={true}
        >
          <div style={styles.container}>
            <div style={styles.emptyState}>Loading payroll data for editing...</div>
          </div>
        </SecurityWrapper>
      </POSAuthWrapper>
    );
  }

  return (
    <POSAuthWrapper
      componentName="EditPayrollTab"
      requiredRoles={['owner', 'manager', 'hr_admin']}
      requireBusiness={true}
    >
      <SecurityWrapper
        componentName="EditPayrollTab"
        securityLevel="critical"
        enableAuditLogging={true}
        sensitiveComponent={true}
      >
        <div style={styles.container}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Edit Existing Payroll</h3>
            
            <div style={styles.warningBanner}>
              <strong>⚠️ WARNING:</strong> You are about to edit finalized payroll data. All changes will be logged for audit purposes.
            </div>

            {payrollRuns.length > 0 ? (
              <select
                style={styles.select}
                value={selectedRun?.id || ''}
                onChange={(e) => {
                  const run = payrollRuns.find(r => r.id === e.target.value);
                  setSelectedRun(run);
                  if (run) loadPayrollEntries(run.id);
                }}
              >
                <option value="">Select a finalized payroll run to edit...</option>
                {payrollRuns.map(run => (
                  <option key={run.id} value={run.id}>
                    {new Date(run.pay_period_start).toLocaleDateString()} to {new Date(run.pay_period_end).toLocaleDateString()} (Pay Date: {new Date(run.pay_date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <div style={styles.emptyState}>
                <p>No finalized payroll runs found.</p>
              </div>
            )}

            {saveMessage && <div style={styles.successBanner}>{saveMessage}</div>}
          </div>

          {selectedRun && payrollEntries.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                Edit Payroll - {new Date(selectedRun.pay_period_start).toLocaleDateString()} to {new Date(selectedRun.pay_period_end).toLocaleDateString()}
              </h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Regular Hrs</th>
                      <th style={styles.th}>Overtime Hrs</th>
                      <th style={styles.th}>Lieu Hrs</th>
                      {allPremiums.map(premium => (
                        <th key={premium.id} style={{ ...styles.th, backgroundColor: TavariStyles.colors.success }}>
                          {premium.name}
                          <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '2px' }}>
                            {premium.rate_type === 'percentage' ? `${premium.rate}%` : `${premium.rate}/hr`}
                          </div>
                        </th>
                      ))}
                      <th style={styles.th}>Vacation Pay</th>
                      <th style={styles.th}>Fed Tax</th>
                      <th style={styles.th}>Prov Tax</th>
                      <th style={styles.th}>EI</th>
                      <th style={styles.th}>CPP</th>
                      <th style={styles.th}>Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollEntries.map(entry => {
                      const hours = employeeHours[entry.user_id] || { 
                        regular_hours: 0, overtime_hours: 0, lieu_hours: 0,
                        vacation_pay: 0, federal_tax: 0, provincial_tax: 0,
                        ei_deduction: 0, cpp_deduction: 0, additional_tax: 0
                      };
                      const preview = getEmployeePreview(entry.user_id);
                      const employeeName = entry.users ? `${entry.users.first_name} ${entry.users.last_name}` : 'Unknown Employee';
                      const employeeWage = parseFloat(entry.users?.wage) || 15.00;

                      return (
                        <tr key={entry.id}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 'bold' }}>{employeeName}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Rate: ${formatTaxAmount(employeeWage)}/hr
                            </div>
                          </td>
                          <td style={styles.td}>
                            <input 
                              type="number" 
                              step="0.25" 
                              style={styles.input} 
                              value={hours.regular_hours || ''} 
                              onChange={(e) => handleInputChange(entry.user_id, 'regular_hours', e.target.value)} 
                            />
                          </td>
                          <td style={styles.td}>
                            <input 
                              type="number" 
                              step="0.25" 
                              style={styles.input} 
                              value={hours.overtime_hours || ''} 
                              onChange={(e) => handleInputChange(entry.user_id, 'overtime_hours', e.target.value)} 
                            />
                          </td>
                          <td style={styles.td}>
                            <input 
                              type="number" 
                              step="0.25" 
                              style={styles.input} 
                              value={hours.lieu_hours || ''} 
                              onChange={(e) => handleInputChange(entry.user_id, 'lieu_hours', e.target.value)} 
                            />
                          </td>
                          {allPremiums.map(premium => {
                            const isEnabled = isEmployeePremiumEnabled(entry.user_id, premium.name);
                            const premiumRate = getEmployeePremiumRate(entry.user_id, premium.name);
                            const rateType = getEmployeePremiumRateType(entry.user_id, premium.name);
                            
                            return (
                              <td key={premium.id} style={styles.td}>
                                <input 
                                  type="number" 
                                  step="0.25" 
                                  min="0" 
                                  max="80" 
                                  style={isEnabled ? { ...styles.input, backgroundColor: TavariStyles.colors.successBg } : { ...styles.input, backgroundColor: TavariStyles.colors.gray100, cursor: 'not-allowed' }}
                                  value={isEnabled ? (hours.premium_hours?.[premium.name] || '') : ''} 
                                  onChange={isEnabled ? (e) => handleInputChange(entry.user_id, 'premium_hours', e.target.value, premium.name) : undefined}
                                  placeholder={isEnabled ? "0.00" : "N/A"}
                                  disabled={!isEnabled}
                                />
                                {isEnabled && (
                                  <div style={{ fontSize: '10px', color: TavariStyles.colors.success, textAlign: 'center', marginTop: '2px' }}>
                                    {rateType === 'percentage' ? `${premiumRate}%` : `${premiumRate}/hr`}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td style={styles.td}>
                            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              ${preview.vacation_pay.toFixed(2)}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              ${preview.federal_tax.toFixed(2)}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              ${preview.provincial_tax.toFixed(2)}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              ${preview.ei_deduction.toFixed(2)}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              ${preview.cpp_deduction.toFixed(2)}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 'bold', color: TavariStyles.colors.success }}>
                              ${preview.net_pay.toFixed(2)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button 
                  style={{ 
                    ...styles.saveButton, 
                    ...(saving || payrollTotals.totalEmployees === 0 ? styles.disabledButton : {}) 
                  }} 
                  onClick={saveEditedPayroll} 
                  disabled={saving || payrollTotals.totalEmployees === 0}
                >
                  {saving ? 'Saving Changes...' : `Save Payroll Edits (${payrollTotals.totalEmployees} employees)`}
                </button>
              </div>
            </div>
          )}

          {selectedRun && payrollEntries.length === 0 && (
            <div style={styles.section}>
              <div style={styles.emptyState}>
                <p>No payroll entries found for selected run.</p>
              </div>
            </div>
          )}
        </div>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default EditPayrollTab;