// screens/POS/RefundsScreen.jsx
// Steps 76-87: Refunds system with transaction lookup, line-item refunds, manager approval
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusinessContext } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';
import { generateReceiptHTML, printReceipt, RECEIPT_TYPES } from '../../helpers/ReceiptBuilder';

const RefundsScreen = () => {
  const { selectedBusinessId } = useBusinessContext();
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('today');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [businessSettings, setBusinessSettings] = useState({});

  useEffect(() => {
    if (selectedBusinessId) {
      loadTransactions();
      loadBusinessSettings();
    }
  }, [selectedBusinessId, dateRange]);

  useEffect(() => {
    if (searchTerm) {
      searchTransactions();
    } else {
      loadTransactions();
    }
  }, [searchTerm]);

  const loadBusinessSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBusinessSettings(data || {});
    } catch (err) {
      console.error('Error loading business settings:', err);
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
          ),
          pos_payments (
            id,
            payment_method,
            amount,
            custom_method_name,
            tip_amount,
            change_given
          )
        `)
        .eq('business_id', selectedBusinessId)
        .eq('payment_status', 'completed')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      if (salesError) throw salesError;

      // Get existing refunds for these sales
      const saleIds = sales.map(sale => sale.id);
      const { data: refunds, error: refundsError } = await supabase
        .from('pos_refunds')
        .select('original_sale_id, total_refunded')
        .in('original_sale_id', saleIds);

      if (refundsError) throw refundsError;

      // Calculate refunded amounts per sale
      const refundAmounts = {};
      refunds.forEach(refund => {
        refundAmounts[refund.original_sale_id] = 
          (refundAmounts[refund.original_sale_id] || 0) + (refund.total_refunded || 0);
      });

      // Add refund info to transactions
      const transactionsWithRefunds = sales.map(sale => ({
        ...sale,
        total_refunded: refundAmounts[sale.id] || 0,
        remaining_refundable: (sale.total || 0) - (refundAmounts[sale.id] || 0)
      }));

      setTransactions(transactionsWithRefunds);
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
          ),
          pos_payments (
            id,
            payment_method,
            amount,
            custom_method_name,
            tip_amount,
            change_given
          )
        `)
        .eq('business_id', selectedBusinessId)
        .eq('payment_status', 'completed')
        .or(`sale_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get refund info for search results
      const saleIds = sales.map(sale => sale.id);
      const { data: refunds } = await supabase
        .from('pos_refunds')
        .select('original_sale_id, total_refunded')
        .in('original_sale_id', saleIds);

      const refundAmounts = {};
      (refunds || []).forEach(refund => {
        refundAmounts[refund.original_sale_id] = 
          (refundAmounts[refund.original_sale_id] || 0) + (refund.total_refunded || 0);
      });

      const transactionsWithRefunds = sales.map(sale => ({
        ...sale,
        total_refunded: refundAmounts[sale.id] || 0,
        remaining_refundable: (sale.total || 0) - (refundAmounts[sale.id] || 0)
      }));

      setTransactions(transactionsWithRefunds);
    } catch (err) {
      console.error('Error searching transactions:', err);
      setError('Failed to search transactions: ' + err.message);
    } finally {
      setLoading(false);
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

  const handleCloseRefundModal = () => {
    setShowRefundModal(false);
    setSelectedTransaction(null);
  };

  const handleRefundCompleted = () => {
    setShowRefundModal(false);
    setSelectedTransaction(null);
    loadTransactions(); // Refresh the list
  };

  const formatCurrency = (amount) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  const getTransactionStatus = (transaction) => {
    if (transaction.remaining_refundable <= 0) {
      return { text: 'Fully Refunded', color: '#dc2626', bgColor: '#fee2e2' };
    } else if (transaction.total_refunded > 0) {
      return { text: 'Partially Refunded', color: '#f59e0b', bgColor: '#fef3c7' };
    } else {
      return { text: 'Refundable', color: '#059669', bgColor: '#d1fae5' };
    }
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
            {searchTerm ? 'Try a different search term' : 'No transactions for the selected time period'}
          </div>
        </div>
      );
    }

    return (
      <div style={styles.transactionsList}>
        {transactions.map(transaction => {
          const status = getTransactionStatus(transaction);
          
          return (
            <div 
              key={transaction.id} 
              style={styles.transactionCard}
              onClick={() => handleSelectTransaction(transaction)}
            >
              <div style={styles.transactionHeader}>
                <div style={styles.transactionInfo}>
                  <div style={styles.saleNumber}>
                    Sale #{transaction.sale_number}
                  </div>
                  <div style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleString()}
                  </div>
                  {transaction.customer_name && (
                    <div style={styles.customerName}>
                      👤 {transaction.customer_name}
                    </div>
                  )}
                </div>
                
                <div style={styles.transactionAmounts}>
                  <div style={styles.originalAmount}>
                    Original: {formatCurrency(transaction.total)}
                  </div>
                  {transaction.total_refunded > 0 && (
                    <div style={styles.refundedAmount}>
                      Refunded: {formatCurrency(transaction.total_refunded)}
                    </div>
                  )}
                  <div style={styles.remainingAmount}>
                    Remaining: {formatCurrency(transaction.remaining_refundable)}
                  </div>
                </div>
              </div>
              
              <div style={styles.transactionFooter}>
                <div style={styles.itemCount}>
                  {transaction.pos_sale_items?.length || 0} items
                </div>
                
                <div style={{
                  ...styles.statusBadge,
                  color: status.color,
                  backgroundColor: status.bgColor
                }}>
                  {status.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Process Refunds</h2>
        <p>Search and process refunds for completed transactions</p>
      </div>

      <div style={styles.controls}>
        <div style={styles.searchSection}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by sale number or customer name..."
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.dateFilter}>
          <label style={styles.filterLabel}>Time Period:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={styles.select}
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      <div style={styles.content}>
        {renderTransactionsList()}
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedTransaction && (
        <RefundModal
          transaction={selectedTransaction}
          businessSettings={businessSettings}
          onClose={handleCloseRefundModal}
          onRefundCompleted={handleRefundCompleted}
        />
      )}
    </div>
  );
};

// RefundModal Component (Steps 77-87)
const RefundModal = ({ transaction, businessSettings, onClose, onRefundCompleted }) => {
  const { selectedBusinessId } = useBusinessContext();
  
  const [refundItems, setRefundItems] = useState([]);
  const [refundType, setRefundType] = useState('full'); // 'full' or 'partial'
  const [refundMethod, setRefundMethod] = useState('cash');
  const [customRefundMethod, setCustomRefundMethod] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [showManagerOverride, setShowManagerOverride] = useState(true);
  const [restockItems, setRestockItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize refund items with full quantities
    if (transaction.pos_sale_items) {
      const items = transaction.pos_sale_items.map(item => ({
        ...item,
        refund_quantity: item.quantity,
        refund_amount: item.total_price
      }));
      setRefundItems(items);
      
      // Initialize restock options
      const restockDefaults = {};
      items.forEach(item => {
        restockDefaults[item.id] = true; // Default to restocking
      });
      setRestockItems(restockDefaults);
    }
  }, [transaction]);

  const validateManagerPin = async (pin) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('business_id', selectedBusinessId)
        .eq('role', 'manager')
        .eq('active', true);

      if (error || !data?.length) return false;

      const managerIds = data.map(r => r.user_id);
      const { data: managers } = await supabase
        .from('users')
        .select('id, pin')
        .in('id', managerIds);

      return (managers || []).some(m => String(m.pin || '') === String(pin));
    } catch (err) {
      console.error('Manager PIN validation error:', err);
      return false;
    }
  };

  const handleItemQuantityChange = (itemId, newQuantity) => {
    const item = transaction.pos_sale_items.find(i => i.id === itemId);
    if (!item) return;

    const maxQuantity = item.quantity;
    const validQuantity = Math.max(0, Math.min(newQuantity, maxQuantity));
    const refundAmount = (item.unit_price * validQuantity);

    setRefundItems(prev => prev.map(refundItem => 
      refundItem.id === itemId 
        ? { ...refundItem, refund_quantity: validQuantity, refund_amount: refundAmount }
        : refundItem
    ));
  };

  const handleRestockToggle = (itemId) => {
    setRestockItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const calculateRefundTotal = () => {
    return refundItems.reduce((total, item) => total + (item.refund_amount || 0), 0);
  };

  const handleProcessRefund = async () => {
    if (!refundReason.trim()) {
      setError('Please provide a reason for the refund');
      return;
    }

    const refundTotal = calculateRefundTotal();
    if (refundTotal <= 0) {
      setError('Refund amount must be greater than $0.00');
      return;
    }

    // Validate manager PIN
    if (!managerPin) {
      setError('Manager PIN is required for all refunds');
      return;
    }

    const isValidManagerPin = await validateManagerPin(managerPin);
    if (!isValidManagerPin) {
      setError('Invalid manager PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Create refund record
      const refundData = {
        business_id: selectedBusinessId,
        original_sale_id: transaction.id,
        refunded_by: currentUserId,
        refund_type: refundType,
        refund_method: refundMethod === 'custom' ? customRefundMethod : refundMethod,
        total_refunded: refundTotal,
        reason: refundReason.trim(),
        manager_override: true,
        manager_id: currentUserId, // Would need to get actual manager ID from PIN
        created_at: new Date().toISOString()
      };

      const { data: refund, error: refundError } = await supabase
        .from('pos_refunds')
        .insert(refundData)
        .select()
        .single();

      if (refundError) throw refundError;

      // Update inventory for restocked items
      for (const item of refundItems) {
        if (item.refund_quantity > 0 && restockItems[item.id] && item.inventory_id) {
          const { error: inventoryError } = await supabase
            .from('pos_inventory')
            .update({ 
              stock_quantity: supabase.raw(`stock_quantity + ${item.refund_quantity}`)
            })
            .eq('id', item.inventory_id)
            .eq('track_stock', true);

          if (inventoryError) {
            console.warn('Inventory update failed:', inventoryError);
          }
        }
      }

      // Generate and print refund receipt
      const refundReceiptData = {
        ...transaction,
        refund_id: refund.id,
        refund_amount: refundTotal,
        refund_reason: refundReason,
        refund_method: refundData.refund_method,
        refund_items: refundItems.filter(item => item.refund_quantity > 0),
        refunded_at: new Date().toISOString()
      };

      const refundReceiptHTML = generateReceiptHTML(
        refundReceiptData, 
        RECEIPT_TYPES.REFUND, 
        businessSettings,
        { 
          refundReason: refundReason,
          managerOverride: true,
          requiresSignature: true
        }
      );
      
      printReceipt(refundReceiptHTML);

      await logAction({
        action: 'refund_processed',
        context: 'RefundModal',
        metadata: {
          refund_id: refund.id,
          original_sale_id: transaction.id,
          sale_number: transaction.sale_number,
          refund_amount: refundTotal,
          refund_type: refundType,
          refund_method: refundData.refund_method,
          refund_reason: refundReason,
          items_refunded: refundItems.filter(item => item.refund_quantity > 0).length,
          manager_approved: true
        }
      });

      alert('Refund processed successfully!');
      onRefundCompleted();

    } catch (err) {
      console.error('Refund processing error:', err);
      setError('Failed to process refund: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3>Process Refund - Sale #{transaction.sale_number}</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.modalBody}>
          {/* Transaction Summary */}
          <div style={styles.section}>
            <h4>Transaction Details</h4>
            <div style={styles.transactionSummary}>
              <div>Original Total: {formatCurrency(transaction.total)}</div>
              <div>Date: {new Date(transaction.created_at).toLocaleString()}</div>
              {transaction.customer_name && <div>Customer: {transaction.customer_name}</div>}
            </div>
          </div>

          {/* Refund Type */}
          <div style={styles.section}>
            <h4>Refund Type</h4>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="full"
                  checked={refundType === 'full'}
                  onChange={(e) => setRefundType(e.target.value)}
                />
                Full Refund
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="partial"
                  checked={refundType === 'partial'}
                  onChange={(e) => setRefundType(e.target.value)}
                />
                Partial Refund
              </label>
            </div>
          </div>

          {/* Items to Refund */}
          <div style={styles.section}>
            <h4>Items to Refund</h4>
            <div style={styles.refundItemsList}>
              {transaction.pos_sale_items?.map(item => {
                const refundItem = refundItems.find(ri => ri.id === item.id) || {};
                
                return (
                  <div key={item.id} style={styles.refundItem}>
                    <div style={styles.itemInfo}>
                      <div style={styles.itemName}>{item.name}</div>
                      <div style={styles.itemDetails}>
                        Original: {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                      </div>
                    </div>
                    
                    <div style={styles.refundControls}>
                      <div style={styles.quantityControl}>
                        <label>Quantity:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={refundItem.refund_quantity || 0}
                          onChange={(e) => handleItemQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          style={styles.quantityInput}
                        />
                        <span>of {item.quantity}</span>
                      </div>
                      
                      <div style={styles.restockControl}>
                        <label>
                          <input
                            type="checkbox"
                            checked={restockItems[item.id] || false}
                            onChange={() => handleRestockToggle(item.id)}
                          />
                          Restock
                        </label>
                      </div>
                      
                      <div style={styles.refundAmount}>
                        {formatCurrency(refundItem.refund_amount || 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund Method */}
          <div style={styles.section}>
            <h4>Refund Method</h4>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
              style={styles.select}
            >
              <option value="cash">Cash</option>
              <option value="card">Credit Card</option>
              <option value="loyalty">Store Credit</option>
              <option value="custom">Custom Method</option>
            </select>
            
            {refundMethod === 'custom' && (
              <input
                type="text"
                value={customRefundMethod}
                onChange={(e) => setCustomRefundMethod(e.target.value)}
                placeholder="Enter custom refund method"
                style={styles.input}
              />
            )}
          </div>

          {/* Refund Reason */}
          <div style={styles.section}>
            <h4>Refund Reason *</h4>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Enter reason for refund (required)"
              rows="3"
              style={styles.textarea}
            />
          </div>

          {/* Manager PIN */}
          <div style={styles.section}>
            <h4>Manager Authorization *</h4>
            <input
              type="password"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              placeholder="Manager PIN required"
              style={styles.input}
            />
          </div>

          {/* Refund Total */}
          <div style={styles.refundTotal}>
            <div style={styles.totalLabel}>Refund Total:</div>
            <div style={styles.totalAmount}>{formatCurrency(calculateRefundTotal())}</div>
          </div>

          {error && (
            <div style={styles.errorMessage}>{error}</div>
          )}
        </div>

        <div style={styles.modalActions}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            style={styles.processButton}
            onClick={handleProcessRefund}
            disabled={loading || calculateRefundTotal() <= 0}
          >
            {loading ? 'Processing...' : `Process Refund ${formatCurrency(calculateRefundTotal())}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const formatCurrency = (amount) => {
  return `$${(amount || 0).toFixed(2)}`;
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
  controls: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    alignItems: 'center'
  },
  searchSection: {
    flex: 1
  },
  searchInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px'
  },
  dateFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151'
  },
  select: {
    padding: '10px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '14px'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px'
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
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  emptyText: {
    fontSize: '14px'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  transactionInfo: {
    flex: 1
  },
  saleNumber: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  transactionDate: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  customerName: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500'
  },
  transactionAmounts: {
    textAlign: 'right',
    minWidth: '150px'
  },
  originalAmount: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  refundedAmount: {
    fontSize: '14px',
    color: '#dc2626',
    marginBottom: '4px'
  },
  remainingAmount: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: '600'
  },
  transactionFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemCount: {
    fontSize: '14px',
    color: '#6b7280'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '2px solid #008080'
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  modalBody: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto'
  },
  section: {
    marginBottom: '25px'
  },
  transactionSummary: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  radioGroup: {
    display: 'flex',
    gap: '20px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  refundItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  refundItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  itemDetails: {
    fontSize: '14px',
    color: '#6b7280'
  },
  refundControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  quantityInput: {
    width: '60px',
    padding: '4px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    textAlign: 'center'
  },
  restockControl: {
    fontSize: '14px'
  },
  refundAmount: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#008080',
    minWidth: '80px',
    textAlign: 'right'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    marginTop: '8px'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  refundTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#008080',
    color: 'white',
    borderRadius: '8px',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px'
  },
  totalLabel: {},
  totalAmount: {},
  errorMessage: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    padding: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    flex: 1,
    padding: '15px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  processButton: {
    flex: 2,
    padding: '15px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default RefundsScreen;