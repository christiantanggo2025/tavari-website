// src/components/Reports/EmployeePerformanceReport.jsx
import React, { useState } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const EmployeePerformanceReport = ({ 
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
  
  const [performanceCriteria, setPerformanceCriteria] = useState({
    excellentThreshold: 150, // 150% of average
    aboveAverageThreshold: 120, // 120% of average
    averageThreshold: 80, // 80% of average
    belowAverageThreshold: 50, // 50% of average
    metric: 'revenue' // 'revenue' or 'transactions'
  });

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercentage = (percent) => `${(percent || 0).toFixed(1)}%`;

  const getPerformanceRating = (employee) => {
    if (!employee || !data.employeeStats.length) return 'N/A';
    
    const avgValue = performanceCriteria.metric === 'revenue' 
      ? data.netSales / data.employeeStats.length
      : data.totalTransactions / data.employeeStats.length;
    
    const employeeValue = performanceCriteria.metric === 'revenue' 
      ? employee.revenue 
      : employee.transactions;
    
    if (avgValue === 0) return 'N/A';
    
    const ratio = (employeeValue / avgValue) * 100;
    
    if (ratio >= performanceCriteria.excellentThreshold) return 'Excellent';
    if (ratio >= performanceCriteria.aboveAverageThreshold) return 'Above Average';
    if (ratio >= performanceCriteria.averageThreshold) return 'Average';
    if (ratio >= performanceCriteria.belowAverageThreshold) return 'Below Average';
    return 'Needs Improvement';
  };

  const getPerformanceColor = (rating) => {
    switch (rating) {
      case 'Excellent': return TavariStyles.colors.success;
      case 'Above Average': return TavariStyles.colors.blue500;
      case 'Average': return TavariStyles.colors.gray600;
      case 'Below Average': return TavariStyles.colors.warning;
      case 'Needs Improvement': return TavariStyles.colors.danger;
      default: return TavariStyles.colors.gray500;
    }
  };

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Employee Performance Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `Performance Metric,${performanceCriteria.metric === 'revenue' ? 'Revenue-Based' : 'Transaction-Based'}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += "Employee Name,Transactions,Revenue,Avg Transaction,Performance Rating\n";
      data.employeeStats.forEach(employee => {
        const avgTransaction = employee.transactions > 0 ? employee.revenue / employee.transactions : 0;
        csvContent += `${employee.name},${employee.transactions},${employee.revenue.toFixed(2)},${avgTransaction.toFixed(2)},${getPerformanceRating(employee)}\n`;
      });
      
      csvContent += `\nPerformance Criteria Used:\n`;
      csvContent += `Excellent,>= ${performanceCriteria.excellentThreshold}% of average\n`;
      csvContent += `Above Average,>= ${performanceCriteria.aboveAverageThreshold}% of average\n`;
      csvContent += `Average,>= ${performanceCriteria.averageThreshold}% of average\n`;
      csvContent += `Below Average,>= ${performanceCriteria.belowAverageThreshold}% of average\n`;
      csvContent += `Needs Improvement,< ${performanceCriteria.belowAverageThreshold}% of average\n`;
      
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
    subject: `Employee Performance Report - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Employee Performance Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
Performance Metric: ${performanceCriteria.metric === 'revenue' ? 'Revenue-Based' : 'Transaction-Based'}
Generated: ${new Date().toLocaleString()}

TOP PERFORMERS:
${data.employeeStats.slice(0, 5).map((employee, index) => 
  `${index + 1}. ${employee.name}: ${formatCurrency(employee.revenue)} (${employee.transactions} transactions) - ${getPerformanceRating(employee)}`
).join('\n')}

PERFORMANCE CRITERIA USED:
- Excellent: >= ${performanceCriteria.excellentThreshold}% of team average
- Above Average: >= ${performanceCriteria.aboveAverageThreshold}% of team average
- Average: >= ${performanceCriteria.averageThreshold}% of team average
- Below Average: >= ${performanceCriteria.belowAverageThreshold}% of team average
- Needs Improvement: < ${performanceCriteria.belowAverageThreshold}% of team average

This report shows individual employee sales performance and helps identify top performers and areas for improvement.
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
      onExport(content, format, 'employee-performance');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'employee-performance');
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

    criteriaSection: {
      marginBottom: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.purple50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.purple200}`
    },

    criteriaTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.purple900,
      marginBottom: TavariStyles.spacing.sm
    },

    criteriaGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.md
    },

    criteriaControl: {
      display: 'flex',
      flexDirection: 'column'
    },

    criteriaLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.xs
    },

    criteriaInput: {
      ...TavariStyles.components.form.input,
      fontSize: TavariStyles.typography.fontSize.sm
    },

    criteriaSelect: {
      ...TavariStyles.components.form.select,
      fontSize: TavariStyles.typography.fontSize.sm
    },

    criteriaLegend: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: TavariStyles.spacing.sm,
      marginTop: TavariStyles.spacing.sm
    },

    criteriaLegendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs,
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600
    },

    criteriaColorDot: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      flexShrink: 0
    },

    employeeGrid: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },

    employeeHeader: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
      gap: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray200,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray700
    },
    
    employeeItem: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
      gap: TavariStyles.spacing.md,
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

    employeeRevenueMetric: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      textAlign: 'center'
    },

    performanceRating: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.full,
      backgroundColor: TavariStyles.colors.white,
      textAlign: 'center',
      border: '2px solid'
    },

    summarySection: {
      marginTop: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.blue50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.blue200}`
    },
    
    summaryTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.blue900,
      marginBottom: TavariStyles.spacing.lg
    },
    
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: TavariStyles.spacing.lg
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
      border: `1px solid ${TavariStyles.colors.blue200}`,
      textAlign: 'center',
      boxShadow: TavariStyles.shadows.sm
    },

    summaryCardValue: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.blue700,
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
        <h3 style={styles.title}>Employee Sales Performance</h3>
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

      {/* Performance Criteria Configuration */}
      <div style={styles.criteriaSection}>
        <h4 style={styles.criteriaTitle}>Performance Evaluation Criteria</h4>
        
        <div style={styles.criteriaGrid}>
          <div style={styles.criteriaControl}>
            <label style={styles.criteriaLabel}>Performance Metric:</label>
            <select 
              style={styles.criteriaSelect}
              value={performanceCriteria.metric}
              onChange={(e) => setPerformanceCriteria({...performanceCriteria, metric: e.target.value})}
            >
              <option value="revenue">Based on Revenue</option>
              <option value="transactions">Based on Transaction Count</option>
            </select>
          </div>

          <div style={styles.criteriaControl}>
            <label style={styles.criteriaLabel}>Excellent Threshold (%):</label>
            <input 
              type="number"
              style={styles.criteriaInput}
              value={performanceCriteria.excellentThreshold}
              onChange={(e) => setPerformanceCriteria({...performanceCriteria, excellentThreshold: Number(e.target.value)})}
              min="100"
              max="300"
            />
          </div>

          <div style={styles.criteriaControl}>
            <label style={styles.criteriaLabel}>Above Average Threshold (%):</label>
            <input 
              type="number"
              style={styles.criteriaInput}
              value={performanceCriteria.aboveAverageThreshold}
              onChange={(e) => setPerformanceCriteria({...performanceCriteria, aboveAverageThreshold: Number(e.target.value)})}
              min="100"
              max="200"
            />
          </div>

          <div style={styles.criteriaControl}>
            <label style={styles.criteriaLabel}>Average Threshold (%):</label>
            <input 
              type="number"
              style={styles.criteriaInput}
              value={performanceCriteria.averageThreshold}
              onChange={(e) => setPerformanceCriteria({...performanceCriteria, averageThreshold: Number(e.target.value)})}
              min="50"
              max="100"
            />
          </div>

          <div style={styles.criteriaControl}>
            <label style={styles.criteriaLabel}>Below Average Threshold (%):</label>
            <input 
              type="number"
              style={styles.criteriaInput}
              value={performanceCriteria.belowAverageThreshold}
              onChange={(e) => setPerformanceCriteria({...performanceCriteria, belowAverageThreshold: Number(e.target.value)})}
              min="25"
              max="75"
            />
          </div>
        </div>

        <div style={styles.criteriaLegend}>
          <div style={styles.criteriaLegendItem}>
            <div style={{...styles.criteriaColorDot, backgroundColor: TavariStyles.colors.success}} />
            <span>Excellent (≥{performanceCriteria.excellentThreshold}% of avg)</span>
          </div>
          <div style={styles.criteriaLegendItem}>
            <div style={{...styles.criteriaColorDot, backgroundColor: TavariStyles.colors.blue500}} />
            <span>Above Average (≥{performanceCriteria.aboveAverageThreshold}% of avg)</span>
          </div>
          <div style={styles.criteriaLegendItem}>
            <div style={{...styles.criteriaColorDot, backgroundColor: TavariStyles.colors.gray600}} />
            <span>Average (≥{performanceCriteria.averageThreshold}% of avg)</span>
          </div>
          <div style={styles.criteriaLegendItem}>
            <div style={{...styles.criteriaColorDot, backgroundColor: TavariStyles.colors.warning}} />
            <span>Below Average (≥{performanceCriteria.belowAverageThreshold}% of avg)</span>
          </div>
          <div style={styles.criteriaLegendItem}>
            <div style={{...styles.criteriaColorDot, backgroundColor: TavariStyles.colors.danger}} />
            <span>Needs Improvement (&lt;{performanceCriteria.belowAverageThreshold}% of avg)</span>
          </div>
        </div>
      </div>

      {data.employeeStats && data.employeeStats.length > 0 ? (
        <>
          <div style={styles.employeeGrid}>
            <div style={styles.employeeHeader}>
              <div>Employee Name</div>
              <div style={{ textAlign: 'center' }}>Transactions</div>
              <div style={{ textAlign: 'center' }}>Revenue</div>
              <div style={{ textAlign: 'center' }}>Avg. Transaction</div>
              <div style={{ textAlign: 'center' }}>Performance</div>
            </div>
            
            {data.employeeStats.map((employee, index) => {
              const avgTransaction = employee.transactions > 0 ? employee.revenue / employee.transactions : 0;
              const performanceRating = getPerformanceRating(employee);
              const performanceColor = getPerformanceColor(performanceRating);
              
              return (
                <div key={employee.id || index} style={styles.employeeItem}>
                  <div style={styles.employeeName}>{employee.name}</div>
                  <div style={styles.employeeMetric}>{employee.transactions}</div>
                  <div style={styles.employeeRevenueMetric}>{formatCurrency(employee.revenue)}</div>
                  <div style={styles.employeeMetric}>{formatCurrency(avgTransaction)}</div>
                  <div style={{
                    ...styles.performanceRating,
                    color: performanceColor,
                    borderColor: performanceColor
                  }}>
                    {performanceRating}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.summarySection}>
            <h4 style={styles.summaryTitle}>Performance Summary</h4>
            
            <div style={styles.summaryRow}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{data.employeeStats.length}</div>
                <div style={styles.summaryCardLabel}>Active Employees</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{formatCurrency(data.netSales)}</div>
                <div style={styles.summaryCardLabel}>Total Revenue</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{data.totalTransactions}</div>
                <div style={styles.summaryCardLabel}>Total Transactions</div>
              </div>
            </div>

            <div style={{...styles.summaryRow, ...styles.lastRow}}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{formatCurrency(data.netSales / (data.employeeStats.length || 1))}</div>
                <div style={styles.summaryCardLabel}>Avg Revenue/Employee</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{Math.round(data.totalTransactions / (data.employeeStats.length || 1))}</div>
                <div style={styles.summaryCardLabel}>Avg Transactions/Employee</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryCardValue}>{data.employeeStats[0]?.name || 'N/A'}</div>
                <div style={styles.summaryCardLabel}>Top Performer</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={styles.noDataMessage}>
          No employee performance data found for this period
        </div>
      )}
    </div>
  );
};

export default EmployeePerformanceReport;