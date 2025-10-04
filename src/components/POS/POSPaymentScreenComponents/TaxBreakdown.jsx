// components/POS/POSPaymentScreenComponents/TaxBreakdown.jsx
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const TaxBreakdown = ({ taxCalculation, taxCalc }) => {
  if (!taxCalculation || !taxCalc) {
    return null;
  }

  const styles = {
    taxBreakdownSection: {
      ...TavariStyles.pos.tax.section
    },
    
    rebateBreakdownSection: {
      backgroundColor: TavariStyles.colors.successBg,
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.success}`
    },
    
    summaryItemTax: {
      ...TavariStyles.pos.tax.row
    },
    
    summaryItemRebate: {
      ...TavariStyles.pos.tax.rebate
    }
  };

  return (
    <>
      {Object.keys(taxCalculation.aggregatedTaxes).length > 0 && (
        <div style={styles.taxBreakdownSection}>
          {Object.entries(taxCalculation.aggregatedTaxes).map(([taxName, amount]) => (
            <div key={taxName} style={styles.summaryItemTax}>
              <span>{taxName}:</span>
              <span>${taxCalc.formatTaxAmount(amount)}</span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(taxCalculation.aggregatedRebates).length > 0 && (
        <div style={styles.rebateBreakdownSection}>
          {Object.entries(taxCalculation.aggregatedRebates).map(([rebateName, amount]) => (
            <div key={rebateName} style={styles.summaryItemRebate}>
              <span>{rebateName}:</span>
              <span>-${taxCalc.formatTaxAmount(amount)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default TaxBreakdown;