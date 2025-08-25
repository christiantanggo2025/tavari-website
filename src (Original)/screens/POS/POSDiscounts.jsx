// src/screens/POS/POSDiscounts.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';

const POSDiscounts = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('percentage');
  const [newValue, setNewValue] = useState('');
  const [newRecurring, setNewRecurring] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('percentage');
  const [editValue, setEditValue] = useState('');
  const [editRecurring, setEditRecurring] = useState(false);

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
    } catch (err) {
      setError('Error fetching discounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addDiscount = async () => {
    if (!newName.trim() || !newValue) return;
    setError(null);
    try {
      const { error } = await supabase.from('pos_discounts').insert([{
        business_id: businessId,
        name: newName.trim(),
        type: newType,
        value: parseFloat(newValue),
        recurring: newRecurring
      }]);

      if (error) throw error;
      setNewName('');
      setNewType('percentage');
      setNewValue('');
      setNewRecurring(false);
      fetchDiscounts();
    } catch (err) {
      setError('Error adding discount: ' + err.message);
    }
  };

  const startEdit = (discount) => {
    setEditId(discount.id);
    setEditName(discount.name);
    setEditType(discount.type);
    setEditValue(discount.value);
    setEditRecurring(discount.recurring);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditType('percentage');
    setEditValue('');
    setEditRecurring(false);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editValue) return;
    setError(null);
    try {
      const { error } = await supabase
        .from('pos_discounts')
        .update({
          name: editName.trim(),
          type: editType,
          value: parseFloat(editValue),
          recurring: editRecurring
        })
        .eq('id', editId);

      if (error) throw error;
      cancelEdit();
      fetchDiscounts();
    } catch (err) {
      setError('Error updating discount: ' + err.message);
    }
  };

  const deleteDiscount = async (id) => {
    if (!window.confirm('Delete this discount?')) return;
    setError(null);
    try {
      const { error } = await supabase.from('pos_discounts').delete().eq('id', id);
      if (error) throw error;
      fetchDiscounts();
    } catch (err) {
      setError('Error deleting discount: ' + err.message);
    }
  };

  if (loading) return <div>Loading discounts...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>POS Discounts</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      {/* Add New Discount */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Discount name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ marginRight: 10, padding: 5 }}
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          style={{ marginRight: 10, padding: 5 }}
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed Amount</option>
        </select>
        <input
          type="number"
          placeholder="Value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          style={{ marginRight: 10, padding: 5, width: 100 }}
        />
        <label style={{ marginRight: 10 }}>
          <input
            type="checkbox"
            checked={newRecurring}
            onChange={(e) => setNewRecurring(e.target.checked)}
          /> Recurring
        </label>
        <button onClick={addDiscount}>Add</button>
      </div>

      {/* Discount Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Name</th>
            <th style={{ width: 120, borderBottom: '1px solid #ccc' }}>Type</th>
            <th style={{ width: 120, borderBottom: '1px solid #ccc' }}>Value</th>
            <th style={{ width: 120, borderBottom: '1px solid #ccc' }}>Recurring</th>
            <th style={{ width: 200, borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {discounts.length === 0 && (
            <tr>
              <td colSpan="5" style={{ padding: '8px', textAlign: 'center' }}>
                No discounts found.
              </td>
            </tr>
          )}
          {discounts.map((d, i) => (
            <tr key={d.id} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
              <td style={{ padding: '8px' }}>
                {editId === d.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ padding: 5, width: '100%' }}
                  />
                ) : (
                  d.name
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {editId === d.id ? (
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    style={{ padding: 5 }}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                ) : (
                  d.type
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {editId === d.id ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{ padding: 5, width: 100 }}
                  />
                ) : (
                  d.value
                )}
              </td>
              <td style={{ padding: '8px' }}>
                {editId === d.id ? (
                  <input
                    type="checkbox"
                    checked={editRecurring}
                    onChange={(e) => setEditRecurring(e.target.checked)}
                  />
                ) : (
                  d.recurring ? 'Yes' : 'No'
                )}
              </td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                {editId === d.id ? (
                  <>
                    <button onClick={saveEdit} style={{ marginRight: 8 }}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(d)} style={{ marginRight: 8 }}>Edit</button>
                    <button onClick={() => deleteDiscount(d.id)}>Delete</button>
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

export default POSDiscounts;
