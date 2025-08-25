// screens/POS/POSLoyaltyScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusinessContext } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const POSLoyaltyScreen = ({ 
  onCustomerSelected = null, // Callback when customer is selected for cart attachment
  standalone = true // true when opened as standalone screen, false when used as modal
}) => {
  const { selectedBusinessId } = useBusinessContext();
  
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState({});
  
  // New customer form data
  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    initial_balance: 0,
    initial_points: 0
  });

  // Balance adjustment data
  const [adjustment, setAdjustment] = useState({
    type: 'add', // 'add' or 'subtract'
    amount: '',
    reason: '',
    points: ''
  });

  useEffect(() => {
    if (selectedBusinessId) {
      loadLoyaltySettings();
      loadCustomers();
    }
  }, [selectedBusinessId]);

  useEffect(() => {
    if (searchTerm) {
      searchCustomers();
    } else {
      loadCustomers();
    }
  }, [searchTerm]);

  const loadLoyaltySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_loyalty_settings')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      setLoyaltySettings(data || {});
    } catch (err) {
      console.error('Error loading loyalty settings:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_loyalty_accounts')
        .select('*')
        .eq('business_id', selectedBusinessId)
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
    if (!searchTerm.trim()) {
      loadCustomers();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pos_loyalty_accounts')
        .select('*')
        .eq('business_id', selectedBusinessId)
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

    try {
      setLoading(true);
      setError(null);

      const customerData = {
        business_id: selectedBusinessId,
        customer_name: newCustomer.customer_name.trim(),
        customer_email: newCustomer.customer_email.trim() || null,
        customer_phone: newCustomer.customer_phone.trim() || null,
        balance: loyaltySettings.loyalty_mode === 'dollars' ? Number(newCustomer.initial_balance) || 0 : 0,
        points: loyaltySettings.loyalty_mode === 'points' ? Number(newCustomer.initial_points) || 0 : 0,
        total_earned: 0,
        total_spent: 0,
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id,
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
            business_id: selectedBusinessId,
            loyalty_account_id: customer.id,
            transaction_type: 'initial_balance',
            amount: customerData.balance,
            points: customerData.points,
            balance_before: 0,
            balance_after: customerData.balance,
            points_before: 0,
            points_after: customerData.points,
            description: 'Initial account setup',
            processed_by: (await supabase.auth.getUser()).data.user?.id,
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
          initial_points: customerData.points
        }
      });

      setNewCustomer({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        initial_balance: 0,
        initial_points: 0
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
          business_id: selectedBusinessId,
          loyalty_account_id: selectedCustomer.id,
          transaction_type: adjustment.type === 'add' ? 'manual_add' : 'manual_subtract',
          amount: loyaltySettings.loyalty_mode === 'dollars' ? adjustmentAmount : 0,
          points: loyaltySettings.loyalty_mode === 'points' ? adjustmentPoints : null,
          balance_before: currentBalance,
          balance_after: newBalance,
          points_before: currentPoints,
          points_after: newPoints,
          description: `Manual adjustment: ${adjustment.reason}`,
          processed_by: (await supabase.auth.getUser()).data.user?.id,
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

  return (
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
    textAlign: 'center'
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  topActions: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    alignItems: 'center'
  },
  searchSection: {
    flex: 1
  },
  searchInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px'
  },
  newCustomerButton: {
    padding: '12px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  mainContent: {
    display: 'flex',
    gap: '20px',
    flex: 1,
    overflow: 'hidden'
  },
  leftPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    overflow: 'auto'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  emptyText: {
    fontSize: '14px'
  },
  customerList: {
    flex: 1,
    overflowY: 'auto',
    gap: '8px',
    display: 'flex',
    flexDirection: 'column'
  },
  customerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'white'
  },
  customerCardSelected: {
    borderColor: '#008080',
    backgroundColor: '#f0fdfa'
  },
  customerInfo: {
    flex: 1
  },
  customerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  customerContact: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '2px'
  },
  customerActivity: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '6px'
  },
  customerBalance: {
    textAlign: 'right',
    minWidth: '120px'
  },
  pointsBalance: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#008080'
  },
  dollarBalance: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#008080'
  },
  customerTotals: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '4px'
  },
  selectPrompt: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  selectIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  customerDetails: {
    height: '100%'
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #008080'
  },
  adjustButton: {
    padding: '8px 16px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6'
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#374151'
  },
  balanceValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#008080'
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
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #008080'
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    padding: '10px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  select: {
    padding: '10px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  textarea: {
    padding: '10px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  currentBalance: {
    backgroundColor: '#f0fdfa',
    color: '#008080',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#fee2e2',
    borderRadius: '4px'
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '25px'
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
  createButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  adjustSubmitButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  modalCustomerList: {
    maxHeight: '300px',
    overflowY: 'auto',
    marginBottom: '20px'
  }
};

export default POSLoyaltyScreen;