// src/components/POS/POSCartPanelComponents/CartHeader.jsx
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { TavariStyles } from '../../../utils/TavariStyles';

const CartHeader = ({ 
  cartItems = [], 
  onClearCart, 
  onSaveAndExit, 
  tabMode = false,
  activeTab = null 
}) => {
  const styles = {
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${TavariStyles.spacing.md} ${TavariStyles.spacing.lg}`,
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      borderTopLeftRadius: TavariStyles.borderRadius.lg,
      borderTopRightRadius: TavariStyles.borderRadius.lg,
      flexShrink: 0,
      height: '60px'
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
    
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },
    
    clearButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.sm,
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: TavariStyles.colors.white,
      border: `1px solid rgba(255,255,255,0.3)`
    },
    
    saveExitButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.sm,
      backgroundColor: TavariStyles.colors.warning,
      color: TavariStyles.colors.white,
      border: `1px solid ${TavariStyles.colors.warning}`
    }
  };

  return (
    <div style={styles.header}>
      <div style={styles.headerTitle}>
        <ShoppingCart size={18} />
        <span>{tabMode && activeTab ? `Tab: ${activeTab.customer_name || 'Unnamed'}` : 'Cart'}</span>
        <span style={styles.cartCount}>{cartItems.length}</span>
      </div>
      
      {cartItems.length > 0 && (
        <div style={styles.buttonGroup}>
          {tabMode && activeTab && onSaveAndExit && (
            <button
              onClick={onSaveAndExit}
              style={styles.saveExitButton}
              title="Save items to tab and clear cart"
            >
              Save & Exit
            </button>
          )}
          <button
            onClick={onClearCart}
            style={styles.clearButton}
            title="Clear cart"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default CartHeader;