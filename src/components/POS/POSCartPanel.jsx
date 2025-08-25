// components/POS/POSCartPanel.jsx
import React, { useState, useEffect, useCallback } from "react";

const POSCartPanel = ({
  cartItems = [],
  taxRate = 0.13, // pulled from POS settings in POSRegister
  discount = { type: null, value: 0 }, // { type: 'percent' | 'fixed', value: number }
  loyaltyCustomer = null, // { id, name, email, phone, balance, points }
  businessSettings = {}, // POS settings for loyalty rules, etc.
  sessionLocked = false, // From useSessionLock() hook
  onUpdateQty,
  onRemoveItem,
  onCheckout,
  onApplyLoyalty,
  onRemoveLoyalty,
  onRequestManagerOverride, // Callback for manager PIN prompt
  currentEmployee = null, // { id, name } for audit logging
  businessId = null,
  testId = null // For unit testing
}) => {
  const [loyaltyApplied, setLoyaltyApplied] = useState(0);
  const [showLoyaltyBanner, setShowLoyaltyBanner] = useState(false);
  const [managerOverrideActive, setManagerOverrideActive] = useState(false);
  const [overrideTimeout, setOverrideTimeout] = useState(null);

  // Calculate subtotal with proper precision
  const calculateSubtotal = useCallback(() => {
    return cartItems.reduce((sum, item) => {
      const basePrice = Number(item.price) || 0;
      const modifiersTotal = item.modifiers?.reduce((mSum, mod) => {
        return mSum + (Number(mod.price) || 0);
      }, 0) || 0;
      const itemTotal = (basePrice + modifiersTotal) * (Number(item.quantity) || 1);
      return sum + itemTotal;
    }, 0);
  }, [cartItems]);

  const subtotal = calculateSubtotal();

  // Apply discount with proper calculation
  const calculateDiscount = useCallback(() => {
    let discountAmount = 0;
    if (discount?.type === "percent") {
      discountAmount = subtotal * (Number(discount.value) / 100);
    } else if (discount?.type === "fixed") {
      discountAmount = Number(discount.value) || 0;
    }
    return Math.min(discountAmount, subtotal); // Can't discount more than subtotal
  }, [subtotal, discount]);

  const discountAmount = calculateDiscount();
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

  // Apply loyalty redemption with validation
  const loyaltyRedemption = Math.min(loyaltyApplied, subtotalAfterDiscount);
  const subtotalAfterLoyalty = Math.max(0, subtotalAfterDiscount - loyaltyRedemption);

  // Calculate tax on final subtotal (after discounts and loyalty)
  const tax = subtotalAfterLoyalty * Number(taxRate);
  const total = subtotalAfterLoyalty + tax;

  // Auto-apply loyalty if customer is attached and settings allow
  useEffect(() => {
    if (loyaltyCustomer && businessSettings.auto_apply_loyalty && !loyaltyApplied && !sessionLocked) {
      const availableBalance = businessSettings.loyalty_mode === 'points' 
        ? (loyaltyCustomer.points || 0) * (businessSettings.redemption_rate || 0.01)
        : (loyaltyCustomer.balance || 0);
      
      const maxRedemption = Math.min(availableBalance, subtotalAfterDiscount);
      const minRedemption = Number(businessSettings.loyalty_min_redemption) || 5;
      
      if (maxRedemption >= minRedemption) {
        setLoyaltyApplied(maxRedemption);
        setShowLoyaltyBanner(true);
        logAuditAction('loyalty_auto_applied', { 
          customer_id: loyaltyCustomer.id, 
          amount: maxRedemption,
          subtotal: subtotalAfterDiscount
        });
      }
    }
  }, [loyaltyCustomer, businessSettings, subtotalAfterDiscount, loyaltyApplied, sessionLocked]);

  // Manager override timeout handler
  useEffect(() => {
    if (managerOverrideActive && !overrideTimeout) {
      const timeout = setTimeout(() => {
        setManagerOverrideActive(false);
        logAuditAction('manager_override_timeout', { duration: 30000 });
      }, 30000); // 30 second timeout
      setOverrideTimeout(timeout);
    }
    
    return () => {
      if (overrideTimeout) {
        clearTimeout(overrideTimeout);
      }
    };
  }, [managerOverrideActive, overrideTimeout]);

  // Audit logging helper with enhanced metadata
  const logAuditAction = async (action, metadata = {}) => {
    if (!currentEmployee || !businessId) return;
    
    try {
      const auditData = {
        action,
        actor_id: currentEmployee.id,
        actor_name: currentEmployee.name,
        business_id: businessId,
        context: 'pos_cart',
        metadata: JSON.stringify({
          ...metadata,
          cart_item_count: cartItems.length,
          cart_total: total,
          session_locked: sessionLocked,
          timestamp: new Date().toISOString()
        }),
        device_info: navigator.userAgent,
        terminal_id: `terminal_${Date.now()}`, // Generate terminal ID
        session_id: sessionStorage.getItem('pos_session_id') || 'unknown',
        timestamp: new Date().toISOString(),
        success: true
      };
      
      console.log('Audit Log:', auditData);
      // TODO: Replace with actual Supabase integration
      // await supabase.from('pos_audit_logs').insert(auditData);
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Log the audit failure itself
      console.log('Audit Failure Log:', {
        action: 'audit_log_failure',
        original_action: action,
        error: error.message
      });
    }
  };

  // Handle loyalty toggle with manager override for large amounts
  const handleLoyaltyToggle = async () => {
    if (sessionLocked) {
      logAuditAction('loyalty_attempt_while_locked');
      return;
    }

    if (loyaltyApplied > 0) {
      // Remove loyalty
      setLoyaltyApplied(0);
      setShowLoyaltyBanner(false);
      onRemoveLoyalty && onRemoveLoyalty();
      logAuditAction('loyalty_removed', { 
        customer_id: loyaltyCustomer?.id,
        amount_removed: loyaltyApplied
      });
    } else if (loyaltyCustomer) {
      // Apply loyalty
      const availableBalance = businessSettings.loyalty_mode === 'points' 
        ? (loyaltyCustomer.points || 0) * (businessSettings.redemption_rate || 0.01)
        : (loyaltyCustomer.balance || 0);
      
      const maxRedemption = Math.min(availableBalance, subtotalAfterDiscount);
      const minRedemption = Number(businessSettings.loyalty_min_redemption) || 5;
      const managerOverrideThreshold = Number(businessSettings.loyalty_manager_override_threshold) || 50;
      
      if (maxRedemption >= minRedemption) {
        // Check if manager override is required for large loyalty redemptions
        if (maxRedemption > managerOverrideThreshold && !managerOverrideActive) {
          if (onRequestManagerOverride) {
            const overrideApproved = await onRequestManagerOverride(
              'Large loyalty redemption requires manager approval',
              { amount: maxRedemption, customer: loyaltyCustomer.name }
            );
            
            if (overrideApproved) {
              setManagerOverrideActive(true);
              logAuditAction('manager_override_approved_loyalty', { 
                amount: maxRedemption,
                customer_id: loyaltyCustomer.id
              });
            } else {
              logAuditAction('manager_override_denied_loyalty', { 
                amount: maxRedemption,
                customer_id: loyaltyCustomer.id
              });
              return;
            }
          }
        }
        
        setLoyaltyApplied(maxRedemption);
        setShowLoyaltyBanner(true);
        onApplyLoyalty && onApplyLoyalty(maxRedemption);
        logAuditAction('loyalty_applied', { 
          customer_id: loyaltyCustomer.id, 
          amount: maxRedemption,
          available_balance: availableBalance,
          manager_override_used: managerOverrideActive
        });
      }
    }
  };

  // Handle quantity update with enhanced validation and audit logging
  const handleQtyUpdate = (itemId, newQty) => {
    if (sessionLocked) {
      logAuditAction('qty_update_attempt_while_locked', { item_id: itemId });
      return;
    }

    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;

    // Validate quantity
    const validatedQty = Math.max(0, Math.min(Number(newQty) || 0, 99)); // Max 99 per item
    
    if (validatedQty === 0) {
      handleRemoveItem(itemId);
      return;
    }

    logAuditAction('cart_qty_update', { 
      item_id: itemId, 
      old_qty: item.quantity, 
      new_qty: validatedQty,
      item_name: item.name,
      price_impact: (validatedQty - item.quantity) * (Number(item.price) || 0)
    });

    onUpdateQty(itemId, validatedQty);
  };

  // Handle item removal with comprehensive audit logging
  const handleRemoveItem = (itemId) => {
    if (sessionLocked) {
      logAuditAction('remove_item_attempt_while_locked', { item_id: itemId });
      return;
    }

    const item = cartItems.find(i => i.id === itemId);
    if (item) {
      const itemValue = (Number(item.price) || 0) * (Number(item.quantity) || 1);
      const modifiersValue = item.modifiers?.reduce((sum, mod) => sum + (Number(mod.price) || 0), 0) || 0;
      const totalItemValue = itemValue + modifiersValue;

      logAuditAction('cart_item_removed', { 
        item_id: itemId,
        item_name: item.name,
        quantity: item.quantity,
        base_price: item.price,
        modifiers_count: item.modifiers?.length || 0,
        total_item_value: totalItemValue
      });
    }
    
    onRemoveItem(itemId);
  };

  // Enhanced checkout with comprehensive pre-checkout validation
  const handleCheckout = () => {
    if (sessionLocked) {
      logAuditAction('checkout_attempt_while_locked');
      return;
    }

    if (cartItems.length === 0) {
      logAuditAction('checkout_attempt_empty_cart');
      return;
    }

    // Pre-checkout validation
    const checkoutData = {
      item_count: cartItems.length,
      subtotal: subtotal,
      discount_amount: discountAmount,
      loyalty_redemption: loyaltyRedemption,
      tax_amount: tax,
      total_amount: total,
      loyalty_customer_id: loyaltyCustomer?.id || null,
      manager_override_used: managerOverrideActive
    };

    logAuditAction('checkout_initiated', checkoutData);
    onCheckout(checkoutData);
  };

  return (
    <div style={styles.container} data-testid={testId}>
      <h3 style={styles.header}>Cart</h3>

      {/* Session Lock Overlay */}
      {sessionLocked && (
        <div style={styles.lockOverlay}>
          <div style={styles.lockMessage}>
            🔒 Session Locked
            <br />
            <small>Enter PIN to continue</small>
          </div>
        </div>
      )}

      {/* Manager Override Active Banner */}
      {managerOverrideActive && (
        <div style={styles.overrideBanner}>
          ⚠️ Manager Override Active (30s)
        </div>
      )}

      {/* Loyalty Customer Banner */}
      {loyaltyCustomer && (
        <div style={styles.loyaltyBanner}>
          <div style={styles.customerInfo}>
            <strong>{loyaltyCustomer.name}</strong>
            <br />
            <small>
              {businessSettings.loyalty_mode === 'dollars' ? '$' : ''}
              {businessSettings.loyalty_mode === 'points' 
                ? (loyaltyCustomer.points || 0) 
                : (loyaltyCustomer.balance || 0).toFixed(2)}
              {businessSettings.loyalty_mode === 'points' ? ' pts' : ''} available
            </small>
          </div>
          <button 
            style={loyaltyApplied > 0 ? styles.loyaltyButtonActive : styles.loyaltyButton}
            onClick={handleLoyaltyToggle}
            disabled={sessionLocked}
          >
            {loyaltyApplied > 0 ? 'Remove Loyalty' : 'Apply Loyalty'}
          </button>
        </div>
      )}

      {/* Live Loyalty Applied Banner */}
      {showLoyaltyBanner && loyaltyRedemption > 0 && (
        <div style={styles.loyaltyActiveBanner}>
          🎉 Loyalty Applied: -${loyaltyRedemption.toFixed(2)}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div style={styles.empty}>Cart is empty</div>
      ) : (
        <>
          <div style={styles.list}>
            {cartItems.map((item) => {
              const basePrice = Number(item.price) || 0;
              const modifiersTotal = item.modifiers?.reduce((sum, mod) => sum + (Number(mod.price) || 0), 0) || 0;
              const itemTotal = (basePrice + modifiersTotal) * (Number(item.quantity) || 1);

              return (
                <div key={item.id} style={styles.item} data-testid={`cart-item-${item.id}`}>
                  {/* Item Information Column */}
                  <div style={styles.itemColumn}>
                    <div style={styles.name}>{item.name}</div>
                    
                    {/* Enhanced Modifier Display */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div style={styles.modifiers}>
                        {item.modifiers.map((mod, index) => (
                          <div key={`${mod.id}-${index}`} style={styles.modifierLine}>
                            {mod.required ? '• ' : '+ '}{mod.name}
                            {mod.group_name && <small> ({mod.group_name})</small>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Price Information Column */}
                  <div style={styles.priceColumn}>
                    <div style={styles.basePrice}>${basePrice.toFixed(2)}</div>
                    
                    {/* Modifier prices aligned with modifier names */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div style={styles.modifierPrices}>
                        {item.modifiers.map((mod, index) => (
                          <div key={`${mod.id}-price-${index}`} style={styles.modifierPriceLine}>
                            {Number(mod.price) > 0 ? `+${Number(mod.price).toFixed(2)}` : 'Free'}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {modifiersTotal > 0 && (
                      <div style={styles.modifierTotal}>+${modifiersTotal.toFixed(2)}</div>
                    )}
                    <div style={styles.itemTotal}>${itemTotal.toFixed(2)}</div>
                  </div>
                  
                  {/* Controls Column */}
                  <div style={styles.controls}>
                    <button 
                      style={styles.qtyButton}
                      onClick={() => handleQtyUpdate(item.id, (Number(item.quantity) || 1) - 1)}
                      disabled={sessionLocked}
                      data-testid={`qty-decrease-${item.id}`}
                    >
                      -
                    </button>
                    <span style={styles.quantity}>{Number(item.quantity) || 1}</span>
                    <button 
                      style={styles.qtyButton}
                      onClick={() => handleQtyUpdate(item.id, (Number(item.quantity) || 1) + 1)}
                      disabled={sessionLocked}
                      data-testid={`qty-increase-${item.id}`}
                    >
                      +
                    </button>
                    <button 
                      style={styles.remove} 
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={sessionLocked}
                      data-testid={`remove-${item.id}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enhanced Summary with Proper Calculations */}
          <div style={styles.summary}>
            <div style={styles.row}>
              <span>Subtotal ({cartItems.length} items)</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div style={styles.rowDiscount}>
                <span>Discount ({discount.type === 'percent' ? `${discount.value}%` : 'Fixed'})</span>
                <span>- ${discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            {loyaltyRedemption > 0 && (
              <div style={styles.rowLoyalty}>
                <span>Loyalty Redemption</span>
                <span>- ${loyaltyRedemption.toFixed(2)}</span>
              </div>
            )}
            
            <div style={styles.rowSubtotal}>
              <span>Taxable Amount</span>
              <span>${subtotalAfterLoyalty.toFixed(2)}</span>
            </div>
            
            <div style={styles.row}>
              <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            
            <div style={styles.rowTotal}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button 
            style={{
              ...styles.checkout,
              ...(sessionLocked ? styles.checkoutDisabled : {})
            }}
            onClick={handleCheckout}
            disabled={cartItems.length === 0 || sessionLocked}
            data-testid="checkout-button"
          >
            {sessionLocked ? 'Session Locked' : `Checkout - $${total.toFixed(2)}`}
          </button>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#fff",
    borderLeft: "1px solid #ddd",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: "400px",
    position: "relative",
  },
  header: {
    margin: "0 0 15px 0",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#333",
  },
  
  // Session Lock Styles
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  lockMessage: {
    textAlign: "center",
    fontSize: "18px",
    color: "#666",
    fontWeight: "bold",
  },
  
  // Override Banner
  overrideBanner: {
    backgroundColor: "#ff9800",
    color: "white",
    padding: "8px",
    borderRadius: "4px",
    marginBottom: "10px",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "bold",
  },
  
  // Loyalty Styles
  loyaltyBanner: {
    backgroundColor: "#008080",
    color: "white",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerInfo: {
    fontSize: "14px",
    lineHeight: "1.4",
  },
  loyaltyButton: {
    backgroundColor: "white",
    color: "#008080",
    border: "2px solid #008080",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  loyaltyButtonActive: {
    backgroundColor: "#ff6b6b",
    color: "white",
    border: "2px solid #ff6b6b",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  loyaltyActiveBanner: {
    backgroundColor: "#4CAF50",
    color: "white",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "12px",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "bold",
  },
  
  // Cart Item Styles
  empty: {
    color: "#888",
    textAlign: "center",
    marginTop: "40px",
    fontSize: "16px",
    fontStyle: "italic",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    marginBottom: "15px",
    maxHeight: "350px",
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    padding: "12px 0",
    borderBottom: "1px solid #eee",
    gap: "12px",
  },
  
  // Three Column Layout
  itemColumn: {
    flex: 2,
    display: "flex",
    flexDirection: "column",
  },
  priceColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    textAlign: "right",
  },
  
  name: {
    fontSize: "15px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "4px",
  },
  
  // Enhanced Modifier Styles - Column Layout
  modifiers: {
    marginLeft: "12px",
    fontSize: "13px",
    color: "#555",
  },
  modifierLine: {
    marginBottom: "2px",
    fontStyle: "italic",
  },
  
  // Price Column Styles
  basePrice: {
    fontSize: "14px",
    color: "#333",
    fontWeight: "500",
    marginBottom: "2px",
  },
  modifierPrices: {
    fontSize: "12px",
    color: "#666",
  },
  modifierPriceLine: {
    marginBottom: "2px",
  },
  modifierTotal: {
    fontSize: "12px",
    color: "#888",
    fontStyle: "italic",
    marginTop: "2px",
    paddingTop: "2px",
    borderTop: "1px dotted #ddd",
  },
  itemTotal: {
    fontSize: "15px",
    color: "#333",
    fontWeight: "bold",
    marginTop: "4px",
    paddingTop: "4px",
    borderTop: "1px solid #ddd",
  },
  
  // Controls
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
  },
  qtyButton: {
    backgroundColor: "white",
    border: "2px solid #008080",
    color: "#008080",
    width: "32px",
    height: "32px",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  quantity: {
    minWidth: "20px",
    textAlign: "center",
    fontWeight: "bold",
    margin: "0 4px",
  },
  remove: {
    backgroundColor: "#ff6b6b",
    color: "white",
    border: "none",
    padding: "6px 10px",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    marginLeft: "6px",
  },
  
  // Summary Styles
  summary: {
    borderTop: "2px solid #ddd",
    paddingTop: "12px",
    marginTop: "12px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    margin: "4px 0",
    fontSize: "14px",
  },
  rowDiscount: {
    display: "flex",
    justifyContent: "space-between",
    margin: "4px 0",
    fontSize: "14px",
    color: "#ff6b6b",
    fontWeight: "bold",
  },
  rowLoyalty: {
    display: "flex",
    justifyContent: "space-between",
    margin: "4px 0",
    fontSize: "14px",
    color: "#4CAF50",
    fontWeight: "bold",
  },
  rowSubtotal: {
    display: "flex",
    justifyContent: "space-between",
    margin: "6px 0",
    fontSize: "14px",
    fontWeight: "500",
    paddingTop: "6px",
    borderTop: "1px solid #eee",
  },
  rowTotal: {
    display: "flex",
    justifyContent: "space-between",
    margin: "8px 0 0 0",
    fontSize: "16px",
    fontWeight: "bold",
    paddingTop: "8px",
    borderTop: "2px solid #333",
    color: "#333",
  },
  
  // Checkout Button
  checkout: {
    marginTop: "15px",
    padding: "14px",
    backgroundColor: "#008080",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
    width: "100%",
  },
  checkoutDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
    color: "#666",
  },
};

export default POSCartPanel;