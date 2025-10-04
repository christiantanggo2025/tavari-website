// src/components/POS/POSCartPanelComponents/CheckoutSection.jsx
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { TavariStyles } from '../../../utils/TavariStyles';

const CheckoutSection = ({
  cartItems = [],
  subtotal = 0,
  taxAmount = 0,
  total = 0,
  autoLoyaltyApplied = 0,
  onCheckout,
  sessionLocked = false,
  tabMode = false,
  formatTaxAmount
}) => {
  if (cartItems.length === 0) {
    return null;
  }

  const styles = {
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

  const handleCheckout = () => {
    onCheckout({
      items: cartItems,
      subtotal,
      tax: taxAmount,
      total,
      discount_amount: 0,
      loyalty_redemption: autoLoyaltyApplied
    });
  };

  return (
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
        <span style={styles.summaryValue}>${formatTaxAmount ? formatTaxAmount(taxAmount) : taxAmount.toFixed(2)}</span>
      </div>
      
      <div style={styles.totalRow}>
        <span style={styles.totalLabel}>Total:</span>
        <span style={styles.totalValue}>${total.toFixed(2)}</span>
      </div>
      
      <button
        onClick={handleCheckout}
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
  );
};

export default CheckoutSection;