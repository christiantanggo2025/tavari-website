// components/POS/ItemSelectionModal.jsx - Fixed checkbox interaction
import React from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../UI/TavariCheckbox';

const ItemSelectionModal = ({
  showModal,
  onClose,
  selectedPaymentTab,
  selectedItems,
  onItemToggle,
  onSelectAllItems,
  onClearItemSelection,
  onProceedToCustomerSelection,
  formatCurrency
}) => {
  if (!showModal || !selectedPaymentTab) return null;

  // Handle checkbox click separately to prevent double-toggle
  const handleCheckboxChange = (item, checked, event) => {
    // Stop event propagation to prevent row click
    event?.stopPropagation();
    
    // Only toggle if the checkbox state doesn't match our expected state
    const isCurrentlySelected = selectedItems.some(selected => selected.id === item.id);
    if (checked !== isCurrentlySelected) {
      onItemToggle(item);
    }
  };

  // Handle row click (excluding checkbox area)
  const handleRowClick = (item, event) => {
    // Don't toggle if the click originated from the checkbox area
    if (event.target.closest('.tavari-checkbox-wrapper')) {
      return;
    }
    onItemToggle(item);
  };

  const styles = {
    modal: {
      ...TavariStyles.components.modal.overlay
    },
    modalContent: {
      ...TavariStyles.components.modal.content,
      padding: TavariStyles.spacing['3xl'],
      borderRadius: TavariStyles.borderRadius.xl,
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalHeader: {
      ...TavariStyles.components.modal.header,
      marginBottom: TavariStyles.spacing['2xl'],
      paddingBottom: TavariStyles.spacing.lg,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`
    },
    modalTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    closeModalButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: TavariStyles.typography.fontSize['3xl'],
      cursor: 'pointer',
      color: TavariStyles.colors.gray400,
      padding: 0,
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: TavariStyles.borderRadius.sm,
      transition: TavariStyles.transitions.normal
    },
    itemSelectionContent: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xl,
      maxHeight: '60vh',
      overflow: 'hidden'
    },
    itemSelectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    customerInfo: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray700
    },
    customerName: {
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    selectionActions: {
      display: 'flex',
      gap: TavariStyles.spacing.md
    },
    selectAllButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.sm
    },
    clearSelectionButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.sm,
      backgroundColor: TavariStyles.colors.gray500,
      color: TavariStyles.colors.white
    },
    itemsList: {
      flex: 1,
      overflowY: 'auto',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      borderRadius: TavariStyles.borderRadius.md,
      backgroundColor: TavariStyles.colors.white
    },
    itemSelectionRow: {
      display: 'flex',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal
    },
    itemSelectionRowSelected: {
      backgroundColor: TavariStyles.colors.gray50,
      borderLeft: `4px solid ${TavariStyles.colors.primary}`
    },
    itemSelectionCheckbox: {
      marginRight: TavariStyles.spacing.md,
      // Add class name for event targeting
      className: 'tavari-checkbox-wrapper'
    },
    itemSelectionDetails: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs
    },
    itemSelectionName: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    itemSelectionModifiers: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: TavariStyles.spacing.xs
    },
    itemSelectionModifier: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      backgroundColor: TavariStyles.colors.gray100,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm
    },
    itemSelectionNotes: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic'
    },
    itemSelectionPrice: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      minWidth: '80px',
      textAlign: 'right'
    },
    noItemsText: {
      textAlign: 'center',
      color: TavariStyles.colors.gray400,
      padding: TavariStyles.spacing['4xl'],
      fontStyle: 'italic',
      fontSize: TavariStyles.typography.fontSize.lg
    },
    selectionSummary: {
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    selectionSummaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    modalActions: {
      ...TavariStyles.components.modal.footer,
      marginTop: TavariStyles.spacing['2xl'],
      padding: 0,
      border: 'none'
    },
    cancelButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.lg,
      flex: 1
    },
    submitButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg,
      flex: 1
    },
    submitButtonDisabled: {
      backgroundColor: TavariStyles.colors.gray300,
      color: TavariStyles.colors.gray500,
      cursor: 'not-allowed'
    }
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            Select Items to Pay For - {selectedPaymentTab.tab_number}
          </h3>
          <button
            style={styles.closeModalButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div style={styles.itemSelectionContent}>
          <div style={styles.itemSelectionHeader}>
            <p style={styles.customerInfo}>
              Customer: <span style={styles.customerName}>{selectedPaymentTab.customer_name}</span>
            </p>
            <div style={styles.selectionActions}>
              <button
                style={styles.selectAllButton}
                onClick={onSelectAllItems}
              >
                Select All
              </button>
              <button
                style={styles.clearSelectionButton}
                onClick={onClearItemSelection}
              >
                Clear All
              </button>
            </div>
          </div>

          <div style={styles.itemsList}>
            {selectedPaymentTab.pos_tab_items?.length > 0 ? (
              selectedPaymentTab.pos_tab_items.map((item, index) => {
                const isSelected = selectedItems.some(selected => selected.id === item.id);
                
                return (
                  <div
                    key={item.id || index}
                    style={{
                      ...styles.itemSelectionRow,
                      ...(isSelected ? styles.itemSelectionRowSelected : {})
                    }}
                    onClick={(e) => handleRowClick(item, e)}
                  >
                    <div 
                      style={styles.itemSelectionCheckbox}
                      className="tavari-checkbox-wrapper"
                    >
                      <TavariCheckbox
                        checked={isSelected}
                        onChange={(checked, event) => handleCheckboxChange(item, checked, event)}
                        size="md"
                      />
                    </div>
                    <div style={styles.itemSelectionDetails}>
                      <span style={styles.itemSelectionName}>
                        {item.quantity}x {item.name}
                      </span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={styles.itemSelectionModifiers}>
                          {item.modifiers.map((mod, modIndex) => (
                            <span key={modIndex} style={styles.itemSelectionModifier}>
                              + {mod.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <div style={styles.itemSelectionNotes}>
                          Note: {item.notes}
                        </div>
                      )}
                    </div>
                    <div style={styles.itemSelectionPrice}>
                      {formatCurrency(item.total_price)}
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={styles.noItemsText}>No items in this tab</p>
            )}
          </div>

          {selectedItems.length > 0 && (
            <div style={styles.selectionSummary}>
              <div style={styles.selectionSummaryRow}>
                <span>Selected Items: {selectedItems.length}</span>
                <span>
                  Subtotal: {formatCurrency(selectedItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.modalActions}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.submitButton,
              ...(selectedItems.length === 0 ? styles.submitButtonDisabled : {})
            }}
            onClick={onProceedToCustomerSelection}
            disabled={selectedItems.length === 0}
          >
            Continue to Customer Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemSelectionModal;