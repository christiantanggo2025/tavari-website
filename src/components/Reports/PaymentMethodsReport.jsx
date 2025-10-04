// src/components/Reports/PaymentMethodsReport.jsx
import React from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const PaymentMethodsReport = ({ 
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
      
      csvContent += "Payment Method Analysis Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += "Payment Method,Amount,Percentage of Total\n";
      data.paymentBreakdown.forEach(payment => {
        csvContent += `${payment.method},${payment.amount.toFixed(2)},${payment.percentage.toFixed(1)}%\n`;
      });
      
      csvContent += `\nTotal Sales,${formatCurrency(data.salesTotals)}\n`;
      csvContent += `Total Transactions,${data.totalTransactions}\n`;
      
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
    subject: `Payment Methods Report - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Payment Method Analysis Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
Generated: ${new Date().toLocaleString()}

PAYMENT METHOD BREAKDOWN:
${data.paymentBreakdown.map(payment => 
  `• ${payment.method}: ${formatCurrency(payment.amount)} (${formatPercentage(payment.percentage)})`
).join('\n')}

SUMMARY:
• Total Sales: ${formatCurrency(data.salesTotals)}
• Total Transactions: ${data.totalTransactions}

This report shows how customers paid for their purchases during the selected period.
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
      onExport(content, format, 'payment-methods');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'payment-methods');
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
    
    paymentMethodGrid: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.md
    },
    
    paymentMethodItem: {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto',
      gap: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      alignItems: 'center',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    paymentMethodName: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },
    
    paymentMethodAmount: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary
    },
    
    paymentMethodPercent: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    paymentMethodBar: {
      width: '100px',
      height: '8px',
      backgroundColor: TavariStyles.colors.gray200,
      borderRadius: TavariStyles.borderRadius.full,
      overflow: 'hidden'
    },
    
    paymentMethodBarFill: {
      height: '100%',
      backgroundColor: TavariStyles.colors.primary,
      transition: 'width 0.3s ease'
    },
    
    summarySection: {
      marginTop: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray100,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray300}`
    },
    
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: TavariStyles.spacing.sm
    },
    
    summaryItem: {
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
        <h3 style={styles.title}>Payment Method Analysis</h3>
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
      
      <div style={styles.paymentMethodGrid}>
        {data.paymentBreakdown.map((payment, index) => (
          <div key={index} style={styles.paymentMethodItem}>
            <div style={styles.paymentMethodName}>{payment.method}</div>
            <div style={styles.paymentMethodAmount}>{formatCurrency(payment.amount)}</div>
            <div style={styles.paymentMethodPercent}>{formatPercentage(payment.percentage)}</div>
            <div style={styles.paymentMethodBar}>
              <div 
                style={{
                  ...styles.paymentMethodBarFill,
                  width: `${Math.min(payment.percentage, 100)}%`
                }}
              />
            </div>
          </div>
        ))}
        
        {data.paymentBreakdown.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: TavariStyles.spacing.xl,
            color: TavariStyles.colors.gray500,
            fontStyle: 'italic'
          }}>
            No payment data found for this period
          </div>
        )}
      </div>

      <div style={styles.summarySection}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span>Total Sales:</span>
            <span>{formatCurrency(data.salesTotals)}</span>
          </div>
          <div style={styles.summaryItem}>
            <span>Total Transactions:</span>
            <span>{data.totalTransactions}</span>
          </div>
          <div style={styles.summaryItem}>
            <span>Payment Methods:</span>
            <span>{data.paymentBreakdown.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsReport;