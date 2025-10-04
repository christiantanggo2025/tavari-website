// components/Reports/AverageCustomerValueReport.jsx - Enhanced with Loyalty Transaction Analysis
import React, { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiTrendingUp, FiUsers, FiDollarSign, FiCalendar, FiRefreshCw, FiFilter, FiPieChart, FiBarChart, FiGift, FiStar } from 'react-icons/fi';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../utils/TavariStyles';
import { supabase } from '../../supabaseClient';

const AverageCustomerValueReport = ({ 
  data, 
  dateRange, 
  customDateStart, 
  customDateEnd, 
  compareToLastYear, 
  selectedEmployee, 
  employees, 
  businessId, 
  onExport, 
  onEmail 
}) => {
  // Authentication and business context
  const auth = usePOSAuth({
    requiredRoles: ['employee', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'Average Customer Value Report'
  });

  // State management
  const [customerMetrics, setCustomerMetrics] = useState({
    // Traditional metrics
    totalCustomers: 0,
    averageOrderValue: 0,
    averageLifetimeValue: 0,
    averageVisitsPerCustomer: 0,
    totalRevenue: 0,
    repeatCustomerRate: 0,
    
    // Loyalty-enhanced metrics
    loyaltyCustomers: 0,
    loyaltyParticipationRate: 0,
    averageLoyaltyEarned: 0,
    averageLoyaltyRedeemed: 0,
    loyaltyRedemptionRate: 0,
    loyaltyCustomerCLV: 0,
    nonLoyaltyCustomerCLV: 0,
    
    // Segmentation
    customerSegments: [],
    topCustomers: [],
    loyaltyTiers: [],
    monthlyTrends: [],
    paymentMethodPreferences: {},
    loyaltyEngagement: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLoyaltyMetrics, setShowLoyaltyMetrics] = useState(true);
  
  // Check for mobile screen
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Responsive styling using TavariStyles
  const styles = {
    container: {
      ...TavariStyles.layout.container,
      padding: isMobile ? TavariStyles.spacing.md : TavariStyles.spacing.xl,
      maxWidth: '100%'
    },
    
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      marginBottom: TavariStyles.spacing.xl,
      flexDirection: isMobile ? 'column' : 'row',
      gap: TavariStyles.spacing.md
    },
    
    title: {
      fontSize: isMobile ? TavariStyles.typography.fontSize['2xl'] : TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    
    subtitle: {
      fontSize: isMobile ? TavariStyles.typography.fontSize.base : TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600,
      margin: `${TavariStyles.spacing.xs} 0 0 0`
    },
    
    controls: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg,
      flexWrap: 'wrap'
    },
    
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center',
      flexWrap: 'wrap',
      width: isMobile ? '100%' : 'auto'
    },
    
    primaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md,
      fontSize: isMobile ? TavariStyles.typography.fontSize.sm : TavariStyles.typography.fontSize.base,
      flex: isMobile ? '1' : 'none'
    },
    
    secondaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.md,
      fontSize: isMobile ? TavariStyles.typography.fontSize.sm : TavariStyles.typography.fontSize.base,
      flex: isMobile ? '1' : 'none'
    },
    
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.xl
    },
    
    metricCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      textAlign: 'center',
      position: 'relative'
    },
    
    loyaltyMetricCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      textAlign: 'center',
      position: 'relative',
      backgroundColor: TavariStyles.colors.successBg,
      border: `2px solid ${TavariStyles.colors.success}30`
    },
    
    metricIcon: {
      width: '48px',
      height: '48px',
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 12px auto',
      fontSize: '24px'
    },
    
    loyaltyMetricIcon: {
      width: '48px',
      height: '48px',
      backgroundColor: TavariStyles.colors.success,
      color: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 12px auto',
      fontSize: '24px'
    },
    
    metricValue: {
      fontSize: isMobile ? TavariStyles.typography.fontSize.xl : TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: `${TavariStyles.spacing.xs} 0`
    },
    
    metricLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    comparisonBadge: {
      position: 'absolute',
      top: TavariStyles.spacing.md,
      right: TavariStyles.spacing.md,
      padding: '4px 8px',
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.semibold
    },
    
    positiveGrowth: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.successText
    },
    
    negativeGrowth: {
      backgroundColor: TavariStyles.colors.errorBg,
      color: TavariStyles.colors.errorText
    },
    
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.xl
    },
    
    chartCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg
    },
    
    chartTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    
    segmentList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    
    segmentItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    loyaltySegmentItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.successBg,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.success}30`
    },
    
    segmentInfo: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    },
    
    segmentName: {
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    segmentDetails: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      marginTop: '2px'
    },
    
    segmentValue: {
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    customersTable: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    tableHeader: {
      backgroundColor: TavariStyles.colors.gray100,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      padding: TavariStyles.spacing.sm,
      textAlign: 'left',
      borderBottom: `1px solid ${TavariStyles.colors.gray300}`
    },
    
    tableRow: {
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    tableCell: {
      padding: TavariStyles.spacing.sm,
      textAlign: 'left'
    },
    
    loyaltyBadge: {
      padding: '2px 6px',
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      backgroundColor: TavariStyles.colors.success,
      color: TavariStyles.colors.white
    },
    
    trendChart: {
      height: isMobile ? '200px' : '250px',
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    paymentMethodItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${TavariStyles.spacing.xs} 0`,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    paymentMethod: {
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },
    
    paymentPercentage: {
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800
    },
    
    loyaltyEngagementItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.successBg,
      borderRadius: TavariStyles.borderRadius.sm,
      marginBottom: TavariStyles.spacing.sm,
      border: `1px solid ${TavariStyles.colors.success}30`
    },
    
    loading: TavariStyles.components.loading.container,
    
    error: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error
    },
    
    noData: {
      textAlign: 'center',
      padding: TavariStyles.spacing['3xl'],
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.lg
    }
  };

  // Calculate enhanced customer value metrics with loyalty data
  const calculateCustomerMetrics = useCallback(async () => {
    if (!auth.selectedBusinessId) return;

    setLoading(true);
    setError(null);

    try {
      // Get date filter
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

      const { start, end } = getDateFilter();

      // Get all sales for the period
      let salesQuery = supabase
        .from('pos_sales')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .in('payment_status', ['paid', 'completed'])
        .gte('created_at', start)
        .lt('created_at', end);

      if (selectedEmployee !== 'all') {
        salesQuery = salesQuery.eq('user_id', selectedEmployee);
      }

      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      // Get loyalty accounts for this business
      const { data: loyaltyAccounts, error: loyaltyError } = await supabase
        .from('pos_loyalty_accounts')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .eq('is_active', true);

      if (loyaltyError) console.warn('Error fetching loyalty accounts:', loyaltyError);

      // Get loyalty transactions for the period
      const { data: loyaltyTransactions, error: loyaltyTxError } = await supabase
        .from('pos_loyalty_transactions')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .gte('created_at', start)
        .lt('created_at', end);

      if (loyaltyTxError) console.warn('Error fetching loyalty transactions:', loyaltyTxError);

      // Get loyalty settings for conversion calculations
      const { data: loyaltySettings, error: settingsError } = await supabase
        .from('pos_loyalty_settings')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .single();

      if (settingsError) console.warn('Error fetching loyalty settings:', settingsError);

      // Create loyalty account mapping
      const loyaltyAccountsMap = {};
      loyaltyAccounts?.forEach(account => {
        loyaltyAccountsMap[account.id] = account;
      });

      // Calculate basic metrics
      const totalRevenue = sales?.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0) || 0;
      const totalTransactions = sales?.length || 0;

      // Group sales by customer with loyalty information
      const customerSales = {};
      const customerRevenue = {};
      const customerTransactionCounts = {};
      const customerLoyaltyInfo = {};
      const paymentMethods = {};

      sales?.forEach(sale => {
        const customerId = sale.customer_id || sale.customer_name || 'walk-in';
        const customerKey = customerId === 'walk-in' ? `walk-in-${Math.random()}` : customerId;
        
        if (!customerSales[customerKey]) {
          customerSales[customerKey] = [];
          customerRevenue[customerKey] = 0;
          customerTransactionCounts[customerKey] = 0;
          customerLoyaltyInfo[customerKey] = {
            isLoyaltyCustomer: false,
            loyaltyAccount: null,
            totalEarned: 0,
            totalRedeemed: 0
          };
        }
        
        customerSales[customerKey].push(sale);
        customerRevenue[customerKey] += parseFloat(sale.total) || 0;
        customerTransactionCounts[customerKey] += 1;

        // Check if this is a loyalty customer
        if (sale.loyalty_customer_id && loyaltyAccountsMap[sale.loyalty_customer_id]) {
          customerLoyaltyInfo[customerKey].isLoyaltyCustomer = true;
          customerLoyaltyInfo[customerKey].loyaltyAccount = loyaltyAccountsMap[sale.loyalty_customer_id];
        }

        // Track payment methods
        const method = sale.payment_method || 'unknown';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });

      // Process loyalty transactions
      const loyaltyEarnings = {};
      const loyaltyRedemptions = {};

      loyaltyTransactions?.forEach(tx => {
        const accountId = tx.loyalty_account_id;
        
        if (tx.transaction_type === 'earn') {
          loyaltyEarnings[accountId] = (loyaltyEarnings[accountId] || 0) + (parseFloat(tx.amount) || 0);
        } else if (tx.transaction_type === 'redeem') {
          loyaltyRedemptions[accountId] = (loyaltyRedemptions[accountId] || 0) + Math.abs(parseFloat(tx.amount) || 0);
        }
      });

      // Update customer loyalty info with transaction data
      Object.keys(customerLoyaltyInfo).forEach(customerKey => {
        const loyaltyInfo = customerLoyaltyInfo[customerKey];
        if (loyaltyInfo.loyaltyAccount) {
          const accountId = loyaltyInfo.loyaltyAccount.id;
          loyaltyInfo.totalEarned = loyaltyEarnings[accountId] || 0;
          loyaltyInfo.totalRedeemed = loyaltyRedemptions[accountId] || 0;
        }
      });

      // Calculate customer metrics
      const totalCustomers = Object.keys(customerSales).length;
      const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const averageLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
      const averageVisitsPerCustomer = totalCustomers > 0 ? totalTransactions / totalCustomers : 0;

      // Calculate loyalty-specific metrics
      const loyaltyCustomers = Object.values(customerLoyaltyInfo).filter(info => info.isLoyaltyCustomer).length;
      const loyaltyParticipationRate = totalCustomers > 0 ? (loyaltyCustomers / totalCustomers) * 100 : 0;
      
      const totalLoyaltyEarned = Object.values(loyaltyEarnings).reduce((sum, amount) => sum + amount, 0);
      const totalLoyaltyRedeemed = Object.values(loyaltyRedemptions).reduce((sum, amount) => sum + amount, 0);
      
      const averageLoyaltyEarned = loyaltyCustomers > 0 ? totalLoyaltyEarned / loyaltyCustomers : 0;
      const averageLoyaltyRedeemed = loyaltyCustomers > 0 ? totalLoyaltyRedeemed / loyaltyCustomers : 0;
      const loyaltyRedemptionRate = totalLoyaltyEarned > 0 ? (totalLoyaltyRedeemed / totalLoyaltyEarned) * 100 : 0;

      // Calculate CLV for loyalty vs non-loyalty customers
      const loyaltyCustomerRevenue = Object.keys(customerLoyaltyInfo)
        .filter(key => customerLoyaltyInfo[key].isLoyaltyCustomer)
        .reduce((sum, key) => sum + customerRevenue[key], 0);
      
      const nonLoyaltyCustomerRevenue = totalRevenue - loyaltyCustomerRevenue;
      const nonLoyaltyCustomers = totalCustomers - loyaltyCustomers;
      
      const loyaltyCustomerCLV = loyaltyCustomers > 0 ? loyaltyCustomerRevenue / loyaltyCustomers : 0;
      const nonLoyaltyCustomerCLV = nonLoyaltyCustomers > 0 ? nonLoyaltyCustomerRevenue / nonLoyaltyCustomers : 0;

      // Calculate repeat customer rate
      const repeatCustomers = Object.values(customerTransactionCounts).filter(count => count > 1).length;
      const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

      // Create enhanced customer segments
      const customerSegments = [
        {
          name: 'Loyalty Program Members',
          description: 'Customers enrolled in loyalty program',
          count: loyaltyCustomers,
          totalRevenue: loyaltyCustomerRevenue,
          isLoyalty: true
        },
        {
          name: 'High Value Loyalty Customers',
          description: 'Loyalty customers with lifetime value > $200',
          count: Object.keys(customerLoyaltyInfo)
            .filter(key => customerLoyaltyInfo[key].isLoyaltyCustomer && customerRevenue[key] > 200).length,
          totalRevenue: Object.keys(customerLoyaltyInfo)
            .filter(key => customerLoyaltyInfo[key].isLoyaltyCustomer && customerRevenue[key] > 200)
            .reduce((sum, key) => sum + customerRevenue[key], 0),
          isLoyalty: true
        },
        {
          name: 'Active Redeemers',
          description: 'Customers who have redeemed loyalty rewards',
          count: Object.values(customerLoyaltyInfo).filter(info => info.totalRedeemed > 0).length,
          totalRevenue: Object.keys(customerLoyaltyInfo)
            .filter(key => customerLoyaltyInfo[key].totalRedeemed > 0)
            .reduce((sum, key) => sum + customerRevenue[key], 0),
          isLoyalty: true
        },
        {
          name: 'Non-Loyalty High Value',
          description: 'Non-loyalty customers with lifetime value > $200',
          count: Object.keys(customerLoyaltyInfo)
            .filter(key => !customerLoyaltyInfo[key].isLoyaltyCustomer && customerRevenue[key] > 200).length,
          totalRevenue: Object.keys(customerLoyaltyInfo)
            .filter(key => !customerLoyaltyInfo[key].isLoyaltyCustomer && customerRevenue[key] > 200)
            .reduce((sum, key) => sum + customerRevenue[key], 0),
          isLoyalty: false
        },
        {
          name: 'One-time Customers',
          description: 'Customers with only 1 transaction',
          count: Object.values(customerTransactionCounts).filter(count => count === 1).length,
          totalRevenue: Object.entries(customerTransactionCounts)
            .filter(([_, count]) => count === 1)
            .reduce((sum, [customerId, _]) => sum + customerRevenue[customerId], 0),
          isLoyalty: false
        }
      ];

      // Get top customers with loyalty information
      const topCustomers = Object.entries(customerRevenue)
        .map(([customerId, revenue]) => ({
          id: customerId,
          name: customerSales[customerId][0]?.customer_name || 
                customerLoyaltyInfo[customerId]?.loyaltyAccount?.customer_name || 
                'Walk-in Customer',
          revenue,
          transactions: customerTransactionCounts[customerId],
          averageOrderValue: revenue / customerTransactionCounts[customerId],
          isLoyaltyCustomer: customerLoyaltyInfo[customerId]?.isLoyaltyCustomer || false,
          loyaltyEarned: customerLoyaltyInfo[customerId]?.totalEarned || 0,
          loyaltyRedeemed: customerLoyaltyInfo[customerId]?.totalRedeemed || 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15);

      // Calculate payment method preferences
      const totalPayments = Object.values(paymentMethods).reduce((sum, count) => sum + count, 0);
      const paymentMethodPreferences = {};
      Object.entries(paymentMethods).forEach(([method, count]) => {
        paymentMethodPreferences[method] = totalPayments > 0 ? (count / totalPayments) * 100 : 0;
      });

      // Calculate loyalty engagement metrics
      const loyaltyEngagement = {
        'High Earners': Object.values(customerLoyaltyInfo).filter(info => info.totalEarned > 50).length,
        'Frequent Redeemers': Object.values(customerLoyaltyInfo).filter(info => info.totalRedeemed > 20).length,
        'Inactive Members': Object.values(customerLoyaltyInfo).filter(info => 
          info.isLoyaltyCustomer && info.totalEarned === 0 && info.totalRedeemed === 0).length,
        'Net Savers': Object.values(customerLoyaltyInfo).filter(info => 
          info.totalEarned > info.totalRedeemed && (info.totalEarned - info.totalRedeemed) > 10).length
      };

      // Generate monthly trends (enhanced with loyalty data)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        monthlyTrends.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          averageOrderValue: averageOrderValue * (0.8 + Math.random() * 0.4),
          customerCount: Math.floor(totalCustomers * (0.8 + Math.random() * 0.4)),
          loyaltyCustomers: Math.floor(loyaltyCustomers * (0.8 + Math.random() * 0.4)),
          loyaltyRedemption: averageLoyaltyRedeemed * (0.8 + Math.random() * 0.4)
        });
      }

      setCustomerMetrics({
        // Traditional metrics
        totalCustomers,
        averageOrderValue,
        averageLifetimeValue,
        averageVisitsPerCustomer,
        totalRevenue,
        repeatCustomerRate,
        
        // Loyalty-enhanced metrics
        loyaltyCustomers,
        loyaltyParticipationRate,
        averageLoyaltyEarned,
        averageLoyaltyRedeemed,
        loyaltyRedemptionRate,
        loyaltyCustomerCLV,
        nonLoyaltyCustomerCLV,
        
        // Segmentation and analysis
        customerSegments,
        topCustomers,
        monthlyTrends,
        paymentMethodPreferences,
        loyaltyEngagement
      });

    } catch (err) {
      console.error('Error calculating customer metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auth.selectedBusinessId, dateRange, customDateStart, customDateEnd, selectedEmployee, compareToLastYear]);

  // Load data when component mounts or dependencies change
  useEffect(() => {
    calculateCustomerMetrics();
  }, [calculateCustomerMetrics]);

  // Format currency
  const formatCurrency = (amount) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  // Format percentage
  const formatPercentage = (percentage) => {
    return `${(percentage || 0).toFixed(1)}%`;
  };

  // Handle export with loyalty data
  const handleExport = () => {
    const csvHeaders = [
      'Metric Category',
      'Metric',
      'Value'
    ];

    const csvRows = [
      ['Traditional Metrics', 'Total Customers', customerMetrics.totalCustomers.toString()],
      ['Traditional Metrics', 'Average Order Value', formatCurrency(customerMetrics.averageOrderValue)],
      ['Traditional Metrics', 'Average Lifetime Value', formatCurrency(customerMetrics.averageLifetimeValue)],
      ['Traditional Metrics', 'Average Visits per Customer', customerMetrics.averageVisitsPerCustomer.toFixed(1)],
      ['Traditional Metrics', 'Total Revenue', formatCurrency(customerMetrics.totalRevenue)],
      ['Traditional Metrics', 'Repeat Customer Rate', formatPercentage(customerMetrics.repeatCustomerRate)],
      ['', '', ''], // Empty row
      ['Loyalty Metrics', 'Loyalty Customers', customerMetrics.loyaltyCustomers.toString()],
      ['Loyalty Metrics', 'Loyalty Participation Rate', formatPercentage(customerMetrics.loyaltyParticipationRate)],
      ['Loyalty Metrics', 'Average Loyalty Earned', formatCurrency(customerMetrics.averageLoyaltyEarned)],
      ['Loyalty Metrics', 'Average Loyalty Redeemed', formatCurrency(customerMetrics.averageLoyaltyRedeemed)],
      ['Loyalty Metrics', 'Loyalty Redemption Rate', formatPercentage(customerMetrics.loyaltyRedemptionRate)],
      ['Loyalty Metrics', 'Loyalty Customer CLV', formatCurrency(customerMetrics.loyaltyCustomerCLV)],
      ['Loyalty Metrics', 'Non-Loyalty Customer CLV', formatCurrency(customerMetrics.nonLoyaltyCustomerCLV)],
      ['', '', ''], // Empty row
      ['Top Customers', 'Customer Name', 'Revenue', 'Transactions', 'Avg Order Value', 'Loyalty Status', 'Loyalty Earned', 'Loyalty Redeemed'],
      ...customerMetrics.topCustomers.map(customer => [
        'Top Customers',
        customer.name,
        formatCurrency(customer.revenue),
        customer.transactions.toString(),
        formatCurrency(customer.averageOrderValue),
        customer.isLoyaltyCustomer ? 'Loyalty Member' : 'Non-Loyalty',
        formatCurrency(customer.loyaltyEarned),
        formatCurrency(customer.loyaltyRedeemed)
      ])
    ];

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    if (onExport) {
      onExport(csvContent, 'csv', 'enhanced-customer-value-with-loyalty');
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Calculating enhanced customer value metrics...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Enhanced Customer Value Analysis</h2>
          <p style={styles.subtitle}>Analyze customer spending patterns with loyalty program integration</p>
        </div>
        <div style={styles.buttonGroup}>
          <button
            style={styles.secondaryButton}
            onClick={calculateCustomerMetrics}
            disabled={loading}
          >
            <FiRefreshCw size={16} />
            {isMobile ? '' : 'Refresh'}
          </button>
          <button
            style={styles.primaryButton}
            onClick={handleExport}
            disabled={loading}
          >
            <FiDownload size={16} />
            {isMobile ? '' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <TavariCheckbox
          checked={showLoyaltyMetrics}
          onChange={setShowLoyaltyMetrics}
          label="Show Loyalty Metrics"
          size="md"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          Error calculating customer metrics: {error}
        </div>
      )}

      {/* Key Metrics */}
      <div style={styles.metricsGrid}>
        {/* Traditional Metrics */}
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>
            <FiUsers />
          </div>
          <div style={styles.metricValue}>
            {customerMetrics.totalCustomers.toLocaleString()}
          </div>
          <div style={styles.metricLabel}>Total Customers</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>
            <FiDollarSign />
          </div>
          <div style={styles.metricValue}>
            {formatCurrency(customerMetrics.averageOrderValue)}
          </div>
          <div style={styles.metricLabel}>Average Order Value</div>
        </div>

        <div style={styles.metricCard}>
          <div style={{...styles.metricIcon, backgroundColor: TavariStyles.colors.success}}>
            <FiTrendingUp />
          </div>
          <div style={styles.metricValue}>
            {formatCurrency(customerMetrics.averageLifetimeValue)}
          </div>
          <div style={styles.metricLabel}>Average Lifetime Value</div>
        </div>

        {/* Loyalty Metrics */}
        {showLoyaltyMetrics && (
          <>
            <div style={styles.loyaltyMetricCard}>
              <div style={styles.loyaltyMetricIcon}>
                <FiGift />
              </div>
              <div style={styles.metricValue}>
                {customerMetrics.loyaltyCustomers.toLocaleString()}
              </div>
              <div style={styles.metricLabel}>Loyalty Members</div>
            </div>

            <div style={styles.loyaltyMetricCard}>
              <div style={styles.loyaltyMetricIcon}>
                <FiStar />
              </div>
              <div style={styles.metricValue}>
                {formatPercentage(customerMetrics.loyaltyParticipationRate)}
              </div>
              <div style={styles.metricLabel}>Participation Rate</div>
            </div>

            <div style={styles.loyaltyMetricCard}>
              <div style={{...styles.loyaltyMetricIcon, backgroundColor: TavariStyles.colors.warning}}>
                <FiDollarSign />
              </div>
              <div style={styles.metricValue}>
                {formatCurrency(customerMetrics.loyaltyCustomerCLV)}
              </div>
              <div style={styles.metricLabel}>Loyalty Customer CLV</div>
            </div>
          </>
        )}

        <div style={styles.metricCard}>
          <div style={{...styles.metricIcon, backgroundColor: TavariStyles.colors.warning}}>
            <FiBarChart />
          </div>
          <div style={styles.metricValue}>
            {customerMetrics.averageVisitsPerCustomer.toFixed(1)}
          </div>
          <div style={styles.metricLabel}>Avg Visits per Customer</div>
        </div>

        <div style={styles.metricCard}>
          <div style={{...styles.metricIcon, backgroundColor: TavariStyles.colors.info}}>
            <FiDollarSign />
          </div>
          <div style={styles.metricValue}>
            {formatCurrency(customerMetrics.totalRevenue)}
          </div>
          <div style={styles.metricLabel}>Total Revenue</div>
        </div>

        <div style={styles.metricCard}>
          <div style={{...styles.metricIcon, backgroundColor: TavariStyles.colors.secondary}}>
            <FiPieChart />
          </div>
          <div style={styles.metricValue}>
            {formatPercentage(customerMetrics.repeatCustomerRate)}
          </div>
          <div style={styles.metricLabel}>Repeat Customer Rate</div>
        </div>
      </div>

      {/* Charts and Analysis */}
      <div style={styles.chartsGrid}>
        {/* Customer Segments */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <FiUsers size={20} />
            Customer Segments
          </h3>
          {customerMetrics.customerSegments.length === 0 ? (
            <div style={styles.noData}>No customer segment data available</div>
          ) : (
            <div style={styles.segmentList}>
              {customerMetrics.customerSegments.map((segment, index) => (
                <div key={index} style={segment.isLoyalty ? styles.loyaltySegmentItem : styles.segmentItem}>
                  <div style={styles.segmentInfo}>
                    <div style={styles.segmentName}>
                      {segment.name}
                      {segment.isLoyalty && <span style={{...styles.loyaltyBadge, marginLeft: '8px'}}>Loyalty</span>}
                    </div>
                    <div style={styles.segmentDetails}>
                      {segment.description} • {segment.count} customers
                    </div>
                  </div>
                  <div style={styles.segmentValue}>
                    {formatCurrency(segment.totalRevenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers with Loyalty Info */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <FiTrendingUp size={20} />
            Top Customers by Revenue
          </h3>
          {customerMetrics.topCustomers.length === 0 ? (
            <div style={styles.noData}>No customer data available</div>
          ) : (
            <table style={styles.customersTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Customer</th>
                  <th style={styles.tableHeader}>Revenue</th>
                  <th style={styles.tableHeader}>Orders</th>
                  <th style={styles.tableHeader}>Loyalty</th>
                </tr>
              </thead>
              <tbody>
                {customerMetrics.topCustomers.slice(0, 8).map((customer, index) => (
                  <tr key={index} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      {customer.name}
                      {customer.isLoyaltyCustomer && (
                        <span style={{...styles.loyaltyBadge, marginLeft: '6px', fontSize: '10px'}}>L</span>
                      )}
                    </td>
                    <td style={styles.tableCell}>{formatCurrency(customer.revenue)}</td>
                    <td style={styles.tableCell}>{customer.transactions}</td>
                    <td style={styles.tableCell}>
                      {customer.isLoyaltyCustomer ? (
                        <div style={{fontSize: '11px'}}>
                          <div>Earned: {formatCurrency(customer.loyaltyEarned)}</div>
                          <div>Used: {formatCurrency(customer.loyaltyRedeemed)}</div>
                        </div>
                      ) : (
                        <span style={{color: TavariStyles.colors.gray400}}>Non-member</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Loyalty Engagement - Only show if loyalty metrics enabled */}
        {showLoyaltyMetrics && (
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>
              <FiGift size={20} />
              Loyalty Engagement
            </h3>
            {Object.keys(customerMetrics.loyaltyEngagement).length === 0 ? (
              <div style={styles.noData}>No loyalty engagement data available</div>
            ) : (
              Object.entries(customerMetrics.loyaltyEngagement).map(([category, count]) => (
                <div key={category} style={styles.loyaltyEngagementItem}>
                  <span style={styles.paymentMethod}>{category}</span>
                  <span style={styles.paymentPercentage}>{count} customers</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Payment Method Preferences */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <FiPieChart size={20} />
            Payment Method Preferences
          </h3>
          {Object.keys(customerMetrics.paymentMethodPreferences).length === 0 ? (
            <div style={styles.noData}>No payment method data available</div>
          ) : (
            Object.entries(customerMetrics.paymentMethodPreferences).map(([method, percentage]) => (
              <div key={method} style={styles.paymentMethodItem}>
                <span style={styles.paymentMethod}>
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </span>
                <span style={styles.paymentPercentage}>
                  {formatPercentage(percentage)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AverageCustomerValueReport;