// components/HR/HREmployeeProfilesComponents/EmployeeVacationPayModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, DollarSign, AlertCircle, Check, X, Info } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { TavariStyles } from '../../../utils/TavariStyles';

const EmployeeVacationPayModal = ({
  isOpen,
  onClose,
  employee,
  businessId,
  onVacationPayUpdated
}) => {
  const [vacationPercent, setVacationPercent] = useState(0.04);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [yearsOfService, setYearsOfService] = useState(0);
  const [esaMinimum, setEsaMinimum] = useState(0.04);
  const [isOverride, setIsOverride] = useState(false);

  // Security context
  const {
    validateInput,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'EmployeeVacationPayModal',
    sensitiveComponent: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    securityLevel: 'high'
  });

  // Calculate years of service and ESA requirements
  useEffect(() => {
    if (employee?.hire_date) {
      const hireDate = new Date(employee.hire_date);
      const currentDate = new Date();
      const years = (currentDate - hireDate) / (365.25 * 24 * 60 * 60 * 1000);
      const roundedYears = Math.floor(years * 10) / 10; // Round to 1 decimal
      
      setYearsOfService(roundedYears);
      
      // ESA minimum: 4% for <5 years, 6% for 5+ years
      const minimum = years >= 5 ? 0.06 : 0.04;
      setEsaMinimum(minimum);
      
      // Set current vacation percent or ESA minimum
      const currentPercent = employee.vacation_percent || minimum;
      setVacationPercent(currentPercent);
      
      // Check if current rate is an override (higher than ESA minimum)
      setIsOverride(currentPercent > minimum);
    }
  }, [employee]);

  const handlePercentageChange = useCallback(async (newValue) => {
    try {
      // Validate input
      const validation = await validateInput(newValue.toString(), 'vacation_percent');
      if (!validation.valid) {
        setError('Invalid vacation percentage: ' + validation.error);
        return;
      }

      const percent = parseFloat(newValue);
      
      if (isNaN(percent) || percent < 0 || percent > 0.20) {
        setError('Vacation percentage must be between 0% and 20%');
        return;
      }
      
      if (percent < esaMinimum) {
        setError(`Cannot set below Ontario ESA minimum of ${(esaMinimum * 100).toFixed(0)}% for employees with ${yearsOfService >= 5 ? '5+' : 'less than 5'} years of service`);
        return;
      }
      
      setVacationPercent(percent);
      setIsOverride(percent > esaMinimum);
      setError(null);
      
    } catch (error) {
      setError('Error validating input: ' + error.message);
    }
  }, [esaMinimum, yearsOfService, validateInput]);

  const handleSave = async () => {
    if (!employee) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await logSecurityEvent('vacation_pay_update_attempt', {
        employee_id: employee.id,
        old_vacation_percent: employee.vacation_percent,
        new_vacation_percent: vacationPercent,
        esa_minimum: esaMinimum,
        years_of_service: yearsOfService
      }, 'medium');
      
      // Update the user's vacation_percent in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          vacation_percent: vacationPercent,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);
      
      if (updateError) {
        throw updateError;
      }
      
      await logSecurityEvent('vacation_pay_updated', {
        employee_id: employee.id,
        new_vacation_percent: vacationPercent,
        updated_by: 'current_user_id' // You'll need to pass this from your auth context
      }, 'high');
      
      await recordAction('update_vacation_pay', {
        employee_id: employee.id,
        vacation_percent: vacationPercent
      });
      
      // Notify parent component
      if (onVacationPayUpdated) {
        onVacationPayUpdated(employee.id, vacationPercent);
      }
      
      onClose();
      
    } catch (error) {
      console.error('Error updating vacation pay:', error);
      setError('Failed to update vacation pay: ' + error.message);
      
      await logSecurityEvent('vacation_pay_update_failed', {
        employee_id: employee.id,
        error_message: error.message
      }, 'medium');
    } finally {
      setLoading(false);
    }
  };

  const resetToESAMinimum = () => {
    setVacationPercent(esaMinimum);
    setIsOverride(false);
    setError(null);
  };

  const calculateAnnualVacationPay = () => {
    if (!employee?.wage) return 0;
    
    // Assume full-time hours for estimation (2080 hours/year)
    const estimatedAnnualHours = 2080;
    const estimatedAnnualWages = employee.wage * estimatedAnnualHours;
    return estimatedAnnualWages * vacationPercent;
  };

  if (!isOpen || !employee) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    },
    modal: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px',
      borderBottom: '2px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    title: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#1f2937',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      color: '#6b7280',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '6px'
    },
    body: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto'
    },
    section: {
      marginBottom: '24px',
      padding: '20px',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px'
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '20px'
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    infoLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#6b7280'
    },
    infoValue: {
      fontSize: '16px',
      fontWeight: '500',
      color: '#1f2937'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
      display: 'block'
    },
    inputGroup: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    input: {
      flex: 1,
      padding: '12px 16px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '16px',
      fontFamily: 'inherit',
      backgroundColor: '#ffffff'
    },
    percentLabel: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#374151'
    },
    resetButton: {
      padding: '8px 16px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    complianceBox: {
      padding: '16px',
      backgroundColor: '#f0f9ff',
      border: '2px solid #0ea5e9',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    complianceTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#0c4a6e',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    complianceText: {
      fontSize: '14px',
      color: '#0c4a6e',
      lineHeight: '1.4'
    },
    warningBox: {
      padding: '16px',
      backgroundColor: '#fef3c7',
      border: '2px solid #f59e0b',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    warningTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#92400e',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    warningText: {
      fontSize: '14px',
      color: '#92400e',
      lineHeight: '1.4'
    },
    errorBox: {
      padding: '16px',
      backgroundColor: '#fee2e2',
      border: '2px solid #ef4444',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    errorText: {
      fontSize: '14px',
      color: '#dc2626',
      margin: 0
    },
    estimationBox: {
      padding: '16px',
      backgroundColor: '#f0fdf4',
      border: '2px solid #22c55e',
      borderRadius: '8px'
    },
    estimationTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#166534',
      marginBottom: '8px'
    },
    estimationValue: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#166534'
    },
    estimationNote: {
      fontSize: '12px',
      color: '#166534',
      marginTop: '4px',
      fontStyle: 'italic'
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      padding: '24px',
      borderTop: '2px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    cancelButton: {
      padding: '12px 24px',
      backgroundColor: '#ffffff',
      border: '2px solid #d1d5db',
      color: '#374151',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    saveButton: {
      padding: '12px 24px',
      backgroundColor: '#22c55e',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    saveButtonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    }
  };

  return (
    <SecurityWrapper>
      <div style={styles.overlay}>
        <div style={styles.modal}>
          {/* Header */}
          <div style={styles.header}>
            <h3 style={styles.title}>
              <Calendar size={24} />
              Vacation Pay Settings
            </h3>
            <button onClick={onClose} style={styles.closeButton}>
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div style={styles.body}>
            {/* Employee Information */}
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>
                <Info size={20} />
                Employee Information
              </h4>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Employee Name</span>
                  <span style={styles.infoValue}>{employee.full_name}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Hire Date</span>
                  <span style={styles.infoValue}>
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Years of Service</span>
                  <span style={styles.infoValue}>{yearsOfService.toFixed(1)} years</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Hourly Wage</span>
                  <span style={styles.infoValue}>
                    {employee.wage ? `$${employee.wage.toFixed(2)}/hour` : 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            {/* ESA Compliance Information */}
            <div style={styles.complianceBox}>
              <div style={styles.complianceTitle}>
                <Check size={16} />
                Ontario ESA Compliance
              </div>
              <div style={styles.complianceText}>
                Based on {yearsOfService.toFixed(1)} years of service, the minimum vacation pay required by 
                Ontario's Employment Standards Act is <strong>{(esaMinimum * 100).toFixed(0)}%</strong> of gross wages.
                {yearsOfService >= 5 ? 
                  ' Employees with 5+ years of service are entitled to 6% vacation pay.' :
                  ' Employees will automatically increase to 6% after 5 years of service.'
                }
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div style={styles.errorBox}>
                <p style={styles.errorText}>{error}</p>
              </div>
            )}

            {/* Vacation Percentage Setting */}
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>
                <DollarSign size={20} />
                Vacation Pay Percentage
              </h4>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Annual Vacation Pay Percentage
                </label>
                <div style={styles.inputGroup}>
                  <input
                    type="number"
                    min={esaMinimum}
                    max="0.20"
                    step="0.001"
                    value={(vacationPercent * 100).toFixed(1)}
                    onChange={(e) => handlePercentageChange(parseFloat(e.target.value) / 100)}
                    style={styles.input}
                    placeholder="4.0"
                  />
                  <span style={styles.percentLabel}>%</span>
                  <button
                    onClick={resetToESAMinimum}
                    style={styles.resetButton}
                    title="Reset to ESA Minimum"
                  >
                    Reset to ESA Min ({(esaMinimum * 100).toFixed(0)}%)
                  </button>
                </div>
              </div>

              {/* Override Warning */}
              {isOverride && (
                <div style={styles.warningBox}>
                  <div style={styles.warningTitle}>
                    <AlertCircle size={16} />
                    Company Override
                  </div>
                  <div style={styles.warningText}>
                    This rate ({(vacationPercent * 100).toFixed(1)}%) is higher than the ESA minimum 
                    ({(esaMinimum * 100).toFixed(0)}%). This is a company benefit above legal requirements.
                  </div>
                </div>
              )}

              {/* Annual Vacation Pay Estimation */}
              {employee.wage && (
                <div style={styles.estimationBox}>
                  <div style={styles.estimationTitle}>
                    Estimated Annual Vacation Pay
                  </div>
                  <div style={styles.estimationValue}>
                    ${calculateAnnualVacationPay().toFixed(2)}
                  </div>
                  <div style={styles.estimationNote}>
                    Based on ${employee.wage.toFixed(2)}/hour × 2080 hours/year × {(vacationPercent * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !!error}
              style={{
                ...styles.saveButton,
                ...(loading || error ? styles.saveButtonDisabled : {})
              }}
            >
              {loading ? 'Saving...' : (
                <>
                  <Check size={16} />
                  Save Vacation Pay
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default EmployeeVacationPayModal;