// screens/POS/RefundsScreen.jsx - Updated with Modular Components
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { logAction } from '../../helpers/posAudit';

// Foundation Components
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { TavariStyles } from '../../utils/TavariStyles';

// Refund Components
import RefundSearchControls from '../../components/POS/POSRefundComponents/RefundSearchControls';
import RefundTransactionCard from '../../components/POS/POSRefundComponents/RefundTransactionCard';
import RefundModal from '../../components/POS/POSRefundComponents/RefundModal';
import ManualRefundModal from '../../components/POS/POSRefundComponents/ManualRefundModal';

// Use existing BarcodeScanHandler for QR scanning
import BarcodeScanHandler from '../../components/POS/BarcodeScanHandler';

const RefundsScreen = () => {
  const navigate = useNavigate();
  
  // Foundation hooks
  const auth = usePOSAuth({
    requiredRoles: ['cashier', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'RefundsScreen'
  });

  // State management
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('today');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showManualRefundModal, setShowManualRefundModal] = useState(false);
  const [businessSettings, setBusinessSettings] = useState({});

  // QR Scanner state
  const [qrScanResult, setQrScanResult] = useState(null);
  const [isQrScannerActive, setIsQrScannerActive] = useState(false);

  useEffect(() => {
    if (auth.selectedBusinessId) {
      loadTransactions();
      loadBusinessSettings();
    }
  }, [auth.selectedBusinessId, dateRange]);

  useEffect(() => {
    if (auth.selectedBusinessId) {
      if (searchTerm) {
        searchTransactions();
      } else {
        loadTransactions();
      }
    }
  }, [searchTerm, auth.selectedBusinessId]);

  const loadBusinessSettings = async () => {
    try {
      // Load POS settings
      const { data: posSettings, error: posError } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .single();

      if (posError && posError.code !== 'PGRST116') throw posError;

      // Load business info
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', auth.selectedBusinessId)
        .single();

      if (businessError) throw businessError;

      // Combine settings
      const combinedSettings = {
        ...posSettings,
        business_name: business.name,
        business_address: business.business_address || business.address || '123 Main St',
        business_city: business.business_city || business.city || 'Your City',
        business_state: business.business_state || business.state || 'ON',
        business_postal: business.business_postal || business.postal_code || 'N1A 1A1',
        business_phone: business.business_phone || business.phone,
        business_email: business.business_email || business.email,
        tax_number: business.tax_number || business.hst_number,
        timezone: business.timezone || 'America/Toronto'
      };

      setBusinessSettings(combinedSettings);
    } catch (err) {
      console.error('Error loading business settings:', err);
      // Set minimal defaults
      setBusinessSettings({
        business_name: 'Your Business Name',
        business_address: '123 Main St',
        business_city: 'Your City',
        business_state: 'ON',
        business_postal: 'N1A 1A1'
      });
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return today.toISOString();
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return monthAgo.toISOString();
      case 'all':
        return '2020-01-01T00:00:00.000Z';
      default:
        return today.toISOString();
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateFilter = getDateFilter();
      
      // Query with only existing columns
      const { data: sales, error: salesError } = await supabase
        .from('pos_sales')
        .select(`
          id,
          sale_number,
          subtotal,
          tax,
          discount,
          loyalty_discount,
          total,
          payment_status,
          customer_name,
          created_at,
          user_id,
          qr_code,
          pos_sale_items (
            id,
            inventory_id,
            name,
            sku,
            quantity,
            unit_price,
            total_price,
            modifiers,
            notes
          )
        `)
        .eq('business_id', auth.selectedBusinessId)
        .eq('payment_status', 'completed')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      if (salesError) throw salesError;

      console.log('Loaded sales:', sales);

      // Get existing refunds for these sales
      if (sales && sales.length > 0) {
        const saleIds = sales.map(sale => sale.id);
        const { data: refunds, error: refundsError } = await supabase
          .from('pos_refunds')
          .select('original_sale_id, total_refund_amount')
          .in('original_sale_id', saleIds);

        if (refundsError) {
          console.warn('Error loading refunds:', refundsError);
        }

        // Calculate refunded amounts per sale
        const refundAmounts = {};
        (refunds || []).forEach(refund => {
          refundAmounts[refund.original_sale_id] = 
            (refundAmounts[refund.original_sale_id] || 0) + (refund.total_refund_amount || 0);
        });

        // Add refund info to transactions
        const transactionsWithRefunds = sales.map(sale => ({
          ...sale,
          total_refunded: refundAmounts[sale.id] || 0,
          remaining_refundable: (sale.total || 0) - (refundAmounts[sale.id] || 0)
        }));

        setTransactions(transactionsWithRefunds);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchTransactions = async () => {
    if (!searchTerm.trim()) {
      loadTransactions();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: sales, error } = await supabase
        .from('pos_sales')
        .select(`
          id,
          sale_number,
          subtotal,
          tax,
          discount,
          loyalty_discount,
          total,
          payment_status,
          customer_name,
          created_at,
          user_id,
          qr_code,
          pos_sale_items (
            id,
            inventory_id,
            name,
            sku,
            quantity,
            unit_price,
            total_price,
            modifiers,
            notes
          )
        `)
        .eq('business_id', auth.selectedBusinessId)
        .eq('payment_status', 'completed')
        .or(`sale_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('Search results:', sales);

      // Get refund info for search results
      if (sales && sales.length > 0) {
        const saleIds = sales.map(sale => sale.id);
        const { data: refunds } = await supabase
          .from('pos_refunds')
          .select('original_sale_id, total_refund_amount')
          .in('original_sale_id', saleIds);

        const refundAmounts = {};
        (refunds || []).forEach(refund => {
          refundAmounts[refund.original_sale_id] = 
            (refundAmounts[refund.original_sale_id] || 0) + (refund.total_refund_amount || 0);
        });

        const transactionsWithRefunds = sales.map(sale => ({
          ...sale,
          total_refunded: refundAmounts[sale.id] || 0,
          remaining_refundable: (sale.total || 0) - (refundAmounts[sale.id] || 0)
        }));

        setTransactions(transactionsWithRefunds);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error searching transactions:', err);
      setError('Failed to search transactions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // QR Code scan handler
  const handleQRTransactionFound = (transaction) => {
    console.log('QR scan found transaction:', transaction);
    setQrScanResult(transaction);
    setSelectedTransaction(transaction);
    setIsQrScannerActive(false);
    
    // Show success message
    const successMessage = `Found transaction: Sale #${transaction.sale_number}`;
    showToast(successMessage, 'success');
    
    // Log the QR scan
    logAction({
      action: 'qr_scan_transaction_found',
      context: 'RefundsScreen',
      metadata: {
        transaction_id: transaction.id,
        sale_number: transaction.sale_number,
        scan_method: 'qr_code'
      }
    });
  };

  // QR/Barcode scan handler - simplified for actual database structure  
  const handleBarcodeScan = async (scannedCode) => {
    if (!isQrScannerActive) return;
    
    console.log('Barcode/QR scanned:', scannedCode);
    setError(null);
    
    try {
      // Try direct QR code lookup first (when QR codes start getting populated)
      let { data: transaction, error } = await supabase
        .from('pos_sales')
        .select(`
          id, sale_number, subtotal, tax, discount, loyalty_discount, total,
          payment_status, customer_name, created_at, user_id, qr_code,
          pos_sale_items (
            id, inventory_id, name, sku, quantity, unit_price, total_price, modifiers, notes
          )
        `)
        .eq('business_id', auth.selectedBusinessId)
        .eq('qr_code', scannedCode)
        .eq('payment_status', 'completed')
        .single();

      // If no QR match, try sale_number lookup
      if (error || !transaction) {
        const result = await supabase
          .from('pos_sales')
          .select(`
            id, sale_number, subtotal, tax, discount, loyalty_discount, total,
            payment_status, customer_name, created_at, user_id, qr_code,
            pos_sale_items (
              id, inventory_id, name, sku, quantity, unit_price, total_price, modifiers, notes
            )
          `)
          .eq('business_id', auth.selectedBusinessId)
          .eq('sale_number', scannedCode)
          .eq('payment_status', 'completed')
          .single();
          
        transaction = result.data;
        error = result.error;
      }

      // If still no match, try UUID lookup (transaction ID)
      if (error || !transaction) {
        if (scannedCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const result = await supabase
            .from('pos_sales')
            .select(`
              id, sale_number, subtotal, tax, discount, loyalty_discount, total,
              payment_status, customer_name, created_at, user_id, qr_code,
              pos_sale_items (
                id, inventory_id, name, sku, quantity, unit_price, total_price, modifiers, notes
              )
            `)
            .eq('business_id', auth.selectedBusinessId)
            .eq('id', scannedCode)
            .eq('payment_status', 'completed')
            .single();
            
          transaction = result.data;
          error = result.error;
        }
      }

      if (error || !transaction) {
        throw new Error(`No transaction found for scanned code: ${scannedCode}`);
      }

      // Calculate refund info
      const { data: refunds } = await supabase
        .from('pos_refunds')
        .select('total_refund_amount')
        .eq('original_sale_id', transaction.id);

      const totalRefunded = refunds?.reduce((sum, refund) => sum + (refund.total_refund_amount || 0), 0) || 0;
      
      const transactionWithRefundInfo = {
        ...transaction,
        total_refunded: totalRefunded,
        remaining_refundable: (transaction.total || 0) - totalRefunded
      };

      handleQRTransactionFound(transactionWithRefundInfo);
      
    } catch (err) {
      console.error('QR scan error:', err);
      setError(err.message);
      showToast(err.message, 'error');
    }
  };

  const handleSelectTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowRefundModal(true);
    
    logAction({
      action: 'refund_transaction_selected',
      context: 'RefundsScreen',
      metadata: {
        sale_id: transaction.id,
        sale_number: transaction.sale_number,
        original_total: transaction.total,
        remaining_refundable: transaction.remaining_refundable
      }
    });
  };

  const handleManualRefund = () => {
    setShowManualRefundModal(true);
    
    logAction({
      action: 'manual_refund_initiated',
      context: 'RefundsScreen',
      metadata: {
        initiated_by: auth.authUser?.id
      }
    });
  };

  const handleCloseRefundModal = () => {
    setShowRefundModal(false);
    setSelectedTransaction(null);
    setQrScanResult(null);
  };

  const handleCloseManualRefundModal = () => {
    setShowManualRefundModal(false);
  };

  const handleRefundCompleted = () => {
    setShowRefundModal(false);
    setShowManualRefundModal(false);
    setSelectedTransaction(null);
    setQrScanResult(null);
    loadTransactions(); // Refresh the list
  };

  const handleToggleQrScanner = () => {
    setIsQrScannerActive(!isQrScannerActive);
    if (qrScanResult) {
      setQrScanResult(null);
    }
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? TavariStyles.colors.danger : 
                   type === 'success' ? TavariStyles.colors.success : 
                   TavariStyles.colors.primary;
    
    toast.style.cssText = `
      position: fixed;
      top: 120px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      background-color: ${bgColor};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  const renderTransactionsList = () => {
    if (loading) {
      return (
        <div style={styles.loading}>
          Loading transactions...
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🧾</div>
          <div style={styles.emptyTitle}>No transactions found</div>
          <div style={styles.emptyText}>
            {searchTerm ? 'Try a different search term or scan a QR code' : 'No transactions for the selected time period'}
          </div>
          <div style={styles.emptyActions}>
            <button 
              style={styles.manualRefundButton}
              onClick={handleManualRefund}
            >
              💰 Manual Refund
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.transactionsList}>
        {transactions.map(transaction => (
          <RefundTransactionCard
            key={transaction.id}
            transaction={transaction}
            qrScanResult={qrScanResult}
            onSelect={handleSelectTransaction}
          />
        ))}
      </div>
    );
  };

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
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.xl
    },
    successBanner: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.success,
      marginBottom: TavariStyles.spacing.xl
    },
    content: {
      flex: 1,
      overflowY: 'auto'
    },
    loading: {
      ...TavariStyles.components.loading.container
    },
    emptyState: {
      textAlign: 'center',
      padding: `${TavariStyles.spacing['6xl']} ${TavariStyles.spacing.xl}`,
      color: TavariStyles.colors.gray500
    },
    emptyIcon: {
      fontSize: TavariStyles.typography.fontSize['4xl'],
      marginBottom: TavariStyles.spacing.lg
    },
    emptyTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.sm
    },
    emptyText: {
      fontSize: TavariStyles.typography.fontSize.base,
      marginBottom: TavariStyles.spacing.lg
    },
    emptyActions: {
      marginTop: TavariStyles.spacing.xl
    },
    transactionsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.md
    },
    manualRefundButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.warning,
      ...TavariStyles.components.button.sizes.md,
      whiteSpace: 'nowrap'
    }
  };

  return (
    <POSAuthWrapper 
      requiredRoles={['cashier', 'manager', 'owner']}
      requireBusiness={true}
      componentName="RefundsScreen"
    >
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Process Refunds</h2>
          <p style={styles.subtitle}>Search transactions by sale number or customer name, or scan QR codes for quick refunds</p>
        </div>

        <RefundSearchControls
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          isQrScannerActive={isQrScannerActive}
          onToggleQrScanner={handleToggleQrScanner}
          onManualRefund={handleManualRefund}
          loading={loading}
        />

        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        {qrScanResult && (
          <div style={styles.successBanner}>
            QR scan successful! Found transaction: Sale #{qrScanResult.sale_number}
          </div>
        )}

        <div style={styles.content}>
          {renderTransactionsList()}
        </div>

        {/* Barcode/QR Scanner - Uses existing BarcodeScanHandler */}
        {isQrScannerActive && (
          <BarcodeScanHandler
            onScan={handleBarcodeScan}
            disabled={false}
            testId="refunds-qr-scanner"
          />
        )}

        {/* Regular Refund Modal */}
        {showRefundModal && selectedTransaction && (
          <RefundModal
            transaction={selectedTransaction}
            businessSettings={businessSettings}
            selectedBusinessId={auth.selectedBusinessId}
            authUser={auth.authUser}
            onClose={handleCloseRefundModal}
            onRefundCompleted={handleRefundCompleted}
          />
        )}

        {/* Manual Refund Modal */}
        {showManualRefundModal && (
          <ManualRefundModal
            businessSettings={businessSettings}
            selectedBusinessId={auth.selectedBusinessId}
            authUser={auth.authUser}
            onClose={handleCloseManualRefundModal}
            onRefundCompleted={handleRefundCompleted}
          />
        )}
      </div>
    </POSAuthWrapper>
  );
};

export default RefundsScreen;