// components/HR/HRPayrollComponents/PET-PayrollSummary.jsx - Payroll Summary Component
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const PETPayrollSummary = ({ payrollTotals }) => {
  const styles = {
    section: {
      marginBottom: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.sm || '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.md,
      color: TavariStyles.colors.gray800
    },
    totalsCard: {
      backgroundColor: TavariStyles.colors.primary + '10',
      border: `2px solid ${TavariStyles.colors.primary}`,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius?.lg || '12px'
    },
    totalsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: TavariStyles.spacing.md
    },
    totalItem: {
      textAlign: 'center'
    },
    totalValue: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.xs
    },
    totalLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    }
  };

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Payroll Summary</h3>
      <div style={styles.totalsCard}>
        <div style={styles.totalsGrid}>
          <div style={styles.totalItem}>
            <div style={{ ...styles.totalValue, color: TavariStyles.colors.primary }}>
              {payrollTotals.totalEmployees}
            </div>
            <div style={styles.totalLabel}>
              Employees with Hours
            </div>
          </div>
          
          <div style={styles.totalItem}>
            <div style={{ ...styles.totalValue, color: TavariStyles.colors.primary }}>
              ${payrollTotals.totalGross.toFixed(2)}
            </div>
            <div style={styles.totalLabel}>
              Total Gross Pay
            </div>
          </div>
          
          <div style={styles.totalItem}>
            <div style={{ ...styles.totalValue, color: TavariStyles.colors.success }}>
              ${payrollTotals.totalPremiums.toFixed(2)}
            </div>
            <div style={styles.totalLabel}>
              Premium Pay
            </div>
          </div>
          
          <div style={styles.totalItem}>
            <div style={{ ...styles.totalValue, color: TavariStyles.colors.warning }}>
              ${payrollTotals.totalAdditionalFedTax.toFixed(2)}
            </div>
            <div style={styles.totalLabel}>
              Additional Fed Tax
            </div>
          </div>
          
          <div style={styles.totalItem}>
            <div style={{ ...styles.totalValue, color: TavariStyles.colors.primary }}>
              ${payrollTotals.totalNet.toFixed(2)}
            </div>
            <div style={styles.totalLabel}>
              Total Net Pay
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PETPayrollSummary;