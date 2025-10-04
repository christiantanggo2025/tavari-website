// components/POS/POSRefundComponents/RefundModal.jsx - Transaction Refund Modal Component
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { logAction } from '../../../helpers/posAudit';
import { generateReceiptHTML, printReceipt, RECEIPT_TYPES } from '../../../helpers/ReceiptBuilder';

// Foundation Components
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import TavariCheckbox from '../../UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const RefundModal = ({ 
  transaction, 
  businessSettings, 
  selectedBusinessId, 
  authUser, 
  onClose, 
  onRefundCompleted 
}) => {
  console.log('RefundModal rendered with transaction:', transaction);
  
  const [refundItems, setRefundItems] = useState([]);
  const [refundType, setRefundType] = useState('partial');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [customRefundMethod, setCustomRefundMethod] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [restockItems, setRestockItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const auth = usePOSAuth({
    requiredRoles: ['cashier', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'RefundModal'
  });

  useEffect(() => {
    console.log('RefundModal useEffect running with transaction:', transaction);
    
    // Initialize refund items with full quantities using simple tax distribution
    if (transaction.pos_sale_items) {
      const transactionTax = parseFloat(transaction.tax || 0);
      const transactionSubtotal = parseFloat(transaction.subtotal || 0);
      
      console.log('Tax calculation inputs:', {
        transactionTax,
        transactionSubtotal,
        itemCount: transaction.pos_sale_items.length
      });
      
      const items = transaction.pos_sale_items.map(item => {
        const itemSubtotal = parseFloat(item.total_price || 0);
        
        // For single item transactions, give all tax to that item
        // For multiple items, distribute proportionally
        let itemTax;
        if (transaction.pos_sale_items.length === 1) {
          itemTax = transactionTax;
        } else {
          const itemProportion = transactionSubtotal > 0 ? (itemSubtotal / transactionSubtotal) : 0;
          itemTax = transactionTax * itemProportion;
        }
        
        console.log('Item calculation:', {
          name: item.name,
          itemSubtotal,
          itemTax,
          total: itemSubtotal + itemTax
        });
        
        return {
          ...item,
          refund_quantity: item.quantity,
          refund_subtotal: itemSubtotal,
          refund_tax: itemTax,
          refund_amount: itemSubtotal + itemTax,
          tax_breakdown: { 'Tax': itemTax },
          rebate_breakdown: {},
          is_exempt: false
        };
      });
      
      console.log('Setting refund items:', items);
      setRefundItems(items);
      
      // Initialize restock options
      const restockDefaults = {};
      items.forEach(item => {
        restockDefaults[item.id] = true;
      });
      setRestockItems(restockDefaults);

      // Set refund type based on whether all items are being refunded
      const totalItemsBeingRefunded = items.reduce((sum, item) => sum + item.refund_quantity, 0);
      const totalOriginalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalItemsBeingRefunded === totalOriginalItems) {
        setRefundType('full');
      } else {
        setRefundType('partial');
      }
    }
  }, [transaction]);

  const handleItemQuantityChange = (itemId, newQuantity) => {
    const item = transaction.pos_sale_items.find(i => i.id === itemId);
    if (!item) return;

    const maxQuantity = item.quantity;
    const validQuantity = Math.max(0, Math.min(newQuantity, maxQuantity));
    
    const transactionTax = parseFloat(transaction.tax || 0);
    const transactionSubtotal = parseFloat(transaction.subtotal || 0);
    
    setRefundItems(prev => prev.map(refundItem => {
      if (refundItem.id === itemId) {
        // Calculate proportional amounts for this item
        const quantityRatio = validQuantity / item.quantity;
        const itemSubtotal = parseFloat(item.total_price || 0) * quantityRatio;
        
        let itemTax;
        if (transaction.pos_sale_items.length === 1) {
          itemTax = transactionTax * quantityRatio;
        } else {
          const itemProportion = transactionSubtotal > 0 ? (parseFloat(item.total_price || 0) / transactionSubtotal) : 0;
          itemTax = transactionTax * itemProportion * quantityRatio;
        }
        
        return {
          ...refundItem,
          refund_quantity: validQuantity,
          refund_subtotal: itemSubtotal,
          refund_tax: itemTax,
          refund_amount: itemSubtotal + itemTax,
          tax_breakdown: { 'Tax': itemTax }
        };
      }
      return refundItem;
    }));

    // Update refund type based on quantities
    setTimeout(() => {
      const allItems = transaction.pos_sale_items;
      const currentRefundItems = refundItems.map(ri => 
        ri.id === itemId ? { ...ri, refund_quantity: validQuantity } : ri
      );
      
      const totalItemsBeingRefunded = currentRefundItems.reduce((sum, item) => sum + item.refund_quantity, 0);
      const totalOriginalItems = allItems.reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalItemsBeingRefunded === totalOriginalItems) {
        setRefundType('full');
      } else if (totalItemsBeingRefunded === 0) {
        setRefundType('partial');
      } else {
        setRefundType('partial');
      }
    }, 0);
  };

  const handleRestockToggle = (itemId) => {
    setRestockItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const calculateRefundBreakdown = () => {
    const subtotal = refundItems.reduce((total, item) => total + (item.refund_subtotal || 0), 0);
    const tax = refundItems.reduce((total, item) => total + (item.refund_tax || 0), 0);
    
    // Aggregate tax breakdown across all items
    const aggregatedTaxes = {};
    const aggregatedRebates = {};
    
    refundItems.forEach(item => {
      Object.entries(item.tax_breakdown || {}).forEach(([taxName, amount]) => {
        aggregatedTaxes[taxName] = (aggregatedTaxes[taxName] || 0) + amount;
      });
      
      Object.entries(item.rebate_breakdown || {}).forEach(([rebateName, amount]) => {
        aggregatedRebates[rebateName] = (aggregatedRebates[rebateName] || 0) + amount;
      });
    });
    
    return { 
      subtotal, 
      tax, 
      total: subtotal + tax,
      aggregatedTaxes,
      aggregatedRebates
    };
  };

  const calculateRefundTotal = () => {
    return calculateRefundBreakdown().total;
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

    const isValidManagerPin = await auth.validateManagerPin(managerPin);
    if (!isValidManagerPin) {
      setError('Invalid manager PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const breakdown = calculateRefundBreakdown();
      
      // Create refund record with payment method in refund_type field
      const refundData = {
        business_id: selectedBusinessId,
        original_sale_id: transaction.id,
        refunded_by: authUser.id,
        refund_type: refundMethod === 'custom' ? customRefundMethod : refundMethod,
        refund_method: refundMethod === 'custom' ? customRefundMethod : refundMethod,
        total_refund_amount: refundTotal,
        reason: refundReason.trim(),
        manager_override: true,
        manager_id: authUser.id,
        created_at: new Date().toISOString()
      };

      console.log('Creating refund with data:', refundData);

      const { data: refund, error: refundError } = await supabase
        .from('pos_refunds')
        .insert(refundData)
        .select()
        .single();

      if (refundError) {
        console.error('Refund insert error:', refundError);
        throw refundError;
      }

      // Create refund item records
      const refundItemsToInsert = refundItems
        .filter(item => item.refund_quantity > 0)
        .map(item => ({
          business_id: selectedBusinessId,
          refund_id: refund.id,
          original_sale_item_id: item.id,
          inventory_id: item.inventory_id,
          quantity_refunded: item.refund_quantity,
          unit_price: item.unit_price,
          refund_amount: item.refund_amount,
          restock: restockItems[item.id] || false,
          created_at: new Date().toISOString()
        }));

      if (refundItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('pos_refund_items')
          .insert(refundItemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Update inventory for restocked items
      for (const item of refundItems) {
        if (item.refund_quantity > 0 && restockItems[item.id] && item.inventory_id) {
          const { error: inventoryError } = await supabase
            .rpc('increment_inventory', {
              inventory_id: item.inventory_id,
              quantity_to_add: item.refund_quantity
            });

          if (inventoryError) {
            console.warn('Inventory update failed:', inventoryError);
          }
        }
      }

      // Generate proper refund receipt
      const refundReceiptData = {
        // Basic receipt info
        sale_number: `REFUND-${transaction.sale_number}`,
        created_at: new Date().toISOString(), // Use refund timestamp
        // Negative amounts for refund items
        items: refundItems.filter(item => item.refund_quantity > 0).map(item => ({
          name: item.name,
          quantity: -item.refund_quantity, // NEGATIVE quantity
          price: item.unit_price,
          total_price: -item.refund_amount, // NEGATIVE total
          modifiers: item.modifiers || []
        })),
        subtotal: -breakdown.subtotal, // NEGATIVE subtotal
        final_total: -refundTotal, // NEGATIVE total
        tax_amount: -breakdown.tax, // NEGATIVE tax
        total: -refundTotal, // NEGATIVE total
        payments: [{ // Show refund method
          method: refundData.refund_method,
          payment_method: refundData.refund_method,
          amount: refundTotal // Positive amount being refunded
        }],
        tip_amount: 0,
        change_given: 0,
        discount_amount: 0,
        loyalty_redemption: 0,
        aggregated_taxes: Object.fromEntries(
          Object.entries(breakdown.aggregatedTaxes).map(([key, value]) => [key, -value])
        ),
        aggregated_rebates: Object.fromEntries(
          Object.entries(breakdown.aggregatedRebates).map(([key, value]) => [key, -value])
        ),
        // Keep customer info if exists
        customer_name: transaction.customer_name,
        customer_email: transaction.customer_email,
        customer_phone: transaction.customer_phone,
        // Refund-specific data
        refund_id: refund.id,
        refund_reason: refundReason,
        refund_method: refundData.refund_method,
        refunded_at: new Date().toISOString(),
        original_sale_number: transaction.sale_number
      };

      const refundReceiptHTML = generateReceiptHTML(
        refundReceiptData, 
        RECEIPT_TYPES.REFUND, 
        businessSettings,
        { 
          refundReason: refundReason,
          managerOverride: true,
          requiresSignature: true,
          originalSaleNumber: transaction.sale_number
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

  const formatCurrency = (amount) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  const breakdown = calculateRefundBreakdown();

  const styles = {
    modal: {
      ...TavariStyles.components.modal.overlay
    },
    modalContent: {
      ...TavariStyles.components.modal.content,
      maxWidth: '900px'
    },
    modalHeader: {
      ...TavariStyles.components.modal.header
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: TavariStyles.typography.fontSize['2xl'],
      cursor: 'pointer',
      color: TavariStyles.colors.gray500
    },
    modalBody: {
      ...TavariStyles.components.modal.body
    },
    section: {
      marginBottom: TavariStyles.spacing['2xl']
    },
    transactionSummary: {
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.md,
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    radioGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.xl
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      cursor: 'pointer'
    },
    refundItemsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.lg
    },
    refundItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md
    },
    itemInfo: {
      flex: 1
    },
    itemName: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.xs
    },
    itemDetails: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    refundControls: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.lg
    },
    quantityControl: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    quantityInput: {
      width: '60px',
      padding: TavariStyles.spacing.xs,
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.sm,
      textAlign: 'center'
    },
    refundAmount: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      minWidth: '100px',
      textAlign: 'right'
    },
    input: {
      ...TavariStyles.components.form.input,
      marginTop: TavariStyles.spacing.sm
    },
    textarea: {
      ...TavariStyles.components.form.input,
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: '80px'
    },
    select: {
      ...TavariStyles.components.form.select
    },
    refundTotal: {
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.xl
    },
    refundBreakdown: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    breakdownLine: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: TavariStyles.typography.fontSize.lg
    },
    totalLine: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginTop: TavariStyles.spacing.sm,
      paddingTop: TavariStyles.spacing.sm,
      borderTop: '1px solid rgba(255,255,255,0.3)'
    },
    errorMessage: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error
    },
    modalActions: {
      ...TavariStyles.components.modal.footer
    },
    cancelButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      flex: 1
    },
    processButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.danger,
      flex: 2
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
                      
                      <TavariCheckbox
                        checked={restockItems[item.id] || false}
                        onChange={() => handleRestockToggle(item.id)}
                        label="Restock"
                        size="sm"
                      />
                      
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
            <div style={styles.refundBreakdown}>
              <div style={styles.breakdownLine}>
                <span>Subtotal:</span>
                <span>{formatCurrency(breakdown.subtotal)}</span>
              </div>
              <div style={styles.breakdownLine}>
                <span>Tax:</span>
                <span>{formatCurrency(breakdown.tax)}</span>
              </div>
              <div style={styles.totalLine}>
                <span>Total Refund:</span>
                <span>{formatCurrency(breakdown.total)}</span>
              </div>
            </div>
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

export default RefundModal;