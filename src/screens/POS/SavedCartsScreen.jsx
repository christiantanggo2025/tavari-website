// screens/POS/SavedCartsScreen.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import { logAction } from '../../helpers/posAudit';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const SavedCartsScreen = () => {
  const navigate = useNavigate();
  
  const auth = usePOSAuth({
    requiredRoles: ['cashier', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'SavedCartsScreen'
  });

  const taxCalc = useTaxCalculations(auth.selectedBusinessId);

  const [savedCarts, setSavedCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartToDelete, setCartToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);

  const loadSavedCarts = async () => {
    if (!auth.selectedBusinessId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading saved carts for business:', auth.selectedBusinessId);
      
      // FIXED: Handle null expires_at properly
      let query = supabase
        .from('pos_saved_orders')
        .select('*')
        .eq('business_id', auth.selectedBusinessId);

      // FIXED: Handle expires_at null values
      if (showExpiredOnly) {
        query = query.not('expires_at', 'is', null).lt('expires_at', new Date().toISOString());
      } else {
        // Show active carts (null expires_at OR future expires_at)
        query = query.or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());
      }

      const { data: savedOrders, error: savedError } = await query.order('created_at', { ascending: false });

      if (savedError) {
        console.error('Query error:', savedError);
        throw savedError;
      }

      console.log('Raw query result:', savedOrders);

      if (!savedOrders || savedOrders.length === 0) {
        setSavedCarts([]);
        setLoading(false);
        return;
      }

      const processedCarts = savedOrders.map((order) => {
        const cartData = order.cart_data || {};
        const items = cartData.items || [];
        
        // Use the stored totals from the database
        const subtotal = parseFloat(order.subtotal) || 0;
        const taxAmount = parseFloat(order.tax_amount) || 0;
        const total = parseFloat(order.total_amount) || 0;
        
        let customerName = order.order_name || 'Walk-in';
        if (order.customer_info?.name) {
          customerName = order.customer_info.name;
        } else if (cartData.loyaltyCustomer?.customer_name) {
          customerName = cartData.loyaltyCustomer.customer_name;
        }
        
        let cartType = 'saved';
        let reason = 'Manually saved';
        if (order.save_reason === 'timeout' || order.save_reason === 'session_timeout') {
          cartType = 'timeout';
          reason = 'Session timeout';
        }

        // FIXED: Handle null expires_at
        const isExpired = order.expires_at ? new Date(order.expires_at) < new Date() : false;
        
        return {
          id: order.id,
          type: cartType,
          reason,
          itemCount: order.item_count || items.length,
          subtotal,
          totalTax: taxAmount,
          total,
          customerName,
          savedBy: 'Employee',
          savedAt: order.created_at,
          expiresAt: order.expires_at,
          isExpired,
          cartData: cartData,
          items: items,
          businessId: order.business_id,
          canBeResumed: items.length > 0 && !isExpired
        };
      });

      console.log('Processed carts:', processedCarts);
      setSavedCarts(processedCarts);
      
    } catch (err) {
      console.error('Error loading saved carts:', err);
      setError(`Failed to load saved carts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load data when ready
  useEffect(() => {
    if (auth.isReady && auth.selectedBusinessId) {
      loadSavedCarts();
    }
  }, [auth.isReady, auth.selectedBusinessId]);

  // Reload when filter changes
  useEffect(() => {
    if (auth.isReady && auth.selectedBusinessId) {
      loadSavedCarts();
    }
  }, [showExpiredOnly]);

  const handleResumeCart = async (cart) => {
    try {
      navigate('/dashboard/pos/register', {
        state: {
          resumeCart: {
            items: cart.items,
            customer: cart.cartData.loyaltyCustomer || {
              customer_name: cart.customerName,
              id: null
            },
            cartId: cart.id
          }
        }
      });
    } catch (err) {
      setError(`Failed to resume cart: ${err.message}`);
    }
  };

  const handleDeleteCart = async (cartId) => {
    try {
      const { error } = await supabase
        .from('pos_saved_orders')
        .delete()
        .eq('id', cartId)
        .eq('business_id', auth.selectedBusinessId);

      if (error) throw error;

      setSavedCarts(prev => prev.filter(cart => cart.id !== cartId));
      setShowDeleteModal(false);
      setCartToDelete(null);
    } catch (err) {
      setError(`Failed to delete cart: ${err.message}`);
    }
  };

  if (!auth.isReady) {
    return (
      <div style={{ ...TavariStyles.layout.container, paddingTop: '100px' }}>
        <div style={TavariStyles.components.loading.container}>
          <div style={TavariStyles.components.loading.spinner}></div>
          <div>Loading...</div>
          <style>{TavariStyles.keyframes.spin}</style>
        </div>
      </div>
    );
  }

  if (auth.authError) {
    return (
      <div style={{ ...TavariStyles.layout.container, paddingTop: '100px' }}>
        <div style={{ ...TavariStyles.components.banner.base, ...TavariStyles.components.banner.variants.error }}>
          Authentication Error: {auth.authError}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...TavariStyles.layout.container, paddingTop: '100px' }}>
        <div style={TavariStyles.components.loading.container}>
          <div style={TavariStyles.components.loading.spinner}></div>
          <div>Loading saved carts...</div>
          <style>{TavariStyles.keyframes.spin}</style>
        </div>
      </div>
    );
  }

  const filteredCarts = savedCarts.filter(cart => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      cart.customerName.toLowerCase().includes(searchLower) ||
      cart.id.toLowerCase().includes(searchLower);
    
    const matchesType = filterType === 'all' || 
      (filterType === 'saved' && cart.type === 'saved') ||
      (filterType === 'timeout' && cart.type === 'timeout') ||
      (filterType === 'resumable' && cart.canBeResumed) ||
      (filterType === 'expired' && cart.isExpired);
    
    return matchesSearch && matchesType;
  });

  const styles = {
    container: { ...TavariStyles.layout.container, paddingTop: '100px' },
    header: { marginBottom: TavariStyles.spacing['3xl'] },
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0,
      marginBottom: TavariStyles.spacing.md
    },
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600,
      margin: 0
    },
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.xl,
      gap: TavariStyles.spacing.lg,
      flexWrap: 'wrap'
    },
    filters: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center',
      flex: 1
    },
    searchInput: {
      ...TavariStyles.components.form.input,
      flex: 1,
      minWidth: '250px'
    },
    select: {
      ...TavariStyles.components.form.select,
      minWidth: '120px'
    },
    cartsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: TavariStyles.spacing.lg
    },
    cartCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      cursor: 'pointer'
    },
    emptyState: {
      textAlign: 'center',
      padding: TavariStyles.spacing['5xl'],
      color: TavariStyles.colors.gray500
    },
    error: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.lg
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Saved Carts</h2>
        <p style={styles.subtitle}>Resume incomplete transactions</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.controls}>
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="Search by customer, cart ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.select}
          >
            <option value="all">All ({savedCarts.length})</option>
            <option value="resumable">Resumable</option>
            <option value="saved">Manual</option>
            <option value="timeout">Timeout</option>
            <option value="expired">Expired</option>
          </select>

          <TavariCheckbox
            checked={showExpiredOnly}
            onChange={(checked) => setShowExpiredOnly(checked)}
            label="Show expired only"
            size="md"
          />
        </div>

        <button
          style={{
            ...TavariStyles.components.button.base,
            ...TavariStyles.components.button.variants.secondary
          }}
          onClick={() => navigate('/dashboard/pos/tabs')}
        >
          Back to Tabs
        </button>
      </div>

      {filteredCarts.length === 0 ? (
        <div style={styles.emptyState}>
          <h3>No Saved Carts Found</h3>
          <p>No carts match your current filters.</p>
        </div>
      ) : (
        <div style={styles.cartsGrid}>
          {filteredCarts.map((cart) => (
            <div key={cart.id} style={styles.cartCard}>
              <h4>{cart.customerName}</h4>
              <p>Items: {cart.itemCount}</p>
              <p>Total: ${cart.total.toFixed(2)}</p>
              <p>Saved: {dayjs(cart.savedAt).fromNow()}</p>
              
              <div style={{ display: 'flex', gap: TavariStyles.spacing.sm, marginTop: TavariStyles.spacing.md }}>
                <button
                  style={{
                    ...TavariStyles.components.button.base,
                    ...TavariStyles.components.button.variants.primary,
                    ...TavariStyles.components.button.sizes.sm,
                    flex: 1
                  }}
                  onClick={() => handleResumeCart(cart)}
                  disabled={!cart.canBeResumed}
                >
                  Resume
                </button>
                <button
                  style={{
                    ...TavariStyles.components.button.base,
                    ...TavariStyles.components.button.variants.danger,
                    ...TavariStyles.components.button.sizes.sm
                  }}
                  onClick={() => {
                    setCartToDelete(cart);
                    setShowDeleteModal(true);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteModal && cartToDelete && (
        <div style={TavariStyles.components.modal.overlay}>
          <div style={TavariStyles.components.modal.content}>
            <h3>Delete Cart?</h3>
            <p>Are you sure you want to delete this cart?</p>
            <div style={{ display: 'flex', gap: TavariStyles.spacing.md, justifyContent: 'flex-end', marginTop: TavariStyles.spacing.lg }}>
              <button
                style={{
                  ...TavariStyles.components.button.base,
                  ...TavariStyles.components.button.variants.secondary
                }}
                onClick={() => {
                  setShowDeleteModal(false);
                  setCartToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  ...TavariStyles.components.button.base,
                  ...TavariStyles.components.button.variants.danger
                }}
                onClick={() => handleDeleteCart(cartToDelete.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedCartsScreen;