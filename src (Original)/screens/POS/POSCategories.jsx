// src/screens/POS/POSCategories.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';

const POSCategories = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState(null);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  useEffect(() => {
    if (businessId) {
      fetchCategories();
    }
  }, [businessId]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_categories')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      setError('Error fetching categories: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    setError(null);
    try {
      const maxSortOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;
      const { error } = await supabase.from('pos_categories').insert([{
        name: newCategoryName.trim(),
        business_id: businessId,
        sort_order: maxSortOrder + 1
      }]);

      if (error) throw error;
      setNewCategoryName('');
      fetchCategories();
    } catch (err) {
      setError('Error adding category: ' + err.message);
    }
  };

  const startEditCategory = (category) => {
    setEditCategoryId(category.id);
    setEditCategoryName(category.name);
  };

  const cancelEdit = () => {
    setEditCategoryId(null);
    setEditCategoryName('');
  };

  const saveEditCategory = async () => {
    if (!editCategoryName.trim()) return;
    setError(null);
    try {
      const { error } = await supabase
        .from('pos_categories')
        .update({ name: editCategoryName.trim() })
        .eq('id', editCategoryId);
      if (error) throw error;
      setEditCategoryId(null);
      setEditCategoryName('');
      fetchCategories();
    } catch (err) {
      setError('Error updating category: ' + err.message);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    setError(null);
    try {
      const { error } = await supabase.from('pos_categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err) {
      setError('Error deleting category: ' + err.message);
    }
  };

  const moveCategory = async (id, direction) => {
    setError(null);
    try {
      const index = categories.findIndex(c => c.id === id);
      if (index === -1) return;

      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= categories.length) return;

      const categoryA = categories[index];
      const categoryB = categories[swapIndex];

      // Swap sort_order values
      const updates = [
        { id: categoryA.id, sort_order: categoryB.sort_order },
        { id: categoryB.id, sort_order: categoryA.sort_order }
      ];

      for (const update of updates) {
        const { error } = await supabase.from('pos_categories').update({ sort_order: update.sort_order }).eq('id', update.id);
        if (error) throw error;
      }

      fetchCategories();
    } catch (err) {
      setError('Error moving category: ' + err.message);
    }
  };

  if (!businessId) return <div>Please select a business.</div>;
  if (loading) return <div>Loading categories...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>POS Categories</h2>

      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="New category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          style={{ marginRight: 10, padding: 5 }}
        />
        <button onClick={addCategory}>Add Category</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Name</th>
            <th style={{ width: 150, borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 && (
            <tr>
              <td colSpan="2" style={{ padding: '8px', textAlign: 'center' }}>
                No categories found.
              </td>
            </tr>
          )}
          {categories.map((category, i) => (
            <tr key={category.id} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
              <td style={{ padding: '8px' }}>
                {editCategoryId === category.id ? (
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    style={{ padding: 5, width: '100%' }}
                  />
                ) : (
                  category.name
                )}
              </td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                {editCategoryId === category.id ? (
                  <>
                    <button onClick={saveEditCategory} style={{ marginRight: 8 }}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEditCategory(category)} style={{ marginRight: 8 }}>Edit</button>
                    <button onClick={() => deleteCategory(category.id)} style={{ marginRight: 8 }}>Delete</button>
                    <button onClick={() => moveCategory(category.id, -1)} disabled={i === 0} style={{ marginRight: 4 }}>↑</button>
                    <button onClick={() => moveCategory(category.id, 1)} disabled={i === categories.length - 1}>↓</button>
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

export default POSCategories;
