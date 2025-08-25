// src/screens/POS/POSReportsScreen.jsx
// Steps 115-120: Comprehensive POS reporting system with filtering, exports, and analytics
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const POSReportsScreen = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [reportData, setReportData] = useState({
    salesTotals: 0,
    refundTotals: 0,
    netSales: 0,
    terminalCashVariances: [],
    paymentBreakdown: [],
    topItems: [],
    employeeStats: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('today');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [viewBy, setViewBy] = useState('date'); // date, employee, terminal, item, category
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedTerminal, setSelectedTerminal] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [compareToLastYear, setCompareToLastYear] = useState(false);
  
  const [employees, setEmployees] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    if (businessId) {
      loadEmployees();
      loadTerminals();
      loadCategories();
      generateReport();
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      generateReport();
    }
  }, [dateRange, customDateStart, customDateEnd, viewBy, selectedEmployee, selectedTerminal, selectedCategory, compareToLastYear]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('business_id', businessId)
        .order('full_name');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const loadTerminals = async () => {
    try {
      // Get unique terminal IDs from sales
      const { data, error } = await supabase
        .from('pos_sales')
        .select('terminal_id')
        .eq('business_id', businessId)
        .not('terminal_id', 'is', null);
      
      if (error) throw error;
      
      const uniqueTerminals = [...new Set(data.map(sale => sale.terminal_id))].filter(Boolean);
      setTerminals(uniqueTerminals.map(id => ({ id, name: `Terminal ${id}` })));
    } catch (err) {
      console.error('Error loading terminals:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_categories')
        .select('id, name')
        .eq('business_id', businessId)
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

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

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateFilter();
      
      // Build query filters
      let salesQuery = supabase
        .from('pos_sales')
        .select(`
          id, subtotal, tax, discount, loyalty_discount, total, created_at, user_id, terminal_id,
          pos_sale_items (
            id, inventory_id, name, quantity, unit_price, total_price, pos_inventory (category_id)
          ),
          pos_payments (payment_method, amount)
        `)
        .eq('business_id', businessId)
        .eq('payment_status', 'completed')
        .gte('created_at', start)
        .lt('created_at', end);

      if (selectedEmployee !== 'all') {
        salesQuery = salesQuery.eq('user_id', selectedEmployee);
      }

      if (selectedTerminal !== 'all') {
        salesQuery = salesQuery.eq('terminal_id', selectedTerminal);
      }

      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      // Get refunds for the same period
      let refundsQuery = supabase
        .from('pos_refunds')
        .select('total_refunded, created_at, refunded_by')
        .eq('business_id', businessId)
        .gte('created_at', start)
        .lt('created_at', end);

      if (selectedEmployee !== 'all') {
        refundsQuery = refundsQuery.eq('refunded_by', selectedEmployee);
      }

      const { data: refunds, error: refundsError } = await refundsQuery;
      if (refundsError) throw refundsError;

      // Get drawer variances
      const { data: drawers, error: drawersError } = await supabase
        .from('pos_drawers')
        .select('*')
        .eq('business_id', businessId)
        .gte('opened_at', start)
        .lt('opened_at', end);

      if (drawersError) throw drawersError;

      // Calculate basic totals
      const salesTotals = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const refundTotals = refunds.reduce((sum, refund) => sum + (refund.total_refunded || 0), 0);
      const netSales = salesTotals - refundTotals;

      // Calculate payment breakdown
      const paymentMethodTotals = {};
      sales.forEach(sale => {
        if (sale.pos_payments) {
          sale.pos_payments.forEach(payment => {
            const method = payment.payment_method || 'unknown';
            paymentMethodTotals[method] = (paymentMethodTotals[method] || 0) + (payment.amount || 0);
          });
        }
      });

      const paymentBreakdown = Object.entries(paymentMethodTotals).map(([method, amount]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        amount,
        percentage: salesTotals > 0 ? ((amount / salesTotals) * 100) : 0
      }));

      // Calculate top items
      const itemTotals = {};
      sales.forEach(sale => {
        if (sale.pos_sale_items) {
          sale.pos_sale_items.forEach(item => {
            if (selectedCategory === 'all' || item.pos_inventory?.category_id === selectedCategory) {
              const key = item.name;
              if (!itemTotals[key]) {
                itemTotals[key] = { name: key, quantity: 0, revenue: 0 };
              }
              itemTotals[key].quantity += item.quantity || 0;
              itemTotals[key].revenue += item.total_price || 0;
            }
          });
        }
      });

      const topItems = Object.values(itemTotals)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate employee stats
      const employeeStats = {};
      sales.forEach(sale => {
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
        employeeStats[userId].revenue += sale.total || 0;
      });

      // Calculate terminal cash variances
      const terminalCashVariances = drawers.map(drawer => ({
        terminal_id: drawer.terminal_id,
        expected: drawer.expected_cash || 0,
        actual: drawer.actual_cash || 0,
        variance: (drawer.actual_cash || 0) - (drawer.expected_cash || 0),
        date: drawer.opened_at
      }));

      // Get comparison data if enabled
      let comparisonData = null;
      if (compareToLastYear) {
        const lastYearStart = new Date(start);
        const lastYearEnd = new Date(end);
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
        lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

        const { data: lastYearSales } = await supabase
          .from('pos_sales')
          .select('total')
          .eq('business_id', businessId)
          .eq('payment_status', 'completed')
          .gte('created_at', lastYearStart.toISOString())
          .lt('created_at', lastYearEnd.toISOString());

        const lastYearTotal = lastYearSales?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
        
        comparisonData = {
          lastYearSales: lastYearTotal,
          growth: lastYearTotal > 0 ? ((netSales - lastYearTotal) / lastYearTotal * 100) : 0,
          difference: netSales - lastYearTotal
        };
      }

      setReportData({
        salesTotals,
        refundTotals,
        netSales,
        terminalCashVariances,
        paymentBreakdown,
        topItems,
        employeeStats: Object.values(employeeStats).sort((a, b) => b.revenue - a.revenue),
        comparisonData,
        totalTransactions: sales.length,
        avgTransaction: sales.length > 0 ? (salesTotals / sales.length) : 0
      });

      await logAction({
        action: 'pos_report_generated',
        context: 'POSReportsScreen',
        metadata: {
          date_range: dateRange,
          view_by: viewBy,
          total_sales: salesTotals,
          net_sales: netSales,
          transactions_count: sales.length
        }
      });

    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const { start, end } = getDateFilter();
      const fileName = `pos-report-${dateRange}-${new Date().toISOString().split('T')[0]}`;
      
      if (exportFormat === 'csv') {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Summary section
        csvContent += "POS Report Summary\n";
        csvContent += `Period,${start.split('T')[0]} to ${end.split('T')[0]}\n`;
        csvContent += `Total Sales,${reportData.salesTotals.toFixed(2)}\n`;
        csvContent += `Total Refunds,${reportData.refundTotals.toFixed(2)}\n`;
        csvContent += `Net Sales,${reportData.netSales.toFixed(2)}\n`;
        csvContent += `Total Transactions,${reportData.totalTransactions}\n`;
        csvContent += `Average Transaction,${reportData.avgTransaction.toFixed(2)}\n\n`;

        // Payment breakdown
        csvContent += "Payment Method Breakdown\n";
        csvContent += "Method,Amount,Percentage\n";
        reportData.paymentBreakdown.forEach(payment => {
          csvContent += `${payment.method},${payment.amount.toFixed(2)},${payment.percentage.toFixed(1)}%\n`;
        });
        csvContent += "\n";

        // Top items
        csvContent += "Top Selling Items\n";
        csvContent += "Item,Quantity,Revenue\n";
        reportData.topItems.forEach(item => {
          csvContent += `${item.name},${item.quantity},${item.revenue.toFixed(2)}\n`;
        });
        csvContent += "\n";

        // Employee stats
        csvContent += "Employee Performance\n";
        csvContent += "Employee,Transactions,Revenue\n";
        reportData.employeeStats.forEach(emp => {
          csvContent += `${emp.name},${emp.transactions},${emp.revenue.toFixed(2)}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else if (exportFormat === 'pdf') {
        // For PDF export, we would integrate with a PDF generation library
        alert('PDF export functionality will be implemented with a PDF library');
      }

      await logAction({
        action: 'pos_report_exported',
        context: 'POSReportsScreen',
        metadata: {
          format: exportFormat,
          file_name: fileName,
          date_range: dateRange
        }
      });

    } catch (err) {
      console.error('Error exporting report:', err);
      setError('Failed to export report: ' + err.message);
    }
  };

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercentage = (percent) => `${(percent || 0).toFixed(1)}%`;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>POS Reports & Analytics</h2>
        <p>Comprehensive sales reporting and business insights</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Report Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Date Range:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={styles.select}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <>
            <div style={styles.controlGroup}>
              <label style={styles.label}>Start Date:</label>
              <input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.controlGroup}>
              <label style={styles.label}>End Date:</label>
              <input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                style={styles.input}
              />
            </div>
          </>
        )}

        <div style={styles.controlGroup}>
          <label style={styles.label}>View By:</label>
          <select
            value={viewBy}
            onChange={(e) => setViewBy(e.target.value)}
            style={styles.select}
          >
            <option value="date">Date</option>
            <option value="employee">Employee</option>
            <option value="terminal">Terminal</option>
            <option value="category">Category</option>
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Employee:</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name || emp.email}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Terminal:</label>
          <select
            value={selectedTerminal}
            onChange={(e) => setSelectedTerminal(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Terminals</option>
            {terminals.map(terminal => (
              <option key={terminal.id} value={terminal.id}>
                {terminal.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={compareToLastYear}
              onChange={(e) => setCompareToLastYear(e.target.checked)}
            />
            Compare to Last Year
          </label>
        </div>
      </div>

      {/* Export Controls */}
      <div style={styles.exportControls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Export Format:</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            style={styles.select}
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        <button
          style={styles.exportButton}
          onClick={exportReport}
          disabled={loading}
        >
          📊 Export Report
        </button>
        <button
          style={styles.refreshButton}
          onClick={generateReport}
          disabled={loading}
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Report Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>Generating report...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{formatCurrency(reportData.salesTotals)}</div>
                <div style={styles.summaryLabel}>Total Sales</div>
                {reportData.comparisonData && (
                  <div style={styles.comparison}>
                    vs {formatCurrency(reportData.comparisonData.lastYearSales)} last year
                  </div>
                )}
              </div>

              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{formatCurrency(reportData.refundTotals)}</div>
                <div style={styles.summaryLabel}>Total Refunds</div>
              </div>

              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{formatCurrency(reportData.netSales)}</div>
                <div style={styles.summaryLabel}>Net Sales</div>
                {reportData.comparisonData && (
                  <div style={{
                    ...styles.comparison,
                    color: reportData.comparisonData.growth >= 0 ? '#059669' : '#dc2626'
                  }}>
                    {reportData.comparisonData.growth >= 0 ? '+' : ''}{formatPercentage(reportData.comparisonData.growth)} vs last year
                  </div>
                )}
              </div>

              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{reportData.totalTransactions}</div>
                <div style={styles.summaryLabel}>Total Transactions</div>
              </div>

              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{formatCurrency(reportData.avgTransaction)}</div>
                <div style={styles.summaryLabel}>Avg Transaction</div>
              </div>
            </div>

            {/* Detailed Sections */}
            <div style={styles.sectionsGrid}>
              {/* Payment Breakdown */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Payment Method Breakdown</h3>
                <div style={styles.paymentList}>
                  {reportData.paymentBreakdown.map((payment, index) => (
                    <div key={index} style={styles.paymentItem}>
                      <div style={styles.paymentMethod}>{payment.method}</div>
                      <div style={styles.paymentDetails}>
                        <div>{formatCurrency(payment.amount)}</div>
                        <div style={styles.paymentPercentage}>{formatPercentage(payment.percentage)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Items */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Top Selling Items</h3>
                <div style={styles.itemsList}>
                  {reportData.topItems.slice(0, 5).map((item, index) => (
                    <div key={index} style={styles.itemRow}>
                      <div style={styles.itemRank}>#{index + 1}</div>
                      <div style={styles.itemInfo}>
                        <div style={styles.itemName}>{item.name}</div>
                        <div style={styles.itemStats}>
                          Qty: {item.quantity} | Revenue: {formatCurrency(item.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Performance */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Employee Performance</h3>
                <div style={styles.employeeList}>
                  {reportData.employeeStats.slice(0, 5).map((employee, index) => (
                    <div key={index} style={styles.employeeRow}>
                      <div style={styles.employeeName}>{employee.name}</div>
                      <div style={styles.employeeStats}>
                        <div>{employee.transactions} transactions</div>
                        <div>{formatCurrency(employee.revenue)} revenue</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal Cash Variances */}
              {reportData.terminalCashVariances.length > 0 && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Terminal Cash Variances</h3>
                  <div style={styles.varianceList}>
                    {reportData.terminalCashVariances.map((variance, index) => (
                      <div key={index} style={styles.varianceRow}>
                        <div style={styles.terminalId}>Terminal {variance.terminal_id}</div>
                        <div style={styles.varianceDetails}>
                          <div>Expected: {formatCurrency(variance.expected)}</div>
                          <div>Actual: {formatCurrency(variance.actual)}</div>
                          <div style={{
                            color: variance.variance === 0 ? '#059669' : 
                                   Math.abs(variance.variance) < 5 ? '#f59e0b' : '#dc2626'
                          }}>
                            Variance: {formatCurrency(variance.variance)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    paddingTop: '100px',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  controls: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'end'
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '120px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '4px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    cursor: 'pointer'
  },
  select: {
    padding: '8px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  input: {
    padding: '8px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  exportControls: {
    display: 'flex',
    gap: '15px',
    alignItems: 'end',
    marginBottom: '30px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  exportButton: {
    padding: '10px 16px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  refreshButton: {
    padding: '10px 16px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  content: {
    flex: 1,
    overflowY: 'auto'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px'
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  comparison: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px'
  },
  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '15px',
    paddingBottom: '8px',
    borderBottom: '2px solid #008080'
  },
  paymentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  paymentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  paymentMethod: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  paymentDetails: {
    textAlign: 'right'
  },
  paymentPercentage: {
    fontSize: '12px',
    color: '#6b7280'
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  itemRank: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#008080',
    minWidth: '30px'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '2px'
  },
  itemStats: {
    fontSize: '12px',
    color: '#6b7280'
  },
  employeeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  employeeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  employeeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  employeeStats: {
    textAlign: 'right',
    fontSize: '12px',
    color: '#6b7280'
  },
  varianceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  varianceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  terminalId: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  varianceDetails: {
    textAlign: 'right',
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  }
};

export default POSReportsScreen;