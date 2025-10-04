// src/screens/POS/POSReceipts.jsx - CORRECTED FOR ACTUAL DATABASE STRUCTURE
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { TavariStyles } from '../../utils/TavariStyles';
import TransactionsModal from '../../components/POS/TransactionsModal';
import { generateReceiptHTML, printReceipt, RECEIPT_TYPES } from '../../helpers/ReceiptBuilder';
import { logAction } from '../../helpers/posAudit';
import dayjs from 'dayjs';

const POSReceipts = () => {
  const navigate = useNavigate();
  
  // Authentication
  const auth = usePOSAuth({
    requiredRoles: ['cashier', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'POSReceipts'
  });

  // Tax calculations for receipt details
  const taxCalc = useTaxCalculations(auth.selectedBusinessId);

  // Component state
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [businessSettings, setBusinessSettings] = useState(null);

  // Load receipts when authentication is ready
  useEffect(() => {
    if (auth.selectedBusinessId && auth.authUser) {
      fetchReceipts();
      loadBusinessSettings();
    }
  }, [auth.selectedBusinessId, auth.authUser, dateFilter]);

  const loadBusinessSettings = async () => {
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', auth.selectedBusinessId)
        .single();
        
      if (error) throw error;
      
      setBusinessSettings(business);
    } catch (err) {
      console.error('Error loading business settings:', err);
      setBusinessSettings({
        name: 'Business Name',
        business_address: '123 Main St',
        business_city: 'City',
        business_state: 'ON',
        business_postal: 'N1A 1A1'
      });
    }
  };

  const fetchReceipts = async () => {
    if (!auth.selectedBusinessId) return;

    setLoading(true);
    setError(null);
    try {
      console.log(`POSReceipts: Loading receipts for business ${auth.selectedBusinessId}`);

      // Calculate date range based on filter
      let startDate = null;
      
      if (dateFilter === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateFilter === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // Query pos_sales with actual column names
      let query = supabase
        .from('pos_sales')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .not('total', 'is', null)
        .gt('total', 0)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: salesData, error: salesError } = await query.limit(100);

      if (salesError) throw salesError;

      console.log(`POSReceipts: Found ${salesData?.length || 0} sales`);

      // Get related data separately
      const processedReceipts = await Promise.all((salesData || []).map(async (sale) => {
        // Get sale items
        const { data: items } = await supabase
          .from('pos_sale_items')
          .select('*')
          .eq('sale_id', sale.id);

        // Get payments
        const { data: payments } = await supabase
          .from('pos_payments')
          .select('*')
          .eq('sale_id', sale.id);

        // Get cashier info
        const { data: cashier } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', sale.user_id)
          .single();

        return {
          id: sale.id,
          sale_id: sale.id,
          receipt_number: sale.sale_number,
          created_at: sale.created_at,
          total: sale.total,
          subtotal: sale.subtotal,
          tax_amount: sale.tax,
          discount_amount: sale.discount,
          loyalty_redemption: sale.loyalty_discount,
          tip_amount: sale.tip_amount || 0,
          change_given: sale.change_given || 0,
          receipt_type: sale.receipt_type || 'Standard',
          email_sent_to: sale.customer_email,
          customer_name: sale.customer_name || 'Walk-in',
          customer_phone: sale.customer_phone,
          customer_email: sale.customer_email,
          cashier_name: cashier?.full_name || cashier?.email || 'Unknown',
          items: (items || []).map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.unit_price,
            sku: item.sku,
            modifiers: item.modifiers || []
          })),
          payment_methods: (payments || []).map(payment => ({
            method: payment.payment_method,
            payment_method: payment.payment_method,
            amount: payment.amount,
            custom_method_name: payment.custom_method_name
          })),
          payments: (payments || []).map(payment => ({
            method: payment.payment_method,
            payment_method: payment.payment_method,
            amount: payment.amount,
            custom_method_name: payment.custom_method_name
          })),
          status: 'completed',
          aggregated_taxes: sale.aggregated_taxes || {},
          aggregated_rebates: sale.aggregated_rebates || {}
        };
      }));

      setReceipts(processedReceipts);

      // Log successful load
      await logAction({
        action: 'receipts_loaded',
        context: 'POSReceipts',
        metadata: {
          business_id: auth.selectedBusinessId,
          receipts_count: processedReceipts.length,
          date_filter: dateFilter,
          user_role: auth.userRole
        }
      });

    } catch (err) {
      console.error('POSReceipts: Error fetching receipts:', err);
      setError('Error loading receipts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);

    logAction({
      action: 'receipt_viewed',
      context: 'POSReceipts',
      metadata: {
        business_id: auth.selectedBusinessId,
        receipt_id: receipt.id,
        receipt_number: receipt.receipt_number,
        user_role: auth.userRole
      }
    });
  };

  const closeReceiptModal = () => {
    setSelectedReceipt(null);
    setShowReceiptModal(false);
  };

  const handleTransactionFound = (action, transaction) => {
    console.log(`POSReceipts: Transaction action ${action} for receipt ${transaction.receiptNumber}`);
    
    if (action === 'reprint') {
      handleReprintReceipt(transaction);
    } else if (action === 'refund') {
      navigate('/dashboard/pos/refunds', {
        state: { transaction }
      });
    }
  };

  const handleReprintReceipt = async (receipt) => {
    if (!businessSettings) {
      alert('Business settings not loaded');
      return;
    }

    try {
      // Format business settings for ReceiptBuilder
      const formattedBusinessSettings = {
        business_name: businessSettings.name,
        business_address: businessSettings.business_address || businessSettings.address,
        business_city: businessSettings.business_city || businessSettings.city,
        business_state: businessSettings.business_state || businessSettings.state || 'ON',
        business_postal: businessSettings.business_postal || businessSettings.postal_code,
        business_phone: businessSettings.business_phone || businessSettings.phone,
        business_email: businessSettings.business_email || businessSettings.email,
        tax_number: businessSettings.tax_number || businessSettings.hst_number,
        timezone: businessSettings.timezone || 'America/Toronto',
        loyalty_mode: businessSettings.loyalty_mode || 'points',
        earn_rate_percentage: businessSettings.earn_rate_percentage || 3
      };

      // Format sale data for ReceiptBuilder
      const formattedSaleData = {
        sale_number: receipt.receipt_number || receipt.sale_number || 'N/A',
        created_at: receipt.created_at || new Date().toISOString(),
        items: receipt.items || [],
        subtotal: receipt.subtotal || 0,
        final_total: receipt.total || receipt.final_total || 0,
        tax_amount: receipt.tax_amount || receipt.final_tax_amount || 0,
        payments: receipt.payment_methods || receipt.payments || [],
        tip_amount: receipt.tip_amount || 0,
        change_given: receipt.change_given || 0,
        discount_amount: receipt.discount_amount || 0,
        loyalty_redemption: receipt.loyalty_redemption || 0,
        aggregated_taxes: receipt.aggregated_taxes || {},
        aggregated_rebates: receipt.aggregated_rebates || {},
        loyaltyCustomer: receipt.customer_name && receipt.customer_name !== 'Walk-in' ? {
          customer_name: receipt.customer_name,
          customer_email: receipt.customer_email,
          customer_phone: receipt.customer_phone,
          balance: 0
        } : null
      };

      // Generate and print receipt
      const receiptHTML = generateReceiptHTML(
        formattedSaleData, 
        RECEIPT_TYPES.REPRINT, 
        formattedBusinessSettings,
        { reprintReason: 'Manager/Cashier Request' }
      );

      printReceipt(receiptHTML);

      await logAction({
        action: 'receipt_reprinted',
        context: 'POSReceipts',
        metadata: {
          business_id: auth.selectedBusinessId,
          transaction_id: receipt.id,
          receipt_number: receipt.receipt_number,
          reprinted_by: auth.authUser?.id,
          user_role: auth.userRole
        }
      });

      alert(`Receipt ${receipt.receipt_number} sent to printer`);
      
    } catch (err) {
      console.error('POSReceipts: Error reprinting receipt:', err);
      setError('Failed to reprint receipt: ' + err.message);
    }
  };

  // Calculate tax breakdown for receipt if items are available
  const calculateReceiptTaxDetails = (receipt) => {
    if (!receipt.items || !Array.isArray(receipt.items) || receipt.items.length === 0) {
      return {
        totalTax: 0,
        aggregatedTaxes: {},
        aggregatedRebates: {},
        itemTaxDetails: []
      };
    }

    return taxCalc.calculateTotalTax(
      receipt.items,
      receipt.discount_amount || 0,
      receipt.loyalty_redemption || 0
    );
  };

  // Filter receipts based on search and filters
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = searchTerm === '' || 
      receipt.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.cashier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || 
      (filterType === 'email' && receipt.email_sent_to) ||
      (filterType === 'cash' && receipt.payments?.some(p => p.payment_method === 'cash')) ||
      (filterType === 'card' && receipt.payments?.some(p => p.payment_method === 'card'));
    
    return matchesSearch && matchesType;
  });

  // Styles (keeping existing styles object - truncated for brevity)
  const styles = {
    container: { ...TavariStyles.layout.container },
    header: { ...TavariStyles.layout.flexBetween, marginBottom: TavariStyles.spacing.xl, paddingBottom: TavariStyles.spacing.lg, borderBottom: `2px solid ${TavariStyles.colors.primary}` },
    headerContent: { flex: 1 },
    title: { fontSize: TavariStyles.typography.fontSize['2xl'], fontWeight: TavariStyles.typography.fontWeight.bold, color: TavariStyles.colors.gray800, margin: 0 },
    subtitle: { fontSize: TavariStyles.typography.fontSize.base, color: TavariStyles.colors.gray600, margin: 0 },
    headerActions: { display: 'flex', gap: TavariStyles.spacing.md },
    searchButton: { ...TavariStyles.components.button.base, ...TavariStyles.components.button.variants.primary, ...TavariStyles.components.button.sizes.md },
    refreshButton: { ...TavariStyles.components.button.base, ...TavariStyles.components.button.variants.secondary, ...TavariStyles.components.button.sizes.md },
    controls: { display: 'flex', gap: TavariStyles.spacing.lg, marginBottom: TavariStyles.spacing.xl, flexWrap: 'wrap', alignItems: 'center' },
    searchInput: { ...TavariStyles.components.form.input, flex: 1, minWidth: '250px' },
    filterSelect: { ...TavariStyles.components.form.select, minWidth: '150px' },
    statsCard: { ...TavariStyles.layout.card, padding: TavariStyles.spacing.lg, backgroundColor: TavariStyles.colors.infoBg, border: `1px solid ${TavariStyles.colors.info}`, borderRadius: TavariStyles.borderRadius.lg },
    statsText: { fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.infoText, fontWeight: TavariStyles.typography.fontWeight.semibold },
    errorBanner: { ...TavariStyles.components.banner.base, ...TavariStyles.components.banner.variants.error, marginBottom: TavariStyles.spacing.xl },
    content: { flex: 1, ...TavariStyles.layout.card, padding: TavariStyles.spacing.xl, overflow: 'auto' },
    tableContainer: { ...TavariStyles.components.table.container },
    table: { ...TavariStyles.components.table.table },
    headerRow: { ...TavariStyles.components.table.headerRow },
    th: { ...TavariStyles.components.table.th },
    row: { ...TavariStyles.components.table.row, cursor: 'pointer' },
    td: { ...TavariStyles.components.table.td },
    emptyCell: { padding: TavariStyles.spacing['4xl'], textAlign: 'center', color: TavariStyles.colors.gray500, fontStyle: 'italic' },
    viewButton: { ...TavariStyles.components.button.base, ...TavariStyles.components.button.variants.primary, ...TavariStyles.components.button.sizes.sm },
    loading: { ...TavariStyles.components.loading.container },
    modal: { ...TavariStyles.components.modal.overlay },
    modalContent: { ...TavariStyles.components.modal.content, maxWidth: '800px', width: '90%' },
    modalHeader: { ...TavariStyles.components.modal.header },
    modalTitle: { fontSize: TavariStyles.typography.fontSize.xl, fontWeight: TavariStyles.typography.fontWeight.bold, color: TavariStyles.colors.gray800, margin: 0 },
    closeButton: { backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: TavariStyles.colors.gray500, padding: 0, width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalBody: { ...TavariStyles.components.modal.body },
    receiptDetails: { marginBottom: TavariStyles.spacing.xl },
    detailRow: { padding: `${TavariStyles.spacing.sm} 0`, borderBottom: `1px solid ${TavariStyles.colors.gray100}`, fontSize: TavariStyles.typography.fontSize.base, display: 'flex', justifyContent: 'space-between' },
    detailLabel: { fontWeight: TavariStyles.typography.fontWeight.semibold, color: TavariStyles.colors.gray700 },
    detailValue: { color: TavariStyles.colors.gray600 },
    itemsSection: { marginBottom: TavariStyles.spacing.xl },
    sectionTitle: { fontSize: TavariStyles.typography.fontSize.lg, fontWeight: TavariStyles.typography.fontWeight.bold, color: TavariStyles.colors.gray800, marginBottom: TavariStyles.spacing.md },
    itemsContainer: { marginTop: TavariStyles.spacing.md },
    itemsTable: { width: '100%', borderCollapse: 'collapse', fontSize: TavariStyles.typography.fontSize.sm },
    itemTh: { backgroundColor: TavariStyles.colors.gray50, padding: TavariStyles.spacing.md, textAlign: 'left', fontWeight: TavariStyles.typography.fontWeight.semibold, borderBottom: `1px solid ${TavariStyles.colors.gray200}`, color: TavariStyles.colors.gray700 },
    itemTd: { padding: TavariStyles.spacing.md, borderBottom: `1px solid ${TavariStyles.colors.gray100}` },
    noItems: { textAlign: 'center', color: TavariStyles.colors.gray500, fontStyle: 'italic', padding: TavariStyles.spacing.xl },
    modalFooter: { ...TavariStyles.components.modal.footer },
    closeModalButton: { ...TavariStyles.components.button.base, ...TavariStyles.components.button.variants.secondary, ...TavariStyles.components.button.sizes.md },
    reprintButton: { ...TavariStyles.components.button.base, ...TavariStyles.components.button.variants.primary, ...TavariStyles.components.button.sizes.md },
    summarySection: { marginTop: TavariStyles.spacing.xl, paddingTop: TavariStyles.spacing.lg, borderTop: `2px solid ${TavariStyles.colors.gray200}` },
    summaryRow: { display: 'flex', justifyContent: 'space-between', margin: `${TavariStyles.spacing.xs} 0`, fontSize: TavariStyles.typography.fontSize.base },
    totalRow: { display: 'flex', justifyContent: 'space-between', margin: `${TavariStyles.spacing.md} 0 0 0`, fontSize: TavariStyles.typography.fontSize.lg, fontWeight: TavariStyles.typography.fontWeight.bold, paddingTop: TavariStyles.spacing.md, borderTop: `2px solid ${TavariStyles.colors.gray800}`, color: TavariStyles.colors.gray800 },
    receiptStatus: { fontSize: TavariStyles.typography.fontSize.xs, fontWeight: TavariStyles.typography.fontWeight.bold, padding: '2px 8px', borderRadius: TavariStyles.borderRadius.sm, textTransform: 'uppercase' },
    statusCompleted: { backgroundColor: TavariStyles.colors.successBg, color: TavariStyles.colors.successText }
  };

  const stats = {
    total: filteredReceipts.length,
    totalValue: filteredReceipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0),
    emailed: filteredReceipts.filter(r => r.email_sent_to).length
  };

  const renderReceiptContent = () => {
    if (loading) {
      return (
        <div style={styles.loading}>
          <div style={TavariStyles.components.loading.spinner}></div>
          <div>Loading receipts...</div>
          <style>{TavariStyles.keyframes.spin}</style>
        </div>
      );
    }

    return (
      <div style={styles.content}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Receipt #</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Cashier</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={styles.emptyCell}>
                    {searchTerm || filterType !== 'all' 
                      ? 'No receipts match your search criteria' 
                      : 'No receipts found for the selected date range'
                    }
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt, index) => (
                  <tr 
                    key={receipt.id} 
                    style={styles.row}
                    onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = TavariStyles.colors.gray50}
                    onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = index % 2 === 0 ? TavariStyles.colors.white : TavariStyles.colors.gray25}
                  >
                    <td style={styles.td}>
                      <span style={{ fontFamily: TavariStyles.typography.fontFamilyMono }}>
                        {receipt.receipt_number || `R${receipt.id.slice(-6)}`}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {dayjs(receipt.created_at).format('MMM D, h:mm A')}
                    </td>
                    <td style={styles.td}>
                      {receipt.customer_name}
                    </td>
                    <td style={styles.td}>
                      {receipt.cashier_name}
                    </td>
                    <td style={styles.td}>
                      ${parseFloat(receipt.total).toFixed(2)}
                    </td>
                    <td style={styles.td}>
                      <button 
                        style={styles.viewButton} 
                        onClick={() => viewReceipt(receipt)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <POSAuthWrapper
      requiredRoles={['cashier', 'manager', 'owner']}
      requireBusiness={true}
      componentName="POS Receipts"
    >
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>POS Receipts</h1>
            <p style={styles.subtitle}>
              View and manage transaction receipts - Search, reprint, and process refunds
            </p>
          </div>
          <div style={styles.headerActions}>
            <button
              style={styles.searchButton}
              onClick={() => setShowTransactionsModal(true)}
            >
              Quick Search
            </button>
            <button
              style={styles.refreshButton}
              onClick={fetchReceipts}
            >
              Refresh
            </button>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.controls}>
          <input
            type="text"
            placeholder="Search by receipt #, customer, or cashier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Receipts</option>
            <option value="email">Emailed</option>
            <option value="cash">Cash Payment</option>
            <option value="card">Card Payment</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          
          <div style={styles.statsCard}>
            <div style={styles.statsText}>
              {stats.total} receipts | ${stats.totalValue.toFixed(2)} total
            </div>
          </div>
        </div>

        {renderReceiptContent()}

        <TransactionsModal
          isOpen={showTransactionsModal}
          onClose={() => setShowTransactionsModal(false)}
          onTransactionFound={handleTransactionFound}
          title="Search Receipts & Transactions"
        />

        {selectedReceipt && showReceiptModal && (
          <div style={styles.modal} onClick={closeReceiptModal}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>
                  Receipt {selectedReceipt.receipt_number || selectedReceipt.id.slice(-8)}
                </h3>
                <button 
                  style={styles.closeButton} 
                  onClick={closeReceiptModal}
                >
                  ×
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={styles.receiptDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Receipt Number:</span>
                    <span style={styles.detailValue}>{selectedReceipt.receipt_number}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Date:</span>
                    <span style={styles.detailValue}>
                      {dayjs(selectedReceipt.created_at).format('MMMM D, YYYY h:mm A')}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Customer:</span>
                    <span style={styles.detailValue}>{selectedReceipt.customer_name}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Cashier:</span>
                    <span style={styles.detailValue}>{selectedReceipt.cashier_name}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Type:</span>
                    <span style={styles.detailValue}>{selectedReceipt.receipt_type}</span>
                  </div>
                  {selectedReceipt.email_sent_to && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Email Sent To:</span>
                      <span style={styles.detailValue}>{selectedReceipt.email_sent_to}</span>
                    </div>
                  )}
                </div>

                <div style={styles.itemsSection}>
                  <h4 style={styles.sectionTitle}>Items ({selectedReceipt.items?.length || 0})</h4>
                  <div style={styles.itemsContainer}>
                    {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                      <table style={styles.itemsTable}>
                        <thead>
                          <tr>
                            <th style={styles.itemTh}>Item</th>
                            <th style={styles.itemTh}>SKU</th>
                            <th style={styles.itemTh}>Qty</th>
                            <th style={styles.itemTh}>Price</th>
                            <th style={styles.itemTh}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReceipt.items.map((item, index) => (
                            <tr key={index}>
                              <td style={styles.itemTd}>{item.name}</td>
                              <td style={styles.itemTd}>{item.sku || 'N/A'}</td>
                              <td style={styles.itemTd}>{item.quantity}</td>
                              <td style={styles.itemTd}>${item.price?.toFixed(2)}</td>
                              <td style={styles.itemTd}>
                                ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={styles.noItems}>No item details available</div>
                    )}
                  </div>
                </div>

                <div style={styles.summarySection}>
                  <h4 style={styles.sectionTitle}>Payment Summary</h4>
                  
                  {selectedReceipt.subtotal && (
                    <div style={styles.summaryRow}>
                      <span>Subtotal:</span>
                      <span>${parseFloat(selectedReceipt.subtotal).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {selectedReceipt.discount_amount && parseFloat(selectedReceipt.discount_amount) > 0 && (
                    <div style={styles.summaryRow}>
                      <span>Discount:</span>
                      <span>-${parseFloat(selectedReceipt.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {selectedReceipt.loyalty_redemption && parseFloat(selectedReceipt.loyalty_redemption) > 0 && (
                    <div style={styles.summaryRow}>
                      <span>Loyalty Redemption:</span>
                      <span>-${parseFloat(selectedReceipt.loyalty_redemption).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {selectedReceipt.tax_amount && (
                    <div style={styles.summaryRow}>
                      <span>Total Tax:</span>
                      <span>${parseFloat(selectedReceipt.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div style={styles.totalRow}>
                    <span>Total:</span>
                    <span>${parseFloat(selectedReceipt.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div style={styles.modalFooter}>
                <button 
                  style={styles.reprintButton} 
                  onClick={() => handleReprintReceipt(selectedReceipt)}
                >
                  Reprint Receipt
                </button>
                <button 
                  style={styles.closeModalButton} 
                  onClick={closeReceiptModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </POSAuthWrapper>
  );
};

export default POSReceipts;