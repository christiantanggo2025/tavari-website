// components/POS/POSPaymentScreenComponents/PaymentMethods.jsx - Fixed
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const PaymentMethods = ({
  currentPayment,
  setCurrentPayment,
  loyaltySettings,
  availableLoyaltyCredit,
  remainingBalance,
  getBalanceDisplay,
  showCustomMethod,
  setShowCustomMethod,
  customMethodName,
  setCustomMethodName
}) => {
  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: '💵' },
    { id: 'card', name: 'Credit/Debit', icon: '💳' },
    { id: 'helcim', name: 'Helcim QR', icon: '📱' },
    { id: 'gift_card', name: 'Gift Card', icon: '🎁' },
    { id: 'loyalty_credit', name: 'Loyalty Credit', icon: '⭐' },
    { id: 'custom', name: 'Custom Method', icon: '⚙️' }
  ];

  const handleMethodSelect = (method) => {
    console.log('Payment method selected:', {
      payment_method: method.id,
      previous_method: currentPayment.method
    });
    
    setCurrentPayment({ 
      method: method.id, 
      amount: method.id === 'loyalty_credit' ? 
        Math.min(availableLoyaltyCredit, remainingBalance).toFixed(2) :
        remainingBalance > 0 ? remainingBalance.toFixed(2) : ''
    });
    setShowCustomMethod(method.id === 'custom');
  };

  const handleCustomMethodChange = (e) => {
    setCustomMethodName(e.target.value);
    console.log('Custom payment method entered:', {
      method_name: e.target.value
    });
  };

  const styles = {
    methodsContainer: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    paymentMethods: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg
    },
    
    methodButton: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      color: TavariStyles.colors.primary,
      border: `2px solid ${TavariStyles.colors.primary}`,
      borderRadius: TavariStyles.borderRadius.lg,
      cursor: 'pointer',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      transition: TavariStyles.transitions.normal,
      minHeight: '80px',
      justifyContent: 'center'
    },
    
    methodButtonActive: {
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white
    },
    
    methodIcon: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      marginBottom: TavariStyles.spacing.xs
    },
    
    customMethodInput: {
      marginTop: TavariStyles.spacing.md
    },
    
    loyaltyInfo: {
      fontSize: TavariStyles.typography.fontSize.xs,
      opacity: 0.8,
      marginTop: TavariStyles.spacing.xs,
      textAlign: 'center'
    }
  };

  return (
    <div style={styles.methodsContainer}>
      <div style={styles.paymentMethods}>
        {paymentMethods.map(method => {
          // Hide loyalty credit if no loyalty system or no available credit
          if (method.id === 'loyalty_credit' && (!loyaltySettings?.is_active || availableLoyaltyCredit <= 0)) {
            return null;
          }
          
          const isActive = currentPayment.method === method.id;
          
          return (
            <button
              key={method.id}
              style={{
                ...styles.methodButton,
                ...(isActive ? styles.methodButtonActive : {})
              }}
              onClick={() => handleMethodSelect(method)}
            >
              <span style={styles.methodIcon}>{method.icon}</span>
              <span>{method.name}</span>
              {method.id === 'loyalty_credit' && getBalanceDisplay && (
                <div style={styles.loyaltyInfo}>
                  {getBalanceDisplay(availableLoyaltyCredit)} available
                </div>
              )}
            </button>
          );
        })}
      </div>

      {showCustomMethod && (
        <div style={styles.customMethodInput}>
          <input
            type="text"
            value={customMethodName}
            onChange={handleCustomMethodChange}
            placeholder="Enter payment method name"
            style={TavariStyles.components.form.input}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;