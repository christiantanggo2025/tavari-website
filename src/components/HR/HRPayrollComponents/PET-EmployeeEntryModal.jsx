// components/HR/HRPayrollComponents/PET-EmployeeEntryModal.jsx - FIXED VERSION
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';
import PETPremiumHoursSection from './PET-PremiumHoursSection';
import HolidayPayCalculator from './HolidayPayCalculator';
import { useCanadianTaxCalculations } from '../../../hooks/useCanadianTaxCalculations';
import { useOntarioHealthPremium } from '../../../hooks/useOntarioHealthPremium';
import { usePayrollCalculations } from '../../../hooks/usePayrollCalculations';

const PETEmployeeEntryModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  hours, 
  additionalFedTax, 
  statHolidayPay,
  premiums, 
  allPremiums, 
  onSave, 
  formatTaxAmount,
  isEmployeePremiumEnabled,
  getEmployeePremiumRate,
  getEmployeePremiumRateType,
  getEmployeePreview,
  selectedBusinessId,
  businessData,
  settings,
  payPeriod,
  onHolidayPayChange,
  employeeHolidayPay,
  employeeHolidayDetails
}) => {
  const [localHours, setLocalHours] = useState(hours || { 
    total_hours: 0, 
    overtime_hours: 0, 
    stat_worked_hours: 0,
    lieu_earned: 0,
    lieu_used: 0,
    lieu_balance: 0,
    premium_hours: {} 
  });
  const [localAdditionalFedTax, setLocalAdditionalFedTax] = useState(additionalFedTax || 0);
  const [holidayPayEnabled, setHolidayPayEnabled] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [missedShiftBefore, setMissedShiftBefore] = useState(false);
  const [missedShiftAfter, setMissedShiftAfter] = useState(false);
  const [localHolidayPay, setLocalHolidayPay] = useState(0);
  const [localHolidayDetails, setLocalHolidayDetails] = useState(null);

  const {
    validateInput,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'PETEmployeeEntryModal',
    sensitiveComponent: true,
    enableRateLimiting: false,
    enableAuditLogging: true,
    securityLevel: 'high'
  });

  const canadianTax = useCanadianTaxCalculations(selectedBusinessId);
  const ontarioHealthPremium = useOntarioHealthPremium(
    0,
    settings?.pay_frequency === 'weekly' ? 52 : 
    settings?.pay_frequency === 'bi-weekly' ? 26 : 
    settings?.pay_frequency === 'monthly' ? 12 : 52,
    settings?.tax_jurisdiction || 'ON'
  );
  const payrollCalc = usePayrollCalculations(selectedBusinessId);

  useEffect(() => {
    if (isOpen) {
      setLocalHours(hours || { 
        total_hours: 0, 
        overtime_hours: 0, 
        stat_worked_hours: 0,
        lieu_earned: 0,
        lieu_used: 0,
        lieu_balance: employee?.lieu_time_balance || 0,
        premium_hours: {} 
      });
      setLocalAdditionalFedTax(additionalFedTax || 0);
      
      if (employee?.id) {
        const existingHolidayPay = employeeHolidayPay?.[employee.id] || 0;
        const existingHolidayDetails = employeeHolidayDetails?.[employee.id];
        
        setHolidayPayEnabled(existingHolidayPay > 0);
        setLocalHolidayPay(existingHolidayPay);
        setLocalHolidayDetails(existingHolidayDetails);
        
        if (existingHolidayDetails) {
          setHolidayDate(existingHolidayDetails.holidayDate || '');
          setMissedShiftBefore(existingHolidayDetails.missedShiftBefore || false);
          setMissedShiftAfter(existingHolidayDetails.missedShiftAfter || false);
        }
      }
    }
  }, [isOpen, hours, additionalFedTax, employee, employeeHolidayPay, employeeHolidayDetails]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (employee && localHours.total_hours !== undefined) {
      calculateLieuTime();
    }
  }, [localHours.total_hours, employee]);

  const calculateLieuTime = () => {
    if (!employee?.lieu_time_enabled) return;

    const maxHours = parseFloat(employee.max_paid_hours_per_period || 0);
    const totalWorked = parseFloat(localHours.total_hours || 0);
    const statHolidayHours = parseFloat(localHours.stat_worked_hours || 0);
    const currentBalance = parseFloat(employee.lieu_time_balance || 0);

    if (maxHours <= 0) return;

    const totalCompensationHours = totalWorked + statHolidayHours;
    
    if (totalCompensationHours > maxHours) {
      const lieuEarned = totalCompensationHours - maxHours;
      setLocalHours(prev => ({
        ...prev,
        lieu_earned: lieuEarned,
        lieu_used: 0,
        lieu_balance: currentBalance + lieuEarned
      }));
    } else {
      const shortfall = maxHours - totalCompensationHours;
      const lieuToUse = Math.min(shortfall, currentBalance);
      
      setLocalHours(prev => ({
        ...prev,
        lieu_earned: 0,
        lieu_used: lieuToUse,
        lieu_balance: currentBalance - lieuToUse
      }));
    }
  };

  // FIXED: Single source of truth for preview calculation
  const calculatedPreview = useMemo(() => {
    if (!employee || !canadianTax || !payrollCalc || !settings) {
      return {
        gross_pay: 0,
        vacation_pay: 0,
        federal_tax: 0,
        provincial_tax: 0,
        ontario_health_premium: 0,
        ei_premium: 0,
        cpp_contribution: 0,
        total_deductions: 0,
        net_pay: 0,
        calculation_method: 'hooks_not_ready'
      };
    }

    try {
      const wage = parseFloat(employee.wage || 0);
      const totalWorkedHours = parseFloat(localHours.total_hours || 0);
      const overtimeHours = parseFloat(localHours.overtime_hours || 0);
      const statHolidayHours = parseFloat(localHours.stat_worked_hours || 0);
      const lieuUsed = parseFloat(localHours.lieu_used || 0);
      
      const maxHours = parseFloat(employee.max_paid_hours_per_period || 0);
      const totalCompensationHours = totalWorkedHours + statHolidayHours;
      
      let regularHoursPaid = 0;
      if (employee?.lieu_time_enabled && maxHours > 0) {
        if (totalCompensationHours > maxHours) {
          regularHoursPaid = Math.max(0, maxHours - statHolidayHours);
        } else {
          regularHoursPaid = totalWorkedHours + lieuUsed;
        }
      } else {
        regularHoursPaid = totalWorkedHours - overtimeHours;
      }
      
      const regularPay = regularHoursPaid * wage;
      const overtimePay = overtimeHours * wage * (settings.overtime_multiplier || 1.5);
      const statHolidayPay = statHolidayHours * wage;
      
      let premiumPay = 0;
      if (localHours.premium_hours && allPremiums) {
        Object.entries(localHours.premium_hours).forEach(([premiumName, hours]) => {
          const premium = allPremiums.find(p => p.name === premiumName);
          const premiumHours = parseFloat(hours || 0);
          if (premium && premiumHours > 0 && isEmployeePremiumEnabled?.(employee.id, premiumName)) {
            const rate = getEmployeePremiumRate ? getEmployeePremiumRate(employee.id, premiumName) : premium.multiplier;
            const rateType = getEmployeePremiumRateType ? getEmployeePremiumRateType(employee.id, premiumName) : 'multiplier';
            
            if (rateType === 'multiplier') {
              premiumPay += premiumHours * wage * parseFloat(rate || 1);
            } else {
              premiumPay += premiumHours * parseFloat(rate || 0);
            }
          }
        });
      }

      const finalHolidayPayAmount = (holidayPayEnabled && !missedShiftBefore && !missedShiftAfter) ? localHolidayPay : 0;
      
      const grossPay = regularPay + overtimePay + statHolidayPay + premiumPay;
	  
      let vacationRate = 0.04;
      if (employee.vacation_percent !== null && employee.vacation_percent !== undefined) {
        const employeeRate = parseFloat(employee.vacation_percent);
        if (!isNaN(employeeRate) && employeeRate > 0) {
          vacationRate = employeeRate;
        }
      } else if (settings?.default_vacation_percent) {
        const settingsRate = parseFloat(settings.default_vacation_percent);
        if (!isNaN(settingsRate) && settingsRate > 0) {
          vacationRate = settingsRate;
        }
      }

      if (employee.hire_date) {
        const hireDate = new Date(employee.hire_date);
        const yearsOfService = (new Date() - hireDate) / (365.25 * 24 * 60 * 60 * 1000);
        const esaMinimum = yearsOfService >= 5 ? 0.06 : 0.04;
        vacationRate = Math.max(vacationRate, esaMinimum);
      }

      const vacationPay = grossPay * vacationRate;
      const grossPayWithVacation = grossPay + vacationPay + finalHolidayPayAmount;

      const payFrequency = settings.pay_frequency || 'weekly';
      const payPeriods = payFrequency === 'weekly' ? 52 : 
                        payFrequency === 'bi-weekly' ? 26 : 
                        payFrequency === 'monthly' ? 12 : 52;
      
      const jurisdiction = settings.tax_jurisdiction || 'ON';
      const claimCode = parseInt(employee.claim_code || settings.default_claim_code || 1);

      const craCalculation = canadianTax.calculateCRACompliantTaxes({
        grossPay: grossPayWithVacation,
        payPeriods,
        claimCode,
        jurisdiction,
        deductions: 0,
        yearToDateTotals: {
          yearToDateGross: 0,
          yearToDateFederalTax: 0,
          yearToDateProvincialTax: 0,
          yearToDateCPP: 0,
          yearToDateEI: 0
        },
        otherFederalCredits: 0,
        otherProvincialCredits: 0
      });

      let ontarioHealthPremiumAmount = 0;
      if (jurisdiction === 'ON') {
        const ohpResult = ontarioHealthPremium.calculateHealthPremium(grossPayWithVacation, payPeriods, jurisdiction);
        ontarioHealthPremiumAmount = ohpResult?.perPeriodPremium || 0;
      }

      const federalTax = craCalculation.federal_tax_period || 0;
      const totalFederalTax = federalTax + localAdditionalFedTax;
      const provincialTax = craCalculation.provincial_tax_period || 0;
      const combinedProvincialTax = provincialTax + ontarioHealthPremiumAmount;
      const eiPremium = craCalculation.ei_premium || 0;
      const cppContribution = craCalculation.cpp_contribution || 0;

      const totalDeductions = totalFederalTax + combinedProvincialTax + eiPremium + cppContribution;
      const netPay = Math.max(0, grossPayWithVacation - totalDeductions);

      return {
        gross_pay: grossPay,
        regular_pay: regularPay,
        overtime_pay: overtimePay,
        stat_holiday_pay: statHolidayPay,
        premium_pay: premiumPay,
        holiday_pay: finalHolidayPayAmount,
        vacation_pay: vacationPay,
        gross_pay_with_vacation: grossPayWithVacation,
        total_hours: totalWorkedHours + statHolidayHours,
        regular_hours: regularHoursPaid,
        overtime_hours: overtimeHours,
        stat_holiday_hours: statHolidayHours,
        lieu_earned: localHours.lieu_earned || 0,
        lieu_used: lieuUsed,
        lieu_balance: localHours.lieu_balance || 0,
        federal_tax: federalTax,
        additional_federal_tax: localAdditionalFedTax,
        total_federal_tax: totalFederalTax,
        provincial_tax_base: provincialTax,
        ontario_health_premium: ontarioHealthPremiumAmount,
        provincial_tax_total: combinedProvincialTax,
        ei_premium: eiPremium,
        cpp_contribution: cppContribution,
        total_deductions: totalDeductions,
        net_pay: netPay,
        calculation_method: 'cra_compliant_with_ohp',
        pay_periods: payPeriods,
        claim_code: claimCode,
        jurisdiction,
        hourly_rate: wage,
        cra_compliance: craCalculation.cra_compliance || { is_cra_compliant: true },
        rates_used: craCalculation.rates_used || {}
      };

    } catch (error) {
      console.error('Error calculating tax preview:', error);
      return {
        gross_pay: 0,
        vacation_pay: 0,
        federal_tax: 0,
        provincial_tax_total: 0,
        ontario_health_premium: 0,
        ei_premium: 0,
        cpp_contribution: 0,
        total_deductions: 0,
        net_pay: 0,
        calculation_method: 'error',
        error: error.message
      };
    }
  }, [
    employee, 
    localHours, 
    localAdditionalFedTax, 
    localHolidayPay, 
    holidayPayEnabled, 
    missedShiftBefore, 
    missedShiftAfter,
    allPremiums,
    isEmployeePremiumEnabled,
    getEmployeePremiumRate,
    getEmployeePremiumRateType,
    settings,
    canadianTax,
    ontarioHealthPremium
  ]);

  const handleSave = async () => {
    try {
      await recordAction('employee_modal_save', employee?.id);
      
      console.log('=== MODAL SAVE DEBUG ===');
      console.log('calculatedPreview:', calculatedPreview);
      console.log('vacation_pay:', calculatedPreview.vacation_pay);
      console.log('gross_pay:', calculatedPreview.gross_pay);
      console.log('net_pay:', calculatedPreview.net_pay);
      
      if (onHolidayPayChange && employee?.id) {
        const holidayDetails = holidayPayEnabled ? {
          holidayDate,
          holidayName: localHolidayDetails?.holidayName || 'Holiday',
          missedShiftBefore,
          missedShiftAfter,
          calculationMethod: localHolidayDetails?.calculationMethod || 'Manual',
          jurisdiction: settings?.tax_jurisdiction || 'ON',
          isEligible: !missedShiftBefore && !missedShiftAfter
        } : null;
        
        const finalHolidayPay = (holidayPayEnabled && !missedShiftBefore && !missedShiftAfter) ? localHolidayPay : 0;
        
        await onHolidayPayChange(employee.id, finalHolidayPay, holidayDetails);
      }
      
      onSave(employee.id, localHours, localAdditionalFedTax, 0, calculatedPreview);
      onClose();
      
    } catch (error) {
      console.error('Error saving employee modal data:', error);
    }
  };

  const updateHours = (field, value, premiumName = null) => {
    const sanitized = parseFloat(value) || 0;
    if (premiumName) {
      setLocalHours(prev => ({
        ...prev,
        premium_hours: {
          ...prev.premium_hours,
          [premiumName]: sanitized
        }
      }));
    } else {
      setLocalHours(prev => ({
        ...prev,
        [field]: sanitized
      }));
    }
  };

  const handleHolidayPayToggle = (checked) => {
    setHolidayPayEnabled(checked);
    if (!checked) {
      setHolidayDate('');
      setMissedShiftBefore(false);
      setMissedShiftAfter(false);
      setLocalHolidayPay(0);
      setLocalHolidayDetails(null);
    }
  };

  const handleHolidayPayCalculation = (holidayPayAmount, holidayDetails) => {
    setLocalHolidayPay(holidayPayAmount || 0);
    setLocalHolidayDetails(holidayDetails);
  };
  
  const handlePremiumHoursChange = useCallback((updatedPremiumHours) => {
    setLocalHours(prev => ({
      ...prev,
      premium_hours: updatedPremiumHours
    }));
  }, []);

  const isHolidayPayEligible = useMemo(() => {
    return holidayPayEnabled && holidayDate && !missedShiftBefore && !missedShiftAfter;
  }, [holidayPayEnabled, holidayDate, missedShiftBefore, missedShiftAfter]);

  if (!isOpen || !employee) return null;

  return (
    <SecurityWrapper>
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h3 style={styles.title}>
              Payroll Entry: {employee.first_name} {employee.last_name}
            </h3>
            <button onClick={handleClose} style={styles.closeButton}>×</button>
          </div>

          <div style={styles.body}>
            
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Basic Hours</h4>
              <div style={styles.gridThreeCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Total Hours Worked</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="168"
                    style={styles.input}
                    value={localHours.total_hours || ''}
                    onChange={(e) => updateHours('total_hours', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.target.select()}
                    placeholder="0.00"
                  />
                  <div style={styles.infoText}>
                    Total hours actually worked this pay period
                  </div>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Overtime Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="80"
                    style={styles.input}
                    value={localHours.overtime_hours || ''}
                    onChange={(e) => updateHours('overtime_hours', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.target.select()}
                    placeholder="0.00"
                  />
                  <div style={styles.infoText}>
                    Hours worked over regular time (1.5x pay)
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Stat Holiday Hours Worked</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    style={styles.input}
                    value={localHours.stat_worked_hours || ''}
                    onChange={(e) => updateHours('stat_worked_hours', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.target.select()}
                    placeholder="0.00"
                  />
                  <div style={styles.infoText}>
                    Hours worked on a statutory holiday (separate from holiday pay)
                  </div>
                </div>
              </div>
            </div>

            <div style={employee?.lieu_time_enabled ? styles.section : styles.sectionDisabled}>
              <h4 style={employee?.lieu_time_enabled ? styles.sectionTitle : styles.sectionTitleDisabled}>
                Lieu Hours
              </h4>
              <div style={styles.gridThreeCol}>
                <div style={styles.formGroup}>
                  <label style={employee?.lieu_time_enabled ? styles.label : styles.labelDisabled}>
                    Lieu Hours Earned
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(employee?.lieu_time_enabled ? {} : styles.inputDisabled)
                    }}
                    value={employee?.lieu_time_enabled ? (localHours.lieu_earned || '') : ''}
                    disabled={!employee?.lieu_time_enabled}
                    placeholder="0.00"
                    readOnly
                  />
                  <div style={styles.infoText}>
                    Hours earned as lieu time (auto-calculated)
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={employee?.lieu_time_enabled ? styles.label : styles.labelDisabled}>
                    Lieu Hours Used
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    style={{
                      ...styles.input,
                      ...(employee?.lieu_time_enabled ? {} : styles.inputDisabled)
                    }}
                    value={employee?.lieu_time_enabled ? (localHours.lieu_used || '') : ''}
                    onChange={(e) => employee?.lieu_time_enabled && updateHours('lieu_used', e.target.value)}
                    disabled={!employee?.lieu_time_enabled}
                    placeholder="0.00"
                  />
                  <div style={styles.infoText}>
                    Hours taken from lieu time bank
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={employee?.lieu_time_enabled ? styles.label : styles.labelDisabled}>
                    Lieu Balance After
                  </label>
                  <input
                    type="number"
                    style={{
                      ...styles.input,
                      ...(employee?.lieu_time_enabled ? {} : styles.inputDisabled),
                      backgroundColor: '#f9fafb'
                    }}
                    value={employee?.lieu_time_enabled ? (localHours.lieu_balance || 0).toFixed(2) : '0.00'}
                    disabled
                    readOnly
                  />
                  <div style={styles.infoText}>
                    New lieu time balance (auto-calculated)
                  </div>
                </div>
              </div>
            </div>

            <PETPremiumHoursSection
              allPremiums={allPremiums}
              localHours={localHours}
              onPremiumHoursChange={handlePremiumHoursChange}
              saving={false}
              employee={employee}
              isEmployeePremiumEnabled={isEmployeePremiumEnabled}
            />

            <div style={styles.section}>
              <div style={styles.checkboxRow}>
                <TavariCheckbox
                  id={`holiday-pay-${employee.id}`}
                  checked={holidayPayEnabled}
                  onChange={handleHolidayPayToggle}
                  label="Include Holiday Pay for this Period"
                  color={TavariStyles.colors.primary}
                />
              </div>

              {holidayPayEnabled && (
                <div style={styles.holidayPaySection}>
                  <div style={styles.gridTwoCol}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Holiday Date</label>
                      <input
                        type="date"
                        style={styles.input}
                        value={holidayDate}
                        onChange={(e) => setHolidayDate(e.target.value)}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Manual Holiday Pay Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={styles.input}
                        value={localHolidayPay || ''}
                        onChange={(e) => setLocalHolidayPay(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.target.select()}
                      />
                      <div style={styles.infoText}>
                        Override holiday pay calculation with manual amount
                      </div>
                    </div>
                  </div>

                  <div style={styles.complianceSection}>
                    <h5 style={styles.complianceTitle}>ESA Holiday Pay Eligibility</h5>
                    <div style={styles.checkboxGrid}>
                      <TavariCheckbox
                        id={`missed-before-${employee.id}`}
                        checked={missedShiftBefore}
                        onChange={setMissedShiftBefore}
                        label="Missed scheduled shift before holiday"
                        color={TavariStyles.colors.warning}
                      />
                      <TavariCheckbox
                        id={`missed-after-${employee.id}`}
                        checked={missedShiftAfter}
                        onChange={setMissedShiftAfter}
                        label="Missed scheduled shift after holiday"
                        color={TavariStyles.colors.warning}
                      />
                    </div>
                    
                    {(missedShiftBefore || missedShiftAfter) && (
                      <div style={styles.warningBox}>
                        <strong>Warning:</strong> Employee is not entitled to holiday pay due to missed shifts.
                      </div>
                    )}
                    
                    {isHolidayPayEligible && (
                      <div style={styles.successBox}>
                        <strong>Success:</strong> Employee qualifies for holiday pay of ${localHolidayPay.toFixed(2)}.
                      </div>
                    )}
                  </div>

                  <HolidayPayCalculator
                    employee={employee}
                    settings={settings}
                    holidayDate={holidayDate}
                    payPeriod={payPeriod}
                    onCalculationComplete={handleHolidayPayCalculation}
                  />
                </div>
              )}
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Tax Adjustments</h4>
              <div style={styles.formGroup}>
                <label style={styles.label}>Additional Federal Tax</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={styles.input}
                  value={localAdditionalFedTax || ''}
                  onChange={(e) => setLocalAdditionalFedTax(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.target.select()}
                />
                <div style={styles.infoText}>
                  Extra federal tax to withhold (beyond normal calculation)
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>CRA-Compliant Pay Preview</h4>
              <div style={styles.previewBox}>
                {calculatedPreview.calculation_method === 'error' ? (
                  <div style={styles.previewError}>
                    <strong>Calculation Error:</strong> {calculatedPreview.error}
                  </div>
                ) : calculatedPreview.calculation_method === 'hooks_not_ready' ? (
                  <div style={styles.previewLoading}>
                    Loading tax calculation hooks...
                  </div>
                ) : (
                  <div style={styles.previewGrid}>
                    <div style={styles.previewSection}>
                      <h5 style={styles.previewSectionTitle}>Earnings</h5>
                      <div style={styles.previewItem}>
                        <span>Regular Hours ({calculatedPreview.regular_hours?.toFixed(2)} hrs):</span>
                        <span>${calculatedPreview.regular_pay?.toFixed(2)}</span>
                      </div>
                      {calculatedPreview.overtime_hours > 0 && (
                        <div style={styles.previewItem}>
                          <span>Overtime Hours ({calculatedPreview.overtime_hours?.toFixed(2)} hrs @ 1.5x):</span>
                          <span>${calculatedPreview.overtime_pay?.toFixed(2)}</span>
                        </div>
                      )}
                      {calculatedPreview.stat_holiday_hours > 0 && (
                        <div style={styles.previewItem}>
                          <span>Stat Holiday Hours ({calculatedPreview.stat_holiday_hours?.toFixed(2)} hrs):</span>
                          <span>${calculatedPreview.stat_holiday_pay?.toFixed(2)}</span>
                        </div>
                      )}
                      {calculatedPreview.premium_pay > 0 && (
                        <div style={styles.previewItem}>
                          <span>Premium Pay:</span>
                          <span>${calculatedPreview.premium_pay?.toFixed(2)}</span>
                        </div>
                      )}
                      {calculatedPreview.holiday_pay > 0 && (
                        <div style={styles.previewItem}>
                          <span>Holiday Pay:</span>
                          <span>${calculatedPreview.holiday_pay?.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={styles.previewItem}>
                        <span>Vacation Pay (4%):</span>
                        <span>${calculatedPreview.vacation_pay?.toFixed(2)}</span>
                      </div>
                      <div style={{...styles.previewItem, ...styles.previewTotal}}>
                        <span><strong>Gross Pay:</strong></span>
                        <span><strong>${calculatedPreview.gross_pay_with_vacation?.toFixed(2)}</strong></span>
                      </div>
                    </div>
                    
                    <div style={styles.previewSection}>
                      <h5 style={styles.previewSectionTitle}>CRA-Compliant Deductions</h5>
                      <div style={styles.previewItem}>
                        <span>Federal Tax (Claim {calculatedPreview.claim_code}):</span>
                        <span>${calculatedPreview.federal_tax?.toFixed(2)}</span>
                      </div>
                      <div style={styles.previewItem}>
                        <span>Provincial Tax ({calculatedPreview.jurisdiction}):</span>
                        <span>${calculatedPreview.provincial_tax_base?.toFixed(2)}</span>
                      </div>
                      {calculatedPreview.ontario_health_premium > 0 && (
                        <div style={styles.previewItem}>
                          <span>Ontario Health Premium:</span>
                          <span>${calculatedPreview.ontario_health_premium?.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={styles.previewItem}>
                        <span>EI Premium (1.64%):</span>
                        <span>${calculatedPreview.ei_premium?.toFixed(2)}</span>
                      </div>
                      <div style={styles.previewItem}>
                        <span>CPP Contribution (5.95%):</span>
                        <span>${calculatedPreview.cpp_contribution?.toFixed(2)}</span>
                      </div>
                      {calculatedPreview.additional_federal_tax > 0 && (
                        <div style={styles.previewItem}>
                          <span>Additional Fed Tax:</span>
                          <span>${calculatedPreview.additional_federal_tax?.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{...styles.previewItem, ...styles.previewTotal}}>
                        <span><strong>Total Deductions:</strong></span>
                        <span><strong>${calculatedPreview.total_deductions?.toFixed(2)}</strong></span>
                      </div>
                    </div>
                    
                    <div style={styles.previewSection}>
                      <h5 style={styles.previewSectionTitle}>Summary</h5>
                      <div style={styles.previewItem}>
                        <span>Total Hours Worked:</span>
                        <span>{calculatedPreview.total_hours?.toFixed(2)} hrs</span>
                      </div>
                      <div style={styles.previewItem}>
                        <span>Hours Being Paid:</span>
                        <span>{((calculatedPreview.regular_hours || 0) + (calculatedPreview.overtime_hours || 0) + (calculatedPreview.lieu_used || 0)).toFixed(2)} hrs</span>
                      </div>
                      <div style={styles.previewItem}>
                        <span>Hourly Rate:</span>
                        <span>${calculatedPreview.hourly_rate?.toFixed(2)}/hr</span>
                      </div>
                      {calculatedPreview.lieu_earned > 0 && (
                        <div style={{...styles.previewItem, color: '#059669'}}>
                          <span><strong>Lieu Hours Earned:</strong></span>
                          <span><strong>+{calculatedPreview.lieu_earned?.toFixed(2)} hrs</strong></span>
                        </div>
                      )}
                      {calculatedPreview.lieu_used > 0 && (
                        <div style={{...styles.previewItem, color: '#dc2626'}}>
                          <span><strong>Lieu Hours Used:</strong></span>
                          <span><strong>-{calculatedPreview.lieu_used?.toFixed(2)} hrs</strong></span>
                        </div>
                      )}
                      {employee?.lieu_time_enabled && (
                        <div style={styles.previewItem}>
                          <span>New Lieu Balance:</span>
                          <span>{calculatedPreview.lieu_balance?.toFixed(2)} hrs</span>
                        </div>
                      )}
                      <div style={{...styles.previewItem, ...styles.previewFinal}}>
                        <span><strong>Net Pay:</strong></span>
                        <span><strong>${calculatedPreview.net_pay?.toFixed(2)}</strong></span>
                      </div>
                    </div>
                    
                    <div style={styles.previewNote}>
                      <div style={{marginBottom: '8px'}}>
                        <strong>CRA T4127 Compliant Calculation</strong>
                      </div>
                      <small>
                        <em>Tax calculations use official CRA T4127 formulas (121st Edition, July 1, 2025) with proper claim codes, 
                        annual maximums, and {calculatedPreview.jurisdiction} provincial rates. 
                        {calculatedPreview.ontario_health_premium > 0 && ' Includes Ontario Health Premium calculation.'}
                        </em>
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button onClick={handleClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button onClick={handleSave} style={styles.saveButton}>
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </SecurityWrapper>
  );
};

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
    width: '90%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
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
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 140px)'
  },
  section: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px'
  },
  sectionDisabled: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    opacity: 0.6
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    margin: 0,
    paddingBottom: '8px',
    borderBottom: '2px solid #008080'
  },
  sectionTitleDisabled: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: '16px',
    margin: 0,
    paddingBottom: '8px',
    borderBottom: '2px solid #e5e7eb'
  },
  gridTwoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  gridThreeCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  labelDisabled: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: '8px'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s'
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed'
  },
  infoText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
    fontStyle: 'italic'
  },
  checkboxRow: {
    marginBottom: '16px'
  },
  holidayPaySection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #0ea5e9',
    borderRadius: '6px'
  },
  complianceSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#fefce8',
    border: '1px solid #facc15',
    borderRadius: '6px'
  },
  complianceTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    margin: 0
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px'
  },
  warningBox: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '14px'
  },
  successBox: {
    padding: '12px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #93c5fd',
    borderRadius: '6px',
    color: '#1d4ed8',
    fontSize: '14px'
  },
  previewBox: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px'
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '24px'
  },
  previewSection: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px'
  },
  previewSectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    margin: 0,
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb'
  },
  previewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: '13px',
    color: '#4b5563'
  },
  previewTotal: {
    borderTop: '1px solid #e5e7eb',
    marginTop: '8px',
    paddingTop: '8px',
    color: '#1f2937'
  },
  previewFinal: {
    borderTop: '2px solid #008080',
    marginTop: '12px',
    paddingTop: '12px',
    color: '#008080',
    fontSize: '14px'
  },
  previewError: {
    padding: '20px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '14px',
    textAlign: 'center'
  },
  previewLoading: {
    padding: '20px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    color: '#1e40af',
    fontSize: '14px',
    textAlign: 'center'
  },
  previewNote: {
    gridColumn: '1 / -1',
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    borderRadius: '6px',
    textAlign: 'center',
    color: '#1e40af'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    color: '#374151',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#008080',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

export default PETEmployeeEntryModal;