// src/components/Reports/DiscountUsageReport.jsx
import React from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const DiscountUsageReport = ({ 
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

  // Calculate discount metrics from sales data
  const totalDiscountAmount = data.rawData?.sales?.reduce((sum, sale) => {
    const itemDiscounts = Number(sale.discount) || 0;
    const loyaltyDiscounts = Number(sale.loyalty_discount) || 0;
    return sum + itemDiscounts + loyaltyDiscounts;
  }, 0) || 0;

  const discountRate = data.salesTotals > 0 ? (totalDiscountAmount / (data.salesTotals + totalDiscountAmount) * 100) : 0;
  const avgDiscountPerTransaction = data.totalTransactions > 0 ? (totalDiscountAmount / data.totalTransactions) : 0;
  
  // Calculate transactions with discounts
  const transactionsWithDiscounts = data.rawData?.sales?.filter(sale => {
    const itemDiscounts = Number(sale.discount) || 0;
    const loyaltyDiscounts = Number(sale.loyalty_discount) || 0;
    return (itemDiscounts + loyaltyDiscounts) > 0;
  }).length || 0;

  const discountPenetration = data.totalTransactions > 0 ? (transactionsWithDiscounts / data.totalTransactions * 100) : 0;

  // Group discounts by type
  const discountByType = {
    itemDiscounts: 0,
    loyaltyDiscounts: 0
  };

  data.rawData?.sales?.forEach(sale => {
    discountByType.itemDiscounts += Number(sale.discount) || 0;
    discountByType.loyaltyDiscounts += Number(sale.loyalty_discount) || 0;
  });

  // Group discounts by employee
  const discountsByEmployee = {};
  data.rawData?.sales?.forEach(sale => {
    const userId = sale.user_id;
    const totalSaleDiscounts = (Number(sale.discount) || 0) + (Number(sale.loyalty_discount) || 0);
    
    if (totalSaleDiscounts > 0) {
      if (!discountsByEmployee[userId]) {
        const employee = employees.find(e => e.id === userId);
        discountsByEmployee[userId] = {
          id: userId,
          name: employee ? (employee.full_name || employee.email) : 'Unknown',
          discountCount: 0,
          discountAmount: 0,
          transactionCount: 0
        };
      }
      discountsByEmployee[userId].discountCount += 1;
      discountsByEmployee[userId].discountAmount += totalSaleDiscounts;
    }
    
    // Count all transactions for this employee to calculate their discount rate
    if (!discountsByEmployee[userId]) {
      const employee = employees.find(e => e.id === userId);
      discountsByEmployee[userId] = {
        id: userId,
        name: employee ? (employee.full_name || employee.email) : 'Unknown',
        discountCount: 0,
        discountAmount: 0,
        transactionCount: 0
      };
    }
    discountsByEmployee[userId].transactionCount += 1;
  });

  // Calculate discount rates for employees
  Object.values(discountsByEmployee).forEach(emp => {
    emp.discountRate = emp.transactionCount > 0 ? (emp.discountCount / emp.transactionCount * 100) : 0;
  });

  const employeeDiscountStats = Object.values(discountsByEmployee)
    .filter(emp => emp.discountAmount > 0)
    .sort((a, b) => b.discountAmount - a.discountAmount);

  // Group discounts by hour
  const discountsByHour = {};
  data.rawData?.sales?.forEach(sale => {
    const hour = new Date(sale.created_at).getHours();
    const totalSaleDiscounts = (Number(sale.discount) || 0) + (Number(sale.loyalty_discount) || 0);
    if (totalSaleDiscounts > 0) {
      discountsByHour[hour] = (discountsByHour[hour] || 0) + totalSaleDiscounts;
    }
  });

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Discount Usage Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += "SUMMARY METRICS\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total Discount Amount,${formatCurrency(totalDiscountAmount)}\n`;
      csvContent += `Total Sales (Gross),${formatCurrency(data.salesTotals + totalDiscountAmount)}\n`;
      csvContent += `Discount Rate,${formatPercentage(discountRate)}\n`;
      csvContent += `Transactions with Discounts,${transactionsWithDiscounts}\n`;
      csvContent += `Discount Penetration,${formatPercentage(discountPenetration)}\n`;
      csvContent += `Average Discount per Transaction,${formatCurrency(avgDiscountPerTransaction)}\n\n`;
      
      csvContent += "DISCOUNT BREAKDOWN\n";
      csvContent += "Type,Amount,Percentage\n";
      csvContent += `Item Discounts,${formatCurrency(discountByType.itemDiscounts)},${totalDiscountAmount > 0 ? formatPercentage((discountByType.itemDiscounts / totalDiscountAmount) * 100) : '0.0%'}\n`;
      csvContent += `Loyalty Discounts,${formatCurrency(discountByType.loyaltyDiscounts)},${totalDiscountAmount > 0 ? formatPercentage((discountByType.loyaltyDiscounts / totalDiscountAmount) * 100) : '0.0%'}\n\n`;
      
      if (employeeDiscountStats.length > 0) {
        csvContent += "DISCOUNTS BY EMPLOYEE\n";
        csvContent += "Employee,Discount Count,Discount Amount,Discount Rate\n";
        employeeDiscountStats.forEach(emp => {
          csvContent += `${emp.name},${emp.discountCount},${emp.discountAmount.toFixed(2)},${emp.discountRate.toFixed(1)}%\n`;
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
    subject: `Discount Usage Report - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Discount Usage Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
Generated: ${new Date().toLocaleString()}

SUMMARY METRICS:
- Total Discount Amount: ${formatCurrency(totalDiscountAmount)}
- Discount Rate: ${formatPercentage(discountRate)}
- Transactions with Discounts: ${transactionsWithDiscounts} of ${data.totalTransactions}
- Discount Penetration: ${formatPercentage(discountPenetration)}
- Average Discount per Transaction: ${formatCurrency(avgDiscountPerTransaction)}

DISCOUNT BREAKDOWN:
- Item Discounts: ${formatCurrency(discountByType.itemDiscounts)}
- Loyalty Discounts: ${formatCurrency(discountByType.loyaltyDiscounts)}

${employeeDiscountStats.length > 0 ? `
TOP DISCOUNT USERS:
${employeeDiscountStats.slice(0, 5).map(emp => 
  `• ${emp.name}: ${emp.discountCount} uses (${formatCurrency(emp.discountAmount)}) - ${formatPercentage(emp.discountRate)} rate`
).join('\n')}
` : ''}

This report helps track discount usage patterns and identify training opportunities.
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
      onExport(content, format, 'discount-usage');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'discount-usage');
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
    
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg
    },
    
    metricCard: {
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.orange50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.orange200}`,
      textAlign: 'center'
    },
    
    metricValue: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.orange700,
      marginBottom: TavariStyles.spacing.xs
    },
    
    metricLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.orange600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    typeBreakdown: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg
    },
    
    typeCard: {
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.yellow50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.yellow200}`
    },
    
    typeTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.yellow800,
      marginBottom: TavariStyles.spacing.sm
    },
    
    typeAmount: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.yellow700
    },
    
    typePercentage: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.yellow600,
      marginTop: TavariStyles.spacing.xs
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
      gridTemplateColumns: '1fr auto auto auto',
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
      color: TavariStyles.colors.warning
    },
    
    employeeRate: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
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
      color: TavariStyles.colors.warning
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

  const hasDiscountData = totalDiscountAmount > 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Discount Usage Report</h3>
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
          <div style={styles.metricValue}>{formatCurrency(totalDiscountAmount)}</div>
          <div style={styles.metricLabel}>Total Discounts</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{formatPercentage(discountRate)}</div>
          <div style={styles.metricLabel}>Discount Rate</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{transactionsWithDiscounts}</div>
          <div style={styles.metricLabel}>Discounted Transactions</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{formatPercentage(discountPenetration)}</div>
          <div style={styles.metricLabel}>Discount Penetration</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{formatCurrency(avgDiscountPerTransaction)}</div>
          <div style={styles.metricLabel}>Avg Discount/Transaction</div>
        </div>
      </div>

      {!hasDiscountData ? (
        <div style={styles.noDataMessage}>
          No discounts were applied during the selected period.
          This could indicate strong full-price sales or limited discount usage.
        </div>
      ) : (
        <>
          {/* Discount Type Breakdown */}
          <div style={styles.typeBreakdown}>
            <div style={styles.typeCard}>
              <div style={styles.typeTitle}>Item Discounts</div>
              <div style={styles.typeAmount}>{formatCurrency(discountByType.itemDiscounts)}</div>
              <div style={styles.typePercentage}>
                {totalDiscountAmount > 0 ? formatPercentage((discountByType.itemDiscounts / totalDiscountAmount) * 100) : '0.0%'} of total discounts
              </div>
            </div>
            <div style={styles.typeCard}>
              <div style={styles.typeTitle}>Loyalty Discounts</div>
              <div style={styles.typeAmount}>{formatCurrency(discountByType.loyaltyDiscounts)}</div>
              <div style={styles.typePercentage}>
                {totalDiscountAmount > 0 ? formatPercentage((discountByType.loyaltyDiscounts / totalDiscountAmount) * 100) : '0.0%'} of total discounts
              </div>
            </div>
          </div>

          {/* Employee Discount Usage */}
          {employeeDiscountStats.length > 0 && (
            <div style={styles.employeeSection}>
              <h4 style={styles.sectionTitle}>Discount Usage by Employee</h4>
              <div style={styles.employeeList}>
                {employeeDiscountStats.map((emp, index) => (
                  <div key={index} style={styles.employeeItem}>
                    <div style={styles.employeeName}>{emp.name}</div>
                    <div style={styles.employeeCount}>{emp.discountCount} uses</div>
                    <div style={styles.employeeAmount}>{formatCurrency(emp.discountAmount)}</div>
                    <div style={styles.employeeRate}>{formatPercentage(emp.discountRate)} rate</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly Discount Pattern */}
          {Object.keys(discountsByHour).length > 0 && (
            <div style={styles.hourlySection}>
              <h4 style={styles.sectionTitle}>Discount Usage by Hour</h4>
              <div style={styles.hourlyGrid}>
                {Array.from({length: 24}, (_, hour) => {
                  const amount = discountsByHour[hour] || 0;
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

export default DiscountUsageReport;