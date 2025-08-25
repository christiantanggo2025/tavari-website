// src/screens/POS/POSModifiers.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';

const POSModifiers = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [modifiers, setModifiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newModifierName, setNewModifierName] = useState('');
  const [newModifierPrice, setNewModifierPrice] = useState('');
  const [newModifierCategoryId, setNewModifierCategoryId] = useState(null);

  const [editModifierId, setEditModifierId] = useState(null);
  const [editModifierName, setEditModifierName] = useState('');
  const [editModifierPrice, setEditModifierPrice] = useState('');
  const [editModifierCategoryId, setEditModifierCategoryId] = useState(null);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (businessId) {
      fetchModifiers();
      fetchCategories();
    }
  }, [businessId]);

  const fetchModifiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_modifiers')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setModifiers(data || []);
    } catch (err) {
      setError('Error fetching modifiers: ' + err.message);
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

  const addModifier = async () => {
    if (!newModifierName.trim()) return;
    setError(null);
    try {
      const maxSortOrder = modifiers.length > 0 ? Math.max(...modifiers.map(m => m.sort_order)) : 0;
      const { error } = await supabase.from('pos_modifiers').insert([{
        business_id: businessId,
        name: newModifierName.trim(),
        price: parseFloat(newModifierPrice) || 0,
        category_id: newModifierCategoryId,
        sort_order: maxSortOrder + 1
      }]);

      if (error) throw error;
      setNewModifierName('');
      setNewModifierPrice('');
      setNewModifierCategoryId(null);
      fetchModifiers();
    } catch (err) {
      setError('Error adding modifier: ' + err.message);
    }
  };

  const startEditModifier = (modifier) => {
    setEditModifierId(modifier.id);
    setEditModifierName(modifier.name);
    setEditModifierPrice(modifier.price);
    setEditModifierCategoryId(modifier.category_id);
  };

  const cancelEdit = () => {
    setEditModifierId(null);
    setEditModifierName('');
    setEditModifierPrice('');
    setEditModifierCategoryId(null);
  };

  const saveEditModifier = async () => {
    if (!editModifierName.trim()) return;
    setError(null);
    try {
      const { error } = await supabase
        .from('pos_modifiers')
        .update({
          name: editModifierName.trim(),
          price: parseFloat(editModifierPrice) || 0,
          category_id: editModifierCategoryId
        })
        .eq('id', editModifierId);

      if (error) throw error;
      setEditModifierId(null);
      setEditModifierName('');
      setEditModifierPrice('');
      setEditModifierCategoryId(null);
      fetchModifiers();
    } catch (err) {
      setError('Error updating modifier: ' + err.message);
    }
  };

  const deleteModifier = async (id) => {
    if (!window.confirm('Are you sure you want to delete this modifier?')) return;
    setError(null);
    try {
      const { error } = await supabase.from('pos_modifiers').delete().eq('id', id);
      if (error) throw error;
      fetchModifiers();
    } catch (err) {
      setError('Error deleting modifier: ' + err.message);
    }
  };

  const moveModifier = async (id, direction) => {
    setError(null);
    try {
      const index = modifiers.findIndex(m => m.id === id);
      if (index === -1) return;

      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= modifiers.length) return;

      const modifierA = modifiers[index];
      const modifierB = modifiers[swapIndex];

      // Swap sort_order values
      const updates = [
        { id: modifierA.id, sort_order: modifierB.sort_order },
        { id: modifierB.id, sort_order: modifierA.sort_order }
      ];

      for (const update of updates) {
        const { error } = await supabase.from('pos_modifiers').update({ sort_order: update.sort_order }).eq('id', update.id);
        if (error) throw error;
      }

      fetchModifiers();
    } catch (err) {
      setError('Error moving modifier: ' + err.message);
    }
  };

  if (loading) return <div>Loading modifiers...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>POS Modifiers</h2>

      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="New modifier name"
          value={newModifierName}
          onChange={(e) => setNewModifierName(e.target.value)}
          style={{ marginRight: 10, padding: 5 }}
        />
        <input
          type="number"
          placeholder="Price"
          value={newModifierPrice}
          onChange={(e) => setNewModifierPrice(e.target.value)}
          style={{ marginRight: 10, padding: 5, width: 100 }}
        />
        <select
          value={newModifierCategoryId || ''}
          onChange={(e) => setNewModifierCategoryId(e.target.value || null)}
          style={{ marginRight: 10, padding: 5 }}
        >
          <option value="">-- Select Category --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={addModifier}>Add Modifier</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Name</th>
            <th style={{ width: 150, borderBottom: '1px solid #ccc' }}>Price</th>
            <th style={{ width: 150, borderBottom: '1px solid #ccc' }}>Category</th>
            <th style={{ width: 150, borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {modifiers.length === 0 && (
            <tr>
              <td colSpan="4" style={{ padding: '8px', textAlign: 'center' }}>
                No modifiers found.
              </td>
            </tr>
          )}
          {modifiers.map((modifier, i) => (
            <tr key={modifier.id} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
              <td style={{ padding: '8px' }}>
                {editModifierId === modifier.id ? (
                  <input
                    type="text"
                    value={editModifierName}
                    onChange={(e) => setEditModifierName(e.target.value)}
                    style={{ padding: 5, width: '100%' }}
                  />
                ) : (
                  modifier.name
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {editModifierId === modifier.id ? (
                  <input
                    type="number"
                    value={editModifierPrice}
                    onChange={(e) => setEditModifierPrice(e.target.value)}
                    style={{ padding: 5, width: '100px' }}
                  />
                ) : (
                  modifier.price?.toFixed(2)
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {categories.find(c => c.id === modifier.category_id)?.name || ''}
              </td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                {editModifierId === modifier.id ? (
                  <>
                    <button onClick={saveEditModifier} style={{ marginRight: 8 }}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEditModifier(modifier)} style={{ marginRight: 8 }}>Edit</button>
                    <button onClick={() => deleteModifier(modifier.id)} style={{ marginRight: 8 }}>Delete</button>
                    <button onClick={() => moveModifier(modifier.id, -1)} disabled={i === 0} style={{ marginRight: 4 }}>↑</button>
                    <button onClick={() => moveModifier(modifier.id, 1)} disabled={i === modifiers.length - 1}>↓</button>
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

export default POSModifiers;
