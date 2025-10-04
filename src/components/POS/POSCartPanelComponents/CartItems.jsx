// src/components/POS/POSCartPanelComponents/CartItems.jsx
import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { TavariStyles } from '../../../utils/TavariStyles';

const CartItems = ({ 
  cartItems = [], 
  onRemoveItem, 
  onUpdateQty, 
  sessionLocked = false 
}) => {
  const styles = {
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
      alignItems: 'flex-start',
      padding: TavariStyles.spacing.sm,
      marginBottom: TavariStyles.spacing.xs,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      minHeight: '50px'
    },
    
    itemInfo: {
      flex: 1,
      marginRight: TavariStyles.spacing.sm
    },
    
    itemRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2px'
    },
    
    itemName: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },
    
    itemPrice: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700
    },
    
    modifierRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: '20px',
      marginBottom: '1px'
    },
    
    modifierName: {
      fontSize: '10px',
      color: TavariStyles.colors.gray600,
      fontStyle: 'italic'
    },
    
    modifierPrice: {
      fontSize: '10px',
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
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
    }
  };

  if (cartItems.length === 0) {
    return (
      <div style={styles.itemsList}>
        <div style={styles.emptyCart}>
          <div style={styles.emptyCartIcon}>🛒</div>
          <p>Cart is empty</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.itemsList}>
      {cartItems.map((item, index) => {
        // Extract base name and modifiers
        const baseName = item.name.includes(' - ') ? item.name.split(' - ')[0] : item.name;
        let modifiersToShow = [];
        
        // Try to use modifiers array first
        if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
          modifiersToShow = item.modifiers;
        } else if (item.name.includes(' - ')) {
          // Extract from name if no modifiers array
          const parts = item.name.split(' - ');
          const modifierNames = parts.slice(1);
          modifiersToShow = modifierNames.map(name => ({ name, price: 0 }));
        }
        
        return (
          <div key={`${item.id}-${index}`} style={styles.cartItem}>
            <div style={styles.itemInfo}>
              {/* Main item row with name and price aligned */}
              <div style={styles.itemRow}>
                <span style={styles.itemName}>{baseName}</span>
                <span style={styles.itemPrice}>${parseFloat(item.price || 0).toFixed(2)}</span>
              </div>
              
              {/* Show modifiers indented below if they exist */}
              {modifiersToShow.length > 0 && (
                modifiersToShow.map((modifier, modIndex) => (
                  <div key={modIndex} style={styles.modifierRow}>
                    <span style={styles.modifierName}>{modifier.name}</span>
                    <span style={styles.modifierPrice}>${parseFloat(modifier.price || 0).toFixed(2)}</span>
                  </div>
                ))
              )}
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
        );
      })}
    </div>
  );
};

export default CartItems;