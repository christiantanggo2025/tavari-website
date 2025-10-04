// components/HR/HRPayrollComponents/EETRT-ReportGenerator.js
import { TavariStyles } from '../../../utils/TavariStyles';

export const EETRT_generateReportHTML = (calculatedData, reportConfig, businessData, formatTaxAmount) => {
  const { employee, roeData, t4Data, payPeriodBreakdown, calculationPeriod, paymentFrequency } = calculatedData;
  
  const PAYMENT_FREQUENCIES = {
    'weekly': { label: 'Weekly (52 periods/year)', periods: 52 },
    'bi_weekly': { label: 'Bi-Weekly (26 periods/year)', periods: 26 },
    'semi_monthly': { label: 'Semi-Monthly (24 periods/year)', periods: 24 },
    'monthly': { label: 'Monthly (12 periods/year)', periods: 12 }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Employee Tax & Separation Report - ${employee.fullName}</title>
      <meta charset="UTF-8">
      <style>
        @page { size: 8.5in 11in; margin: 0.5in; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; line-height: 1.4; color: #333; font-size: 11px; }
        .header { text-align: center; border-bottom: 3px solid ${TavariStyles.colors.primary}; padding-bottom: 15px; margin-bottom: 20px; }
        .company-name { font-size: 18px; font-weight: bold; color: ${TavariStyles.colors.primary}; margin-bottom: 5px; }
        .report-title { font-size: 14px; margin: 8px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; }
        .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .section { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 15px; }
        .section-title { font-size: 13px; font-weight: bold; color: ${TavariStyles.colors.primary}; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .data-row { display: flex; justify-content: space-between; margin-bottom: 5px; padding: 3px 0; }
        .data-label { font-weight: 600; color: #495057; }
        .data-value { color: #212529; font-weight: 500; }
        .highlight { background: #fff3cd; padding: 2px 6px; border-radius: 4px; border: 1px solid #ffeaa7; }
        .frequency-info { background: #e3f2fd; border: 1px solid #2196f3; border-radius: 6px; padding: 10px; margin-bottom: 15px; }
        .table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
        .table th, .table td { padding: 6px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .table th { background: #f8f9fa; font-weight: bold; font-size: 9px; text-transform: uppercase; }
        .table .amount { text-align: right; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${businessData?.name || 'Tavari Business'}</div>
        <div class="report-title">Employee Tax & Separation Report</div>
        <div style="font-size: 12px; margin-top: 5px;">
          Generated on ${new Date().toLocaleDateString()} | Report Period: ${calculationPeriod.startDate} to ${calculationPeriod.endDate}
        </div>
      </div>

      <div class="frequency-info">
        <div class="section-title">Payment Frequency Information</div>
        <div class="data-row">
          <span class="data-label">Effective Frequency:</span>
          <span class="data-value">${PAYMENT_FREQUENCIES[paymentFrequency.effective]?.label}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Pay Periods/Year:</span>
          <span class="data-value">${paymentFrequency.periodsPerYear}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Detection Method:</span>
          <span class="data-value">${paymentFrequency.isOverridden ? 'Manual Override' : `Auto-Detected (${paymentFrequency.confidence}% confidence)`}</span>
        </div>
      </div>

      <div class="two-column">
        <div class="section">
          <div class="section-title">Employee Information</div>
          <div class="data-row">
            <span class="data-label">Full Name:</span>
            <span class="data-value">${employee.fullName}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Employee Number:</span>
            <span class="data-value">${employee.employeeNumber || 'N/A'}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Email:</span>
            <span class="data-value">${employee.email || 'Not provided'}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Hire Date:</span>
            <span class="data-value">${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Separation Information</div>
          <div class="data-row">
            <span class="data-label">Last Day Worked:</span>
            <span class="data-value highlight">${reportConfig.lastDayWorked ? new Date(reportConfig.lastDayWorked).toLocaleDateString() : 'Not specified'}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Separation Reason:</span>
            <span class="data-value">${reportConfig.separationReason || 'Not specified'}</span>
          </div>
        </div>
      </div>

      ${roeData ? `
      <div class="section">
        <div class="section-title">ROE Summary (Last ${roeData.payPeriods} Pay Periods)</div>
        <div class="two-column">
          <div>
            <div class="data-row">
              <span class="data-label">Total Insurable Earnings:</span>
              <span class="data-value highlight">${formatTaxAmount ? formatTaxAmount(roeData.totalInsurableEarnings) : roeData.totalInsurableEarnings.toFixed(2)}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Total Hours Worked:</span>
              <span class="data-value">${roeData.totalHours.toFixed(2)} hours</span>
            </div>
          </div>
          <div>
            <div class="data-row">
              <span class="data-label">Average Weekly Earnings:</span>
              <span class="data-value highlight">${formatTaxAmount ? formatTaxAmount(roeData.averageWeeklyEarnings) : roeData.averageWeeklyEarnings.toFixed(2)}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Pay Periods Used:</span>
              <span class="data-value">${roeData.payPeriods} periods</span>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">T4 Tax Summary (${calculationPeriod.type.replace('_', ' ').toUpperCase()})</div>
        <div class="two-column">
          <div>
            <div class="data-row">
              <span class="data-label">Employment Income (Box 14):</span>
              <span class="data-value highlight">${formatTaxAmount ? formatTaxAmount(t4Data.box14_employmentIncome) : t4Data.box14_employmentIncome.toFixed(2)}</span>
            </div>
            <div class="data-row">
              <span class="data-label">CPP Contributions (Box 16):</span>
              <span class="data-value">${formatTaxAmount ? formatTaxAmount(t4Data.box16_cppContributions) : t4Data.box16_cppContributions.toFixed(2)}</span>
            </div>
            <div class="data-row">
              <span class="data-label">EI Premiums (Box 18):</span>
              <span class="data-value">${formatTaxAmount ? formatTaxAmount(t4Data.box18_eiPremiums) : t4Data.box18_eiPremiums.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <div class="data-row">
              <span class="data-label">Income Tax (Box 22):</span>
              <span class="data-value">${formatTaxAmount ? formatTaxAmount(t4Data.box22_incomeTax) : t4Data.box22_incomeTax.toFixed(2)}</span>
            </div>
            <div class="data-row">
              <span class="data-label">EI Insurable Earnings (Box 24):</span>
              <span class="data-value">${formatTaxAmount ? formatTaxAmount(t4Data.box24_eiInsurableEarnings) : t4Data.box24_eiInsurableEarnings.toFixed(2)}</span>
            </div>
            <div class="data-row">
              <span class="data-label">CPP Pensionable Earnings (Box 26):</span>
              <span class="data-value">${formatTaxAmount ? formatTaxAmount(t4Data.box26_cppPensionableEarnings) : t4Data.box26_cppPensionableEarnings.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- HARD CODED 53 PERIODS -->
      <div class="section">
        <div class="section-title">ROE Pay Period Breakdown (Last 53 Periods)</div>
        <table class="table">
          <thead>
            <tr>
              <th>Period #</th>
              <th>Pay Date</th>
              <th>Period Start</th>
              <th>Period End</th>
              <th>Regular Hours</th>
              <th>OT Hours</th>
              <th>Gross Pay</th>
              <th>Vacation Pay</th>
              <th>Premium Pay</th>
              <th>Insurable Earnings</th>
            </tr>
          </thead>
          <tbody>
            ${payPeriodBreakdown.slice(0, 53).map((period, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${new Date(period.payDate).toLocaleDateString()}</td>
                <td>${new Date(period.weekStart).toLocaleDateString()}</td>
                <td>${new Date(period.weekEnd).toLocaleDateString()}</td>
                <td class="amount">${(period.hours - (period.overtimeHours || 0)).toFixed(2)}</td>
                <td class="amount">${(period.overtimeHours || 0).toFixed(2)}</td>
                <td class="amount">${formatTaxAmount ? formatTaxAmount(period.grossEarnings - period.vacationPay - period.premiumPay) : (period.grossEarnings - period.vacationPay - period.premiumPay).toFixed(2)}</td>
                <td class="amount">${formatTaxAmount ? formatTaxAmount(period.vacationPay) : period.vacationPay.toFixed(2)}</td>
                <td class="amount">${formatTaxAmount ? formatTaxAmount(period.premiumPay) : period.premiumPay.toFixed(2)}</td>
                <td class="amount highlight">${formatTaxAmount ? formatTaxAmount(period.insurableEarnings) : period.insurableEarnings.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8f9fa; font-weight: bold; border-top: 2px solid ${TavariStyles.colors.primary};">
              <td colspan="4">TOTALS (53 Periods):</td>
              <td class="amount">${payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + (p.hours - (p.overtimeHours || 0)), 0).toFixed(2)}</td>
              <td class="amount">${payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + (p.overtimeHours || 0), 0).toFixed(2)}</td>
              <td class="amount">${formatTaxAmount ? formatTaxAmount(payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + (p.grossEarnings - p.vacationPay - p.premiumPay), 0)) : payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + (p.grossEarnings - p.vacationPay - p.premiumPay), 0).toFixed(2)}</td>
              <td class="amount">${formatTaxAmount ? formatTaxAmount(payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + p.vacationPay, 0)) : payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + p.vacationPay, 0).toFixed(2)}</td>
              <td class="amount">${formatTaxAmount ? formatTaxAmount(payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + p.premiumPay, 0)) : payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + p.premiumPay, 0).toFixed(2)}</td>
              <td class="amount highlight">${formatTaxAmount ? formatTaxAmount(payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + p.insurableEarnings, 0)) : payPeriodBreakdown.slice(0, 53).reduce((sum, p) => sum + p.insurableEarnings, 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top: 10px; font-size: 10px; color: #666;">
          * Insurable Earnings are capped at $1,263 per week (2025 EI maximum)
          <br>* This table shows the exact 53 pay periods that would be reported on the ROE
        </div>
      </div>

      <div style="margin-top: 20px; font-size: 10px; color: #666; text-align: center;">
        Generated by Tavari Payroll System - CRA T4127 Compliant | ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
        <br>Payment Frequency: ${PAYMENT_FREQUENCIES[paymentFrequency.effective]?.label} ${paymentFrequency.isOverridden ? '(Manual Override)' : '(Auto-Detected)'}
      </div>
    </body>
    </html>
  `;
};