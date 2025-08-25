// screens/POS/TabScreen.jsx
// Steps 88-95: Complete tab management system with payment processing
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusinessContext } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const TabScreen = () => {
  const navigate = useNavigate();
  const { selectedBusinessId } = useBusinessContext();
  
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTabDetails, setShowTabDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // New tab form data
  const [newTab, setNewTab] = useState({
    customer_name: '',
    customer_phone: '',
    notes: '',
    tab_number: ''
  });

  // Manager override for tab operations
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (selectedBusinessId) {
      loadTabs();
      // Set up real-time subscription
      const subscription = supabase
        .channel(`pos_tabs_${selectedBusinessId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'pos_tabs', filter: `business_id=eq.${selectedBusinessId}` },
          loadTabs
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [selectedBusinessId]);

  const loadTabs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: tabError } = await supabase
        .from('pos_tabs')
        .select(`
          *,
          pos_tab_items (
            id, name, quantity, unit_price, total_price, modifiers, notes
          )
        `)
        .eq('business_id', selectedBusinessId)
        .in('status', ['open', 'partial']) // Only show active tabs
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (tabError) throw tabError;

      setTabs(data || []);
    } catch (err) {
      console.error('Error loading tabs:', err);
      setError('Failed to load tabs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateManagerPin = async (pin) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('business_id', selectedBusinessId)
        .eq('role', 'manager')
        .eq('active', true);

      if (error || !data?.length) return false;

      const managerIds = data.map(r => r.user_id);
      const { data: managers } = await supabase
        .from('users')
        .select('id, pin')
        .in('id', managerIds);

      return (managers || []).some(m => String(m.pin || '') === String(pin));
    } catch (err) {
      console.error('Manager PIN validation error:', err);
      return false;
    }
  };

  const handleManagerOverride = async () => {
    const isValidPin = await validateManagerPin(managerPin);
    if (!isValidPin) {
      setError('Invalid manager PIN');
      return;
    }

    await logAction({
      action: 'manager_override_tab',
      context: 'TabScreen',
      metadata: {
        reason: overrideReason,
        action: pendingAction?.type,
        tab_id: pendingAction?.tab?.id
      }
    });

    // Execute the pending action
    if (pendingAction?.type === 'close_tab') {
      await executeCloseTab(pendingAction.tab);
    } else if (pendingAction?.type === 'delete_tab') {
      await executeDeleteTab(pendingAction.tab);
    }

    // Reset manager override
    setShowManagerOverride(false);
    setManagerPin('');
    setOverrideReason('');
    setPendingAction(null);
  };

  const generateTabNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `TAB-${timestamp}`;
  };

  const handleCreateTab = async () => {
    if (!newTab.customer_name.trim()) {
      setError('Customer name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const tabNumber = newTab.tab_number.trim() || generateTabNumber();

      const tabData = {
        business_id: selectedBusinessId,
        tab_number: tabNumber,
        customer_name: newTab.customer_name.trim(),
        customer_phone: newTab.customer_phone.trim() || null,
        notes: newTab.notes.trim() || null,
        started_by: user?.id,
        status: 'open',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        amount_paid: 0,
        balance_remaining: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: tab, error } = await supabase
        .from('pos_tabs')
        .insert(tabData)
        .select()
        .single();

      if (error) throw error;

      await logAction({
        action: 'tab_created',
        context: 'TabScreen',
        metadata: {
          tab_id: tab.id,
          tab_number: tab.tab_number,
          customer_name: tab.customer_name
        }
      });

      setNewTab({ customer_name: '', customer_phone: '', notes: '', tab_number: '' });
      setShowCreateModal(false);
      loadTabs();

      alert('Tab created successfully!');

    } catch (err) {
      console.error('Error creating tab:', err);
      setError('Failed to create tab: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTab = (tab) => {
    setSelectedTab(tab);
    setShowTabDetails(true);
  };

  const handleAddItemsToTab = (tab) => {
    // Navigate to register with tab context
    navigate('/dashboard/pos/register', {
      state: {
        activeTab: tab,
        mode: 'tab'
      }
    });
  };

  const handlePayTab = (tab, paymentType = 'partial') => {
    // Navigate to payment screen with tab data
    navigate('/dashboard/pos/payment', {
      state: {
        saleData: {
          ...tab,
          items: tab.pos_tab_items || [], // Use pos_tab_items instead of pos_sale_items
          tab_mode: true,
          payment_type: paymentType,
          subtotal: tab.subtotal,
          tax_amount: tab.tax_amount,
          total_amount: tab.total_amount,
          amount_paid: tab.amount_paid,
          balance_remaining: tab.balance_remaining
        }
      }
    });
  };

  const handleCloseTab = (tab) => {
    if (tab.balance_remaining > 0.01) {
      // Require manager override for closing tabs with balance
      setPendingAction({ type: 'close_tab', tab });
      setOverrideReason('Closing tab with remaining balance');
      setShowManagerOverride(true);
    } else {
      executeCloseTab(tab);
    }
  };

  const executeCloseTab = async (tab) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('pos_tabs')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tab.id);

      if (error) throw error;

      await logAction({
        action: 'tab_closed',
        context: 'TabScreen',
        metadata: {
          tab_id: tab.id,
          tab_number: tab.tab_number,
          final_balance: tab.balance_remaining
        }
      });

      loadTabs();
    } catch (err) {
      console.error('Error closing tab:', err);
      setError('Failed to close tab: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTab = (tab) => {
    setPendingAction({ type: 'delete_tab', tab });
    setOverrideReason('Deleting tab - requires manager approval');
    setShowManagerOverride(true);
  };

  const executeDeleteTab = async (tab) => {
    try {
      setLoading(true);
      
      // First delete associated tab items
      await supabase
        .from('pos_tab_items')
        .delete()
        .eq('tab_id', tab.id);

      // Then delete the tab
      const { error } = await supabase
        .from('pos_tabs')
        .delete()
        .eq('id', tab.id);

      if (error) throw error;

      await logAction({
        action: 'tab_deleted',
        context: 'TabScreen',
        metadata: {
          tab_id: tab.id,
          tab_number: tab.tab_number,
          customer_name: tab.customer_name
        }
      });

      loadTabs();
    } catch (err) {
      console.error('Error deleting tab:', err);
      setError('Failed to delete tab: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTabs = tabs.filter(tab => {
    if (!searchTerm) return true;
    return (
      tab.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.tab_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatCurrency = (amount) => {
    return `$${(Number(amount) || 0).toFixed(2)}`;
  };

  const getTabStatus = (tab) => {
    if (tab.status === 'closed') return 'Closed';
    if (tab.balance_remaining <= 0) return 'Paid in Full';
    if (tab.amount_paid > 0) return 'Partial Payment';
    return 'Open';
  };

  const getStatusColor = (tab) => {
    if (tab.status === 'closed') return '#6b7280';
    if (tab.balance_remaining <= 0) return '#059669';
    if (tab.amount_paid > 0) return '#f59e0b';
    return '#3b82f6';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading tabs...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Tab Management</h2>
        <p>Manage customer tabs and open orders</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.searchSection}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone, or tab number..."
            style={styles.searchInput}
          />
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
              loadTabs();
            }}
            style={styles.sortSelect}
          >
            <option value="updated_at-desc">Most Recent</option>
            <option value="updated_at-asc">Oldest First</option>
            <option value="customer_name-asc">Customer A-Z</option>
            <option value="customer_name-desc">Customer Z-A</option>
            <option value="total_amount-desc">Highest Amount</option>
            <option value="total_amount-asc">Lowest Amount</option>
          </select>
        </div>
        
        <button
          style={styles.createButton}
          onClick={() => setShowCreateModal(true)}
        >
          + Create New Tab
        </button>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{filteredTabs.length}</div>
          <div style={styles.statLabel}>Active Tabs</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {formatCurrency(filteredTabs.reduce((sum, tab) => sum + (tab.total_amount || 0), 0))}
          </div>
          <div style={styles.statLabel}>Total Tab Value</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {formatCurrency(filteredTabs.reduce((sum, tab) => sum + (tab.balance_remaining || 0), 0))}
          </div>
          <div style={styles.statLabel}>Outstanding Balance</div>
        </div>
      </div>

      {/* Tab List */}
      <div style={styles.content}>
        {filteredTabs.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <div style={styles.emptyTitle}>No Active Tabs</div>
            <div style={styles.emptyText}>
              {searchTerm ? 'No tabs match your search criteria' : 'Create a new tab to get started'}
            </div>
            {!searchTerm && (
              <button
                style={styles.createButton}
                onClick={() => setShowCreateModal(true)}
              >
                Create First Tab
              </button>
            )}
          </div>
        ) : (
          <div style={styles.tabGrid}>
            {filteredTabs.map(tab => (
              <div key={tab.id} style={styles.tabCard}>
                <div style={styles.tabHeader}>
                  <div style={styles.tabNumber}>{tab.tab_number}</div>
                  <div 
                    style={{
                      ...styles.tabStatus,
                      color: getStatusColor(tab)
                    }}
                  >
                    {getTabStatus(tab)}
                  </div>
                </div>
                
                <div style={styles.tabBody}>
                  <div style={styles.customerInfo}>
                    <div style={styles.customerName}>{tab.customer_name}</div>
                    {tab.customer_phone && (
                      <div style={styles.customerPhone}>📞 {tab.customer_phone}</div>
                    )}
                    {tab.notes && (
                      <div style={styles.tabNotes}>📝 {tab.notes}</div>
                    )}
                  </div>
                  
                  <div style={styles.tabAmounts}>
                    <div style={styles.amountRow}>
                      <span>Total:</span>
                      <span style={styles.totalAmount}>{formatCurrency(tab.total_amount)}</span>
                    </div>
                    <div style={styles.amountRow}>
                      <span>Paid:</span>
                      <span style={styles.paidAmount}>{formatCurrency(tab.amount_paid)}</span>
                    </div>
                    <div style={styles.amountRow}>
                      <span>Balance:</span>
                      <span style={{
                        ...styles.balanceAmount,
                        color: tab.balance_remaining > 0 ? '#dc2626' : '#059669'
                      }}>
                        {formatCurrency(tab.balance_remaining)}
                      </span>
                    </div>
                  </div>
                  
                  <div style={styles.tabMeta}>
                    <div style={styles.tabDate}>
                      Created: {new Date(tab.created_at).toLocaleDateString()}
                    </div>
                    <div style={styles.tabItems}>
                      Items: {tab.pos_tab_items?.length || 0}
                    </div>
                  </div>
                </div>
                
                <div style={styles.tabActions}>
                  <button
                    style={styles.actionButton}
                    onClick={() => handleSelectTab(tab)}
                    title="View Details"
                  >
                    👁️ View
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={() => handleAddItemsToTab(tab)}
                    title="Add Items"
                  >
                    ➕ Add Items
                  </button>
                  {tab.balance_remaining > 0 ? (
                    <button
                      style={styles.payButton}
                      onClick={() => handlePayTab(tab, 'partial')}
                      title="Make Payment"
                    >
                      💳 Pay
                    </button>
                  ) : (
                    <button
                      style={styles.closeButton}
                      onClick={() => handleCloseTab(tab)}
                      title="Close Tab"
                    >
                      ✅ Close
                    </button>
                  )}
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDeleteTab(tab)}
                    title="Delete Tab"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Tab Modal */}
      {showCreateModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Create New Tab</h3>
              <button
                style={styles.closeModalButton}
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.form}>
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
            </div>
            
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                style={styles.submitButton}
                onClick={handleCreateTab}
                disabled={!newTab.customer_name.trim()}
              >
                Create Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Override Modal */}
      {showManagerOverride && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Manager Override Required</h3>
              <button
                style={styles.closeModalButton}
                onClick={() => {
                  setShowManagerOverride(false);
                  setPendingAction(null);
                }}
              >
                ×
              </button>
            </div>
            
            <p>{overrideReason}</p>
            
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
                onClick={() => {
                  setShowManagerOverride(false);
                  setPendingAction(null);
                }}
              >
                Cancel
              </button>
              <button
                style={styles.submitButton}
                onClick={handleManagerOverride}
                disabled={!managerPin}
              >
                Approve Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Details Modal - Placeholder for TabDetailsModal component */}
      {showTabDetails && selectedTab && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Tab Details - {selectedTab.tab_number}</h3>
              <button
                style={styles.closeModalButton}
                onClick={() => {
                  setShowTabDetails(false);
                  setSelectedTab(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div style={styles.tabDetails}>
              <div style={styles.detailSection}>
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> {selectedTab.customer_name}</p>
                {selectedTab.customer_phone && (
                  <p><strong>Phone:</strong> {selectedTab.customer_phone}</p>
                )}
                {selectedTab.notes && (
                  <p><strong>Notes:</strong> {selectedTab.notes}</p>
                )}
              </div>
              
              <div style={styles.detailSection}>
                <h4>Financial Summary</h4>
                <p><strong>Subtotal:</strong> {formatCurrency(selectedTab.subtotal)}</p>
                <p><strong>Tax:</strong> {formatCurrency(selectedTab.tax_amount)}</p>
                <p><strong>Total:</strong> {formatCurrency(selectedTab.total_amount)}</p>
                <p><strong>Amount Paid:</strong> {formatCurrency(selectedTab.amount_paid)}</p>
                <p><strong>Balance Remaining:</strong> {formatCurrency(selectedTab.balance_remaining)}</p>
              </div>
              
              <div style={styles.detailSection}>
                <h4>Items ({selectedTab.pos_tab_items?.length || 0})</h4>
                {selectedTab.pos_tab_items?.length > 0 ? (
                  <div style={styles.itemsList}>
                    {selectedTab.pos_tab_items.map((item, index) => (
                      <div key={index} style={styles.itemRow}>
                        <span>{item.quantity}x {item.name}</span>
                        <span>{formatCurrency(item.total_price)}</span>
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
                onClick={() => handleAddItemsToTab(selectedTab)}
              >
                Add Items
              </button>
              {selectedTab.balance_remaining > 0 && (
                <button
                  style={styles.payButton}
                  onClick={() => handlePayTab(selectedTab)}
                >
                  Make Payment
                </button>
              )}
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
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  controls: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    alignItems: 'center'
  },
  searchSection: {
    flex: 1,
    display: 'flex',
    gap: '10px'
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px'
  },
  sortSelect: {
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px',
    minWidth: '150px'
  },
  createButton: {
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
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e5e7eb'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#008080',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },
  content: {
    flex: 1,
    overflowY: 'auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  emptyText: {
    fontSize: '16px',
    marginBottom: '30px'
  },
  tabGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    paddingBottom: '20px'
  },
  tabCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #e5e7eb',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #f3f4f6'
  },
  tabNumber: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  tabStatus: {
    fontSize: '14px',
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#f3f4f6'
  },
  tabBody: {
    marginBottom: '15px'
  },
  customerInfo: {
    marginBottom: '15px'
  },
  customerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  customerPhone: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  tabNotes: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  tabAmounts: {
    marginBottom: '15px'
  },
  amountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    fontSize: '14px'
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#1f2937'
  },
  paidAmount: {
    color: '#059669'
  },
  balanceAmount: {
    fontWeight: 'bold'
  },
  tabMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#9ca3af'
  },
  tabActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  payButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  closeButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  deleteButton: {
    padding: '8px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    minWidth: '40px'
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
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '2px solid #008080'
  },
  closeModalButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
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
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  textarea: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    marginTop: '25px'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  tabDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  detailSection: {
    backgroundColor: '#f9fafb',
    padding: '15px',
    borderRadius: '6px'
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '10px'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '4px',
    fontSize: '14px'
  },
  emptyItems: {
    textAlign: 'center',
    color: '#9ca3af',
    fontStyle: 'italic',
    padding: '20px'
  }
};

export default TabScreen;