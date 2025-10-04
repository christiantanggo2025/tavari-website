// components/HR/HRPayrollComponents/HolidayPayCalculator.jsx - Canadian Holiday Pay Calculator Component
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

/**
 * Holiday Pay Calculator Component for Canadian Employment Standards
 * Implements provincial holiday pay calculations per Employment Standards Acts
 * 
 * Key Features:
 * - Provincial-specific holiday pay calculations (ON, BC, AB, etc.)
 * - Federal Labour Code compliance for federally regulated employers
 * - Holiday date picker integration
 * - Automatic eligibility validation
 * - Live calculation preview
 * - Integration with existing payroll system
 * 
 * Canadian Holiday Pay Rules Summary:
 * - Ontario: 1/20th of wages from 4 weeks before holiday week (ESA)
 * - Federal: 1/20th of wages from 4-week period before holiday week (CLC)
 * - BC: Average day's pay based on 30 calendar days before holiday
 * - Alberta: Average day's wage from 28 days before holiday
 * 
 * @param {Object} props Component props
 * @param {Object} props.employee - Employee object with wage and employment data
 * @param {string} props.selectedBusinessId - Business ID for jurisdiction determination
 * @param {Function} props.onHolidayPayChange - Callback when holiday pay is calculated
 * @param {Object} props.payPeriod - Current pay period {start, end, payDate}
 * @param {Object} props.settings - Payroll settings with jurisdiction info
 * @param {Function} props.formatAmount - Amount formatting function
 */
