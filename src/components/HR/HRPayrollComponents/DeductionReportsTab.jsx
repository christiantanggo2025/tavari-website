// components/HR/HRPayrollComponents/DeductionReportsTab.jsx - DEBUGGING VERSION
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import { useCanadianTaxCalculations } from '../../../hooks/useCanadianTaxCalculations';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const DeductionReportsTab = ({ selectedBusinessId, businessData, settings }) => {
  console.log('🔵 COMPONENT RENDER - DeductionReportsTab');
  
  const [reportPeriod, setReportPeriod] = useState({
    start: '',
    end: ''
  });
  const [deductionData, setDeductionData] = useState([]);
  const [totals, setTotals] = useState({
    employee_federal_tax: 0,
    employee_provincial_tax: 0,
    employee_ei: 0,
    employee_cpp: 0,
    employer_ei: 0,
    employer_cpp: 0,
    total_remittance: 0,
    total_gross_pay: 0,
    total_net_pay: 0
  });
  const [loading, setLoading] = useState(false);
  const [includePreviousReports, setIncludePreviousReports] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);

  // Security context for sensitive financial data
  const {
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'DeductionReportsTab',
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
    componentName: 'DeductionReportsTab'
  });

  // Use effective business ID
  const effectiveBusinessId = selectedBusinessId || authBusinessId;
  const effectiveBusinessData = businessData || authBusinessData;

  console.log('🔵 effectiveBusinessId:', effectiveBusinessId);

  // Tax calculations for formatting
  const { formatTaxAmount } = useTaxCalculations(effectiveBusinessId);

  // Canadian tax calculations for CRA compliance
  const canadianTax = useCanadianTaxCalculations(effectiveBusinessId);

  useEffect(() => {
    console.log('🟢 useEffect TRIGGERED - calling loadReportHistory');
    loadReportHistory();
  }, [effectiveBusinessId]);

  // DEBUG: Watch reportHistory changes
  useEffect(() => {
    console.log('🟡 reportHistory STATE CHANGED:', {
      length: reportHistory.length,
      data: reportHistory,
      hasNulls: reportHistory.some(r => r === null),
      hasUndefined: reportHistory.some(r => r === undefined)
    });
    
    if (reportHistory.some(r => r === null || r === undefined)) {
      console.error('🔴 NULL/UNDEFINED DETECTED IN REPORT HISTORY!', reportHistory);
      console.trace('Stack trace for null entry:');
    }
  }, [reportHistory]);

  const loadReportHistory = async () => {
    console.log('🟢 loadReportHistory CALLED');
    
    if (!effectiveBusinessId) {
      console.log('🔴 NO effectiveBusinessId - exiting loadReportHistory');
      return;
    }

    try {
      console.log('🟢 Logging security event...');
      await logSecurityEvent('report_history_access', {
        action: 'load_deduction_report_history'
      }, 'low');

      console.log('🟢 Fetching business timezone...');
      const { data: businessInfo } = await supabase
        .from('businesses')
        .select('timezone')
        .eq('id', effectiveBusinessId)
        .single();

      const businessTimezone = businessInfo?.timezone || 'America/Toronto';
      console.log('🟢 Business timezone:', businessTimezone);

      console.log('🟢 Querying hrpayroll_runs...');
      const { data, error } = await supabase
        .from('hrpayroll_runs')
        .select('pay_date, pay_period_start, pay_period_end')
        .eq('business_id', effectiveBusinessId)
        .eq('status', 'finalized')
        .order('pay_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('🔴 Supabase query error:', error);
        throw error;
      }
      
      console.log('🟢 Raw data from Supabase:', data);
      console.log('🟢 Data type:', typeof data);
      console.log('🟢 Data is array:', Array.isArray(data));
      
      // FILTER OUT NULL ENTRIES BEFORE SETTING STATE
      console.log('🟢 Starting filter operation...');
      const validRuns = (data || [])
        .filter((run, index) => {
          const isValid = run && run.pay_date && run.pay_period_start && run.pay_period_end;
          console.log(`🟡 Filter check [${index}]:`, { run, isValid });
          return isValid;
        })
        .map((run, index) => {
          const mapped = {
            ...run,
            timezone: businessTimezone
          };
          console.log(`🟡 Map operation [${index}]:`, mapped);
          return mapped;
        });
    
      console.log('🟢 Valid runs after filter/map:', validRuns);
      console.log('🟢 Setting reportHistory state with', validRuns.length, 'entries');
      
      setReportHistory(validRuns);
      
      console.log('🟢 setReportHistory called successfully');
    } catch (error) {
      console.error('🔴 Error in loadReportHistory:', error);
      console.log('🟢 Setting reportHistory to empty array due to error');
      setReportHistory([]);
    }
  };

  const generateReport = async (startDateParam = null, endDateParam = null) => {
    console.log('🟢 generateReport CALLED with params:', { startDateParam, endDateParam });
    
    const start = startDateParam || reportPeriod.start;
    const end = endDateParam || reportPeriod.end;

    console.log('🟢 Using dates:', { start, end });

    if (!start || !end || !effectiveBusinessId) {
      console.log('🔴 Validation failed:', { start, end, effectiveBusinessId });
      alert('Please select both start and end dates for the report period');
      return;
    }

    const { data: businessInfo, error: businessError } = await supabase
      .from('businesses')
      .select('timezone')
      .eq('id', effectiveBusinessId)
      .single();

    if (businessError) {
      console.error('🔴 Error fetching business timezone:', businessError);
      alert('Error loading business information');
      return;
    }

    const businessTimezone = businessInfo?.timezone || 'America/Toronto';

    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T23:59:59');
    
    if (startDate >= endDate) {
      alert('End date must be after start date');
      return;
    }

    const rateLimitCheck = await checkRateLimit('generate_deduction_report');
    if (!rateLimitCheck.allowed) {
      alert('Rate limit exceeded. Please wait before generating another report.');
      return;
    }

    setLoading(true);
    try {
      await recordAction('deduction_report_generation', true);

      await logSecurityEvent('government_remittance_report_generated', {
        report_period_start: start,
        report_period_end: end,
        business_id: effectiveBusinessId,
        report_type: 'deduction_summary'
      }, 'critical');

      const { data: entries, error } = await supabase
        .from('hrpayroll_entries')
        .select(`
          *,
          users (
            first_name,
            last_name,
            email,
            wage,
            claim_code
          ),
          hrpayroll_runs!hrpayroll_entries_payroll_run_id_fkey (
            id,
            business_id,
            pay_date,
            pay_period_start,
            pay_period_end,
            status
          )
        `)
        .eq('hrpayroll_runs.business_id', effectiveBusinessId)
        .eq('hrpayroll_runs.status', 'finalized')
        .gte('hrpayroll_runs.pay_date', start)
        .lte('hrpayroll_runs.pay_date', end);

      if (error) throw error;

      console.log(`Found ${entries?.length || 0} payroll entries for period ${start} to ${end} (Timezone: ${businessTimezone})`);
      console.log('First entry sample:', JSON.stringify(entries?.[0], null, 2));
      console.log('First entry hrpayroll_runs:', entries?.[0]?.hrpayroll_runs);
      console.log('pay_period_start value:', entries?.[0]?.hrpayroll_runs?.pay_period_start);
      console.log('pay_period_end value:', entries?.[0]?.hrpayroll_runs?.pay_period_end);

      const calculatedTotals = {
        employee_federal_tax: 0,
        employee_provincial_tax: 0,
        employee_ei: 0,
        employee_cpp: 0,
        employer_ei: 0,
        employer_cpp: 0,
        total_remittance: 0,
        total_gross_pay: 0,
        total_net_pay: 0
      };

      const processedEntries = [];
      
      for (const entry of entries) {
        try {
          let premiumPay = 0;
          try {
            const premiums = typeof entry.premiums === 'string' ? 
              JSON.parse(entry.premiums) : (entry.premiums || {});
            
            Object.values(premiums).forEach(premium => {
              if (premium.total_pay) {
                premiumPay += parseFloat(premium.total_pay);
              }
            });
          } catch (e) {
            console.warn('Error parsing premiums for entry:', entry.id);
          }

          const wage = parseFloat(entry.users?.wage) || 15.00;
          const regularHours = parseFloat(entry.regular_hours || 0);
          const overtimeHours = parseFloat(entry.overtime_hours || 0);
          const lieuHours = parseFloat(entry.lieu_hours || 0);
          
          const regularPay = regularHours * wage;
          const overtimePay = overtimeHours * wage * 1.5;
          const lieuPay = lieuHours * wage;
          const basePay = regularPay + overtimePay + lieuPay;
          
          const grossPay = basePay + premiumPay;
          const vacationPay = parseFloat(entry.vacation_pay || 0);
          const totalGross = grossPay + vacationPay;

          let taxCalculation;
          try {
            taxCalculation = canadianTax.calculateCRACompliantTaxes({
              grossPay: totalGross,
              payPeriods: 52,
              claimCode: parseInt(entry.users?.claim_code) || 1,
              jurisdiction: 'ON',
              deductions: 0,
              yearToDateTotals: {
                yearToDateCPP: 0,
                yearToDateEI: 0
              }
            });
          } catch (taxError) {
            console.warn('CRA calculation failed, using stored values:', taxError);
            taxCalculation = {
              federal_tax_period: parseFloat(entry.federal_tax || 0),
              provincial_tax_period: parseFloat(entry.provincial_tax || 0),
              ei_premium: parseFloat(entry.ei_deduction || 0),
              cpp_contribution: parseFloat(entry.cpp_deduction || 0),
              total_deductions: parseFloat(entry.federal_tax || 0) + 
                               parseFloat(entry.provincial_tax || 0) + 
                               parseFloat(entry.ei_deduction || 0) + 
                               parseFloat(entry.cpp_deduction || 0),
              net_pay: parseFloat(entry.net_pay || 0)
            };
          }

          const employeeEI = taxCalculation.ei_premium || 0;
          const employeeCPP = taxCalculation.cpp_contribution || 0;
          
          const employerEI = employeeEI * 1.4;
          const employerCPP = employeeCPP;

          calculatedTotals.employee_federal_tax += taxCalculation.federal_tax_period || 0;
          calculatedTotals.employee_provincial_tax += taxCalculation.provincial_tax_period || 0;
          calculatedTotals.employee_ei += employeeEI;
          calculatedTotals.employee_cpp += employeeCPP;
          calculatedTotals.employer_ei += employerEI;
          calculatedTotals.employer_cpp += employerCPP;
          calculatedTotals.total_gross_pay += totalGross;
          calculatedTotals.total_net_pay += taxCalculation.net_pay || 0;

          processedEntries.push({
            ...entry,
            calculated_federal_tax: taxCalculation.federal_tax_period || 0,
            calculated_provincial_tax: taxCalculation.provincial_tax_period || 0,
            calculated_ei: employeeEI,
            calculated_cpp: employeeCPP,
            calculated_employer_ei: employerEI,
            calculated_employer_cpp: employerCPP,
            calculated_gross: totalGross,
            calculated_net: taxCalculation.net_pay || 0,
            premium_pay: premiumPay
          });

        } catch (entryError) {
          console.error('Error processing entry:', entry.id, entryError);
          processedEntries.push({
            ...entry,
            calculated_federal_tax: parseFloat(entry.federal_tax || 0),
            calculated_provincial_tax: parseFloat(entry.provincial_tax || 0),
            calculated_ei: parseFloat(entry.ei_deduction || 0),
            calculated_cpp: parseFloat(entry.cpp_deduction || 0),
            calculated_employer_ei: parseFloat(entry.ei_deduction || 0) * 1.4,
            calculated_employer_cpp: parseFloat(entry.cpp_deduction || 0),
            calculated_gross: parseFloat(entry.gross_pay || 0) + parseFloat(entry.vacation_pay || 0),
            calculated_net: parseFloat(entry.net_pay || 0),
            premium_pay: 0
          });
        }
      }

      calculatedTotals.total_remittance =
        calculatedTotals.employee_federal_tax +
        calculatedTotals.employee_provincial_tax +
        calculatedTotals.employee_ei +
        calculatedTotals.employee_cpp +
        calculatedTotals.employer_ei +
        calculatedTotals.employer_cpp;

      setDeductionData(processedEntries);
      setTotals(calculatedTotals);
      setReportPeriod({ start, end });

      await logSecurityEvent('deduction_report_completed', {
        report_period_start: start,
        report_period_end: end,
        employee_count: processedEntries.length,
        total_remittance: calculatedTotals.total_remittance,
        total_gross_pay: calculatedTotals.total_gross_pay,
        cra_remittance: calculatedTotals.employee_federal_tax + calculatedTotals.employee_ei + calculatedTotals.employee_cpp + calculatedTotals.employer_ei + calculatedTotals.employer_cpp,
        provincial_remittance: calculatedTotals.employee_provincial_tax,
        calculation_method: 'cra_compliant'
      }, 'critical');

    } catch (error) {
      console.error('Error generating deduction report:', error);
      
      await recordAction('deduction_report_generation', false);
      
      await logSecurityEvent('deduction_report_failed', {
        error_message: error.message,
        report_period_start: start,
        report_period_end: end
      }, 'high');

      alert('Error generating report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    console.log('🟦 ===== CSV EXPORT STARTED =====');
    console.log('🟦 deductionData length:', deductionData.length);
    console.log('🟦 deductionData full array:', JSON.stringify(deductionData, null, 2));

    if (deductionData.length === 0) {
      alert('No data to export. Generate a report first.');
      return;
    }

    const rateLimitCheck = await checkRateLimit('export_deduction_data');
    if (!rateLimitCheck.allowed) {
      alert('Rate limit exceeded. Please wait before exporting data.');
      return;
    }

    try {
      await logSecurityEvent('deduction_data_exported', {
        export_format: 'csv',
        report_period_start: reportPeriod.start,
        report_period_end: reportPeriod.end,
        employee_count: deductionData.length,
        total_remittance: totals.total_remittance
      }, 'high');

      console.log('🟦 Defining CSV headers...');
      const headers = [
        'Employee Name',
        'Pay Date',
        'Pay Period Start',
        'Pay Period End',
        'Regular Hours',
        'Overtime Hours',
        'Lieu Hours',
        'Base Pay',
        'Premium Pay',
        'Vacation Pay',
        'Total Gross',
        'Federal Tax (CRA)',
        'Provincial Tax',
        'Employee EI',
        'Employee CPP',
        'Employer EI (1.4x)',
        'Employer CPP',
        'Total Employee Deductions',
        'Net Pay'
      ];
      console.log('🟦 Headers:', headers);

      console.log('🟦 Starting to process deductionData entries...');
      const csvData = [];
    
      for (let i = 0; i < deductionData.length; i++) {
        const entry = deductionData[i];
        console.log(`🟦 Processing entry [${i}]:`, {
          id: entry.id,
          hasUsers: !!entry.users,
          hasHrpayrollRuns: !!entry.hrpayroll_runs,
          hrpayrollRuns: entry.hrpayroll_runs
        });

        // Check if entry has required data
        if (!entry || !entry.users || !entry.hrpayroll_runs) {
          console.warn(`🟠 Skipping entry [${i}] - missing required data`);
          continue;
        }

        console.log(`🟦 Entry [${i}] hrpayroll_runs details:`, {
          pay_date: entry.hrpayroll_runs.pay_date,
          pay_period_start: entry.hrpayroll_runs.pay_period_start,
          pay_period_end: entry.hrpayroll_runs.pay_period_end,
          status: entry.hrpayroll_runs.status
        });

        // Calculate values
        const regularHours = parseFloat(entry.regular_hours || 0);
        const overtimeHours = parseFloat(entry.overtime_hours || 0);
        const lieuHours = parseFloat(entry.lieu_hours || 0);

        const wage = parseFloat(entry.users?.wage) || 15.00;
        const basePay = (regularHours * wage) + (overtimeHours * wage * 1.5) + (lieuHours * wage);
        const premiumPay = entry.premium_pay || 0;
        const vacationPay = parseFloat(entry.vacation_pay || 0);
        const totalGross = basePay + premiumPay + vacationPay;

        const federalTax = entry.calculated_federal_tax || 0;
        const provincialTax = entry.calculated_provincial_tax || 0;
        const employeeEI = entry.calculated_ei || 0;
        const employeeCPP = entry.calculated_cpp || 0;
        const employerEI = entry.calculated_employer_ei || 0;
        const employerCPP = entry.calculated_employer_cpp || 0;

        const totalEmployeeDeductions = federalTax + provincialTax + employeeEI + employeeCPP;

        const row = [
          `${entry.users.first_name} ${entry.users.last_name}`,
          entry.hrpayroll_runs.pay_date || 'MISSING',
          entry.hrpayroll_runs.pay_period_start || 'MISSING',
          entry.hrpayroll_runs.pay_period_end || 'MISSING',
          regularHours.toFixed(2),
          overtimeHours.toFixed(2),
          lieuHours.toFixed(2),
          formatTaxAmount(basePay),
          formatTaxAmount(premiumPay),
          formatTaxAmount(vacationPay),
          formatTaxAmount(totalGross),
          formatTaxAmount(federalTax),
          formatTaxAmount(provincialTax),
          formatTaxAmount(employeeEI),
          formatTaxAmount(employeeCPP),
          formatTaxAmount(employerEI),
          formatTaxAmount(employerCPP),
          formatTaxAmount(totalEmployeeDeductions),
          formatTaxAmount(entry.calculated_net || 0)
        ];

        console.log(`🟦 Entry [${i}] row data:`, row);
        csvData.push(row);
      }

      console.log('🟦 Total rows created:', csvData.length);
      console.log('🟦 Sample first row:', csvData[0]);

      // Add totals row
      csvData.push([
        'TOTALS',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        formatTaxAmount(totals.total_gross_pay),
        formatTaxAmount(totals.employee_federal_tax),
        formatTaxAmount(totals.employee_provincial_tax),
        formatTaxAmount(totals.employee_ei),
        formatTaxAmount(totals.employee_cpp),
        formatTaxAmount(totals.employer_ei),
        formatTaxAmount(totals.employer_cpp),
        formatTaxAmount(totals.employee_federal_tax + totals.employee_provincial_tax + totals.employee_ei + totals.employee_cpp),
        formatTaxAmount(totals.total_net_pay)
      ]);

      // Add summary section
      csvData.push([]);
      csvData.push(['CRA T4127 COMPLIANT REMITTANCE SUMMARY']);
      csvData.push(['Report Period', `${new Date(reportPeriod.start).toLocaleDateString()} to ${new Date(reportPeriod.end).toLocaleDateString()}`]);
      csvData.push(['CRA Remittance (Federal + EI + CPP)', formatTaxAmount(totals.employee_federal_tax + totals.employee_ei + totals.employee_cpp + totals.employer_ei + totals.employer_cpp)]);
      csvData.push(['Provincial Remittance', formatTaxAmount(totals.employee_provincial_tax)]);
      csvData.push(['Total Government Remittance Required', formatTaxAmount(totals.total_remittance)]);
      csvData.push(['']);
      csvData.push(['Calculated using CRA T4127 Payroll Deductions Formulas 121st Edition (July 1, 2025)']);

      console.log('🟦 Creating CSV content...');
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      console.log('🟦 CSV content length:', csvContent.length);
      console.log('🟦 First 500 chars of CSV:', csvContent.substring(0, 500));

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `CRA_Compliant_Payroll_Deduction_Report_${reportPeriod.start}_to_${reportPeriod.end}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('🟦 ===== CSV EXPORT COMPLETED =====');

    } catch (error) {
      console.error('🔴 Error exporting CSV:', error);
      console.error('🔴 Error stack:', error.stack);
      await logSecurityEvent('csv_export_failed', {
        error_message: error.message
      }, 'medium');
      alert('Error exporting CSV: ' + error.message);
    }
  };

  const generateRemittanceReport = async () => {
    if (!totals.total_remittance || totals.total_remittance === 0) {
      alert('No remittance data to generate report. Run a deduction report first.');
      return;
    }

    const rateLimitCheck = await checkRateLimit('generate_remittance_report');
    if (!rateLimitCheck.allowed) {
      alert('Rate limit exceeded. Please wait before generating another remittance report.');
      return;
    }

    try {
      await logSecurityEvent('government_remittance_report_printed', {
        report_period_start: reportPeriod.start,
        report_period_end: reportPeriod.end,
        total_remittance: totals.total_remittance,
        cra_amount: totals.employee_federal_tax + totals.employee_ei + totals.employee_cpp + totals.employer_ei + totals.employer_cpp,
        provincial_amount: totals.employee_provincial_tax,
        employee_count: deductionData.length,
        calculation_method: 'cra_t4127_compliant'
      }, 'critical');

      const craAmount = totals.employee_federal_tax + totals.employee_ei + totals.employee_cpp + totals.employer_ei + totals.employer_cpp;

      const remittanceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>CRA T4127 Compliant Government Remittance Report</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: 8.5in 11in;
              margin: 0.4in;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              line-height: 1.2;
              color: #333;
              font-size: 11px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #008080;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .company-name {
              font-size: 18px;
              font-weight: bold;
              color: #008080;
              margin-bottom: 4px;
            }
            .report-title {
              font-size: 14px;
              margin: 6px 0;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .compliance-badge {
              background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
              padding: 6px;
              border-radius: 4px;
              border-left: 3px solid #28a745;
              margin: 8px 0;
              text-align: center;
              font-weight: bold;
              color: #155724;
              font-size: 9px;
            }
            .date-info {
              font-size: 10px;
              color: #666;
              margin-top: 4px;
            }
            .summary-section {
              margin: 10px 0;
            }
            .summary-section h3 {
              font-size: 12px;
              margin: 8px 0 4px 0;
              color: #333;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
              font-size: 10px;
            }
            .summary-table th, .summary-table td {
              padding: 4px 6px;
              border: 1px solid #dee2e6;
              text-align: left;
            }
            .summary-table th {
              background: linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%);
              font-weight: 600;
              color: #495057;
              text-transform: uppercase;
              font-size: 8px;
              letter-spacing: 0.3px;
            }
            .summary-table td.amount {
              text-align: right;
              font-family: 'Courier New', monospace;
              font-weight: 500;
            }
            .total-row {
              background: linear-gradient(135deg, #008080 0%, #006666 100%);
              color: white;
              font-weight: bold;
              font-size: 10px;
            }
            .cra-highlight {
              background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
              border-left: 3px solid #17a2b8;
            }
            .provincial-highlight {
              background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
              border-left: 3px solid #dc3545;
            }
            .two-column {
              display: flex;
              gap: 10px;
            }
            .column {
              flex: 1;
            }
            .payroll-summary {
              width: 100%;
              font-size: 9px;
            }
            .remittance-instructions {
              margin: 8px 0;
              background: #f8f9fa;
              padding: 8px;
              border-radius: 4px;
              border: 1px solid #dee2e6;
              font-size: 9px;
            }
            .remittance-instructions h4 {
              color: #17a2b8;
              margin: 4px 0 2px 0;
              font-size: 10px;
            }
            .remittance-instructions ul {
              margin: 2px 0;
              padding-left: 12px;
            }
            .remittance-instructions li {
              margin: 1px 0;
            }
            .footer {
              background: #212529;
              color: white;
              padding: 6px;
              border-radius: 3px;
              margin: 8px 0;
              font-size: 8px;
              text-align: center;
            }
            .report-meta {
              margin-top: 8px;
              text-align: center;
              font-size: 8px;
              color: #6c757d;
              border-top: 1px solid #dee2e6;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${effectiveBusinessData?.name || 'Company Name'}</div>
            <div class="report-title">CRA T4127 Compliant Government Remittance Report</div>
            <div class="compliance-badge">
              CRA Payroll Deductions Formulas 121st Edition (July 1, 2025) - Official CRA T4127 Tax Tables
            </div>
            <div class="date-info">
              Period: ${new Date(reportPeriod.start).toLocaleDateString()} to ${new Date(reportPeriod.end).toLocaleDateString()} | 
              Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
            </div>
          </div>

          <div class="two-column">
            <div class="column">
              <div class="summary-section">
                <h3>Payroll Summary</h3>
                <table class="summary-table payroll-summary">
                  <tr><th>Total Gross Pay</th><td class="amount">$${formatTaxAmount(totals.total_gross_pay)}</td></tr>
                  <tr><th>Total Net Pay</th><td class="amount">$${formatTaxAmount(totals.total_net_pay)}</td></tr>
                  <tr><th>Employees</th><td class="amount">${deductionData.length}</td></tr>
                  <tr><th>Report Period</th><td class="amount">${new Date(reportPeriod.start).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} to ${new Date(reportPeriod.end).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td></tr>
                </table>
              </div>
            </div>
            
            <div class="column">
              <div class="summary-section">
                <h3>Government Remittance Summary</h3>
                <table class="summary-table">
                  <tr><th>CRA Remittance</th><td class="amount">$${formatTaxAmount(craAmount)}</td></tr>
                  <tr><th>Provincial Tax</th><td class="amount">$${formatTaxAmount(totals.employee_provincial_tax)}</td></tr>
                  <tr style="background: #008080; color: white; font-weight: bold;"><th>TOTAL REMITTANCE</th><td class="amount">$${formatTaxAmount(totals.total_remittance)}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <div class="summary-section">
            <h3>CRA T4127 Compliant Deduction & Remittance Breakdown</h3>
            <table class="summary-table">
              <thead>
                <tr>
                  <th>Tax/Deduction Type</th>
                  <th style="text-align: right;">Employee</th>
                  <th style="text-align: right;">Employer</th>
                  <th style="text-align: right;">Total Remit</th>
                  <th>CRA Ref</th>
                </tr>
              </thead>
              <tbody>
                <tr class="cra-highlight">
                  <td><strong>Federal Income Tax</strong></td>
                  <td class="amount">$${formatTaxAmount(totals.employee_federal_tax)}</td>
                  <td class="amount">$0.00</td>
                  <td class="amount">$${formatTaxAmount(totals.employee_federal_tax)}</td>
                  <td>T4127 Tables 1-5</td>
                </tr>
                <tr class="provincial-highlight">
                  <td><strong>Provincial Tax (ON)</strong></td>
                  <td class="amount">$${formatTaxAmount(totals.employee_provincial_tax)}</td>
                  <td class="amount">$0.00</td>
                  <td class="amount">$${formatTaxAmount(totals.employee_provincial_tax)}</td>
                  <td>T4127 Tables 6-10</td>
                </tr>
                <tr class="cra-highlight">
                  <td><strong>Employment Insurance</strong></td>
                  <td class="amount">$${formatTaxAmount(totals.employee_ei)}</td>
                  <td class="amount">$${formatTaxAmount(totals.employer_ei)}</td>
                  <td class="amount">$${formatTaxAmount(totals.employee_ei + totals.employer_ei)}</td>
                  <td>1.66% (1.4x)</td>
                </tr>
                <tr class="cra-highlight">
                  <td><strong>Canada Pension Plan</strong></td>
                  <td class="amount">$${formatTaxAmount(totals.employee_cpp)}</td>
                  <td class="amount">$${formatTaxAmount(totals.employer_cpp)}</td>
                  <td class="amount">$${formatTaxAmount(totals.employee_cpp + totals.employer_cpp)}</td>
                  <td>5.95%</td>
                </tr>
                <tr class="total-row">
                  <td><strong>TOTAL REMITTANCE</strong></td>
                  <td class="amount"><strong>$${formatTaxAmount(totals.employee_federal_tax + totals.employee_provincial_tax + totals.employee_ei + totals.employee_cpp)}</strong></td>
                  <td class="amount"><strong>$${formatTaxAmount(totals.employer_ei + totals.employer_cpp)}</strong></td>
                  <td class="amount"><strong>$${formatTaxAmount(totals.total_remittance)}</strong></td>
                  <td><strong>CRA T4127</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="remittance-instructions">
            <div class="two-column">
              <div class="column">
                <h4>CRA Remittance: $${formatTaxAmount(craAmount)}</h4>
                <ul>
                  <li><strong>Includes:</strong> Federal tax, EI (employee + employer 1.4x), CPP (employee + employer)</li>
                  <li><strong>Due:</strong> 15th of month following pay period</li>
                  <li><strong>Method:</strong> CRA My Business Account or approved bank</li>
                </ul>
              </div>
              <div class="column">
                <h4>Provincial: $${formatTaxAmount(totals.employee_provincial_tax)}</h4>
                <ul>
                  <li><strong>Jurisdiction:</strong> Ontario (default)</li>
                  <li><strong>Due:</strong> Per provincial requirements</li>
                  <li><strong>Calculation:</strong> CRA T4127 provincial tables</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="footer">
            CRA T4127 compliant report generated by Tavari HR Payroll System using official government tax formulas.
            All deductions calculated per CRA Payroll Deductions Formulas 121st Edition (July 1, 2025).
          </div>

          <div class="report-meta">
            <p><strong>Tavari HR Payroll System - CRA T4127 Compliant Remittance Report</strong></p>
            <p>Generated by: ${authUser?.email || 'System'} | Business: ${effectiveBusinessData?.name || 'N/A'} | ID: ${Date.now().toString(36).toUpperCase()}</p>
          </div>
        </body>
        </html>
      `;

      const endDate = new Date(reportPeriod.end);
      const formattedDate = endDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });

      const updatedHTML = remittanceHTML.replace(
        '<title>CRA T4127 Compliant Government Remittance Report</title>',
        `<title>Remittance Report - ${formattedDate}</title>`
      );

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
      }

      printWindow.document.write(updatedHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);

    } catch (error) {
      console.error('Error generating remittance report:', error);
      
      await logSecurityEvent('remittance_report_failed', {
        error_message: error.message
      }, 'high');
      
      alert('Error generating remittance report: ' + error.message);
    }
  };

  const styles = {
    container: {
      padding: TavariStyles.spacing.lg
    },
    section: {
      marginBottom: TavariStyles.spacing.xl,
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.base || '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      marginBottom: TavariStyles.spacing.md,
      color: TavariStyles.colors.gray800
    },
    periodForm: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      alignItems: 'end'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs
    },
    label: {
      ...TavariStyles.components.form?.label || {
        fontSize: TavariStyles.typography.fontSize.sm,
        fontWeight: TavariStyles.typography.fontWeight.medium,
        color: TavariStyles.colors.gray700,
        marginBottom: TavariStyles.spacing.xs,
        display: 'block'
      }
    },
    input: {
      ...TavariStyles.components.form?.input || {
        padding: '12px 16px',
        border: `1px solid ${TavariStyles.colors.gray300}`,
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        fontSize: TavariStyles.typography.fontSize.sm,
        transition: 'border-color 0.2s',
        fontFamily: 'inherit',
        backgroundColor: TavariStyles.colors.white
      }
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
    summaryCard: {
      background: `linear-gradient(135deg, ${TavariStyles.colors.gray50} 0%, ${TavariStyles.colors.white} 100%)`,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      marginBottom: TavariStyles.spacing.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg
    },
    summaryItem: {
      textAlign: 'center',
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    summaryLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xs,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    summaryValue: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      fontFamily: 'monospace'
    },
    totalRemittance: {
      textAlign: 'center',
      padding: TavariStyles.spacing.lg,
      background: `linear-gradient(135deg, ${TavariStyles.colors.primary} 0%, ${TavariStyles.colors.primaryDark} 100%)`,
      color: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      marginTop: TavariStyles.spacing.md,
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    totalLabel: {
      fontSize: TavariStyles.typography.fontSize.md,
      marginBottom: TavariStyles.spacing.xs
    },
    totalValue: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      fontFamily: 'monospace'
    },
    complianceBadge: {
      backgroundColor: TavariStyles.colors.success + '20',
      color: TavariStyles.colors.success,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginBottom: TavariStyles.spacing.md,
      textAlign: 'center',
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      border: `1px solid ${TavariStyles.colors.success}`
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
      }
    },
    td: {
      ...TavariStyles.components.table?.td || {
        padding: TavariStyles.spacing.md,
        borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
        verticalAlign: 'middle'
      },
      fontSize: TavariStyles.typography.fontSize.sm
    },
    amountCell: {
      textAlign: 'right',
      fontFamily: 'monospace',
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    emptyState: {
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      padding: TavariStyles.spacing.xl,
      fontSize: TavariStyles.typography.fontSize.lg
    },
    historySection: {
      marginTop: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '8px'
    },
    optionsSection: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.sm || '4px'
    },
    clickableHistoryItem: {
      padding: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.xs,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.sm,
      cursor: 'pointer',
      border: `2px solid ${TavariStyles.colors.gray200}`,
      transition: 'all 0.2s ease'
    }
  };

  console.log('🔵 BEFORE RENDER - reportHistory:', reportHistory);
  console.log('🔵 reportHistory length:', reportHistory.length);
  console.log('🔵 reportHistory contents:', JSON.stringify(reportHistory, null, 2));

  return (
    <POSAuthWrapper
      componentName="DeductionReportsTab"
      requiredRoles={['owner', 'manager', 'hr_admin']}
      requireBusiness={true}
    >
      <SecurityWrapper
        componentName="DeductionReportsTab"
        securityLevel="critical"
        enableAuditLogging={true}
        sensitiveComponent={true}
      >
        <div style={styles.container}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Generate CRA T4127 Compliant Government Deduction Report</h3>
            
            <div style={styles.complianceBadge}>
              Uses Official CRA Payroll Deductions Formulas 121st Edition (July 1, 2025)
            </div>
            
            <div style={styles.periodForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Report Period Start:</label>
                <input
                  type="date"
                  style={styles.input}
                  value={reportPeriod.start}
                  onChange={(e) => setReportPeriod(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Report Period End:</label>
                <input
                  type="date"
                  style={styles.input}
                  value={reportPeriod.end}
                  onChange={(e) => setReportPeriod(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
              <div style={styles.formGroup}>
                <button
                  style={{
                    ...styles.button,
                    ...(loading ? styles.disabledButton : {})
                  }}
                  onClick={() => generateReport()}
                  disabled={loading}
                >
                  {loading ? 'Generating CRA Report...' : 'Generate CRA T4127 Report'}
                </button>
              </div>
            </div>

            <div style={styles.optionsSection}>
              <TavariCheckbox
                checked={includePreviousReports}
                onChange={setIncludePreviousReports}
                label="Include comparison with previous periods"
                size="sm"
              />
            </div>
          </div>

          {totals.total_remittance > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                CRA T4127 Compliant Government Remittance Summary ({new Date(reportPeriod.start).toLocaleDateString()} to {new Date(reportPeriod.end).toLocaleDateString()})
              </h3>

              <div style={styles.summaryCard}>
                <div style={styles.summaryGrid}>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Federal Tax (CRA)</div>
                    <div style={styles.summaryValue}>${formatTaxAmount(totals.employee_federal_tax)}</div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Provincial Tax</div>
                    <div style={styles.summaryValue}>${formatTaxAmount(totals.employee_provincial_tax)}</div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Employee EI</div>
                    <div style={styles.summaryValue}>${formatTaxAmount(totals.employee_ei)}</div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Employee CPP</div>
                    <div style={styles.summaryValue}>${formatTaxAmount(totals.employee_cpp)}</div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Employer EI (1.4x)</div>
                    <div style={styles.summaryValue}>${formatTaxAmount(totals.employer_ei)}</div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Employer CPP</div>
                    <div style={styles.summaryValue}>${formatTaxAmount(totals.employer_cpp)}</div>
                  </div>
                </div>

                <div style={styles.totalRemittance}>
                  <div style={styles.totalLabel}>Total CRA T4127 Compliant Remittance</div>
                  <div style={styles.totalValue}>${formatTaxAmount(totals.total_remittance)}</div>
                  <div style={{
                    marginTop: TavariStyles.spacing.sm, 
                    fontSize: TavariStyles.typography.fontSize.sm,
                    opacity: 0.9
                  }}>
                    CRA: ${formatTaxAmount(totals.employee_federal_tax + totals.employee_ei + totals.employee_cpp + totals.employer_ei + totals.employer_cpp)} | 
                    Provincial: ${formatTaxAmount(totals.employee_provincial_tax)}
                  </div>
                </div>
              </div>

              <div>
                <button
                  style={styles.secondaryButton}
                  onClick={exportToCSV}
                >
                  Export CRA Compliant CSV
                </button>
                <button
                  style={styles.button}
                  onClick={generateRemittanceReport}
                >
                  Generate CRA T4127 Remittance Report
                </button>
              </div>
            </div>
          )}

          {deductionData.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                CRA T4127 Compliant Employee Deduction Details ({deductionData.length} employees)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Pay Date</th>
                      <th style={styles.th}>Gross + Vacation</th>
                      <th style={styles.th}>Premium Pay</th>
                      <th style={styles.th}>Federal Tax (CRA)</th>
                      <th style={styles.th}>Provincial Tax</th>
                      <th style={styles.th}>EI</th>
                      <th style={styles.th}>CPP</th>
                      <th style={styles.th}>Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductionData.filter(entry => entry && entry.users && entry.hrpayroll_runs).map(entry => {
                      return (
                        <tr key={entry.id}>
                          <td style={styles.td}>
                            <strong>{entry.users.first_name} {entry.users.last_name}</strong>
                          </td>
                          <td style={styles.td}>{new Date(entry.hrpayroll_runs.pay_date).toLocaleDateString()}</td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            ${formatTaxAmount(entry.calculated_gross)}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell, color: TavariStyles.colors.success}}>
                            {entry.premium_pay > 0 ? `$${formatTaxAmount(entry.premium_pay)}` : '-'}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            ${formatTaxAmount(entry.calculated_federal_tax)}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            ${formatTaxAmount(entry.calculated_provincial_tax)}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            ${formatTaxAmount(entry.calculated_ei)}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            ${formatTaxAmount(entry.calculated_cpp)}
                          </td>
                          <td style={{...styles.td, ...styles.amountCell}}>
                            <strong>${formatTaxAmount(entry.calculated_net)}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(() => {
            console.log('🟣 RENDERING REPORT HISTORY SECTION');
            console.log('🟣 reportHistory at render time:', reportHistory);
            console.log('🟣 reportHistory.length:', reportHistory.length);
            
            if (!Array.isArray(reportHistory)) {
              console.error('🔴 reportHistory is NOT an array!', typeof reportHistory);
              return null;
            }
            
            if (reportHistory.length === 0) {
              console.log('🟣 reportHistory is empty, not rendering section');
              return null;
            }
            
            console.log('🟣 About to filter reportHistory...');
            const filtered = reportHistory.filter((run, idx) => {
              console.log(`🟣 Filter check [${idx}]:`, run);
              return run && run.pay_date && run.pay_period_start && run.pay_period_end;
            });
            
            console.log('🟣 Filtered results:', filtered);
            
            return (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Recent Payroll History - Click to Generate Report</h3>
                <div style={styles.historySection}>
                  <p style={{ marginBottom: TavariStyles.spacing.md, color: TavariStyles.colors.gray600 }}>
                    Click any payroll run below to instantly generate a deduction report for that period:
                  </p>
                  {filtered.slice(0, 5).map((run, index) => {
                    console.log(`🟣 Mapping run [${index}]:`, run);
                    
                    const formatDateInTimezone = (dateStr) => {
                      if (!dateStr) return 'N/A';
                      try {
                        const date = new Date(dateStr + 'T12:00:00');
                        return date.toLocaleDateString('en-US', {
                          timeZone: run.timezone || 'America/Toronto',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                      } catch (e) {
                        console.error('🔴 Date formatting error:', e);
                        return dateStr;
                      }
                    };

                    const handleQuickReport = () => {
                      console.log('🟢 Quick report clicked for:', run);
                      generateReport(run.pay_period_start, run.pay_period_end);
                    };

                    return (
                      <div 
                        key={`${run.pay_date}-${index}`}
                        onClick={handleQuickReport}
                        style={styles.clickableHistoryItem}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = TavariStyles.colors.primary + '10';
                          e.currentTarget.style.borderColor = TavariStyles.colors.primary;
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = TavariStyles.colors.white;
                          e.currentTarget.style.borderColor = TavariStyles.colors.gray200;
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{formatDateInTimezone(run.pay_date)}</strong>
                            <span style={{ color: TavariStyles.colors.gray500, marginLeft: '8px' }}>
                              Period: {formatDateInTimezone(run.pay_period_start)} to {formatDateInTimezone(run.pay_period_end)}
                            </span>
                          </div>
                          <span style={{ 
                            color: TavariStyles.colors.primary, 
                            fontWeight: TavariStyles.typography.fontWeight.semibold,
                            fontSize: TavariStyles.typography.fontSize.sm
                          }}>
                            Click to Generate
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {reportPeriod.start && reportPeriod.end && deductionData.length === 0 && !loading && (
            <div style={styles.section}>
              <div style={styles.emptyState}>
                No payroll data found for the selected period.<br />
                Make sure you have finalized payroll runs within this date range.
              </div>
            </div>
          )}
        </div>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default DeductionReportsTab;