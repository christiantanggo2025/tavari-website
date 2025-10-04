// src/components/Reports/PromotionalEffectivenessReport.jsx - Fixed Version
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../UI/TavariCheckbox';

/**
 * Fixed Promotional Effectiveness Report Component
 * Analyzes the performance and ROI of discounts, promotions, and marketing campaigns
 * Uses correct database relationships: pos_loyalty_accounts instead of pos_customers
 * 
 * @param {Object} props
 * @param {Object} props.data - Base report data from parent
 * @param {string} props.dateRange - Selected date range
 * @param {string} props.customDateStart - Custom start date
 * @param {string} props.customDateEnd - Custom end date
 * @param {boolean} props.compareToLastYear - Whether to include year comparison
 * @param {string} props.selectedEmployee - Selected employee filter
 * @param {Array} props.employees - List of employees
 * @param {string} props.businessId - Business ID from parent
 * @param {Function} props.onExport - Export callback
 * @param {Function} props.onEmail - Email callback
 */
const PromotionalEffectivenessReport = ({
  data,
  dateRange,
  customDateStart,
  customDateEnd,
  compareToLastYear,
  selectedEmployee,
  employees,
  businessId,  // Receive businessId from parent instead of using auth hook
  onExport,
  onEmail
}) => {
  const [reportData, setReportData] = useState({
    promotionalSummary: {
      totalDiscountAmount: 0,
      totalLoyaltyDiscounts: 0,
      totalPromotedSales: 0,
      promotionalTransactions: 0,
      averageDiscountPerTransaction: 0,
      discountPenetrationRate: 0
    },
    discountPerformance: [],
    campaignAnalysis: [],
    customerBehavior: {
      newCustomersDuringPromo: 0,
      repeatCustomerResponse: 0,
      averageTransactionWithPromo: 0,
      averageTransactionWithoutPromo: 0
    },
    timeBasedAnalysis: [],
    productPromotionAnalysis: [],
    roiAnalysis: {
      totalRevenueLift: 0,
      costOfDiscounts: 0,
      netPromoROI: 0,
      breakEvenPoint: 0
    },
    comparisonData: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [selectedDiscountType, setSelectedDiscountType] = useState('all');
  const [minimumTransactions, setMinimumTransactions] = useState(5);
  const [businessData, setBusinessData] = useState(null);

  // Load business data
  useEffect(() => {
    if (businessId) {
      loadBusinessData();
    }
  }, [businessId]);

  const loadBusinessData = async () => {
    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (!businessError && business) {
        setBusinessData(business);
      }
    } catch (err) {
      console.warn('Could not load business data:', err);
    }
  };

  useEffect(() => {
    if (businessId) {
      generatePromotionalReport();
    }
  }, [businessId, dateRange, customDateStart, customDateEnd, selectedEmployee, selectedDiscountType, minimumTransactions]);

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

  const generatePromotionalReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateFilter();

      console.log('Generating promotional report for business:', businessId);
      console.log('Date range:', start, 'to', end);

      // FIXED: Use correct table relationships
      // Get all sales data with promotional information
      let salesQuery = supabase
        .from('pos_sales')
        .select(`
          id, subtotal, tax, discount, loyalty_discount, total, created_at, 
          customer_id, loyalty_customer_id, user_id, payment_status, sale_number,
          pos_sale_items (
            id, inventory_id, name, quantity, unit_price, total_price, 
            tax_amount, category_id, modifiers
          )
        `)
        .eq('business_id', businessId)
        .gte('created_at', start)
        .lt('created_at', end)
        .in('payment_status', ['paid', 'completed']);

      if (selectedEmployee !== 'all') {
        salesQuery = salesQuery.eq('user_id', selectedEmployee);
      }

      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) {
        console.error('Sales query error:', salesError);
        throw new Error(`Failed to fetch sales data: ${salesError.message}`);
      }

      console.log('Sales data retrieved:', sales?.length || 0, 'transactions');

      // FIXED: Get customer data from pos_loyalty_accounts (not pos_customers)
      let customerData = [];
      const customerIds = [...new Set([
        ...sales?.map(s => s.customer_id).filter(id => id),
        ...sales?.map(s => s.loyalty_customer_id).filter(id => id)
      ])] || [];

      if (customerIds.length > 0) {
        const { data: customers, error: customersError } = await supabase
          .from('pos_loyalty_accounts')
          .select('id, customer_name, customer_email, created_at')
          .eq('business_id', businessId)
          .in('id', customerIds);

        if (customersError) {
          console.warn('Could not fetch customer data:', customersError);
        } else {
          customerData = customers || [];
        }
      }

      console.log('Customer data retrieved:', customerData.length, 'customers');

      // Get discount configuration data
      const { data: discounts, error: discountsError } = await supabase
        .from('pos_discounts')
        .select('*')
        .eq('business_id', businessId);

      if (discountsError) {
        console.warn('Could not fetch discount data:', discountsError);
      }

      // FIXED: Check for loyalty settings (not loyalty_programs)
      const { data: loyaltySettings, error: loyaltyError } = await supabase
        .from('pos_loyalty_settings')
        .select('*')
        .eq('business_id', businessId);

      if (loyaltyError) {
        console.warn('Could not fetch loyalty settings:', loyaltyError);
      }

      // Process sales data for promotional analysis
      const promotedSales = sales?.filter(sale => 
        (Number(sale.discount) || 0) > 0 || (Number(sale.loyalty_discount) || 0) > 0
      ) || [];

      const nonPromotedSales = sales?.filter(sale => 
        (Number(sale.discount) || 0) === 0 && (Number(sale.loyalty_discount) || 0) === 0
      ) || [];

      console.log('Promoted sales:', promotedSales.length);
      console.log('Non-promoted sales:', nonPromotedSales.length);

      // Calculate promotional summary
      const totalDiscountAmount = promotedSales.reduce((sum, sale) => 
        sum + (Number(sale.discount) || 0), 0);
      
      const totalLoyaltyDiscounts = promotedSales.reduce((sum, sale) => 
        sum + (Number(sale.loyalty_discount) || 0), 0);

      const totalPromotedSales = promotedSales.reduce((sum, sale) => 
        sum + (Number(sale.total) || 0), 0);

      const averageDiscountPerTransaction = promotedSales.length > 0 ? 
        (totalDiscountAmount + totalLoyaltyDiscounts) / promotedSales.length : 0;

      const discountPenetrationRate = sales?.length > 0 ? 
        (promotedSales.length / sales.length) * 100 : 0;

      // Analyze discount performance by type
      const discountTypeAnalysis = {};
      
      promotedSales.forEach(sale => {
        const discountAmount = Number(sale.discount) || 0;
        const loyaltyAmount = Number(sale.loyalty_discount) || 0;
        const saleTotal = Number(sale.total) || 0;

        if (discountAmount > 0) {
          if (!discountTypeAnalysis['manual_discount']) {
            discountTypeAnalysis['manual_discount'] = {
              type: 'Manual Discount',
              totalAmount: 0,
              totalTransactions: 0,
              totalRevenue: 0,
              averageDiscount: 0,
              penetrationRate: 0
            };
          }
          discountTypeAnalysis['manual_discount'].totalAmount += discountAmount;
          discountTypeAnalysis['manual_discount'].totalTransactions += 1;
          discountTypeAnalysis['manual_discount'].totalRevenue += saleTotal;
        }

        if (loyaltyAmount > 0) {
          if (!discountTypeAnalysis['loyalty_discount']) {
            discountTypeAnalysis['loyalty_discount'] = {
              type: 'Loyalty Program',
              totalAmount: 0,
              totalTransactions: 0,
              totalRevenue: 0,
              averageDiscount: 0,
              penetrationRate: 0
            };
          }
          discountTypeAnalysis['loyalty_discount'].totalAmount += loyaltyAmount;
          discountTypeAnalysis['loyalty_discount'].totalTransactions += 1;
          discountTypeAnalysis['loyalty_discount'].totalRevenue += saleTotal;
        }
      });

      // Calculate percentages and averages for discount analysis
      Object.keys(discountTypeAnalysis).forEach(key => {
        const analysis = discountTypeAnalysis[key];
        analysis.averageDiscount = analysis.totalTransactions > 0 ? 
          analysis.totalAmount / analysis.totalTransactions : 0;
        analysis.penetrationRate = sales?.length > 0 ? 
          (analysis.totalTransactions / sales.length) * 100 : 0;
      });

      // FIXED: Customer behavior analysis using correct customer mapping
      const customersWithPromo = new Set();
      const customersWithoutPromo = new Set();
      const newCustomersDuringPromo = new Set();

      // Create customer lookup map
      const customerLookup = {};
      customerData.forEach(customer => {
        customerLookup[customer.id] = customer;
      });

      promotedSales.forEach(sale => {
        const customerId = sale.customer_id || sale.loyalty_customer_id;
        if (customerId) {
          customersWithPromo.add(customerId);
          
          // Check if customer was created during promotional period
          const customer = customerLookup[customerId];
          if (customer?.created_at) {
            const customerCreated = new Date(customer.created_at);
            const promoStart = new Date(start);
            if (customerCreated >= promoStart) {
              newCustomersDuringPromo.add(customerId);
            }
          }
        }
      });

      nonPromotedSales.forEach(sale => {
        const customerId = sale.customer_id || sale.loyalty_customer_id;
        if (customerId) {
          customersWithoutPromo.add(customerId);
        }
      });

      const averageTransactionWithPromo = promotedSales.length > 0 ?
        totalPromotedSales / promotedSales.length : 0;

      const totalNonPromotedSales = nonPromotedSales.reduce((sum, sale) => 
        sum + (Number(sale.total) || 0), 0);
      
      const averageTransactionWithoutPromo = nonPromotedSales.length > 0 ?
        totalNonPromotedSales / nonPromotedSales.length : 0;

      // Time-based analysis (hourly performance)
      const hourlyAnalysis = {};
      
      promotedSales.forEach(sale => {
        const hour = new Date(sale.created_at).getHours();
        if (!hourlyAnalysis[hour]) {
          hourlyAnalysis[hour] = {
            hour,
            transactions: 0,
            revenue: 0,
            discountAmount: 0
          };
        }
        hourlyAnalysis[hour].transactions += 1;
        hourlyAnalysis[hour].revenue += Number(sale.total) || 0;
        hourlyAnalysis[hour].discountAmount += (Number(sale.discount) || 0) + (Number(sale.loyalty_discount) || 0);
      });

      const timeBasedAnalysis = Object.values(hourlyAnalysis)
        .sort((a, b) => a.hour - b.hour);

      // Product-level promotion analysis
      const productAnalysis = {};
      
      promotedSales.forEach(sale => {
        if (sale.pos_sale_items) {
          sale.pos_sale_items.forEach(item => {
            const key = item.name || 'Unknown Item';
            if (!productAnalysis[key]) {
              productAnalysis[key] = {
                productName: key,
                promotedQuantity: 0,
                promotedRevenue: 0,
                timesDiscounted: 0
              };
            }
            productAnalysis[key].promotedQuantity += Number(item.quantity) || 0;
            productAnalysis[key].promotedRevenue += Number(item.total_price) || 0;
            // Count as discounted if the parent sale had a discount
            if ((Number(sale.discount) || 0) > 0 || (Number(sale.loyalty_discount) || 0) > 0) {
              productAnalysis[key].timesDiscounted += 1;
            }
          });
        }
      });

      const productPromotionAnalysis = Object.values(productAnalysis)
        .filter(product => product.promotedQuantity >= minimumTransactions)
        .sort((a, b) => b.promotedRevenue - a.promotedRevenue)
        .slice(0, 15);

      // ROI Analysis
      const totalCostOfDiscounts = totalDiscountAmount + totalLoyaltyDiscounts;
      const baselineRevenue = totalNonPromotedSales;
      const promotionalRevenue = totalPromotedSales;
      
      // Calculate revenue lift (assume 70% of promoted sales wouldn't have happened without promotion)
      const estimatedRevenueLift = promotionalRevenue * 0.7; // Conservative estimate
      const netPromoROI = totalCostOfDiscounts > 0 ? 
        ((estimatedRevenueLift - totalCostOfDiscounts) / totalCostOfDiscounts) * 100 : 0;

      const avgTransactionDifference = averageTransactionWithPromo - averageTransactionWithoutPromo;
      const breakEvenPoint = avgTransactionDifference > 0 ? 
        totalCostOfDiscounts / avgTransactionDifference : 0;

      // Comparison with last year if requested
      let comparisonData = null;
      if (compareToLastYear) {
        try {
          const lastYearStart = new Date(start);
          const lastYearEnd = new Date(end);
          lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
          lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

          const { data: lastYearSales, error: lastYearError } = await supabase
            .from('pos_sales')
            .select('discount, loyalty_discount, total')
            .eq('business_id', businessId)
            .in('payment_status', ['paid', 'completed'])
            .gte('created_at', lastYearStart.toISOString())
            .lt('created_at', lastYearEnd.toISOString());

          if (!lastYearError && lastYearSales?.length > 0) {
            const lastYearPromotedSales = lastYearSales.filter(sale => 
              (Number(sale.discount) || 0) > 0 || (Number(sale.loyalty_discount) || 0) > 0
            );

            const lastYearDiscounts = lastYearPromotedSales.reduce((sum, sale) => 
              sum + (Number(sale.discount) || 0) + (Number(sale.loyalty_discount) || 0), 0);

            const lastYearPromotedRevenue = lastYearPromotedSales.reduce((sum, sale) => 
              sum + (Number(sale.total) || 0), 0);

            comparisonData = {
              lastYearDiscounts,
              lastYearPromotedRevenue,
              lastYearPromotedTransactions: lastYearPromotedSales.length,
              discountGrowth: lastYearDiscounts > 0 ? 
                ((totalCostOfDiscounts - lastYearDiscounts) / lastYearDiscounts * 100) : 0,
              revenueGrowth: lastYearPromotedRevenue > 0 ? 
                ((promotionalRevenue - lastYearPromotedRevenue) / lastYearPromotedRevenue * 100) : 0
            };
          }
        } catch (comparisonError) {
          console.warn('Could not generate year comparison:', comparisonError);
        }
      }

      setReportData({
        promotionalSummary: {
          totalDiscountAmount,
          totalLoyaltyDiscounts,
          totalPromotedSales,
          promotionalTransactions: promotedSales.length,
          averageDiscountPerTransaction,
          discountPenetrationRate
        },
        discountPerformance: Object.values(discountTypeAnalysis),
        customerBehavior: {
          newCustomersDuringPromo: newCustomersDuringPromo.size,
          repeatCustomerResponse: customersWithPromo.size,
          averageTransactionWithPromo,
          averageTransactionWithoutPromo
        },
        timeBasedAnalysis,
        productPromotionAnalysis,
        roiAnalysis: {
          totalRevenueLift: estimatedRevenueLift,
          costOfDiscounts: totalCostOfDiscounts,
          netPromoROI,
          breakEvenPoint
        },
        comparisonData
      });

      console.log('Promotional report generated successfully');

    } catch (err) {
      console.error('Error generating promotional effectiveness report:', err);
      setError(`Failed to generate promotional effectiveness report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercent = (value) => `${(value || 0).toFixed(1)}%`;

  const exportToCSV = () => {
    try {
      const csvData = [
        ['Promotional Effectiveness Report'],
        ['Business:', businessData?.name || 'Unknown Business'],
        ['Date Range:', dateRange === 'custom' ? `${customDateStart} to ${customDateEnd}` : dateRange],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Summary Metrics'],
        ['Total Discount Amount', formatCurrency(reportData.promotionalSummary.totalDiscountAmount)],
        ['Total Loyalty Discounts', formatCurrency(reportData.promotionalSummary.totalLoyaltyDiscounts)],
        ['Promotional Revenue', formatCurrency(reportData.promotionalSummary.totalPromotedSales)],
        ['Promotional Transactions', reportData.promotionalSummary.promotionalTransactions],
        ['Discount Penetration Rate', formatPercent(reportData.promotionalSummary.discountPenetrationRate)],
        [''],
        ['Discount Performance'],
        ['Type', 'Total Amount', 'Transactions', 'Revenue', 'Avg Discount', 'Penetration %'],
        ...reportData.discountPerformance.map(discount => [
          discount.type,
          formatCurrency(discount.totalAmount),
          discount.totalTransactions,
          formatCurrency(discount.totalRevenue),
          formatCurrency(discount.averageDiscount),
          formatPercent(discount.penetrationRate)
        ]),
        [''],
        ['Product Performance'],
        ['Product', 'Promoted Quantity', 'Promoted Revenue'],
        ...reportData.productPromotionAnalysis.map(product => [
          product.productName,
          product.promotedQuantity,
          formatCurrency(product.promotedRevenue)
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      
      if (onExport) {
        onExport(dataUri, 'csv', 'promotional-effectiveness');
      }
    } catch (exportError) {
      console.error('Export error:', exportError);
      setError('Failed to export report');
    }
  };

  const emailReport = () => {
    try {
      const emailBody = `Promotional Effectiveness Report (${dateRange})

Business: ${businessData?.name || 'Unknown Business'}
Generated: ${new Date().toLocaleString()}

Summary:
- Total Discounts Given: ${formatCurrency(reportData.promotionalSummary.totalDiscountAmount)}
- Total Loyalty Discounts: ${formatCurrency(reportData.promotionalSummary.totalLoyaltyDiscounts)}
- Promotional Revenue: ${formatCurrency(reportData.promotionalSummary.totalPromotedSales)}
- Discount Penetration: ${formatPercent(reportData.promotionalSummary.discountPenetrationRate)}
- Estimated ROI: ${formatPercent(reportData.roiAnalysis.netPromoROI)}

Top Performing Products:
${reportData.productPromotionAnalysis.slice(0, 5).map(product => 
  `- ${product.productName}: ${formatCurrency(product.promotedRevenue)}`
).join('\n')}

Customer Impact:
- New Customers Acquired: ${reportData.customerBehavior.newCustomersDuringPromo}
- Customers Using Promotions: ${reportData.customerBehavior.repeatCustomerResponse}

This report analyzes the effectiveness of promotional campaigns and discount strategies.`;

      if (onEmail) {
        onEmail({
          subject: `Promotional Effectiveness Report - ${dateRange}`,
          body: emailBody
        });
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
      setError('Failed to prepare email report');
    }
  };

  const styles = {
    container: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.lg
    },

    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.xl,
      borderBottom: `2px solid ${TavariStyles.colors.gray200}`,
      paddingBottom: TavariStyles.spacing.lg
    },

    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },

    controls: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg,
      flexWrap: 'wrap',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },

    controlGroup: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: '120px'
    },

    label: TavariStyles.components.form.label,
    select: TavariStyles.components.form.select,
    input: TavariStyles.components.form.input,

    actionButtons: {
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

    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.xl
    },

    summaryCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      textAlign: 'center',
      backgroundColor: TavariStyles.colors.white
    },

    summaryValue: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.xs
    },

    summaryLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },

    sectionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.xl
    },

    section: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg
    },

    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      paddingBottom: TavariStyles.spacing.xs
    },

    table: {
      ...TavariStyles.components.table.table,
      fontSize: TavariStyles.typography.fontSize.sm
    },

    th: {
      ...TavariStyles.components.table.th,
      backgroundColor: TavariStyles.colors.gray100,
      fontSize: TavariStyles.typography.fontSize.xs
    },

    td: {
      ...TavariStyles.components.table.td,
      padding: TavariStyles.spacing.sm
    },

    row: {
      ...TavariStyles.components.table.row,
      '&:hover': {
        backgroundColor: TavariStyles.colors.gray50
      }
    },

    loading: TavariStyles.components.loading.container,

    error: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.lg
    },

    metric: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: TavariStyles.spacing.xs,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`
    },

    metricLabel: {
      color: TavariStyles.colors.gray600,
      fontSize: TavariStyles.typography.fontSize.sm
    },

    metricValue: {
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900,
      fontSize: TavariStyles.typography.fontSize.sm
    },

    positiveChange: {
      color: TavariStyles.colors.success
    },

    negativeChange: {
      color: TavariStyles.colors.danger
    },

    noDataMessage: {
      textAlign: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic'
    }
  };

  if (loading) {
    return <div style={styles.loading}>Generating promotional effectiveness report...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Promotional Effectiveness Report</h2>
        <div style={styles.actionButtons}>
          <button style={styles.button} onClick={exportToCSV}>
            Export CSV
          </button>
          <button style={styles.primaryButton} onClick={emailReport}>
            Email Report
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Discount Type:</label>
          <select
            value={selectedDiscountType}
            onChange={(e) => setSelectedDiscountType(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Discounts</option>
            <option value="manual">Manual Discounts Only</option>
            <option value="loyalty">Loyalty Discounts Only</option>
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Min Transactions:</label>
          <input
            type="number"
            value={minimumTransactions}
            onChange={(e) => setMinimumTransactions(parseInt(e.target.value) || 1)}
            min="1"
            style={styles.input}
          />
        </div>

        <div style={styles.controlGroup}>
          <TavariCheckbox
            checked={showAdvancedMetrics}
            onChange={setShowAdvancedMetrics}
            label="Show Advanced Metrics"
            id="show-advanced-metrics"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>
            {formatCurrency(reportData.promotionalSummary.totalDiscountAmount + reportData.promotionalSummary.totalLoyaltyDiscounts)}
          </div>
          <div style={styles.summaryLabel}>Total Discounts Given</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>
            {formatCurrency(reportData.promotionalSummary.totalPromotedSales)}
          </div>
          <div style={styles.summaryLabel}>Promotional Revenue</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>
            {formatPercent(reportData.promotionalSummary.discountPenetrationRate)}
          </div>
          <div style={styles.summaryLabel}>Discount Penetration</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>
            {formatPercent(reportData.roiAnalysis.netPromoROI)}
          </div>
          <div style={styles.summaryLabel}>Estimated ROI</div>
        </div>
      </div>

      {/* Section Grid */}
      <div style={styles.sectionGrid}>
        {/* Discount Performance */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Discount Performance</h3>
          {reportData.discountPerformance.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Transactions</th>
                  <th style={styles.th}>Penetration</th>
                </tr>
              </thead>
              <tbody>
                {reportData.discountPerformance.map((discount, index) => (
                  <tr key={index} style={styles.row}>
                    <td style={styles.td}>{discount.type}</td>
                    <td style={styles.td}>{formatCurrency(discount.totalAmount)}</td>
                    <td style={styles.td}>{discount.totalTransactions}</td>
                    <td style={styles.td}>{formatPercent(discount.penetrationRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={styles.noDataMessage}>No promotional activity found for this period.</div>
          )}
        </div>

        {/* Customer Behavior */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Customer Impact</h3>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>New Customers Acquired</span>
            <span style={styles.metricValue}>{reportData.customerBehavior.newCustomersDuringPromo}</span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Customers Using Promotions</span>
            <span style={styles.metricValue}>{reportData.customerBehavior.repeatCustomerResponse}</span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Avg Transaction (Promoted)</span>
            <span style={styles.metricValue}>{formatCurrency(reportData.customerBehavior.averageTransactionWithPromo)}</span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Avg Transaction (Regular)</span>
            <span style={styles.metricValue}>{formatCurrency(reportData.customerBehavior.averageTransactionWithoutPromo)}</span>
          </div>
          {reportData.customerBehavior.averageTransactionWithPromo > reportData.customerBehavior.averageTransactionWithoutPromo && (
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Transaction Lift</span>
              <span style={{...styles.metricValue, ...styles.positiveChange}}>
                +{formatCurrency(reportData.customerBehavior.averageTransactionWithPromo - reportData.customerBehavior.averageTransactionWithoutPromo)}
              </span>
            </div>
          )}
        </div>

        {/* ROI Analysis */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>ROI Analysis</h3>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Cost of Discounts</span>
            <span style={styles.metricValue}>{formatCurrency(reportData.roiAnalysis.costOfDiscounts)}</span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Estimated Revenue Lift</span>
            <span style={styles.metricValue}>{formatCurrency(reportData.roiAnalysis.totalRevenueLift)}</span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Net ROI</span>
            <span style={{
              ...styles.metricValue, 
              ...(reportData.roiAnalysis.netPromoROI > 0 ? styles.positiveChange : styles.negativeChange)
            }}>
              {formatPercent(reportData.roiAnalysis.netPromoROI)}
            </span>
          </div>
          {reportData.roiAnalysis.breakEvenPoint > 0 && (
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Break-even Transactions</span>
              <span style={styles.metricValue}>{Math.ceil(reportData.roiAnalysis.breakEvenPoint)}</span>
            </div>
          )}
        </div>

        {/* Year Comparison */}
        {compareToLastYear && reportData.comparisonData && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Year-over-Year Comparison</h3>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Discount Growth</span>
              <span style={{
                ...styles.metricValue, 
                ...(reportData.comparisonData.discountGrowth > 0 ? styles.positiveChange : styles.negativeChange)
              }}>
                {formatPercent(reportData.comparisonData.discountGrowth)}
              </span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Revenue Growth</span>
              <span style={{
                ...styles.metricValue, 
                ...(reportData.comparisonData.revenueGrowth > 0 ? styles.positiveChange : styles.negativeChange)
              }}>
                {formatPercent(reportData.comparisonData.revenueGrowth)}
              </span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Last Year Discounts</span>
              <span style={styles.metricValue}>{formatCurrency(reportData.comparisonData.lastYearDiscounts)}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Last Year Revenue</span>
              <span style={styles.metricValue}>{formatCurrency(reportData.comparisonData.lastYearPromotedRevenue)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Metrics */}
      {showAdvancedMetrics && (
        <>
          {/* Product Performance */}
          {reportData.productPromotionAnalysis.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Top Promoted Products</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Promoted Qty</th>
                    <th style={styles.th}>Promoted Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.productPromotionAnalysis.slice(0, 10).map((product, index) => (
                    <tr key={index} style={styles.row}>
                      <td style={styles.td}>{product.productName}</td>
                      <td style={styles.td}>{product.promotedQuantity}</td>
                      <td style={styles.td}>{formatCurrency(product.promotedRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Time-based Analysis */}
          {reportData.timeBasedAnalysis.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Hourly Promotional Activity</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Hour</th>
                    <th style={styles.th}>Transactions</th>
                    <th style={styles.th}>Revenue</th>
                    <th style={styles.th}>Discounts</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.timeBasedAnalysis
                    .filter(hour => hour.transactions > 0)
                    .slice(0, 12)
                    .map((hour, index) => (
                    <tr key={index} style={styles.row}>
                      <td style={styles.td}>{hour.hour}:00</td>
                      <td style={styles.td}>{hour.transactions}</td>
                      <td style={styles.td}>{formatCurrency(hour.revenue)}</td>
                      <td style={styles.td}>{formatCurrency(hour.discountAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PromotionalEffectivenessReport;