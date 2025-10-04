// components/POS/POSRefundComponents/RefundTransactionCard.jsx - Individual Transaction Card Component
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const RefundTransactionCard = ({ 
  transaction, 
  qrScanResult, 
  onSelect 
}) => {
  const formatCurrency = (amount) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  const getTransactionStatus = (transaction) => {
    if (transaction.remaining_refundable <= 0) {
      return { 
        text: 'Fully Refunded', 
        color: TavariStyles.colors.danger, 
        bgColor: TavariStyles.colors.errorBg 
      };
    } else if (transaction.total_refunded > 0) {
      return { 
        text: 'Partially Refunded', 
        color: TavariStyles.colors.warning, 
        bgColor: TavariStyles.colors.warningBg 
      };
    } else {
      return { 
        text: 'Refundable', 
        color: TavariStyles.colors.success, 
        bgColor: TavariStyles.colors.successBg 
      };
    }
  };

  const status = getTransactionStatus(transaction);
  const isHighlighted = qrScanResult?.id === transaction.id;

  const styles = {
    transactionCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      border: `2px solid ${isHighlighted ? TavariStyles.colors.success : TavariStyles.colors.gray200}`,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal,
      backgroundColor: isHighlighted ? TavariStyles.colors.successBg : TavariStyles.colors.white,
      boxShadow: isHighlighted ? TavariStyles.shadows.lg : TavariStyles.shadows.base,
      ':hover': {
        borderColor: TavariStyles.colors.primary,
        transform: 'translateY(-2px)',
        boxShadow: TavariStyles.shadows.md
      }
    },
    transactionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: TavariStyles.spacing.lg
    },
    transactionInfo: {
      flex: 1
    },
    saleNumber: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.xs,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    qrFoundBadge: {
      fontSize: TavariStyles.typography.fontSize.xs,
      backgroundColor: TavariStyles.colors.success,
      color: TavariStyles.colors.white,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.full,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    transactionDate: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      marginBottom: TavariStyles.spacing.xs
    },
    customerName: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    transactionAmounts: {
      textAlign: 'right',
      minWidth: '150px'
    },
    originalAmount: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.xs
    },
    refundedAmount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.danger,
      marginBottom: TavariStyles.spacing.xs
    },
    remainingAmount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.success,
      fontWeight: TavariStyles.typography.fontWeight.semibold
    },
    transactionFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    itemCount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500
    },
    statusBadge: {
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: status.color,
      backgroundColor: status.bgColor
    },
    clickPrompt: {
      marginTop: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray400,
      fontStyle: 'italic'
    }
  };

  return (
    <div 
      style={styles.transactionCard}
      onClick={() => onSelect(transaction)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = TavariStyles.colors.primary;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = TavariStyles.shadows.md;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isHighlighted ? TavariStyles.colors.success : TavariStyles.colors.gray200;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isHighlighted ? TavariStyles.shadows.lg : TavariStyles.shadows.base;
      }}
    >
      <div style={styles.transactionHeader}>
        <div style={styles.transactionInfo}>
          <div style={styles.saleNumber}>
            Sale #{transaction.sale_number}
            {isHighlighted && (
              <span style={styles.qrFoundBadge}>QR Found</span>
            )}
          </div>
          <div style={styles.transactionDate}>
            {new Date(transaction.created_at).toLocaleString()}
          </div>
          {transaction.customer_name && (
            <div style={styles.customerName}>
              Customer: {transaction.customer_name}
            </div>
          )}
        </div>
        
        <div style={styles.transactionAmounts}>
          <div style={styles.originalAmount}>
            Original: {formatCurrency(transaction.total)}
          </div>
          {transaction.total_refunded > 0 && (
            <div style={styles.refundedAmount}>
              Refunded: {formatCurrency(transaction.total_refunded)}
            </div>
          )}
          <div style={styles.remainingAmount}>
            Remaining: {formatCurrency(transaction.remaining_refundable)}
          </div>
        </div>
      </div>
      
      <div style={styles.transactionFooter}>
        <div style={styles.itemCount}>
          {transaction.pos_sale_items?.length || 0} items
        </div>
        
        <div style={styles.statusBadge}>
          {status.text}
        </div>
      </div>
      
      <div style={styles.clickPrompt}>
        Click to process refund
      </div>
    </div>
  );
};

export default RefundTransactionCard;