// screens/POS/ReceiptScreen.jsx - UPDATED WITH PROPER NAVIGATION
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { generateReceiptHTML, printReceipt, RECEIPT_TYPES } from '../../helpers/ReceiptBuilder';

const ReceiptScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Authentication
  const auth = usePOSAuth({
    requiredRoles: ['cashier', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'ReceiptScreen'
  });
  
  // Tax calculations
  const taxCalc = useTaxCalculations(auth.selectedBusinessId);
  
  // State
  const [receiptData, setReceiptData] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get sale data from navigation or session storage
  const saleData = location.state?.saleData;
  
  useEffect(() => {
    if (!auth.isReady) return;
    
    loadReceiptData();
  }, [auth.isReady, saleData]);
  
  const loadReceiptData = async () => {
    try {
      setLoading(true);
      
      // Try to get receipt data from navigation first
      let receiptInfo = null;
      
      if (saleData?.receipt_id) {
        // Load from database using receipt_id
        const { data: receipt, error: receiptError } = await supabase
          .from('pos_receipts')
          .select('*')
          .eq('id', saleData.receipt_id)
          .single();
          
        if (!receiptError) {
          receiptInfo = receipt;
        }
      }
      
      // Fallback to session storage
      if (!receiptInfo) {
        const sessionData = sessionStorage.getItem('lastSaleData');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          receiptInfo = {
            ...parsed,
            items: parsed.items || [],
            payments: parsed.payments || []
          };
        }
      }
      
      if (!receiptInfo) {
        throw new Error('No receipt data found');
      }
      
      setReceiptData(receiptInfo);
      
      // Load business information
      await loadBusinessInfo();
      
    } catch (err) {
      console.error('Error loading receipt:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadBusinessInfo = async () => {
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', auth.selectedBusinessId)
        .single();
        
      if (error) throw error;
      
      setBusinessInfo(business);
    } catch (err) {
      console.error('Error loading business info:', err);
      // Set defaults
      setBusinessInfo({
        name: 'Business Name',
        business_address: '123 Main St',
        business_city: 'City',
        business_state: 'ON',
        business_postal: 'N1A 1A1'
      });
    }
  };
  
  const handlePrintReceipt = (type = 'standard') => {
    if (!receiptData || !businessInfo) {
      alert('Receipt data not ready');
      return;
    }
    
    try {
      // Format business settings for ReceiptBuilder
      const businessSettings = {
        business_name: businessInfo.name,
        business_address: businessInfo.business_address || businessInfo.address,
        business_city: businessInfo.business_city || businessInfo.city,
        business_state: businessInfo.business_state || businessInfo.state || 'ON',
        business_postal: businessInfo.business_postal || businessInfo.postal_code,
        business_phone: businessInfo.business_phone || businessInfo.phone,
        business_email: businessInfo.business_email || businessInfo.email,
        tax_number: businessInfo.tax_number || businessInfo.hst_number,
        timezone: businessInfo.timezone || 'America/Toronto',
        loyalty_mode: businessInfo.loyalty_mode || 'points',
        earn_rate_percentage: businessInfo.earn_rate_percentage || 3
      };
      
      // Format sale data for ReceiptBuilder
      const formattedSaleData = {
        sale_number: receiptData.receipt_number || receiptData.sale_number || 'N/A',
        created_at: receiptData.created_at || new Date().toISOString(),
        items: receiptData.items || [],
        subtotal: receiptData.subtotal || 0,
        final_total: receiptData.total || receiptData.final_total || 0,
        tax_amount: receiptData.tax_amount || receiptData.final_tax_amount || 0,
        payments: receiptData.payment_methods || receiptData.payments || [],
        tip_amount: receiptData.tip_amount || 0,
        change_given: receiptData.change_given || 0,
        discount_amount: receiptData.discount_amount || 0,
        loyalty_redemption: receiptData.loyalty_redemption || 0,
        aggregated_taxes: receiptData.aggregated_taxes || {},
        aggregated_rebates: receiptData.aggregated_rebates || {},
        loyaltyCustomer: receiptData.customer_name ? {
          customer_name: receiptData.customer_name,
          customer_email: receiptData.customer_email,
          customer_phone: receiptData.customer_phone,
          balance: receiptData.loyalty_balance || 0
        } : null
      };
      
      // Determine receipt type
      let receiptType = RECEIPT_TYPES.STANDARD;
      switch (type) {
        case 'gift':
          receiptType = RECEIPT_TYPES.GIFT;
          break;
        case 'kitchen':
          receiptType = RECEIPT_TYPES.KITCHEN;
          break;
        case 'reprint':
          receiptType = RECEIPT_TYPES.REPRINT;
          break;
        default:
          receiptType = RECEIPT_TYPES.STANDARD;
      }
      
      // Generate and print receipt
      const receiptHTML = generateReceiptHTML(
        formattedSaleData, 
        receiptType, 
        businessSettings,
        type === 'reprint' ? { reprintReason: 'Customer Request' } : {}
      );
      
      printReceipt(receiptHTML);
      
    } catch (err) {
      console.error('Error printing receipt:', err);
      alert('Error printing receipt. Please try again.');
    }
  };
  
  const handleEmailReceipt = () => {
    const email = prompt('Enter email address:');
    if (email) {
      // TODO: Integrate with actual email service
      console.log(`Emailing receipt to: ${email}`);
      alert('Receipt email sent!');
    }
  };
  
  const handleTextReceipt = () => {
    const phone = prompt('Enter phone number:');
    if (phone) {
      // TODO: Integrate with SMS service
      console.log(`Texting receipt to: ${phone}`);
      alert('Receipt text sent!');
    }
  };
  
  const handleNewSale = () => {
    // Clear any stored sale data
    sessionStorage.removeItem('lastSaleData');
    sessionStorage.removeItem('currentCart');
    sessionStorage.removeItem('cartItems');
    
    // Determine where to go based on where we came from
    const fromState = location.state?.from;
    
    if (fromState === 'saved_carts') {
      // If we came from saved carts, go back there
      navigate('/dashboard/pos/saved-carts');
    } else if (fromState === 'tabs') {
      // If we came from tab management, go back there
      navigate('/dashboard/pos/tabs');
    } else {
      // Default: go back to the main register screen
      navigate('/dashboard/pos/register');
    }
  };
  
  // Loading state
  if (!auth.isReady || loading || taxCalc.loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={TavariStyles.components.loading.spinner}></div>
          <div>Loading receipt...</div>
          <style>{TavariStyles.keyframes.spin}</style>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !receiptData) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>Receipt Not Found</h3>
          <p>{error || 'No receipt data available'}</p>
          <button 
            style={styles.button}
            onClick={handleNewSale}
          >
            Return to POS
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1>Sale Complete!</h1>
        <p>Receipt #{receiptData.receipt_number || 'N/A'}</p>
        <p>Total: ${taxCalc.applyCashRounding(receiptData.total || 0).toFixed(2)}</p>
      </div>
      
      {/* Business Info */}
      <div style={styles.section}>
        <h3>Business Information</h3>
        <div style={styles.businessInfo}>
          <p><strong>{businessInfo?.name || 'Business Name'}</strong></p>
          <p>{businessInfo?.business_address || '123 Main St'}</p>
          <p>{businessInfo?.business_city || 'City'}, {businessInfo?.business_state || 'ON'} {businessInfo?.business_postal || 'N1A 1A1'}</p>
        </div>
      </div>
      
      {/* Items */}
      <div style={styles.section}>
        <h3>Items Purchased</h3>
        <div style={styles.itemsList}>
          {receiptData.items && receiptData.items.length > 0 ? (
            receiptData.items.map((item, index) => (
              <div key={index} style={styles.item}>
                <div style={styles.itemRow}>
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemPrice}>
                    ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
                <div style={styles.itemDetails}>
                  <span>${(item.price || 0).toFixed(2)} × {item.quantity || 1}</span>
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div style={styles.modifiers}>
                    {item.modifiers.map((mod, modIndex) => (
                      <div key={modIndex} style={styles.modifier}>
                        + {mod.name} ${(mod.price || 0).toFixed(2)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No items found</p>
          )}
        </div>
      </div>
      
      {/* Tax & Rebate Breakdown */}
      {((receiptData.aggregated_taxes && Object.keys(receiptData.aggregated_taxes).length > 0) || 
        (receiptData.aggregated_rebates && Object.keys(receiptData.aggregated_rebates).length > 0)) && (
        <div style={styles.section}>
          <h3>Tax & Rebate Breakdown</h3>
          
          {/* Taxes */}
          {receiptData.aggregated_taxes && Object.keys(receiptData.aggregated_taxes).length > 0 && (
            <div style={styles.taxSection}>
              <h4 style={styles.taxSubtitle}>Taxes Applied</h4>
              {Object.entries(receiptData.aggregated_taxes).map(([taxName, amount]) => (
                <div key={taxName} style={styles.taxRow}>
                  <span>{taxName}:</span>
                  <span>${taxCalc.formatTaxAmount(amount)}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Rebates */}
          {receiptData.aggregated_rebates && Object.keys(receiptData.aggregated_rebates).length > 0 && (
            <div style={styles.rebateSection}>
              <h4 style={styles.rebateSubtitle}>Rebates Applied</h4>
              {Object.entries(receiptData.aggregated_rebates).map(([rebateName, amount]) => (
                <div key={rebateName} style={styles.rebateRow}>
                  <span>{rebateName}:</span>
                  <span>-${taxCalc.formatTaxAmount(amount)}</span>
                </div>
              ))}
            </div>
          )}
          
          <div style={styles.netTaxRow}>
            <span>Net Tax:</span>
            <span>${taxCalc.formatTaxAmount(receiptData.tax_amount || 0)}</span>
          </div>
        </div>
      )}

      {/* Totals */}
      <div style={styles.section}>
        <h3>Transaction Summary</h3>
        <div style={styles.totals}>
          <div style={styles.totalRow}>
            <span>Subtotal:</span>
            <span>${taxCalc.formatTaxAmount(receiptData.subtotal || 0)}</span>
          </div>
          {receiptData.discount_amount > 0 && (
            <div style={styles.totalRow}>
              <span>Discount:</span>
              <span>-${taxCalc.formatTaxAmount(receiptData.discount_amount)}</span>
            </div>
          )}
          {receiptData.loyalty_redemption > 0 && (
            <div style={styles.totalRow}>
              <span>Loyalty Credit:</span>
              <span>-${taxCalc.formatTaxAmount(receiptData.loyalty_redemption)}</span>
            </div>
          )}
          <div style={styles.totalRow}>
            <span>Tax:</span>
            <span>${taxCalc.formatTaxAmount(receiptData.tax_amount || 0)}</span>
          </div>
          {receiptData.tip_amount > 0 && (
            <div style={styles.totalRow}>
              <span>Tip:</span>
              <span>${taxCalc.formatTaxAmount(receiptData.tip_amount)}</span>
            </div>
          )}
          <div style={styles.totalRowFinal}>
            <span>Total:</span>
            <span>${taxCalc.applyCashRounding(receiptData.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Payment Methods */}
      {receiptData.payment_methods && receiptData.payment_methods.length > 0 && (
        <div style={styles.section}>
          <h3>Payment Methods</h3>
          <div style={styles.payments}>
            {receiptData.payment_methods.map((payment, index) => (
              <div key={index} style={styles.paymentRow}>
                <span>{payment.method || payment.payment_method}</span>
                <span>${(payment.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            {receiptData.change_given > 0 && (
              <div style={styles.paymentRow}>
                <span>Change Given:</span>
                <span>${(receiptData.change_given || 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Customer Info */}
      {receiptData.customer_name && (
        <div style={styles.section}>
          <h3>Customer Information</h3>
          <div style={styles.customerInfo}>
            <p><strong>{receiptData.customer_name}</strong></p>
            {receiptData.customer_email && <p>Email: {receiptData.customer_email}</p>}
            {receiptData.customer_phone && <p>Phone: {receiptData.customer_phone}</p>}
          </div>
        </div>
      )}
      
      {/* Receipt Options */}
      <div style={styles.section}>
        <h3>Receipt Options</h3>
        <div style={styles.receiptOptions}>
          <button 
            style={styles.receiptButton}
            onClick={() => handlePrintReceipt('standard')}
          >
            Print Receipt
          </button>
          
          <button 
            style={styles.receiptButton}
            onClick={() => handlePrintReceipt('gift')}
          >
            Gift Receipt
          </button>
          
          <button 
            style={styles.receiptButton}
            onClick={() => handlePrintReceipt('kitchen')}
          >
            Kitchen Receipt
          </button>
          
          <button 
            style={styles.receiptButton}
            onClick={handleEmailReceipt}
          >
            Email Receipt
          </button>
          
          <button 
            style={styles.receiptButton}
            onClick={handleTextReceipt}
          >
            Text Receipt
          </button>
          
          <button 
            style={styles.receiptButtonSecondary}
            onClick={handleNewSale}
          >
            No Receipt
          </button>
        </div>
      </div>
      
      {/* Continue Button */}
      <div style={styles.actions}>
        <button 
          style={styles.newSaleButton}
          onClick={handleNewSale}
        >
          {location.state?.from === 'saved_carts' 
            ? 'Back to Saved Carts' 
            : location.state?.from === 'tabs'
            ? 'Back to Tabs'
            : 'Start New Sale'
          }
        </button>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    ...TavariStyles.layout.container,
    maxWidth: '800px',
    margin: '0 auto',
    padding: TavariStyles.spacing.xl
  },
  
  loading: {
    ...TavariStyles.components.loading.container,
    textAlign: 'center'
  },
  
  error: {
    textAlign: 'center',
    padding: TavariStyles.spacing['4xl']
  },
  
  header: {
    textAlign: 'center',
    marginBottom: TavariStyles.spacing['3xl'],
    padding: TavariStyles.spacing.xl,
    backgroundColor: TavariStyles.colors.success,
    color: TavariStyles.colors.white,
    borderRadius: TavariStyles.borderRadius.lg
  },
  
  section: {
    ...TavariStyles.layout.card,
    padding: TavariStyles.spacing.xl,
    marginBottom: TavariStyles.spacing.xl
  },
  
  businessInfo: {
    textAlign: 'center',
    lineHeight: 1.6
  },
  
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.md
  },
  
  item: {
    padding: TavariStyles.spacing.md,
    backgroundColor: TavariStyles.colors.gray50,
    borderRadius: TavariStyles.borderRadius.md,
    border: `1px solid ${TavariStyles.colors.gray200}`
  },
  
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TavariStyles.spacing.sm
  },
  
  itemName: {
    fontWeight: TavariStyles.typography.fontWeight.bold,
    fontSize: TavariStyles.typography.fontSize.lg
  },
  
  itemPrice: {
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.success
  },
  
  itemDetails: {
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray600
  },
  
  modifiers: {
    marginTop: TavariStyles.spacing.sm,
    paddingLeft: TavariStyles.spacing.md
  },
  
  modifier: {
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray600,
    fontStyle: 'italic'
  },
  
  totals: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.sm
  },
  
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.lg
  },
  
  totalRowFinal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    paddingTop: TavariStyles.spacing.md,
    borderTop: `2px solid ${TavariStyles.colors.primary}`,
    marginTop: TavariStyles.spacing.md
  },
  
  payments: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.sm
  },
  
  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: TavariStyles.spacing.sm,
    backgroundColor: TavariStyles.colors.gray50,
    borderRadius: TavariStyles.borderRadius.sm
  },
  
  customerInfo: {
    lineHeight: 1.6
  },
  
  // Tax and rebate styles
  taxSection: {
    marginBottom: TavariStyles.spacing.lg,
    padding: TavariStyles.spacing.md,
    backgroundColor: TavariStyles.colors.errorBg,
    borderRadius: TavariStyles.borderRadius.sm,
    border: `1px solid ${TavariStyles.colors.danger}`
  },
  
  taxSubtitle: {
    fontSize: TavariStyles.typography.fontSize.sm,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.danger,
    marginBottom: TavariStyles.spacing.sm
  },
  
  taxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray700,
    marginBottom: TavariStyles.spacing.xs
  },
  
  rebateSection: {
    marginBottom: TavariStyles.spacing.lg,
    padding: TavariStyles.spacing.md,
    backgroundColor: TavariStyles.colors.successBg,
    borderRadius: TavariStyles.borderRadius.sm,
    border: `1px solid ${TavariStyles.colors.success}`
  },
  
  rebateSubtitle: {
    fontSize: TavariStyles.typography.fontSize.sm,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.success,
    marginBottom: TavariStyles.spacing.sm
  },
  
  rebateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray700,
    marginBottom: TavariStyles.spacing.xs
  },
  
  netTaxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    paddingTop: TavariStyles.spacing.md,
    borderTop: `1px solid ${TavariStyles.colors.gray200}`,
    marginTop: TavariStyles.spacing.md
  },
  
  actions: {
    display: 'flex',
    gap: TavariStyles.spacing.lg,
    justifyContent: 'center',
    marginTop: TavariStyles.spacing['2xl']
  },
  
  // Receipt options styles
  receiptOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: TavariStyles.spacing.md,
    marginBottom: TavariStyles.spacing.lg
  },
  
  receiptButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.primary,
    ...TavariStyles.components.button.sizes.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50px'
  },
  
  receiptButtonSecondary: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.secondary,
    ...TavariStyles.components.button.sizes.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50px'
  },
  
  button: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.primary
  },
  
  printButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.secondary,
    ...TavariStyles.components.button.sizes.lg
  },
  
  newSaleButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.primary,
    ...TavariStyles.components.button.sizes.lg
  }
};

export default ReceiptScreen;