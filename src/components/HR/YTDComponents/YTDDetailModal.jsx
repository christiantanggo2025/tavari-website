// components/HR/YTDComponents/YTDDetailModal.jsx - Detailed YTD Modal Component
import React from 'react';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import POSAuthWrapper from '../../Auth/POSAuthWrapper';
import TavariCheckbox from '../../UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

/**
 * Detailed YTD Modal Component for displaying comprehensive year-to-date information
 * Shows complete breakdown of hours, earnings, deductions, and metadata
 * Integrates with Tavari security and styling standards
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Function} onClose - Function to close modal
 * @param {Object} employee - Employee object with id, first_name, last_name
 * @param {Object} ytdData - YTD data object with all financial information
 * @param {Function} formatAmount - Optional formatting function for monetary values
 * @param {Function} onEdit - Optional callback for editing YTD data
 * @param {boolean} allowEdit - Whether editing is permitted for current user
 */
const YTDDetailModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  ytdData, 
  formatAmount = null,
  onEdit = null,
  allowEdit = false 
}) => {
  // Security context for sensitive YTD data viewing
  const { recordAction, logSecurityEvent } = useSecurityContext({
    componentName: 'YTDDetailModal',
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
    componentName: 'YTDDetailModal'
  });

  // Tax calculations for consistent formatting
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId);

  /**
   * Format monetary amounts using provided formatter or fallback
   */
  const format = (amount) => {
    if (formatAmount) return formatAmount(amount);
    if (formatTaxAmount) return formatTaxAmount(amount);
    return Number(amount || 0).toFixed(2);
  };

  /**
   * Handle edit button click with security logging
   */
  const handleEdit = async () => {
    try {
      await recordAction('ytd_edit_initiated', employee?.id);
      await logSecurityEvent('ytd_edit_modal_opened', {
        employee_id: employee?.id,
        employee_name: `${employee?.first_name} ${employee?.last_name}`,
        business_id: selectedBusinessId,
        initiated_by: authUser?.id
      }, 'medium');
      
      if (onEdit) onEdit(employee, ytdData);
    } catch (error) {
      console.error('Error logging YTD edit action:', error);
      // Still allow edit even if logging fails
      if (onEdit) onEdit(employee, ytdData);
    }
  };

  /**
   * Handle modal close with security logging
   */
  const handleClose = async () => {
    try {
      await recordAction('ytd_detail_modal_closed', employee?.id);
      onClose();
    } catch (error) {
      console.error('Error logging modal close:', error);
      onClose(); // Still close even if logging fails
    }
  };

  /**
   * Calculate derived values for display
   */
  const calculateDerivedValues = () => {
    if (!ytdData) return {};

    const totalHours = (ytdData.regular_hours || 0) + (ytdData.overtime_hours || 0) + (ytdData.lieu_hours || 0);
    const totalEarnings = (ytdData.regular_income || 0) + (ytdData.overtime_income || 0) + (ytdData.lieu_income || 0) + (ytdData.vacation_pay || 0) + (ytdData.shift_premiums || 0);
    const totalDeductions = (ytdData.federal_tax || 0) + (ytdData.provincial_tax || 0) + (ytdData.cpp_deduction || 0) + (ytdData.ei_deduction || 0) + (ytdData.additional_tax || 0);
    const averageHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

    return {
      totalHours,
      totalEarnings,
      totalDeductions,
      averageHourlyRate
    };
  };

  const derived = calculateDerivedValues();

  // Styles using TavariStyles for consistency
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
      maxWidth: '900px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      overflow: 'hidden'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: TavariStyles.colors.gray50
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800
    },
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginTop: '4px'
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: TavariStyles.typography.fontSize['2xl'],
      color: TavariStyles.colors.gray500,
      cursor: 'pointer',
      padding: TavariStyles.spacing.xs,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
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
      gap: TavariStyles.spacing.sm
    },
    sectionIcon: {
      fontSize: TavariStyles.typography.fontSize.xl,
      width: '24px',
      textAlign: 'center'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: TavariStyles.spacing.md
    },
    twoColumnGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: TavariStyles.spacing.md
    },
    dataItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      border: `1px solid ${TavariStyles.colors.gray100}`,
      transition: 'all 0.2s ease'
    },
    highlightedItem: {
      backgroundColor: TavariStyles.colors.primary + '08',
      borderColor: TavariStyles.colors.primary + '30'
    },
    label: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    value: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800
    },
    primaryValue: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary
    },
    earningsValue: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.success
    },
    deductionValue: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.danger
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    primaryButton: {
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      color: TavariStyles.colors.gray600,
      border: `1px solid ${TavariStyles.colors.gray300}`
    },
    metadata: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray400,
      fontStyle: 'italic'
    },
    summaryCard: {
      backgroundColor: TavariStyles.colors.primary + '08',
      border: `2px solid ${TavariStyles.colors.primary}`,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      padding: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg
    },
    summaryTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.sm,
      textAlign: 'center'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      backgroundColor: TavariStyles.colors.success + '20',
      color: TavariStyles.colors.success
    },
    warningBadge: {
      backgroundColor: TavariStyles.colors.warning + '20',
      color: TavariStyles.colors.warning
    }
  };

  // Return null if modal is not open or no data
  if (!isOpen || !ytdData) return null;

  return (
    <SecurityWrapper
      componentName="YTDDetailModal"
      securityLevel="critical"
      enableAuditLogging={true}
      sensitiveComponent={true}
    >
      <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div style={styles.modal}>
          {/* Header */}
          <div style={styles.header}>
            <div>
              <div style={styles.title}>
                YTD Details - {employee?.first_name} {employee?.last_name}
              </div>
              <div style={styles.subtitle}>
                Tax Year {ytdData.tax_year} • Employee ID: {employee?.id?.slice(0, 8)}...
                {ytdData.manual_entry && <span style={styles.badge}>Manual Entry</span>}
              </div>
            </div>
            <button 
              style={styles.closeButton} 
              onClick={handleClose}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = TavariStyles.colors.gray100;
                e.target.style.color = TavariStyles.colors.gray700;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = TavariStyles.colors.gray500;
              }}
            >
              ×
            </button>
          </div>

          <div style={styles.content}>
            {/* Summary Card */}
            <div style={styles.summaryCard}>
              <div style={styles.summaryTitle}>Year-to-Date Summary</div>
              <div style={styles.twoColumnGrid}>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Total Hours Worked</span>
                  <span style={styles.primaryValue}>{format(derived.totalHours)} hrs</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Average Hourly Rate</span>
                  <span style={styles.primaryValue}>${format(derived.averageHourlyRate)}/hr</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Gross Earnings</span>
                  <span style={styles.earningsValue}>${format(ytdData.gross_pay)}</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Net Pay</span>
                  <span style={styles.primaryValue}>${format(ytdData.net_pay)}</span>
                </div>
              </div>
            </div>

            {/* Hours Breakdown */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>⏰</span>
                Hours Breakdown
              </div>
              <div style={styles.grid}>
                <div style={{...styles.dataItem, ...(ytdData.regular_hours > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Regular Hours</span>
                  <span style={styles.value}>{format(ytdData.regular_hours)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.overtime_hours > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Overtime Hours</span>
                  <span style={styles.value}>{format(ytdData.overtime_hours)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.lieu_hours > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Lieu Hours</span>
                  <span style={styles.value}>{format(ytdData.lieu_hours)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.stat_hours > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Stat Holiday Hours</span>
                  <span style={styles.value}>{format(ytdData.stat_hours || 0)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.holiday_hours > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Holiday Hours</span>
                  <span style={styles.value}>{format(ytdData.holiday_hours || 0)}</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Total Hours</span>
                  <span style={styles.primaryValue}>{format(ytdData.hours_worked)}</span>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>💰</span>
                Earnings Breakdown
              </div>
              <div style={styles.grid}>
                <div style={{...styles.dataItem, ...(ytdData.regular_income > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Regular Income</span>
                  <span style={styles.earningsValue}>${format(ytdData.regular_income)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.overtime_income > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Overtime Income</span>
                  <span style={styles.earningsValue}>${format(ytdData.overtime_income)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.lieu_income > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Lieu Income</span>
                  <span style={styles.earningsValue}>${format(ytdData.lieu_income)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.vacation_pay > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Vacation Pay</span>
                  <span style={styles.earningsValue}>${format(ytdData.vacation_pay)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.shift_premiums > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Premium Pay</span>
                  <span style={styles.earningsValue}>${format(ytdData.shift_premiums)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.stat_earnings > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Stat Holiday Pay</span>
                  <span style={styles.earningsValue}>${format(ytdData.stat_earnings || 0)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.holiday_earnings > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Holiday Pay</span>
                  <span style={styles.earningsValue}>${format(ytdData.holiday_earnings || 0)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.bonus > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Bonuses</span>
                  <span style={styles.earningsValue}>${format(ytdData.bonus || 0)}</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Gross Pay</span>
                  <span style={styles.primaryValue}>${format(ytdData.gross_pay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>📊</span>
                Deductions Breakdown
              </div>
              <div style={styles.grid}>
                <div style={{...styles.dataItem, ...(ytdData.federal_tax > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Federal Tax</span>
                  <span style={styles.deductionValue}>${format(ytdData.federal_tax)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.provincial_tax > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Provincial Tax</span>
                  <span style={styles.deductionValue}>${format(ytdData.provincial_tax)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.cpp_deduction > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>CPP Deduction</span>
                  <span style={styles.deductionValue}>${format(ytdData.cpp_deduction)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.ei_deduction > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>EI Deduction</span>
                  <span style={styles.deductionValue}>${format(ytdData.ei_deduction)}</span>
                </div>
                <div style={{...styles.dataItem, ...(ytdData.additional_tax > 0 ? styles.highlightedItem : {})}}>
                  <span style={styles.label}>Additional Tax</span>
                  <span style={styles.deductionValue}>${format(ytdData.additional_tax)}</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Total Deductions</span>
                  <span style={styles.deductionValue}>${format(derived.totalDeductions)}</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Net Pay</span>
                  <span style={styles.primaryValue}>${format(ytdData.net_pay)}</span>
                </div>
              </div>
            </div>

            {/* Record Information */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>📋</span>
                Record Information
              </div>
              <div style={styles.grid}>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Tax Year</span>
                  <span style={styles.value}>{ytdData.tax_year}</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Last Updated</span>
                  <span style={styles.value}>{new Date(ytdData.last_updated).toLocaleString()}</span>
                </div>
                <div style={styles.dataItem}>
                  <span style={styles.label}>Data Source</span>
                  <span style={styles.value}>
                    {ytdData.manual_entry ? 'Manual Entry' : 'Automatic Calculation'}
                  </span>
                </div>
                {ytdData.manual_entry && ytdData.manual_entry_reason && (
                  <div style={styles.dataItem}>
                    <span style={styles.label}>Entry Reason</span>
                    <span style={styles.value}>{ytdData.manual_entry_reason}</span>
                  </div>
                )}
                {ytdData.last_payroll_run_id && (
                  <div style={styles.dataItem}>
                    <span style={styles.label}>Last Payroll Run</span>
                    <span style={styles.value}>{ytdData.last_payroll_run_id.slice(-8)}...</span>
                  </div>
                )}
                <div style={styles.dataItem}>
                  <span style={styles.label}>Record ID</span>
                  <span style={styles.value}>{ytdData.id?.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <div style={styles.metadata}>
              Business ID: {ytdData.business_id?.slice(0, 8)}... | 
              Employee ID: {ytdData.user_id?.slice(0, 8)}... | 
              Viewed by: {authUser?.email}
            </div>
            <div style={{ display: 'flex', gap: TavariStyles.spacing.md }}>
              {allowEdit && onEdit && (
                <button 
                  style={{...styles.button, ...styles.primaryButton}}
                  onClick={handleEdit}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = TavariStyles.colors.primaryDark;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = TavariStyles.colors.primary;
                  }}
                >
                  Edit YTD Data
                </button>
              )}
              <button 
                style={{...styles.button, ...styles.secondaryButton}}
                onClick={handleClose}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = TavariStyles.colors.gray100;
                  e.target.style.borderColor = TavariStyles.colors.gray400;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = TavariStyles.colors.gray300;
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default YTDDetailModal;