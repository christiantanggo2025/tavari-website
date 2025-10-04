// components/POS/POSPaymentScreenComponents/TipControls.jsx - Fixed
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const TipControls = ({
  tipAmount,
  onTipChange,
  saleSubtotal
}) => {
  const handleTipPercentage = (percentage) => {
    const tip = saleSubtotal * percentage;
    const roundedTip = Math.round(tip * 100) / 100;
    onTipChange(roundedTip);
    
    console.log('Tip percentage applied:', {
      percentage: percentage,
      subtotal: saleSubtotal,
      calculated_tip: tip,
      rounded_tip: roundedTip
    });
  };

  const handleNoTip = () => {
    onTipChange(0);
    console.log('Tip removed:', { 
      previous_tip: tipAmount,
      removal_method: 'no_tip_button'
    });
  };

  const handleCustomTip = (e) => {
    const newTip = Number(e.target.value) || 0;
    const roundedTip = Math.max(0, Math.round(newTip * 100) / 100);
    onTipChange(roundedTip);
    
    console.log('Custom tip entered:', {
      entered_value: e.target.value,
      calculated_tip: newTip,
      final_tip: roundedTip
    });
  };

  const styles = {
    section: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl
    },
    
    sectionTitle: {
      margin: 0,
      marginBottom: TavariStyles.spacing.lg,
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`,
      paddingBottom: TavariStyles.spacing.sm
    },
    
    tipControls: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      flexWrap: 'wrap',
      alignItems: 'center'
    },

    tipButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.sm
    },

    noTipButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.ghost,
      ...TavariStyles.components.button.sizes.sm,
      border: `2px solid ${TavariStyles.colors.gray400}`,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.semibold
    },

    customTipInput: {
      ...TavariStyles.components.form.input,
      width: '100px',
      textAlign: 'center'
    },

    tipDisplay: {
      marginTop: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    }
  };

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Tip Amount</h3>
      <div style={styles.tipControls}>
        <button 
          style={styles.noTipButton}
          onClick={handleNoTip}
          title="Remove tip completely"
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
          onChange={handleCustomTip}
          style={styles.customTipInput}
          placeholder="Custom tip"
          step="0.01"
          min="0"
          onFocus={(e) => e.target.select()}
          title="Enter custom tip amount"
        />
      </div>
      {tipAmount > 0 && (
        <div style={styles.tipDisplay}>
          Current tip: ${tipAmount.toFixed(2)} ({((tipAmount / saleSubtotal) * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  );
};

export default TipControls;