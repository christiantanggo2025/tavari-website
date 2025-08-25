// screens/POS/PaymentScreen.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusinessContext } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const PaymentScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusinessId } = useBusinessContext();
  
  const [saleData, setSaleData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({ method: 'cash', amount: '' });
  const [customMethodName, setCustomMethodName] = useState('');
  const [showCustomMethod, setShowCustomMethod] = useState(false);
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tipAmount, setTipAmount] = useState(0);

  // Get sale data from navigation state
  const receivedSaleData = location.state?.saleData;

  useEffect(() => {
    if (!selectedBusinessId) {
      setError('No business selected');
      return;
    }

    if (!receivedSaleData) {
      setError('No sale data provided');
      return;
    }

    setSaleData(receivedSaleData);
    
    // Initialize tip if enabled - FIX: Round to 2 decimal places
    if (receivedSaleData.businessSettings?.tip_enabled) {
      const defaultTip = (receivedSaleData.businessSettings.default_tip_percent || 0.15) * receivedSaleData.total_amount;
      setTipAmount(Math.round(defaultTip * 100) / 100); // Round to 2 decimal places
    }

    logAction({
      action: 'payment_screen_opened',
      context: 'PaymentScreen',
      metadata: {
        sale_total: receivedSaleData.total_amount,
        item_count: receivedSaleData.item_count,
        loyalty_applied: receivedSaleData.loyalty_redemption > 0
      }
    });
  }, [selectedBusinessId, receivedSaleData]);

  // Calculate totals including tip
  const saleTotal = saleData?.total_amount || 0;
  const finalTotal = saleTotal + tipAmount;
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingBalance = finalTotal - totalPaid;
  const changeOwed = Math.max(0, totalPaid - finalTotal);

  // FIX: Auto-prefill amount with remaining balance when method changes
  useEffect(() => {
    if (remainingBalance > 0 && !currentPayment.amount) {
      setCurrentPayment(prev => ({
        ...prev,
        amount: remainingBalance.toFixed(2)
      }));
    }
  }, [remainingBalance, currentPayment.method]);

  // FIX: Auto-navigate when balance is 0
  useEffect(() => {
    if (remainingBalance <= 0.01 && remainingBalance >= -0.01 && payments.length > 0 && !loading) {
      // Small delay to let user see the completion
      setTimeout(() => {
        finalizeSale();
      }, 500);
    }
  }, [remainingBalance, payments.length, loading]);

  // Payment method options (will be configurable via business settings)
  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: '💵' },
    { id: 'card', name: 'Credit/Debit', icon: '💳' },
    { id: 'helcim', name: 'Helcim Terminal', icon: '📱' },
    { id: 'gift_card', name: 'Gift Card', icon: '🎁' },
    { id: 'loyalty', name: 'Loyalty Credit', icon: '⭐' },
    { id: 'custom', name: 'Custom Method', icon: '⚙️' }
  ];

  // Quick cash amount buttons
  const quickCashAmounts = [5, 10, 20, 50, 100];

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

  const handleAddPayment = async () => {
    const amount = Number(currentPayment.amount);
    
    if (!amount || amount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    // FIX: Only allow cash to go over balance, require manager override for others
    if (amount > remainingBalance) {
      if (currentPayment.method === 'cash') {
        // Cash can go over - this is normal for giving change
      } else {
        // Non-cash overpayment requires manager override
        if (!showManagerOverride) {
          setShowManagerOverride(true);
          setOverrideReason('Overpayment detected - Manager approval required for non-cash overpayment');
          return;
        }
      }
    }

    if (currentPayment.method === 'custom' && !customMethodName.trim()) {
      setError('Please enter a custom payment method name');
      return;
    }

    // Handle manager override if needed
    if (showManagerOverride) {
      const isValidPin = await validateManagerPin(managerPin);
      if (!isValidPin) {
        setError('Invalid manager PIN');
        return;
      }

      await logAction({
        action: 'manager_override_payment',
        context: 'PaymentScreen',
        metadata: {
          reason: overrideReason,
          amount,
          method: currentPayment.method,
          remaining_balance: remainingBalance
        }
      });
    }

    const newPayment = {
      id: Date.now(), // Temporary ID
      method: currentPayment.method,
      amount,
      custom_method_name: currentPayment.method === 'custom' ? customMethodName : null,
      tip_amount: payments.length === 0 ? tipAmount : 0, // Only first payment gets tip
      timestamp: new Date().toISOString()
    };

    setPayments([...payments, newPayment]);
    
    // Reset form and prefill for next payment
    const newRemainingBalance = remainingBalance - amount;
    setCurrentPayment({ 
      method: 'cash', 
      amount: newRemainingBalance > 0 ? newRemainingBalance.toFixed(2) : '' 
    });
    setCustomMethodName('');
    setShowCustomMethod(false);
    setShowManagerOverride(false);
    setManagerPin('');
    setOverrideReason('');
    setError(null);

    await logAction({
      action: 'payment_added',
      context: 'PaymentScreen',
      metadata: {
        method: newPayment.method,
        amount: newPayment.amount,
        total_payments: payments.length + 1,
        remaining_balance: remainingBalance - amount
      }
    });
  };

  const handleRemovePayment = async (paymentId) => {
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setPayments(payments.filter(p => p.id !== paymentId));
      
      // Update current payment amount to include removed payment
      const newRemainingBalance = remainingBalance + payment.amount;
      setCurrentPayment(prev => ({
        ...prev,
        amount: newRemainingBalance.toFixed(2)
      }));
      
      await logAction({
        action: 'payment_removed',
        context: 'PaymentScreen',
        metadata: {
          method: payment.method,
          amount: payment.amount,
          remaining_payments: payments.length - 1
        }
      });
    }
  };

  const handleQuickCash = (amount) => {
    setCurrentPayment({ method: 'cash', amount: amount.toString() });
  };

  const handleExactAmount = () => {
    setCurrentPayment({ method: 'cash', amount: remainingBalance.toFixed(2) });
  };

  // FIX: Handle tip percentage clicks with proper rounding
  const handleTipPercentage = (percentage) => {
    const tipAmount = saleTotal * percentage;
    setTipAmount(Math.round(tipAmount * 100) / 100); // Round to 2 decimal places
  };

  const finalizeSale = async () => {
    if (remainingBalance > 0.01) { // Allow for small rounding differences
      setError('Payment incomplete. Please add more payments to cover the total.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user ID once at the beginning
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Create the sale record
      const saleRecord = {
        business_id: selectedBusinessId,
        user_id: currentUserId,
        subtotal: saleData.subtotal,
        tax: saleData.tax_amount,
        discount: saleData.discount_amount,
        loyalty_discount: saleData.loyalty_redemption,
        total: finalTotal,
        item_count: saleData.item_count,
        loyalty_customer_id: saleData.loyalty_customer_id,
        payment_status: 'completed',
        sale_number: `SALE-${Date.now()}`,
        notes: payments.length > 1 ? 'Split payment transaction' : null
      };

      const { data: sale, error: saleError } = await supabase
        .from('pos_sales')
        .insert(saleRecord)
        .select()
        .single();

      if (saleError) throw saleError;

      // Create payment records - user ID already available
      const paymentRecords = payments.map(payment => ({
        business_id: selectedBusinessId,
        sale_id: sale.id,
        payment_method: payment.method,
        amount: payment.amount,
        custom_method_name: payment.custom_method_name,
        tip_amount: payment.tip_amount || 0,
        change_given: payment === payments[payments.length - 1] ? changeOwed : 0,
        processed_by: currentUserId,
        processed_at: new Date().toISOString()
      }));

      const { error: paymentsError } = await supabase
        .from('pos_payments')
        .insert(paymentRecords);

      if (paymentsError) throw paymentsError;

      // Create sale items from cart data
      if (saleData.items && saleData.items.length > 0) {
        const saleItemRecords = saleData.items.map(item => ({
          business_id: selectedBusinessId,
          sale_id: sale.id,
          inventory_id: item.inventory_id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          modifiers: item.modifiers || [],
          notes: item.notes,
          station_id: item.station_ids?.[0] // Route to first station
        }));

        const { error: saleItemsError } = await supabase
          .from('pos_sale_items')
          .insert(saleItemRecords);

        if (saleItemsError) throw saleItemsError;
      }

      // Update loyalty account if applicable
      if (saleData.loyalty_customer_id) {
        const earnAmount = saleData.subtotal * (saleData.businessSettings.redemption_rate || 0.01);
        
        await supabase
          .from('pos_loyalty_transactions')
          .insert({
            business_id: selectedBusinessId,
            loyalty_account_id: saleData.loyalty_customer_id,
            transaction_id: sale.id,
            transaction_type: 'earn',
            amount: earnAmount,
            balance_before: 0, // Would need to fetch current balance
            balance_after: earnAmount, // Would need to calculate
            description: `Earned from sale ${sale.sale_number}`,
            processed_by: currentUserId,
            processed_at: new Date().toISOString()
          });
      }

      // Clear cart items
      await supabase
        .from('pos_cart_items')
        .delete()
        .eq('business_id', selectedBusinessId)
        .eq('user_id', currentUserId);

      await logAction({
        action: 'sale_completed',
        context: 'PaymentScreen',
        metadata: {
          sale_id: sale.id,
          sale_number: sale.sale_number,
          total_amount: finalTotal,
          payment_methods: payments.map(p => p.method),
          split_payment: payments.length > 1,
          loyalty_applied: saleData.loyalty_redemption > 0,
          tip_amount: tipAmount
        }
      });

      // Navigate to receipt screen
      navigate('/dashboard/pos/receipt', {
        state: {
          saleData: {
            ...saleData,
            sale_id: sale.id,
            sale_number: sale.sale_number,
            payments,
            tip_amount: tipAmount,
            change_given: changeOwed,
            final_total: finalTotal
          }
        }
      });

    } catch (err) {
      console.error('Sale finalization error:', err);
      setError(`Failed to complete sale: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToReview = () => {
    navigate('/dashboard/pos/sale-review', {
      state: { checkoutData: saleData }
    });
  };

  if (!saleData) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>Error</h3>
          <p>{error || 'No sale data provided'}</p>
          <button style={styles.button} onClick={() => navigate('/dashboard/pos/register')}>
            Back to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Process Payment</h2>
        <p>Complete the payment for this sale</p>
      </div>

      <div style={styles.content}>
        {/* Sale Summary */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Payment Summary</h3>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span>Sale Total:</span>
              <span>${saleTotal.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div style={styles.summaryItem}>
                <span>Tip:</span>
                <span>${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={styles.summaryItemTotal}>
              <span>Final Total:</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>
            <div style={styles.summaryItem}>
              <span>Total Paid:</span>
              <span>${totalPaid.toFixed(2)}</span>
            </div>
            <div style={{
              ...styles.summaryItemRemaining,
              color: remainingBalance > 0 ? '#dc2626' : '#059669'
            }}>
              <span>Remaining:</span>
              <span>${remainingBalance.toFixed(2)}</span>
            </div>
            {/* FIX: Show change only for cash payments and when overpaid */}
            {changeOwed > 0 && payments.some(p => p.method === 'cash') && (
              <div style={styles.summaryItemChange}>
                <span>💵 Change Due:</span>
                <span>${changeOwed.toFixed(2)}</span>
              </div>
            )}
            {changeOwed > 0 && !payments.some(p => p.method === 'cash') && (
              <div style={styles.summaryItemOverpaid}>
                <span>⚠️ Overpayment (Manager Approval Required):</span>
                <span>${changeOwed.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tip Section */}
        {saleData.businessSettings?.tip_enabled && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Tip Amount</h3>
            <div style={styles.tipControls}>
              <button 
                style={styles.tipButton}
                onClick={() => setTipAmount(0)}
              >
                No Tip
              </button>
              <button 
                style={styles.tipButton}
                onClick={() => handleTipPercentage(0.15)}
              >
                15%
              </button>
              <button 
                style={styles.tipButton}
                onClick={() => handleTipPercentage(0.18)}
              >
                18%
              </button>
              <button 
                style={styles.tipButton}
                onClick={() => handleTipPercentage(0.20)}
              >
                20%
              </button>
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => {
                  const newTip = Number(e.target.value) || 0;
                  setTipAmount(Math.max(0, Math.round(newTip * 100) / 100)); // Round to 2 decimal places
                }}
                style={styles.tipInput}
                placeholder="Custom tip"
                step="0.01"
                min="0"
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Add Payment</h3>
          
          <div style={styles.paymentMethods}>
            {paymentMethods.map(method => (
              <button
                key={method.id}
                style={{
                  ...styles.methodButton,
                  ...(currentPayment.method === method.id ? styles.methodButtonActive : {})
                }}
                onClick={() => {
                  setCurrentPayment({ 
                    method: method.id, 
                    amount: remainingBalance > 0 ? remainingBalance.toFixed(2) : ''
                  });
                  setShowCustomMethod(method.id === 'custom');
                }}
              >
                <span style={styles.methodIcon}>{method.icon}</span>
                <span>{method.name}</span>
              </button>
            ))}
          </div>

          {/* Custom Method Name Input */}
          {showCustomMethod && (
            <div style={styles.customMethodInput}>
              <input
                type="text"
                value={customMethodName}
                onChange={(e) => setCustomMethodName(e.target.value)}
                placeholder="Enter payment method name"
                style={styles.input}
              />
            </div>
          )}

          {/* Amount Input */}
          <div style={styles.amountSection}>
            <input
              type="number"
              value={currentPayment.amount}
              onChange={(e) => setCurrentPayment({ ...currentPayment, amount: e.target.value })}
              placeholder={`Payment amount (${remainingBalance.toFixed(2)} remaining)`}
              style={styles.amountInput}
              step="0.01"
              min="0"
              onFocus={(e) => e.target.select()}
            />
            
            {/* Quick Cash Buttons */}
            {currentPayment.method === 'cash' && (
              <div style={styles.quickCash}>
                {quickCashAmounts.map(amount => (
                  <button
                    key={amount}
                    style={styles.quickCashButton}
                    onClick={() => handleQuickCash(amount)}
                  >
                    ${amount}
                  </button>
                ))}
                <button
                  style={styles.quickCashButton}
                  onClick={handleExactAmount}
                >
                  Exact
                </button>
              </div>
            )}
          </div>

          <button
            style={styles.addPaymentButton}
            onClick={handleAddPayment}
            disabled={!currentPayment.amount || Number(currentPayment.amount) <= 0}
          >
            Add Payment
          </button>
        </div>

        {/* Current Payments */}
        {payments.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Payments Applied</h3>
            <div style={styles.paymentsList}>
              {payments.map((payment, index) => (
                <div key={payment.id} style={styles.paymentItem}>
                  <div style={styles.paymentInfo}>
                    <span style={styles.paymentMethod}>
                      {payment.custom_method_name || payment.method}
                    </span>
                    <span style={styles.paymentAmount}>
                      ${payment.amount.toFixed(2)}
                    </span>
                    {payment.tip_amount > 0 && (
                      <span style={styles.paymentTip}>
                        (includes ${payment.tip_amount.toFixed(2)} tip)
                      </span>
                    )}
                  </div>
                  <button
                    style={styles.removePaymentButton}
                    onClick={() => handleRemovePayment(payment.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manager Override Modal */}
        {showManagerOverride && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h3>Manager Override Required</h3>
              <p>{overrideReason}</p>
              <input
                type="password"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="Manager PIN"
                style={styles.input}
              />
              <div style={styles.modalActions}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowManagerOverride(false);
                    setManagerPin('');
                    setOverrideReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  style={styles.confirmButton}
                  onClick={handleAddPayment}
                >
                  Approve Override
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button
          style={styles.backButton}
          onClick={handleBackToReview}
          disabled={loading}
        >
          Back to Review
        </button>
        
        <button
          style={{
            ...styles.completeButton,
            ...(remainingBalance > 0.01 || loading ? styles.completeButtonDisabled : {})
          }}
          onClick={finalizeSale}
          disabled={remainingBalance > 0.01 || loading}
        >
          {loading ? 'Processing...' : 
           remainingBalance > 0.01 ? `${remainingBalance.toFixed(2)} Remaining` : 
           changeOwed > 0 && payments.some(p => p.method === 'cash') ? 
             `Complete Sale - Give ${changeOwed.toFixed(2)} Change` :
             'Complete Sale'}
        </button>
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
  content: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '20px'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb'
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    borderBottom: '2px solid #008080',
    paddingBottom: '8px'
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    color: '#1f2937'
  },
  summaryItemTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    paddingTop: '8px',
    borderTop: '1px solid #e5e7eb'
  },
  summaryItemRemaining: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  summaryItemChange: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    padding: '8px',
    borderRadius: '4px'
  },
  summaryItemOverpaid: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '8px',
    borderRadius: '4px'
  },
  tipControls: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  tipButton: {
    padding: '8px 12px',
    backgroundColor: 'white',
    color: '#008080',
    border: '2px solid #008080',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  tipInput: {
    padding: '8px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100px'
  },
  paymentMethods: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '15px'
  },
  methodButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: 'white',
    color: '#008080',
    border: '2px solid #008080',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  methodButtonActive: {
    backgroundColor: '#008080',
    color: 'white'
  },
  methodIcon: {
    fontSize: '24px',
    marginBottom: '8px'
  },
  customMethodInput: {
    marginBottom: '15px'
  },
  amountSection: {
    marginBottom: '15px'
  },
  amountInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '10px'
  },
  quickCash: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  quickCashButton: {
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  addPaymentButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  paymentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  paymentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  paymentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  paymentMethod: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'capitalize'
  },
  paymentAmount: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#059669'
  },
  paymentTip: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  removePaymentButton: {
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    width: '30px',
    height: '30px',
    cursor: 'pointer',
    fontSize: '16px',
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
    padding: '30px',
    borderRadius: '8px',
    maxWidth: '400px',
    width: '90%'
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    marginBottom: '15px'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  confirmButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '15px',
    border: '1px solid #fecaca'
  },
  actions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'space-between'
  },
  backButton: {
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
  completeButton: {
    flex: 2,
    padding: '15px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  completeButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
    color: '#666'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#dc2626'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  }
};

export default PaymentScreen;