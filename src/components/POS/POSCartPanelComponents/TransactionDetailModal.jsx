// src/components/POS/POSCartPanelComponents/TransactionDetailModal.jsx
import React from 'react';
import { X } from 'lucide-react';
import { TavariStyles } from '../../../utils/TavariStyles';

const TransactionDetailModal = ({
  show,
  onClose,
  selectedTransaction,
  transactionLoading = false
}) => {
  if (!show) return null;

  const styles = {
    transactionModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    },
    
    transactionModalContent: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: TavariStyles.shadows.xl
    },
    
    transactionModalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      borderTopLeftRadius: TavariStyles.borderRadius.lg,
      borderTopRightRadius: TavariStyles.borderRadius.lg
    },
    
    transactionModalBody: {
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
    
    loyaltyModalTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.white,
      margin: 0
    },
    
    transactionDetail: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    detailSection: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    detailSectionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`,
      paddingBottom: TavariStyles.spacing.sm
    },
    
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${TavariStyles.spacing.sm} 0`,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`
    },
    
    detailLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    detailValue: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray800,
      fontWeight: TavariStyles.typography.fontWeight.semibold
    },
    
    saleItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      marginBottom: TavariStyles.spacing.sm
    },
    
    saleItemName: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray800
    },
    
    saleItemDetails: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      marginTop: '2px'
    },
    
    saleItemPrice: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      textAlign: 'right'
    },
    
    errorMessage: {
      backgroundColor: TavariStyles.colors.warningBg,
      color: TavariStyles.colors.warningText,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.sm,
      marginBottom: TavariStyles.spacing.md,
      border: `1px solid ${TavariStyles.colors.warning}`
    },
    
    closeButton: {
      background: 'transparent',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: TavariStyles.colors.white,
      padding: TavariStyles.spacing.xs,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: TavariStyles.borderRadius.sm,
      transition: TavariStyles.transitions.fast
    }
  };

  return (
    <div style={styles.transactionModal} onClick={(e) => e.stopPropagation()}>
      <div style={styles.transactionModalContent}>
        <div style={styles.transactionModalHeader}>
          <h3 style={styles.loyaltyModalTitle}>
            Transaction Details #{selectedTransaction?.transaction_id?.slice(-8) || 'Unknown'}
          </h3>
          <button 
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={styles.transactionModalBody}>
          {transactionLoading ? (
            <div style={styles.loadingMessage}>
              Loading transaction details...
            </div>
          ) : selectedTransaction ? (
            <div style={styles.transactionDetail}>
              {selectedTransaction.error_message && (
                <div style={styles.errorMessage}>
                  {selectedTransaction.error_message}
                </div>
              )}
              
              {/* Transaction Info Section */}
              <div style={styles.detailSection}>
                <h4 style={styles.detailSectionTitle}>Transaction Information</h4>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Date:</span>
                  <span style={styles.detailValue}>
                    {new Date(selectedTransaction.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Time:</span>
                  <span style={styles.detailValue}>
                    {new Date(selectedTransaction.created_at).toLocaleTimeString()}
                  </span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Type:</span>
                  <span style={styles.detailValue}>
                    {selectedTransaction.transaction_type.charAt(0).toUpperCase() + selectedTransaction.transaction_type.slice(1)}
                  </span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Amount:</span>
                  <span style={styles.detailValue}>
                    ${Math.abs(selectedTransaction.amount).toFixed(2)}
                  </span>
                </div>
                
                {selectedTransaction.description && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Description:</span>
                    <span style={styles.detailValue}>
                      {selectedTransaction.description}
                    </span>
                  </div>
                )}
              </div>

              {/* Sale Items Section */}
              {selectedTransaction.sale_items && selectedTransaction.sale_items.length > 0 && (
                <div style={styles.detailSection}>
                  <h4 style={styles.detailSectionTitle}>Items Purchased</h4>
                  {selectedTransaction.sale_items.map((item, index) => (
                    <div key={index} style={styles.saleItem}>
                      <div>
                        <div style={styles.saleItemName}>
                          {item.pos_inventory?.name || item.name || 'Unknown Item'}
                        </div>
                        <div style={styles.saleItemDetails}>
                          Qty: {item.quantity} × ${(item.unit_price || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={styles.saleItemPrice}>
                        ${(item.total_price || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Methods Section */}
              {selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
                <div style={styles.detailSection}>
                  <h4 style={styles.detailSectionTitle}>Payment Methods</h4>
                  {selectedTransaction.payments.map((payment, index) => (
                    <div key={index} style={styles.detailRow}>
                      <span style={styles.detailLabel}>
                        {payment.payment_method || payment.method || 'Unknown'}:
                      </span>
                      <span style={styles.detailValue}>
                        ${(payment.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sale Totals Section */}
              {selectedTransaction.sale_data && (
                <div style={styles.detailSection}>
                  <h4 style={styles.detailSectionTitle}>Sale Summary</h4>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Sale Number:</span>
                    <span style={styles.detailValue}>
                      {selectedTransaction.sale_data.sale_number || 'N/A'}
                    </span>
                  </div>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Subtotal:</span>
                    <span style={styles.detailValue}>
                      ${(selectedTransaction.sale_data.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Tax:</span>
                    <span style={styles.detailValue}>
                      ${(selectedTransaction.sale_data.tax || 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Total:</span>
                    <span style={styles.detailValue}>
                      ${(selectedTransaction.sale_data.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptyMessage}>
              No transaction details available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;