const HolidayPayCalculator = ({
  employee,
  selectedBusinessId,
  onHolidayPayChange,
  payPeriod,
  settings,
  formatAmount
}) => {
  const [isHolidayPayEnabled, setIsHolidayPayEnabled] = useState(false);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayPayAmount, setHolidayPayAmount] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState('');
  const [calculationDetails, setCalculationDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [payrollHistory, setPayrollHistory] = useState([]);

  // Security context for holiday pay calculations
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'HolidayPayCalculator',
    sensitiveComponent: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    securityLevel: 'high'
  });

  // Authentication context
  const {
    selectedBusinessId: authBusinessId,
    authUser,
    userRole,
    businessData
  } = usePOSAuth({
    requiredRoles: ['owner', 'manager', 'hr_admin'],
    requireBusiness: true,
    componentName: 'HolidayPayCalculator'
  });

  // Tax calculations for formatting
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId || authBusinessId);

  // Canadian statutory holidays by province/territory
  const CANADIAN_HOLIDAYS = {
    federal: [
      { name: 'New Year\'s Day', date: '2025-01-01' },
      { name: 'Good Friday', date: '2025-04-18' },
      { name: 'Easter Monday', date: '2025-04-21' },
      { name: 'Victoria Day', date: '2025-05-19' },
      { name: 'Canada Day', date: '2025-07-01' },
      { name: 'Labour Day', date: '2025-09-01' },
      { name: 'Thanksgiving Day', date: '2025-10-13' },
      { name: 'Remembrance Day', date: '2025-11-11' },
      { name: 'Christmas Day', date: '2025-12-25' },
      { name: 'Boxing Day', date: '2025-12-26' }
    ],
    ontario: [
      { name: 'New Year\'s Day', date: '2025-01-01' },
      { name: 'Family Day', date: '2025-02-17' },
      { name: 'Good Friday', date: '2025-04-18' },
      { name: 'Victoria Day', date: '2025-05-19' },
      { name: 'Canada Day', date: '2025-07-01' },
      { name: 'Civic Holiday', date: '2025-08-04' },
      { name: 'Labour Day', date: '2025-09-01' },
      { name: 'Thanksgiving Day', date: '2025-10-13' },
      { name: 'Christmas Day', date: '2025-12-25' },
      { name: 'Boxing Day', date: '2025-12-26' }
    ],
    bc: [
      { name: 'New Year\'s Day', date: '2025-01-01' },
      { name: 'Family Day', date: '2025-02-17' },
      { name: 'Good Friday', date: '2025-04-18' },
      { name: 'Victoria Day', date: '2025-05-19' },
      { name: 'Canada Day', date: '2025-07-01' },
      { name: 'BC Day', date: '2025-08-04' },
      { name: 'Labour Day', date: '2025-09-01' },
      { name: 'Thanksgiving Day', date: '2025-10-13' },
      { name: 'Remembrance Day', date: '2025-11-11' },
      { name: 'Christmas Day', date: '2025-12-25' }
    ]
  };

  // Get jurisdiction-specific holidays
  const getJurisdictionHolidays = useCallback(() => {
    const jurisdiction = settings?.tax_jurisdiction || 'ON';
    const jurisdictionKey = jurisdiction.toLowerCase();
    
    return CANADIAN_HOLIDAYS[jurisdictionKey] || CANADIAN_HOLIDAYS.ontario;
  }, [settings?.tax_jurisdiction]);

  // Load employee payroll history for holiday pay calculation
  const loadPayrollHistory = useCallback(async () => {
    if (!employee?.id || !selectedBusinessId) return;

    try {
      setLoading(true);

      // Calculate the 4-week period before the holiday for calculation
      const calculationEndDate = selectedHolidayDate ? 
        new Date(new Date(selectedHolidayDate).getTime() - 7 * 24 * 60 * 60 * 1000) : // Week before holiday
        new Date();
      
      const calculationStartDate = new Date(calculationEndDate.getTime() - 28 * 24 * 60 * 60 * 1000); // 4 weeks before

      // Get payroll entries for the calculation period
      const { data: entries, error } = await supabase
        .from('hrpayroll_entries')
        .select(`
          *,
          hrpayroll_runs!inner(pay_period_start, pay_period_end, pay_date, status)
        `)
        .eq('user_id', employee.id)
        .eq('hrpayroll_runs.status', 'finalized')
        .gte('hrpayroll_runs.pay_date', calculationStartDate.toISOString().split('T')[0])
        .lte('hrpayroll_runs.pay_date', calculationEndDate.toISOString().split('T')[0])
        .order('hrpayroll_runs.pay_date', { ascending: false });

      if (error) {
        console.error('Error loading payroll history:', error);
        return;
      }

      setPayrollHistory(entries || []);

    } catch (err) {
      console.error('Error in loadPayrollHistory:', err);
    } finally {
      setLoading(false);
    }
  }, [employee?.id, selectedBusinessId, selectedHolidayDate]);

  // Calculate holiday pay based on provincial/federal rules
  const calculateHolidayPay = useCallback(() => {
    if (!employee || !selectedHolidayDate || !isHolidayPayEnabled) {
      setHolidayPayAmount(0);
      setCalculationDetails({});
      return;
    }

    const jurisdiction = settings?.tax_jurisdiction || 'ON';
    const wage = parseFloat(employee.wage || 0);
    const employmentStartDate = employee.hire_date ? new Date(employee.hire_date) : null;
    const holidayDate = new Date(selectedHolidayDate);

    // Check basic eligibility (30 days employment minimum for most provinces)
    const daysEmployed = employmentStartDate ? 
      Math.floor((holidayDate - employmentStartDate) / (1000 * 60 * 60 * 24)) : 0;

    if (daysEmployed < 30) {
      setIsEligible(false);
      setEligibilityReason(`Employee must be employed for at least 30 days. Currently: ${daysEmployed} days.`);
      setHolidayPayAmount(0);
      return;
    }

    // Calculate based on jurisdiction
    let holidayPay = 0;
    let calculationMethod = '';
    let details = {};

    if (jurisdiction === 'ON') {
      // Ontario: 1/20th of wages from 4 weeks before the week containing the holiday
      if (payrollHistory.length > 0) {
        const totalWages = payrollHistory.reduce((sum, entry) => {
          return sum + (parseFloat(entry.gross_pay || 0) + parseFloat(entry.vacation_pay || 0));
        }, 0);
        
        holidayPay = totalWages / 20;
        calculationMethod = 'Ontario ESA: 1/20th of wages from 4-week period';
        details = {
          totalWages,
          payrollEntries: payrollHistory.length,
          calculation: `$${totalWages.toFixed(2)} ÷ 20 = $${holidayPay.toFixed(2)}`
        };
      } else {
        // Fallback: Average day's pay based on weekly wage
        holidayPay = (wage * 40) / 5; // Assume 40-hour week, 5 days
        calculationMethod = 'Ontario ESA: Estimated average day\'s pay (fallback)';
        details = {
          weeklyWage: wage * 40,
          dailyWage: holidayPay,
          calculation: `($${wage}/hour × 40 hours) ÷ 5 days = $${holidayPay.toFixed(2)}`
        };
      }
    } else if (jurisdiction === 'BC') {
      // BC: Average day's pay based on 30 calendar days before holiday
      if (payrollHistory.length > 0) {
        const totalWages = payrollHistory.reduce((sum, entry) => sum + parseFloat(entry.gross_pay || 0), 0);
        const totalDaysWorked = payrollHistory.reduce((sum, entry) => {
          const hoursWorked = parseFloat(entry.total_hours || 0);
          return sum + (hoursWorked > 0 ? 1 : 0); // Count days with any hours as worked days
        }, 0);
        
        holidayPay = totalDaysWorked > 0 ? totalWages / totalDaysWorked : wage * 8;
        calculationMethod = 'BC ESA: Average day\'s pay from 30-day period';
        details = {
          totalWages,
          totalDaysWorked,
          calculation: `$${totalWages.toFixed(2)} ÷ ${totalDaysWorked} days = $${holidayPay.toFixed(2)}`
        };
      } else {
        holidayPay = wage * 8; // 8-hour day assumption
        calculationMethod = 'BC ESA: Estimated 8-hour day (fallback)';
        details = {
          hourlyWage: wage,
          hoursPerDay: 8,
          calculation: `$${wage}/hour × 8 hours = $${holidayPay.toFixed(2)}`
        };
      }
    } else if (jurisdiction === 'AB') {
      // Alberta: Average day's wage from 28 days before holiday
      if (payrollHistory.length > 0) {
        const totalWages = payrollHistory.reduce((sum, entry) => sum + parseFloat(entry.gross_pay || 0), 0);
        const totalDaysWorked = payrollHistory.reduce((sum, entry) => {
          const hoursWorked = parseFloat(entry.total_hours || 0);
          return sum + (hoursWorked > 0 ? 1 : 0);
        }, 0);
        
        holidayPay = totalDaysWorked > 0 ? totalWages / totalDaysWorked : wage * 8;
        calculationMethod = 'Alberta ESC: Average day\'s wage from 28-day period';
        details = {
          totalWages,
          totalDaysWorked,
          calculation: `$${totalWages.toFixed(2)} ÷ ${totalDaysWorked} days = $${holidayPay.toFixed(2)}`
        };
      } else {
        holidayPay = wage * 8;
        calculationMethod = 'Alberta ESC: Estimated 8-hour day (fallback)';
        details = {
          hourlyWage: wage,
          calculation: `$${wage}/hour × 8 hours = $${holidayPay.toFixed(2)}`
        };
      }
    } else {
      // Federal or other: 1/20th method (Canada Labour Code)
      if (payrollHistory.length > 0) {
        const totalWages = payrollHistory.reduce((sum, entry) => {
          return sum + (parseFloat(entry.gross_pay || 0) + parseFloat(entry.vacation_pay || 0));
        }, 0);
        
        holidayPay = totalWages / 20;
        calculationMethod = 'Canada Labour Code: 1/20th of wages from 4-week period';
        details = {
          totalWages,
          payrollEntries: payrollHistory.length,
          calculation: `$${totalWages.toFixed(2)} ÷ 20 = $${holidayPay.toFixed(2)}`
        };
      } else {
        holidayPay = (wage * 40) / 5;
        calculationMethod = 'Federal: Estimated average day\'s pay (fallback)';
        details = {
          weeklyWage: wage * 40,
          calculation: `($${wage}/hour × 40 hours) ÷ 5 days = $${holidayPay.toFixed(2)}`
        };
      }
    }

    setIsEligible(true);
    setEligibilityReason(`Eligible: ${daysEmployed} days employed (minimum 30 required)`);
    setHolidayPayAmount(holidayPay);
    setCalculationDetails({
      method: calculationMethod,
      jurisdiction,
      holidayDate: selectedHolidayDate,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      daysEmployed,
      ...details
    });

    // Notify parent component of holiday pay change
    if (onHolidayPayChange) {
      onHolidayPayChange(holidayPay, {
        holidayDate: selectedHolidayDate,
        holidayName,
        isEligible: true,
        calculationDetails: {
          method: calculationMethod,
          jurisdiction,
          ...details
        }
      });
    }

  }, [employee, selectedHolidayDate, isHolidayPayEnabled, settings?.tax_jurisdiction, payrollHistory, onHolidayPayChange, holidayName]);

  // Handle checkbox change
  const handleHolidayPayToggle = async (checked) => {
    try {
      await recordAction('holiday_pay_toggle', employee?.id, checked);
      
      setIsHolidayPayEnabled(checked);
      
      if (checked) {
        setShowCalendar(true);
        await logSecurityEvent('holiday_pay_enabled', {
          employee_id: employee?.id,
          business_id: selectedBusinessId
        }, 'medium');
      } else {
        setSelectedHolidayDate('');
        setHolidayName('');
        setHolidayPayAmount(0);
        setShowCalendar(false);
        
        // Notify parent of removal
        if (onHolidayPayChange) {
          onHolidayPayChange(0, null);
        }
        
        await logSecurityEvent('holiday_pay_disabled', {
          employee_id: employee?.id,
          business_id: selectedBusinessId
        }, 'medium');
      }
    } catch (error) {
      console.error('Error toggling holiday pay:', error);
    }
  };

  // Handle holiday date selection
  const handleHolidayDateChange = async (date) => {
    try {
      const validation = await validateInput(date, 'date', 'date');
      if (!validation.valid) {
        console.error('Invalid date:', validation.error);
        return;
      }

      setSelectedHolidayDate(date);
      
      // Auto-detect holiday name from statutory holidays
      const holidays = getJurisdictionHolidays();
      const matchingHoliday = holidays.find(h => h.date === date);
      
      if (matchingHoliday) {
        setHolidayName(matchingHoliday.name);
      } else {
        setHolidayName('Custom Holiday');
      }

      await logSecurityEvent('holiday_date_selected', {
        employee_id: employee?.id,
        holiday_date: date,
        holiday_name: matchingHoliday?.name || 'Custom Holiday',
        business_id: selectedBusinessId
      }, 'low');
      
    } catch (error) {
      console.error('Error handling holiday date change:', error);
    }
  };

  // Load payroll history when holiday date changes
  useEffect(() => {
    if (selectedHolidayDate && employee?.id) {
      loadPayrollHistory();
    }
  }, [selectedHolidayDate, employee?.id, loadPayrollHistory]);

  // Recalculate when dependencies change
  useEffect(() => {
    if (isHolidayPayEnabled && selectedHolidayDate) {
      calculateHolidayPay();
    }
  }, [isHolidayPayEnabled, selectedHolidayDate, payrollHistory, calculateHolidayPay]);

  // Get suggested holidays for the jurisdiction
  const suggestedHolidays = useMemo(() => {
    const holidays = getJurisdictionHolidays();
    const currentDate = new Date();
    const payPeriodStart = payPeriod?.start ? new Date(payPeriod.start) : currentDate;
    const payPeriodEnd = payPeriod?.end ? new Date(payPeriod.end) : new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Filter holidays within or near the current pay period
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      // Include holidays in pay period or within 30 days
      return holidayDate >= new Date(payPeriodStart.getTime() - 30 * 24 * 60 * 60 * 1000) &&
             holidayDate <= new Date(payPeriodEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
    });
  }, [getJurisdictionHolidays, payPeriod]);

  const styles = {
    container: {
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      marginBottom: TavariStyles.spacing.md
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: TavariStyles.spacing.md
    },
    title: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    enableSection: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    holidayDetails: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.sm || '6px',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    dateSection: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.md
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
      backgroundColor: TavariStyles.colors.white
    },
    suggestedHolidays: {
      marginTop: TavariStyles.spacing.sm
    },
    suggestedTitle: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xs
    },
    holidayButton: {
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      margin: `0 ${TavariStyles.spacing.xs} ${TavariStyles.spacing.xs} 0`,
      border: `1px solid ${TavariStyles.colors.primary}`,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      backgroundColor: TavariStyles.colors.white,
      color: TavariStyles.colors.primary,
      fontSize: TavariStyles.typography.fontSize.xs,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    calculationPreview: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: isEligible ? TavariStyles.colors.successBg : TavariStyles.colors.errorBg,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      border: `1px solid ${isEligible ? TavariStyles.colors.success : TavariStyles.colors.danger}`
    },
    previewTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: isEligible ? TavariStyles.colors.success : TavariStyles.colors.danger,
      marginBottom: TavariStyles.spacing.xs
    },
    previewAmount: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: isEligible ? TavariStyles.colors.success : TavariStyles.colors.danger,
      marginBottom: TavariStyles.spacing.sm
    },
    calculationDetails: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      lineHeight: TavariStyles.typography.lineHeight.relaxed
    },
    loadingSpinner: {
      width: '20px',
      height: '20px',
      border: `2px solid ${TavariStyles.colors.gray200}`,
      borderTop: `2px solid ${TavariStyles.colors.primary}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginLeft: TavariStyles.spacing.sm
    }
  };

  if (!employee) {
    return null;
  }

  return (
    <SecurityWrapper
      componentName="HolidayPayCalculator"
      securityLevel="high"
      enableAuditLogging={true}
      sensitiveComponent={true}
    >
      <div style={styles.container}>
        {/* CSS for spinner animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        <div style={styles.header}>
          <h4 style={styles.title}>Holiday Pay Calculator</h4>
          <div style={styles.enableSection}>
            <TavariCheckbox
              checked={isHolidayPayEnabled}
              onChange={handleHolidayPayToggle}
              label="Add Holiday Pay"
              size="md"
              id={`holiday-pay-${employee.id}`}
            />
            {loading && <div style={styles.loadingSpinner}></div>}
          </div>
        </div>

        {isHolidayPayEnabled && (
          <div style={styles.holidayDetails}>
            <div style={styles.dateSection}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Holiday Date:</label>
                <input
                  type="date"
                  value={selectedHolidayDate}
                  onChange={(e) => handleHolidayDateChange(e.target.value)}
                  style={styles.input}
                  min="2024-01-01"
                  max="2026-12-31"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Holiday Name:</label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Enter holiday name"
                  style={styles.input}
                />
              </div>
            </div>

            {/* Suggested statutory holidays */}
            {suggestedHolidays.length > 0 && (
              <div style={styles.suggestedHolidays}>
                <div style={styles.suggestedTitle}>Suggested Statutory Holidays ({settings?.tax_jurisdiction || 'ON'}):</div>
                <div>
                  {suggestedHolidays.map((holiday, index) => (
                    <button
                      key={index}
                      style={{
                        ...styles.holidayButton,
                        backgroundColor: selectedHolidayDate === holiday.date ? TavariStyles.colors.primary : TavariStyles.colors.white,
                        color: selectedHolidayDate === holiday.date ? TavariStyles.colors.white : TavariStyles.colors.primary
                      }}
                      onClick={() => {
                        handleHolidayDateChange(holiday.date);
                        setHolidayName(holiday.name);
                      }}
                    >
                      {holiday.name} ({holiday.date})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Calculation preview */}
            {selectedHolidayDate && (
              <div style={styles.calculationPreview}>
                <div style={styles.previewTitle}>
                  Holiday Pay Calculation - {holidayName}
                </div>
                
                {isEligible ? (
                  <>
                    <div style={styles.previewAmount}>
                      ${formatAmount ? formatAmount(holidayPayAmount) : formatTaxAmount ? formatTaxAmount(holidayPayAmount) : holidayPayAmount.toFixed(2)}
                    </div>
                    <div style={styles.calculationDetails}>
                      <strong>Method:</strong> {calculationDetails.method}<br/>
                      <strong>Jurisdiction:</strong> {calculationDetails.jurisdiction}<br/>
                      <strong>Calculation:</strong> {calculationDetails.calculation}<br/>
                      <strong>Eligibility:</strong> {eligibilityReason}
                      {calculationDetails.payrollEntries && (
                        <>
                          <br/><strong>Based on:</strong> {calculationDetails.payrollEntries} payroll entries from last 4 weeks
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.previewAmount}>Not Eligible</div>
                    <div style={styles.calculationDetails}>
                      <strong>Reason:</strong> {eligibilityReason}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </SecurityWrapper>
  );
};

export default HolidayPayCalculator;