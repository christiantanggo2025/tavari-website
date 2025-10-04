// components/POS/TabScreenModals.jsx - Updated with Foundation Components
import React, { useState } from 'react';
import BarcodeScanHandler from './BarcodeScanHandler';
import { TavariStyles } from '../../utils/TavariStyles';
import POSAuthWrapper from '../Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';

// ManagerOverrideModal Component
export const ManagerOverrideModal = ({
  showModal,
  onClose,
  overrideReason,
  onApproveOverride,
  error
}) => {
  const [managerPin, setManagerPin] = useState('');
  
  // Authentication context
  const auth = usePOSAuth({
    requireBusiness: false,
    componentName: 'ManagerOverrideModal'
  });

  if (!showModal) return null;

  const handleSubmit = () => {
    console.log('ManagerOverrideModal: Submitting manager PIN for override');
    onApproveOverride(managerPin);
  };

  const styles = createModalStyles();

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Manager Override Required</h3>
          <button
            style={styles.closeModalButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <p style={styles.reasonText}>{overrideReason}</p>
        
        {error && (
          <div style={TavariStyles.utils.merge(styles.banner, styles.errorBanner)}>
            {error}
          </div>
        )}
        
        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Manager PIN</label>
            <input
              type="password"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              placeholder="Enter manager PIN"
              style={styles.input}
              autoFocus
            />
          </div>
        </div>
        
        <div style={styles.modalActions}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={TavariStyles.utils.merge(
              styles.submitButton,
              !managerPin ? styles.disabledButton : {}
            )}
            onClick={handleSubmit}
            disabled={!managerPin}
          >
            Approve Override
          </button>
        </div>
      </div>
    </div>
  );
};

