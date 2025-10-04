// src/components/Reports/RefundsVoidsReport.jsx
import React from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const RefundsVoidsReport = ({ 
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
  
  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercentage = (percent) => `${(percent || 0).toFixed(1)}%`;

  // Calculate refund metrics
  const refundRate = data.salesTotals > 0 ? (data.refundTotals / data.salesTotals * 100) : 0;
  const avgRefundAmount = data.rawData?.refunds?.length > 0 ? 
    (data.refundTotals / data.rawData.refunds.length) : 0;

  // Group refunds by employee
  const refundsByEmployee = {};
  data.rawData?.refunds?.forEach(refund => {
    const userId = refund.refunded_by;
    if (!refundsByEmployee[userId]) {
      const employee = employees.find(e => e.id === userId);
      refundsByEmployee[userId] = {
        id: userId,
        name: employee ? (employee.full_name || employee.email) : 'Unknown',
        refundCount: 0,
        refundAmount: 0
      };
    }
    refundsByEmployee[userId].refundCount += 1;
    refundsByEmployee[userId].refundAmount += Number(refund.total_refund_amount) || 0;
  });

  const employeeRefundStats = Object.values(refundsByEmployee)
    .sort((a, b) => b.refundAmount - a.refundAmount);

  // Group refunds by hour for trend analysis
  const refundsByHour = {};
  data.rawData?.refunds?.forEach(refund => {
    const hour = new Date(refund.created_at).getHours();
    refundsByHour[hour] = (refundsByHour[hour] || 0) + (Number(refund.total_refund_amount) || 0);
  });

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Refunds & Voids Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += "SUMMARY METRICS\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total Refunds,${formatCurrency(data.refundTotals)}\n`;
      csvContent += `Total Sales,${formatCurrency(data.salesTotals)}\n`;
      csvContent += `Refund Rate,${formatPercentage(refundRate)}\n`;
      csvContent += `Number of Refunds,${data.rawData?.refunds?.length || 0}\n`;
      csvContent += `Average Refund Amount,${formatCurrency(avgRefundAmount)}\n\n`;
      
      if (employeeRefundStats.length > 0) {
        csvContent += "REFUNDS BY EMPLOYEE\n";
        csvContent += "Employee,Refund Count,Refund Amount\n";
        employeeRefundStats.forEach(emp => {
          csvContent += `${emp.name},${emp.refundCount},${emp.refundAmount.toFixed(2)}\n`;
        });
        csvContent += "\n";
      }
      
      if (data.rawData?.refunds?.length > 0) {
        csvContent += "INDIVIDUAL REFUNDS\n";
        csvContent += "Date,Time,Amount,Refunded By\n";
        data.rawData.refunds.forEach(refund => {
          const date = new Date(refund.created_at);
          const employee = employees.find(e => e.id === refund.refunded_by);
          csvContent += `${date.toLocaleDateString()},${date.toLocaleTimeString()},${(Number(refund.total_refund_amount) || 0).toFixed(2)},${employee ? (employee.full_name || employee.email) : 'Unknown'}\n`;
        });
      }
      
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
    subject: `Refunds & Voids Report - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Refunds & Voids Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
Generated: ${new Date().toLocaleString()}

SUMMARY METRICS:
- Total Refunds: ${formatCurrency(data.refundTotals)}
- Total Sales: ${formatCurrency(data.salesTotals)}
- Refund Rate: ${formatPercentage(refundRate)}
- Number of Refunds: ${data.rawData?.refunds?.length || 0}
- Average Refund: ${formatCurrency(avgRefundAmount)}

${employeeRefundStats.length > 0 ? `
TOP REFUND PROCESSORS:
${employeeRefundStats.slice(0, 5).map(emp => 
  `• ${emp.name}: ${emp.refundCount} refunds (${formatCurrency(emp.refundAmount)})`
).join('\n')}
` : ''}

This report helps track refund patterns and identify potential issues or training needs.
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
      onExport(content, format, 'refunds-voids');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'refunds-voids');
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
      borderBottom: `2px solid ${TavariStyles.colors.danger}`
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
    
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg
    },
    
    metricCard: {
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.red50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.red200}`,
      textAlign: 'center'
    },
    
    metricValue: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.red700,
      marginBottom: TavariStyles.spacing.xs
    },
    
    metricLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.red600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    employeeSection: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.md,
      paddingBottom: TavariStyles.spacing.sm,
      borderBottom: `1px solid ${TavariStyles.colors.gray300}`
    },
    
    employeeList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    
    employeeItem: {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      gap: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      alignItems: 'center'
    },
    
    employeeName: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },
    
    employeeCount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    employeeAmount: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.danger
    },
    
    hourlySection: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    hourlyGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
      gap: TavariStyles.spacing.sm
    },
    
    hourlyItem: {
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      textAlign: 'center',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    hourlyTime: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xs
    },
    
    hourlyAmount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.danger
    },
    
    noDataMessage: {
      textAlign: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic',
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    }
  };

  const hasRefundData = data.rawData?.refunds?.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Refunds & Voids Report</h3>
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
      
      {/* Summary Metrics */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{formatCurrency(data.refundTotals)}</div>
          <div style={styles.metricLabel}>Total Refunds</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{formatPercentage(refundRate)}</div>
          <div style={styles.metricLabel}>Refund Rate</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{data.rawData?.refunds?.length || 0}</div>
          <div style={styles.metricLabel}>Number of Refunds</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{formatCurrency(avgRefundAmount)}</div>
          <div style={styles.metricLabel}>Average Refund</div>
        </div>
      </div>

      {!hasRefundData ? (
        <div style={styles.noDataMessage}>
          No refunds or voids found for the selected period and filters.
          This is typically a good sign for business operations!
        </div>
      ) : (
        <>
          {/* Employee Refund Stats */}
          {employeeRefundStats.length > 0 && (
            <div style={styles.employeeSection}>
              <h4 style={styles.sectionTitle}>Refunds by Employee</h4>
              <div style={styles.employeeList}>
                {employeeRefundStats.map((emp, index) => (
                  <div key={index} style={styles.employeeItem}>
                    <div style={styles.employeeName}>{emp.name}</div>
                    <div style={styles.employeeCount}>{emp.refundCount} refunds</div>
                    <div style={styles.employeeAmount}>{formatCurrency(emp.refundAmount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly Breakdown */}
          {Object.keys(refundsByHour).length > 0 && (
            <div style={styles.hourlySection}>
              <h4 style={styles.sectionTitle}>Refunds by Hour</h4>
              <div style={styles.hourlyGrid}>
                {Array.from({length: 24}, (_, hour) => {
                  const amount = refundsByHour[hour] || 0;
                  return (
                    <div key={hour} style={styles.hourlyItem}>
                      <div style={styles.hourlyTime}>
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      <div style={styles.hourlyAmount}>
                        {amount > 0 ? formatCurrency(amount) : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RefundsVoidsReport;