// components/POS/POSPaymentScreenComponents/PaymentAmountInput.jsx - Fixed
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const PaymentAmountInput = ({
  currentPayment,
  setCurrentPayment,
  remainingBalance,
  availableLoyaltyCredit,
  getBalanceDisplay,
  onAddPayment,
  error
}) => {
  const quickCashAmounts = [5, 10, 20, 50, 100];

  const handleAmountChange = (e) => {
    setCurrentPayment({ ...currentPayment, amount: e.target.value });
    console.log('Payment amount entered:', {
      payment_method: currentPayment.method,
      amount: e.target.value,
      remaining_balance: remainingBalance
    });
  };

  const handleQuickCash = (amount) => {
    setCurrentPayment({ method: 'cash', amount: amount.toString() });
    console.log('Quick cash selected:', {
      quick_amount: amount,
      remaining_balance: remainingBalance
    });
  };

  const handleExactAmount = () => {
    setCurrentPayment({ method: 'cash', amount: remainingBalance.toFixed(2) });
    console.log('Exact amount selected:', {
      exact_amount: remainingBalance
    });
  };

  const handleLoyaltyCredit = () => {
    if (availableLoyaltyCredit > 0) {
      const maxLoyaltyUse = Math.min(availableLoyaltyCredit, remainingBalance);
      setCurrentPayment({ method: 'loyalty_credit', amount: maxLoyaltyUse.toFixed(2) });
      
      console.log('Loyalty quick select:', {
        available_credit: availableLoyaltyCredit,
        remaining_balance: remainingBalance,
        selected_amount: maxLoyaltyUse
      });
    }
  };

  const handleAddPayment = () => {
    const amount = Number(currentPayment.amount);
    if (amount > 0) {
      onAddPayment(amount, currentPayment.method, currentPayment.method === 'custom' ? 'Custom Payment' : null);
    }
  };

  const styles = {
    amountSection: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    amountInput: {
      ...TavariStyles.components.form.input,
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      textAlign: 'center',
      marginBottom: TavariStyles.spacing.md,
      border: `2px solid ${TavariStyles.colors.primary}`
    },
    
    quickCash: {
      display: 'flex',
      gap: TavariStyles.spacing.sm,
      flexWrap: 'wrap',
      marginBottom: TavariStyles.spacing.md
    },
    
    quickCashButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.ghost,
      ...TavariStyles.components.button.sizes.sm
    },
    
    loyaltyInstructions: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.successText,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.sm,
      textAlign: 'center',
      marginBottom: TavariStyles.spacing.md
    },
    
    helcimInstructions: {
      backgroundColor: TavariStyles.colors.infoBg,
      color: TavariStyles.colors.infoText,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.sm,
      textAlign: 'center',
      marginBottom: TavariStyles.spacing.md
    },

    addPaymentButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      width: '100%',
      marginTop: TavariStyles.spacing.md
    },

    addPaymentButtonDisabled: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      width: '100%',
      marginTop: TavariStyles.spacing.md,
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  };

  const isValidAmount = currentPayment.amount && Number(currentPayment.amount) > 0;

  return (
    <div style={styles.amountSection}>
      <input
        type="number"
        value={currentPayment.amount}
        onChange={handleAmountChange}
        placeholder={`Payment amount (${remainingBalance.toFixed(2)} remaining)`}
        style={styles.amountInput}
        step="0.01"
        min="0"
        onFocus={(e) => e.target.select()}
      />
      
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
      
      {currentPayment.method === 'loyalty_credit' && availableLoyaltyCredit > 0 && (
        <div style={styles.loyaltyInstructions}>
          <p>Apply loyalty credit: {getBalanceDisplay ? getBalanceDisplay(availableLoyaltyCredit) : `${availableLoyaltyCredit.toFixed(2)}`} available</p>
          <button
            style={styles.quickCashButton}
            onClick={handleLoyaltyCredit}
          >
            Use Max Loyalty Credit
          </button>
        </div>
      )}
      
      {currentPayment.method === 'helcim' && (
        <div style={styles.helcimInstructions}>
          <p>Present QR code to customer or enter amount on Helcim terminal</p>
        </div>
      )}

      <button
        style={isValidAmount ? styles.addPaymentButton : styles.addPaymentButtonDisabled}
        onClick={handleAddPayment}
        disabled={!isValidAmount}
      >
        Add Payment
      </button>

      {error && (
        <div style={{
          ...TavariStyles.components.banner.base,
          ...TavariStyles.components.banner.variants.error,
          marginTop: TavariStyles.spacing.md
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default PaymentAmountInput;