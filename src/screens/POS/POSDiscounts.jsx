// src/screens/POS/POSDiscounts.jsx
// Step 114: Complete discount management with auto-apply, manager approval, and date validation
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const POSDiscounts = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New discount form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('percentage');
  const [newValue, setNewValue] = useState('');
  const [newApplicationType, setNewApplicationType] = useState('transaction'); // 'transaction' or 'item'
  const [newAutoApply, setNewAutoApply] = useState(false);
  const [newManagerRequired, setNewManagerRequired] = useState(false);
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidTo, setNewValidTo] = useState('');
  const [newMinPurchase, setNewMinPurchase] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit discount form
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('percentage');
  const [editValue, setEditValue] = useState('');
  const [editApplicationType, setEditApplicationType] = useState('transaction');
  const [editAutoApply, setEditAutoApply] = useState(false);
  const [editManagerRequired, setEditManagerRequired] = useState(false);
  const [editValidFrom, setEditValidFrom] = useState('');
  const [editValidTo, setEditValidTo] = useState('');
  const [editMinPurchase, setEditMinPurchase] = useState('');
  const [editMaxUses, setEditMaxUses] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    if (businessId) fetchDiscounts();
  }, [businessId]);

  const fetchDiscounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_discounts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts(data || []);

      await logAction({
        action: 'pos_discounts_loaded',
        context: 'POSDiscounts',
        metadata: { discount_count: data?.length || 0 }
      });

    } catch (err) {
      setError('Error fetching discounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateDiscountForm = (name, type, value, validFrom, validTo, minPurchase) => {
    if (!name.trim()) return 'Discount name is required';
    if (!value || parseFloat(value) <= 0) return 'Valid discount value is required';
    
    if (type === 'percentage' && parseFloat(value) > 100) {
      return 'Percentage discount cannot exceed 100%';
    }

    if (validFrom && validTo && new Date(validFrom) >= new Date(validTo)) {
      return 'Valid from date must be before valid to date';
    }

    if (minPurchase && parseFloat(minPurchase) < 0) {
      return 'Minimum purchase amount cannot be negative';
    }

    return null;
  };

  const addDiscount = async () => {
    const validationError = validateDiscountForm(
      newName, newType, newValue, newValidFrom, newValidTo, newMinPurchase
    );
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    try {
      const discountData = {
        business_id: businessId,
        name: newName.trim(),
        type: newType,
        value: parseFloat(newValue),
        application_type: newApplicationType,
        auto_apply: newAutoApply,
        manager_required: newManagerRequired,
        valid_from: newValidFrom || null,
        valid_to: newValidTo || null,
        min_purchase_amount: newMinPurchase ? parseFloat(newMinPurchase) : null,
        max_uses: newMaxUses ? parseInt(newMaxUses) : null,
        current_uses: 0,
        description: newDescription.trim() || null,
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('pos_discounts').insert([discountData]);
      if (error) throw error;

      await logAction({
        action: 'pos_discount_created',
        context: 'POSDiscounts',
        metadata: {
          discount_name: newName.trim(),
          type: newType,
          value: parseFloat(newValue),
          auto_apply: newAutoApply,
          manager_required: newManagerRequired
        }
      });

      // Reset form
      setNewName('');
      setNewType('percentage');
      setNewValue('');
      setNewApplicationType('transaction');
      setNewAutoApply(false);
      setNewManagerRequired(false);
      setNewValidFrom('');
      setNewValidTo('');
      setNewMinPurchase('');
      setNewMaxUses('');
      setNewDescription('');

      fetchDiscounts();
    } catch (err) {
      setError('Error adding discount: ' + err.message);
    }
  };

  const startEdit = (discount) => {
    setEditId(discount.id);
    setEditName(discount.name);
    setEditType(discount.type);
    setEditValue(discount.value?.toString() || '');
    setEditApplicationType(discount.application_type || 'transaction');
    setEditAutoApply(discount.auto_apply || false);
    setEditManagerRequired(discount.manager_required || false);
    setEditValidFrom(discount.valid_from || '');
    setEditValidTo(discount.valid_to || '');
    setEditMinPurchase(discount.min_purchase_amount?.toString() || '');
    setEditMaxUses(discount.max_uses?.toString() || '');
    setEditDescription(discount.description || '');
    setEditIsActive(discount.is_active !== false);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditType('percentage');
    setEditValue('');
    setEditApplicationType('transaction');
    setEditAutoApply(false);
    setEditManagerRequired(false);
    setEditValidFrom('');
    setEditValidTo('');
    setEditMinPurchase('');
    setEditMaxUses('');
    setEditDescription('');
    setEditIsActive(true);
  };

  const saveEdit = async () => {
    const validationError = validateDiscountForm(
      editName, editType, editValue, editValidFrom, editValidTo, editMinPurchase
    );
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    try {
      const discountData = {
        name: editName.trim(),
        type: editType,
        value: parseFloat(editValue),
        application_type: editApplicationType,
        auto_apply: editAutoApply,
        manager_required: editManagerRequired,
        valid_from: editValidFrom || null,
        valid_to: editValidTo || null,
        min_purchase_amount: editMinPurchase ? parseFloat(editMinPurchase) : null,
        max_uses: editMaxUses ? parseInt(editMaxUses) : null,
        description: editDescription.trim() || null,
        is_active: editIsActive,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('pos_discounts')
        .update(discountData)
        .eq('id', editId);

      if (error) throw error;

      await logAction({
        action: 'pos_discount_updated',
        context: 'POSDiscounts',
        metadata: {
          discount_id: editId,
          discount_name: editName.trim(),
          is_active: editIsActive
        }
      });

      cancelEdit();
      fetchDiscounts();
    } catch (err) {
      setError('Error updating discount: ' + err.message);
    }
  };

  const deleteDiscount = async (id, name) => {
    if (!window.confirm(`Delete discount "${name}"? This action cannot be undone.`)) return;
    
    setError(null);
    try {
      const { error } = await supabase.from('pos_discounts').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'pos_discount_deleted',
        context: 'POSDiscounts',
        metadata: { discount_id: id, discount_name: name }
      });

      fetchDiscounts();
    } catch (err) {
      setError('Error deleting discount: ' + err.message);
    }
  };

  const toggleDiscountStatus = async (id, currentStatus, name) => {
    const newStatus = !currentStatus;
    
    setError(null);
    try {
      const { error } = await supabase
        .from('pos_discounts')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await logAction({
        action: 'pos_discount_status_changed',
        context: 'POSDiscounts',
        metadata: {
          discount_id: id,
          discount_name: name,
          old_status: currentStatus,
          new_status: newStatus
        }
      });

      fetchDiscounts();
    } catch (err) {
      setError('Error updating discount status: ' + err.message);
    }
  };

  const getDiscountSummary = (discount) => {
    const parts = [];
    
    if (discount.type === 'percentage') {
      parts.push(`${discount.value}% off`);
    } else {
      parts.push(`$${discount.value?.toFixed(2) || '0.00'} off`);
    }

    if (discount.application_type === 'item') {
      parts.push('per item');
    } else {
      parts.push('total order');
    }

    if (discount.min_purchase_amount) {
      parts.push(`(min $${discount.min_purchase_amount.toFixed(2)})`);
    }

    return parts.join(' ');
  };

  const getDateStatus = (discount) => {
    const now = new Date();
    const validFrom = discount.valid_from ? new Date(discount.valid_from) : null;
    const validTo = discount.valid_to ? new Date(discount.valid_to) : null;

    if (validFrom && now < validFrom) {
      return { text: 'Not yet active', color: '#f59e0b', icon: '⏳' };
    }

    if (validTo && now > validTo) {
      return { text: 'Expired', color: '#dc2626', icon: '❌' };
    }

    if (validFrom && validTo) {
      return { text: 'Active', color: '#059669', icon: '✅' };
    }

    return { text: 'Always active', color: '#059669', icon: '♾️' };
  };

  const getUsageStatus = (discount) => {
    if (!discount.max_uses) return null;
    
    const remaining = discount.max_uses - (discount.current_uses || 0);
    const percentage = ((discount.current_uses || 0) / discount.max_uses) * 100;
    
    let color = '#059669';
    if (percentage > 80) color = '#dc2626';
    else if (percentage > 60) color = '#f59e0b';

    return {
      text: `${remaining} uses remaining`,
      color,
      percentage
    };
  };

  if (!businessId) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Please select a business to manage discounts.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading discounts...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>POS Discounts</h2>
        <p>Create and manage promotional discounts with advanced rules</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Add New Discount */}
      <div style={styles.addSection}>
        <h3 style={styles.sectionTitle}>Add New Discount</h3>
        <div style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Discount Name *</label>
              <input
                type="text"
                placeholder="e.g., Senior Discount, Happy Hour"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Type *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                style={styles.select}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Value * {newType === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                placeholder={newType === 'percentage' ? '10' : '5.00'}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                style={styles.input}
                step={newType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={newType === 'percentage' ? '100' : undefined}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Apply To</label>
              <select
                value={newApplicationType}
                onChange={(e) => setNewApplicationType(e.target.value)}
                style={styles.select}
              >
                <option value="transaction">Entire Transaction</option>
                <option value="item">Per Item</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Minimum Purchase ($)</label>
              <input
                type="number"
                placeholder="0.00 = no minimum"
                value={newMinPurchase}
                onChange={(e) => setNewMinPurchase(e.target.value)}
                style={styles.input}
                step="0.01"
                min="0"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Maximum Uses</label>
              <input
                type="number"
                placeholder="Leave blank = unlimited"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                style={styles.input}
                min="1"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Valid From (Optional)</label>
              <input
                type="date"
                value={newValidFrom}
                onChange={(e) => setNewValidFrom(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Valid To (Optional)</label>
              <input
                type="date"
                value={newValidTo}
                onChange={(e) => setNewValidTo(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description (Optional)</label>
              <textarea
                placeholder="Additional details about this discount..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={styles.textarea}
                rows="2"
              />
            </div>
          </div>

          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newAutoApply}
                onChange={(e) => setNewAutoApply(e.target.checked)}
              />
              Auto-apply when conditions are met
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newManagerRequired}
                onChange={(e) => setNewManagerRequired(e.target.checked)}
              />
              Require manager approval
            </label>
          </div>

          <button 
            onClick={addDiscount}
            style={styles.addButton}
            disabled={!newName.trim() || !newValue}
          >
            Add Discount
          </button>
        </div>
      </div>

      {/* Discounts Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Name & Details</th>
              <th style={styles.th}>Value</th>
              <th style={styles.th}>Rules & Usage</th>
              <th style={styles.th}>Dates</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {discounts.length === 0 && (
              <tr>
                <td colSpan="6" style={styles.emptyCell}>
                  No discounts found. Create your first discount above.
                </td>
              </tr>
            )}
            {discounts.map((discount, i) => {
              const dateStatus = getDateStatus(discount);
              const usageStatus = getUsageStatus(discount);
              
              return (
                <tr key={discount.id} style={{
                  ...styles.row,
                  backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white',
                  opacity: !discount.is_active ? 0.6 : 1
                }}>
                  <td style={styles.td}>
                    <div style={styles.statusCell}>
                      <div
                        style={{
                          ...styles.statusIndicator,
                          backgroundColor: discount.is_active ? '#059669' : '#dc2626'
                        }}
                      />
                      <div style={styles.statusLabels}>
                        <div style={styles.statusLabel}>
                          {discount.is_active ? 'Active' : 'Inactive'}
                        </div>
                        <div style={{
                          ...styles.dateStatusLabel,
                          color: dateStatus.color
                        }}>
                          {dateStatus.icon} {dateStatus.text}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td style={styles.td}>
                    {editId === discount.id ? (
                      <div style={styles.editNameSection}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={styles.input}
                          placeholder="Discount name"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          style={styles.smallTextarea}
                          placeholder="Description..."
                          rows="2"
                        />
                      </div>
                    ) : (
                      <div style={styles.nameSection}>
                        <div style={styles.discountName}>{discount.name}</div>
                        {discount.description && (
                          <div style={styles.discountDescription}>{discount.description}</div>
                        )}
                        <div style={styles.discountSummary}>
                          {getDiscountSummary(discount)}
                        </div>
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editId === discount.id ? (
                      <div style={styles.editValueSection}>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          style={styles.smallSelect}
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">$</option>
                        </select>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={styles.smallInput}
                          step={editType === 'percentage' ? '1' : '0.01'}
                          min="0"
                          max={editType === 'percentage' ? '100' : undefined}
                        />
                        <select
                          value={editApplicationType}
                          onChange={(e) => setEditApplicationType(e.target.value)}
                          style={styles.smallSelect}
                        >
                          <option value="transaction">Total</option>
                          <option value="item">Per Item</option>
                        </select>
                      </div>
                    ) : (
                      <div style={styles.valueDisplay}>
                        <div style={styles.discountValue}>
                          {discount.type === 'percentage' 
                            ? `${discount.value}%` 
                            : `${discount.value?.toFixed(2) || '0.00'}`
                          }
                        </div>
                        <div style={styles.applicationType}>
                          {discount.application_type === 'item' ? 'Per Item' : 'Total Order'}
                        </div>
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editId === discount.id ? (
                      <div style={styles.editRulesSection}>
                        <input
                          type="number"
                          value={editMinPurchase}
                          onChange={(e) => setEditMinPurchase(e.target.value)}
                          style={styles.smallInput}
                          placeholder="Min $"
                          step="0.01"
                          min="0"
                        />
                        <input
                          type="number"
                          value={editMaxUses}
                          onChange={(e) => setEditMaxUses(e.target.value)}
                          style={styles.smallInput}
                          placeholder="Max uses"
                          min="1"
                        />
                        <div style={styles.editCheckboxes}>
                          <label style={styles.smallCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={editAutoApply}
                              onChange={(e) => setEditAutoApply(e.target.checked)}
                            />
                            Auto
                          </label>
                          <label style={styles.smallCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={editManagerRequired}
                              onChange={(e) => setEditManagerRequired(e.target.checked)}
                            />
                            Mgr
                          </label>
                          <label style={styles.smallCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={editIsActive}
                              onChange={(e) => setEditIsActive(e.target.checked)}
                            />
                            Active
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.rulesDisplay}>
                        <div style={styles.rulesList}>
                          {discount.min_purchase_amount && (
                            <div style={styles.rule}>
                              💰 Min: ${discount.min_purchase_amount.toFixed(2)}
                            </div>
                          )}
                          {discount.auto_apply && (
                            <div style={styles.rule}>⚡ Auto-apply</div>
                          )}
                          {discount.manager_required && (
                            <div style={styles.rule}>👔 Manager required</div>
                          )}
                        </div>
                        {usageStatus && (
                          <div style={styles.usageStatus}>
                            <div style={{
                              ...styles.usageText,
                              color: usageStatus.color
                            }}>
                              {usageStatus.text}
                            </div>
                            <div style={styles.usageBar}>
                              <div 
                                style={{
                                  ...styles.usageProgress,
                                  width: `${usageStatus.percentage}%`,
                                  backgroundColor: usageStatus.color
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editId === discount.id ? (
                      <div style={styles.editDatesSection}>
                        <input
                          type="date"
                          value={editValidFrom}
                          onChange={(e) => setEditValidFrom(e.target.value)}
                          style={styles.dateInput}
                        />
                        <input
                          type="date"
                          value={editValidTo}
                          onChange={(e) => setEditValidTo(e.target.value)}
                          style={styles.dateInput}
                        />
                      </div>
                    ) : (
                      <div style={styles.datesDisplay}>
                        {discount.valid_from && (
                          <div style={styles.dateInfo}>
                            <strong>From:</strong> {new Date(discount.valid_from).toLocaleDateString()}
                          </div>
                        )}
                        {discount.valid_to && (
                          <div style={styles.dateInfo}>
                            <strong>To:</strong> {new Date(discount.valid_to).toLocaleDateString()}
                          </div>
                        )}
                        {!discount.valid_from && !discount.valid_to && (
                          <div style={styles.dateInfo}>Always active</div>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editId === discount.id ? (
                      <div style={styles.editActions}>
                        <button 
                          onClick={saveEdit} 
                          style={styles.saveButton}
                          disabled={!editName.trim() || !editValue}
                        >
                          Save
                        </button>
                        <button onClick={cancelEdit} style={styles.cancelButton}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={styles.actions}>
                        <button 
                          onClick={() => startEdit(discount)} 
                          style={styles.editButton}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleDiscountStatus(discount.id, discount.is_active, discount.name)}
                          style={{
                            ...styles.toggleButton,
                            backgroundColor: discount.is_active ? '#f59e0b' : '#059669'
                          }}
                        >
                          {discount.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button 
                          onClick={() => deleteDiscount(discount.id, discount.name)} 
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info Panel */}
      <div style={styles.infoPanel}>
        <h3 style={styles.infoTitle}>Discount Management Features</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>⚡</div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Auto-Apply</div>
              <div style={styles.infoText}>
                Automatically apply discounts when conditions are met (minimum purchase, date range, etc.)
              </div>
            </div>
          </div>
          
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>👔</div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Manager Approval</div>
              <div style={styles.infoText}>
                Require manager PIN entry before applying sensitive discounts
              </div>
            </div>
          </div>
          
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>📅</div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Date Validation</div>
              <div style={styles.infoText}>
                Set valid date ranges for promotional periods and seasonal discounts
              </div>
            </div>
          </div>
          
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>🎯</div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Usage Limits</div>
              <div style={styles.infoText}>
                Control discount usage with maximum use counts and minimum purchase amounts
              </div>
            </div>
          </div>
        </div>
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
    textAlign: 'center'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: 'bold'
  },
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#dc2626'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  addSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    border: '2px solid #008080'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #008080'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    alignItems: 'end'
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
  select: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white'
  },
  textarea: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  checkboxRow: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    cursor: 'pointer'
  },
  addButton: {
    padding: '15px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    alignSelf: 'flex-start'
  },
  tableContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'auto',
    border: '1px solid #e5e7eb',
    marginBottom: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  headerRow: {
    backgroundColor: '#008080',
    color: 'white',
    position: 'sticky',
    top: 0
  },
  th: {
    padding: '15px 12px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #006666'
  },
  row: {
    transition: 'background-color 0.2s ease'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  statusCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  statusLabels: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  statusLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  dateStatusLabel: {
    fontSize: '10px',
    fontWeight: 'normal'
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  discountName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  discountDescription: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  discountSummary: {
    fontSize: '14px',
    color: '#374151'
  },
  editNameSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  smallTextarea: {
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  valueDisplay: {
    textAlign: 'center'
  },
  discountValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#008080'
  },
  applicationType: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px'
  },
  editValueSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  smallSelect: {
    padding: '6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: 'white'
  },
  smallInput: {
    padding: '6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px'
  },
  rulesDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  rule: {
    fontSize: '12px',
    color: '#374151'
  },
  usageStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  usageText: {
    fontSize: '11px',
    fontWeight: 'bold'
  },
  usageBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#f3f4f6',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  usageProgress: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  editRulesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  editCheckboxes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  smallCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    cursor: 'pointer'
  },
  datesDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  dateInfo: {
    fontSize: '12px',
    color: '#374151'
  },
  editDatesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  dateInput: {
    padding: '6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px'
  },
  actions: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  editActions: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  toggleButton: {
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  saveButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  infoPanel: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e5e7eb'
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '15px',
    textAlign: 'center'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '15px'
  },
  infoCard: {
    display: 'flex',
    gap: '12px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  infoIcon: {
    fontSize: '24px',
    minWidth: '32px'
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  infoText: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4'
  }
};

export default POSDiscounts;