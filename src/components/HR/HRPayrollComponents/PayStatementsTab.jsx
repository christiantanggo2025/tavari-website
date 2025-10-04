// components/HR/HRPayrollComponents/PayStatementsTab.jsx - FIXED IMPORTS
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import { useYTDCalculations } from '../../../hooks/useYTDCalculations';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

// FIXED: Import YTD Components from the correct index file
import { YTDSummaryCard, YTDDetailModal } from '../YTDComponents';

const PayStatementsTab = ({ selectedBusinessId, businessData }) => {
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [payrollEntries, setPayrollEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [validationErrors, setValidationErrors] = useState({});

  // YTD Modal state
  const [showYTDModal, setShowYTDModal] = useState(false);
  const [selectedYTDEmployee, setSelectedYTDEmployee] = useState(null);

  // Security context for sensitive payroll data
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'PayStatementsTab',
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
    componentName: 'PayStatementsTab'
  });

  // Tax calculations for formatting
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId || authBusinessId);

  // YTD calculations hook for fast lookups
  const ytd = useYTDCalculations(selectedBusinessId || authBusinessId);

  // Use the authenticated business ID if not provided as prop
  const effectiveBusinessId = selectedBusinessId || authBusinessId;
  const effectiveBusinessData = businessData || authBusinessData;

  useEffect(() => {
    if (effectiveBusinessId) {
      loadPayrollRuns();
    }
  }, [effectiveBusinessId]);

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
      setSelectedEmployees(new Set());
    } catch (error) {
      console.error('Error loading payroll entries:', error);
      await logSecurityEvent('payroll_entries_load_error', {
        business_id: effectiveBusinessId,
        payroll_run_id: runId,
        error: error.message
      }, 'high');
    }
  };

  // FAST YTD calculation using stored YTD data instead of querying all historical entries
  const calculateYTDTotals = async (userId, payDate) => {
    try {
      console.log(`🚀 Using FAST YTD calculation for employee ${userId} up to ${payDate}`);
      
      // Use the fast YTD calculation instead of querying all historical data
      const ytdData = await ytd.calculateEmployeeYTD(userId, payDate);
      
      if (!ytdData) {
        console.warn(`⚠️ No YTD data found for employee ${userId}, returning empty totals`);
        return getEmptyYTDTotals();
      }

      console.log(`✅ Fast YTD calculation successful for employee ${userId}`);
      
      // Convert YTD data structure to match existing pay statement format
      return {
        regular_hours: ytdData.regular_hours || 0,
        overtime_hours: ytdData.overtime_hours || 0,
        lieu_hours: ytdData.lieu_hours || 0,
        stat_hours: ytdData.stat_hours || 0,
        holiday_hours: ytdData.holiday_hours || 0,
        regular_earnings: ytdData.regular_income || 0,
        overtime_earnings: ytdData.overtime_income || 0,
        lieu_earnings: ytdData.lieu_income || 0,
        stat_earnings: ytdData.stat_earnings || 0,
        holiday_earnings: ytdData.holiday_earnings || 0,
        shift_premiums: ytdData.shift_premiums || 0,
        vacation_pay: ytdData.vacation_pay || 0,
        bonus: ytdData.bonus || 0,
        gross_pay: ytdData.gross_pay || 0,
        federal_tax: ytdData.federal_tax || 0,
        provincial_tax: ytdData.provincial_tax || 0,
        ei_deduction: ytdData.ei_deduction || 0,
        cpp_deduction: ytdData.cpp_deduction || 0,
        additional_tax: ytdData.additional_tax || 0,
        net_pay: ytdData.net_pay || 0,
        
        // Add metadata for debugging/verification
        _ytd_source: 'fast_ytd_lookup',
        _ytd_last_updated: ytdData.last_updated,
        _ytd_calculation_date: ytdData.calculation_date,
        _ytd_entries_included: ytdData.entries_included
      };

    } catch (error) {
      console.error('❌ Error in fast YTD calculation:', error);
      
      // Fallback to empty totals if YTD calculation fails
      await logSecurityEvent('ytd_calculation_fallback', {
        business_id: effectiveBusinessId,
        user_id: userId,
        error: error.message,
        fallback_reason: 'ytd_calculation_failed'
      }, 'medium');
      
      return getEmptyYTDTotals();
    }
  };

  // Helper function to return empty YTD totals structure
  const getEmptyYTDTotals = () => ({
    regular_hours: 0, overtime_hours: 0, lieu_hours: 0, stat_hours: 0, holiday_hours: 0,
    regular_earnings: 0, overtime_earnings: 0, lieu_earnings: 0, stat_earnings: 0,
    holiday_earnings: 0, shift_premiums: 0, vacation_pay: 0, bonus: 0, gross_pay: 0,
    federal_tax: 0, provincial_tax: 0, ei_deduction: 0, cpp_deduction: 0,
    additional_tax: 0, net_pay: 0,
    _ytd_source: 'empty_fallback'
  });

  // Handler for viewing YTD details
  const handleViewYTDDetails = (employee, ytdData) => {
    setSelectedYTDEmployee({ employee, ytdData });
    setShowYTDModal(true);
  };

  // Render YTD summary component for employee (optional enhancement)
  const renderYTDSummary = (entry) => {
    const employee = { 
      id: entry.user_id, 
      first_name: entry.users.first_name, 
      last_name: entry.users.last_name 
    };
    
    const ytdData = ytd.ytdData[entry.user_id];
    
    if (!ytdData) {
      return null; // Don't show YTD summary if no data available
    }
    
    return (
      <YTDSummaryCard
        employee={employee}
        ytdData={ytdData}
        showDetailed={false}
        onViewDetails={handleViewYTDDetails}
        formatAmount={formatTaxAmount}
      />
    );
  };

  // EXACT WORKING PDF GENERATION METHOD - Enhanced with YTD performance logging
  const generatePayStatementPDF = async (entry, isBulkGeneration = false) => {
    if (!entry || !selectedRun) return;

    const rateLimitCheck = await checkRateLimit('generate_pay_statement', entry.user_id);
    if (!rateLimitCheck.allowed) {
      alert('Rate limit exceeded. Please wait before generating more statements.');
      return;
    }

    if (!isBulkGeneration) setGenerating(true);
    
    try {
      await recordAction('generate_pay_statement', entry.user_id, true);
      await logSecurityEvent('pay_statement_generated', {
        business_id: effectiveBusinessId,
        employee_id: entry.user_id,
        payroll_run_id: selectedRun.id,
        bulk_generation: isBulkGeneration,
        ytd_system_enabled: true
      }, 'medium');

      // Performance timing for YTD calculation
      const ytdStartTime = Date.now();
      const ytdTotals = await calculateYTDTotals(entry.user_id, selectedRun.pay_date);
      const ytdCalculationTime = Date.now() - ytdStartTime;
      
      console.log(`⚡ YTD calculation completed in ${ytdCalculationTime}ms for ${entry.users.first_name} ${entry.users.last_name}`);

      // Parse premiums from JSONB - CRITICAL FIX
      let premiums = {};
      let currentPremiumPay = 0;
      try {
        premiums = typeof entry.premiums === 'string' ? 
          JSON.parse(entry.premiums) : (entry.premiums || {});
        
        // Calculate total premium pay for this period
        Object.values(premiums).forEach(premium => {
          if (premium.total_pay) {
            currentPremiumPay += parseFloat(premium.total_pay);
          }
        });
      } catch (e) {
        console.warn('Error parsing premiums:', e);
        premiums = {};
      }

      // Calculate current period totals INCLUDING PREMIUMS
      const wage = parseFloat(entry.users.wage || 0);
      const regularEarnings = parseFloat(entry.regular_hours || 0) * wage;
      const overtimeEarnings = parseFloat(entry.overtime_hours || 0) * wage * 1.5;
      const lieuEarnings = parseFloat(entry.lieu_hours || 0) * wage;
      
      // For now, these are $0 until we add database columns
      const statEarnings = 0;
      const holidayEarnings = 0;
      const bonus = 0;

      const totalCurrentHours = parseFloat(entry.regular_hours || 0) + parseFloat(entry.overtime_hours || 0) + parseFloat(entry.lieu_hours || 0);
      const totalYTDHours = ytdTotals.regular_hours + ytdTotals.overtime_hours + ytdTotals.lieu_hours;
      
      const currentGrossPay = parseFloat(entry.gross_pay || 0) + parseFloat(entry.vacation_pay || 0);
      const ytdGrossPay = ytdTotals.gross_pay + ytdTotals.vacation_pay;

      const totalCurrentDeductions = 
        parseFloat(entry.federal_tax || 0) +
        parseFloat(entry.provincial_tax || 0) +
        parseFloat(entry.ei_deduction || 0) +
        parseFloat(entry.cpp_deduction || 0) +
        parseFloat(entry.additional_tax || 0);

      const totalYTDDeductions = 
        ytdTotals.federal_tax +
        ytdTotals.provincial_tax +
        ytdTotals.ei_deduction +
        ytdTotals.cpp_deduction +
        ytdTotals.additional_tax;

      // Create professional pay statement HTML with PREMIUM DETAILS and YTD performance info
      const payStatementHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pay Statement - ${entry.users.first_name} ${entry.users.last_name}</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 12px;
              line-height: 1.2;
              color: #333;
              background-color: #fff;
              font-size: 10px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid ${TavariStyles.colors.primary};
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
              color: ${TavariStyles.colors.primary};
              margin-bottom: 4px;
            }
            .statement-title {
              font-size: 12px;
              margin: 6px 0;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .employee-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin: 12px 0;
              background: linear-gradient(135deg, ${TavariStyles.colors.gray50} 0%, ${TavariStyles.colors.gray100} 100%);
              padding: 10px;
              border-radius: 4px;
              border: 1px solid ${TavariStyles.colors.gray200};
              font-size: 9px;
            }
            .employee-info div {
              line-height: 1.3;
            }
            .employee-info strong {
              color: ${TavariStyles.colors.gray700};
              font-weight: 600;
            }
            .pay-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 9px;
            }
            .pay-table th, .pay-table td {
              padding: 4px 6px;
              border: 1px solid #ddd;
              text-align: left;
            }
            .pay-table th {
              background-color: #f5f5f5;
              font-weight: 600;
              color: #333;
              text-transform: uppercase;
              font-size: 8px;
              letter-spacing: 0.3px;
            }
            .pay-table td.number {
              text-align: right;
              font-family: 'Courier New', monospace;
              font-size: 9px;
            }
            .pay-table .category-header {
              background-color: #e9ecef;
              font-weight: bold;
              font-size: 9px;
              text-transform: uppercase;
            }
            .pay-table .total-row {
              background-color: #f8f9fa;
              font-weight: bold;
              border-top: 2px solid #333;
            }
            .pay-table .net-pay-row {
              background-color: ${TavariStyles.colors.primary}20;
              font-weight: bold;
              font-size: 10px;
              border-top: 2px solid ${TavariStyles.colors.primary};
            }
            .premium-highlight {
              background-color: ${TavariStyles.colors.success}15;
              color: ${TavariStyles.colors.success};
            }
            .ytd-performance {
              background-color: ${TavariStyles.colors.info}10;
              border: 1px solid ${TavariStyles.colors.info}30;
              border-radius: 4px;
              padding: 6px;
              margin: 8px 0;
              font-size: 7px;
              color: ${TavariStyles.colors.info};
            }
            .footer {
              margin-top: 15px;
              font-size: 7px;
              color: ${TavariStyles.colors.gray600};
              text-align: center;
              border-top: 1px solid ${TavariStyles.colors.gray300};
              padding-top: 8px;
            }
            @media print {
              body { margin: 0; font-size: 9px; }
              .ytd-performance { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${effectiveBusinessData?.name || 'Company Name'}</div>
            <div class="statement-title">Employee Pay Statement</div>
          </div>

          <div class="employee-info">
            <div>
              <strong>Employee:</strong> ${entry.users.first_name} ${entry.users.last_name}<br>
              <strong>Employee ID:</strong> ${entry.user_id.slice(-8).toUpperCase()}<br>
              <strong>Email:</strong> ${entry.users.email || 'N/A'}<br>
              ${entry.users.hire_date ? `<strong>Hire Date:</strong> ${new Date(entry.users.hire_date).toLocaleDateString()}<br>` : ''}
            </div>
            <div>
              <strong>Pay Period:</strong> ${new Date(selectedRun.pay_period_start).toLocaleDateString()} to ${new Date(selectedRun.pay_period_end).toLocaleDateString()}<br>
              <strong>Pay Date:</strong> ${new Date(selectedRun.pay_date).toLocaleDateString()}<br>
              <strong>Base Rate:</strong> $${formatTaxAmount(wage)}/hr<br>
              <strong>Lieu Time Balance:</strong> ${parseFloat(entry.lieu_balance_after || 0).toFixed(2)} hours<br>
              ${Object.keys(premiums).length > 0 ? `<strong>Active Premiums:</strong> ${Object.keys(premiums).length}<br>` : ''}
            </div>
          </div>

          ${ytdTotals._ytd_source ? `
          <div class="ytd-performance">
            <strong>YTD Data Source:</strong> ${ytdTotals._ytd_source} | 
            <strong>Calculation Time:</strong> ${ytdCalculationTime}ms |
            ${ytdTotals._ytd_last_updated ? `<strong>YTD Last Updated:</strong> ${new Date(ytdTotals._ytd_last_updated).toLocaleDateString()}` : ''}
            ${ytdTotals._ytd_entries_included !== undefined ? ` | <strong>Recent Entries:</strong> ${ytdTotals._ytd_entries_included}` : ''}
          </div>
          ` : ''}

          <table class="pay-table">
            <thead>
              <tr>
                <th>Earnings</th>
                <th>Rate</th>
                <th>Hours</th>
                <th>This Period</th>
                <th>YTD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Regular Wage</td>
                <td class="number">$${formatTaxAmount(wage)}</td>
                <td class="number">${parseFloat(entry.regular_hours || 0).toFixed(2)}</td>
                <td class="number">$${formatTaxAmount(regularEarnings)}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.regular_earnings)}</td>
              </tr>
              <tr>
                <td>Stat Worked</td>
                <td class="number">$${formatTaxAmount(wage * 1.5)}</td>
                <td class="number">0.00</td>
                <td class="number">$${formatTaxAmount(statEarnings)}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.stat_earnings)}</td>
              </tr>
              <tr>
                <td>Holiday Pay</td>
                <td class="number">$${formatTaxAmount(wage)}</td>
                <td class="number">0.00</td>
                <td class="number">$${formatTaxAmount(holidayEarnings)}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.holiday_earnings)}</td>
              </tr>
              <tr class="${currentPremiumPay > 0 ? 'premium-highlight' : ''}">
                <td>Shift Premiums</td>
                <td class="number">-</td>
                <td class="number">${totalCurrentHours > 0 ? totalCurrentHours.toFixed(2) : '0.00'}</td>
                <td class="number">$${formatTaxAmount(currentPremiumPay)}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.shift_premiums)}</td>
              </tr>
              ${parseFloat(entry.overtime_hours || 0) > 0 ? `
              <tr>
                <td>Overtime (1.5x)</td>
                <td class="number">$${formatTaxAmount(wage * 1.5)}</td>
                <td class="number">${parseFloat(entry.overtime_hours || 0).toFixed(2)}</td>
                <td class="number">$${formatTaxAmount(overtimeEarnings)}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.overtime_earnings)}</td>
              </tr>
              ` : ''}
              ${parseFloat(entry.lieu_hours || 0) > 0 ? `
              <tr>
                <td>Lieu Hours</td>
                <td class="number">$${formatTaxAmount(wage)}</td>
                <td class="number">${parseFloat(entry.lieu_hours || 0).toFixed(2)}</td>
                <td class="number">$${formatTaxAmount(lieuEarnings)}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.lieu_earnings)}</td>
              </tr>
              ` : ''}
              <tr>
                <td>Vacation</td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number">$${formatTaxAmount(parseFloat(entry.vacation_pay || 0))}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.vacation_pay)}</td>
              </tr>
              <tr>
                <td>Bonus</td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number">$${formatTaxAmount(bonus)}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.bonus)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Gross Pay</strong></td>
                <td class="number">-</td>
                <td class="number"><strong>${totalCurrentHours.toFixed(2)}</strong></td>
                <td class="number"><strong>$${formatTaxAmount(currentGrossPay)}</strong></td>
                <td class="number"><strong>$${formatTaxAmount(ytdGrossPay)}</strong></td>
              </tr>
            </tbody>
          </table>

          ${Object.keys(premiums).length > 0 ? `
          <table class="pay-table">
            <thead>
              <tr>
                <th colspan="5">Premium Details for This Period</th>
              </tr>
              <tr>
                <th>Premium Name</th>
                <th>Rate</th>
                <th>Hours Applied</th>
                <th>Amount</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(premiums).map(([name, details]) => `
                <tr class="premium-highlight">
                  <td>${name}</td>
                  <td class="number">$${formatTaxAmount(details.rate || 0)}</td>
                  <td class="number">${details.applies_to_all_hours ? totalCurrentHours.toFixed(2) : parseFloat(entry.regular_hours || 0).toFixed(2)}</td>
                  <td class="number">$${formatTaxAmount(details.total_pay || 0)}</td>
                  <td>${details.applies_to_all_hours ? 'All Hours' : 'Regular Only'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}

          <table class="pay-table">
            <thead>
              <tr>
                <th>Deductions</th>
                <th></th>
                <th></th>
                <th>This Period</th>
                <th>YTD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Federal Tax</td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number">$${formatTaxAmount(parseFloat(entry.federal_tax || 0))}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.federal_tax)}</td>
              </tr>
              <tr>
                <td>Provincial Tax</td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number">$${formatTaxAmount(parseFloat(entry.provincial_tax || 0))}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.provincial_tax)}</td>
              </tr>
              <tr>
                <td>CPP</td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number">$${formatTaxAmount(parseFloat(entry.cpp_deduction || 0))}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.cpp_deduction)}</td>
              </tr>
              <tr>
                <td>EI</td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number">$${formatTaxAmount(parseFloat(entry.ei_deduction || 0))}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.ei_deduction)}</td>
              </tr>
              ${parseFloat(entry.additional_tax || 0) > 0 ? `
              <tr>
                <td>Additional Federal Tax</td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number">$${formatTaxAmount(parseFloat(entry.additional_tax || 0))}</td>
                <td class="number">$${formatTaxAmount(ytdTotals.additional_tax)}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>Total Deductions</strong></td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number"><strong>$${formatTaxAmount(totalCurrentDeductions)}</strong></td>
                <td class="number"><strong>$${formatTaxAmount(totalYTDDeductions)}</strong></td>
              </tr>
              <tr class="net-pay-row">
                <td><strong>NET PAY</strong></td>
                <td class="number">-</td>
                <td class="number">-</td>
                <td class="number"><strong>$${formatTaxAmount(parseFloat(entry.net_pay || 0))}</strong></td>
                <td class="number"><strong>$${formatTaxAmount(ytdTotals.net_pay)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p><strong>This pay statement was generated electronically by Tavari HR Payroll System.</strong></p>
            <p>Generated by: ${authUser?.email || 'System'} | Business: ${effectiveBusinessData?.name || 'N/A'} | ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            <p>YTD Calculation: Fast lookup (${ytdCalculationTime}ms) | Source: ${ytdTotals._ytd_source || 'standard'}</p>
          </div>
        </body>
        </html>
      `;

      // EXACT WORKING METHOD: Create and print PDF using window.open()
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
      }
      
      printWindow.document.write(payStatementHTML);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);

      // Log performance metrics
      await logSecurityEvent('pay_statement_ytd_performance', {
        business_id: effectiveBusinessId,
        employee_id: entry.user_id,
        ytd_calculation_time_ms: ytdCalculationTime,
        ytd_source: ytdTotals._ytd_source,
        ytd_entries_included: ytdTotals._ytd_entries_included
      }, 'low');

    } catch (error) {
      console.error('Error generating pay statement:', error);
      await recordAction('generate_pay_statement', entry.user_id, false);
      await logSecurityEvent('pay_statement_generation_error', {
        business_id: effectiveBusinessId,
        employee_id: entry.user_id,
        error: error.message
      }, 'high');
      
      if (!isBulkGeneration) {
        alert('Error generating pay statement: ' + error.message);
      }
    } finally {
      if (!isBulkGeneration) setGenerating(false);
    }
  };

  // BULK DOWNLOAD: Just calls the working method multiple times
  const bulkDownloadStatements = async () => {
    if (selectedEmployees.size === 0) {
      alert('Please select employees to download statements for');
      return;
    }

    setBulkDownloading(true);
    
    const selectedEntries = payrollEntries.filter(entry => 
      selectedEmployees.has(entry.id)
    );

    try {
      console.log(`🚀 Starting bulk download for ${selectedEntries.length} employees with YTD integration`);
      
      // Call the EXACT SAME working individual method for each employee
      for (let i = 0; i < selectedEntries.length; i++) {
        const entry = selectedEntries[i];
        
        console.log(`📄 Generating statement ${i + 1}/${selectedEntries.length} for ${entry.users.first_name} ${entry.users.last_name}`);
        
        // Just call your original working method - NO CHANGES
        await generatePayStatementPDF(entry, false);
        
        // Wait between downloads
        if (i < selectedEntries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      alert(`Generated ${selectedEntries.length} pay statements with fast YTD calculations!`);
      
    } catch (error) {
      console.error('Bulk download error:', error);
      alert('Error generating statements: ' + error.message);
    } finally {
      setBulkDownloading(false);
    }
  };

  const generateSelectedStatements = async () => {
    if (selectedEmployees.size === 0) {
      alert('Please select employees to generate statements for');
      return;
    }

    const rateLimitCheck = await checkRateLimit('bulk_pay_statement_generation', authUser?.id);
    if (!rateLimitCheck.allowed) {
      alert('Rate limit exceeded for bulk generation. Please wait before trying again.');
      return;
    }

    setGenerating(true);
    try {
      await recordAction('bulk_pay_statement_generation', authUser?.id, true);
      
      const selectedEntries = payrollEntries.filter(entry => 
        selectedEmployees.has(entry.id)
      );

      console.log(`🚀 Generating ${selectedEntries.length} statements with fast YTD calculations`);

      for (let i = 0; i < selectedEntries.length; i++) {
        const entry = selectedEntries[i];
        await new Promise(resolve => {
          generatePayStatementPDF(entry, true);
          setTimeout(resolve, 1500);
        });
      }
      
      alert(`Generated ${selectedEntries.length} pay statements with improved YTD performance!`);
      
    } catch (error) {
      console.error('Error generating selected statements:', error);
      await recordAction('bulk_pay_statement_generation', authUser?.id, false);
      alert('Error generating statements: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleEmployeeSelection = (entryId) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.size === payrollEntries.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(payrollEntries.map(entry => entry.id)));
    }
  };

  // Calculate total premium pay for display in table
  const calculateEntryPremiumPay = (entry) => {
    try {
      const premiums = typeof entry.premiums === 'string' ? 
        JSON.parse(entry.premiums) : (entry.premiums || {});
      
      let total = 0;
      Object.values(premiums).forEach(premium => {
        if (premium.total_pay) {
          total += parseFloat(premium.total_pay);
        }
      });
      return total;
    } catch (e) {
      return 0;
    }
  };

  // Tavari Styles
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
      ...TavariStyles.components.form?.select || {
        padding: '12px 16px',
        border: `1px solid ${TavariStyles.colors.gray300}`,
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        fontSize: TavariStyles.typography.fontSize.sm,
        backgroundColor: TavariStyles.colors.white,
        cursor: 'pointer'
      },
      width: '100%',
      maxWidth: '400px',
      marginBottom: TavariStyles.spacing.md
    },
    button: {
      ...TavariStyles.components.button?.base || {
        padding: '12px 20px',
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
      },
      marginRight: TavariStyles.spacing.sm,
      marginBottom: TavariStyles.spacing.sm
    },
    secondaryButton: {
      ...TavariStyles.components.button?.base || {
        padding: '12px 20px',
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        border: 'none',
        fontSize: TavariStyles.typography.fontSize.sm,
        fontWeight: TavariStyles.typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      },
      ...TavariStyles.components.button?.variants?.secondary || {
        backgroundColor: TavariStyles.colors.gray100,
        color: TavariStyles.colors.gray700,
        border: `1px solid ${TavariStyles.colors.gray300}`
      },
      marginRight: TavariStyles.spacing.sm,
      marginBottom: TavariStyles.spacing.sm
    },
    disabledButton: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    buttonGroup: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: TavariStyles.spacing.sm,
      alignItems: 'center'
    },
    table: {
      ...TavariStyles.components.table?.table || {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: TavariStyles.typography.fontSize.sm
      },
      marginTop: TavariStyles.spacing.md
    },
    th: {
      ...TavariStyles.components.table?.th || {
        padding: TavariStyles.spacing.md,
        textAlign: 'left',
        fontWeight: TavariStyles.typography.fontWeight.semibold,
        color: TavariStyles.colors.gray700,
        fontSize: TavariStyles.typography.fontSize.sm,
        backgroundColor: TavariStyles.colors.gray50,
        borderBottom: `2px solid ${TavariStyles.colors.gray200}`
      },
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white
    },
    td: {
      ...TavariStyles.components.table?.td || {
        padding: TavariStyles.spacing.md,
        borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
        verticalAlign: 'middle'
      }
    },
    employeeName: {
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800
    },
    employeeDetails: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    amountCell: {
      textAlign: 'right',
      fontWeight: TavariStyles.typography.fontWeight.medium,
      fontFamily: 'monospace'
    },
    premiumCell: {
      textAlign: 'right',
      fontWeight: TavariStyles.typography.fontWeight.medium,
      fontFamily: 'monospace',
      color: TavariStyles.colors.success
    },
    loadingText: {
      textAlign: 'center',
      color: TavariStyles.colors.gray600,
      fontSize: TavariStyles.typography.fontSize.lg,
      padding: TavariStyles.spacing.xl
    },
    emptyState: {
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      padding: TavariStyles.spacing.xl
    },
    selectedRow: {
      backgroundColor: TavariStyles.colors.primary + '08'
    },
    // YTD status indicator
    ytdStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs,
      marginTop: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: ytd.loading ? TavariStyles.colors.warning : TavariStyles.colors.success
    }
  };

  if (loading) {
    return (
      <POSAuthWrapper
        componentName="PayStatementsTab"
        requiredRoles={['owner', 'manager', 'hr_admin']}
        requireBusiness={true}
      >
        <SecurityWrapper
          componentName="PayStatementsTab"
          securityLevel="critical"
          enableAuditLogging={true}
          sensitiveComponent={true}
        >
          <div style={styles.container}>
            <div style={styles.loadingText}>Loading pay statements...</div>
          </div>
        </SecurityWrapper>
      </POSAuthWrapper>
    );
  }

  return (
    <POSAuthWrapper
      componentName="PayStatementsTab"
      requiredRoles={['owner', 'manager', 'hr_admin']}
      requireBusiness={true}
    >
      <SecurityWrapper
        componentName="PayStatementsTab"
        securityLevel="critical"
        enableAuditLogging={true}
        sensitiveComponent={true}
      >
        <div style={styles.container}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Select Payroll Run</h3>
            
            {/* YTD System Status */}
            <div style={styles.ytdStatus}>
              {ytd.loading ? (
                <>⏳ YTD system initializing...</>
              ) : (
                <>✅ Fast YTD calculations enabled - Pay statements will generate much faster!</>
              )}
            </div>

            {payrollRuns.length > 0 ? (
              <>
                <select
                  style={styles.select}
                  value={selectedRun?.id || ''}
                  onChange={(e) => {
                    const run = payrollRuns.find(r => r.id === e.target.value);
                    setSelectedRun(run);
                    if (run) loadPayrollEntries(run.id);
                  }}
                >
                  <option value="">Select a payroll run...</option>
                  {payrollRuns.map(run => (
                    <option key={run.id} value={run.id}>
                      {new Date(run.pay_period_start).toLocaleDateString()} to {new Date(run.pay_period_end).toLocaleDateString()} (Pay Date: {new Date(run.pay_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>

                {selectedRun && payrollEntries.length > 0 && (
                  <div style={styles.buttonGroup}>
                    <button
                      style={{
                        ...styles.secondaryButton,
                        ...(generating || bulkDownloading ? styles.disabledButton : {})
                      }}
                      onClick={selectAllEmployees}
                      disabled={generating || bulkDownloading}
                    >
                      {selectedEmployees.size === payrollEntries.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      style={{
                        ...styles.button,
                        ...(generating || selectedEmployees.size === 0 ? styles.disabledButton : {})
                      }}
                      onClick={generateSelectedStatements}
                      disabled={generating || selectedEmployees.size === 0}
                    >
                      {generating ? 'Generating...' : `Generate Selected (${selectedEmployees.size})`}
                    </button>
                    <button
                      style={{
                        ...styles.button,
                        ...(bulkDownloading || selectedEmployees.size === 0 ? styles.disabledButton : {})
                      }}
                      onClick={bulkDownloadStatements}
                      disabled={bulkDownloading || selectedEmployees.size === 0}
                    >
                      {bulkDownloading ? 'Bulk Download...' : `Fast Bulk Download (${selectedEmployees.size})`}
                    </button>
                    <span style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray600 }}>
                      {selectedEmployees.size} of {payrollEntries.length} selected
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.emptyState}>
                <p>No finalized payroll runs found.</p>
                <p>Complete a payroll run in the Payroll Entry tab first.</p>
              </div>
            )}
          </div>

          {selectedRun && payrollEntries.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                Pay Statements for {new Date(selectedRun.pay_period_start).toLocaleDateString()} to {new Date(selectedRun.pay_period_end).toLocaleDateString()}
                <span style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.success, marginLeft: TavariStyles.spacing.md }}>
                  ⚡ Fast YTD Mode
                </span>
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>
                        <TavariCheckbox
                          checked={selectedEmployees.size === payrollEntries.length}
                          onChange={selectAllEmployees}
                          label=""
                        />
                      </th>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Regular Hours</th>
                      <th style={styles.th}>Overtime Hours</th>
                      <th style={styles.th}>Premium Pay</th>
                      <th style={styles.th}>Gross Pay</th>
                      <th style={styles.th}>Deductions</th>
                      <th style={styles.th}>Net Pay</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollEntries.map(entry => {
                      const totalDeductions =
                        parseFloat(entry.federal_tax || 0) +
                        parseFloat(entry.provincial_tax || 0) +
                        parseFloat(entry.ei_deduction || 0) +
                        parseFloat(entry.cpp_deduction || 0) +
                        parseFloat(entry.additional_tax || 0);

                      const premiumPay = calculateEntryPremiumPay(entry);
                      const isSelected = selectedEmployees.has(entry.id);

                      return (
                        <tr 
                          key={entry.id}
                          style={isSelected ? styles.selectedRow : {}}
                        >
                          <td style={styles.td}>
                            <TavariCheckbox
                              checked={isSelected}
                              onChange={() => toggleEmployeeSelection(entry.id)}
                              label=""
                            />
                          </td>
                          <td style={styles.td}>
                            <div style={styles.employeeName}>
                              {entry.users.first_name} {entry.users.last_name}
                            </div>
                            <div style={styles.employeeDetails}>
                              {entry.users.email}
                            </div>
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            {parseFloat(entry.regular_hours || 0).toFixed(2)}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            {parseFloat(entry.overtime_hours || 0).toFixed(2)}
                          </td>
                          <td style={{...styles.td, ...styles.premiumCell}}>
                            {premiumPay > 0 ? `$${formatTaxAmount(premiumPay)}` : '-'}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            ${formatTaxAmount(parseFloat(entry.gross_pay || 0) + parseFloat(entry.vacation_pay || 0))}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            ${formatTaxAmount(totalDeductions)}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            <strong>${formatTaxAmount(parseFloat(entry.net_pay || 0))}</strong>
                          </td>
                          <td style={styles.td}>
                            <button
                              style={{
                                ...styles.button,
                                ...(generating || bulkDownloading ? styles.disabledButton : {}),
                                margin: 0,
                                fontSize: TavariStyles.typography.fontSize.xs,
                                padding: '8px 12px'
                              }}
                              onClick={() => generatePayStatementPDF(entry)}
                              disabled={generating || bulkDownloading}
                              title="Generate with fast YTD calculations"
                            >
                              ⚡ Fast PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedRun && payrollEntries.length === 0 && (
            <div style={styles.section}>
              <div style={styles.emptyState}>
                <p>No pay entries found for selected payroll run.</p>
              </div>
            </div>
          )}

          {/* YTD Detail Modal */}
          <YTDDetailModal
            isOpen={showYTDModal}
            onClose={() => setShowYTDModal(false)}
            employee={selectedYTDEmployee?.employee}
            ytdData={selectedYTDEmployee?.ytdData}
            formatAmount={formatTaxAmount}
            allowEdit={false}
          />
        </div>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default PayStatementsTab;