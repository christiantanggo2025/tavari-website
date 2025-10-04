// components/POS/POSPaymentScreenComponents/LoyaltyDisplay.jsx
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const LoyaltyDisplay = ({ 
  loyaltyCustomer, 
  loyaltySettings, 
  availableLoyaltyCredit, 
  dailyUsageRemaining,
  loyaltyPointsToEarn,
  loyaltyCreditsToEarn 
}) => {
  // FIXED: Helper function to display balance in correct format
  const getBalanceDisplay = (dollarAmount) => {
    if (!loyaltySettings) return '$0.00';
    
    // Always work with the dollar amount (balance field) as the source of truth
    // Use Math.abs to ensure we display positive values
    const balanceInDollars = Math.abs(dollarAmount || 0);
    
    if (loyaltySettings.loyalty_mode === 'points') {
      // Convert dollars to points using redemption_rate
      // redemption_rate determines how many points equal $1
      const points = Math.round(balanceInDollars * loyaltySettings.redemption_rate);
      // Ensure points are always positive for display
      const displayPoints = Math.abs(points);
      return `${displayPoints.toLocaleString()} pts`;
    }
    return `$${balanceInDollars.toFixed(2)}`;
  };

  if (!loyaltyCustomer || !loyaltySettings?.is_active) {
    return null;
  }

  const styles = {
    customerBanner: {
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    
    summaryItemLoyalty: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.success,
      backgroundColor: TavariStyles.colors.successBg,
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.sm
    },
    
    summaryItemEarn: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.warning,
      backgroundColor: TavariStyles.colors.warningBg,
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.sm
    }
  };

  return (
    <>
      <div style={styles.customerBanner}>
        Customer: {loyaltyCustomer.customer_name}
        <br />
        Available: {getBalanceDisplay(availableLoyaltyCredit)} | 
        Total Balance: {getBalanceDisplay(loyaltyCustomer.balance || 0)}
        <br />
        Daily Limit Remaining: {getBalanceDisplay(dailyUsageRemaining)}
      </div>
      
      {/* Loyalty redemption in summary */}
      {availableLoyaltyCredit > 0 && (
        <div style={styles.summaryItemLoyalty}>
          <span>Loyalty Credit Available:</span>
          <span>{getBalanceDisplay(availableLoyaltyCredit)}</span>
        </div>
      )}
      
      {/* Points earning preview */}
      {loyaltyPointsToEarn > 0 && (
        <div style={styles.summaryItemEarn}>
          <span>Points to Earn:</span>
          <span>{getBalanceDisplay(loyaltyCreditsToEarn)} (available tomorrow)</span>
        </div>
      )}
    </>
  );
};

export default LoyaltyDisplay;