// TabDetailsModal Component
export const TabDetailsModal = ({
  showModal,
  onClose,
  selectedTab,
  onAddItems,
  onMakePayment,
  formatCurrency
}) => {
  // Authentication and tax calculation context
  const auth = usePOSAuth({
    requireBusiness: true,
    componentName: 'TabDetailsModal'
  });

  const { calculateTotalTax, formatTaxAmount, getTaxSummary } = useTaxCalculations(auth.selectedBusinessId);

  if (!showModal || !selectedTab) return null;

  // Calculate tax breakdown for the tab items
  const getTabTaxDetails = () => {
    if (!selectedTab.pos_tab_items || selectedTab.pos_tab_items.length === 0) {
      return { totalTax: 0, taxSummary: [] };
    }

    try {
      // Convert tab items to cart format for tax calculation
      const cartItems = selectedTab.pos_tab_items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.unit_price || item.total_price / item.quantity,
        quantity: item.quantity,
        category_id: item.category_id,
        item_tax_overrides: item.item_tax_overrides,
        modifiers: item.modifiers || []
      }));

      const taxBreakdown = calculateTotalTax(cartItems, 0, 0, selectedTab.subtotal);
      const taxSummary = getTaxSummary(taxBreakdown);

      return {
        totalTax: taxBreakdown.totalTax,
        taxSummary,
        taxBreakdown
      };
    } catch (err) {
      console.warn('TabDetailsModal: Error calculating tax breakdown:', err);
      return { totalTax: selectedTab.tax_amount || 0, taxSummary: [] };
    }
  };

  const taxDetails = getTabTaxDetails();
  const styles = createModalStyles();

  const ModalContent = () => (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Tab Details - {selectedTab.tab_number}</h3>
          <button
            style={styles.closeModalButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div style={styles.tabDetails}>
          {/* Customer Information Section */}
          <div style={styles.detailSection}>
            <h4 style={styles.sectionTitle}>Customer Information</h4>
            <div style={styles.detailRow}>
              <strong>Name:</strong> {selectedTab.customer_name}
            </div>
            {selectedTab.customer_phone && (
              <div style={styles.detailRow}>
                <strong>Phone:</strong> {selectedTab.customer_phone}
              </div>
            )}
            {selectedTab.customer_email && (
              <div style={styles.detailRow}>
                <strong>Email:</strong> {selectedTab.customer_email}
              </div>
            )}
            {selectedTab.pos_loyalty_accounts && (
              <div style={styles.detailRow}>
                <strong>Loyalty Member:</strong> Yes (Balance: {formatCurrency(selectedTab.pos_loyalty_accounts.balance || 0)})
              </div>
            )}
            {selectedTab.notes && (
              <div style={styles.detailRow}>
                <strong>Notes:</strong> {selectedTab.notes}
              </div>
            )}
          </div>
          
          {/* Financial Summary Section */}
          <div style={styles.detailSection}>
            <h4 style={styles.sectionTitle}>Financial Summary</h4>
            <div style={styles.detailRow}>
              <strong>Subtotal:</strong> {formatCurrency(selectedTab.subtotal)}
            </div>
            
            {/* Tax Breakdown */}
            {taxDetails.taxSummary.length > 0 && (
              <div style={styles.taxBreakdownSection}>
                <div style={styles.taxTitle}>Tax Breakdown:</div>
                {taxDetails.taxSummary.map((taxItem, index) => (
                  <div key={index} style={styles.taxRow}>
                    <span>{taxItem.name}:</span>
                    <span style={{
                      color: taxItem.type === 'rebate' ? TavariStyles.colors.success : TavariStyles.colors.gray700
                    }}>
                      {taxItem.display}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div style={styles.detailRow}>
              <strong>Total Tax:</strong> {formatCurrency(taxDetails.totalTax)}
            </div>
            <div style={styles.detailRow}>
              <strong>Total Amount:</strong> {formatCurrency(selectedTab.total_amount)}
            </div>
            <div style={styles.detailRow}>
              <strong>Amount Paid:</strong> {formatCurrency(selectedTab.amount_paid)}
            </div>
            <div style={TavariStyles.utils.merge(
              styles.detailRow,
              selectedTab.balance_remaining > 0 ? styles.balanceOwed : styles.balancePaid
            )}>
              <strong>Balance Remaining:</strong> {formatCurrency(selectedTab.balance_remaining)}
            </div>
          </div>
          
          {/* Items Section */}
          <div style={styles.detailSection}>
            <h4 style={styles.sectionTitle}>
              Items ({selectedTab.pos_tab_items?.length || 0})
            </h4>
            {selectedTab.pos_tab_items?.length > 0 ? (
              <div style={styles.itemsList}>
                {selectedTab.pos_tab_items.map((item, index) => (
                  <div key={index} style={styles.itemRow}>
                    <div style={styles.itemInfo}>
                      <span style={styles.itemName}>
                        {item.quantity}x {item.name}
                      </span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={styles.itemModifiers}>
                          {item.modifiers.map((mod, modIndex) => (
                            <span key={modIndex} style={styles.modifierText}>
                              • {mod.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={styles.itemPrice}>
                      {formatCurrency(item.total_price)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.emptyItems}>No items added yet</p>
            )}
          </div>
        </div>
        
        <div style={styles.modalActions}>
          <button
            style={styles.actionButton}
            onClick={() => onAddItems(selectedTab)}
          >
            Add Items
          </button>
          {selectedTab.balance_remaining > 0 && (
            <button
              style={styles.payButton}
              onClick={() => onMakePayment(selectedTab)}
            >
              Make Payment ({formatCurrency(selectedTab.balance_remaining)})
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <POSAuthWrapper
      requireBusiness={true}
      componentName="TabDetailsModal"
    >
      <ModalContent />
    </POSAuthWrapper>
  );
};

// QRManualInputModal Component
export const QRManualInputModal = ({
  showModal,
  onClose,
  onSubmit,
  value,
  onChange,
  placeholder = "Paste or type the QR code data here...",
  title = "Enter QR Code Manually",
  instructions = "Enter the QR code data"
}) => {
  if (!showModal) return null;

  const styles = createModalStyles();

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button
            style={styles.closeModalButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>QR Code Value:</label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              style={styles.input}
              autoFocus
            />
            <p style={styles.instructions}>
              {instructions}
            </p>
          </div>
        </div>
        
        <div style={styles.modalActions}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={TavariStyles.utils.merge(
              styles.submitButton,
              !value.trim() ? styles.disabledButton : {}
            )}
            onClick={onSubmit}
            disabled={!value.trim()}
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
};

// QRScannerModal Component
export const QRScannerModal = ({
  showModal,
  onClose,
  onScan,
  title = "Scan QR Code",
  instructions = "Scan the QR code"
}) => {
  if (!showModal) return null;

  const styles = createModalStyles();

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button
            style={styles.closeModalButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <BarcodeScanHandler onScan={onScan} />
        
        <div style={styles.qrInputSection}>
          <p style={styles.instructions}>
            {instructions}
          </p>
          
          <div style={styles.modalActions}>
            <button
              style={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Shared styles function using TavariStyles
const createModalStyles = () => ({
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)'
  },
  
  modalContent: {
    backgroundColor: TavariStyles.colors.white,
    padding: TavariStyles.spacing['3xl'],
    borderRadius: TavariStyles.borderRadius.xl,
    maxWidth: '700px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: TavariStyles.shadows.modal,
    border: `2px solid ${TavariStyles.colors.primary}`
  },
  
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TavariStyles.spacing.xl,
    paddingBottom: TavariStyles.spacing.lg,
    borderBottom: `2px solid ${TavariStyles.colors.primary}`
  },
  
  modalTitle: {
    margin: 0,
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800
  },
  
  closeModalButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: TavariStyles.typography.fontSize['2xl'],
    cursor: 'pointer',
    color: TavariStyles.colors.gray500,
    padding: TavariStyles.spacing.sm,
    borderRadius: TavariStyles.borderRadius.md,
    transition: TavariStyles.transitions.normal,
    ':hover': {
      backgroundColor: TavariStyles.colors.gray100,
      color: TavariStyles.colors.gray700
    }
  },
  
  banner: {
    padding: TavariStyles.spacing.lg,
    borderRadius: TavariStyles.borderRadius.md,
    marginBottom: TavariStyles.spacing.lg,
    fontWeight: TavariStyles.typography.fontWeight.medium
  },
  
  errorBanner: {
    backgroundColor: TavariStyles.colors.errorBg,
    color: TavariStyles.colors.errorText,
    border: `1px solid ${TavariStyles.colors.danger}`
  },
  
  reasonText: {
    margin: `${TavariStyles.spacing.sm} 0 ${TavariStyles.spacing.lg} 0`,
    color: TavariStyles.colors.gray700,
    fontSize: TavariStyles.typography.fontSize.base,
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  },
  
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.lg
  },
  
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  
  label: {
    ...TavariStyles.components.form.label,
    marginBottom: TavariStyles.spacing.sm
  },
  
  input: {
    ...TavariStyles.components.form.input,
    fontSize: TavariStyles.typography.fontSize.lg
  },
  
  instructions: {
    fontSize: TavariStyles.typography.fontSize.sm,
    marginTop: TavariStyles.spacing.sm,
    color: TavariStyles.colors.gray500,
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  },
  
  tabDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.xl
  },
  
  detailSection: {
    backgroundColor: TavariStyles.colors.gray50,
    padding: TavariStyles.spacing.lg,
    borderRadius: TavariStyles.borderRadius.lg,
    border: `1px solid ${TavariStyles.colors.gray200}`
  },
  
  sectionTitle: {
    margin: `0 0 ${TavariStyles.spacing.md} 0`,
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800
  },
  
  detailRow: {
    margin: `${TavariStyles.spacing.sm} 0`,
    fontSize: TavariStyles.typography.fontSize.base,
    color: TavariStyles.colors.gray700,
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  },
  
  balanceOwed: {
    color: TavariStyles.colors.danger,
    fontWeight: TavariStyles.typography.fontWeight.semibold
  },
  
  balancePaid: {
    color: TavariStyles.colors.success,
    fontWeight: TavariStyles.typography.fontWeight.semibold
  },
  
  taxBreakdownSection: {
    backgroundColor: TavariStyles.colors.white,
    padding: TavariStyles.spacing.md,
    borderRadius: TavariStyles.borderRadius.md,
    margin: `${TavariStyles.spacing.sm} 0`,
    border: `1px solid ${TavariStyles.colors.gray300}`
  },
  
  taxTitle: {
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    marginBottom: TavariStyles.spacing.sm,
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray700
  },
  
  taxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: `${TavariStyles.spacing.xs} 0`,
    fontSize: TavariStyles.typography.fontSize.sm
  },
  
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.sm,
    marginTop: TavariStyles.spacing.md
  },
  
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: TavariStyles.spacing.md,
    backgroundColor: TavariStyles.colors.white,
    borderRadius: TavariStyles.borderRadius.md,
    border: `1px solid ${TavariStyles.colors.gray200}`,
    boxShadow: TavariStyles.shadows.sm
  },
  
  itemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  
  itemName: {
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.medium,
    color: TavariStyles.colors.gray800,
    marginBottom: TavariStyles.spacing.xs
  },
  
  itemModifiers: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.xs
  },
  
  modifierText: {
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray600,
    fontStyle: 'italic',
    marginLeft: TavariStyles.spacing.sm
  },
  
  itemPrice: {
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    color: TavariStyles.colors.success
  },
  
  emptyItems: {
    textAlign: 'center',
    color: TavariStyles.colors.gray400,
    fontStyle: 'italic',
    padding: TavariStyles.spacing.xl,
    fontSize: TavariStyles.typography.fontSize.base
  },
  
  qrInputSection: {
    marginTop: TavariStyles.spacing.xl,
    padding: TavariStyles.spacing.xl,
    backgroundColor: TavariStyles.colors.gray50,
    borderRadius: TavariStyles.borderRadius.lg,
    border: `1px solid ${TavariStyles.colors.gray200}`
  },
  
  modalActions: {
    display: 'flex',
    gap: TavariStyles.spacing.lg,
    marginTop: TavariStyles.spacing.xl
  },
  
  cancelButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.secondary,
    flex: 1
  },
  
  submitButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.primary,
    flex: 1
  },
  
  actionButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.ghost,
    flex: 1
  },
  
  payButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.success,
    flex: 1
  },
  
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed'
  }
});