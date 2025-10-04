// src/components/Reports/ShiftPerformanceReport.jsx
import React, { useState } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const ShiftPerformanceReport = ({ 
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
  
  const [shiftSettings, setShiftSettings] = useState({
    morningStart: '06:00',
    morningEnd: '14:00',
    afternoonStart: '14:00',
    afternoonEnd: '22:00',
    nightStart: '22:00',
    nightEnd: '06:00',
    peakHourThreshold: 80, // Percentage above average to be considered peak
    slowHourThreshold: 50  // Percentage below average to be considered slow
  });

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercentage = (percent) => `${(percent || 0).toFixed(1)}%`;

  // Analyze sales by hour and shift
  const analyzeShiftPerformance = () => {
    if (!data.rawData?.sales?.length) {
      return {
        hourlyBreakdown: [],
        shiftSummary: {
          morning: { transactions: 0, revenue: 0, employees: new Set() },
          afternoon: { transactions: 0, revenue: 0, employees: new Set() },
          night: { transactions: 0, revenue: 0, employees: new Set() }
        },
        peakHours: [],
        slowHours: [],
        averageHourlyRevenue: 0
      };
    }

    // Initialize hourly data
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = {
        hour: i,
        displayHour: formatHour(i),
        transactions: 0,
        revenue: 0,
        employees: new Set(),
        shift: getShiftForHour(i)
      };
    }

    const shiftSummary = {
      morning: { transactions: 0, revenue: 0, employees: new Set(), avgTransaction: 0 },
      afternoon: { transactions: 0, revenue: 0, employees: new Set(), avgTransaction: 0 },
      night: { transactions: 0, revenue: 0, employees: new Set(), avgTransaction: 0 }
    };

    // Process sales data
    data.rawData.sales.forEach(sale => {
      const saleDate = new Date(sale.created_at);
      const hour = saleDate.getHours();
      const revenue = Number(sale.total) || 0;
      const shift = getShiftForHour(hour);

      // Update hourly data
      hourlyData[hour].transactions += 1;
      hourlyData[hour].revenue += revenue;
      if (sale.user_id) {
        hourlyData[hour].employees.add(sale.user_id);
      }

      // Update shift summary
      shiftSummary[shift].transactions += 1;
      shiftSummary[shift].revenue += revenue;
      if (sale.user_id) {
        shiftSummary[shift].employees.add(sale.user_id);
      }
    });

    // Calculate averages and identify peak/slow hours
    const hourlyBreakdown = Object.values(hourlyData);
    const totalRevenue = hourlyBreakdown.reduce((sum, hour) => sum + hour.revenue, 0);
    const averageHourlyRevenue = totalRevenue / 24;

    // Calculate shift averages
    Object.keys(shiftSummary).forEach(shift => {
      const summary = shiftSummary[shift];
      summary.avgTransaction = summary.transactions > 0 ? summary.revenue / summary.transactions : 0;
      summary.employeeCount = summary.employees.size;
    });

    // Add percentage calculations to hourly data
    hourlyBreakdown.forEach(hour => {
      hour.revenuePercentage = averageHourlyRevenue > 0 ? (hour.revenue / averageHourlyRevenue) * 100 : 0;
      hour.avgTransaction = hour.transactions > 0 ? hour.revenue / hour.transactions : 0;
      hour.employeeCount = hour.employees.size;
    });

    // Identify peak and slow hours
    const peakHours = hourlyBreakdown.filter(hour => 
      hour.revenuePercentage >= shiftSettings.peakHourThreshold
    ).sort((a, b) => b.revenue - a.revenue);

    const slowHours = hourlyBreakdown.filter(hour => 
      hour.revenuePercentage <= shiftSettings.slowHourThreshold && hour.revenue > 0
    ).sort((a, b) => a.revenue - b.revenue);

    return {
      hourlyBreakdown: hourlyBreakdown.sort((a, b) => a.hour - b.hour),
      shiftSummary,
      peakHours,
      slowHours,
      averageHourlyRevenue
    };
  };

  const getShiftForHour = (hour) => {
    const morningStart = parseInt(shiftSettings.morningStart.split(':')[0]);
    const morningEnd = parseInt(shiftSettings.morningEnd.split(':')[0]);
    const afternoonStart = parseInt(shiftSettings.afternoonStart.split(':')[0]);
    const afternoonEnd = parseInt(shiftSettings.afternoonEnd.split(':')[0]);

    if (hour >= morningStart && hour < morningEnd) return 'morning';
    if (hour >= afternoonStart && hour < afternoonEnd) return 'afternoon';
    return 'night';
  };

  const formatHour = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const shiftData = analyzeShiftPerformance();

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Shift Performance Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += "SHIFT SUMMARY\n";
      csvContent += "Shift,Transactions,Revenue,Avg Transaction,Employees\n";
      Object.entries(shiftData.shiftSummary).forEach(([shift, data]) => {
        csvContent += `${shift.charAt(0).toUpperCase() + shift.slice(1)},${data.transactions},${data.revenue.toFixed(2)},${data.avgTransaction.toFixed(2)},${data.employeeCount}\n`;
      });
      
      csvContent += "\nHOURLY BREAKDOWN\n";
      csvContent += "Hour,Shift,Transactions,Revenue,Avg Transaction,Employees,% of Average\n";
      shiftData.hourlyBreakdown.forEach(hour => {
        csvContent += `${hour.displayHour},${hour.shift},${hour.transactions},${hour.revenue.toFixed(2)},${hour.avgTransaction.toFixed(2)},${hour.employeeCount},${hour.revenuePercentage.toFixed(1)}%\n`;
      });
      
      if (shiftData.peakHours.length > 0) {
        csvContent += "\nPEAK HOURS\n";
        csvContent += "Hour,Revenue,Transactions,% Above Average\n";
        shiftData.peakHours.forEach(hour => {
          csvContent += `${hour.displayHour},${hour.revenue.toFixed(2)},${hour.transactions},${(hour.revenuePercentage - 100).toFixed(1)}%\n`;
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
    subject: `Shift Performance Report - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Shift Performance Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
Generated: ${new Date().toLocaleString()}

SHIFT PERFORMANCE SUMMARY:
Morning Shift: ${formatCurrency(shiftData.shiftSummary.morning.revenue)} (${shiftData.shiftSummary.morning.transactions} transactions)
Afternoon Shift: ${formatCurrency(shiftData.shiftSummary.afternoon.revenue)} (${shiftData.shiftSummary.afternoon.transactions} transactions)
Night Shift: ${formatCurrency(shiftData.shiftSummary.night.revenue)} (${shiftData.shiftSummary.night.transactions} transactions)

${shiftData.peakHours.length > 0 ? `
PEAK HOURS:
${shiftData.peakHours.slice(0, 5).map(hour => 
  `${hour.displayHour}: ${formatCurrency(hour.revenue)} (${formatPercentage(hour.revenuePercentage - 100)} above average)`
).join('\n')}
` : ''}

${shiftData.slowHours.length > 0 ? `
SLOW HOURS:
${shiftData.slowHours.slice(0, 5).map(hour => 
  `${hour.displayHour}: ${formatCurrency(hour.revenue)} (${formatPercentage(100 - hour.revenuePercentage)} below average)`
).join('\n')}
` : ''}

This analysis helps optimize staffing schedules and identify high-performance time periods.
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
      onExport(content, format, 'shift-reports');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'shift-reports');
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
      borderBottom: `2px solid ${TavariStyles.colors.info}`
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
      backgroundColor: TavariStyles.colors.cyan50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.cyan200}`
    },

    settingsTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.cyan900,
      marginBottom: TavariStyles.spacing.sm
    },

    settingsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

    shiftSummarySection: {
      marginBottom: TavariStyles.spacing.lg
    },

    shiftGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: TavariStyles.spacing.lg
    },

    shiftCard: {
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      textAlign: 'center',
      boxShadow: TavariStyles.shadows.sm
    },

    morningShift: {
      borderLeftColor: TavariStyles.colors.yellow500,
      borderLeftWidth: '4px'
    },

    afternoonShift: {
      borderLeftColor: TavariStyles.colors.orange500,
      borderLeftWidth: '4px'
    },

    nightShift: {
      borderLeftColor: TavariStyles.colors.purple500,
      borderLeftWidth: '4px'
    },

    shiftName: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.sm
    },

    shiftRevenue: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.xs
    },

    shiftStats: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },

    hourlySection: {
      marginBottom: TavariStyles.spacing.lg
    },

    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.md
    },

    hourlyGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      gap: TavariStyles.spacing.sm
    },

    hourCard: {
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      textAlign: 'center'
    },

    peakHour: {
      backgroundColor: TavariStyles.colors.green50,
      borderColor: TavariStyles.colors.green300
    },

    slowHour: {
      backgroundColor: TavariStyles.colors.red50,
      borderColor: TavariStyles.colors.red300
    },

    hourTime: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.xs
    },

    hourRevenue: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.primary
    },

    hourTransactions: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600
    },

    noDataMessage: {
      textAlign: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic'
    }
  };

  const hasData = shiftData.hourlyBreakdown.some(hour => hour.transactions > 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Shift Performance Report</h3>
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

      {/* Shift Settings Configuration */}
      <div style={styles.settingsSection}>
        <h4 style={styles.settingsTitle}>Shift Time Configuration</h4>
        
        <div style={styles.settingsGrid}>
          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Morning Start:</label>
            <input 
              type="time"
              style={styles.settingsInput}
              value={shiftSettings.morningStart}
              onChange={(e) => setShiftSettings({...shiftSettings, morningStart: e.target.value})}
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Morning End:</label>
            <input 
              type="time"
              style={styles.settingsInput}
              value={shiftSettings.morningEnd}
              onChange={(e) => setShiftSettings({...shiftSettings, morningEnd: e.target.value})}
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Afternoon Start:</label>
            <input 
              type="time"
              style={styles.settingsInput}
              value={shiftSettings.afternoonStart}
              onChange={(e) => setShiftSettings({...shiftSettings, afternoonStart: e.target.value})}
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Afternoon End:</label>
            <input 
              type="time"
              style={styles.settingsInput}
              value={shiftSettings.afternoonEnd}
              onChange={(e) => setShiftSettings({...shiftSettings, afternoonEnd: e.target.value})}
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Peak Hour Threshold (%):</label>
            <input 
              type="number"
              style={styles.settingsInput}
              value={shiftSettings.peakHourThreshold}
              onChange={(e) => setShiftSettings({...shiftSettings, peakHourThreshold: Number(e.target.value)})}
              min="110"
              max="200"
            />
          </div>

          <div style={styles.settingsControl}>
            <label style={styles.settingsLabel}>Slow Hour Threshold (%):</label>
            <input 
              type="number"
              style={styles.settingsInput}
              value={shiftSettings.slowHourThreshold}
              onChange={(e) => setShiftSettings({...shiftSettings, slowHourThreshold: Number(e.target.value)})}
              min="10"
              max="80"
            />
          </div>
        </div>
      </div>

      {!hasData ? (
        <div style={styles.noDataMessage}>
          No sales data found for shift performance analysis
        </div>
      ) : (
        <>
          {/* Shift Summary */}
          <div style={styles.shiftSummarySection}>
            <h4 style={styles.sectionTitle}>Shift Performance Summary</h4>
            <div style={styles.shiftGrid}>
              <div style={{...styles.shiftCard, ...styles.morningShift}}>
                <div style={styles.shiftName}>Morning Shift</div>
                <div style={styles.shiftRevenue}>{formatCurrency(shiftData.shiftSummary.morning.revenue)}</div>
                <div style={styles.shiftStats}>
                  {shiftData.shiftSummary.morning.transactions} transactions • {shiftData.shiftSummary.morning.employeeCount} employees
                </div>
              </div>
              
              <div style={{...styles.shiftCard, ...styles.afternoonShift}}>
                <div style={styles.shiftName}>Afternoon Shift</div>
                <div style={styles.shiftRevenue}>{formatCurrency(shiftData.shiftSummary.afternoon.revenue)}</div>
                <div style={styles.shiftStats}>
                  {shiftData.shiftSummary.afternoon.transactions} transactions • {shiftData.shiftSummary.afternoon.employeeCount} employees
                </div>
              </div>
              
              <div style={{...styles.shiftCard, ...styles.nightShift}}>
                <div style={styles.shiftName}>Night Shift</div>
                <div style={styles.shiftRevenue}>{formatCurrency(shiftData.shiftSummary.night.revenue)}</div>
                <div style={styles.shiftStats}>
                  {shiftData.shiftSummary.night.transactions} transactions • {shiftData.shiftSummary.night.employeeCount} employees
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Breakdown */}
          <div style={styles.hourlySection}>
            <h4 style={styles.sectionTitle}>Hourly Performance Breakdown</h4>
            <div style={styles.hourlyGrid}>
              {shiftData.hourlyBreakdown.map((hour, index) => {
                const isPeak = hour.revenuePercentage >= shiftSettings.peakHourThreshold;
                const isSlow = hour.revenuePercentage <= shiftSettings.slowHourThreshold && hour.revenue > 0;
                
                return (
                  <div 
                    key={index} 
                    style={{
                      ...styles.hourCard,
                      ...(isPeak ? styles.peakHour : {}),
                      ...(isSlow ? styles.slowHour : {})
                    }}
                  >
                    <div style={styles.hourTime}>{hour.displayHour}</div>
                    <div style={styles.hourRevenue}>{formatCurrency(hour.revenue)}</div>
                    <div style={styles.hourTransactions}>{hour.transactions} transactions</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Peak Hours */}
          {shiftData.peakHours.length > 0 && (
            <div style={styles.hourlySection}>
              <h4 style={styles.sectionTitle}>Peak Hours (Above {shiftSettings.peakHourThreshold}% of average)</h4>
              <div style={styles.hourlyGrid}>
                {shiftData.peakHours.slice(0, 8).map((hour, index) => (
                  <div key={index} style={{...styles.hourCard, ...styles.peakHour}}>
                    <div style={styles.hourTime}>{hour.displayHour}</div>
                    <div style={styles.hourRevenue}>{formatCurrency(hour.revenue)}</div>
                    <div style={styles.hourTransactions}>
                      +{formatPercentage(hour.revenuePercentage - 100)} above avg
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slow Hours */}
          {shiftData.slowHours.length > 0 && (
            <div style={styles.hourlySection}>
              <h4 style={styles.sectionTitle}>Slow Hours (Below {shiftSettings.slowHourThreshold}% of average)</h4>
              <div style={styles.hourlyGrid}>
                {shiftData.slowHours.slice(0, 8).map((hour, index) => (
                  <div key={index} style={{...styles.hourCard, ...styles.slowHour}}>
                    <div style={styles.hourTime}>{hour.displayHour}</div>
                    <div style={styles.hourRevenue}>{formatCurrency(hour.revenue)}</div>
                    <div style={styles.hourTransactions}>
                      -{formatPercentage(100 - hour.revenuePercentage)} below avg
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShiftPerformanceReport;