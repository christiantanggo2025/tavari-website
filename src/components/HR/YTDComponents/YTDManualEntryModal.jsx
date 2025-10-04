// components/HR/YTDComponents/YTDManualEntryModal.jsx - Manual YTD Entry Modal Component
import React, { useState, useEffect } from 'react';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import POSAuthWrapper from '../../Auth/POSAuthWrapper';
import TavariCheckbox from '../../UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

/**
 * Manual YTD Entry Modal Component for correcting or entering historical YTD data
 * Provides comprehensive form for all YTD fields with validation and audit trail
 * Integrates with Tavari security and styling standards
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Function} onClose - Function to close modal
 * @param {Object} employee - Employee object with id, first_name, last_name
 * @param {Object} currentYTD - Current YTD data to pre-populate form
 * @param {Function} onSave - Callback function to save YTD data (employeeId, ytdData, reason)
 * @param {Function} formatAmount - Optional formatting function for monetary values
 */
const YTDManualEntryModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  currentYTD = null, 
  onSave,
  formatAmount = null 
}) => {
  // Form state
  const [formData, setFormData] = useState({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Security context for sensitive YTD data entry
  const { 
    recordAction, 
    logSecurityEvent, 
    validateInput,
    checkRateLimit 
  } = useSecurityContext({
    componentName: 'YTDManualEntryModal',
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
    requiredRoles: ['owner', 'manager'],
    requireBusiness: true,
    componentName: 'YTDManualEntryModal'
  });

  // Tax calculations for consistent formatting
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId);

  /**
   * Initialize form data when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      initializeForm();
      setIsDirty(false);
      setValidationErrors({});
      setReason('');
      
      // Log modal access
      recordAction('ytd_manual_entry_modal_opened', employee?.id).catch(console.error);
      logSecurityEvent('ytd_manual_entry_accessed', {
        employee_id: employee?.id,
        employee_name: `${employee?.first_name} ${employee?.last_name}`,
        business_id: selectedBusinessId,
        has_existing_data: !!currentYTD
      }, 'high').catch(console.error);
    }
  }, [isOpen, currentYTD, employee]);

  /**
   * Initialize form with current YTD data or defaults
   */
  const initializeForm = () => {
    const defaultData = {
      // Hours
      regular_hours: 0,
      overtime_hours: 0,
      lieu_hours: 0,
      stat_hours: 0,
      holiday_hours: 0,
      hours_worked: 0,
      
      // Income
      regular_income: 0,
      overtime_income: 0,
      lieu_income: 0,
      vacation_pay: 0,
      shift_premiums: 0,
      stat_earnings: 0,
      holiday_earnings: 0,
      bonus: 0,
      
      // Deductions
      federal_tax: 0,
      provincial_tax: 0,
      cpp_deduction: 0,
      ei_deduction: 0,
      additional_tax: 0,
      
      // Totals
      gross_pay: 0,
      net_pay: 0
    };

    if (currentYTD) {
      Object.keys(defaultData).forEach(key => {
        defaultData[key] = parseFloat(currentYTD[key] || 0);
      });
    }

    setFormData(defaultData);
  };

  /**
   * Format monetary amounts
   */
  const format = (amount) => {
    if (formatAmount) return formatAmount(amount);
    if (formatTaxAmount) return formatTaxAmount(amount);
    return Number(amount || 0).toFixed(2);
  };

  /**
   * Update a form field with validation
   */
  const updateField = (field, value) => {
    // Clear any existing validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Validate input
    const validation = validateInput(value, 'number');
    if (!validation.isValid) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: validation.error
      }));
      return;
    }

    const numValue = parseFloat(value) || 0;
    
    // Additional business logic validation
    if (numValue < 0) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: 'Value cannot be negative'
      }));
      return;
    }

    // Maximum reasonable values to prevent data entry errors
    const maxValues = {
      regular_hours: 4000, // ~77 hours/week for 52 weeks
      overtime_hours: 2000,
      lieu_hours: 1000,
      stat_hours: 200,
      holiday_hours: 200,
      hours_worked: 5000,
      regular_income: 500000,
      overtime_income: 300000,
      lieu_income: 150000,
      vacation_pay: 50000,
      shift_premiums: 100000,
      stat_earnings: 25000,
      holiday_earnings: 25000,
      bonus: 200000,
      federal_tax: 150000,
      provincial_tax: 100000,
      cpp_deduction: 10000,
      ei_deduction: 5000,
      additional_tax: 50000,
      gross_pay: 750000,
      net_pay: 600000
    };

    if (maxValues[field] && numValue > maxValues[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: `Value seems unusually high (max suggested: ${maxValues[field]})`
      }));
    }

    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
    
    setIsDirty(true);
  };

  /**
   * Auto-calculate derived fields
   */
  const calculateDerivedFields = () => {
    const totalHours = (formData.regular_hours || 0) + (formData.overtime_hours || 0) + (formData.lieu_hours || 0) + (formData.stat_hours || 0) + (formData.holiday_hours || 0);
    const totalEarnings = (formData.regular_income || 0) + (formData.overtime_income || 0) + (formData.lieu_income || 0) + (formData.vacation_pay || 0) + (formData.shift_premiums || 0) + (formData.stat_earnings || 0) + (formData.holiday_earnings || 0) + (formData.bonus || 0);
    const totalDeductions = (formData.federal_tax || 0) + (formData.provincial_tax || 0) + (formData.cpp_deduction || 0) + (formData.ei_deduction || 0) + (formData.additional_tax || 0);
    const netPay = totalEarnings - totalDeductions;

    return { totalHours, totalEarnings, totalDeductions, netPay };
  };

  /**
   * Auto-fill calculated fields
   */
  const autoCalculateFields = () => {
    const derived = calculateDerivedFields();
    
    setFormData(prev => ({
      ...prev,
      hours_worked: derived.totalHours,
      gross_pay: derived.totalEarnings,
      net_pay: derived.netPay
    }));
    
    setIsDirty(true);
  };

  /**
   * Validate form before submission
   */
  const validateForm = () => {
    const errors = {};

    // Reason is required
    if (!reason.trim()) {
      errors.reason = 'Reason for manual entry is required';
    } else if (reason.trim().length < 10) {
      errors.reason = 'Reason must be at least 10 characters';
    }

    // Check for logical inconsistencies
    const derived = calculateDerivedFields();
    
    if (Math.abs(formData.hours_worked - derived.totalHours) > 0.01) {
      errors.hours_worked = `Total hours (${formData.hours_worked}) doesn't match sum of individual hours (${derived.totalHours})`;
    }

    if (Math.abs(formData.gross_pay - derived.totalEarnings) > 0.01) {
      errors.gross_pay = `Gross pay (${formData.gross_pay}) doesn't match sum of earnings (${derived.totalEarnings})`;
    }

    if (Math.abs(formData.net_pay - derived.netPay) > 0.01) {
      errors.net_pay = `Net pay (${formData.net_pay}) doesn't match gross minus deductions (${derived.netPay})`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Rate limiting check
    const rateLimitCheck = await checkRateLimit('ytd_manual_entry', employee?.id);
    if (!rateLimitCheck.allowed) {
      alert('Rate limit exceeded. Please wait before making another YTD entry.');
      return;
    }

    setSaving(true);
    
    try {
      await recordAction('ytd_manual_entry_save', employee?.id, true);
      
      // Log detailed security event
      await logSecurityEvent('ytd_manual_entry_attempted', {
        employee_id: employee?.id,
        employee_name: `${employee?.first_name} ${employee?.last_name}`,
        business_id: selectedBusinessId,
        reason: reason.trim(),
        changes: Object.keys(formData).filter(key => 
          Math.abs(parseFloat(formData[key]) - parseFloat(currentYTD?.[key] || 0)) > 0.01
        ),
        form_data_summary: {
          gross_pay: formData.gross_pay,
          net_pay: formData.net_pay,
          hours_worked: formData.hours_worked,
          total_tax: (formData.federal_tax || 0) + (formData.provincial_tax || 0)
        },
        initiated_by: authUser?.id
      }, 'critical');

      // Call the save function
      await onSave(employee.id, formData, reason.trim());
      
      // Success - close modal
      onClose();
      
    } catch (error) {
      console.error('Error saving manual YTD:', error);
      
      await recordAction('ytd_manual_entry_save', employee?.id, false);
      await logSecurityEvent('ytd_manual_entry_failed', {
        employee_id: employee?.id,
        business_id: selectedBusinessId,
        error: error.message,
        initiated_by: authUser?.id
      }, 'critical');
      
      alert('Error saving YTD data: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle modal close with unsaved changes warning
   */
  const handleClose = async () => {
    if (isDirty) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }

    await recordAction('ytd_manual_entry_modal_closed', employee?.id);
    onClose();
  };

  const derived = calculateDerivedFields();
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  // Styles using TavariStyles
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: isOpen ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: TavariStyles.spacing.md
    },
    modal: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      width: '100%',
      maxWidth: '1000px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      overflow: 'hidden'
    },
    header: {
      padding: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: TavariStyles.colors.gray50
    },
    title: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: '4px'
    },
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    content: {
      flex: 1,
      padding: TavariStyles.spacing.lg,
      overflowY: 'auto'
    },
    section: {
      marginBottom: TavariStyles.spacing.xl
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md,
      paddingBottom: TavariStyles.spacing.xs,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: TavariStyles.spacing.md
    },
    twoColumnGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: TavariStyles.spacing.md
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
      padding: '10px 12px',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontFamily: 'inherit',
      transition: 'border-color 0.2s ease'
    },
    inputError: {
      borderColor: TavariStyles.colors.danger,
      backgroundColor: TavariStyles.colors.danger + '08'
    },
    inputReadonly: {
      backgroundColor: TavariStyles.colors.gray50,
      color: TavariStyles.colors.gray600
    },
    textarea: {
      padding: '10px 12px',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontFamily: 'inherit',
      minHeight: '80px',
      resize: 'vertical',
      transition: 'border-color 0.2s ease'
    },
    errorText: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.danger,
      marginTop: '2px'
    },
    calculatedValue: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.primary,
      marginTop: '2px',
      fontStyle: 'italic'
    },
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.sm,
      alignItems: 'center'
    },
    autoCalcButton: {
      padding: '6px 12px',
      backgroundColor: TavariStyles.colors.info,
      color: TavariStyles.colors.white,
      border: 'none',
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.lg,
      borderTop: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: TavariStyles.colors.gray50
    },
    button: {
      padding: '12px 24px',
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: 'none',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    saveButton: {
      backgroundColor: TavariStyles.colors.success,
      color: TavariStyles.colors.white
    },
    saveButtonDisabled: {
      backgroundColor: TavariStyles.colors.gray300,
      color: TavariStyles.colors.gray500,
      cursor: 'not-allowed'
    },
    cancelButton: {
      backgroundColor: TavariStyles.colors.gray300,
      color: TavariStyles.colors.gray700
    },
    warningBanner: {
      backgroundColor: TavariStyles.colors.warning + '20',
      border: `1px solid ${TavariStyles.colors.warning}`,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      padding: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.warning
    }
  };

  if (!isOpen) return null;

  return (
    <SecurityWrapper
      componentName="YTDManualEntryModal"
      securityLevel="critical"
      enableAuditLogging={true}
      sensitiveComponent={true}
    >
      <div style={styles.overlay}>
        <div style={styles.modal}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.title}>
              Manual YTD Entry - {employee?.first_name} {employee?.last_name}
            </div>
            <div style={styles.subtitle}>
              Tax Year {new Date().getFullYear()} • Employee ID: {employee?.id?.slice(0, 8)}...
              {isDirty && <span style={{ color: TavariStyles.colors.warning }}> • Unsaved Changes</span>}
            </div>
          </div>

          <div style={styles.content}>
            {/* Warning Banner */}
            <div style={styles.warningBanner}>
              ⚠️ <strong>Manual YTD Entry:</strong> This will override automatic calculations. 
              Ensure accuracy as this affects tax reporting and compliance. All changes are logged for audit purposes.
            </div>

            {/* Hours Section */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span>Hours Breakdown</span>
                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    style={styles.autoCalcButton}
                    onClick={() => updateField('hours_worked', derived.totalHours)}
                    title="Auto-calculate total hours"
                  >
                    Auto-calc Total ({format(derived.totalHours)})
                  </button>
                </div>
              </div>
              <div style={styles.grid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Regular Hours</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.regular_hours ? styles.inputError : {})
                    }}
                    value={formData.regular_hours || 0}
                    onChange={(e) => updateField('regular_hours', e.target.value)}
                  />
                  {validationErrors.regular_hours && (
                    <div style={styles.errorText}>{validationErrors.regular_hours}</div>
                  )}
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Overtime Hours</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.overtime_hours ? styles.inputError : {})
                    }}
                    value={formData.overtime_hours || 0}
                    onChange={(e) => updateField('overtime_hours', e.target.value)}
                  />
                  {validationErrors.overtime_hours && (
                    <div style={styles.errorText}>{validationErrors.overtime_hours}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Lieu Hours</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.lieu_hours ? styles.inputError : {})
                    }}
                    value={formData.lieu_hours || 0}
                    onChange={(e) => updateField('lieu_hours', e.target.value)}
                  />
                  {validationErrors.lieu_hours && (
                    <div style={styles.errorText}>{validationErrors.lieu_hours}</div>
                  )}
                </div>

                {showAdvanced && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Stat Holiday Hours</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{
                          ...styles.input,
                          ...(validationErrors.stat_hours ? styles.inputError : {})
                        }}
                        value={formData.stat_hours || 0}
                        onChange={(e) => updateField('stat_hours', e.target.value)}
                      />
                      {validationErrors.stat_hours && (
                        <div style={styles.errorText}>{validationErrors.stat_hours}</div>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Holiday Hours</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{
                          ...styles.input,
                          ...(validationErrors.holiday_hours ? styles.inputError : {})
                        }}
                        value={formData.holiday_hours || 0}
                        onChange={(e) => updateField('holiday_hours', e.target.value)}
                      />
                      {validationErrors.holiday_hours && (
                        <div style={styles.errorText}>{validationErrors.holiday_hours}</div>
                      )}
                    </div>
                  </>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Total Hours Worked</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.hours_worked ? styles.inputError : {})
                    }}
                    value={formData.hours_worked || 0}
                    onChange={(e) => updateField('hours_worked', e.target.value)}
                  />
                  {validationErrors.hours_worked && (
                    <div style={styles.errorText}>{validationErrors.hours_worked}</div>
                  )}
                  <div style={styles.calculatedValue}>
                    Sum of individual hours: {format(derived.totalHours)}
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Section */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span>Earnings Breakdown</span>
                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    style={styles.autoCalcButton}
                    onClick={() => updateField('gross_pay', derived.totalEarnings)}
                    title="Auto-calculate gross pay"
                  >
                    Auto-calc Gross (${format(derived.totalEarnings)})
                  </button>
                </div>
              </div>
              <div style={styles.grid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Regular Income</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.regular_income ? styles.inputError : {})
                    }}
                    value={formData.regular_income || 0}
                    onChange={(e) => updateField('regular_income', e.target.value)}
                  />
                  {validationErrors.regular_income && (
                    <div style={styles.errorText}>{validationErrors.regular_income}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Overtime Income</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.overtime_income ? styles.inputError : {})
                    }}
                    value={formData.overtime_income || 0}
                    onChange={(e) => updateField('overtime_income', e.target.value)}
                  />
                  {validationErrors.overtime_income && (
                    <div style={styles.errorText}>{validationErrors.overtime_income}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Lieu Income</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.lieu_income ? styles.inputError : {})
                    }}
                    value={formData.lieu_income || 0}
                    onChange={(e) => updateField('lieu_income', e.target.value)}
                  />
                  {validationErrors.lieu_income && (
                    <div style={styles.errorText}>{validationErrors.lieu_income}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Vacation Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.vacation_pay ? styles.inputError : {})
                    }}
                    value={formData.vacation_pay || 0}
                    onChange={(e) => updateField('vacation_pay', e.target.value)}
                  />
                  {validationErrors.vacation_pay && (
                    <div style={styles.errorText}>{validationErrors.vacation_pay}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Premium Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.shift_premiums ? styles.inputError : {})
                    }}
                    value={formData.shift_premiums || 0}
                    onChange={(e) => updateField('shift_premiums', e.target.value)}
                  />
                  {validationErrors.shift_premiums && (
                    <div style={styles.errorText}>{validationErrors.shift_premiums}</div>
                  )}
                </div>

                {showAdvanced && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Stat Holiday Pay</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{
                          ...styles.input,
                          ...(validationErrors.stat_earnings ? styles.inputError : {})
                        }}
                        value={formData.stat_earnings || 0}
                        onChange={(e) => updateField('stat_earnings', e.target.value)}
                      />
                      {validationErrors.stat_earnings && (
                        <div style={styles.errorText}>{validationErrors.stat_earnings}</div>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Holiday Pay</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{
                          ...styles.input,
                          ...(validationErrors.holiday_earnings ? styles.inputError : {})
                        }}
                        value={formData.holiday_earnings || 0}
                        onChange={(e) => updateField('holiday_earnings', e.target.value)}
                      />
                      {validationErrors.holiday_earnings && (
                        <div style={styles.errorText}>{validationErrors.holiday_earnings}</div>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Bonuses</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{
                          ...styles.input,
                          ...(validationErrors.bonus ? styles.inputError : {})
                        }}
                        value={formData.bonus || 0}
                        onChange={(e) => updateField('bonus', e.target.value)}
                      />
                      {validationErrors.bonus && (
                        <div style={styles.errorText}>{validationErrors.bonus}</div>
                      )}
                    </div>
                  </>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Gross Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.gross_pay ? styles.inputError : {})
                    }}
                    value={formData.gross_pay || 0}
                    onChange={(e) => updateField('gross_pay', e.target.value)}
                  />
                  {validationErrors.gross_pay && (
                    <div style={styles.errorText}>{validationErrors.gross_pay}</div>
                  )}
                  <div style={styles.calculatedValue}>
                    Sum of all earnings: ${format(derived.totalEarnings)}
                  </div>
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span>Deductions Breakdown</span>
                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    style={styles.autoCalcButton}
                    onClick={() => updateField('net_pay', derived.netPay)}
                    title="Auto-calculate net pay"
                  >
                    Auto-calc Net (${format(derived.netPay)})
                  </button>
                </div>
              </div>
              <div style={styles.grid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Federal Tax</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.federal_tax ? styles.inputError : {})
                    }}
                    value={formData.federal_tax || 0}
                    onChange={(e) => updateField('federal_tax', e.target.value)}
                  />
                  {validationErrors.federal_tax && (
                    <div style={styles.errorText}>{validationErrors.federal_tax}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Provincial Tax</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.provincial_tax ? styles.inputError : {})
                    }}
                    value={formData.provincial_tax || 0}
                    onChange={(e) => updateField('provincial_tax', e.target.value)}
                  />
                  {validationErrors.provincial_tax && (
                    <div style={styles.errorText}>{validationErrors.provincial_tax}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>CPP Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.cpp_deduction ? styles.inputError : {})
                    }}
                    value={formData.cpp_deduction || 0}
                    onChange={(e) => updateField('cpp_deduction', e.target.value)}
                  />
                  {validationErrors.cpp_deduction && (
                    <div style={styles.errorText}>{validationErrors.cpp_deduction}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>EI Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.ei_deduction ? styles.inputError : {})
                    }}
                    value={formData.ei_deduction || 0}
                    onChange={(e) => updateField('ei_deduction', e.target.value)}
                  />
                  {validationErrors.ei_deduction && (
                    <div style={styles.errorText}>{validationErrors.ei_deduction}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Additional Tax</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.additional_tax ? styles.inputError : {})
                    }}
                    value={formData.additional_tax || 0}
                    onChange={(e) => updateField('additional_tax', e.target.value)}
                  />
                  {validationErrors.additional_tax && (
                    <div style={styles.errorText}>{validationErrors.additional_tax}</div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Net Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(validationErrors.net_pay ? styles.inputError : {})
                    }}
                    value={formData.net_pay || 0}
                    onChange={(e) => updateField('net_pay', e.target.value)}
                  />
                  {validationErrors.net_pay && (
                    <div style={styles.errorText}>{validationErrors.net_pay}</div>
                  )}
                  <div style={styles.calculatedValue}>
                    Gross minus deductions: ${format(derived.netPay)}
                  </div>
                </div>
              </div>
            </div>

            {/* Reason Section */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Reason for Manual Entry</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Explain why you are manually entering/updating this YTD data *
                </label>
                <textarea
                  style={{
                    ...styles.textarea,
                    ...(validationErrors.reason ? styles.inputError : {})
                  }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Required: Provide a detailed reason for this manual YTD entry (e.g., 'Importing historical data from previous system', 'Correcting calculation error in Q2', 'Adding missing bonus payment')..."
                  required
                />
                {validationErrors.reason && (
                  <div style={styles.errorText}>{validationErrors.reason}</div>
                )}
                <div style={styles.calculatedValue}>
                  {reason.length}/200 characters
                </div>
              </div>
            </div>

            {/* Advanced Fields Toggle */}
            <div style={styles.formGroup}>
              <TavariCheckbox
                checked={showAdvanced}
                onChange={setShowAdvanced}
                label="Show advanced fields (stat pay, holiday pay, bonuses)"
              />
            </div>

            {/* Auto-Calculate All Button */}
            <div style={{ textAlign: 'center', marginTop: TavariStyles.spacing.lg }}>
              <button
                type="button"
                style={{
                  ...styles.autoCalcButton,
                  padding: '12px 24px',
                  fontSize: TavariStyles.typography.fontSize.sm
                }}
                onClick={autoCalculateFields}
              >
                Auto-Calculate All Totals
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <div style={{ fontSize: TavariStyles.typography.fontSize.xs, color: TavariStyles.colors.gray500 }}>
              All manual entries are logged for audit purposes • Changes by: {authUser?.email}
            </div>
            <div style={{ display: 'flex', gap: TavariStyles.spacing.md }}>
              <button 
                style={{...styles.button, ...styles.cancelButton}}
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                style={{
                  ...styles.button, 
                  ...(saving || !reason.trim() || hasValidationErrors ? styles.saveButtonDisabled : styles.saveButton)
                }}
                onClick={handleSave}
                disabled={saving || !reason.trim() || hasValidationErrors}
              >
                {saving ? 'Saving...' : 'Save YTD Data'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default YTDManualEntryModal;