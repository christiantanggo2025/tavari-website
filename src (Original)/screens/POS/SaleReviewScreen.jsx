// screens/POS/SaleReviewScreen.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusinessContext } from '../../contexts/BusinessContext';

const SaleReviewScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBusinessId } = useBusinessContext();
  
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessSettings, setBusinessSettings] = useState({});
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(null);

  // Get cart data from navigation state or fetch from database
  const checkoutData = location.state?.checkoutData;

  useEffect(() => {
    if (!selectedBusinessId) {
      setError('No business selected');
      setLoading(false);
      return;
    }

    if (!checkoutData) {
      setError('No checkout data provided');
      setLoading(false);
      return;
    }

    console.log('Checkout data received:', checkoutData); // Debug log
    loadSaleData();
  }, [selectedBusinessId, checkoutData]);

  const loadSaleData = async () => {
    try {
      setLoading(true);

      // Fetch business settings for tax calculation
      const { data: settings, error: settingsError } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .single();

      if (settingsError) throw settingsError;
      setBusinessSettings(settings || {});

      // If loyalty customer is attached, fetch their details
      if (checkoutData.loyalty_customer_id) {
        const { data: customer, error: customerError } = await supabase
          .from('pos_loyalty_accounts')
          .select('*')
          .eq('id', checkoutData.loyalty_customer_id)
          .single();

        if (!customerError && customer) {
          setLoyaltyCustomer(customer);
        }
      }

      // Set cart data from checkout
      setCartData(checkoutData);

    } catch (err) {
      console.error('Error loading sale data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRegister = () => {
    navigate('/dashboard/pos/register');
  };

  const handleProceedToPayment = () => {
    // Pass sale data to payment screen
    navigate('/dashboard/pos/payment', {
      state: {
        saleData: {
          ...cartData,
          businessSettings,
          loyaltyCustomer,
          business_id: selectedBusinessId
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div>Loading sale review...</div>
          <div style={{ fontSize: '14px', marginTop: '10px' }}>
            Business ID: {selectedBusinessId || 'Not selected'}
          </div>
          {checkoutData && (
            <div style={{ fontSize: '14px', marginTop: '5px' }}>
              Items count: {checkoutData.items?.length || 0}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>Error</h3>
          <p>{error}</p>
          <div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
            Debug Info:
            <br />Business ID: {selectedBusinessId || 'Not selected'}
            <br />Checkout Data: {checkoutData ? 'Present' : 'Missing'}
            {checkoutData && (
              <>
                <br />Items: {checkoutData.items?.length || 'No items'}
                <br />Total: ${checkoutData.total_amount?.toFixed(2) || 'No total'}
              </>
            )}
          </div>
          <button style={styles.backButton} onClick={handleBackToRegister}>
            Back to Register
          </button>
        </div>
      </div>
    );
  }

  if (!cartData) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>No Sale Data</h3>
          <p>No items to review</p>
          <button style={styles.backButton} onClick={handleBackToRegister}>
            Back to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Review Sale</h2>
        <p>Please review the order details before proceeding to payment</p>
      </div>

      <div style={styles.content}>
        {/* Cart Items Review */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Items ({cartData.item_count})</h3>
          <div style={styles.itemsList}>
            {cartData.items?.map((item, index) => (
              <div key={index} style={styles.item}>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{item.name}</div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div style={styles.modifiers}>
                      {item.modifiers.map((mod, modIndex) => (
                        <div key={modIndex} style={styles.modifier}>
                          {mod.required ? '• ' : '+ '}{mod.name}
                          {mod.price > 0 && <span> (+${Number(mod.price).toFixed(2)})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <div style={styles.notes}>Note: {item.notes}</div>
                  )}
                </div>
                <div style={styles.itemDetails}>
                  <div style={styles.quantity}>Qty: {item.quantity}</div>
                  <div style={styles.price}>${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Information */}
        {loyaltyCustomer && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Customer</h3>
            <div style={styles.customerInfo}>
              <div style={styles.customerName}>{loyaltyCustomer.customer_name}</div>
              {loyaltyCustomer.customer_email && (
                <div style={styles.customerDetail}>{loyaltyCustomer.customer_email}</div>
              )}
              {loyaltyCustomer.customer_phone && (
                <div style={styles.customerDetail}>{loyaltyCustomer.customer_phone}</div>
              )}
              <div style={styles.loyaltyBalance}>
                {businessSettings.loyalty_mode === 'points' ? (
                  <>Balance: {loyaltyCustomer.points || 0} points</>
                ) : (
                  <>Balance: ${(loyaltyCustomer.balance || 0).toFixed(2)}</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sale Totals */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Order Total</h3>
          <div style={styles.totals}>
            <div style={styles.totalRow}>
              <span>Subtotal</span>
              <span>${cartData.subtotal.toFixed(2)}</span>
            </div>

            {cartData.discount_amount > 0 && (
              <div style={styles.totalRowDiscount}>
                <span>Discount</span>
                <span>-${cartData.discount_amount.toFixed(2)}</span>
              </div>
            )}

            {cartData.loyalty_redemption > 0 && (
              <div style={styles.totalRowLoyalty}>
                <span>Loyalty Redemption</span>
                <span>-${cartData.loyalty_redemption.toFixed(2)}</span>
              </div>
            )}

            <div style={styles.totalRow}>
              <span>Tax ({(businessSettings.tax_rate * 100 || 0).toFixed(1)}%)</span>
              <span>${cartData.tax_amount.toFixed(2)}</span>
            </div>

            {businessSettings.service_fee > 0 && (
              <div style={styles.totalRow}>
                <span>Service Fee</span>
                <span>${((cartData.subtotal * businessSettings.service_fee) || 0).toFixed(2)}</span>
              </div>
            )}

            <div style={styles.totalRowFinal}>
              <span>Total</span>
              <span>${cartData.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button style={styles.backButton} onClick={handleBackToRegister}>
          Back to Register
        </button>
        <button style={styles.proceedButton} onClick={handleProceedToPayment}>
          Proceed to Payment - ${cartData.total_amount.toFixed(2)}
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
    paddingTop: '100px', // Account for header
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center'
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
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  },
  modifiers: {
    marginLeft: '16px',
    fontSize: '14px',
    color: '#6b7280'
  },
  modifier: {
    marginBottom: '2px',
    fontStyle: 'italic'
  },
  notes: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#059669',
    fontStyle: 'italic'
  },
  itemDetails: {
    textAlign: 'right',
    minWidth: '100px'
  },
  quantity: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  price: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
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
    marginBottom: '6px'
  },
  customerDetail: {
    fontSize: '14px',
    marginBottom: '4px',
    opacity: 0.9
  },
  loyaltyBalance: {
    fontSize: '14px',
    marginTop: '8px',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '6px 10px',
    borderRadius: '4px',
    display: 'inline-block'
  },
  totals: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    color: '#1f2937'
  },
  totalRowDiscount: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    color: '#dc2626',
    fontWeight: '500'
  },
  totalRowLoyalty: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    color: '#059669',
    fontWeight: '500'
  },
  totalRowFinal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    paddingTop: '12px',
    borderTop: '2px solid #008080',
    marginTop: '8px'
  },
  actions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'space-between'
  },
  backButton: {
    flex: 1,
    padding: '15px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  proceedButton: {
    flex: 2,
    padding: '15px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
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
  }
};

export default SaleReviewScreen;