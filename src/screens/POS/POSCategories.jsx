// src/screens/POS/POSCategories.jsx
// Steps 107-108: Enhanced category management with color and emoji picker
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const POSCategories = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#008080');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewEmojiPicker, setShowNewEmojiPicker] = useState(false);
  
  // Edit category form
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#008080');
  const [editCategoryEmoji, setEditCategoryEmoji] = useState('');

  // Predefined colors for quick selection
  const predefinedColors = [
    '#008080', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'
  ];

  // Common emojis for categories
  const commonEmojis = [
    '🍔', '🍕', '🍟', '🌭', '🥪', '🍗', '🍖', '🥗', '🍝', '🍜',
    '🍺', '🍷', '🥤', '☕', '🧊', '🍰', '🧁', '🍪', '🍩', '🍫',
    '🥘', '🍛', '🍲', '🍣', '🍤', '🥟', '🌮', '🌯', '🥙', '🍱',
    '🍎', '🥕', '🥬', '🧀', '🥓', '🍞', '🥖', '🥨', '🥯', '🥞'
  ];

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

      await logAction({
        action: 'pos_categories_loaded',
        context: 'POSCategories',
        metadata: { category_count: data?.length || 0 }
      });

    } catch (err) {
      setError('Error fetching categories: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setError(null);
    try {
      const maxSortOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) : 0;
      
      const { error } = await supabase.from('pos_categories').insert([{
        name: newCategoryName.trim(),
        business_id: businessId,
        color: newCategoryColor,
        emoji: newCategoryEmoji.trim() || null,
        sort_order: maxSortOrder + 1,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      await logAction({
        action: 'pos_category_created',
        context: 'POSCategories',
        metadata: {
          category_name: newCategoryName.trim(),
          color: newCategoryColor,
          emoji: newCategoryEmoji
        }
      });

      // Reset form
      setNewCategoryName('');
      setNewCategoryColor('#008080');
      setNewCategoryEmoji('');
      setShowNewEmojiPicker(false);
      
      fetchCategories();
    } catch (err) {
      setError('Error adding category: ' + err.message);
    }
  };

  const startEditCategory = (category) => {
    setEditCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color || '#008080');
    setEditCategoryEmoji(category.emoji || '');
  };

  const cancelEdit = () => {
    setEditCategoryId(null);
    setEditCategoryName('');
    setEditCategoryColor('#008080');
    setEditCategoryEmoji('');
    setShowEmojiPicker(false);
  };

  const saveEditCategory = async () => {
    if (!editCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setError(null);
    try {
      const { error } = await supabase
        .from('pos_categories')
        .update({ 
          name: editCategoryName.trim(),
          color: editCategoryColor,
          emoji: editCategoryEmoji.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editCategoryId);

      if (error) throw error;

      await logAction({
        action: 'pos_category_updated',
        context: 'POSCategories',
        metadata: {
          category_id: editCategoryId,
          category_name: editCategoryName.trim(),
          color: editCategoryColor,
          emoji: editCategoryEmoji
        }
      });

      cancelEdit();
      fetchCategories();
    } catch (err) {
      setError('Error updating category: ' + err.message);
    }
  };

  const deleteCategory = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    
    setError(null);
    try {
      const { error } = await supabase.from('pos_categories').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'pos_category_deleted',
        context: 'POSCategories',
        metadata: { category_id: id, category_name: name }
      });

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
        { id: categoryA.id, sort_order: categoryB.sort_order || 0 },
        { id: categoryB.id, sort_order: categoryA.sort_order || 0 }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('pos_categories')
          .update({ 
            sort_order: update.sort_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        if (error) throw error;
      }

      await logAction({
        action: 'pos_category_reordered',
        context: 'POSCategories',
        metadata: {
          category_a: categoryA.name,
          category_b: categoryB.name,
          direction: direction > 0 ? 'down' : 'up'
        }
      });

      fetchCategories();
    } catch (err) {
      setError('Error moving category: ' + err.message);
    }
  };

  const handleEmojiSelect = (emoji, isNew = false) => {
    if (isNew) {
      setNewCategoryEmoji(emoji);
      setShowNewEmojiPicker(false);
    } else {
      setEditCategoryEmoji(emoji);
      setShowEmojiPicker(false);
    }
  };

  if (!businessId) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Please select a business to manage categories.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading categories...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>POS Categories</h2>
        <p>Organize inventory items with colors and visual identifiers</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Add New Category Form */}
      <div style={styles.addSection}>
        <h3 style={styles.sectionTitle}>Add New Category</h3>
        <div style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Category Name *</label>
              <input
                type="text"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <div style={styles.colorSection}>
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  style={styles.colorInput}
                />
                <div style={styles.colorPreview}>
                  <div 
                    style={{
                      ...styles.colorSwatch,
                      backgroundColor: newCategoryColor
                    }}
                  />
                  <span style={styles.colorCode}>{newCategoryColor}</span>
                </div>
              </div>
              
              <div style={styles.predefinedColors}>
                {predefinedColors.map(color => (
                  <div
                    key={color}
                    style={{
                      ...styles.colorOption,
                      backgroundColor: color,
                      border: newCategoryColor === color ? '3px solid #1f2937' : '1px solid #d1d5db'
                    }}
                    onClick={() => setNewCategoryColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Emoji (Optional)</label>
              <div style={styles.emojiSection}>
                <div
                  style={styles.emojiDisplay}
                  onClick={() => setShowNewEmojiPicker(!showNewEmojiPicker)}
                >
                  {newCategoryEmoji || '➕'}
                </div>
                <input
                  type="text"
                  placeholder="Type emoji or click to select"
                  value={newCategoryEmoji}
                  onChange={(e) => setNewCategoryEmoji(e.target.value.slice(0, 2))}
                  style={styles.emojiInput}
                />
              </div>
              
              {showNewEmojiPicker && (
                <div style={styles.emojiPicker}>
                  <div style={styles.emojiGrid}>
                    {commonEmojis.map(emoji => (
                      <div
                        key={emoji}
                        style={styles.emojiOption}
                        onClick={() => handleEmojiSelect(emoji, true)}
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={addCategory} 
            style={styles.addButton}
            disabled={!newCategoryName.trim()}
          >
            Add Category
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Preview</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Color</th>
              <th style={styles.th}>Emoji</th>
              <th style={styles.th}>Order</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan="6" style={styles.emptyCell}>
                  No categories found. Create your first category above.
                </td>
              </tr>
            )}
            {categories.map((category, i) => (
              <tr key={category.id} style={{
                ...styles.row,
                backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white'
              }}>
                <td style={styles.td}>
                  <div 
                    style={{
                      ...styles.categoryPreview,
                      backgroundColor: category.color || '#008080'
                    }}
                  >
                    {category.emoji && (
                      <span style={styles.previewEmoji}>{category.emoji}</span>
                    )}
                  </div>
                </td>
                
                <td style={styles.td}>
                  {editCategoryId === category.id ? (
                    <input
                      type="text"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      style={styles.input}
                    />
                  ) : (
                    <div style={styles.categoryName}>
                      {category.emoji && (
                        <span style={styles.nameEmoji}>{category.emoji}</span>
                      )}
                      {category.name}
                    </div>
                  )}
                </td>
                
                <td style={styles.td}>
                  {editCategoryId === category.id ? (
                    <div style={styles.editColorSection}>
                      <input
                        type="color"
                        value={editCategoryColor}
                        onChange={(e) => setEditCategoryColor(e.target.value)}
                        style={styles.colorInput}
                      />
                      <div style={styles.predefinedColors}>
                        {predefinedColors.slice(0, 6).map(color => (
                          <div
                            key={color}
                            style={{
                              ...styles.colorOption,
                              backgroundColor: color,
                              border: editCategoryColor === color ? '2px solid #1f2937' : '1px solid #d1d5db'
                            }}
                            onClick={() => setEditCategoryColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={styles.colorDisplay}>
                      <div 
                        style={{
                          ...styles.colorSwatch,
                          backgroundColor: category.color || '#008080'
                        }}
                      />
                      <span style={styles.colorCode}>{category.color || '#008080'}</span>
                    </div>
                  )}
                </td>
                
                <td style={styles.td}>
                  {editCategoryId === category.id ? (
                    <div style={styles.editEmojiSection}>
                      <div
                        style={styles.emojiDisplay}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        {editCategoryEmoji || '➕'}
                      </div>
                      <input
                        type="text"
                        value={editCategoryEmoji}
                        onChange={(e) => setEditCategoryEmoji(e.target.value.slice(0, 2))}
                        style={styles.emojiInput}
                        placeholder="Emoji"
                      />
                      {showEmojiPicker && (
                        <div style={styles.emojiPicker}>
                          <div style={styles.emojiGrid}>
                            {commonEmojis.slice(0, 20).map(emoji => (
                              <div
                                key={emoji}
                                style={styles.emojiOption}
                                onClick={() => handleEmojiSelect(emoji, false)}
                              >
                                {emoji}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={styles.emojiDisplay}>
                      {category.emoji || '—'}
                    </div>
                  )}
                </td>
                
                <td style={styles.td}>
                  <div style={styles.orderControls}>
                    <button
                      onClick={() => moveCategory(category.id, -1)}
                      disabled={i === 0}
                      style={styles.orderButton}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <span style={styles.orderNumber}>{i + 1}</span>
                    <button
                      onClick={() => moveCategory(category.id, 1)}
                      disabled={i === categories.length - 1}
                      style={styles.orderButton}
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                
                <td style={styles.td}>
                  {editCategoryId === category.id ? (
                    <div style={styles.editActions}>
                      <button 
                        onClick={saveEditCategory} 
                        style={styles.saveButton}
                        disabled={!editCategoryName.trim()}
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
                        onClick={() => startEditCategory(category)} 
                        style={styles.editButton}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteCategory(category.id, category.name)} 
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
    alignItems: 'start'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  colorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  colorInput: {
    width: '60px',
    height: '40px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  colorPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  colorSwatch: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '2px solid #d1d5db'
  },
  colorCode: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  predefinedColors: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '6px'
  },
  colorOption: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  emojiSection: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  emojiDisplay: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '20px',
    backgroundColor: 'white'
  },
  emojiInput: {
    flex: 1,
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  emojiPicker: {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 1000,
    backgroundColor: 'white',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxWidth: '300px'
  },
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '4px'
  },
  emojiOption: {
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '16px',
    transition: 'background-color 0.2s ease'
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
    border: '1px solid #e5e7eb'
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
    verticalAlign: 'middle'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  categoryPreview: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #d1d5db'
  },
  previewEmoji: {
    fontSize: '20px'
  },
  categoryName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  nameEmoji: {
    fontSize: '18px'
  },
  colorDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  editColorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  editEmojiSection: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    position: 'relative'
  },
  orderControls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  orderButton: {
    width: '24px',
    height: '24px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  orderNumber: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 'bold'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  editActions: {
    display: 'flex',
    gap: '8px'
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  saveButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  }
};

export default POSCategories;