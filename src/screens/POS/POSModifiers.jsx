// src/screens/POS/POSModifiers.jsx
// Steps 111-113: Complete modifier groups with required/optional logic and pricing controls
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const POSModifiers = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [modifierGroups, setModifierGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New modifier group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupMinSelections, setNewGroupMinSelections] = useState('');
  const [newGroupMaxSelections, setNewGroupMaxSelections] = useState('');
  const [newGroupMaxFree, setNewGroupMaxFree] = useState('');
  const [newGroupCategoryId, setNewGroupCategoryId] = useState('');

  // Edit modifier group form
  const [editGroupId, setEditGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupRequired, setEditGroupRequired] = useState(false);
  const [editGroupMinSelections, setEditGroupMinSelections] = useState('');
  const [editGroupMaxSelections, setEditGroupMaxSelections] = useState('');
  const [editGroupMaxFree, setEditGroupMaxFree] = useState('');
  const [editGroupCategoryId, setEditGroupCategoryId] = useState('');

  // New modifier item form
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newItemInventoryId, setNewItemInventoryId] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemIsFree, setNewItemIsFree] = useState(false);
  const [newItemDefaultSelected, setNewItemDefaultSelected] = useState(false);

  useEffect(() => {
    if (businessId) {
      fetchModifierGroups();
      fetchCategories();
      fetchInventoryItems();
    }
  }, [businessId]);

  const fetchModifierGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_modifier_groups')
        .select(`
          *,
          pos_modifier_group_items (
            id,
            inventory_id,
            price_override,
            is_free,
            is_default_selected,
            sort_order,
            pos_inventory (
              id,
              name,
              price
            )
          )
        `)
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setModifierGroups(data || []);

      await logAction({
        action: 'pos_modifier_groups_loaded',
        context: 'POSModifiers',
        metadata: { group_count: data?.length || 0 }
      });

    } catch (err) {
      setError('Error fetching modifier groups: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_categories')
        .select('id, name')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.warn('Error fetching categories:', err);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_inventory')
        .select('id, name, price, category_id')
        .eq('business_id', businessId)
        .order('name', { ascending: true });
      if (error) throw error;
      setInventoryItems(data || []);
    } catch (err) {
      console.warn('Error fetching inventory items:', err);
    }
  };

  const addModifierGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    // Validation
    const minSel = parseInt(newGroupMinSelections) || 0;
    const maxSel = parseInt(newGroupMaxSelections) || 0;
    const maxFree = parseInt(newGroupMaxFree) || 0;

    if (newGroupRequired && minSel === 0) {
      setError('Required groups must have minimum selections > 0');
      return;
    }

    if (maxSel > 0 && minSel > maxSel) {
      setError('Minimum selections cannot exceed maximum selections');
      return;
    }

    if (maxFree > maxSel && maxSel > 0) {
      setError('Max free items cannot exceed max selections');
      return;
    }

    setError(null);
    try {
      const maxSortOrder = modifierGroups.length > 0 ? Math.max(...modifierGroups.map(g => g.sort_order || 0)) : 0;

      const { error } = await supabase.from('pos_modifier_groups').insert([{
        business_id: businessId,
        name: newGroupName.trim(),
        is_required: newGroupRequired,
        min_selections: minSel || null,
        max_selections: maxSel || null,
        max_free_items: maxFree || null,
        category_id: newGroupCategoryId || null,
        sort_order: maxSortOrder + 1,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      await logAction({
        action: 'pos_modifier_group_created',
        context: 'POSModifiers',
        metadata: {
          group_name: newGroupName.trim(),
          is_required: newGroupRequired,
          min_selections: minSel,
          max_selections: maxSel,
          max_free_items: maxFree
        }
      });

      // Reset form
      setNewGroupName('');
      setNewGroupRequired(false);
      setNewGroupMinSelections('');
      setNewGroupMaxSelections('');
      setNewGroupMaxFree('');
      setNewGroupCategoryId('');

      fetchModifierGroups();
    } catch (err) {
      setError('Error adding modifier group: ' + err.message);
    }
  };

  const startEditGroup = (group) => {
    setEditGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupRequired(group.is_required || false);
    setEditGroupMinSelections(group.min_selections?.toString() || '');
    setEditGroupMaxSelections(group.max_selections?.toString() || '');
    setEditGroupMaxFree(group.max_free_items?.toString() || '');
    setEditGroupCategoryId(group.category_id || '');
  };

  const cancelEditGroup = () => {
    setEditGroupId(null);
    setEditGroupName('');
    setEditGroupRequired(false);
    setEditGroupMinSelections('');
    setEditGroupMaxSelections('');
    setEditGroupMaxFree('');
    setEditGroupCategoryId('');
  };

  const saveEditGroup = async () => {
    if (!editGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    // Validation
    const minSel = parseInt(editGroupMinSelections) || 0;
    const maxSel = parseInt(editGroupMaxSelections) || 0;
    const maxFree = parseInt(editGroupMaxFree) || 0;

    if (editGroupRequired && minSel === 0) {
      setError('Required groups must have minimum selections > 0');
      return;
    }

    if (maxSel > 0 && minSel > maxSel) {
      setError('Minimum selections cannot exceed maximum selections');
      return;
    }

    if (maxFree > maxSel && maxSel > 0) {
      setError('Max free items cannot exceed max selections');
      return;
    }

    setError(null);
    try {
      const { error } = await supabase
        .from('pos_modifier_groups')
        .update({
          name: editGroupName.trim(),
          is_required: editGroupRequired,
          min_selections: minSel || null,
          max_selections: maxSel || null,
          max_free_items: maxFree || null,
          category_id: editGroupCategoryId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editGroupId);

      if (error) throw error;

      await logAction({
        action: 'pos_modifier_group_updated',
        context: 'POSModifiers',
        metadata: {
          group_id: editGroupId,
          group_name: editGroupName.trim(),
          is_required: editGroupRequired
        }
      });

      cancelEditGroup();
      fetchModifierGroups();
    } catch (err) {
      setError('Error updating modifier group: ' + err.message);
    }
  };

  const deleteModifierGroup = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete modifier group "${name}"? This will also delete all items in this group.`)) return;

    setError(null);
    try {
      // First delete all items in the group
      await supabase.from('pos_modifier_group_items').delete().eq('modifier_group_id', id);
      
      // Then delete the group
      const { error } = await supabase.from('pos_modifier_groups').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'pos_modifier_group_deleted',
        context: 'POSModifiers',
        metadata: { group_id: id, group_name: name }
      });

      fetchModifierGroups();
    } catch (err) {
      setError('Error deleting modifier group: ' + err.message);
    }
  };

  const moveGroup = async (id, direction) => {
    setError(null);
    try {
      const index = modifierGroups.findIndex(g => g.id === id);
      if (index === -1) return;

      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= modifierGroups.length) return;

      const groupA = modifierGroups[index];
      const groupB = modifierGroups[swapIndex];

      const updates = [
        { id: groupA.id, sort_order: groupB.sort_order || 0 },
        { id: groupB.id, sort_order: groupA.sort_order || 0 }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('pos_modifier_groups')
          .update({ 
            sort_order: update.sort_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        if (error) throw error;
      }

      fetchModifierGroups();
    } catch (err) {
      setError('Error moving modifier group: ' + err.message);
    }
  };

  const addModifierItem = async () => {
    if (!selectedGroupId || !newItemInventoryId) {
      setError('Please select a group and inventory item');
      return;
    }

    const price = newItemIsFree ? 0 : (parseFloat(newItemPrice) || 0);

    setError(null);
    try {
      // Check if item already exists in this group
      const { data: existing } = await supabase
        .from('pos_modifier_group_items')
        .select('id')
        .eq('modifier_group_id', selectedGroupId)
        .eq('inventory_id', newItemInventoryId);

      if (existing && existing.length > 0) {
        setError('This item is already in the selected group');
        return;
      }

      // Get max sort order for this group
      const { data: groupItems } = await supabase
        .from('pos_modifier_group_items')
        .select('sort_order')
        .eq('modifier_group_id', selectedGroupId);

      const maxSortOrder = groupItems && groupItems.length > 0 ? Math.max(...groupItems.map(i => i.sort_order || 0)) : 0;

      const { error } = await supabase.from('pos_modifier_group_items').insert([{
        modifier_group_id: selectedGroupId,
        inventory_id: newItemInventoryId,
        price_override: price > 0 ? price : null,
        is_free: newItemIsFree,
        is_default_selected: newItemDefaultSelected,
        sort_order: maxSortOrder + 1,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      const inventoryItem = inventoryItems.find(item => item.id === newItemInventoryId);
      const groupName = modifierGroups.find(g => g.id === selectedGroupId)?.name;

      await logAction({
        action: 'pos_modifier_item_added',
        context: 'POSModifiers',
        metadata: {
          group_name: groupName,
          item_name: inventoryItem?.name,
          price: price,
          is_free: newItemIsFree,
          is_default: newItemDefaultSelected
        }
      });

      // Reset form
      setNewItemInventoryId('');
      setNewItemPrice('');
      setNewItemIsFree(false);
      setNewItemDefaultSelected(false);

      fetchModifierGroups();
    } catch (err) {
      setError('Error adding modifier item: ' + err.message);
    }
  };

  const removeModifierItem = async (itemId, itemName, groupName) => {
    if (!window.confirm(`Remove "${itemName}" from "${groupName}"?`)) return;

    setError(null);
    try {
      const { error } = await supabase.from('pos_modifier_group_items').delete().eq('id', itemId);
      if (error) throw error;

      await logAction({
        action: 'pos_modifier_item_removed',
        context: 'POSModifiers',
        metadata: {
          item_name: itemName,
          group_name: groupName
        }
      });

      fetchModifierGroups();
    } catch (err) {
      setError('Error removing modifier item: ' + err.message);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'No Category';
  };

  const getValidationSummary = (group) => {
    const parts = [];
    
    if (group.is_required) {
      parts.push('Required');
    } else {
      parts.push('Optional');
    }

    if (group.min_selections > 0) {
      parts.push(`Min: ${group.min_selections}`);
    }

    if (group.max_selections > 0) {
      parts.push(`Max: ${group.max_selections}`);
    }

    if (group.max_free_items > 0) {
      parts.push(`Free: ${group.max_free_items}`);
    }

    return parts.join(' | ');
  };

  if (!businessId) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Please select a business to manage modifiers.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading modifiers...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>POS Modifier Groups</h2>
        <p>Create modifier groups with customizable rules and pricing</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Add New Modifier Group */}
      <div style={styles.addSection}>
        <h3 style={styles.sectionTitle}>Add New Modifier Group</h3>
        <div style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Group Name *</label>
              <input
                type="text"
                placeholder="e.g., Size, Toppings, Drink Options"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <select
                value={newGroupCategoryId}
                onChange={(e) => setNewGroupCategoryId(e.target.value)}
                style={styles.select}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={newGroupRequired}
                  onChange={(e) => setNewGroupRequired(e.target.checked)}
                />
                Required Group (Customer must select)
              </label>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Minimum Selections</label>
              <input
                type="number"
                placeholder="0 = no minimum"
                value={newGroupMinSelections}
                onChange={(e) => setNewGroupMinSelections(e.target.value)}
                style={styles.input}
                min="0"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Maximum Selections</label>
              <input
                type="number"
                placeholder="0 = unlimited"
                value={newGroupMaxSelections}
                onChange={(e) => setNewGroupMaxSelections(e.target.value)}
                style={styles.input}
                min="0"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Maximum Free Items</label>
              <input
                type="number"
                placeholder="0 = none free"
                value={newGroupMaxFree}
                onChange={(e) => setNewGroupMaxFree(e.target.value)}
                style={styles.input}
                min="0"
              />
            </div>
          </div>

          <button 
            onClick={addModifierGroup} 
            style={styles.addButton}
            disabled={!newGroupName.trim()}
          >
            Add Modifier Group
          </button>
        </div>
      </div>

      {/* Modifier Groups List */}
      <div style={styles.groupsContainer}>
        {modifierGroups.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🏷️</div>
            <div style={styles.emptyTitle}>No modifier groups found</div>
            <div style={styles.emptyText}>Create your first modifier group above</div>
          </div>
        ) : (
          modifierGroups.map((group, i) => (
            <div key={group.id} style={styles.groupCard}>
              <div style={styles.groupHeader}>
                <div style={styles.groupInfo}>
                  {editGroupId === group.id ? (
                    <div style={styles.editGroupForm}>
                      <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        style={styles.input}
                        placeholder="Group name"
                      />
                      <select
                        value={editGroupCategoryId}
                        onChange={(e) => setEditGroupCategoryId(e.target.value)}
                        style={styles.select}
                      >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <div style={styles.editOptions}>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={editGroupRequired}
                            onChange={(e) => setEditGroupRequired(e.target.checked)}
                          />
                          Required
                        </label>
                        <input
                          type="number"
                          placeholder="Min"
                          value={editGroupMinSelections}
                          onChange={(e) => setEditGroupMinSelections(e.target.value)}
                          style={styles.smallInput}
                          min="0"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={editGroupMaxSelections}
                          onChange={(e) => setEditGroupMaxSelections(e.target.value)}
                          style={styles.smallInput}
                          min="0"
                        />
                        <input
                          type="number"
                          placeholder="Free"
                          value={editGroupMaxFree}
                          onChange={(e) => setEditGroupMaxFree(e.target.value)}
                          style={styles.smallInput}
                          min="0"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.groupTitle}>
                        {group.name}
                        {group.is_required && <span style={styles.requiredBadge}>REQUIRED</span>}
                      </div>
                      <div style={styles.groupMeta}>
                        Category: {getCategoryName(group.category_id)} | {getValidationSummary(group)}
                      </div>
                    </>
                  )}
                </div>

                <div style={styles.groupActions}>
                  {editGroupId === group.id ? (
                    <div style={styles.editActions}>
                      <button onClick={saveEditGroup} style={styles.saveButton}>Save</button>
                      <button onClick={cancelEditGroup} style={styles.cancelButton}>Cancel</button>
                    </div>
                  ) : (
                    <div style={styles.actions}>
                      <button
                        onClick={() => moveGroup(group.id, -1)}
                        disabled={i === 0}
                        style={styles.orderButton}
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveGroup(group.id, 1)}
                        disabled={i === modifierGroups.length - 1}
                        style={styles.orderButton}
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button onClick={() => startEditGroup(group)} style={styles.editButton}>
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteModifierGroup(group.id, group.name)} 
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Group Items */}
              <div style={styles.groupItems}>
                <div style={styles.itemsHeader}>
                  <span style={styles.itemsTitle}>Items in this group ({group.pos_modifier_group_items?.length || 0})</span>
                  <button 
                    onClick={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
                    style={styles.addItemButton}
                  >
                    {selectedGroupId === group.id ? 'Cancel' : '+ Add Item'}
                  </button>
                </div>

                {selectedGroupId === group.id && (
                  <div style={styles.addItemForm}>
                    <div style={styles.addItemRow}>
                      <select
                        value={newItemInventoryId}
                        onChange={(e) => setNewItemInventoryId(e.target.value)}
                        style={styles.select}
                      >
                        <option value="">Select inventory item...</option>
                        {inventoryItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} (${item.price?.toFixed(2) || '0.00'})
                          </option>
                        ))}
                      </select>
                      
                      <div style={styles.priceSection}>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={newItemIsFree}
                            onChange={(e) => setNewItemIsFree(e.target.checked)}
                          />
                          Free
                        </label>
                        {!newItemIsFree && (
                          <input
                            type="number"
                            placeholder="Override price"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                            style={styles.priceInput}
                            step="0.01"
                            min="0"
                          />
                        )}
                      </div>
                      
                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={newItemDefaultSelected}
                          onChange={(e) => setNewItemDefaultSelected(e.target.checked)}
                        />
                        Default
                      </label>
                      
                      <button 
                        onClick={addModifierItem}
                        style={styles.addItemSubmitButton}
                        disabled={!newItemInventoryId}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                <div style={styles.itemsList}>
                  {(!group.pos_modifier_group_items || group.pos_modifier_group_items.length === 0) ? (
                    <div style={styles.emptyItems}>No items in this group</div>
                  ) : (
                    group.pos_modifier_group_items.map(item => (
                      <div key={item.id} style={styles.itemRow}>
                        <div style={styles.itemInfo}>
                          <div style={styles.itemName}>
                            {item.pos_inventory?.name || 'Unknown Item'}
                            {item.is_default_selected && <span style={styles.defaultBadge}>DEFAULT</span>}
                          </div>
                          <div style={styles.itemPrice}>
                            {item.is_free ? (
                              <span style={styles.freeLabel}>FREE</span>
                            ) : (
                              `$${(item.price_override ?? item.pos_inventory?.price ?? 0).toFixed(2)}`
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeModifierItem(
                            item.id, 
                            item.pos_inventory?.name || 'Unknown Item',
                            group.name
                          )}
                          style={styles.removeItemButton}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))
        )}
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    cursor: 'pointer',
    marginBottom: '6px'
  },
  input: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  smallInput: {
    padding: '8px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    width: '80px'
  },
  select: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white'
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
  groupsContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
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
  groupCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },
  groupInfo: {
    flex: 1
  },
  groupTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '6px'
  },
  requiredBadge: {
    fontSize: '10px',
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  groupMeta: {
    fontSize: '14px',
    color: '#6b7280'
  },
  editGroupForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  editOptions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  groupActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  actions: {
    display: 'flex',
    gap: '6px'
  },
  editActions: {
    display: 'flex',
    gap: '6px'
  },
  orderButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  saveButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  groupItems: {
    padding: '20px'
  },
  itemsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  itemsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  addItemButton: {
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  addItemForm: {
    backgroundColor: '#f9fafb',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '15px',
    border: '1px solid #e5e7eb'
  },
  addItemRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'end',
    flexWrap: 'wrap'
  },
  priceSection: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  priceInput: {
    padding: '8px',
    border: '2px solid #d1d5db',
    borderRadius: '4px',
    width: '100px',
    fontSize: '14px'
  },
  addItemSubmitButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  emptyItems: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '20px'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  itemInfo: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  defaultBadge: {
    fontSize: '10px',
    backgroundColor: '#059669',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  itemPrice: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  freeLabel: {
    color: '#059669',
    fontWeight: 'bold'
  },
  removeItemButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    marginLeft: '12px'
  }
};

export default POSModifiers;