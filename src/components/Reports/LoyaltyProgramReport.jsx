// src/components/Reports/LoyaltyProgramReport.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';

const LoyaltyProgramReport = ({ 
  data, 
  dateRange, 
  customDateStart, 
  customDateEnd, 
  compareToLastYear, 
  selectedEmployee,
  employees,
  onExport,
  onEmail,
  businessId
}) => {
  
  const [loyaltySettings, setLoyaltySettings] = useState(null);
  const [loyaltyData, setLoyaltyData] = useState({
    totalCustomers: 0,
    loyaltyMembers: 0,
    participationRate: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0,
    averagePointsPerCustomer: 0,
    customerSegments: {
      new: { count: 0, revenue: 0, avgSpend: 0 },
      occasional: { count: 0, revenue: 0, avgSpend: 0 },
      frequent: { count: 0, revenue: 0, avgSpend: 0 },
      vip: { count: 0, revenue: 0, avgSpend: 0 }
    },
    loyaltyImpact: {
      loyaltyRevenue: 0,
      nonLoyaltyRevenue: 0,
      loyaltyTransactions: 0,
      nonLoyaltyTransactions: 0
    },
    topCustomers: [],
    debugInfo: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('LoyaltyProgramReport: useEffect triggered, businessId:', businessId);
    if (businessId) {
      loadLoyaltyData();
    } else {
      console.log('LoyaltyProgramReport: No businessId provided');
      setLoading(false);
    }
  }, [businessId, dateRange, customDateStart, customDateEnd]);

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
        return {
          start: monthStart.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
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

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      console.log('LoyaltyProgramReport: Starting to load loyalty data for business:', businessId);
      
      if (!businessId) {
        console.log('LoyaltyProgramReport: No business ID provided');
        setLoading(false);
        return;
      }

      // Load loyalty settings
      const { data: settings, error: settingsError } = await supabase
        .from('pos_loyalty_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (settingsError) {
        console.log('LoyaltyProgramReport: Loyalty settings error:', settingsError);
        if (settingsError.code !== 'PGRST116') {
          console.error('LoyaltyProgramReport: Error loading loyalty settings:', settingsError);
        }
      } else {
        console.log('LoyaltyProgramReport: Loyalty settings loaded:', settings);
      }

      setLoyaltySettings(settings);

      // Check for loyalty accounts
      const { data: loyaltyAccounts, error: accountsError } = await supabase
        .from('pos_loyalty_accounts')
        .select('*')
        .eq('business_id', businessId);

      console.log('LoyaltyProgramReport: Loyalty accounts query result:', { loyaltyAccounts, accountsError });

      // Check for daily usage data
      const { data: dailyUsage, error: usageError } = await supabase
        .from('pos_loyalty_daily_usage')
        .select('*')
        .eq('business_id', businessId);

      console.log('LoyaltyProgramReport: Daily usage query result:', { dailyUsage, usageError });

      // Get date range for loyalty transactions
      const { start, end } = getDateFilter();
      
      // Check for loyalty transactions with date filtering
      const { data: loyaltyTransactions, error: transError } = await supabase
        .from('pos_loyalty_transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', start)
        .lt('created_at', end);

      console.log('LoyaltyProgramReport: Loyalty transactions query result:', { 
        loyaltyTransactions, 
        transError,
        dateRange: { start, end }
      });

      // Analyze the data
      const analysis = analyzeLoyaltyData(
        loyaltyAccounts || [], 
        dailyUsage || [], 
        loyaltyTransactions || [], 
        settings,
        businessId
      );
      setLoyaltyData(analysis);

    } catch (err) {
      console.error('LoyaltyProgramReport: Error loading loyalty data:', err);
    } finally {
      setLoading(false);
      console.log('LoyaltyProgramReport: Loading complete');
    }
  };

  const analyzeLoyaltyData = (accounts, dailyUsage, transactions, settings, businessId) => {
    console.log('LoyaltyProgramReport: Analyzing loyalty data:', { 
      accountsCount: accounts.length, 
      dailyUsageCount: dailyUsage.length, 
      transactionsCount: transactions.length,
      settings,
      businessId
    });

    // Count customers with loyalty accounts
    const loyaltyMembers = accounts.length;
    
    // Calculate total customers from sales data (unique customer_ids + guest transactions)
    const uniqueCustomerIds = new Set();
    let guestTransactions = 0;
    
    if (data?.rawData?.sales) {
      data.rawData.sales.forEach(sale => {
        if (sale.customer_id) {
          uniqueCustomerIds.add(sale.customer_id);
        } else {
          guestTransactions++;
        }
      });
    }
    
    const totalCustomers = uniqueCustomerIds.size + (guestTransactions > 0 ? 1 : 0); // Count guests as 1 group
    const participationRate = totalCustomers > 0 ? (loyaltyMembers / totalCustomers) * 100 : 0;

    // Calculate points from transactions - FIX: the field is "earn" not "earned"
    const pointsEarned = transactions
      .filter(t => t.transaction_type === 'earn')
      .reduce((sum, t) => sum + (t.points || 0), 0);

    const pointsRedeemed = transactions
      .filter(t => t.transaction_type === 'redeem' || t.transaction_type === 'redeemed')
      .reduce((sum, t) => sum + Math.abs(t.points || 0), 0);

    const averagePointsPerCustomer = loyaltyMembers > 0 ? pointsEarned / loyaltyMembers : 0;

    // Segment customers based on account data
    const customerSegments = {
      new: { count: 0, revenue: 0, avgSpend: 0 },
      occasional: { count: 0, revenue: 0, avgSpend: 0 },
      frequent: { count: 0, revenue: 0, avgSpend: 0 },
      vip: { count: 0, revenue: 0, avgSpend: 0 }
    };

    accounts.forEach(account => {
      const totalSpent = account.total_spent || 0;
      const points = account.points || 0;
      
      let segment = 'new';
      
      // Determine segment based on spending and points balance
      if (totalSpent >= 500 && points >= 1000) {
        segment = 'vip';
      } else if (totalSpent >= 200 || points >= 500) {
        segment = 'frequent';
      } else if (totalSpent > 50) {
        segment = 'occasional';
      }

      customerSegments[segment].count += 1;
      customerSegments[segment].revenue += totalSpent;
    });

    // Calculate segment averages
    Object.keys(customerSegments).forEach(segment => {
      const seg = customerSegments[segment];
      seg.avgSpend = seg.count > 0 ? seg.revenue / seg.count : 0;
    });

    // Calculate loyalty impact from sales data
    const loyaltyImpact = {
      loyaltyRevenue: 0,
      nonLoyaltyRevenue: 0,
      loyaltyTransactions: 0,
      nonLoyaltyTransactions: 0
    };

    if (data?.rawData?.sales) {
      data.rawData.sales.forEach(sale => {
        const hasLoyaltyDiscount = (sale.loyalty_discount || 0) > 0;
        const hasCustomerId = !!sale.customer_id;
        const revenue = Number(sale.total) || 0;

        if (hasLoyaltyDiscount || hasCustomerId) {
          loyaltyImpact.loyaltyRevenue += revenue;
          loyaltyImpact.loyaltyTransactions += 1;
        } else {
          loyaltyImpact.nonLoyaltyRevenue += revenue;
          loyaltyImpact.nonLoyaltyTransactions += 1;
        }
      });
    }

    // Get top customers by points balance
    const topCustomers = accounts
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10)
      .map(account => ({
        id: account.id,
        points: account.points || 0,
        totalSpent: account.total_spent || 0,
        name: account.customer_name || account.customer_email || `Customer ${account.id}`
      }));

    return {
      totalCustomers,
      loyaltyMembers,
      participationRate,
      totalPointsEarned: pointsEarned,
      totalPointsRedeemed: pointsRedeemed,
      averagePointsPerCustomer,
      customerSegments,
      loyaltyImpact,
      topCustomers,
      debugInfo: {
        accountsFound: accounts.length,
        transactionsFound: transactions.length,
        dailyUsageFound: dailyUsage.length,
        uniqueCustomerIds: uniqueCustomerIds.size,
        guestTransactions,
        settingsFound: !!settings,
        businessIdUsed: businessId,
        dateRangeUsed: getDateFilter()
      }
    };
  };

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercentage = (percent) => `${(percent || 0).toFixed(1)}%`;

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Loyalty Program Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      if (loyaltySettings) {
        csvContent += "LOYALTY PROGRAM SETTINGS\n";
        csvContent += `Program Mode,${loyaltySettings.loyalty_mode}\n`;
        csvContent += `Earn Rate,${loyaltySettings.earn_rate_percentage}%\n`;
        csvContent += `Program Active,${loyaltySettings.is_active ? 'Yes' : 'No'}\n\n`;
      }
      
      csvContent += "PROGRAM OVERVIEW\n";
      csvContent += `Total Customers,${loyaltyData.totalCustomers}\n`;
      csvContent += `Loyalty Members,${loyaltyData.loyaltyMembers}\n`;
      csvContent += `Participation Rate,${loyaltyData.participationRate.toFixed(1)}%\n`;
      csvContent += `Total Points Earned,${loyaltyData.totalPointsEarned}\n`;
      csvContent += `Total Points Redeemed,${loyaltyData.totalPointsRedeemed}\n`;
      csvContent += `Average Points per Customer,${loyaltyData.averagePointsPerCustomer.toFixed(0)}\n\n`;
      
      csvContent += "DEBUG INFO\n";
      csvContent += `Business ID Used,${loyaltyData.debugInfo.businessIdUsed}\n`;
      csvContent += `Accounts Found,${loyaltyData.debugInfo.accountsFound}\n`;
      csvContent += `Transactions Found,${loyaltyData.debugInfo.transactionsFound}\n`;
      csvContent += `Settings Found,${loyaltyData.debugInfo.settingsFound}\n`;
      
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
    subject: `Loyalty Program Report - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Loyalty Program Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
Generated: ${new Date().toLocaleString()}

PROGRAM PERFORMANCE:
• Total Customers: ${loyaltyData.totalCustomers}
• Loyalty Members: ${loyaltyData.loyaltyMembers} (${formatPercentage(loyaltyData.participationRate)})
• Points Earned: ${loyaltyData.totalPointsEarned.toLocaleString()}
• Points Redeemed: ${loyaltyData.totalPointsRedeemed.toLocaleString()}

DEBUG INFO:
• Business ID: ${loyaltyData.debugInfo.businessIdUsed}
• Loyalty Accounts Found: ${loyaltyData.debugInfo.accountsFound}
• Loyalty Transactions Found: ${loyaltyData.debugInfo.transactionsFound}
• Settings Configured: ${loyaltyData.debugInfo.settingsFound}

This report analyzes your actual loyalty program data.
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
      onExport(content, format, 'loyalty-program');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'loyalty-program');
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
      borderBottom: `2px solid ${TavariStyles.colors.purple500}`
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

    loyaltySettingsSection: {
      marginBottom: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.purple50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.purple200}`
    },
    
    loyaltySettingsTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.purple900,
      marginBottom: TavariStyles.spacing.lg
    },
    
    loyaltySettingsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg
    },

    lastRow: {
      marginBottom: 0
    },
    
    loyaltySettingsCard: {
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.purple200}`,
      textAlign: 'center',
      boxShadow: TavariStyles.shadows.sm
    },

    loyaltySettingsCardValue: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.purple700,
      marginBottom: TavariStyles.spacing.sm,
      lineHeight: 1.2
    },

    loyaltySettingsCardLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },

    dataSection: {
      marginBottom: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },

    dataTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.md
    },

    debugGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.sm
    },

    debugItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },

    debugLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },

    debugValue: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },

    loadingMessage: {
      textAlign: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray600,
      fontSize: TavariStyles.typography.fontSize.base
    },

    noDataMessage: {
      textAlign: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic'
    }
  };

  console.log('LoyaltyProgramReport: Rendering, loading =', loading);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingMessage}>
          Loading loyalty program data...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Loyalty Program Report</h3>
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

      {/* Loyalty Program Settings */}
      <div style={styles.loyaltySettingsSection}>
        <h4 style={styles.loyaltySettingsTitle}>Current Loyalty Program Configuration</h4>
        
        {loyaltySettings ? (
          <>
            <div style={styles.loyaltySettingsRow}>
              <div style={styles.loyaltySettingsCard}>
                <div style={styles.loyaltySettingsCardValue}>
                  {loyaltySettings.loyalty_mode === 'points' ? 'Points System' : 'Dollar Credits'}
                </div>
                <div style={styles.loyaltySettingsCardLabel}>Program Type</div>
              </div>
              <div style={styles.loyaltySettingsCard}>
                <div style={styles.loyaltySettingsCardValue}>{loyaltySettings.earn_rate_percentage}%</div>
                <div style={styles.loyaltySettingsCardLabel}>Earn Rate</div>
              </div>
              <div style={styles.loyaltySettingsCard}>
                <div style={styles.loyaltySettingsCardValue}>
                  {loyaltySettings.is_active ? 'Active' : 'Inactive'}
                </div>
                <div style={styles.loyaltySettingsCardLabel}>Program Status</div>
              </div>
            </div>

            {loyaltySettings.loyalty_mode === 'points' && (
              <div style={{...styles.loyaltySettingsRow, ...styles.lastRow}}>
                <div style={styles.loyaltySettingsCard}>
                  <div style={styles.loyaltySettingsCardValue}>
                    {loyaltySettings.redemption_rate?.toLocaleString() || '10,000'} pts
                  </div>
                  <div style={styles.loyaltySettingsCardLabel}>Points = $10</div>
                </div>
                <div style={styles.loyaltySettingsCard}>
                  <div style={styles.loyaltySettingsCardValue}>
                    {loyaltySettings.min_redemption?.toLocaleString() || '1,000'} pts
                  </div>
                  <div style={styles.loyaltySettingsCardLabel}>Min Redemption</div>
                </div>
                <div style={styles.loyaltySettingsCard}>
                  <div style={styles.loyaltySettingsCardValue}>
                    {loyaltySettings.welcome_bonus?.toLocaleString() || '500'} pts
                  </div>
                  <div style={styles.loyaltySettingsCardLabel}>Welcome Bonus</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={styles.noDataMessage}>
            No loyalty program configured. Set up your loyalty program in Settings.
          </div>
        )}
      </div>

      {/* Data Analysis Section */}
      <div style={styles.dataSection}>
        <h4 style={styles.dataTitle}>Current Data Analysis</h4>
        <div style={styles.debugGrid}>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Business ID Used:</span>
            <span style={styles.debugValue}>{loyaltyData.debugInfo.businessIdUsed || 'Not Found'}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Total Customers:</span>
            <span style={styles.debugValue}>{loyaltyData.totalCustomers}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Loyalty Members:</span>
            <span style={styles.debugValue}>{loyaltyData.loyaltyMembers}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Participation Rate:</span>
            <span style={styles.debugValue}>{formatPercentage(loyaltyData.participationRate)}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Points Earned:</span>
            <span style={styles.debugValue}>{loyaltyData.totalPointsEarned.toLocaleString()}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Points Redeemed:</span>
            <span style={styles.debugValue}>{loyaltyData.totalPointsRedeemed.toLocaleString()}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Accounts Found:</span>
            <span style={styles.debugValue}>{loyaltyData.debugInfo.accountsFound}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Transactions Found:</span>
            <span style={styles.debugValue}>{loyaltyData.debugInfo.transactionsFound}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Daily Usage Records:</span>
            <span style={styles.debugValue}>{loyaltyData.debugInfo.dailyUsageFound}</span>
          </div>
          <div style={styles.debugItem}>
            <span style={styles.debugLabel}>Settings Found:</span>
            <span style={styles.debugValue}>{loyaltyData.debugInfo.settingsFound ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {loyaltyData.topCustomers.length > 0 && (
        <div style={styles.dataSection}>
          <h4 style={styles.dataTitle}>Top Loyalty Customers</h4>
          {loyaltyData.topCustomers.slice(0, 5).map((customer, index) => (
            <div key={index} style={styles.debugItem}>
              <span style={styles.debugLabel}>{customer.name}:</span>
              <span style={styles.debugValue}>{customer.points.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoyaltyProgramReport;