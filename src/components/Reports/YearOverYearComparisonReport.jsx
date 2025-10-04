// components/Reports/YearOverYearComparisonReport.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../UI/TavariCheckbox';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';

/**
 * Year-over-Year Comparison Report Component
 * Compares business performance metrics between current period and same period last year
 * 
 * @param {Object} props
 * @param {Object} props.data - Current period report data
 * @param {string} props.dateRange - Selected date range
 * @param {string} props.customDateStart - Custom start date
 * @param {string} props.customDateEnd - Custom end date
 * @param {string} props.businessId - Business ID
 * @param {Function} props.onExport - Export handler
 * @param {Function} props.onEmail - Email handler
 * @param {Array} props.employees - Employee list
 * @returns {React.ReactNode} Year-over-Year Comparison Report
 */
const YearOverYearComparisonReport = ({
  data,
  dateRange,
  customDateStart,
  customDateEnd,
  businessId,
  onExport,
  onEmail,
  employees = []
}) => {
  const [lastYearData, setLastYearData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetrics, setSelectedMetrics] = useState({
    sales: true,
    transactions: true,
    averageTransaction: true,
    topItems: true,
    paymentMethods: true,
    employeePerformance: true,
    categoryBreakdown: true
  });

  const { formatTaxAmount } = useTaxCalculations(businessId);

  useEffect(() => {
    if (businessId && data) {
      loadLastYearData();
    }
  }, [businessId, data, dateRange, customDateStart, customDateEnd]);

  const getDateFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return {
          start: yesterday.toISOString(),
          end: today.toISOString()
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          start: monthStart.toISOString(),
          end: new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'custom':
        return {
          start: customDateStart ? new Date(customDateStart).toISOString() : today.toISOString(),
          end: customDateEnd ? new Date(customDateEnd + 'T23:59:59').toISOString() : new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      default:
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
    }
  };

  const loadLastYearData = async () => {
    if (!businessId || !data) return;

    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateFilter();
      
      // Calculate last year dates
      const lastYearStart = new Date(start);
      const lastYearEnd = new Date(end);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

      // Get last year's sales data
      const { data: lastYearSales, error: salesError } = await supabase
        .from('pos_sales')
        .select(`
          id, subtotal, tax, discount, loyalty_discount, total, created_at, user_id, payment_status,
          pos_sale_items (
            id, inventory_id, name, quantity, unit_price, total_price, category_id
          )
        `)
        .eq('business_id', businessId)
        .in('payment_status', ['paid', 'completed'])
        .gte('created_at', lastYearStart.toISOString())
        .lt('created_at', lastYearEnd.toISOString());

      if (salesError) throw salesError;

      // Get last year's refunds
      const { data: lastYearRefunds, error: refundsError } = await supabase
        .from('pos_refunds')
        .select('total_refund_amount, created_at, refunded_by')
        .eq('business_id', businessId)
        .gte('created_at', lastYearStart.toISOString())
        .lt('created_at', lastYearEnd.toISOString());

      if (refundsError) throw refundsError;

      // Get last year's payments
      const { data: lastYearPayments, error: paymentsError } = await supabase
        .from('pos_payments')
        .select('payment_method, amount, sale_id')
        .eq('business_id', businessId)
        .in('sale_id', lastYearSales?.map(s => s.id) || []);

      if (paymentsError) throw paymentsError;

      // Calculate last year metrics
      const salesTotals = lastYearSales?.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0) || 0;
      const refundTotals = lastYearRefunds?.reduce((sum, refund) => sum + (Number(refund.total_refund_amount) || 0), 0) || 0;
      const netSales = salesTotals - refundTotals;
      const totalTransactions = lastYearSales?.length || 0;
      const avgTransaction = totalTransactions > 0 ? (salesTotals / totalTransactions) : 0;

      // Calculate payment breakdown for last year
      const paymentMethodTotals = {};
      lastYearPayments?.forEach(payment => {
        const method = payment.payment_method || 'unknown';
        paymentMethodTotals[method] = (paymentMethodTotals[method] || 0) + (Number(payment.amount) || 0);
      });

      const paymentBreakdown = Object.entries(paymentMethodTotals).map(([method, amount]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        amount,
        percentage: salesTotals > 0 ? ((amount / salesTotals) * 100) : 0
      }));

      // Calculate top items for last year
      const itemTotals = {};
      lastYearSales?.forEach(sale => {
        if (sale.pos_sale_items) {
          sale.pos_sale_items.forEach(item => {
            const key = item.name;
            if (!itemTotals[key]) {
              itemTotals[key] = { name: key, quantity: 0, revenue: 0 };
            }
            itemTotals[key].quantity += Number(item.quantity) || 0;
            itemTotals[key].revenue += Number(item.total_price) || 0;
          });
        }
      });

      const topItems = Object.values(itemTotals)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate employee stats for last year
      const employeeStats = {};
      lastYearSales?.forEach(sale => {
        const userId = sale.user_id;
        if (!employeeStats[userId]) {
          const employee = employees.find(e => e.id === userId);
          employeeStats[userId] = {
            id: userId,
            name: employee ? employee.full_name || employee.email : 'Unknown',
            sales: 0,
            revenue: 0,
            transactions: 0
          };
        }
        employeeStats[userId].transactions += 1;
        employeeStats[userId].revenue += Number(sale.total) || 0;
      });

      setLastYearData({
        salesTotals,
        refundTotals,
        netSales,
        totalTransactions,
        avgTransaction,
        paymentBreakdown,
        topItems,
        employeeStats: Object.values(employeeStats).sort((a, b) => b.revenue - a.revenue),
        rawData: {
          sales: lastYearSales,
          refunds: lastYearRefunds,
          payments: lastYearPayments
        }
      });

    } catch (err) {
      console.error('Error loading last year data:', err);
      setError('Failed to load comparison data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercent = (percent) => `${(percent || 0).toFixed(1)}%`;

  const handleExportReport = () => {
    if (!lastYearData || !onExport) return;

    const csvContent = generateCSVReport();
    onExport(csvContent, 'csv', 'year-over-year-comparison');
  };

  const handleEmailReport = () => {
    if (!lastYearData || !onEmail) return;

    const csvContent = generateCSVReport();
    const emailContent = {
      subject: `Year-over-Year Comparison Report - ${new Date().toLocaleDateString()}`,
      body: `Please find attached the Year-over-Year Comparison Report.\n\nKey Highlights:\n- Current Sales: ${formatCurrency(data.netSales)}\n- Last Year Sales: ${formatCurrency(lastYearData.netSales)}\n- Growth: ${formatPercent(calculateGrowth(data.netSales, lastYearData.netSales))}`
    };

    onEmail(emailContent, csvContent, 'year-over-year-comparison');
  };

  const generateCSVReport = () => {
    if (!lastYearData) return '';

    const rows = [
      ['Year-over-Year Comparison Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Period:', `${dateRange === 'custom' ? `${customDateStart} to ${customDateEnd}` : dateRange}`],
      [''],
      ['Metric', 'Current Year', 'Last Year', 'Growth %', 'Difference'],
      ['Total Sales', data.salesTotals, lastYearData.salesTotals, formatPercent(calculateGrowth(data.salesTotals, lastYearData.salesTotals)), formatCurrency(data.salesTotals - lastYearData.salesTotals)],
      ['Net Sales', data.netSales, lastYearData.netSales, formatPercent(calculateGrowth(data.netSales, lastYearData.netSales)), formatCurrency(data.netSales - lastYearData.netSales)],
      ['Transactions', data.totalTransactions, lastYearData.totalTransactions, formatPercent(calculateGrowth(data.totalTransactions, lastYearData.totalTransactions)), data.totalTransactions - lastYearData.totalTransactions],
      ['Average Transaction', data.avgTransaction, lastYearData.avgTransaction, formatPercent(calculateGrowth(data.avgTransaction, lastYearData.avgTransaction)), formatCurrency(data.avgTransaction - lastYearData.avgTransaction)],
      ['Refunds', data.refundTotals, lastYearData.refundTotals, formatPercent(calculateGrowth(data.refundTotals, lastYearData.refundTotals)), formatCurrency(data.refundTotals - lastYearData.refundTotals)]
    ];

    return 'data:text/csv;charset=utf-8,' + rows.map(row => row.join(',')).join('\n');
  };

  const handleMetricToggle = (metric) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const styles = {
    container: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows.md,
      overflow: 'hidden'
    },

    header: {
      padding: TavariStyles.spacing.xl,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: TavariStyles.colors.gray50,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: TavariStyles.spacing.md
    },

    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      margin: 0
    },

    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },

    button: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.sm
    },

    primaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.sm
    },

    content: {
      padding: TavariStyles.spacing.xl
    },

    loading: {
      ...TavariStyles.components.loading.container,
      minHeight: '200px'
    },

    error: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      margin: TavariStyles.spacing.lg
    },

    metricsSelector: {
      marginBottom: TavariStyles.spacing.xl,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },

    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginTop: TavariStyles.spacing.md
    },

    comparisonGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.xl
    },

    comparisonCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg
    },

    cardTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.md,
      borderBottom: `2px solid ${TavariStyles.colors.gray200}`,
      paddingBottom: TavariStyles.spacing.sm
    },

    metricRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.sm,
      marginBottom: TavariStyles.spacing.xs
    },

    metricLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },

    metricValue: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },

    growthPositive: {
      color: TavariStyles.colors.success,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },

    growthNegative: {
      color: TavariStyles.colors.danger,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },

    growthNeutral: {
      color: TavariStyles.colors.gray500,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },

    table: TavariStyles.components.table.table,
    tableContainer: TavariStyles.components.table.container,
    th: TavariStyles.components.table.th,
    td: TavariStyles.components.table.td,
    row: TavariStyles.components.table.row
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Year-over-Year Comparison Report</h2>
        </div>
        <div style={styles.loading}>Loading comparison data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Year-over-Year Comparison Report</h2>
        </div>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  if (!lastYearData) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Year-over-Year Comparison Report</h2>
        </div>
        <div style={styles.content}>
          <p style={{ textAlign: 'center', color: TavariStyles.colors.gray500 }}>
            No data available for the same period last year.
          </p>
        </div>
      </div>
    );
  }

  const getGrowthStyle = (growth) => {
    if (growth > 0) return styles.growthPositive;
    if (growth < 0) return styles.growthNegative;
    return styles.growthNeutral;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Year-over-Year Comparison Report</h2>
        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={handleExportReport}>
            Export CSV
          </button>
          <button style={styles.primaryButton} onClick={handleEmailReport}>
            Email Report
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Metrics Selector */}
        <div style={styles.metricsSelector}>
          <h3 style={{ margin: 0, marginBottom: TavariStyles.spacing.md, fontSize: TavariStyles.typography.fontSize.lg }}>
            Select Metrics to Compare:
          </h3>
          <div style={styles.metricsGrid}>
            <TavariCheckbox
              checked={selectedMetrics.sales}
              onChange={() => handleMetricToggle('sales')}
              label="Sales Performance"
              id="metric-sales"
            />
            <TavariCheckbox
              checked={selectedMetrics.transactions}
              onChange={() => handleMetricToggle('transactions')}
              label="Transaction Volume"
              id="metric-transactions"
            />
            <TavariCheckbox
              checked={selectedMetrics.averageTransaction}
              onChange={() => handleMetricToggle('averageTransaction')}
              label="Average Transaction Value"
              id="metric-avg-transaction"
            />
            <TavariCheckbox
              checked={selectedMetrics.topItems}
              onChange={() => handleMetricToggle('topItems')}
              label="Top Selling Items"
              id="metric-top-items"
            />
            <TavariCheckbox
              checked={selectedMetrics.paymentMethods}
              onChange={() => handleMetricToggle('paymentMethods')}
              label="Payment Methods"
              id="metric-payment-methods"
            />
            <TavariCheckbox
              checked={selectedMetrics.employeePerformance}
              onChange={() => handleMetricToggle('employeePerformance')}
              label="Employee Performance"
              id="metric-employee"
            />
          </div>
        </div>

        <div style={styles.comparisonGrid}>
          {/* Sales Performance */}
          {selectedMetrics.sales && (
            <div style={styles.comparisonCard}>
              <h3 style={styles.cardTitle}>Sales Performance</h3>
              
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Total Sales</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={styles.metricValue}>{formatCurrency(data.salesTotals)} vs {formatCurrency(lastYearData.salesTotals)}</div>
                  <div style={getGrowthStyle(calculateGrowth(data.salesTotals, lastYearData.salesTotals))}>
                    {formatPercent(calculateGrowth(data.salesTotals, lastYearData.salesTotals))}
                  </div>
                </div>
              </div>

              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Net Sales</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={styles.metricValue}>{formatCurrency(data.netSales)} vs {formatCurrency(lastYearData.netSales)}</div>
                  <div style={getGrowthStyle(calculateGrowth(data.netSales, lastYearData.netSales))}>
                    {formatPercent(calculateGrowth(data.netSales, lastYearData.netSales))}
                  </div>
                </div>
              </div>

              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Refunds</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={styles.metricValue}>{formatCurrency(data.refundTotals)} vs {formatCurrency(lastYearData.refundTotals)}</div>
                  <div style={getGrowthStyle(calculateGrowth(data.refundTotals, lastYearData.refundTotals))}>
                    {formatPercent(calculateGrowth(data.refundTotals, lastYearData.refundTotals))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Performance */}
          {selectedMetrics.transactions && (
            <div style={styles.comparisonCard}>
              <h3 style={styles.cardTitle}>Transaction Performance</h3>
              
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Total Transactions</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={styles.metricValue}>{data.totalTransactions} vs {lastYearData.totalTransactions}</div>
                  <div style={getGrowthStyle(calculateGrowth(data.totalTransactions, lastYearData.totalTransactions))}>
                    {formatPercent(calculateGrowth(data.totalTransactions, lastYearData.totalTransactions))}
                  </div>
                </div>
              </div>

              {selectedMetrics.averageTransaction && (
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Average Transaction</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={styles.metricValue}>{formatCurrency(data.avgTransaction)} vs {formatCurrency(lastYearData.avgTransaction)}</div>
                    <div style={getGrowthStyle(calculateGrowth(data.avgTransaction, lastYearData.avgTransaction))}>
                      {formatPercent(calculateGrowth(data.avgTransaction, lastYearData.avgTransaction))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Methods Comparison */}
          {selectedMetrics.paymentMethods && (
            <div style={styles.comparisonCard}>
              <h3 style={styles.cardTitle}>Payment Methods</h3>
              
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={TavariStyles.components.table.headerRow}>
                      <th style={styles.th}>Method</th>
                      <th style={styles.th}>Current</th>
                      <th style={styles.th}>Last Year</th>
                      <th style={styles.th}>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.paymentBreakdown?.map((payment) => {
                      const lastYearPayment = lastYearData.paymentBreakdown?.find(p => p.method === payment.method) || { amount: 0 };
                      const growth = calculateGrowth(payment.amount, lastYearPayment.amount);
                      
                      return (
                        <tr key={payment.method} style={styles.row}>
                          <td style={styles.td}>{payment.method}</td>
                          <td style={styles.td}>{formatCurrency(payment.amount)}</td>
                          <td style={styles.td}>{formatCurrency(lastYearPayment.amount)}</td>
                          <td style={{...styles.td, ...getGrowthStyle(growth)}}>
                            {formatPercent(growth)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Items Comparison */}
          {selectedMetrics.topItems && (
            <div style={styles.comparisonCard}>
              <h3 style={styles.cardTitle}>Top Selling Items Comparison</h3>
              
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={TavariStyles.components.table.headerRow}>
                      <th style={styles.th}>Item</th>
                      <th style={styles.th}>Current Revenue</th>
                      <th style={styles.th}>Last Year Revenue</th>
                      <th style={styles.th}>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topItems?.slice(0, 5).map((item) => {
                      const lastYearItem = lastYearData.topItems?.find(i => i.name === item.name) || { revenue: 0 };
                      const growth = calculateGrowth(item.revenue, lastYearItem.revenue);
                      
                      return (
                        <tr key={item.name} style={styles.row}>
                          <td style={styles.td}>{item.name}</td>
                          <td style={styles.td}>{formatCurrency(item.revenue)}</td>
                          <td style={styles.td}>{formatCurrency(lastYearItem.revenue)}</td>
                          <td style={{...styles.td, ...getGrowthStyle(growth)}}>
                            {formatPercent(growth)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Employee Performance Comparison */}
          {selectedMetrics.employeePerformance && (
            <div style={styles.comparisonCard}>
              <h3 style={styles.cardTitle}>Employee Performance</h3>
              
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={TavariStyles.components.table.headerRow}>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Current Sales</th>
                      <th style={styles.th}>Last Year Sales</th>
                      <th style={styles.th}>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.employeeStats?.slice(0, 5).map((employee) => {
                      const lastYearEmployee = lastYearData.employeeStats?.find(e => e.id === employee.id) || { revenue: 0 };
                      const growth = calculateGrowth(employee.revenue, lastYearEmployee.revenue);
                      
                      return (
                        <tr key={employee.id} style={styles.row}>
                          <td style={styles.td}>{employee.name}</td>
                          <td style={styles.td}>{formatCurrency(employee.revenue)}</td>
                          <td style={styles.td}>{formatCurrency(lastYearEmployee.revenue)}</td>
                          <td style={{...styles.td, ...getGrowthStyle(growth)}}>
                            {formatPercent(growth)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Summary Insights */}
        <div style={{
          ...TavariStyles.layout.card,
          padding: TavariStyles.spacing.xl,
          backgroundColor: TavariStyles.colors.gray50,
          marginTop: TavariStyles.spacing.xl
        }}>
          <h3 style={styles.cardTitle}>Key Insights</h3>
          <div style={{ fontSize: TavariStyles.typography.fontSize.sm, lineHeight: TavariStyles.typography.lineHeight.relaxed }}>
            {data.netSales > lastYearData.netSales ? (
              <p style={{ color: TavariStyles.colors.success, fontWeight: TavariStyles.typography.fontWeight.medium }}>
                ✓ Sales are up {formatPercent(calculateGrowth(data.netSales, lastYearData.netSales))} compared to last year - a positive trend!
              </p>
            ) : (
              <p style={{ color: TavariStyles.colors.danger, fontWeight: TavariStyles.typography.fontWeight.medium }}>
                ⚠ Sales are down {formatPercent(Math.abs(calculateGrowth(data.netSales, lastYearData.netSales)))} compared to last year.
              </p>
            )}
            
            {data.totalTransactions > lastYearData.totalTransactions ? (
              <p style={{ color: TavariStyles.colors.success }}>
                ✓ Transaction volume increased by {formatPercent(calculateGrowth(data.totalTransactions, lastYearData.totalTransactions))}.
              </p>
            ) : (
              <p style={{ color: TavariStyles.colors.warning }}>
                ⚠ Transaction volume decreased by {formatPercent(Math.abs(calculateGrowth(data.totalTransactions, lastYearData.totalTransactions)))}.
              </p>
            )}

            {data.avgTransaction > lastYearData.avgTransaction ? (
              <p style={{ color: TavariStyles.colors.success }}>
                ✓ Average transaction value improved by {formatPercent(calculateGrowth(data.avgTransaction, lastYearData.avgTransaction))}.
              </p>
            ) : (
              <p style={{ color: TavariStyles.colors.warning }}>
                ⚠ Average transaction value decreased by {formatPercent(Math.abs(calculateGrowth(data.avgTransaction, lastYearData.avgTransaction)))}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearOverYearComparisonReport;