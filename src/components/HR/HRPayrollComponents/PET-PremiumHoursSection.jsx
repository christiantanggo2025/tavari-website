// components/HR/HRPayrollComponents/PET-PremiumHoursSection.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const PETPremiumHoursSection = ({
  allPremiums = [],
  localHours = {},
  onPremiumHoursChange,
  saving = false,
  employee = null,
  isEmployeePremiumEnabled = null
}) => {
  // Security context for premium operations
  const {
    validateInput,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'PETPremiumHoursSection',
    sensitiveComponent: true,
    enableRateLimiting: false,
    enableAuditLogging: false,
    securityLevel: 'medium'
  });

  /**
   * Calculate automatic premium hours based on applies_to setting from database
   */
  const calculateAutomaticPremiumHours = useCallback((premium, totalHours, regularHours, overtimeHours, lieuUsedHours = 0) => {
    const total = parseFloat(totalHours || 0);
    const regular = parseFloat(regularHours || 0);
    const overtime = parseFloat(overtimeHours || 0);
    const lieuUsed = parseFloat(lieuUsedHours || 0);
  
    switch (premium.applies_to) {
      case 'all_hours':
        return total; // Now includes lieu hours in total
      
      case 'specific_hours':
        return 0; // Manual entry - will be set by user input
      
      case 'overtime_hours':
        return overtime; // Apply only to overtime hours
      
      case 'regular_hours':
        return regular; // Apply only to regular hours
      
      case 'lieu_hours': // NEW CASE for lieu hours specifically
        return lieuUsed;
      
      case 'weekend_hours':
        return 0; // For now, default to manual entry
      
      default:
        return 0; // Default to manual entry
    }
  }, []);

  /**
   * Check if premium input should be disabled (automatic calculation)
   */
  const isPremiumInputDisabled = useCallback((premium) => {
    return premium.applies_to !== 'specific_hours';
  }, []);

  /**
   * Get display text for premium application type
   */
  const getPremiumDisplayText = useCallback((premium) => {
    switch (premium.applies_to) {
      case 'all_hours':
        return ' (Auto: All Hours)';
      case 'overtime_hours':  
        return ' (Auto: Overtime Only)';
      case 'regular_hours':
        return ' (Auto: Regular Only)';
      case 'weekend_hours':
        return ' (Auto: Weekend Only)';
      case 'specific_hours':
        return ' (Manual Entry)';
      default:
        return ' (Manual Entry)';
    }
  }, []);

  /**
   * Get premium calculation explanation
   */
  const getPremiumExplanation = useCallback((premium) => {
    switch (premium.applies_to) {
      case 'all_hours':
        return 'This premium automatically applies to all hours you work';
      case 'overtime_hours':
        return 'This premium automatically applies to overtime hours only';
      case 'regular_hours':
        return 'This premium automatically applies to regular hours only';
      case 'weekend_hours':
        return 'This premium automatically applies to weekend hours only';
      case 'specific_hours':
        return 'Enter the number of hours this premium should apply to';
      default:
        return 'Enter the number of hours this premium should apply to';
    }
  }, []);

  // Auto-calculate premium hours when total hours change
  useEffect(() => {
    if (allPremiums && allPremiums.length > 0 && localHours) {
      const totalWorkedHours = parseFloat(localHours.total_hours || 0);
      const lieuUsedHours = parseFloat(localHours.lieu_used || 0);
      const totalHours = totalWorkedHours + lieuUsedHours; // INCLUDE LIEU HOURS
      const regularHours = parseFloat(localHours.regular_hours || totalWorkedHours);
      const overtimeHours = parseFloat(localHours.overtime_hours || 0);
    
      const updatedPremiumHours = { ...localHours.premium_hours };
      let hasChanges = false;
    
      allPremiums.forEach(premium => {
        if (premium.applies_to !== 'specific_hours' && isEmployeePremiumEnabled?.(employee?.id, premium.name)) {
          const autoHours = calculateAutomaticPremiumHours(premium, totalHours, regularHours, overtimeHours, lieuUsedHours);
          if (updatedPremiumHours[premium.name] !== autoHours) {
            updatedPremiumHours[premium.name] = autoHours;
            hasChanges = true;
          }
        }
      });
    
      if (hasChanges && onPremiumHoursChange) {
        onPremiumHoursChange(updatedPremiumHours);
      }
    }
  }, [localHours.total_hours, localHours.overtime_hours, localHours.lieu_used, allPremiums, calculateAutomaticPremiumHours, onPremiumHoursChange]);
  
  // Handle manual premium hours change
  const handlePremiumHoursChange = useCallback(async (premiumName, newHours) => {
    try {
      const validatedHours = Math.max(0, parseFloat(newHours) || 0);
      
      // Validate input
      const validation = await validateInput(validatedHours.toString(), 'premium_hours');
      if (!validation.valid) {
        console.warn('Invalid premium hours:', validation.error);
        return;
      }

      const updatedPremiumHours = {
        ...localHours.premium_hours,
        [premiumName]: validatedHours
      };

      if (onPremiumHoursChange) {
        onPremiumHoursChange(updatedPremiumHours);
      }

      // Log the change
      if (recordAction && employee) {
        await recordAction('premium_hours_changed', {
          employee_id: employee.id,
          premium_name: premiumName,
          hours: validatedHours
        });
      }

    } catch (error) {
      console.error('Error updating premium hours:', error);
    }
  }, [localHours.premium_hours, onPremiumHoursChange, validateInput, recordAction, employee]);

  // Calculate premium preview totals
  const premiumPreview = useMemo(() => {
    if (!allPremiums || !employee) return { totalPay: 0, breakdown: {} };
    
    const wage = parseFloat(employee.wage || 0);
    let totalPremiumPay = 0;
    const breakdown = {};
    
    allPremiums.forEach(premium => {
      const premiumHours = parseFloat(localHours.premium_hours?.[premium.name] || 0);
      
      if (premiumHours > 0) {
        let premiumPay = 0;
        
        if (premium.rate_type === 'percentage') {
          premiumPay = premiumHours * wage * (parseFloat(premium.rate) / 100);
        } else {
          premiumPay = premiumHours * parseFloat(premium.rate);
        }
        
        totalPremiumPay += premiumPay;
        breakdown[premium.name] = {
          hours: premiumHours,
          rate: premium.rate,
          rate_type: premium.rate_type,
          pay: premiumPay,
          applies_to: premium.applies_to
        };
      }
    });
    
    return { totalPay: totalPremiumPay, breakdown };
  }, [allPremiums, localHours.premium_hours, employee]);

  const styles = {
    section: {
      marginBottom: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      maxWidth: '100%',
      overflow: 'hidden'
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      margin: `0 0 ${TavariStyles.spacing.md} 0`
    },
    premiumGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: TavariStyles.spacing.lg,
      maxWidth: '100%',
      overflow: 'hidden'
    },
    premiumInputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs,
      minWidth: 0,
      width: '89%'
    },
    label: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700,
      wordWrap: 'break-word',
      lineHeight: '1.3'
    },
    input: {
      ...TavariStyles.components.form?.input || {
        padding: '12px 16px',
        border: `1px solid ${TavariStyles.colors.gray300}`,
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        fontSize: TavariStyles.typography.fontSize.sm,
        backgroundColor: TavariStyles.colors.white
      },
      width: '100%'
    },
    premiumInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs
    },
    premiumRate: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.primary,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    autoText: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.info,
      fontStyle: 'italic'
    },
    explanationText: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      marginTop: TavariStyles.spacing.xs
    },
    infoText: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      fontStyle: 'italic'
    },
    noPremiumsText: {
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.sm,
      padding: TavariStyles.spacing.md
    },
    previewSection: {
      marginTop: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    previewTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm
    },
    previewTotal: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary
    }
  };

  if (!allPremiums || allPremiums.length === 0) {
    return (
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Premium Hours</h4>
        <div style={styles.noPremiumsText}>
          No shift premiums available for this employee
        </div>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Premium Hours</h4>
      
      <div style={styles.premiumGrid}>
        {allPremiums.map((premium, index) => {
          const currentHours = localHours.premium_hours?.[premium.name] || 0;
          const isDisabled = isPremiumInputDisabled(premium) || saving;
          const displayText = getPremiumDisplayText(premium);
          const explanation = getPremiumExplanation(premium);
          
          return (
            <div key={`${premium.id}-${index}`} style={styles.premiumInputGroup}>
              <label style={styles.label}>
                {premium.name} Hours{displayText}
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max={parseFloat(localHours.total_hours || 0)}
                style={{
                  ...styles.input,
                  ...(isDisabled ? {
                    backgroundColor: TavariStyles.colors.gray100,
                    cursor: 'not-allowed',
                    opacity: 0.7
                  } : {})
                }}
                value={currentHours || ''}
                onChange={(e) => {
                  if (!isDisabled) {
                    handlePremiumHoursChange(premium.name, e.target.value);
                  }
                }}
                disabled={isDisabled}
                placeholder="0.00"
                onFocus={(e) => !isDisabled && e.target.select()}
                onClick={(e) => !isDisabled && e.target.select()}
              />
              <div style={styles.premiumInfo}>
                <span style={styles.premiumRate}>
                  {premium.rate_type === 'percentage' 
                    ? `${premium.rate}% of base rate` 
                    : `$${premium.rate}/hr`}
                </span>
                {premium.applies_to !== 'specific_hours' ? (
                  <div style={styles.autoText}>
                    Automatically calculated based on your hours worked
                  </div>
                ) : (
                  <div style={styles.explanationText}>
                    {explanation}
                  </div>
                )}
              </div>
              {premium.description && (
                <div style={styles.infoText}>
                  {premium.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Premium Pay Preview */}
      {premiumPreview.totalPay > 0 && (
        <div style={styles.previewSection}>
          <div style={styles.previewTitle}>Premium Pay Preview:</div>
          <div style={styles.previewTotal}>
            ${premiumPreview.totalPay.toFixed(2)}
          </div>
          {Object.entries(premiumPreview.breakdown).map(([name, data]) => (
            <div key={name} style={styles.explanationText}>
              {name}: {data.hours}h × ${data.rate_type === 'percentage' ? 
                `(${data.rate}% of base)` : data.rate} = ${data.pay.toFixed(2)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PETPremiumHoursSection;