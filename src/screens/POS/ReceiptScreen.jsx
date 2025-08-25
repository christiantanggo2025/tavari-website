// screens/POS/ReceiptScreen.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusinessContext } from '../../contexts/BusinessContext';
import { 
  generateReceiptHTML, 
  generateEmailReceiptHTML, 
  printReceipt, 
  RECEIPT_TYPES 
} from '../../helpers/ReceiptBuilder';
import { logAction } from '../../helpers/posAudit';

const ReceiptScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusinessId } = useBusinessContext();
  
  const [saleData, setSaleData] = useState(null);
  const [businessSettings, setBusinessSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [receiptGenerated, setReceiptGenerated] = useState(false);

  // Get sale data from navigation state
  const receivedSaleData = location.state?.saleData;

  useEffect(() => {
    if (!selectedBusinessId) {
      setError('No business selected');
      return;
    }

    if (!receivedSaleData) {
      setError('No sale data provided');
      return;
    }

    loadReceiptData();
  }, [selectedBusinessId, receivedSaleData]);

  const loadReceiptData = async () => {
    try {
      setLoading(true);

      // Fetch business settings for receipt generation
      const { data: settings, error: settingsError } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .single();

      if (settingsError) throw settingsError;

      // Enhanced business settings for receipt
      const enhancedSettings = {
        ...settings,
        business_name: 'Your Business Name', // This should come from business table
        business_address: '123 Main St, City, Province',
        business_phone: '(555) 123-4567',
        tax_number: 'HST123456789'
      };

      setBusinessSettings(enhancedSettings);
      setSaleData(receivedSaleData);

      // Pre-fill email if loyalty customer
      if (receivedSaleData.loyaltyCustomer?.customer_email) {
        setEmailAddress(receivedSaleData.loyaltyCustomer.customer_email);
      }

      // Auto-print if enabled in settings
      if (enhancedSettings.auto_print_receipt) {
        handlePrintReceipt();
      }

      // Auto-email if enabled and email available
      if (enhancedSettings.auto_email_receipt && receivedSaleData.loyaltyCustomer?.customer_email) {
        handleEmailReceipt(receivedSaleData.loyaltyCustomer.customer_email);
      }

      await logAction({
        action: 'receipt_screen_opened',
        context: 'ReceiptScreen',
        metadata: {
          sale_id: receivedSaleData.sale_id,
          sale_number: receivedSaleData.sale_number,
          total_amount: receivedSaleData.final_total
        }
      });

    } catch (err) {
      console.error('Error loading receipt data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = (receiptType = RECEIPT_TYPES.STANDARD) => {
    try {
      const receiptHTML = generateReceiptHTML(saleData, receiptType, businessSettings);
      printReceipt(receiptHTML);
      setReceiptGenerated(true);

      logAction({
        action: 'receipt_printed',
        context: 'ReceiptScreen',
        metadata: {
          sale_id: saleData.sale_id,
          receipt_type: receiptType,
          print_method: 'browser'
        }
      });

    } catch (err) {
      console.error('Print receipt error:', err);
      setError('Failed to print receipt');
    }
  };

  const handleEmailReceipt = async (email = emailAddress) => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setEmailSending(true);
    setError(null);

    try {
      const emailHTML = generateEmailReceiptHTML(saleData, businessSettings);
      
      // Here you would integrate with your email service (SendGrid, etc.)
      // For now, we'll simulate the email sending
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Log the email in database
      const { error: emailLogError } = await supabase
        .from('pos_receipts')
        .insert({
          business_id: selectedBusinessId,
          sale_id: saleData.sale_id,
          total: saleData.final_total,
          items: saleData.items || [],
          email_sent_to: email,
          receipt_type: 'email',
          created_at: new Date().toISOString()
        });

      if (emailLogError) console.warn('Email log error:', emailLogError);

      await logAction({
        action: 'receipt_emailed',
        context: 'ReceiptScreen',
        metadata: {
          sale_id: saleData.sale_id,
          email_address: email,
          receipt_type: 'email'
        }
      });

      setShowEmailModal(false);
      setEmailAddress('');
      alert('Receipt emailed successfully!');

    } catch (err) {
      console.error('Email receipt error:', err);
      setError('Failed to send email receipt');
    } finally {
      setEmailSending(false);
    }
  };

  const handleNewSale = () => {
    navigate('/dashboard/pos/register');
  };

  const handleReprintReceipt = async (reason = 'Customer Request') => {
    try {
      const receiptHTML = generateReceiptHTML(
        saleData, 
        RECEIPT_TYPES.REPRINT, 
        businessSettings,
        { reprintReason: reason }
      );
      printReceipt(receiptHTML);

      // Log the reprint
      await logAction({
        action: 'receipt_reprinted',
        context: 'ReceiptScreen',
        metadata: {
          sale_id: saleData.sale_id,
          reprint_reason: reason,
          original_receipt_date: saleData.created_at
        }
      });

    } catch (err) {
      console.error('Reprint receipt error:', err);
      setError('Failed to reprint receipt');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading receipt...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>Error</h3>
          <p>{error}</p>
          <button style={styles.button} onClick={handleNewSale}>
            Start New Sale
          </button>
        </div>
      </div>
    );
  }

  if (!saleData) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>No Receipt Data</h3>
          <p>Sale information not found</p>
          <button style={styles.button} onClick={handleNewSale}>
            Start New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🎉 Sale Complete!</h2>
        <p>Sale #{saleData.sale_number} - ${(saleData.final_total || 0).toFixed(2)}</p>
      </div>

      <div style={styles.content}>
        {/* Sale Summary */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Transaction Summary</h3>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryRow}>
              <span>Items:</span>
              <span>{saleData.item_count || 0}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Subtotal:</span>
              <span>${(saleData.subtotal || 0).toFixed(2)}</span>
            </div>
            {saleData.discount_amount > 0 && (
              <div style={styles.summaryRow}>
                <span>Discount:</span>
                <span>-${saleData.discount_amount.toFixed(2)}</span>
              </div>
            )}
            {saleData.loyalty_redemption > 0 && (
              <div style={styles.summaryRow}>
                <span>Loyalty Credit:</span>
                <span>-${saleData.loyalty_redemption.toFixed(2)}</span>
              </div>
            )}
            <div style={styles.summaryRow}>
              <span>Tax:</span>
              <span>${(saleData.tax_amount || 0).toFixed(2)}</span>
            </div>
            {saleData.tip_amount > 0 && (
              <div style={styles.summaryRow}>
                <span>Tip:</span>
                <span>${saleData.tip_amount.toFixed(2)}</span>
              </div>
            )}
            <div style={styles.summaryRowTotal}>
              <span>Total:</span>
              <span>${(saleData.final_total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        {saleData.payments && saleData.payments.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Payment Methods</h3>
            <div style={styles.paymentsList}>
              {saleData.payments.map((payment, index) => (
                <div key={index} style={styles.paymentRow}>
                  <span style={styles.paymentMethod}>
                    {payment.custom_method_name || payment.method}
                  </span>
                  <span style={styles.paymentAmount}>
                    ${payment.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {saleData.change_given > 0 && (
                <div style={styles.paymentRow}>
                  <span style={styles.changeLabel}>Change Given:</span>
                  <span style={styles.changeAmount}>
                    ${saleData.change_given.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Receipt Options */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Receipt Options</h3>
          <div style={styles.receiptOptions}>
            <button
              style={styles.receiptButton}
              onClick={() => handlePrintReceipt(RECEIPT_TYPES.STANDARD)}
            >
              🖨️ Print Receipt
            </button>
            
            <button
              style={styles.receiptButton}
              onClick={() => handlePrintReceipt(RECEIPT_TYPES.GIFT)}
            >
              🎁 Print Gift Receipt
            </button>
            
            <button
              style={styles.receiptButton}
              onClick={() => handlePrintReceipt(RECEIPT_TYPES.KITCHEN)}
            >
              🍽️ Print Kitchen Receipt
            </button>
            
            <button
              style={styles.receiptButton}
              onClick={() => setShowEmailModal(true)}
            >
              📧 Email Receipt
            </button>
            
            <button
              style={styles.receiptButton}
              onClick={() => handleReprintReceipt()}
            >
              🔄 Reprint Receipt
            </button>
            
            <button
              style={styles.receiptButtonSecondary}
              onClick={handleNewSale}
            >
              ❌ No Receipt
            </button>
          </div>
        </div>

        {/* Customer Information */}
        {saleData.loyaltyCustomer && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Customer Information</h3>
            <div style={styles.customerInfo}>
              <div style={styles.customerName}>
                {saleData.loyaltyCustomer.customer_name}
              </div>
              {saleData.loyaltyCustomer.customer_email && (
                <div style={styles.customerDetail}>
                  📧 {saleData.loyaltyCustomer.customer_email}
                </div>
              )}
              {saleData.loyaltyCustomer.customer_phone && (
                <div style={styles.customerDetail}>
                  📞 {saleData.loyaltyCustomer.customer_phone}
                </div>
              )}
              <div style={styles.loyaltyEarned}>
                💰 Earned: ${((saleData.subtotal || 0) * (businessSettings.redemption_rate || 0.01)).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Email Receipt</h3>
            <p>Enter email address to send receipt:</p>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="customer@example.com"
              style={styles.emailInput}
              autoFocus
            />
            {error && (
              <div style={styles.modalError}>{error}</div>
            )}
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setShowEmailModal(false);
                  setError(null);
                }}
                disabled={emailSending}
              >
                Cancel
              </button>
              <button
                style={styles.sendButton}
                onClick={() => handleEmailReceipt()}
                disabled={emailSending || !emailAddress}
              >
                {emailSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button
          style={styles.newSaleButton}
          onClick={handleNewSale}
        >
          Start New Sale
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    paddingTop: '100px',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center',
    backgroundColor: '#008080',
    color: 'white',
    padding: '20px',
    borderRadius: '8px'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '20px'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb'
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    borderBottom: '2px solid #008080',
    paddingBottom: '8px'
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    color: '#1f2937'
  },
  summaryRowTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    paddingTop: '12px',
    borderTop: '2px solid #008080',
    marginTop: '8px'
  },
  paymentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px'
  },
  paymentMethod: {
    fontSize: '14px',
    color: '#374151',
    textTransform: 'capitalize'
  },
  paymentAmount: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#059669'
  },
  changeLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#f59e0b'
  },
  changeAmount: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#f59e0b'
  },
  receiptOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  receiptButton: {
    padding: '15px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  receiptButtonSecondary: {
    padding: '15px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  customerInfo: {
    padding: '15px',
    backgroundColor: '#008080',
    color: 'white',
    borderRadius: '6px'
  },
  customerName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  customerDetail: {
    fontSize: '14px',
    marginBottom: '4px',
    opacity: 0.9
  },
  loyaltyEarned: {
    fontSize: '14px',
    marginTop: '8px',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '6px 10px',
    borderRadius: '4px',
    display: 'inline-block'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    maxWidth: '400px',
    width: '90%'
  },
  emailInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    marginBottom: '15px'
  },
  modalError: {
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '15px'
  },
  modalActions: {
    display: 'flex',
    gap: '10px'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  sendButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  actions: {
    display: 'flex',
    justifyContent: 'center'
  },
  newSaleButton: {
    padding: '20px 40px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    minWidth: '200px'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#dc2626'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  }
};

export default ReceiptScreen;