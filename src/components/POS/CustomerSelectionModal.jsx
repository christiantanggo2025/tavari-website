// components/POS/CustomerSelectionModal.jsx - Updated with Foundation Components and Dynamic Loyalty Display
import React, { useState, useEffect } from 'react';
import BarcodeScanHandler from './BarcodeScanHandler';
import POSAuthWrapper from '../Auth/POSAuthWrapper';
import TavariCheckbox from '../UI/TavariCheckbox';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { usePOSAuth } from '../../hooks/usePOSAuth';

const CustomerSelectionModal = ({
  showModal,
  onClose,
  onBackToItems,
  selectedItems = [],
  selectedPaymentTab,
  paymentCustomer,
  onCustomerSelected,
  onProceedToPayment,
  formatCurrency,
  selectedBusinessId
}) => {
  const [showQRInput, setShowQRInput] = useState(false);
  const [showQRManualInput, setShowQRManualInput] = useState(false);
  const [qrSearchValue, setQrSearchValue] = useState('');
  const [error, setError] = useState(null);
  const [includeItemBreakdown, setIncludeItemBreakdown] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState(null);
  
  // Use foundation hooks
  const auth = usePOSAuth({
    requireBusiness: true,
    componentName: 'CustomerSelectionModal'
  });
  
  const { calculateTotalTax, formatTaxAmount } = useTaxCalculations(selectedBusinessId);

  // Load loyalty settings when business ID changes
  useEffect(() => {
    const loadLoyaltySettings = async () => {
      if (selectedBusinessId) {
        try {
          const { data, error } = await supabase
            .from('pos_loyalty_settings')
            .select('loyalty_mode, earn_rate, redemption_rate, earn_rate_percentage')
            .eq('business_id', selectedBusinessId)
            .single();
          
          if (!error && data) {
            setLoyaltySettings(data);
          } else {
            // Default settings if none found
            setLoyaltySettings({
              loyalty_mode: 'points',
              earn_rate: 1000,
              redemption_rate: 10000,
              earn_rate_percentage: 1.0
            });
          }
        } catch (err) {
          console.error('Error loading loyalty settings:', err);
          // Use default settings
          setLoyaltySettings({
            loyalty_mode: 'points',
            earn_rate: 1000,
            redemption_rate: 10000,
            earn_rate_percentage: 1.0
          });
        }
      }
    };
    
    loadLoyaltySettings();
  }, [selectedBusinessId]);

  // Calculate totals including tax
  const calculateTotals = () => {
    if (!selectedItems.length) return { subtotal: 0, tax: 0, total: 0 };
    
    const subtotal = selectedItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    
    // Convert selectedItems to format expected by tax calculations
    const cartItems = selectedItems.map(item => ({
      id: item.id,
      name: item.name || item.product_name,
      price: item.price || item.unit_price,
      quantity: item.quantity,
      category_id: item.category_id,
      item_tax_overrides: item.tax_overrides,
      modifiers: item.modifiers || []
    }));

    const { totalTax, aggregatedTaxes, aggregatedRebates } = calculateTotalTax(cartItems, 0, 0, subtotal);
    const total = subtotal + totalTax;

    return { 
      subtotal, 
      tax: totalTax, 
      total,
      taxBreakdown: { aggregatedTaxes, aggregatedRebates }
    };
  };

  const { subtotal, tax, total, taxBreakdown } = calculateTotals();

  const getBalanceDisplay = (balance) => {
    return `$${(Number(balance) || 0).toFixed(2)}`;
  };

  // Dynamic loyalty display based on settings
  const getLoyaltyDisplay = (customer) => {
    if (!customer || customer.balance === undefined || !loyaltySettings) {
      return null;
    }

    const balance = Number(customer.balance) || 0;

    if (loyaltySettings.loyalty_mode === 'points') {
      // For $15.45 to show as 15,450 points, we need 1000 points per dollar
      // This means the conversion rate is: balance * 1000
      const totalPoints = Math.round(balance * 1000);
      
      console.log('Points calculation:', {
        balance,
        totalPoints,
        loyaltySettings
      });
      
      return {
        type: 'points',
        display: `${totalPoints.toLocaleString()} points`,
        value: totalPoints,
        dollarValue: balance
      };
    } else {
      // Dollar mode - show balance as dollars
      return {
        type: 'dollars',
        display: getBalanceDisplay(balance),
        value: balance,
        dollarValue: balance
      };
    }
  };

  const handleBarcodeOrQRScan = (code) => {
    console.log('Barcode/QR scanned for customer selection:', code);
    
    if (showQRInput) {
      handleCustomerQRForPayment(code);
      setShowQRInput(false);
    }
  };

  const handleCustomerQRForPayment = async (qrData) => {
    if (!selectedBusinessId) return;

    try {
      console.log('Processing customer QR for payment:', qrData);
      setError(null);
      
      let customerData = null;
      
      // Try to parse as JSON first (loyalty customer QR)
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.type === 'loyalty_customer' && parsed.customer_id) {
          const { data: loyaltyCustomer, error } = await supabase
            .from('pos_loyalty_accounts')
            .select('id, customer_name, customer_email, customer_phone, balance, points')
            .eq('id', parsed.customer_id)
            .eq('business_id', selectedBusinessId)
            .single();

          if (loyaltyCustomer && !error) {
            customerData = loyaltyCustomer;
          }
        }
      } catch (jsonError) {
        console.log('Not valid JSON, trying other formats');
      }

      // Try as direct loyalty account ID (UUID format)
      if (!customerData && qrData.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: loyaltyCustomer, error } = await supabase
          .from('pos_loyalty_accounts')
          .select('id, customer_name, customer_email, customer_phone, balance, points')
          .eq('id', qrData)
          .eq('business_id', selectedBusinessId)
          .single();

        if (loyaltyCustomer && !error) {
          customerData = loyaltyCustomer;
        }
      }

      // Try as phone number
      if (!customerData && qrData.match(/^\+?[\d\s\-\(\)]+$/)) {
        const cleanPhone = qrData.replace(/\D/g, '');
        const { data: loyaltyCustomer, error } = await supabase
          .from('pos_loyalty_accounts')
          .select('id, customer_name, customer_email, customer_phone, balance, points')
          .eq('customer_phone', cleanPhone)
          .eq('business_id', selectedBusinessId)
          .single();

        if (loyaltyCustomer && !error) {
          customerData = loyaltyCustomer;
        }
      }

      // Try searching by customer_name if it's just text
      if (!customerData && qrData.length > 2 && !qrData.match(/^[\d\-\+\s\(\)]+$/)) {
        const { data: loyaltyCustomers, error } = await supabase
          .from('pos_loyalty_accounts')
          .select('id, customer_name, customer_email, customer_phone, balance, points')
          .eq('business_id', selectedBusinessId)
          .ilike('customer_name', `%${qrData}%`)
          .limit(1);

        if (loyaltyCustomers && loyaltyCustomers.length > 0 && !error) {
          customerData = loyaltyCustomers[0];
        }
      }

      if (customerData) {
        onCustomerSelected(customerData);
        console.log('Found payment customer:', customerData);
      } else {
        setError('Customer not found in loyalty system');
      }

    } catch (err) {
      console.error('Customer QR scan error:', err);
      setError('Failed to process customer QR code: ' + err.message);
    }
  };

  const handleManualQRSearch = async () => {
    if (!qrSearchValue.trim()) {
      setError('Please enter a QR code value');
      return;
    }

    await handleCustomerQRForPayment(qrSearchValue.trim());
    setShowQRManualInput(false);
    setQrSearchValue('');
  };

  // Create styles using TavariStyles
  const styles = {
    modal: {
      ...TavariStyles.components.modal.overlay
    },
    
    modalContent: {
      ...TavariStyles.components.modal.content,
      maxWidth: '700px',
      width: '95%'
    },
    
    modalHeader: {
      ...TavariStyles.components.modal.header,
      borderBottomColor: TavariStyles.colors.primary
    },
    
    closeModalButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: TavariStyles.colors.gray600,
      padding: '0',
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    
    errorBanner: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.lg
    },
    
    modalBody: {
      ...TavariStyles.components.modal.body
    },
    
    paymentSummary: {
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.md,
      border: `2px solid ${TavariStyles.colors.primary}`,
      marginBottom: TavariStyles.spacing.xl
    },
    
    summaryTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },
    
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: TavariStyles.spacing.xs,
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    taxSection: {
      ...TavariStyles.pos.tax.section,
      marginTop: TavariStyles.spacing.sm
    },
    
    customerOptions: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.lg
    },
    
    optionGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    
    optionButton: {
      ...TavariStyles.components.button.base,
      backgroundColor: TavariStyles.colors.white,
      color: TavariStyles.colors.primary,
      border: `2px solid ${TavariStyles.colors.primary}`,
      textAlign: 'left',
      justifyContent: 'flex-start',
      gap: TavariStyles.spacing.sm
    },
    
    selectedOptionButton: {
      backgroundColor: TavariStyles.colors.gray50,
      borderColor: TavariStyles.colors.success,
      borderWidth: '3px'
    },
    
    loyaltyIndicator: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.success,
      fontWeight: TavariStyles.typography.fontWeight.normal,
      marginTop: TavariStyles.spacing.xs
    },
    
    selectedIndicator: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.success,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginLeft: 'auto'
    },
    
    qrScanButtons: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      justifyContent: 'center'
    },
    
    qrScanButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      flex: 1
    },
    
    qrManualButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      flex: 1
    },
    
    selectedCustomerInfo: {
      backgroundColor: TavariStyles.colors.successBg,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.success}`
    },
    
    customerInfoTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.sm
    },
    
    qrInputSection: {
      marginTop: TavariStyles.spacing.xl,
      padding: TavariStyles.spacing.xl,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.lg,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    qrInstructions: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.lg,
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
      ...TavariStyles.components.form.label
    },
    
    input: {
      ...TavariStyles.components.form.input
    },
    
    modalFooter: {
      ...TavariStyles.components.modal.footer
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

    checkboxContainer: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`
    }
  };

  if (!showModal) return null;

  return (
    <POSAuthWrapper 
      requireBusiness={true}
      componentName="CustomerSelectionModal"
    >
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h3 style={{ margin: 0 }}>Select Customer & Loyalty Account</h3>
            <button
              style={styles.closeModalButton}
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {error && <div style={styles.errorBanner}>{error}</div>}

          <div style={styles.modalBody}>
            <div style={styles.paymentSummary}>
              <h4 style={styles.summaryTitle}>Payment Summary</h4>
              <div style={styles.summaryRow}>
                <span>Items ({selectedItems.length}):</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {/* Tax Breakdown */}
              {(Object.keys(taxBreakdown.aggregatedTaxes).length > 0 || Object.keys(taxBreakdown.aggregatedRebates).length > 0) && (
                <div style={styles.taxSection}>
                  {Object.entries(taxBreakdown.aggregatedTaxes).map(([taxName, amount]) => (
                    <div key={taxName} style={styles.summaryRow}>
                      <span>{taxName}:</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  
                  {Object.entries(taxBreakdown.aggregatedRebates).map(([rebateName, amount]) => (
                    <div key={rebateName} style={{ ...styles.summaryRow, color: TavariStyles.colors.success }}>
                      <span>{rebateName}:</span>
                      <span>-{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ ...styles.summaryRow, fontWeight: TavariStyles.typography.fontWeight.bold, fontSize: TavariStyles.typography.fontSize.lg, borderTop: `1px solid ${TavariStyles.colors.gray300}`, paddingTop: TavariStyles.spacing.sm, marginTop: TavariStyles.spacing.sm }}>
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>

              {/* Item breakdown checkbox */}
              <div style={styles.checkboxContainer}>
                <TavariCheckbox
                  checked={includeItemBreakdown}
                  onChange={setIncludeItemBreakdown}
                  label="Show detailed item breakdown"
                  size="sm"
                />
                
                {includeItemBreakdown && (
                  <div style={{ marginTop: TavariStyles.spacing.md, maxHeight: '150px', overflowY: 'auto' }}>
                    {selectedItems.map((item, index) => (
                      <div key={index} style={{ ...styles.summaryRow, fontSize: TavariStyles.typography.fontSize.xs, color: TavariStyles.colors.gray600 }}>
                        <span>{item.name || item.product_name} (x{item.quantity})</span>
                        <span>{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.customerOptions}>
              <h4>Customer & Loyalty Options</h4>
              
              {/* Tab Customer Option */}
              {selectedPaymentTab?.pos_loyalty_accounts && (
                <div style={styles.optionGroup}>
                  <button
                    style={{
                      ...styles.optionButton,
                      ...(paymentCustomer && paymentCustomer.id === selectedPaymentTab.pos_loyalty_accounts?.id ? styles.selectedOptionButton : {})
                    }}
                    onClick={() => onCustomerSelected(selectedPaymentTab.pos_loyalty_accounts)}
                  >
                    <span>📋 Use Tab's Customer ({selectedPaymentTab.customer_name})</span>
                    {(() => {
                      const loyaltyDisplay = getLoyaltyDisplay(selectedPaymentTab.pos_loyalty_accounts);
                      return loyaltyDisplay && (
                        <div style={styles.loyaltyIndicator}>
                          ⭐ {loyaltyDisplay.type === 'points' ? 'Points' : 'Balance'}: {loyaltyDisplay.display}
                        </div>
                      );
                    })()}
                    {paymentCustomer && paymentCustomer.id === selectedPaymentTab.pos_loyalty_accounts?.id && (
                      <span style={styles.selectedIndicator}>✓ Selected</span>
                    )}
                  </button>
                </div>
              )}

              {/* QR Scan Options */}
              <div style={styles.optionGroup}>
                <div style={styles.qrScanButtons}>
                  <button
                    style={styles.qrScanButton}
                    onClick={() => setShowQRInput(true)}
                  >
                    📱 Scan Loyalty QR
                  </button>
                  <button
                    style={styles.qrManualButton}
                    onClick={() => setShowQRManualInput(true)}
                  >
                    ⌨️ Enter QR Manually
                  </button>
                </div>
              </div>

              {/* Cash Customer Option */}
              <div style={styles.optionGroup}>
                <button
                  style={{
                    ...styles.optionButton,
                    ...(paymentCustomer === null ? styles.selectedOptionButton : {})
                  }}
                  onClick={() => onCustomerSelected(null)}
                >
                  <span>👤 No Loyalty Account (Cash Customer)</span>
                  {paymentCustomer === null && (
                    <span style={styles.selectedIndicator}>✓ Selected</span>
                  )}
                </button>
              </div>

              {/* Selected Customer Display */}
              {(paymentCustomer !== undefined) && (
                <div style={styles.selectedCustomerInfo}>
                  <h4 style={styles.customerInfoTitle}>Selected Customer:</h4>
                  {paymentCustomer ? (
                    <>
                      <p><strong>{paymentCustomer.customer_name}</strong></p>
                      {paymentCustomer.customer_phone && <p>📞 {paymentCustomer.customer_phone}</p>}
                      {paymentCustomer.customer_email && <p>📧 {paymentCustomer.customer_email}</p>}
                      {(() => {
                        const loyaltyDisplay = getLoyaltyDisplay(paymentCustomer);
                        return loyaltyDisplay && (
                          <p>
                            {loyaltyDisplay.type === 'points' ? '⭐' : '💰'} {loyaltyDisplay.type === 'points' ? 'Points' : 'Balance'}: {loyaltyDisplay.display}
                            {loyaltyDisplay.type === 'points' && loyaltyDisplay.dollarValue > 0 && (
                              <span style={{ fontSize: TavariStyles.typography.fontSize.xs, color: TavariStyles.colors.gray500, marginLeft: TavariStyles.spacing.sm }}>
                                (${loyaltyDisplay.dollarValue.toFixed(2)} value)
                              </span>
                            )}
                          </p>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <p><strong>💵 Cash Customer</strong></p>
                      <p>No loyalty account - payment will be cash/card only</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button
              style={styles.cancelButton}
              onClick={onBackToItems}
            >
              Back to Items
            </button>
            <button
              style={styles.submitButton}
              onClick={onProceedToPayment}
            >
              Continue to Payment
            </button>
          </div>
        </div>

        {/* QR Input Modal */}
        {showQRInput && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0 }}>Scan Customer Loyalty QR</h3>
                <button
                  style={styles.closeModalButton}
                  onClick={() => {
                    setShowQRInput(false);
                    setError(null);
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <BarcodeScanHandler onScan={handleBarcodeOrQRScan} />
                
                <div style={styles.qrInputSection}>
                  <p style={styles.qrInstructions}>
                    Scan the customer's loyalty card QR code or barcode using your device's camera.
                  </p>
                </div>
              </div>
              
              <div style={styles.modalFooter}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowQRInput(false);
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual QR Input Modal */}
        {showQRManualInput && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0 }}>Enter QR Code Manually</h3>
                <button
                  style={styles.closeModalButton}
                  onClick={() => {
                    setShowQRManualInput(false);
                    setQrSearchValue('');
                    setError(null);
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>QR Code Value:</label>
                    <input
                      type="text"
                      value={qrSearchValue}
                      onChange={(e) => setQrSearchValue(e.target.value)}
                      placeholder="Paste or type the QR code data here..."
                      style={styles.input}
                      autoFocus
                    />
                    <p style={styles.qrInstructions}>
                      Enter the QR code data from a customer's loyalty card. This can be:
                      <br />• Customer UUID (e.g., 12345678-1234-1234-1234-123456789012)
                      <br />• Phone number (e.g., 5551234567)
                      <br />• Customer name
                      <br />• JSON loyalty data
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={styles.modalFooter}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowQRManualInput(false);
                    setQrSearchValue('');
                    setError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.submitButton,
                    ...(qrSearchValue.trim() ? {} : { opacity: 0.6, cursor: 'not-allowed' })
                  }}
                  onClick={handleManualQRSearch}
                  disabled={!qrSearchValue.trim()}
                >
                  Look Up Customer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </POSAuthWrapper>
  );
};

export default CustomerSelectionModal;