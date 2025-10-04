// screens/POS/POSLoyaltyScreen.jsx - Updated with Auto-Apply Settings (Step 121)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { logAction } from '../../helpers/posAudit';

// Foundation Components
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../utils/TavariStyles';

const POSLoyaltyScreen = ({ 
  onCustomerSelected = null, // Callback when customer is selected for cart attachment
  standalone = true // true when opened as standalone screen, false when used as modal
}) => {
  const navigate = useNavigate();
  
  // Use POS Auth hook
  const auth = usePOSAuth({
    requiredRoles: ['cashier', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'POSLoyaltyScreen'
  });

  // Use Tax Calculations hook (for loyalty calculations that might involve tax)
  const taxCalculations = useTaxCalculations(auth.selectedBusinessId);
  
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false); // NEW: Settings modal
  const [loyaltySettings, setLoyaltySettings] = useState({});
  
  // New customer form data
  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    initial_balance: 0,
    initial_points: 0,
    email_notifications: true,
    sms_notifications: false
  });

  // Balance adjustment data
  const [adjustment, setAdjustment] = useState({
    type: 'add', // 'add' or 'subtract'
    amount: '',
    reason: '',
    points: ''
  });

  useEffect(() => {
    if (auth.selectedBusinessId && auth.authUser) {
      loadLoyaltySettings();
      loadCustomers();
    }
  }, [auth.selectedBusinessId, auth.authUser]);

  useEffect(() => {
    if (auth.selectedBusinessId && auth.authUser) {
      if (searchTerm) {
        searchCustomers();
      } else {
        loadCustomers();
      }
    }
  }, [searchTerm, auth.selectedBusinessId, auth.authUser]);

  const loadLoyaltySettings = async () => {
    if (!auth.selectedBusinessId) return;

    try {
      const { data, error } = await supabase
        .from('pos_loyalty_settings')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      
      // Set default settings if none exist
      const defaultSettings = {
        is_active: true,
        loyalty_mode: 'points',
        earn_rate_percentage: 5,
        redemption_rate: 1000,
        min_redemption: 5000,
        max_redemption_per_day: 25000,
        auto_apply: 'manual', // Step 121: Default to manual
        allow_partial_redemption: true,
        points_expire_days: null,
        welcome_bonus_points: 0
      };
      
      setLoyaltySettings(data ? { ...defaultSettings, ...data } : defaultSettings);
    } catch (err) {
      console.error('Error loading loyalty settings:', err);
    }
  };

  // NEW: Update loyalty settings function (Step 121)
  const updateLoyaltySettings = async (updatedSettings) => {
    if (!auth.selectedBusinessId) return;

    try {
      setLoading(true);
      setError(null);

      const settingsData = {
        business_id: auth.selectedBusinessId,
        ...updatedSettings,
        updated_at: new Date().toISOString()
      };

      // Try to update first
      const { data: existingData } = await supabase
        .from('pos_loyalty_settings')
        .select('id')
        .eq('business_id', auth.selectedBusinessId)
        .single();

      let result;
      if (existingData) {
        // Update existing
        result = await supabase
          .from('pos_loyalty_settings')
          .update(settingsData)
          .eq('business_id', auth.selectedBusinessId)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('pos_loyalty_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setLoyaltySettings(result.data);

      await logAction({
        action: 'loyalty_settings_updated',
        context: 'POSLoyaltyScreen',
        metadata: {
          business_id: auth.selectedBusinessId,
          updated_settings: updatedSettings
        }
      });

      alert('Loyalty settings updated successfully!');

    } catch (err) {
      console.error('Error updating loyalty settings:', err);
      setError('Failed to update settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    if (!auth.selectedBusinessId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_loyalty_accounts')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async () => {
    if (!searchTerm.trim() || !auth.selectedBusinessId) {
      loadCustomers();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_loyalty_accounts')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .eq('is_active', true)
        .or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error searching customers:', err);
      setError('Failed to search customers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.customer_name.trim()) {
      setError('Customer name is required');
      return;
    }

    if (!auth.selectedBusinessId || !auth.authUser) {
      setError('Authentication error');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const customerData = {
        business_id: auth.selectedBusinessId,
        customer_name: newCustomer.customer_name.trim(),
        customer_email: newCustomer.customer_email.trim() || null,
        customer_phone: newCustomer.customer_phone.trim() || null,
        balance: loyaltySettings.loyalty_mode === 'dollars' ? Number(newCustomer.initial_balance) || 0 : 0,
        points: loyaltySettings.loyalty_mode === 'points' ? Number(newCustomer.initial_points) || 0 : 0,
        total_earned: 0,
        total_spent: 0,
        is_active: true,
        email_notifications: newCustomer.email_notifications,
        sms_notifications: newCustomer.sms_notifications,
        created_by: auth.authUser.id,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      };

      const { data: customer, error } = await supabase
        .from('pos_loyalty_accounts')
        .insert(customerData)
        .select()
        .single();

      if (error) throw error;

      // Log initial balance/points if any
      if (customerData.balance > 0 || customerData.points > 0) {
        await supabase
          .from('pos_loyalty_transactions')
          .insert({
            business_id: auth.selectedBusinessId,
            loyalty_account_id: customer.id,
            transaction_type: 'initial_balance',
            amount: customerData.balance,
            points: customerData.points,
            balance_before: 0,
            balance_after: customerData.balance,
            points_before: 0,
            points_after: customerData.points,
            description: 'Initial account setup',
            processed_by: auth.authUser.id,
            processed_at: new Date().toISOString()
          });
      }

      await logAction({
        action: 'loyalty_customer_created',
        context: 'POSLoyaltyScreen',
        metadata: {
          customer_id: customer.id,
          customer_name: customer.customer_name,
          initial_balance: customerData.balance,
          initial_points: customerData.points,
          email_notifications: customerData.email_notifications,
          sms_notifications: customerData.sms_notifications
        }
      });

      setNewCustomer({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        initial_balance: 0,
        initial_points: 0,
        email_notifications: true,
        sms_notifications: false
      });
      setShowNewCustomerForm(false);
      loadCustomers();

      alert('Customer created successfully!');

    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedCustomer || (!adjustment.amount && !adjustment.points)) {
      setError('Please enter an adjustment amount');
      return;
    }

    if (!adjustment.reason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    if (!auth.selectedBusinessId || !auth.authUser) {
      setError('Authentication error');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentBalance = selectedCustomer.balance || 0;
      const currentPoints = selectedCustomer.points || 0;
      const adjustmentAmount = Number(adjustment.amount) || 0;
      const adjustmentPoints = Number(adjustment.points) || 0;

      let newBalance = currentBalance;
      let newPoints = currentPoints;

      if (loyaltySettings.loyalty_mode === 'dollars') {
        newBalance = adjustment.type === 'add' 
          ? currentBalance + adjustmentAmount
          : Math.max(0, currentBalance - adjustmentAmount);
      } else {
        newPoints = adjustment.type === 'add'
          ? currentPoints + adjustmentPoints
          : Math.max(0, currentPoints - adjustmentPoints);
      }

      // Update customer balance
      const { error: updateError } = await supabase
        .from('pos_loyalty_accounts')
        .update({
          balance: newBalance,
          points: newPoints,
          last_activity: new Date().toISOString()
        })
        .eq('id', selectedCustomer.id);

      if (updateError) throw updateError;

      // Log the adjustment transaction
      await supabase
        .from('pos_loyalty_transactions')
        .insert({
          business_id: auth.selectedBusinessId,
          loyalty_account_id: selectedCustomer.id,
          transaction_type: adjustment.type === 'add' ? 'manual_add' : 'manual_subtract',
          amount: loyaltySettings.loyalty_mode === 'dollars' ? adjustmentAmount : 0,
          points: loyaltySettings.loyalty_mode === 'points' ? adjustmentPoints : null,
          balance_before: currentBalance,
          balance_after: newBalance,
          points_before: currentPoints,
          points_after: newPoints,
          description: `Manual adjustment: ${adjustment.reason}`,
          processed_by: auth.authUser.id,
          processed_at: new Date().toISOString()
        });

      await logAction({
        action: 'loyalty_balance_adjusted',
        context: 'POSLoyaltyScreen',
        metadata: {
          customer_id: selectedCustomer.id,
          adjustment_type: adjustment.type,
          amount: adjustmentAmount,
          points: adjustmentPoints,
          reason: adjustment.reason,
          old_balance: currentBalance,
          new_balance: newBalance,
          old_points: currentPoints,
          new_points: newPoints
        }
      });

      setAdjustment({ type: 'add', amount: '', reason: '', points: '' });
      setShowAdjustmentModal(false);
      setSelectedCustomer({ ...selectedCustomer, balance: newBalance, points: newPoints });
      loadCustomers(); // Refresh the list

      alert('Balance adjusted successfully!');

    } catch (err) {
      console.error('Error adjusting balance:', err);
      setError('Failed to adjust balance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    
    if (onCustomerSelected && !standalone) {
      // If this is used as a modal for cart attachment
      onCustomerSelected(customer);
    }

    logAction({
      action: 'loyalty_customer_selected',
      context: 'POSLoyaltyScreen',
      metadata: {
        customer_id: customer.id,
        customer_name: customer.customer_name,
        current_balance: customer.balance,
        current_points: customer.points
      }
    });
  };

  const renderCustomerList = () => {
    if (loading) {
      return <div style={styles.loading}>Loading customers...</div>;
    }

    if (customers.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👥</div>
          <div style={styles.emptyTitle}>No customers found</div>
          <div style={styles.emptyText}>
            {searchTerm ? 'Try a different search term' : 'Create your first loyalty customer'}
          </div>
        </div>
      );
    }

    return (
      <div style={styles.customerList}>
        {customers.map(customer => (
          <div 
            key={customer.id} 
            style={{
              ...styles.customerCard,
              ...(selectedCustomer?.id === customer.id ? styles.customerCardSelected : {})
            }}
            onClick={() => handleSelectCustomer(customer)}
          >
            <div style={styles.customerInfo}>
              <div style={styles.customerName}>{customer.customer_name}</div>
              {customer.customer_email && (
                <div style={styles.customerContact}>📧 {customer.customer_email}</div>
              )}
              {customer.customer_phone && (
                <div style={styles.customerContact}>📞 {customer.customer_phone}</div>
              )}
              <div style={styles.customerActivity}>
                Last activity: {new Date(customer.last_activity).toLocaleDateString()}
              </div>
            </div>
            <div style={styles.customerBalance}>
              {loyaltySettings.loyalty_mode === 'points' ? (
                <div style={styles.pointsBalance}>
                  {customer.points || 0} pts
                </div>
              ) : (
                <div style={styles.dollarBalance}>
                  ${(customer.balance || 0).toFixed(2)}
                </div>
              )}
              <div style={styles.customerTotals}>
                Earned: ${(customer.total_earned || 0).toFixed(2)} | 
                Spent: ${(customer.total_spent || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSelectedCustomerDetails = () => {
    if (!selectedCustomer) return null;

    return (
      <div style={styles.customerDetails}>
        <div style={styles.detailsHeader}>
          <h3>Customer Details</h3>
          <button
            style={styles.adjustButton}
            onClick={() => setShowAdjustmentModal(true)}
          >
            Adjust Balance
          </button>
        </div>
        
        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Name:</span>
            <span>{selectedCustomer.customer_name}</span>
          </div>
          
          {selectedCustomer.customer_email && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Email:</span>
              <span>{selectedCustomer.customer_email}</span>
            </div>
          )}
          
          {selectedCustomer.customer_phone && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Phone:</span>
              <span>{selectedCustomer.customer_phone}</span>
            </div>
          )}
          
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Current Balance:</span>
            <span style={styles.balanceValue}>
              {loyaltySettings.loyalty_mode === 'points' 
                ? `${selectedCustomer.points || 0} points`
                : `$${(selectedCustomer.balance || 0).toFixed(2)}`
              }
            </span>
          </div>
          
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Total Earned:</span>
            <span>${(selectedCustomer.total_earned || 0).toFixed(2)}</span>
          </div>
          
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Total Spent:</span>
            <span>${(selectedCustomer.total_spent || 0).toFixed(2)}</span>
          </div>
          
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Member Since:</span>
            <span>{new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
          </div>
          
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Last Activity:</span>
            <span>{new Date(selectedCustomer.last_activity).toLocaleDateString()}</span>
          </div>

          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Email Notifications:</span>
            <span>{selectedCustomer.email_notifications ? 'Enabled' : 'Disabled'}</span>
          </div>

          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>SMS Notifications:</span>
            <span>{selectedCustomer.sms_notifications ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Loyalty Settings Modal (Step 121)
  const renderLoyaltySettingsModal = () => {
    if (!showSettingsModal) return null;

    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h3>Loyalty Program Settings</h3>
            <button 
              style={styles.closeButton}
              onClick={() => setShowSettingsModal(false)}
            >
              ×
            </button>
          </div>
          
          <div style={styles.modalBody}>
            <div style={styles.settingsSection}>
              <h4 style={styles.settingsSubtitle}>Program Status</h4>
              <div style={styles.setting}>
                <TavariCheckbox
                  checked={loyaltySettings.is_active}
                  onChange={(checked) => setLoyaltySettings(prev => ({ ...prev, is_active: checked }))}
                  label="Enable loyalty program"
                  id="loyalty-active"
                />
              </div>
            </div>

            {loyaltySettings.is_active && (
              <>
                <div style={styles.settingsSection}>
                  <h4 style={styles.settingsSubtitle}>Auto-Apply Settings</h4>
                  <div style={styles.setting}>
                    <label style={styles.label}>Loyalty Application Mode:</label>
                    <select
                      value={loyaltySettings.auto_apply || 'manual'}
                      onChange={(e) => setLoyaltySettings(prev => ({ ...prev, auto_apply: e.target.value }))}
                      style={styles.select}
                    >
                      <option value="manual">Manual - Customer chooses when to use loyalty</option>
                      <option value="always">Automatic - Apply loyalty rewards automatically</option>
                      <option value="ask">Ask - Prompt customer at checkout</option>
                    </select>
                    <div style={styles.settingDescription}>
                      {loyaltySettings.auto_apply === 'manual' && 
                        'Customers must manually choose to apply loyalty rewards during checkout.'
                      }
                      {loyaltySettings.auto_apply === 'always' && 
                        'Loyalty rewards will be automatically applied when available.'
                      }
                      {loyaltySettings.auto_apply === 'ask' && 
                        'Cashier will be prompted to ask customer about using loyalty rewards.'
                      }
                    </div>
                  </div>

                  {loyaltySettings.auto_apply === 'always' && (
                    <div style={styles.setting}>
                      <TavariCheckbox
                        checked={loyaltySettings.allow_partial_redemption}
                        onChange={(checked) => setLoyaltySettings(prev => ({ ...prev, allow_partial_redemption: checked }))}
                        label="Allow partial redemption when auto-applying"
                        id="allow-partial"
                      />
                      <div style={styles.settingDescription}>
                        When enabled, any available loyalty balance will be applied. When disabled, only minimum redemption amounts will be used.
                      </div>
                    </div>
                  )}
                </div>

                <div style={styles.settingsSection}>
                  <h4 style={styles.settingsSubtitle}>Loyalty Mode</h4>
                  <div style={styles.setting}>
                    <label style={styles.label}>Loyalty System Type:</label>
                    <select
                      value={loyaltySettings.loyalty_mode || 'points'}
                      onChange={(e) => setLoyaltySettings(prev => ({ ...prev, loyalty_mode: e.target.value }))}
                      style={styles.select}
                    >
                      <option value="points">Points System</option>
                      <option value="dollars">Dollar Credit System</option>
                    </select>
                  </div>
                </div>

                <div style={styles.settingsSection}>
                  <h4 style={styles.settingsSubtitle}>Earning & Redemption</h4>
                  <div style={styles.setting}>
                    <label style={styles.label}>Earn Rate:</label>
                    <div style={styles.inputGroup}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={loyaltySettings.earn_rate_percentage || 5}
                        onChange={(e) => setLoyaltySettings(prev => ({ ...prev, earn_rate_percentage: parseFloat(e.target.value) || 5 }))}
                        style={styles.modalInput}
                      />
                      <span>% of purchase</span>
                    </div>
                  </div>

                  <div style={styles.setting}>
                    <label style={styles.label}>Minimum Redemption:</label>
                    <div style={styles.inputGroup}>
                      {loyaltySettings.loyalty_mode === 'points' ? (
                        <>
                          <input
                            type="number"
                            min="0"
                            value={loyaltySettings.min_redemption || 5000}
                            onChange={(e) => setLoyaltySettings(prev => ({ ...prev, min_redemption: parseInt(e.target.value) || 5000 }))}
                            style={styles.modalInput}
                          />
                          <span>points</span>
                        </>
                      ) : (
                        <>
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={(loyaltySettings.min_redemption || 5000) / (loyaltySettings.redemption_rate || 1000) * 10}
                            onChange={(e) => {
                              const dollarValue = parseFloat(e.target.value) || 5;
                              const pointsValue = Math.round(dollarValue * (loyaltySettings.redemption_rate || 1000) / 10);
                              setLoyaltySettings(prev => ({ ...prev, min_redemption: pointsValue }));
                            }}
                            style={styles.modalInput}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div style={styles.setting}>
                    <label style={styles.label}>Daily Redemption Limit:</label>
                    <div style={styles.inputGroup}>
                      {loyaltySettings.loyalty_mode === 'points' ? (
                        <>
                          <input
                            type="number"
                            min="0"
                            value={loyaltySettings.max_redemption_per_day || 25000}
                            onChange={(e) => setLoyaltySettings(prev => ({ ...prev, max_redemption_per_day: parseInt(e.target.value) || 25000 }))}
                            style={styles.modalInput}
                          />
                          <span>points</span>
                        </>
                      ) : (
                        <>
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={(loyaltySettings.max_redemption_per_day || 25000) / (loyaltySettings.redemption_rate || 1000) * 10}
                            onChange={(e) => {
                              const dollarValue = parseFloat(e.target.value) || 25;
                              const pointsValue = Math.round(dollarValue * (loyaltySettings.redemption_rate || 1000) / 10);
                              setLoyaltySettings(prev => ({ ...prev, max_redemption_per_day: pointsValue }));
                            }}
                            style={styles.modalInput}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.modalActions}>
            <button
              style={styles.cancelButton}
              onClick={() => setShowSettingsModal(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              style={styles.saveButton}
              onClick={() => {
                updateLoyaltySettings(loyaltySettings);
                setShowSettingsModal(false);
              }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!standalone) {
    // Modal version for customer selection
    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h3>Select Customer</h3>
            <button 
              style={styles.closeButton}
              onClick={() => onCustomerSelected && onCustomerSelected(null)}
            >
              ×
            </button>
          </div>
          
          <div style={styles.searchSection}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or phone..."
              style={styles.searchInput}
            />
          </div>
          
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.modalCustomerList}>
            {renderCustomerList()}
          </div>
          
          <div style={styles.modalActions}>
            <button
              style={styles.newCustomerButton}
              onClick={() => setShowNewCustomerForm(true)}
            >
              Create New Customer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderMainContent = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Loyalty Customers</h2>
        <p>Manage customer loyalty accounts and balances</p>
      </div>

      <div style={styles.content}>
        {/* Search and Actions */}
        <div style={styles.topActions}>
          <div style={styles.searchSection}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers by name, email, or phone..."
              style={styles.searchInput}
            />
          </div>
          
          <button
            style={styles.settingsButton}
            onClick={() => setShowSettingsModal(true)}
          >
            ⚙️ Settings
          </button>
          
          <button
            style={styles.newCustomerButton}
            onClick={() => setShowNewCustomerForm(true)}
          >
            + New Customer
          </button>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.mainContent}>
          {/* Customer List */}
          <div style={styles.leftPanel}>
            <h3>Customers</h3>
            {renderCustomerList()}
          </div>

          {/* Customer Details */}
          <div style={styles.rightPanel}>
            {selectedCustomer ? (
              renderSelectedCustomerDetails()
            ) : (
              <div style={styles.selectPrompt}>
                <div style={styles.selectIcon}>👆</div>
                <div>Select a customer to view details</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Create New Customer</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowNewCustomerForm(false)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Customer Name *</label>
                <input
                  type="text"
                  value={newCustomer.customer_name}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_name: e.target.value})}
                  style={styles.input}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={newCustomer.customer_email}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_email: e.target.value})}
                  style={styles.input}
                  placeholder="customer@example.com"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  value={newCustomer.customer_phone}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_phone: e.target.value})}
                  style={styles.input}
                  placeholder="(555) 123-4567"
                />
              </div>
              
              {loyaltySettings.loyalty_mode === 'dollars' ? (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Initial Balance</label>
                  <input
                    type="number"
                    value={newCustomer.initial_balance}
                    onChange={(e) => setNewCustomer({...newCustomer, initial_balance: e.target.value})}
                    style={styles.input}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              ) : (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Initial Points</label>
                  <input
                    type="number"
                    value={newCustomer.initial_points}
                    onChange={(e) => setNewCustomer({...newCustomer, initial_points: e.target.value})}
                    style={styles.input}
                    placeholder="0"
                    min="0"
                  />
                </div>
              )}

              <div style={styles.checkboxGroup}>
                <TavariCheckbox
                  checked={newCustomer.email_notifications}
                  onChange={(checked) => setNewCustomer({...newCustomer, email_notifications: checked})}
                  label="Email notifications"
                  size="md"
                />
              </div>

              <div style={styles.checkboxGroup}>
                <TavariCheckbox
                  checked={newCustomer.sms_notifications}
                  onChange={(checked) => setNewCustomer({...newCustomer, sms_notifications: checked})}
                  label="SMS notifications"
                  size="md"
                />
              </div>
            </div>
            
            {error && <div style={styles.error}>{error}</div>}
            
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowNewCustomerForm(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                style={styles.createButton}
                onClick={handleCreateCustomer}
                disabled={loading || !newCustomer.customer_name.trim()}
              >
                {loading ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      {showAdjustmentModal && selectedCustomer && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Adjust Balance - {selectedCustomer.customer_name}</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowAdjustmentModal(false)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.currentBalance}>
              Current Balance: {loyaltySettings.loyalty_mode === 'points' 
                ? `${selectedCustomer.points || 0} points`
                : `$${(selectedCustomer.balance || 0).toFixed(2)}`
              }
            </div>
            
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Adjustment Type</label>
                <select
                  value={adjustment.type}
                  onChange={(e) => setAdjustment({...adjustment, type: e.target.value})}
                  style={styles.select}
                >
                  <option value="add">Add</option>
                  <option value="subtract">Subtract</option>
                </select>
              </div>
              
              {loyaltySettings.loyalty_mode === 'dollars' ? (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount ($)</label>
                  <input
                    type="number"
                    value={adjustment.amount}
                    onChange={(e) => setAdjustment({...adjustment, amount: e.target.value})}
                    style={styles.input}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              ) : (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Points</label>
                  <input
                    type="number"
                    value={adjustment.points}
                    onChange={(e) => setAdjustment({...adjustment, points: e.target.value})}
                    style={styles.input}
                    placeholder="0"
                    min="0"
                  />
                </div>
              )}
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Reason *</label>
                <textarea
                  value={adjustment.reason}
                  onChange={(e) => setAdjustment({...adjustment, reason: e.target.value})}
                  style={styles.textarea}
                  placeholder="Reason for balance adjustment..."
                  rows="3"
                />
              </div>
            </div>
            
            {error && <div style={styles.error}>{error}</div>}
            
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowAdjustmentModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                style={styles.adjustSubmitButton}
                onClick={handleAdjustBalance}
                disabled={loading || !adjustment.reason.trim() || (!adjustment.amount && !adjustment.points)}
              >
                {loading ? 'Processing...' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Loyalty Settings Modal (Step 121) */}
      {renderLoyaltySettingsModal()}
    </div>
  );

  return (
    <POSAuthWrapper
      requiredRoles={['cashier', 'manager', 'owner']}
      requireBusiness={true}
      componentName="POSLoyaltyScreen"
      onAuthReady={(authData) => {
        console.log('POSLoyaltyScreen: Auth ready with data:', authData);
      }}
    >
      {renderMainContent()}
    </POSAuthWrapper>
  );
};

// Updated styles using TavariStyles - Added new settings styles
const styles = {
  container: {
    ...TavariStyles.layout.container
  },
  
  header: {
    marginBottom: TavariStyles.spacing['2xl'],
    textAlign: 'center'
  },
  
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  
  topActions: {
    ...TavariStyles.layout.flexBetween,
    gap: TavariStyles.spacing.lg,
    marginBottom: TavariStyles.spacing.xl
  },
  
  searchSection: {
    flex: 1
  },
  
  searchInput: {
    ...TavariStyles.components.form.input,
    width: '100%',
    border: `2px solid ${TavariStyles.colors.primary}`,
    fontSize: TavariStyles.typography.fontSize.lg
  },
  
  // NEW: Settings button (Step 121)
  settingsButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.secondary,
    ...TavariStyles.components.button.sizes.lg,
    whiteSpace: 'nowrap'
  },
  
  newCustomerButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.primary,
    ...TavariStyles.components.button.sizes.lg,
    whiteSpace: 'nowrap'
  },
  
  errorBanner: {
    ...TavariStyles.components.banner.base,
    ...TavariStyles.components.banner.variants.error,
    marginBottom: TavariStyles.spacing.xl
  },
  
  mainContent: {
    display: 'flex',
    gap: TavariStyles.spacing.xl,
    flex: 1,
    overflow: 'hidden'
  },
  
  leftPanel: {
    flex: 1,
    ...TavariStyles.layout.card,
    padding: TavariStyles.spacing.xl,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  
  rightPanel: {
    flex: 1,
    ...TavariStyles.layout.card,
    padding: TavariStyles.spacing.xl,
    overflow: 'auto'
  },
  
  loading: {
    ...TavariStyles.components.loading.container,
    textAlign: 'center',
    padding: TavariStyles.spacing['4xl'],
    color: TavariStyles.colors.gray500
  },
  
  emptyState: {
    textAlign: 'center',
    padding: TavariStyles.spacing['4xl'],
    color: TavariStyles.colors.gray500
  },
  
  emptyIcon: {
    fontSize: TavariStyles.typography.fontSize['4xl'],
    marginBottom: TavariStyles.spacing.lg
  },
  
  emptyTitle: {
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    marginBottom: TavariStyles.spacing.sm
  },
  
  emptyText: {
    fontSize: TavariStyles.typography.fontSize.base
  },
  
  customerList: {
    flex: 1,
    overflowY: 'auto',
    gap: TavariStyles.spacing.sm,
    display: 'flex',
    flexDirection: 'column'
  },
  
  customerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: TavariStyles.spacing.lg,
    border: `2px solid ${TavariStyles.colors.gray200}`,
    borderRadius: TavariStyles.borderRadius.lg,
    cursor: 'pointer',
    transition: TavariStyles.transitions.normal,
    backgroundColor: TavariStyles.colors.white
  },
  
  customerCardSelected: {
    borderColor: TavariStyles.colors.primary,
    backgroundColor: TavariStyles.colors.gray50
  },
  
  customerInfo: {
    flex: 1
  },
  
  customerName: {
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    marginBottom: TavariStyles.spacing.xs
  },
  
  customerContact: {
    fontSize: TavariStyles.typography.fontSize.base,
    color: TavariStyles.colors.gray600,
    marginBottom: TavariStyles.spacing.xs
  },
  
  customerActivity: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray400,
    marginTop: TavariStyles.spacing.sm
  },
  
  customerBalance: {
    textAlign: 'right',
    minWidth: '120px'
  },
  
  pointsBalance: {
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.primary
  },
  
  dollarBalance: {
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.primary
  },
  
  customerTotals: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray500,
    marginTop: TavariStyles.spacing.xs
  },
  
  selectPrompt: {
    textAlign: 'center',
    padding: '60px 20px',
    color: TavariStyles.colors.gray500
  },
  
  selectIcon: {
    fontSize: TavariStyles.typography.fontSize['4xl'],
    marginBottom: TavariStyles.spacing.lg
  },
  
  customerDetails: {
    height: '100%'
  },
  
  detailsHeader: {
    ...TavariStyles.layout.flexBetween,
    marginBottom: TavariStyles.spacing.xl,
    paddingBottom: TavariStyles.spacing.lg,
    borderBottom: `2px solid ${TavariStyles.colors.primary}`
  },
  
  adjustButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.warning,
    ...TavariStyles.components.button.sizes.sm
  },
  
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.lg
  },
  
  detailItem: {
    ...TavariStyles.layout.flexBetween,
    padding: `${TavariStyles.spacing.md} 0`,
    borderBottom: `1px solid ${TavariStyles.colors.gray100}`
  },
  
  detailLabel: {
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray700
  },
  
  balanceValue: {
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.primary
  },
  
  modal: {
    ...TavariStyles.components.modal.overlay
  },
  
  modalContent: {
    ...TavariStyles.components.modal.content,
    maxWidth: '500px',
    width: '90%'
  },
  
  modalHeader: {
    ...TavariStyles.components.modal.header
  },
  
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: TavariStyles.typography.fontSize['2xl'],
    cursor: 'pointer',
    color: TavariStyles.colors.gray500
  },
  
  // NEW: Settings modal styles (Step 121)
  modalBody: {
    ...TavariStyles.components.modal.body,
    maxHeight: '70vh',
    overflowY: 'auto'
  },
  
  settingsSection: {
    marginBottom: TavariStyles.spacing.xl,
    paddingBottom: TavariStyles.spacing.lg,
    borderBottom: `1px solid ${TavariStyles.colors.gray200}`
  },
  
  settingsSubtitle: {
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    marginBottom: TavariStyles.spacing.md
  },
  
  setting: {
    marginBottom: TavariStyles.spacing.lg
  },
  
  settingDescription: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray600,
    marginTop: TavariStyles.spacing.xs,
    fontStyle: 'italic',
    lineHeight: '1.4'
  },
  
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.sm
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
  
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.sm
  },
  
  label: {
    ...TavariStyles.components.form.label
  },
  
  input: {
    ...TavariStyles.components.form.input
  },
  
  modalInput: {
    ...TavariStyles.components.form.input,
    width: '100%'
  },
  
  select: {
    ...TavariStyles.components.form.select,
    width: '100%'
  },
  
  textarea: {
    ...TavariStyles.components.form.input,
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  
  currentBalance: {
    backgroundColor: TavariStyles.colors.gray50,
    color: TavariStyles.colors.primary,
    padding: TavariStyles.spacing.lg,
    borderRadius: TavariStyles.borderRadius.md,
    marginBottom: TavariStyles.spacing.xl,
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    textAlign: 'center'
  },
  
  error: {
    color: TavariStyles.colors.errorText,
    fontSize: TavariStyles.typography.fontSize.base,
    marginTop: TavariStyles.spacing.md,
    padding: TavariStyles.spacing.md,
    backgroundColor: TavariStyles.colors.errorBg,
    borderRadius: TavariStyles.borderRadius.sm
  },
  
  modalActions: {
    ...TavariStyles.components.modal.footer
  },
  
  cancelButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.secondary,
    flex: 1
  },
  
  createButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.primary,
    flex: 1
  },
  
  saveButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.primary,
    flex: 1
  },
  
  adjustSubmitButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.warning,
    flex: 1
  },
  
  modalCustomerList: {
    maxHeight: '300px',
    overflowY: 'auto',
    marginBottom: TavariStyles.spacing.xl
  }
};

export default POSLoyaltyScreen;