// components/POS/CreateTabModal.jsx - Updated with Foundation Components
import React, { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../UI/TavariCheckbox';
import BarcodeScanHandler from './BarcodeScanHandler';

const CreateTabModal = ({ 
  showModal, 
  onClose, 
  onCreateTab,
  testId = 'create-tab-modal'
}) => {
  const auth = usePOSAuth({
    requireBusiness: true,
    componentName: 'CreateTabModal'
  });

  const taxCalculations = useTaxCalculations(auth.selectedBusinessId);

  const [newTab, setNewTab] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    notes: '',
    tab_number: '',
    loyalty_customer_id: null,
    auto_apply_loyalty: false
  });
  
  const [showQRInput, setShowQRInput] = useState(false);
  const [qrInputValue, setQrInputValue] = useState('');
  const [scanningFor, setScanningFor] = useState('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Audit logging helper
  const logAuditAction = useCallback(async (action, metadata = {}) => {
    if (!auth.authUser || !auth.selectedBusinessId) return;
    
    try {
      const auditData = {
        action,
        actor_id: auth.authUser.id,
        actor_name: auth.authUser.email,
        business_id: auth.selectedBusinessId,
        context: 'create_tab_modal',
        metadata: JSON.stringify({
          ...metadata,
          user_role: auth.userRole,
          timestamp: new Date().toISOString()
        }),
        device_info: navigator.userAgent,
        terminal_id: `terminal_${Date.now()}`,
        session_id: sessionStorage.getItem('pos_session_id') || 'unknown',
        timestamp: new Date().toISOString(),
        success: true
      };
      
      console.log('Create Tab Modal Audit Log:', auditData);
    } catch (error) {
      console.error('Create tab modal audit logging failed:', error);
    }
  }, [auth.authUser, auth.selectedBusinessId, auth.userRole]);

  const generateTabNumber = useCallback(() => {
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `TAB-${timestamp}-${randomSuffix}`;
  }, []);

  const handleBarcodeOrQRScan = useCallback((code) => {
    console.log('Barcode/QR scanned in CreateTabModal:', code);
    
    logAuditAction('barcode_scanned_in_modal', {
      code,
      scanning_for: scanningFor,
      code_length: code.length
    });
    
    if (showQRInput) {
      if (scanningFor === 'customer') {
        handleCustomerQRScan(code);
      } else if (scanningFor === 'receipt') {
        handleReceiptQRScan(code);
      }
    }
  }, [showQRInput, scanningFor]);

  const handleCustomerQRScan = useCallback(async (qrData) => {
    if (!auth.selectedBusinessId) {
      setError('No business selected');
      return;
    }

    try {
      setError(null);
      console.log('Processing customer QR code data:', qrData);
      
      let customerData = null;
      
      // Try to parse as JSON first (loyalty customer QR)
      try {
        const parsed = JSON.parse(qrData);
        console.log('Parsed JSON QR data:', parsed);
        if (parsed.type === 'loyalty_customer' && parsed.customer_id) {
          const { data: loyaltyCustomer, error } = await supabase
            .from('pos_loyalty_accounts')
            .select('id, customer_name, customer_email, customer_phone, balance, points')
            .eq('id', parsed.customer_id)
            .eq('business_id', auth.selectedBusinessId)
            .single();

          if (loyaltyCustomer && !error) {
            customerData = {
              loyalty_customer_id: loyaltyCustomer.id,
              customer_name: loyaltyCustomer.customer_name,
              customer_phone: loyaltyCustomer.customer_phone || '',
              customer_email: loyaltyCustomer.customer_email || '',
              auto_apply_loyalty: true
            };
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
          .eq('business_id', auth.selectedBusinessId)
          .single();

        if (loyaltyCustomer && !error) {
          customerData = {
            loyalty_customer_id: loyaltyCustomer.id,
            customer_name: loyaltyCustomer.customer_name,
            customer_phone: loyaltyCustomer.customer_phone || '',
            customer_email: loyaltyCustomer.customer_email || '',
            auto_apply_loyalty: true
          };
        }
      }

      // Try as phone number lookup
      if (!customerData && qrData.match(/^\+?[\d\s\-\(\)]+$/)) {
        const cleanPhone = qrData.replace(/\D/g, '');
        const { data: loyaltyCustomer, error } = await supabase
          .from('pos_loyalty_accounts')
          .select('id, customer_name, customer_email, customer_phone, balance, points')
          .eq('customer_phone', cleanPhone)
          .eq('business_id', auth.selectedBusinessId)
          .single();

        if (loyaltyCustomer && !error) {
          customerData = {
            loyalty_customer_id: loyaltyCustomer.id,
            customer_name: loyaltyCustomer.customer_name,
            customer_phone: loyaltyCustomer.customer_phone || '',
            customer_email: loyaltyCustomer.customer_email || '',
            auto_apply_loyalty: true
          };
        }
      }

      // Try searching by customer_name if it's just text
      if (!customerData && qrData.length > 2 && !qrData.match(/^[\d\-\+\s\(\)]+$/)) {
        const { data: loyaltyCustomers, error } = await supabase
          .from('pos_loyalty_accounts')
          .select('id, customer_name, customer_email, customer_phone, balance, points')
          .eq('business_id', auth.selectedBusinessId)
          .ilike('customer_name', `%${qrData}%`)
          .limit(1);

        if (loyaltyCustomers && loyaltyCustomers.length > 0 && !error) {
          const loyaltyCustomer = loyaltyCustomers[0];
          customerData = {
            loyalty_customer_id: loyaltyCustomer.id,
            customer_name: loyaltyCustomer.customer_name,
            customer_phone: loyaltyCustomer.customer_phone || '',
            customer_email: loyaltyCustomer.customer_email || '',
            auto_apply_loyalty: true
          };
        }
      }

      if (customerData) {
        setNewTab(prev => ({
          ...prev,
          ...customerData
        }));

        await logAuditAction('customer_qr_scan_success', {
          customer_id: customerData.loyalty_customer_id,
          customer_name: customerData.customer_name,
          scan_type: 'loyalty_customer',
          qr_data: qrData
        });

        setError(null);
      } else {
        const isUUID = qrData.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        const isPhone = qrData.match(/^\+?[\d\s\-\(\)]+$/);
        
        if (!isUUID && !isPhone && qrData.length > 2 && qrData.length < 50 && !qrData.includes('/')) {
          setNewTab(prev => ({
            ...prev,
            customer_name: qrData,
            loyalty_customer_id: null,
            auto_apply_loyalty: false
          }));
          
          await logAuditAction('customer_qr_scan_fallback', {
            customer_name: qrData,
            scan_type: 'manual_name_entry'
          });
        } else {
          setError('Customer not found in loyalty system. Please verify the QR code or enter information manually.');
          
          await logAuditAction('customer_qr_scan_failed', {
            qr_data: qrData,
            error: 'customer_not_found'
          });
        }
      }
    } catch (err) {
      console.error('Customer QR scan error:', err);
      setError('Failed to process customer QR code: ' + err.message);
      
      await logAuditAction('customer_qr_scan_error', {
        error: err.message,
        qr_data: qrData
      });
    } finally {
      setShowQRInput(false);
      setQrInputValue('');
    }
  }, [auth.selectedBusinessId, logAuditAction]);

  const handleReceiptQRScan = useCallback(async (qrData) => {
    if (!auth.selectedBusinessId) {
      setError('No business selected');
      return;
    }

    try {
      setError(null);
      let receiptId = null;
      
      if (qrData.includes('/receipt/')) {
        const urlParts = qrData.split('/receipt/');
        receiptId = urlParts[1]?.split('?')[0];
      } else if (qrData.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        receiptId = qrData;
      }

      if (receiptId) {
        const { data: receipt, error } = await supabase
          .from('pos_sales')
          .select(`
            *,
            pos_loyalty_accounts (
              id, customer_name, customer_email, customer_phone, balance, points
            )
          `)
          .eq('id', receiptId)
          .eq('business_id', auth.selectedBusinessId)
          .single();

        if (receipt && !error && receipt.pos_loyalty_accounts) {
          setNewTab(prev => ({
            ...prev,
            loyalty_customer_id: receipt.pos_loyalty_accounts.id,
            customer_name: receipt.pos_loyalty_accounts.customer_name,
            customer_phone: receipt.pos_loyalty_accounts.customer_phone || '',
            customer_email: receipt.pos_loyalty_accounts.customer_email || '',
            auto_apply_loyalty: true
          }));

          await logAuditAction('receipt_qr_scan_success', {
            receipt_id: receiptId,
            customer_id: receipt.pos_loyalty_accounts.id,
            scan_type: 'receipt_lookup'
          });

          setError(null);
        } else {
          setError('Receipt not found or no customer associated with this receipt.');
          
          await logAuditAction('receipt_qr_scan_failed', {
            receipt_id: receiptId,
            error: 'receipt_not_found_or_no_customer'
          });
        }
      } else {
        setError('Invalid receipt QR code format.');
        
        await logAuditAction('receipt_qr_scan_invalid', {
          qr_data: qrData,
          error: 'invalid_format'
        });
      }
    } catch (err) {
      console.error('Receipt QR scan error:', err);
      setError('Failed to process receipt QR code: ' + err.message);
      
      await logAuditAction('receipt_qr_scan_error', {
        error: err.message,
        qr_data: qrData
      });
    } finally {
      setShowQRInput(false);
      setQrInputValue('');
    }
  }, [auth.selectedBusinessId, logAuditAction]);

  const handleCreateTab = useCallback(async () => {
    if (!newTab.customer_name.trim() || !auth.authUser || !auth.selectedBusinessId) {
      setError('Customer name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tabNumber = newTab.tab_number.trim() || generateTabNumber();

      const tabData = {
        business_id: auth.selectedBusinessId,
        tab_number: tabNumber,
        customer_name: newTab.customer_name.trim(),
        customer_phone: newTab.customer_phone.trim() || null,
        customer_email: newTab.customer_email.trim() || null,
        loyalty_customer_id: newTab.loyalty_customer_id || null,
        notes: newTab.notes.trim() || null,
        started_by: auth.authUser.id,
        status: 'open',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        amount_paid: 0,
        balance_remaining: 0,
        auto_apply_loyalty: newTab.auto_apply_loyalty,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await logAuditAction('tab_creation_initiated', {
        tab_number: tabNumber,
        customer_name: newTab.customer_name.trim(),
        has_loyalty_customer: !!newTab.loyalty_customer_id,
        auto_apply_loyalty: newTab.auto_apply_loyalty
      });

      await onCreateTab(tabData);

      await logAuditAction('tab_creation_success', {
        tab_number: tabNumber,
        customer_name: newTab.customer_name.trim()
      });

      // Reset form
      setNewTab({ 
        customer_name: '', 
        customer_phone: '', 
        customer_email: '', 
        notes: '', 
        tab_number: '', 
        loyalty_customer_id: null,
        auto_apply_loyalty: false
      });

    } catch (err) {
      console.error('Error creating tab:', err);
      setError('Failed to create tab: ' + err.message);
      
      await logAuditAction('tab_creation_error', {
        error: err.message,
        customer_name: newTab.customer_name.trim()
      });
    } finally {
      setLoading(false);
    }
  }, [newTab, auth.authUser, auth.selectedBusinessId, generateTabNumber, onCreateTab, logAuditAction]);

  const handleQRScanResult = useCallback((qrData) => {
    if (scanningFor === 'customer') {
      handleCustomerQRScan(qrData);
    } else if (scanningFor === 'receipt') {
      handleReceiptQRScan(qrData);
    }
  }, [scanningFor, handleCustomerQRScan, handleReceiptQRScan]);

  // Don't render if not ready or modal not shown
  if (!showModal || !auth.isReady) return null;

  const styles = {
    modal: {
      ...TavariStyles.components.modal.overlay
    },
    modalContent: {
      ...TavariStyles.components.modal.content,
      maxWidth: '600px',
      width: '90%'
    },
    modalHeader: {
      ...TavariStyles.components.modal.header
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
      fontSize: '24px',
      cursor: 'pointer',
      color: TavariStyles.colors.gray500,
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    modalBody: {
      ...TavariStyles.components.modal.body
    },
    errorBanner: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.lg
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.lg
    },
    qrScanSection: {
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing.xl,
      borderRadius: TavariStyles.borderRadius.lg,
      border: `2px solid ${TavariStyles.colors.primary}`
    },
    qrScanText: {
      margin: `0 0 ${TavariStyles.spacing.md} 0`,
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.primary,
      textAlign: 'center'
    },
    qrScanButtons: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      justifyContent: 'center',
      flexWrap: 'wrap'
    },
    qrScanButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md
    },
    formDivider: {
      textAlign: 'center',
      position: 'relative',
      margin: `${TavariStyles.spacing.xl} 0`,
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      '::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: '1px',
        backgroundColor: TavariStyles.colors.gray300
      }
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    label: {
      ...TavariStyles.components.form.label
    },
    input: {
      ...TavariStyles.components.form.input
    },
    textarea: {
      ...TavariStyles.components.form.input,
      resize: 'vertical',
      minHeight: '80px'
    },
    loyaltyInfo: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.successText,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.md,
      textAlign: 'center',
      fontWeight: TavariStyles.typography.fontWeight.semibold
    },
    modalFooter: {
      ...TavariStyles.components.modal.footer
    },
    cancelButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.lg
    },
    submitButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg,
      opacity: loading || !newTab.customer_name.trim() ? 0.6 : 1,
      cursor: loading || !newTab.customer_name.trim() ? 'not-allowed' : 'pointer'
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
      marginBottom: TavariStyles.spacing.md,
      color: TavariStyles.colors.gray600,
      lineHeight: TavariStyles.typography.lineHeight.relaxed
    }
  };

  return (
    <div style={styles.modal} data-testid={testId}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Create New Tab</h3>
          <button
            style={styles.closeModalButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div style={styles.modalBody}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          
          <div style={styles.form}>
            <div style={styles.qrScanSection}>
              <p style={styles.qrScanText}>Quick customer lookup:</p>
              <div style={styles.qrScanButtons}>
                <button
                  style={styles.qrScanButton}
                  onClick={() => {
                    setScanningFor('customer');
                    setShowQRInput(true);
                  }}
                >
                  📱 Scan Loyalty Card
                </button>
                <button
                  style={styles.qrScanButton}
                  onClick={() => {
                    setScanningFor('receipt');
                    setShowQRInput(true);
                  }}
                >
                  🧾 Scan Receipt
                </button>
              </div>
            </div>

            <div style={styles.formDivider}>
              <span>OR ENTER MANUALLY</span>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Customer Name *</label>
              <input
                type="text"
                value={newTab.customer_name}
                onChange={(e) => setNewTab({...newTab, customer_name: e.target.value})}
                placeholder="Enter customer name"
                style={styles.input}
                autoFocus
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Customer Phone</label>
              <input
                type="tel"
                value={newTab.customer_phone}
                onChange={(e) => setNewTab({...newTab, customer_phone: e.target.value})}
                placeholder="(555) 123-4567"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Customer Email</label>
              <input
                type="email"
                value={newTab.customer_email}
                onChange={(e) => setNewTab({...newTab, customer_email: e.target.value})}
                placeholder="customer@example.com"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Tab Number</label>
              <input
                type="text"
                value={newTab.tab_number}
                onChange={(e) => setNewTab({...newTab, tab_number: e.target.value})}
                placeholder="Leave blank for auto-generate"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                value={newTab.notes}
                onChange={(e) => setNewTab({...newTab, notes: e.target.value})}
                placeholder="Special instructions or notes..."
                style={styles.textarea}
                rows="3"
              />
            </div>

            {newTab.loyalty_customer_id && (
              <>
                <div style={styles.loyaltyInfo}>
                  ⭐ Loyalty customer linked
                </div>
                <TavariCheckbox
                  checked={newTab.auto_apply_loyalty}
                  onChange={(checked) => setNewTab({...newTab, auto_apply_loyalty: checked})}
                  label="Automatically apply loyalty rewards to this tab"
                  size="md"
                />
              </>
            )}
          </div>
        </div>
        
        <div style={styles.modalFooter}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={styles.submitButton}
            onClick={handleCreateTab}
            disabled={!newTab.customer_name.trim() || loading}
          >
            {loading ? 'Creating...' : 'Create Tab'}
          </button>
        </div>
      </div>

      {/* QR Input Modal */}
      {showQRInput && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {scanningFor === 'customer' ? 'Scan/Enter Customer Info' : 'Scan/Enter Receipt Code'}
              </h3>
              <button
                style={styles.closeModalButton}
                onClick={() => {
                  setShowQRInput(false);
                  setQrInputValue('');
                }}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <BarcodeScanHandler onScan={handleBarcodeOrQRScan} />
              
              <div style={styles.qrInputSection}>
                <p style={styles.qrInstructions}>
                  {scanningFor === 'customer' 
                    ? 'Scan the customer\'s loyalty card barcode/QR code, or enter their information manually below:'
                    : 'Scan the receipt barcode/QR code, or enter the receipt ID manually below:'
                  }
                </p>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {scanningFor === 'customer' ? 'Customer ID, Phone, or Name:' : 'Receipt ID:'}
                  </label>
                  <input
                    type="text"
                    value={qrInputValue}
                    onChange={(e) => setQrInputValue(e.target.value)}
                    placeholder={scanningFor === 'customer' ? 'Enter customer ID, phone number, or name' : 'Enter receipt ID'}
                    style={styles.input}
                    autoFocus
                  />
                </div>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setShowQRInput(false);
                  setQrInputValue('');
                }}
              >
                Cancel
              </button>
              <button
                style={styles.submitButton}
                onClick={() => {
                  if (qrInputValue.trim()) {
                    handleQRScanResult(qrInputValue.trim());
                  }
                }}
                disabled={!qrInputValue.trim()}
              >
                Look Up Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTabModal;