// src/components/Reports/SalesSummaryReport.jsx
import React from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const SalesSummaryReport = ({ 
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

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Daily Sales Summary Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += "Metric,Value\n";
      csvContent += `Total Transactions,${data.totalTransactions}\n`;
      csvContent += `Gross Sales,${formatCurrency(data.salesTotals)}\n`;
      csvContent += `Total Refunds,${formatCurrency(data.refundTotals)}\n`;
      csvContent += `Net Sales,${formatCurrency(data.netSales)}\n`;
      csvContent += `Average Transaction,${formatCurrency(data.avgTransaction)}\n`;
      csvContent += `Tax Collected,${formatCurrency(data.taxBreakdown.totalTax)}\n`;
      
      if (compareToLastYear && data.comparisonData) {
        csvContent += "\nYear-over-Year Comparison\n";
        csvContent += `Last Year Sales,${formatCurrency(data.comparisonData.lastYearSales)}\n`;
        csvContent += `Growth,${formatPercentage(data.comparisonData.growth)}\n`;
        csvContent += `Difference,${formatCurrency(data.comparisonData.difference)}\n`;
      }
      
      return csvContent;
    },
    
    excel: () => {
      // Excel export logic would go here
      // For now, return CSV format
      return exportData.csv();
    },
    
    pdf: () => {
      // PDF export logic would go here
      return null;
    }
  };

  const emailContent = () => ({
    subject: `Sales Summary Report - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Sales Summary Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
Generated: ${new Date().toLocaleString()}

SUMMARY METRICS:
• Total Transactions: ${data.totalTransactions}
• Gross Sales: ${formatCurrency(data.salesTotals)}
• Total Refunds: ${formatCurrency(data.refundTotals)}
• Net Sales: ${formatCurrency(data.netSales)}
• Average Transaction: ${formatCurrency(data.avgTransaction)}
• Tax Collected: ${formatCurrency(data.taxBreakdown.totalTax)}

${compareToLastYear && data.comparisonData ? `
YEAR-OVER-YEAR COMPARISON:
• Last Year Sales: ${formatCurrency(data.comparisonData.lastYearSales)}
• Growth: ${formatPercentage(data.comparisonData.growth)}
• Difference: ${formatCurrency(data.comparisonData.difference)}
` : ''}

This report was generated automatically by the Tavari POS system.
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
      onExport(content, format, 'sales-summary');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'sales-summary');
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
      borderBottom: `2px solid ${TavariStyles.colors.primary}`
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
    
    reportGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md
    },
    
    reportItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    reportLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    reportValue: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    
    comparisonSection: {
      marginTop: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.blue50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.blue200}`
    },
    
    comparisonTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.blue900,
      marginBottom: TavariStyles.spacing.sm
    },
    
    comparisonGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: TavariStyles.spacing.sm
    },
    
    comparisonItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.sm
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Daily Sales Summary</h3>
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
      
      <div style={styles.reportGrid}>
        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Total Transactions:</span>
          <span style={styles.reportValue}>{data.totalTransactions}</span>
        </div>
        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Gross Sales:</span>
          <span style={styles.reportValue}>{formatCurrency(data.salesTotals)}</span>
        </div>
        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Refunds:</span>
          <span style={styles.reportValue}>{formatCurrency(data.refundTotals)}</span>
        </div>
        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Net Sales:</span>
          <span style={styles.reportValue}>{formatCurrency(data.netSales)}</span>
        </div>
        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Average Transaction:</span>
          <span style={styles.reportValue}>{formatCurrency(data.avgTransaction)}</span>
        </div>
        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Tax Collected:</span>
          <span style={styles.reportValue}>{formatCurrency(data.taxBreakdown.totalTax)}</span>
        </div>
      </div>

      {compareToLastYear && data.comparisonData && (
        <div style={styles.comparisonSection}>
          <h4 style={styles.comparisonTitle}>Year-over-Year Comparison</h4>
          <div style={styles.comparisonGrid}>
            <div style={styles.comparisonItem}>
              <span>Last Year Sales:</span>
              <span>{formatCurrency(data.comparisonData.lastYearSales)}</span>
            </div>
            <div style={styles.comparisonItem}>
              <span>Growth:</span>
              <span style={{
                color: data.comparisonData.growth >= 0 ? TavariStyles.colors.success : TavariStyles.colors.danger
              }}>
                {data.comparisonData.growth >= 0 ? '+' : ''}{formatPercentage(data.comparisonData.growth)}
              </span>
            </div>
            <div style={styles.comparisonItem}>
              <span>Difference:</span>
              <span style={{
                color: data.comparisonData.difference >= 0 ? TavariStyles.colors.success : TavariStyles.colors.danger
              }}>
                {formatCurrency(data.comparisonData.difference)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesSummaryReport;