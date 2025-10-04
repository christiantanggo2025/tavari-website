// components/POS/POSCartPanel.jsx - WITH TRANSACTION CLICK FUNCTIONALITY AND MODIFIER DISPLAY
import React, { useState, useEffect } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import { ShoppingCart, Plus, Minus, Trash2, User, Settings, Edit3, Star, CreditCard, Gift, Search, History, X } from 'lucide-react';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { supabase } from '../../supabaseClient';

const POSCartPanel = ({
  cartItems = [],
  onRemoveItem,
  onUpdateQty,
  onCheckout,
  sessionLocked = false,
  attachedCustomer = null,
  tabMode = false,
  activeTab = null,
  loyaltyCustomer = null,
  businessSettings = {},
  currentEmployee = null,
  businessId,
  taxCategories = [],
  categoryTaxAssignments = [],
  categories = [],
  
  // Cart deletion props
  savedCartId = null,
  isFromSavedCarts = false,
  onDeleteCart = null,
  onClearCart = null,
  
  // Customer management props
  onCustomerAttach = null,
  onCustomerDetach = null
}) => {
  // LOYALTY STATE
  const [loyaltySettings, setLoyaltySettings] = useState(null);
  const [availableLoyaltyCredit, setAvailableLoyaltyCredit] = useState(0);
  const [loyaltyPointsToEarn, setLoyaltyPointsToEarn] = useState(0);
  const [autoLoyaltyApplied, setAutoLoyaltyApplied] = useState(0);
  const [dailyUsageRemaining, setDailyUsageRemaining] = useState(0);
  const [usedToday, setUsedToday] = useState(0);
  const [showLoyaltyHistory, setShowLoyaltyHistory] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Transaction detail modal state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionLoading, setTransactionLoading] = useState(false);

  // Customer entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Tax calculation hook
  const {
    calculateTotalTax,
    applyCashRounding,
    formatTaxAmount
  } = useTaxCalculations(businessId);

  // Load loyalty settings
  useEffect(() => {
    const loadLoyaltySettings = async () => {
      if (!businessId) return;

      try {
        const { data: settings, error } = await supabase
          .from('pos_loyalty_settings')
          .select('*')
          .eq('business_id', businessId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading loyalty settings:', error);
          return;
        }

        if (settings) {
          setLoyaltySettings(settings);
        }
      } catch (err) {
        console.error('Failed to load loyalty settings:', err);
      }
    };

    loadLoyaltySettings();
  }, [businessId]);

  // Calculate loyalty metrics when cart or customer changes
  useEffect(() => {
    if (loyaltyCustomer && loyaltySettings?.is_active && cartItems.length > 0) {
      calculateLoyaltyMetrics();
    } else {
      setAvailableLoyaltyCredit(0);
      setLoyaltyPointsToEarn(0);
      setAutoLoyaltyApplied(0);
      setDailyUsageRemaining(0);
      setUsedToday(0);
    }
  }, [cartItems, loyaltyCustomer, loyaltySettings]);

  // Search customers when search term changes
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      searchCustomers(searchTerm.trim());
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  // Helper function to get today's date in business timezone
  const getTodayInBusinessTimezone = () => {
    const businessTimezone = businessSettings?.timezone || 'America/Toronto';
    const today = new Date();
    
    const todayInBizTz = new Intl.DateTimeFormat('sv-SE', {
      timeZone: businessTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(today);
    
    return todayInBizTz;
  };

  // LOYALTY CALCULATIONS
  const calculateLoyaltyMetrics = async () => {
    if (!loyaltyCustomer || !loyaltySettings?.is_active || cartItems.length === 0) {
      return;
    }

    try {
      const today = getTodayInBusinessTimezone();
      
      // Get today's usage - FIXED: This should be in DOLLARS, not points
      const { data: todayUsage } = await supabase
        .from('pos_loyalty_daily_usage')
        .select('amount_used')
        .eq('loyalty_account_id', loyaltyCustomer.id)
        .eq('usage_date', today)
        .single();

      // FIXED: Convert points to dollars if loyalty mode is points
      let usedTodayDollars = todayUsage?.amount_used || 0;
      
      // If the stored value looks like points (large number) and we're in points mode, convert it
      if (loyaltySettings.loyalty_mode === 'points' && usedTodayDollars > 100) {
        // Convert points to dollars: points ÷ redemption_rate × 10
        usedTodayDollars = (usedTodayDollars / loyaltySettings.redemption_rate) * 10;
      }
      
      setUsedToday(usedTodayDollars);
      
      // Calculate daily limit in dollars
      const dailyLimitPoints = loyaltySettings.max_redemption_per_day || 5000;
      const dailyLimitDollars = (dailyLimitPoints / loyaltySettings.redemption_rate) * 10;
      const remainingDailyLimitDollars = Math.max(0, dailyLimitDollars - usedTodayDollars);
      
      setDailyUsageRemaining(remainingDailyLimitDollars);
      
      // Calculate cart subtotal
      const subtotal = cartItems.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return sum + (price * quantity);
      }, 0);

      // Customer balance in dollars
      const customerBalanceDollars = loyaltyCustomer.balance || 0;
      
      // Available credit calculation
      const maxUsableDollars = Math.min(customerBalanceDollars, remainingDailyLimitDollars, subtotal);
      setAvailableLoyaltyCredit(Math.max(0, maxUsableDollars));

      // Auto-apply logic preview
      let autoApplyAmount = 0;
      if (loyaltySettings.auto_apply === 'always' && maxUsableDollars > 0) {
        const minRedemptionPoints = loyaltySettings.min_redemption || 5000;
        const minRedemptionDollars = (minRedemptionPoints / loyaltySettings.redemption_rate) * 10;
        
        if (maxUsableDollars >= minRedemptionDollars) {
          if (loyaltySettings.allow_partial_redemption) {
            autoApplyAmount = Math.min(maxUsableDollars, subtotal);
          } else {
            autoApplyAmount = Math.min(minRedemptionDollars, maxUsableDollars, subtotal);
          }
        }
      }
      
      setAutoLoyaltyApplied(autoApplyAmount);

      // Calculate points to earn
      const earnRatePercent = loyaltySettings.earn_rate_percentage / 100;
      const taxableAmountForEarning = subtotal - autoApplyAmount;
      const dollarsToEarn = taxableAmountForEarning * earnRatePercent;
      const pointsToEarn = Math.round(dollarsToEarn * loyaltySettings.redemption_rate / 10);
      
      setLoyaltyPointsToEarn(pointsToEarn);

    } catch (err) {
      console.error('Error calculating loyalty metrics:', err);
    }
  };

  // Load loyalty history
  const loadLoyaltyHistory = async () => {
    if (!loyaltyCustomer || !businessId) {
      console.warn('Cannot load loyalty history - missing data:', {
        loyaltyCustomer: !!loyaltyCustomer,
        businessId: !!businessId
      });
      return;
    }

    console.log('Loading loyalty history for customer:', loyaltyCustomer.id);
    
    // ALWAYS show the modal, even if loading or no data
    setShowLoyaltyHistory(true);
    setHistoryLoading(true);

    try {
      const today = getTodayInBusinessTimezone();
      console.log('Today in business timezone:', today);
      
      const startTime = today + 'T00:00:00.000Z';
      const endTime = today + 'T23:59:59.999Z';
      console.log('Query date range:', startTime, 'to', endTime);
      
      // Execute the query
      const { data, error } = await supabase
        .from('pos_loyalty_transactions')
        .select('*')
        .eq('loyalty_account_id', loyaltyCustomer.id)
        .eq('business_id', businessId)
        .eq('transaction_type', 'redeem')
        .gte('created_at', startTime)
        .lt('created_at', endTime)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading loyalty history:', error);
        setLoyaltyHistory([]);
      } else {
        console.log('Loyalty history loaded:', data);
        setLoyaltyHistory(data || []);
      }

    } catch (err) {
      console.error('Error loading loyalty history:', err);
      setLoyaltyHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // NEW: Handle transaction click to show sale details
  const handleTransactionClick = async (transaction) => {
    if (!transaction.transaction_id) {
      alert('This appears to be a test transaction with no associated sale details.');
      return;
    }

    setTransactionLoading(true);
    setShowTransactionModal(true);

    try {
      console.log('Loading transaction details for:', transaction.transaction_id);
      
      // Try to find the sale record
      const { data: saleData, error: saleError } = await supabase
        .from('pos_sales')
        .select(`
          *,
          pos_sale_items(
            *,
            pos_inventory(name, price)
          ),
          pos_payments(*),
          pos_loyalty_accounts(customer_name, customer_email, customer_phone)
        `)
        .eq('id', transaction.transaction_id)
        .single();

      if (saleError) {
        console.error('Sale lookup error:', saleError);
        
        // If sale not found, show transaction details only
        setSelectedTransaction({
          ...transaction,
          sale_items: [],
          payments: [],
          is_test_transaction: true,
          error_message: 'Sale details not found - this may be a test transaction'
        });
      } else {
        console.log('Sale data loaded:', saleData);
        setSelectedTransaction({
          ...transaction,
          sale_data: saleData,
          sale_items: saleData.pos_sale_items || [],
          payments: saleData.pos_payments || [],
          customer: saleData.pos_loyalty_accounts,
          is_test_transaction: false
        });
      }

    } catch (err) {
      console.error('Error loading transaction details:', err);
      setSelectedTransaction({
        ...transaction,
        sale_items: [],
        payments: [],
        is_test_transaction: true,
        error_message: 'Error loading sale details: ' + err.message
      });
    } finally {
      setTransactionLoading(false);
    }
  };

  // Search customers function
  const searchCustomers = async (term) => {
    if (!businessId || !term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_loyalty_accounts')
        .select('id, customer_name, customer_phone, customer_email, balance')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .or(`customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`)
        .limit(5);

      if (error) {
        console.error('Error searching customers:', error);
        setSearchResults([]);
      } else {
        setSearchResults(data || []);
      }
    } catch (err) {
      console.error('Error searching customers:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Manual customer entry handler
  const handleManualCustomerEntry = async () => {
    if (!manualCustomerId.trim()) {
      console.warn('Please enter a customer ID');
      return;
    }

    if (onCustomerAttach) {
      await onCustomerAttach(manualCustomerId.trim());
    }
    
    setManualCustomerId('');
    setShowManualEntry(false);
  };

  // Search customer selection handler
  const handleSearchCustomerSelect = async (customer) => {
    if (onCustomerAttach) {
      await onCustomerAttach(customer.id);
    }
    
    setSearchTerm('');
    setSearchResults([]);
    setShowSearch(false);
  };

  // Detach customer handler
  const handleDetachCustomer = () => {
    if (onCustomerDetach) {
      onCustomerDetach();
    }
  };

  // Cancel search handler
  const handleCancelSearch = () => {
    setShowSearch(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Cancel manual entry handler
  const handleCancelManualEntry = () => {
    setShowManualEntry(false);
    setManualCustomerId('');
  };

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    
    // Add modifier costs to the item price
    const modifierCost = (item.modifiers || []).reduce((modSum, modifier) => {
      return modSum + (parseFloat(modifier.price) || 0);
    }, 0);
    
    return sum + ((price + modifierCost) * quantity);
  }, 0);

  // Calculate tax using the standardized utility
  const taxCalculation = cartItems.length > 0 ? 
    calculateTotalTax(cartItems, 0, autoLoyaltyApplied, subtotal) :
    { totalTax: 0, aggregatedTaxes: {}, aggregatedRebates: {} };

  const taxAmount = taxCalculation.totalTax;
  const finalSubtotal = subtotal - autoLoyaltyApplied;
  const total = finalSubtotal + taxAmount;

  // Helper function to display balance in correct format
  const getBalanceDisplay = (dollarAmount) => {
    if (!loyaltySettings) return '$0.00';
    
    if (loyaltySettings.loyalty_mode === 'points') {
      const points = Math.round(dollarAmount * loyaltySettings.redemption_rate / 10);
      return `${points.toLocaleString()} pts`;
    }
    return `$${dollarAmount.toFixed(2)}`;
  };

  // Get display name for cart item (includes variants)
  const getItemDisplayName = (item) => {
    if (item.is_variant && item.display_name) {
      return item.display_name;
    }
    
    if (item.selected_variants && item.selected_variants.length > 0) {
      const variantNames = item.selected_variants.map(v => v.variant_name);
      return `${item.name} - ${variantNames.join(', ')}`;
    }
    
    return item.name;
  };

  const styles = {
    // MAIN CONTAINER - FIXED HEIGHT WITH PROPER SECTIONS
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 180px)', // Fixed height based on viewport
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      boxShadow: TavariStyles.shadows.md,
      overflow: 'hidden'
    },
    
    // REDUCED HEADER HEIGHT
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${TavariStyles.spacing.md} ${TavariStyles.spacing.lg}`, // Reduced padding
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      borderTopLeftRadius: TavariStyles.borderRadius.lg,
      borderTopRightRadius: TavariStyles.borderRadius.lg,
      flexShrink: 0,
      height: '60px' // Reduced from 70px to 60px
    },
    
    headerTitle: {
      display: 'flex',
      alignItems: 'center',
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    
    cartCount: {
      marginLeft: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.white,
      color: TavariStyles.colors.primary,
      borderRadius: TavariStyles.borderRadius.full,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    
    clearButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.sm,
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: TavariStyles.colors.white,
      border: `1px solid rgba(255,255,255,0.3)`
    },
    
    // CUSTOMER SECTION - DYNAMIC HEIGHT WITH LOYALTY CARDS
    customerSection: {
      padding: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: loyaltyCustomer ? TavariStyles.colors.successBg : TavariStyles.colors.gray50,
      flexShrink: 0,
      minHeight: loyaltyCustomer ? '220px' : '100px', // More space for cards
      maxHeight: showSearch || showManualEntry ? '320px' : (loyaltyCustomer ? '220px' : '100px'),
      overflow: 'hidden',
      transition: 'max-height 0.3s ease'
    },
    
    customerHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      marginBottom: TavariStyles.spacing.sm
    },
    
    customerIcon: {
      color: loyaltyCustomer ? TavariStyles.colors.success : TavariStyles.colors.gray500,
      marginRight: TavariStyles.spacing.sm,
      marginTop: '2px'
    },
    
    customerDetails: {
      flex: 1
    },
    
    // EXTRA LARGE CUSTOMER NAME
    customerName: {
      fontSize: loyaltyCustomer ? TavariStyles.typography.fontSize['2xl'] : TavariStyles.typography.fontSize.sm, // Even larger
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      margin: 0,
      lineHeight: '1.1'
    },
    
    customerBalance: {
      fontSize: loyaltyCustomer ? TavariStyles.typography.fontSize.lg : TavariStyles.typography.fontSize.xs, // Larger
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.success,
      margin: 0,
      lineHeight: '1.3',
      marginTop: '4px'
    },
    
    customerSubtext: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      margin: 0,
      lineHeight: '1.3',
      marginTop: '2px'
    },
    
    statusBadge: {
      fontSize: '10px',
      color: loyaltyCustomer ? TavariStyles.colors.success : TavariStyles.colors.gray500,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      backgroundColor: loyaltyCustomer ? TavariStyles.colors.successBg : TavariStyles.colors.gray100,
      padding: '2px 6px',
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${loyaltyCustomer ? TavariStyles.colors.success : TavariStyles.colors.gray300}`,
      alignSelf: 'flex-start'
    },
    
    // POLISHED LOYALTY CARDS
    loyaltyCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: TavariStyles.spacing.sm,
      marginTop: TavariStyles.spacing.sm,
      marginBottom: TavariStyles.spacing.sm
    },
    
    loyaltyCard: {
      backgroundColor: TavariStyles.colors.white,
      border: `1px solid ${TavariStyles.colors.success}30`,
      borderRadius: TavariStyles.borderRadius.md,
      padding: TavariStyles.spacing.md,
      textAlign: 'center',
      boxShadow: TavariStyles.shadows.sm
    },
    
    cardLabel: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500,
      textTransform: 'uppercase',
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      marginBottom: TavariStyles.spacing.xs,
      letterSpacing: '0.05em'
    },
    
    cardValue: {
      fontSize: TavariStyles.typography.fontSize.sm, // Larger and more readable
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.success,
      lineHeight: '1'
    },
    
    // LOYALTY HISTORY BUTTON - FIXED: Always show, don't check usedToday
    loyaltyHistoryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      fontSize: TavariStyles.typography.fontSize.xs,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs,
      marginBottom: TavariStyles.spacing.sm
    },
    
    // LOYALTY HISTORY MODAL STYLES - FIXED Z-INDEX
    loyaltyModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999 // Higher z-index to ensure it appears above everything
    },
    
    loyaltyModalContent: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: TavariStyles.shadows.xl,
      position: 'relative'
    },
    
    loyaltyModalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      flexShrink: 0
    },
    
    loyaltyModalTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    
    loyaltyModalBody: {
      flex: 1,
      padding: TavariStyles.spacing.lg,
      overflowY: 'auto'
    },
    
    // TRANSACTION DETAIL MODAL STYLES
    transactionModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    },
    
    transactionModalContent: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: TavariStyles.shadows.xl
    },
    
    transactionModalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      borderTopLeftRadius: TavariStyles.borderRadius.lg,
      borderTopRightRadius: TavariStyles.borderRadius.lg
    },
    
    transactionModalBody: {
      flex: 1,
      padding: TavariStyles.spacing.lg,
      overflowY: 'auto'
    },
    
    loadingMessage: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    emptyMessage: {
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      padding: TavariStyles.spacing.xl,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    usageSummary: {
      marginBottom: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.successBg,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.success}30`
    },
    
    usageSummaryText: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      margin: 0
    },
    
    loyaltyTransaction: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    transactionLeft: {
      flex: 1
    },
    
    transactionNumber: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.primary,
      cursor: 'pointer',
      textDecoration: 'underline'
    },
    
    transactionTime: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500,
      marginTop: '2px'
    },
    
    transactionAmount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.danger
    },
    
    // Transaction detail styles
    transactionDetail: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    detailSection: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    detailSectionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`,
      paddingBottom: TavariStyles.spacing.sm
    },
    
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${TavariStyles.spacing.sm} 0`,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`
    },
    
    detailLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    detailValue: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray800,
      fontWeight: TavariStyles.typography.fontWeight.semibold
    },
    
    saleItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      marginBottom: TavariStyles.spacing.sm
    },
    
    saleItemName: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray800
    },
    
    saleItemDetails: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      marginTop: '2px'
    },
    
    saleItemPrice: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      textAlign: 'right'
    },
    
    errorMessage: {
      backgroundColor: TavariStyles.colors.warningBg,
      color: TavariStyles.colors.warningText,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.sm,
      marginBottom: TavariStyles.spacing.md,
      border: `1px solid ${TavariStyles.colors.warning}`
    },
    
    closeButton: {
      background: 'transparent',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: TavariStyles.colors.gray600,
      padding: TavariStyles.spacing.xs,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: TavariStyles.borderRadius.sm,
      transition: TavariStyles.transitions.fast
    },
    
    closeButtonWhite: {
      color: TavariStyles.colors.white
    },
    
    // FULL WIDTH BUTTON ROW
    buttonRow: {
      display: 'flex',
      gap: TavariStyles.spacing.sm,
      marginTop: TavariStyles.spacing.sm
    },
    
    fullWidthButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      flex: 1,
      fontSize: TavariStyles.typography.fontSize.xs,
      padding: `${TavariStyles.spacing.sm} ${TavariStyles.spacing.xs}`,
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: TavariStyles.spacing.xs
    },
    
    searchButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      flex: 1,
      fontSize: TavariStyles.typography.fontSize.xs,
      padding: `${TavariStyles.spacing.sm} ${TavariStyles.spacing.xs}`,
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: TavariStyles.spacing.xs
    },
    
    detachButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.danger,
      width: '100%',
      fontSize: TavariStyles.typography.fontSize.xs,
      padding: `${TavariStyles.spacing.sm} ${TavariStyles.spacing.xs}`,
      height: '32px'
    },
    
    // EXPANDABLE SECTIONS
    expandableSection: {
      marginTop: TavariStyles.spacing.sm,
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray300}`
    },
    
    // FIXED: Search input to match button width exactly
    searchInput: {
      ...TavariStyles.components.form.input,
      display: 'block',
      width: '100%',
      fontSize: TavariStyles.typography.fontSize.sm,
      marginBottom: TavariStyles.spacing.sm,
      boxSizing: 'border-box',
      padding: TavariStyles.spacing.sm,
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.sm
    },
    
    manualInput: {
      ...TavariStyles.components.form.input,
      display: 'block',
      width: '100%',
      fontSize: TavariStyles.typography.fontSize.sm,
      marginBottom: TavariStyles.spacing.sm,
      boxSizing: 'border-box',
      padding: TavariStyles.spacing.sm,
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.sm
    },
    
    searchResults: {
      maxHeight: '120px',
      overflowY: 'auto',
      marginBottom: TavariStyles.spacing.sm
    },
    
    searchResultItem: {
      padding: TavariStyles.spacing.sm,
      cursor: 'pointer',
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      transition: TavariStyles.transitions.fast
    },
    
    resultName: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },
    
    resultDetails: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600
    },
    
    // FIXED: Action buttons to ensure consistent sizing
    actionButtons: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },
    
    // Individual button styles for consistent sizing
    actionButton: {
      ...TavariStyles.components.button.base,
      fontSize: TavariStyles.typography.fontSize.xs,
      padding: TavariStyles.spacing.sm,
      height: '36px',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.sm,
      boxSizing: 'border-box'
    },
    
    primaryActionButton: {
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      borderColor: TavariStyles.colors.primary
    },
    
    secondaryActionButton: {
      backgroundColor: TavariStyles.colors.white,
      color: TavariStyles.colors.gray700,
      borderColor: TavariStyles.colors.gray300
    },
    
    // SCROLLABLE ITEMS LIST - TAKES REMAINING SPACE
    itemsList: {
      flex: 1,
      overflowY: 'auto',
      padding: TavariStyles.spacing.sm,
      minHeight: 0
    },
    
    emptyCart: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: TavariStyles.colors.gray400,
      textAlign: 'center'
    },
    
    emptyCartIcon: {
      fontSize: '32px',
      marginBottom: TavariStyles.spacing.sm
    },
    
    cartItem: {
      display: 'flex',
      flexDirection: 'column', // Changed to column to stack modifiers below
      padding: TavariStyles.spacing.sm,
      marginBottom: TavariStyles.spacing.xs,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      minHeight: '50px'
    },
    
    // NEW: Top row with item info and controls
    cartItemTopRow: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.xs
    },
    
    itemInfo: {
      flex: 1,
      marginRight: TavariStyles.spacing.sm
    },
    
    itemName: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900,
      marginBottom: '2px'
    },
    
    itemPrice: {
      fontSize: '10px',
      color: TavariStyles.colors.gray600
    },
    
    itemTotal: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.success
    },
    
    quantityControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    
    quantityButton: {
      ...TavariStyles.components.button.base,
      backgroundColor: TavariStyles.colors.gray200,
      color: TavariStyles.colors.gray700,
      minWidth: '24px',
      height: '24px',
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px'
    },
    
    quantity: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      minWidth: '16px',
      textAlign: 'center'
    },
    
    removeButton: {
      ...TavariStyles.components.button.base,
      backgroundColor: TavariStyles.colors.danger,
      color: TavariStyles.colors.white,
      padding: '2px',
      marginLeft: '4px',
      minWidth: '24px',
      height: '24px',
      fontSize: '12px'
    },
    
    // NEW: Modifier display styles
    modifiersList: {
      paddingLeft: TavariStyles.spacing.md,
      marginTop: TavariStyles.spacing.xs,
      borderLeft: `2px solid ${TavariStyles.colors.gray300}`
    },
    
    modifier: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      marginBottom: '2px',
      paddingLeft: TavariStyles.spacing.xs
    },
    
    modifierName: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600
    },
    
    modifierPrice: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray700,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    // CHECKOUT SECTION - FIXED HEIGHT AT BOTTOM
    checkoutSection: {
      padding: TavariStyles.spacing.md,
      borderTop: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: TavariStyles.colors.gray50,
      borderBottomLeftRadius: TavariStyles.borderRadius.lg,
      borderBottomRightRadius: TavariStyles.borderRadius.lg,
      flexShrink: 0,
      height: '160px'
    },
    
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '4px'
    },
    
    summaryLabel: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray700
    },
    
    summaryValue: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },
    
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: TavariStyles.spacing.xs,
      borderTop: `1px solid ${TavariStyles.colors.gray300}`,
      marginTop: TavariStyles.spacing.xs,
      marginBottom: TavariStyles.spacing.sm
    },
    
    totalLabel: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    
    totalValue: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.success
    },
    
    checkoutButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg,
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: TavariStyles.spacing.sm
    }
  };

  // LOYALTY HISTORY MODAL COMPONENT
  const renderLoyaltyHistoryModal = () => {
    if (!showLoyaltyHistory) return null;

    return (
      <div style={styles.loyaltyModal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.loyaltyModalContent}>
          <div style={styles.loyaltyModalHeader}>
            <h3 style={styles.loyaltyModalTitle}>Today's Loyalty Usage</h3>
            <button 
              style={styles.closeButton}
              onClick={() => setShowLoyaltyHistory(false)}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = TavariStyles.colors.gray100;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={styles.loyaltyModalBody}>
            {historyLoading ? (
              <div style={styles.loadingMessage}>
                Loading transaction history...
              </div>
            ) : loyaltyHistory.length === 0 ? (
              <div>
                <div style={styles.usageSummary}>
                  <p style={styles.usageSummaryText}>
                    <strong>Total used today:</strong> ${usedToday.toFixed(2)}
                  </p>
                </div>
                <div style={styles.emptyMessage}>
                  No loyalty transactions found for today.
                  {usedToday === 0 && (
                    <div style={{ marginTop: TavariStyles.spacing.sm, fontSize: TavariStyles.typography.fontSize.xs }}>
                      This customer hasn't used any loyalty rewards yet today.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={styles.usageSummary}>
                  <p style={styles.usageSummaryText}>
                    <strong>Total used today:</strong> ${usedToday.toFixed(2)} ({loyaltyHistory.length} transactions)
                  </p>
                </div>
                
                {loyaltyHistory.map((transaction, index) => (
                  <div key={index} style={styles.loyaltyTransaction}>
                    <div style={styles.transactionLeft}>
                      <div 
                        style={styles.transactionNumber}
                        onClick={() => handleTransactionClick(transaction)}
                      >
                        Transaction #{transaction.transaction_id?.slice(-8) || 'Unknown'}
                      </div>
                      <div style={styles.transactionTime}>
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={styles.transactionAmount}>
                      {loyaltySettings?.loyalty_mode === 'points' && Math.abs(transaction.amount) > 100
                        ? `-$${((Math.abs(transaction.amount) / loyaltySettings.redemption_rate) * 10).toFixed(2)}`
                        : `-$${Math.abs(transaction.amount).toFixed(2)}`
                      }
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // NEW: TRANSACTION DETAIL MODAL COMPONENT
  const renderTransactionModal = () => {
    if (!showTransactionModal) return null;

    return (
      <div style={styles.transactionModal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.transactionModalContent}>
          <div style={styles.transactionModalHeader}>
            <h3 style={styles.loyaltyModalTitle}>
              Transaction Details #{selectedTransaction?.transaction_id?.slice(-8) || 'Unknown'}
            </h3>
            <button 
              style={{...styles.closeButton, ...styles.closeButtonWhite}}
              onClick={() => {
                setShowTransactionModal(false);
                setSelectedTransaction(null);
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={styles.transactionModalBody}>
            {transactionLoading ? (
              <div style={styles.loadingMessage}>
                Loading transaction details...
              </div>
            ) : selectedTransaction ? (
              <div style={styles.transactionDetail}>
                {selectedTransaction.error_message && (
                  <div style={styles.errorMessage}>
                    {selectedTransaction.error_message}
                  </div>
                )}
                
                {/* Transaction Info Section */}
                <div style={styles.detailSection}>
                  <h4 style={styles.detailSectionTitle}>Transaction Information</h4>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Date:</span>
                    <span style={styles.detailValue}>
                      {new Date(selectedTransaction.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Time:</span>
                    <span style={styles.detailValue}>
                      {new Date(selectedTransaction.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Type:</span>
                    <span style={styles.detailValue}>
                      {selectedTransaction.transaction_type.charAt(0).toUpperCase() + selectedTransaction.transaction_type.slice(1)}
                    </span>
                  </div>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Amount:</span>
                    <span style={styles.detailValue}>
                      ${Math.abs(selectedTransaction.amount).toFixed(2)}
                    </span>
                  </div>
                  
                  {selectedTransaction.description && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Description:</span>
                      <span style={styles.detailValue}>
                        {selectedTransaction.description}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sale Items Section */}
                {selectedTransaction.sale_items && selectedTransaction.sale_items.length > 0 && (
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>Items Purchased</h4>
                    {selectedTransaction.sale_items.map((item, index) => (
                      <div key={index} style={styles.saleItem}>
                        <div>
                          <div style={styles.saleItemName}>
                            {item.pos_inventory?.name || item.name || 'Unknown Item'}
                          </div>
                          <div style={styles.saleItemDetails}>
                            Qty: {item.quantity} × ${(item.unit_price || 0).toFixed(2)}
                          </div>
                        </div>
                        <div style={styles.saleItemPrice}>
                          ${(item.total_price || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment Methods Section */}
                {selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>Payment Methods</h4>
                    {selectedTransaction.payments.map((payment, index) => (
                      <div key={index} style={styles.detailRow}>
                        <span style={styles.detailLabel}>
                          {payment.payment_method || payment.method || 'Unknown'}:
                        </span>
                        <span style={styles.detailValue}>
                          ${(payment.amount || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sale Totals Section */}
                {selectedTransaction.sale_data && (
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>Sale Summary</h4>
                    
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Sale Number:</span>
                      <span style={styles.detailValue}>
                        {selectedTransaction.sale_data.sale_number || 'N/A'}
                      </span>
                    </div>
                    
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Subtotal:</span>
                      <span style={styles.detailValue}>
                        ${(selectedTransaction.sale_data.subtotal || 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Tax:</span>
                      <span style={styles.detailValue}>
                        ${(selectedTransaction.sale_data.tax || 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Total:</span>
                      <span style={styles.detailValue}>
                        ${(selectedTransaction.sale_data.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.emptyMessage}>
                No transaction details available.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* REDUCED HEIGHT HEADER */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <ShoppingCart size={18} />
          <span>Cart</span>
          <span style={styles.cartCount}>{cartItems.length}</span>
        </div>
        
        {cartItems.length > 0 && (
          <button
            onClick={onClearCart}
            style={styles.clearButton}
            title="Clear cart"
          >
            Clear
          </button>
        )}
      </div>

      {/* ENHANCED CUSTOMER SECTION */}
      <div style={styles.customerSection}>
        <div style={styles.customerHeader}>
          <User size={16} style={styles.customerIcon} />
          <div style={styles.customerDetails}>
            {loyaltyCustomer ? (
              <>
                <div style={styles.customerName}>
                  {loyaltyCustomer.customer_name}
                </div>
                <div style={styles.customerBalance}>
                  Balance: {getBalanceDisplay(loyaltyCustomer.balance || 0)}
                </div>
              </>
            ) : (
              <>
                <div style={styles.customerName}>
                  No Customer
                </div>
                <div style={styles.customerSubtext}>
                  Scan QR code, Enter Name, Enter Phone Number, or Enter ID
                </div>
              </>
            )}
          </div>
          <div style={styles.statusBadge}>
            {loyaltyCustomer ? 'ATTACHED' : 'NONE'}
          </div>
        </div>
        
        {/* POLISHED LOYALTY CARDS - Only show when customer is attached */}
        {loyaltyCustomer && loyaltySettings?.is_active && cartItems.length > 0 && (
          <>
            <div style={styles.loyaltyCards}>
              <div style={styles.loyaltyCard}>
                <div style={styles.cardLabel}>Will Earn</div>
                <div style={styles.cardValue}>
                  {loyaltySettings.loyalty_mode === 'points' 
                    ? `${loyaltyPointsToEarn} pts`
                    : `$${(loyaltyPointsToEarn * 10 / loyaltySettings.redemption_rate).toFixed(2)}`
                  }
                </div>
              </div>
              
              <div style={styles.loyaltyCard}>
                <div style={styles.cardLabel}>Available</div>
                <div style={styles.cardValue}>
                  ${availableLoyaltyCredit.toFixed(2)}
                </div>
              </div>
              
              <div style={styles.loyaltyCard}>
                <div style={styles.cardLabel}>Used Today</div>
                <div style={styles.cardValue}>
                  ${usedToday.toFixed(2)}
                </div>
              </div>
              
              <div style={styles.loyaltyCard}>
                <div style={styles.cardLabel}>Remaining</div>
                <div style={styles.cardValue}>
                  ${dailyUsageRemaining.toFixed(2)}
                </div>
              </div>
            </div>
            
            {/* FIXED: ALWAYS show loyalty history button when customer is attached */}
            <button
              style={styles.loyaltyHistoryButton}
              onClick={loadLoyaltyHistory}
            >
              <History size={14} />
              View Loyalty Usage
            </button>
          </>
        )}
        
        {/* FULL WIDTH BUTTON ROW */}
        {loyaltyCustomer ? (
          <button
            style={styles.detachButton}
            onClick={handleDetachCustomer}
          >
            Detach Customer
          </button>
        ) : (
          <div style={styles.buttonRow}>
            <button
              style={styles.fullWidthButton}
              onClick={() => {
                setShowManualEntry(true);
                setShowSearch(false);
              }}
            >
              Manual Entry
            </button>
            <button
              style={styles.searchButton}
              onClick={() => {
                setShowSearch(true);
                setShowManualEntry(false);
              }}
            >
              <Search size={14} />
              Search
            </button>
          </div>
        )}

        {/* EXPANDABLE MANUAL ENTRY SECTION */}
        {showManualEntry && (
          <div style={styles.expandableSection}>
            <input
              type="text"
              value={manualCustomerId}
              onChange={(e) => setManualCustomerId(e.target.value)}
              placeholder="Enter Customer ID"
              style={styles.manualInput}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualCustomerEntry();
                }
              }}
              autoFocus
            />
            <div style={styles.actionButtons}>
              <button
                style={{
                  ...styles.actionButton,
                  ...styles.primaryActionButton,
                  flex: 1
                }}
                onClick={handleManualCustomerEntry}
                disabled={!manualCustomerId.trim()}
              >
                Add Customer
              </button>
              <button
                style={{
                  ...styles.actionButton,
                  ...styles.secondaryActionButton,
                  flex: 1
                }}
                onClick={handleCancelManualEntry}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* EXPANDABLE SEARCH SECTION */}
        {showSearch && (
          <div style={styles.expandableSection}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or phone number"
              style={styles.searchInput}
              autoFocus
            />
            
            {searchLoading && (
              <div style={{ textAlign: 'center', color: TavariStyles.colors.gray500, fontSize: TavariStyles.typography.fontSize.xs }}>
                Searching...
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div style={styles.searchResults}>
                {searchResults.map((customer) => (
                  <div
                    key={customer.id}
                    style={styles.searchResultItem}
                    onClick={() => handleSearchCustomerSelect(customer)}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = TavariStyles.colors.gray100;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={styles.resultName}>{customer.customer_name}</div>
                    <div style={styles.resultDetails}>
                      {customer.customer_phone} • Balance: {getBalanceDisplay(customer.balance || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchTerm.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', color: TavariStyles.colors.gray500, fontSize: TavariStyles.typography.fontSize.xs, marginBottom: TavariStyles.spacing.sm }}>
                No customers found
              </div>
            )}
            
            <button
              style={{
                ...styles.actionButton,
                ...styles.secondaryActionButton,
                width: '100%'
              }}
              onClick={handleCancelSearch}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* SCROLLABLE ITEMS LIST - UPDATED TO SHOW MODIFIERS */}
      <div style={styles.itemsList}>
        {cartItems.length === 0 ? (
          <div style={styles.emptyCart}>
            <div style={styles.emptyCartIcon}>🛒</div>
            <p>Cart is empty</p>
          </div>
        ) : (
          cartItems.map((item, index) => {
            const basePrice = parseFloat(item.price) || 0;
            const modifierCost = (item.modifiers || []).reduce((sum, modifier) => {
              return sum + (parseFloat(modifier.price) || 0);
            }, 0);
            const itemTotal = (basePrice + modifierCost) * (parseInt(item.quantity) || 1);
            
            return (
              <div key={`${item.id}-${index}`} style={styles.cartItem}>
                {/* TOP ROW: Item info and controls */}
                <div style={styles.cartItemTopRow}>
                  <div style={styles.itemInfo}>
                    <div style={styles.itemName}>
                      {getItemDisplayName(item)}
                    </div>
                    <div style={styles.itemPrice}>
                      ${basePrice.toFixed(2)} each
                      {modifierCost > 0 && (
                        <span> (+${modifierCost.toFixed(2)} mods)</span>
                      )}
                    </div>
                    <div style={styles.itemTotal}>
                      ${itemTotal.toFixed(2)}
                    </div>
                  </div>
                  
                  <div style={styles.quantityControls}>
                    <button
                      onClick={() => onUpdateQty(item.id, Math.max(1, item.quantity - 1))}
                      disabled={sessionLocked || item.quantity <= 1}
                      style={{
                        ...styles.quantityButton,
                        opacity: (sessionLocked || item.quantity <= 1) ? 0.5 : 1
                      }}
                    >
                      <Minus size={10} />
                    </button>
                    
                    <div style={styles.quantity}>{item.quantity}</div>
                    
                    <button
                      onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                      disabled={sessionLocked}
                      style={{
                        ...styles.quantityButton,
                        opacity: sessionLocked ? 0.5 : 1
                      }}
                    >
                      <Plus size={10} />
                    </button>
                    
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      disabled={sessionLocked}
                      style={{
                        ...styles.removeButton,
                        opacity: sessionLocked ? 0.5 : 1
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
                
                {/* MODIFIERS LIST - Only show if item has modifiers */}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div style={styles.modifiersList}>
                    {item.modifiers.map((modifier, modIndex) => (
                      <div key={modIndex} style={styles.modifier}>
                        <span style={styles.modifierName}>
                          • {modifier.name}
                        </span>
                        {parseFloat(modifier.price) > 0 && (
                          <span style={styles.modifierPrice}>
                            +${parseFloat(modifier.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CHECKOUT SECTION - ALWAYS VISIBLE AT BOTTOM */}
      {cartItems.length > 0 && (
        <div style={styles.checkoutSection}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Subtotal:</span>
            <span style={styles.summaryValue}>${subtotal.toFixed(2)}</span>
          </div>
          
          {autoLoyaltyApplied > 0 && (
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Loyalty Credit:</span>
              <span style={styles.summaryValue}>-${autoLoyaltyApplied.toFixed(2)}</span>
            </div>
          )}
          
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Tax:</span>
            <span style={styles.summaryValue}>${formatTaxAmount(taxAmount)}</span>
          </div>
          
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>Total:</span>
            <span style={styles.totalValue}>${total.toFixed(2)}</span>
          </div>
          
          <button
            onClick={() => onCheckout({
              items: cartItems,
              subtotal,
              tax: taxAmount,
              total,
              customer: attachedCustomer || loyaltyCustomer,
              tabMode,
              activeTab,
              loyaltyCustomer: loyaltyCustomer,
              discount_amount: 0,
              loyalty_redemption: autoLoyaltyApplied,
              aggregated_taxes: taxCalculation.aggregatedTaxes,
              aggregated_rebates: taxCalculation.aggregatedRebates
            })}
            disabled={sessionLocked || cartItems.length === 0}
            style={{
              ...styles.checkoutButton,
              opacity: (sessionLocked || cartItems.length === 0) ? 0.5 : 1,
              cursor: (sessionLocked || cartItems.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            <ShoppingCart size={18} />
            {tabMode ? 'Process Tab Payment' : 'Checkout'}
          </button>
        </div>
      )}

      {/* LOYALTY HISTORY MODAL - WITH CLICKABLE TRANSACTIONS */}
      {renderLoyaltyHistoryModal()}

      {/* NEW: TRANSACTION DETAIL MODAL */}
      {renderTransactionModal()}
    </div>
  );
};

export default POSCartPanel;