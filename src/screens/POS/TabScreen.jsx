// screens/POS/TabScreen.jsx - Updated with Foundation Components
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { logAction } from '../../helpers/posAudit';

// Foundation Components and Hooks
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../utils/TavariStyles';

// Existing Components
import BarcodeScanHandler from '../../components/POS/BarcodeScanHandler';
import CreateTabModal from '../../components/POS/CreateTabModal';
import ItemSelectionModal from '../../components/POS/ItemSelectionModal';
import CustomerSelectionModal from '../../components/POS/CustomerSelectionModal';
import { ManagerOverrideModal, TabDetailsModal, QRManualInputModal, QRScannerModal } from '../../components/POS/TabScreenModals';

const TabScreen = () => {
  const navigate = useNavigate();
  
  // Authentication (will be handled by POSAuthWrapper)
  const [authData, setAuthData] = useState(null);
  
  // Tax calculations
  const taxCalculations = useTaxCalculations(authData?.selectedBusinessId);
  
  // State
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTabDetails, setShowTabDetails] = useState(false);
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [showCustomerSelectionModal, setShowCustomerSelectionModal] = useState(false);
  const [selectedPaymentTab, setSelectedPaymentTab] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [qrSearchValue, setQrSearchValue] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  const [showQRManualInput, setShowQRManualInput] = useState(false);

  // Manager override for tab operations
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  // Helper function to format currency using TavariStyles
  const formatCurrency = (amount) => {
    return `$${(Number(amount) || 0).toFixed(2)}`;
  };

  // Initialize when auth is ready
  const handleAuthReady = (auth) => {
    console.log('TabScreen: Authentication ready:', auth);
    setAuthData(auth);
  };

  // Load tabs when business ID is available
  useEffect(() => {
    if (authData?.selectedBusinessId) {
      loadTabs();
      
      // Set up real-time subscription
      const subscription = supabase
        .channel(`pos_tabs_${authData.selectedBusinessId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'pos_tabs', filter: `business_id=eq.${authData.selectedBusinessId}` },
          loadTabs
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [authData?.selectedBusinessId]);

  const loadTabs = async () => {
    if (!authData?.selectedBusinessId) return;

    try {
      setLoading(true);
      setError(null);

      // Fixed query - removed category_id that doesn't exist in pos_tab_items table
      const { data, error: tabError } = await supabase
        .from('pos_tabs')
        .select(`
          *,
          pos_tab_items (
            id, name, quantity, unit_price, total_price, modifiers, notes
          )
        `)
        .eq('business_id', authData.selectedBusinessId)
        .in('status', ['open', 'partial'])
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (tabError) throw tabError;

      // Load loyalty account information and recalculate totals with proper tax calculations
      const tabsWithLoyalty = await Promise.all((data || []).map(async (tab) => {
        let updatedTab = { ...tab };

        // Recalculate totals from tab items using tax calculations
        if (tab.pos_tab_items && tab.pos_tab_items.length > 0) {
          const itemsSubtotal = tab.pos_tab_items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
          
          // If tab shows $0 but has items, recalculate with proper tax logic
          if ((Number(tab.subtotal) || 0) === 0 && itemsSubtotal > 0) {
            console.log(`Tab ${tab.tab_number} has items but $0 totals, recalculating with tax logic...`);
            
            // Since pos_tab_items doesn't have category_id, we'll use a fallback tax calculation
            // This assumes items without category info get default business tax rates
            let taxAmount = 0;
            
            if (!taxCalculations.loading && taxCalculations.taxCategories.length > 0) {
              // Use tax calculation hook if available, but provide fallback items structure
              const itemsForTaxCalc = tab.pos_tab_items.map(item => ({
                ...item,
                price: item.unit_price || 0,
                quantity: item.quantity || 1,
                // Use a default category if available, or null for manual tax calculation
                category_id: null
              }));
              
              const taxResult = taxCalculations.calculateTotalTax(
                itemsForTaxCalc, 
                0, // no discount
                0, // no loyalty redemption
                itemsSubtotal
              );
              
              taxAmount = taxResult.totalTax;
            } else {
              // Fallback to basic tax calculation (13% HST as example)
              taxAmount = itemsSubtotal * 0.13;
            }
            
            const totalAmount = itemsSubtotal + taxAmount;
            const balanceRemaining = totalAmount - (Number(tab.amount_paid) || 0);

            // Update the tab in database
            const { error: updateError } = await supabase
              .from('pos_tabs')
              .update({
                subtotal: itemsSubtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                balance_remaining: balanceRemaining,
                updated_at: new Date().toISOString()
              })
              .eq('id', tab.id);

            if (!updateError) {
              updatedTab = {
                ...tab,
                subtotal: itemsSubtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                balance_remaining: balanceRemaining
              };
            }
          }
        }

        // Load loyalty account if needed
        if (updatedTab.loyalty_customer_id) {
          const { data: loyaltyAccount } = await supabase
            .from('pos_loyalty_accounts')
            .select('id, customer_name, customer_email, customer_phone, balance')
            .eq('id', updatedTab.loyalty_customer_id)
            .eq('business_id', authData.selectedBusinessId)
            .single();
          
          return { ...updatedTab, pos_loyalty_accounts: loyaltyAccount };
        }
        
        return updatedTab;
      }));

      setTabs(tabsWithLoyalty || []);
    } catch (err) {
      console.error('Error loading tabs:', err);
      setError('Failed to load tabs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManagerOverride = async (pin) => {
    if (!authData?.validateManagerPin) {
      setError('Manager PIN validation not available');
      return;
    }

    const isValidPin = await authData.validateManagerPin(pin);
    if (!isValidPin) {
      setError('Invalid manager PIN');
      return;
    }

    try {
      await logAction({
        action: 'manager_override_tab',
        context: 'TabScreen',
        metadata: {
          reason: overrideReason,
          action: pendingAction?.type,
          tab_id: pendingAction?.tab?.id
        }
      });

      // Execute the pending action
      if (pendingAction?.type === 'close_tab') {
        await executeCloseTab(pendingAction.tab);
      } else if (pendingAction?.type === 'delete_tab') {
        await executeDeleteTab(pendingAction.tab);
      }

      // Reset manager override
      setShowManagerOverride(false);
      setManagerPin('');
      setOverrideReason('');
      setPendingAction(null);
      
    } catch (err) {
      console.error('Manager override error:', err);
      setError('Failed to execute override: ' + err.message);
    }
  };

  // Handle barcode scanner input for QR codes
  const handleBarcodeOrQRScan = (code) => {
    console.log('Barcode/QR scanned:', code);
    
    if (showSearchScanner) {
      handleSearchQRScan(code);
    }
  };

  const handleSearchQRScan = async (qrData) => {
    if (!authData?.selectedBusinessId) return;

    try {
      setShowSearchScanner(false);
      setQrSearchValue('');
      console.log('Processing search QR code data:', qrData);
      
      let searchValue = '';
      
      // Try to parse as JSON first (loyalty customer QR)
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.type === 'loyalty_customer' && parsed.customer_id) {
          const { data: loyaltyCustomer, error } = await supabase
            .from('pos_loyalty_accounts')
            .select('customer_name, customer_phone, customer_email')
            .eq('id', parsed.customer_id)
            .eq('business_id', authData.selectedBusinessId)
            .single();

          if (loyaltyCustomer && !error) {
            searchValue = loyaltyCustomer.customer_name;
          }
        }
      } catch (jsonError) {
        console.log('Not valid JSON, trying other formats');
      }

      // Try as direct loyalty account ID (UUID format)
      if (!searchValue && qrData.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: loyaltyCustomer, error } = await supabase
          .from('pos_loyalty_accounts')
          .select('customer_name, customer_phone, customer_email')
          .eq('id', qrData)
          .eq('business_id', authData.selectedBusinessId)
          .single();

        if (loyaltyCustomer && !error) {
          searchValue = loyaltyCustomer.customer_name;
        }
      }

      // Try as phone number
      if (!searchValue && qrData.match(/^\+?[\d\s\-\(\)]+$/)) {
        const cleanPhone = qrData.replace(/\D/g, '');
        searchValue = cleanPhone;
      }

      // Use as direct text if it's reasonable length
      if (!searchValue && qrData.length > 2 && qrData.length < 50 && !qrData.includes('/')) {
        searchValue = qrData;
      }

      if (searchValue) {
        setSearchTerm(searchValue);
        console.log('Search term set to:', searchValue);
      } else {
        setError('Could not determine search term from QR code');
      }

    } catch (err) {
      console.error('Search QR scan error:', err);
      setError('Failed to process QR code for search: ' + err.message);
    }
  };

  const handleManualQRSearch = async () => {
    if (!qrSearchValue.trim()) {
      setError('Please enter a QR code value');
      return;
    }

    await handleSearchQRScan(qrSearchValue.trim());
    setShowQRManualInput(false);
    setQrSearchValue('');
  };

  // Item Selection Modal Functions
  const handleItemToggle = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSelectAllItems = () => {
    if (selectedPaymentTab?.pos_tab_items) {
      setSelectedItems([...selectedPaymentTab.pos_tab_items]);
    }
  };

  const handleClearItemSelection = () => {
    setSelectedItems([]);
  };

  const proceedToCustomerSelection = () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item to pay for');
      return;
    }
    setShowItemSelectionModal(false);
    setShowCustomerSelectionModal(true);
  };

  const proceedToPayment = () => {
    // Calculate totals for selected items using tax calculations
    const selectedSubtotal = selectedItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    
    // Prepare items for tax calculation (add fallback structure)
    const itemsForTaxCalc = selectedItems.map(item => ({
      ...item,
      price: item.unit_price || 0,
      quantity: item.quantity || 1,
      category_id: null // Fallback since pos_tab_items doesn't have category_id
    }));
    
    let taxResult = { totalTax: 0, aggregatedTaxes: {}, aggregatedRebates: {}, itemTaxDetails: [] };
    
    // Use tax calculation hook if available
    if (!taxCalculations.loading && taxCalculations.taxCategories.length > 0) {
      taxResult = taxCalculations.calculateTotalTax(itemsForTaxCalc, 0, 0, selectedSubtotal);
    } else {
      // Fallback tax calculation
      taxResult.totalTax = selectedSubtotal * 0.13; // 13% HST fallback
    }
    
    const selectedTotal = selectedSubtotal + taxResult.totalTax;

    // Navigate to payment screen with selected items and customer
    navigate('/dashboard/pos/payment', {
      state: {
        saleData: {
          ...selectedPaymentTab,
          items: selectedItems,
          loyaltyCustomer: paymentCustomer,
          tab_mode: true,
          payment_type: 'partial',
          subtotal: selectedSubtotal,
          tax_amount: taxResult.totalTax,
          total_amount: selectedTotal,
          amount_paid: 0,
          balance_remaining: selectedTotal,
          is_partial_payment: true,
          original_tab_id: selectedPaymentTab.id,
          // Include tax breakdown for payment screen
          aggregatedTaxes: taxResult.aggregatedTaxes,
          aggregatedRebates: taxResult.aggregatedRebates,
          itemTaxDetails: taxResult.itemTaxDetails
        }
      }
    });

    // Reset modal states
    setShowCustomerSelectionModal(false);
    setSelectedPaymentTab(null);
    setSelectedItems([]);
    setPaymentCustomer(null);
  };

  const handleCreateTab = async (tabData) => {
    const { data: tab, error } = await supabase
      .from('pos_tabs')
      .insert(tabData)
      .select()
      .single();

    if (error) throw error;

    await logAction({
      action: 'tab_created',
      context: 'TabScreen',
      metadata: {
        tab_id: tab.id,
        tab_number: tab.tab_number,
        customer_name: tab.customer_name,
        loyalty_customer_id: tab.loyalty_customer_id
      }
    });

    setShowCreateModal(false);

    navigate('/dashboard/pos/register', {
      state: {
        activeTab: tab,
        mode: 'tab',
        justCreated: true
      }
    });
  };

  const handleSelectTab = (tab) => {
    setSelectedTab(tab);
    setShowTabDetails(true);
  };

  const handleAddItemsToTab = (tab) => {
    navigate('/dashboard/pos/register', {
      state: {
        activeTab: tab,
        mode: 'tab'
      }
    });
  };

  const handlePayTab = (tab, paymentType = 'partial') => {
    setSelectedPaymentTab(tab);
    setSelectedItems([]);
    setPaymentCustomer(null);
    setShowItemSelectionModal(true);
  };

  const handleCloseTab = (tab) => {
    if (tab.balance_remaining > 0.01) {
      setPendingAction({ type: 'close_tab', tab });
      setOverrideReason('Closing tab with remaining balance');
      setShowManagerOverride(true);
    } else {
      executeCloseTab(tab);
    }
  };

  const executeCloseTab = async (tab) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('pos_tabs')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tab.id);

      if (error) throw error;

      await logAction({
        action: 'tab_closed',
        context: 'TabScreen',
        metadata: {
          tab_id: tab.id,
          tab_number: tab.tab_number,
          final_balance: tab.balance_remaining
        }
      });

      loadTabs();
    } catch (err) {
      console.error('Error closing tab:', err);
      setError('Failed to close tab: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTab = (tab) => {
    setPendingAction({ type: 'delete_tab', tab });
    setOverrideReason('Deleting tab - requires manager approval');
    setShowManagerOverride(true);
  };

  const executeDeleteTab = async (tab) => {
    try {
      setLoading(true);
      
      // First delete associated tab items
      await supabase
        .from('pos_tab_items')
        .delete()
        .eq('tab_id', tab.id);

      // Then delete the tab
      const { error } = await supabase
        .from('pos_tabs')
        .delete()
        .eq('id', tab.id);

      if (error) throw error;

      await logAction({
        action: 'tab_deleted',
        context: 'TabScreen',
        metadata: {
          tab_id: tab.id,
          tab_number: tab.tab_number,
          customer_name: tab.customer_name
        }
      });

      loadTabs();
    } catch (err) {
      console.error('Error deleting tab:', err);
      setError('Failed to delete tab: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTabs = tabs.filter(tab => {
    if (!searchTerm) return true;
    return (
      tab.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.tab_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getTabStatus = (tab) => {
    if (tab.status === 'closed') return 'Closed';
    if (tab.balance_remaining <= 0) return 'Paid in Full';
    if (tab.amount_paid > 0) return 'Partial Payment';
    return 'Open';
  };

  const getStatusColor = (tab) => {
    if (tab.status === 'closed') return TavariStyles.colors.gray500;
    if (tab.balance_remaining <= 0) return TavariStyles.colors.success;
    if (tab.amount_paid > 0) return TavariStyles.colors.warning;
    return TavariStyles.colors.info;
  };

  // Create styles using TavariStyles
  const styles = {
    container: {
      ...TavariStyles.layout.container
    },
    header: {
      marginBottom: TavariStyles.spacing['3xl'],
      textAlign: 'center'
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.sm
    },
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },
    errorBanner: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error
    },
    controls: {
      display: 'flex',
      gap: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.xl,
      alignItems: 'flex-end',
      flexWrap: 'wrap'
    },
    searchSection: {
      flex: 1,
      display: 'flex',
      gap: TavariStyles.spacing.lg,
      alignItems: 'flex-end',
      flexWrap: 'wrap'
    },
    searchGroup: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: '250px',
      flex: 1
    },
    qrSearchGroup: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: '180px'
    },
    sortGroup: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: '150px'
    },
    searchLabel: {
      ...TavariStyles.components.form.label
    },
    searchInput: {
      ...TavariStyles.components.form.input,
      borderColor: TavariStyles.colors.primary,
      borderWidth: '2px'
    },
    qrButtonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },
    qrScanButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.sm,
      flex: 1,
      whiteSpace: 'nowrap'
    },
    qrManualButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.sm,
      flex: 1,
      backgroundColor: TavariStyles.colors.gray600,
      color: TavariStyles.colors.white,
      whiteSpace: 'nowrap'
    },
    sortSelect: {
      ...TavariStyles.components.form.select,
      borderColor: TavariStyles.colors.primary,
      borderWidth: '2px',
      minWidth: '150px'
    },
    createButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md,
      whiteSpace: 'nowrap'
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing['3xl']
    },
    statCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      textAlign: 'center'
    },
    statValue: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.sm
    },
    statLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500
    },
    content: {
      flex: 1,
      overflowY: 'auto'
    },
    emptyState: {
      textAlign: 'center',
      padding: `${TavariStyles.spacing['6xl']} ${TavariStyles.spacing.xl}`,
      color: TavariStyles.colors.gray500
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: TavariStyles.spacing.xl
    },
    emptyTitle: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.md
    },
    emptyText: {
      fontSize: TavariStyles.typography.fontSize.lg,
      marginBottom: TavariStyles.spacing['3xl']
    },
    tabGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: TavariStyles.spacing.xl,
      paddingBottom: TavariStyles.spacing.xl
    },
    tabCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      border: `2px solid ${TavariStyles.colors.gray200}`,
      transition: TavariStyles.transitions.normal,
      boxShadow: TavariStyles.shadows.md
    },
    tabHeader: {
      ...TavariStyles.layout.flexBetween,
      marginBottom: TavariStyles.spacing.lg,
      paddingBottom: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    tabNumber: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800
    },
    tabStatus: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      backgroundColor: TavariStyles.colors.gray100
    },
    tabBody: {
      marginBottom: TavariStyles.spacing.lg
    },
    customerInfo: {
      marginBottom: TavariStyles.spacing.lg
    },
    customerName: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },
    customerPhone: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      marginBottom: TavariStyles.spacing.xs
    },
    customerEmail: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      marginBottom: TavariStyles.spacing.xs
    },
    loyaltyBadge: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.success,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      backgroundColor: TavariStyles.colors.successBg,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      display: 'inline-block',
      marginBottom: TavariStyles.spacing.xs
    },
    tabNotes: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic'
    },
    tabAmounts: {
      marginBottom: TavariStyles.spacing.lg
    },
    amountRow: {
      ...TavariStyles.layout.flexBetween,
      marginBottom: TavariStyles.spacing.xs,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    totalAmount: {
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800
    },
    paidAmount: {
      color: TavariStyles.colors.success
    },
    balanceAmount: {
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    tabMeta: {
      ...TavariStyles.layout.flexBetween,
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray400
    },
    tabActions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm,
      justifyContent: 'space-between'
    },
    actionButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.ghost,
      ...TavariStyles.components.button.sizes.sm,
      flex: 1
    },
    payButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.success,
      ...TavariStyles.components.button.sizes.sm,
      flex: 1
    },
    closeButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.sm,
      flex: 1
    },
    deleteButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.danger,
      ...TavariStyles.components.button.sizes.sm,
      minWidth: '40px'
    },
    loading: {
      ...TavariStyles.components.loading.container
    }
  };

  const TabScreenContent = () => {
    if (loading) {
      return (
        <div style={styles.container}>
          <div style={styles.loading}>Loading tabs...</div>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Tab Management</h2>
          <p style={styles.subtitle}>Manage customer tabs and open orders</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Controls */}
        <div style={styles.controls}>
          <div style={styles.searchSection}>
            {/* Text Search */}
            <div style={styles.searchGroup}>
              <label style={styles.searchLabel}>Search Tabs:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Customer name, phone, or tab number..."
                style={styles.searchInput}
              />
            </div>

            {/* QR Code Search */}
            <div style={styles.qrSearchGroup}>
              <label style={styles.searchLabel}>QR Search:</label>
              <div style={styles.qrButtonGroup}>
                <button
                  style={styles.qrScanButton}
                  onClick={() => setShowSearchScanner(true)}
                  title="Scan customer QR code"
                >
                  Scan QR
                </button>
                <button
                  style={styles.qrManualButton}
                  onClick={() => setShowQRManualInput(true)}
                  title="Enter QR code manually"
                >
                  Enter QR
                </button>
              </div>
            </div>

            {/* Sort */}
            <div style={styles.sortGroup}>
              <label style={styles.searchLabel}>Sort:</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                  loadTabs();
                }}
                style={styles.sortSelect}
              >
                <option value="updated_at-desc">Most Recent</option>
                <option value="updated_at-asc">Oldest First</option>
                <option value="customer_name-asc">Customer A-Z</option>
                <option value="customer_name-desc">Customer Z-A</option>
                <option value="total_amount-desc">Highest Amount</option>
                <option value="total_amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>
          
          <button
            style={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            + Create New Tab
          </button>
        </div>

        {/* Stats */}
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{filteredTabs.length}</div>
            <div style={styles.statLabel}>Active Tabs</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatCurrency(filteredTabs.reduce((sum, tab) => sum + (tab.total_amount || 0), 0))}
            </div>
            <div style={styles.statLabel}>Total Tab Value</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatCurrency(filteredTabs.reduce((sum, tab) => sum + (tab.balance_remaining || 0), 0))}
            </div>
            <div style={styles.statLabel}>Outstanding Balance</div>
          </div>
        </div>

        {/* Tab List */}
        <div style={styles.content}>
          {filteredTabs.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <div style={styles.emptyTitle}>No Active Tabs</div>
              <div style={styles.emptyText}>
                {searchTerm ? 'No tabs match your search criteria' : 'Create a new tab to get started'}
              </div>
              {!searchTerm && (
                <button
                  style={styles.createButton}
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Tab
                </button>
              )}
            </div>
          ) : (
            <div style={styles.tabGrid}>
              {filteredTabs.map(tab => (
                <div key={tab.id} style={styles.tabCard}>
                  <div style={styles.tabHeader}>
                    <div style={styles.tabNumber}>{tab.tab_number}</div>
                    <div 
                      style={{
                        ...styles.tabStatus,
                        color: getStatusColor(tab)
                      }}
                    >
                      {getTabStatus(tab)}
                    </div>
                  </div>
                  
                  <div style={styles.tabBody}>
                    <div style={styles.customerInfo}>
                      <div style={styles.customerName}>{tab.customer_name}</div>
                      {tab.customer_phone && (
                        <div style={styles.customerPhone}>📞 {tab.customer_phone}</div>
                      )}
                      {tab.customer_email && (
                        <div style={styles.customerEmail}>✉️ {tab.customer_email}</div>
                      )}
                      {tab.pos_loyalty_accounts && (
                        <div style={styles.loyaltyBadge}>⭐ Loyalty Member</div>
                      )}
                      {tab.notes && (
                        <div style={styles.tabNotes}>📝 {tab.notes}</div>
                      )}
                    </div>
                    
                    <div style={styles.tabAmounts}>
                      <div style={styles.amountRow}>
                        <span>Total:</span>
                        <span style={styles.totalAmount}>{formatCurrency(tab.total_amount)}</span>
                      </div>
                      <div style={styles.amountRow}>
                        <span>Paid:</span>
                        <span style={styles.paidAmount}>{formatCurrency(tab.amount_paid)}</span>
                      </div>
                      <div style={styles.amountRow}>
                        <span>Balance:</span>
                        <span style={{
                          ...styles.balanceAmount,
                          color: tab.balance_remaining > 0 ? TavariStyles.colors.danger : TavariStyles.colors.success
                        }}>
                          {formatCurrency(tab.balance_remaining)}
                        </span>
                      </div>
                    </div>
                    
                    <div style={styles.tabMeta}>
                      <div style={styles.tabDate}>
                        Created: {new Date(tab.created_at).toLocaleDateString()}
                      </div>
                      <div style={styles.tabItems}>
                        Items: {tab.pos_tab_items?.length || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div style={styles.tabActions}>
                    <button
                      style={styles.actionButton}
                      onClick={() => handleSelectTab(tab)}
                      title="View Details"
                    >
                      👁️ View
                    </button>
                    <button
                      style={styles.actionButton}
                      onClick={() => handleAddItemsToTab(tab)}
                      title="Add Items"
                    >
                      ➕ Add Items
                    </button>
                    {tab.balance_remaining > 0 ? (
                      <button
                        style={styles.payButton}
                        onClick={() => handlePayTab(tab, 'partial')}
                        title="Make Payment"
                      >
                        💳 Pay
                      </button>
                    ) : (
                      <button
                        style={styles.closeButton}
                        onClick={() => handleCloseTab(tab)}
                        title="Close Tab"
                      >
                        ✅ Close
                      </button>
                    )}
                    <button
                      style={styles.deleteButton}
                      onClick={() => handleDeleteTab(tab)}
                      title="Delete Tab"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <CreateTabModal
          showModal={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTab={handleCreateTab}
          selectedBusinessId={authData?.selectedBusinessId}
          authUser={authData?.authUser}
        />

        <ItemSelectionModal
          showModal={showItemSelectionModal}
          onClose={() => {
            setShowItemSelectionModal(false);
            setSelectedPaymentTab(null);
            setSelectedItems([]);
          }}
          selectedPaymentTab={selectedPaymentTab}
          selectedItems={selectedItems}
          onItemToggle={handleItemToggle}
          onSelectAllItems={handleSelectAllItems}
          onClearItemSelection={handleClearItemSelection}
          onProceedToCustomerSelection={proceedToCustomerSelection}
          formatCurrency={formatCurrency}
        />

        <CustomerSelectionModal
          showModal={showCustomerSelectionModal}
          onClose={() => {
            setShowCustomerSelectionModal(false);
            setPaymentCustomer(null);
          }}
          onBackToItems={() => {
            setShowCustomerSelectionModal(false);
            setShowItemSelectionModal(true);
          }}
          selectedItems={selectedItems}
          selectedPaymentTab={selectedPaymentTab}
          paymentCustomer={paymentCustomer}
          onCustomerSelected={setPaymentCustomer}
          onProceedToPayment={proceedToPayment}
          formatCurrency={formatCurrency}
          selectedBusinessId={authData?.selectedBusinessId}
        />

        <ManagerOverrideModal
          showModal={showManagerOverride}
          onClose={() => {
            setShowManagerOverride(false);
            setPendingAction(null);
            setManagerPin('');
            setError(null);
          }}
          overrideReason={overrideReason}
          onApproveOverride={handleManagerOverride}
          error={error}
        />

        <TabDetailsModal
          showModal={showTabDetails}
          onClose={() => {
            setShowTabDetails(false);
            setSelectedTab(null);
          }}
          selectedTab={selectedTab}
          onAddItems={handleAddItemsToTab}
          onMakePayment={handlePayTab}
          formatCurrency={formatCurrency}
        />

        <QRManualInputModal
          showModal={showQRManualInput}
          onClose={() => {
            setShowQRManualInput(false);
            setQrSearchValue('');
          }}
          onSubmit={handleManualQRSearch}
          value={qrSearchValue}
          onChange={setQrSearchValue}
          title="Enter QR Code Manually"
          instructions="Enter the QR code data from a customer's loyalty card. This can be: Customer UUID, Phone number, Customer name, or JSON loyalty data"
        />

        <QRScannerModal
          showModal={showSearchScanner}
          onClose={() => setShowSearchScanner(false)}
          onScan={handleBarcodeOrQRScan}
          title="Scan Customer QR Code"
          instructions="Scan a customer's loyalty card QR code to search for their open tabs"
        />
      </div>
    );
  };

  return (
    <POSAuthWrapper
      requireBusiness={true}
      requiredRoles={['cashier', 'manager', 'owner']}
      componentName="Tab Management"
      onAuthReady={handleAuthReady}
    >
      <TabScreenContent />
    </POSAuthWrapper>
  );
};

export default TabScreen;