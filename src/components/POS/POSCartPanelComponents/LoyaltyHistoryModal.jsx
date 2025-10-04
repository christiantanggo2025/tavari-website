// src/components/POS/POSCartPanelComponents/LoyaltyHistoryModal.jsx
import React from 'react';
import { X } from 'lucide-react';
import { TavariStyles } from '../../../utils/TavariStyles';

const LoyaltyHistoryModal = ({
  show,
  onClose,
  loyaltyHistory = [],
  usedToday = 0,
  historyLoading = false,
  loyaltySettings,
  onTransactionClick
}) => {
  if (!show) return null;

  const styles = {
    loyaltyModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    },
    
    loyaltyModalContent: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: TavariStyles.shadows.xl,
      position: 'relative'
    },
    
    loyaltyModalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      flexShrink: 0
    },
    
    loyaltyModalTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    
    loyaltyModalBody: {
      flex: 1,
      padding: TavariStyles.spacing.lg,
      overflowY: 'auto'
    },
    
    loadingMessage: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    emptyMessage: {
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      padding: TavariStyles.spacing.xl,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    usageSummary: {
      marginBottom: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.successBg,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.success}30`
    },
    
    usageSummaryText: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      margin: 0
    },
    
    loyaltyTransaction: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    transactionLeft: {
      flex: 1
    },
    
    transactionNumber: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.primary,
      cursor: 'pointer',
      textDecoration: 'underline'
    },
    
    transactionTime: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500,
      marginTop: '2px'
    },
    
    transactionAmount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.danger
    },
    
    closeButton: {
      background: 'transparent',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: TavariStyles.colors.gray600,
      padding: TavariStyles.spacing.xs,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: TavariStyles.borderRadius.sm,
      transition: TavariStyles.transitions.fast
    }
  };

  return (
    <div style={styles.loyaltyModal} onClick={(e) => e.stopPropagation()}>
      <div style={styles.loyaltyModalContent}>
        <div style={styles.loyaltyModalHeader}>
          <h3 style={styles.loyaltyModalTitle}>Today's Loyalty Usage</h3>
          <button 
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = TavariStyles.colors.gray100;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={styles.loyaltyModalBody}>
          {historyLoading ? (
            <div style={styles.loadingMessage}>
              Loading transaction history...
            </div>
          ) : loyaltyHistory.length === 0 ? (
            <div>
              <div style={styles.usageSummary}>
                <p style={styles.usageSummaryText}>
                  <strong>Total used today:</strong> ${usedToday.toFixed(2)}
                </p>
              </div>
              <div style={styles.emptyMessage}>
                No loyalty transactions found for today.
                {usedToday === 0 && (
                  <div style={{ marginTop: TavariStyles.spacing.sm, fontSize: TavariStyles.typography.fontSize.xs }}>
                    This customer hasn't used any loyalty rewards yet today.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div style={styles.usageSummary}>
                <p style={styles.usageSummaryText}>
                  <strong>Total used today:</strong> ${usedToday.toFixed(2)} ({loyaltyHistory.length} transactions)
                </p>
              </div>
              
              {loyaltyHistory.map((transaction, index) => (
                <div key={index} style={styles.loyaltyTransaction}>
                  <div style={styles.transactionLeft}>
                    <div 
                      style={styles.transactionNumber}
                      onClick={() => onTransactionClick(transaction)}
                    >
                      Transaction #{transaction.transaction_id?.slice(-8) || 'Unknown'}
                    </div>
                    <div style={styles.transactionTime}>
                      {new Date(transaction.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={styles.transactionAmount}>
                    {loyaltySettings?.loyalty_mode === 'points' && Math.abs(transaction.amount) > 100
                      ? `-$${((Math.abs(transaction.amount) / loyaltySettings.redemption_rate) * 10).toFixed(2)}`
                      : `-$${Math.abs(transaction.amount).toFixed(2)}`
                    }
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyHistoryModal;