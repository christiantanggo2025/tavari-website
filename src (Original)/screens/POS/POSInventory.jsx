// src/screens/POS/POSInventory.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';

const POSInventory = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemSKU, setNewItemSKU] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState(null);

  const [editItemId, setEditItemId] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemCost, setEditItemCost] = useState('');
  const [editItemSKU, setEditItemSKU] = useState('');
  const [editItemCategoryId, setEditItemCategoryId] = useState(null);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (businessId) {
      fetchInventory();
      fetchCategories();
    }
  }, [businessId]);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_inventory')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (err) {
      setError('Error fetching inventory: ' + err.message);
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
      // silently fail categories - optional
    }
  };

  const addItem = async () => {
    if (!newItemName.trim()) return;
    setError(null);
    try {
      const maxSortOrder = inventory.length > 0 ? Math.max(...inventory.map(i => i.sort_order)) : 0;
      const { error } = await supabase.from('pos_inventory').insert([{
        business_id: businessId,
        name: newItemName.trim(),
        price: parseFloat(newItemPrice) || 0,
        cost: parseFloat(newItemCost) || 0,
        sku: newItemSKU.trim(),
        category_id: newItemCategoryId,
        sort_order: maxSortOrder + 1,
      }]);
      if (error) throw error;
      setNewItemName('');
      setNewItemPrice('');
      setNewItemCost('');
      setNewItemSKU('');
      setNewItemCategoryId(null);
      fetchInventory();
    } catch (err) {
      setError('Error adding item: ' + err.message);
    }
  };

  const startEditItem = (item) => {
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditItemPrice(item.price);
    setEditItemCost(item.cost);
    setEditItemSKU(item.sku);
    setEditItemCategoryId(item.category_id);
  };

  const cancelEdit = () => {
    setEditItemId(null);
    setEditItemName('');
    setEditItemPrice('');
    setEditItemCost('');
    setEditItemSKU('');
    setEditItemCategoryId(null);
  };

  const saveEditItem = async () => {
    if (!editItemName.trim()) return;
    setError(null);
    try {
      const { error } = await supabase
        .from('pos_inventory')
        .update({
          name: editItemName.trim(),
          price: parseFloat(editItemPrice) || 0,
          cost: parseFloat(editItemCost) || 0,
          sku: editItemSKU.trim(),
          category_id: editItemCategoryId,
        })
        .eq('id', editItemId);
      if (error) throw error;
      cancelEdit();
      fetchInventory();
    } catch (err) {
      setError('Error updating item: ' + err.message);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    setError(null);
    try {
      const { error } = await supabase.from('pos_inventory').delete().eq('id', id);
      if (error) throw error;
      fetchInventory();
    } catch (err) {
      setError('Error deleting item: ' + err.message);
    }
  };

  const moveItem = async (id, direction) => {
    setError(null);
    try {
      const index = inventory.findIndex(i => i.id === id);
      if (index === -1) return;

      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= inventory.length) return;

      const itemA = inventory[index];
      const itemB = inventory[swapIndex];

      // Swap sort_order values
      const updates = [
        { id: itemA.id, sort_order: itemB.sort_order },
        { id: itemB.id, sort_order: itemA.sort_order }
      ];

      for (const update of updates) {
        const { error } = await supabase.from('pos_inventory').update({ sort_order: update.sort_order }).eq('id', update.id);
        if (error) throw error;
      }

      fetchInventory();
    } catch (err) {
      setError('Error moving item: ' + err.message);
    }
  };

  if (loading) return <div>Loading inventory...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>POS Inventory</h2>

      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      {/* Add new item */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Item name"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          style={{ marginRight: 10, padding: 5 }}
        />
        <input
          type="number"
          placeholder="Price"
          value={newItemPrice}
          onChange={(e) => setNewItemPrice(e.target.value)}
          style={{ marginRight: 10, padding: 5, width: 100 }}
        />
        <input
          type="number"
          placeholder="Cost"
          value={newItemCost}
          onChange={(e) => setNewItemCost(e.target.value)}
          style={{ marginRight: 10, padding: 5, width: 100 }}
        />
        <input
          type="text"
          placeholder="SKU"
          value={newItemSKU}
          onChange={(e) => setNewItemSKU(e.target.value)}
          style={{ marginRight: 10, padding: 5, width: 150 }}
        />
        <select
          value={newItemCategoryId || ''}
          onChange={(e) => setNewItemCategoryId(e.target.value || null)}
          style={{ marginRight: 10, padding: 5 }}
        >
          <option value="">-- Select Category --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={addItem}>Add Item</button>
      </div>

      {/* Inventory list */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Name</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Price</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Cost</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>SKU</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Category</th>
            <th style={{ width: 150, borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {inventory.length === 0 && (
            <tr>
              <td colSpan="6" style={{ padding: '8px', textAlign: 'center' }}>
                No inventory items found.
              </td>
            </tr>
          )}
          {inventory.map((item, i) => (
            <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
              <td style={{ padding: '8px' }}>
                {editItemId === item.id ? (
                  <input
                    type="text"
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    style={{ padding: 5, width: '100%' }}
                  />
                ) : (
                  item.name
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {editItemId === item.id ? (
                  <input
                    type="number"
                    value={editItemPrice}
                    onChange={(e) => setEditItemPrice(e.target.value)}
                    style={{ padding: 5, width: '100px' }}
                  />
                ) : (
                  item.price?.toFixed(2)
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {editItemId === item.id ? (
                  <input
                    type="number"
                    value={editItemCost}
                    onChange={(e) => setEditItemCost(e.target.value)}
                    style={{ padding: 5, width: '100px' }}
                  />
                ) : (
                  item.cost?.toFixed(2)
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {editItemId === item.id ? (
                  <input
                    type="text"
                    value={editItemSKU}
                    onChange={(e) => setEditItemSKU(e.target.value)}
                    style={{ padding: 5, width: '150px' }}
                  />
                ) : (
                  item.sku
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {categories.find(c => c.id === item.category_id)?.name || ''}
              </td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                {editItemId === item.id ? (
                  <>
                    <button onClick={saveEditItem} style={{ marginRight: 8 }}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEditItem(item)} style={{ marginRight: 8 }}>Edit</button>
                    <button onClick={() => deleteItem(item.id)} style={{ marginRight: 8 }}>Delete</button>
                    <button onClick={() => moveItem(item.id, -1)} disabled={i === 0} style={{ marginRight: 4 }}>↑</button>
                    <button onClick={() => moveItem(item.id, 1)} disabled={i === inventory.length - 1}>↓</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default POSInventory;
