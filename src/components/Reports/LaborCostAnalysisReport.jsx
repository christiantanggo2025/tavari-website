// src/components/Reports/LaborCostAnalysisReport.jsx
import React, { useState } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const LaborCostAnalysisReport = ({ 
  data, 
  dateRange, 
  customDateStart, 
  customDateEnd, 
  compareToLastYear, 
  selectedEmployee,
  employees,
  onExport,
  onEmail 
}) => {
  
  const [laborSettings, setLaborSettings] = useState({
    averageHourlyWage: 18.50, // Default hourly wage
    overtimeMultiplier: 1.5, // Time and a half for overtime
    benefitsPercentage: 25, // 25% of wages for benefits
    taxesPercentage: 15, // 15% for payroll taxes
    estimatedHoursPerTransaction: 0.15 // 9 minutes per transaction
  });

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercentage = (percent) => `${(percent || 0).toFixed(1)}%`;
  const formatHours = (hours) => `${(hours || 0).toFixed(1)}h`;

  // Calculate labor costs based on transaction data
  const calculateLaborCosts = () => {
    if (!data.employeeStats || data.employeeStats.length === 0) {
      return {
        totalEstimatedHours: 0,
        totalWageCost: 0,
        totalBenefitsCost: 0,
        totalTaxesCost: 0,
        totalLaborCost: 0,
        laborCostPerTransaction: 0,
        laborCostPercentage: 0,
        employeeLaborBreakdown: []
      };
    }

    let totalEstimatedHours = 0;
    let totalWageCost = 0;

    const employeeLaborBreakdown = data.employeeStats.map(employee => {
      const estimatedHours = employee.transactions * laborSettings.estimatedHoursPerTransaction;
      const wageCost = estimatedHours * laborSettings.averageHourlyWage;
      const benefitsCost = wageCost * (laborSettings.benefitsPercentage / 100);
      const taxesCost = wageCost * (laborSettings.taxesPercentage / 100);
      const totalEmployeeCost = wageCost + benefitsCost + taxesCost;
      
      totalEstimatedHours += estimatedHours;
      totalWageCost += wageCost;

      return {
        ...employee,
        estimatedHours,
        wageCost,
        benefitsCost,
        taxesCost,
        totalLaborCost: totalEmployeeCost,
        laborCostPerTransaction: employee.transactions > 0 ? totalEmployeeCost / employee.transactions : 0,
        efficiencyRatio: employee.revenue > 0 ? totalEmployeeCost / employee.revenue : 0
      };
    });

    const totalBenefitsCost = totalWageCost * (laborSettings.benefitsPercentage / 100);
    const totalTaxesCost = totalWageCost * (laborSettings.taxesPercentage / 100);
    const totalLaborCost = totalWageCost + totalBenefitsCost + totalTaxesCost;
    const laborCostPerTransaction = data.totalTransactions > 0 ? totalLaborCost / data.totalTransactions : 0;
    const laborCostPercentage = data.netSales > 0 ? (totalLaborCost / data.netSales) * 100 : 0;

    return {
      totalEstimatedHours,
      totalWageCost,
      totalBenefitsCost,
      totalTaxesCost,
      totalLaborCost,
      laborCostPerTransaction,
      laborCostPercentage,
      employeeLaborBreakdown: employeeLaborBreakdown.sort((a, b) => b.totalLaborCost - a.totalLaborCost)
    };
  };

  const laborData = calculateLaborCosts();

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Labor Cost Analysis Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `Average Hourly Wage,$${laborSettings.averageHourlyWage}\n`;
      csvContent += `Estimated Hours per Transaction,${laborSettings.estimatedHoursPerTransaction}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += "LABOR COST SETTINGS\n";
      csvContent += `Setting,Value\n`;
      csvContent += `Average Hourly Wage,$${laborSettings.averageHourlyWage}\n`;
      csvContent += `Benefits Percentage,${laborSettings.benefitsPercentage}%\n`;
      csvContent += `Taxes Percentage,${laborSettings.taxesPercentage}%\n`;
      csvContent += `Hours per Transaction,${laborSettings.estimatedHoursPerTransaction}\n\n`;
      
      csvContent += "EMPLOYEE LABOR BREAKDOWN\n";
      csvContent += "Employee,Transactions,Hours,Wage Cost,Benefits,Taxes,Total Labor Cost,Cost per Transaction,Efficiency Ratio\n";
      laborData.employeeLaborBreakdown.forEach(employee => {
        csvContent += `${employee.name},${employee.transactions},${employee.estimatedHours.toFixed(1)},${employee.wageCost.toFixed(2)},${employee.benefitsCost.toFixed(2)},${employee.taxesCost.toFixed(2)},${employee.totalLaborCost.toFixed(2)},${employee.laborCostPerTransaction.toFixed(2)},${(employee.efficiencyRatio * 100).toFixed(1)}%\n`;
      });
      
      csvContent += `\nSUMMARY\n`;
      csvContent += `Total Estimated Hours,${laborData.totalEstimatedHours.toFixed(1)}\n`;
      csvContent += `Total Labor Cost,${formatCurrency(laborData.totalLaborCost)}\n`;
      csvContent += `Labor Cost per Transaction,${formatCurrency(laborData.laborCostPerTransaction)}\n`;
      csvContent += `Labor Cost as % of Revenue,${formatPercentage(laborData.laborCostPercentage)}\n`;
      
      return csvContent;
    },
    
    excel: () => {
      return exportData.csv();
    },
    
    pdf: () => {
      return null;
    }
  };

  const emailContent = () => ({
    subject: `Labor Cost Analysis - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Labor Cost Analysis Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
Generated: ${new Date().toLocaleString()}

LABOR COST SUMMARY:
- Total Estimated Hours: ${formatHours(laborData.totalEstimatedHours)}
- Total Labor Cost: ${formatCurrency(laborData.totalLaborCost)}
- Labor Cost per Transaction: ${formatCurrency(laborData.laborCostPerTransaction)}
- Labor Cost as % of Revenue: ${formatPercentage(laborData.laborCostPercentage)}

TOP LABOR COSTS BY EMPLOYEE:
${laborData.employeeLaborBreakdown.slice(0, 5).map((employee, index) => 
  `${index + 1}. ${employee.name}: ${formatCurrency(employee.totalLaborCost)} (${formatHours(employee.estimatedHours)})`
).join('\n')}

SETTINGS USED:
- Average Hourly Wage: $${laborSettings.averageHourlyWage}
- Benefits: ${laborSettings.benefitsPercentage}% of wages
- Payroll Taxes: ${laborSettings.taxesPercentage}% of wages
- Estimated Hours per Transaction: ${laborSettings.estimatedHoursPerTransaction}

This analysis helps optimize staffing levels and labor cost management.
    `.trim()
  });

  const getDateRangeText = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return { start: today.toLocaleDateString(), end: today.toLocaleDateString() };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return { start: yesterday.toLocaleDateString(), end: yesterday.toLocaleDateString() };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart.toLocaleDateString(), end: today.toLocaleDateString() };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart.toLocaleDateString(), end: today.toLocaleDateString() };
      case 'custom':
        return { 
          start: customDateStart ? new Date(customDateStart).toLocaleDateString() : today.toLocaleDateString(),
          end: customDateEnd ? new Date(customDateEnd).toLocaleDateString() : today.toLocaleDateString()
        };
      default:
        return { start: today.toLocaleDateString(), end: today.toLocaleDateString() };
    }
  };

  const getEmployeeName = () => {
    if (selectedEmployee === 'all') return 'All Employees';
    const employee = employees.find(e => e.id === selectedEmployee);
    return employee ? (employee.full_name || employee.email) : 'Unknown Employee';
  };

  const handleExport = (format) => {
    const content = exportData[format]();
    if (content) {
      onExport(content, format, 'labor-analysis');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'labor-analysis');
  };

  const styles = {
    container: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg
    },
    
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.lg,
      paddingBottom: TavariStyles.spacing.md,
      borderBottom: `2px solid ${TavariStyles.colors.warning}`
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    
    actions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },
    
    actionButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.sm,
      fontSize: TavariStyles.typography.fontSize.xs
    },
    
    exportButton: {
      ...TavariStyles.components.button.variants.secondary
    },
    
    emailButton: {
      ...TavariStyles.components.button.variants.primary
    },

    settingsSection: {
      marginBottom: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.orange50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.orange200}`
    },

    settingsTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.orange900,
      marginBottom: TavariStyles.spacing.sm
    },

    settingsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: TavariStyles.spacing.md
    },

    settingsControl: {
      display: 'flex',
      flexDirection: 'column'
    },

    settingsLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.xs
    },

    settingsInput: {
      ...TavariStyles.components.form.input,
      fontSize: TavariStyles.typography.fontSize.sm
    },

    employeeGrid: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },

    employeeHeader: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
      gap: TavariStyles.spacing.sm,
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray200,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray700
    },
    
    employeeItem: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
      gap: TavariStyles.spacing.sm,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      alignItems: 'center',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    employeeName: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },
    
    employeeMetric: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      textAlign: 'center'
    },

    laborCostMetric: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.warning,
      textAlign: 'center'
    },

    efficiencyMetric: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      textAlign: 'center'
    },

    summarySection: {
      marginTop: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.yellow50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.yellow200}`
    },
    
    summaryTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.yellow900,
      marginBottom: TavariStyles.spacing.lg
    },
    
    summaryRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg
    },

    lastRow: {
      marginBottom: 0
    },
    
    summaryCard: {
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.yellow200}`,
      textAlign: 'center',
      boxShadow: TavariStyles.shadows.sm
    },

    summaryCardValue: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.yellow700,
      marginBottom: TavariStyles.spacing.sm,
      lineHeight: 1.2
    },

    summaryCardLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },

    noDataMessage: {
      textAlign: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Labor Cost Analysis</h3>
        <div style={styles.actions}>
          <button 
            style={{...styles.actionButton, ...styles.exportButton}}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </button>
          <button 
            style={{...styles.actionButton, ...styles.exportButton}}
            onClick={() => handleExport('excel')}
          >
            Export Excel
          </button>
          <button 
            style={{...styles.actionButton, ...styles.exportButton}}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </button>
          <button 
            style={{...styles.actionButton, ...styles.emailButton}}
            onClick={handleEmail}
          >
            Email Report
          </button>
        </div>
      </div>

      {/* Labor Settings Configuration */}
      <div style={styles.settingsSection}>
        <h4 style={styles.settingsTitle}>Labor Cost Calculation Settings</h4>
        
        <div style={styles.settingsGrid}>
          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Average Hourly Wage ($):</label>
            <input 
              type="number"
              step="0.25"
              style={styles.settingsInput}
              value={laborSettings.averageHourlyWage}
              onChange={(e) => setLaborSettings({...laborSettings, averageHourlyWage: Number(e.target.value)})}
              min="10"
              max="50"
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Benefits Percentage (%):</label>
            <input 
              type="number"
              style={styles.settingsInput}
              value={laborSettings.benefitsPercentage}
              onChange={(e) => setLaborSettings({...laborSettings, benefitsPercentage: Number(e.target.value)})}
              min="0"
              max="50"
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Payroll Taxes (%):</label>
            <input 
              type="number"
              style={styles.settingsInput}
              value={laborSettings.taxesPercentage}
              onChange={(e) => setLaborSettings({...laborSettings, taxesPercentage: Number(e.target.value)})}
              min="5"
              max="25"
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Hours per Transaction:</label>
            <input 
              type="number"
              step="0.01"
              style={styles.settingsInput}
              value={laborSettings.estimatedHoursPerTransaction}
              onChange={(e) => setLaborSettings({...laborSettings, estimatedHoursPerTransaction: Number(e.target.value)})}
              min="0.05"
              max="0.5"
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Overtime Multiplier:</label>
            <input 
              type="number"
              step="0.1"
              style={styles.settingsInput}
              value={laborSettings.overtimeMultiplier}
              onChange={(e) => setLaborSettings({...laborSettings, overtimeMultiplier: Number(e.target.value)})}
              min="1.0"
              max="2.0"
            />
          </div>
        </div>
      </div>

      {data.employeeStats && data.employeeStats.length > 0 ? (
        <>
          <div style={styles.employeeGrid}>
            <div style={styles.employeeHeader}>
              <div>Employee Name</div>
              <div style={{ textAlign: 'center' }}>Hours</div>
              <div style={{ textAlign: 'center' }}>Wage Cost</div>
              <div style={{ textAlign: 'center' }}>Benefits</div>
              <div style={{ textAlign: 'center' }}>Taxes</div>
              <div style={{ textAlign: 'center' }}>Total Labor Cost</div>
              <div style={{ textAlign: 'center' }}>Efficiency %</div>
            </div>
            
            {laborData.employeeLaborBreakdown.map((employee, index) => {
              const efficiencyColor = employee.efficiencyRatio <= 0.3 ? TavariStyles.colors.success :
                                    employee.efficiencyRatio <= 0.4 ? TavariStyles.colors.warning :
                                    TavariStyles.colors.danger;
              
              return (
                <div key={employee.id || index} style={styles.employeeItem}>
                  <div style={styles.employeeName}>{employee.name}</div>
                  <div style={styles.employeeMetric}>{formatHours(employee.estimatedHours)}</div>
                  <div style={styles.employeeMetric}>{formatCurrency(employee.wageCost)}</div>
                  <div style={styles.employeeMetric}>{formatCurrency(employee.benefitsCost)}</div>
                  <div style={styles.employeeMetric}>{formatCurrency(employee.taxesCost)}</div>
                  <div style={styles.laborCostMetric}>{formatCurrency(employee.totalLaborCost)}</div>
                  <div style={{
                    ...styles.efficiencyMetric,
                    color: efficiencyColor
                  }}>
                    {formatPercentage(employee.efficiencyRatio * 100)}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.summarySection}>
            <h4 style={styles.summaryTitle}>Labor Cost Summary</h4>
            
            <div style={styles.summaryRow}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{formatHours(laborData.totalEstimatedHours)}</div>
                <div style={styles.summaryCardLabel}>Total Hours</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{formatCurrency(laborData.totalLaborCost)}</div>
                <div style={styles.summaryCardLabel}>Total Labor Cost</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{formatPercentage(laborData.laborCostPercentage)}</div>
                <div style={styles.summaryCardLabel}>% of Revenue</div>
              </div>
            </div>

            <div style={{...styles.summaryRow, ...styles.lastRow}}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{formatCurrency(laborData.laborCostPerTransaction)}</div>
                <div style={styles.summaryCardLabel}>Cost per Transaction</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{formatCurrency(laborData.totalWageCost)}</div>
                <div style={styles.summaryCardLabel}>Total Wages</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{formatCurrency(laborData.totalBenefitsCost + laborData.totalTaxesCost)}</div>
                <div style={styles.summaryCardLabel}>Benefits + Taxes</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={styles.noDataMessage}>
          No employee data found for labor cost analysis
        </div>
      )}
    </div>
  );
};

export default LaborCostAnalysisReport;