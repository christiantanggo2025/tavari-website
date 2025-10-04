// src/screens/POS/POSCategories.jsx - Updated with Foundation Components
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { logAction } from '../../helpers/posAudit';

// Foundation Components
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';

import CategoryModal from '../../components/CategoryModal';

const POSCategories = () => {
  const navigate = useNavigate();
  
  // Use standardized authentication
  const auth = usePOSAuth({
    requireBusiness: true,
    requiredRoles: ['manager', 'owner'], // Categories typically need management access
    componentName: 'POSCategories'
  });

  // Use standardized tax calculations
  const {
    taxCategories,
    categoryTaxAssignments,
    calculateItemTax,
    loading: taxLoading,
    error: taxError,
    refreshTaxData
  } = useTaxCalculations(auth.selectedBusinessId);

  // Component state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Edit category form
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#008080');
  const [editCategoryEmoji, setEditCategoryEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Tax assignment state
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [selectedCategoryForTax, setSelectedCategoryForTax] = useState(null);
  const [selectedTaxCategories, setSelectedTaxCategories] = useState([]);

  // Tax preview state
  const [showTaxPreview, setShowTaxPreview] = useState(false);
  const [previewSamplePrice, setPreviewSamplePrice] = useState(10.00);

  // Predefined colors with names for dropdown
  const colorOptions = [
    { value: TavariStyles.colors.primary, name: 'Teal (Default)', preview: TavariStyles.colors.primary },
    { value: TavariStyles.colors.secondary, name: 'Blue', preview: TavariStyles.colors.secondary },
    { value: TavariStyles.colors.success, name: 'Green', preview: TavariStyles.colors.success },
    { value: TavariStyles.colors.warning, name: 'Orange', preview: TavariStyles.colors.warning },
    { value: TavariStyles.colors.danger, name: 'Red', preview: TavariStyles.colors.danger },
    { value: '#8b5cf6', name: 'Purple', preview: '#8b5cf6' },
    { value: '#ec4899', name: 'Pink', preview: '#ec4899' },
    { value: TavariStyles.colors.info, name: 'Cyan', preview: TavariStyles.colors.info },
    { value: '#84cc16', name: 'Lime', preview: '#84cc16' },
    { value: '#f97316', name: 'Amber', preview: '#f97316' },
    { value: '#6366f1', name: 'Indigo', preview: '#6366f1' },
    { value: '#14b8a6', name: 'Emerald', preview: '#14b8a6' }
  ];

  // Common emojis for categories
  const commonEmojis = [
    '🍔', '🍕', '🍟', '🌭', '🥪', '🗃', '🥖', '🥗', '🍝', '🍜',
    '🍺', '🍷', '🥤', '☕', '🧊', '🍰', '🧁', '🍪', '🍩', '🍫',
    '🥘', '🍛', '🍲', '🍣', '🍤', '🥟', '🌮', '🌯', '🥙', '🍱',
    '🍎', '🥕', '🥬', '🧀', '🥔', '🍞', '🥖', '🥨', '🥯', '🥞'
  ];

  // Load categories when auth is ready
  useEffect(() => {
    if (auth.selectedBusinessId && auth.isReady) {
      fetchCategories();
    }
  }, [auth.selectedBusinessId, auth.isReady]);

  const fetchCategories = async () => {
    if (!auth.selectedBusinessId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_categories')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);

      await logAction({
        action: 'pos_categories_loaded',
        context: 'POSCategories',
        metadata: { category_count: data?.length || 0 },
        actor_id: auth.authUser?.id,
        business_id: auth.selectedBusinessId
      });

    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Error fetching categories: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTaxAssignments = (categoryId) => {
    return categoryTaxAssignments.filter(assignment => assignment.category_id === categoryId);
  };

  // Calculate tax preview for a category using the standardized tax calculations
  const calculateTaxPreview = (categoryId, samplePrice = 10.00) => {
    const mockItem = {
      id: 'preview',
      category_id: categoryId,
      price: samplePrice,
      quantity: 1,
      item_tax_overrides: [] // No item overrides for category preview
    };

    try {
      const result = calculateItemTax(mockItem, samplePrice);
      return {
        success: true,
        taxAmount: result.taxAmount,
        effectiveRate: result.effectiveRate,
        breakdown: result.simpleTaxBreakdown,
        rebates: result.rebateBreakdown,
        isExempt: result.isExempt
      };
    } catch (error) {
      console.error('Tax preview calculation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const handleCategoryModalSave = async (categoryData) => {
    if (!auth.selectedBusinessId) {
      setError('No business selected');
      return;
    }

    setError(null);
    try {
      const maxSortOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) : 0;
      
      // Insert the category first
      const { data: newCategory, error: categoryError } = await supabase
        .from('pos_categories')
        .insert([{
          name: categoryData.name,
          business_id: auth.selectedBusinessId,
          color: categoryData.color,
          emoji: categoryData.emoji,
          sort_order: maxSortOrder + 1,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Handle multiple tax assignments if provided
      if (categoryData.selectedTaxCategories && categoryData.selectedTaxCategories.length > 0) {
        const assignments = categoryData.selectedTaxCategories.map(taxCategoryId => ({
          business_id: auth.selectedBusinessId,
          category_id: newCategory.id,
          tax_category_id: taxCategoryId,
          is_active: true
        }));

        const { error: assignmentError } = await supabase
          .from('pos_category_tax_assignments')
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      await logAction({
        action: 'pos_category_created',
        context: 'POSCategories',
        metadata: {
          category_name: categoryData.name,
          color: categoryData.color,
          emoji: categoryData.emoji,
          tax_assignments: categoryData.selectedTaxCategories?.length || 0
        },
        actor_id: auth.authUser?.id,
        business_id: auth.selectedBusinessId
      });

      setShowCategoryModal(false);
      fetchCategories();
      refreshTaxData(); // Refresh tax data to get updated assignments
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Error adding category: ' + err.message);
    }
  };

  const startEditCategory = (category) => {
    setEditCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color || TavariStyles.colors.primary);
    setEditCategoryEmoji(category.emoji || '');
  };

  const cancelEdit = () => {
    setEditCategoryId(null);
    setEditCategoryName('');
    setEditCategoryColor(TavariStyles.colors.primary);
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
        },
        actor_id: auth.authUser?.id,
        business_id: auth.selectedBusinessId
      });

      cancelEdit();
      fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      setError('Error updating category: ' + err.message);
    }
  };

  const deleteCategory = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    
    setError(null);
    try {
      // Delete tax assignments first
      await supabase
        .from('pos_category_tax_assignments')
        .delete()
        .eq('category_id', id);

      // Then delete the category
      const { error } = await supabase.from('pos_categories').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'pos_category_deleted',
        context: 'POSCategories',
        metadata: { category_id: id, category_name: name },
        actor_id: auth.authUser?.id,
        business_id: auth.selectedBusinessId
      });

      fetchCategories();
      refreshTaxData(); // Refresh tax data after deletion
    } catch (err) {
      console.error('Error deleting category:', err);
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
        },
        actor_id: auth.authUser?.id,
        business_id: auth.selectedBusinessId
      });

      fetchCategories();
    } catch (err) {
      console.error('Error moving category:', err);
      setError('Error moving category: ' + err.message);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setEditCategoryEmoji(emoji);
    setShowEmojiPicker(false);
  };

  const openTaxModal = (category) => {
    setSelectedCategoryForTax(category);
    const assignments = getCategoryTaxAssignments(category.id);
    setSelectedTaxCategories(assignments.map(a => a.tax_category_id));
    setShowTaxModal(true);
  };

  const closeTaxModal = () => {
    setShowTaxModal(false);
    setSelectedCategoryForTax(null);
    setSelectedTaxCategories([]);
    setShowTaxPreview(false);
  };

  const handleTaxCategoryToggle = (taxCategoryId) => {
    setSelectedTaxCategories(prev => 
      prev.includes(taxCategoryId)
        ? prev.filter(id => id !== taxCategoryId)
        : [...prev, taxCategoryId]
    );
  };

  const saveTaxAssignments = async () => {
    if (!selectedCategoryForTax) return;

    setError(null);
    try {
      // First, deactivate all existing assignments for this category
      await supabase
        .from('pos_category_tax_assignments')
        .update({ is_active: false })
        .eq('category_id', selectedCategoryForTax.id)
        .eq('business_id', auth.selectedBusinessId);

      // Then create new assignments
      if (selectedTaxCategories.length > 0) {
        const assignments = selectedTaxCategories.map(taxCategoryId => ({
          business_id: auth.selectedBusinessId,
          category_id: selectedCategoryForTax.id,
          tax_category_id: taxCategoryId,
          is_active: true
        }));

        const { error } = await supabase
          .from('pos_category_tax_assignments')
          .insert(assignments);

        if (error) throw error;
      }

      await logAction({
        action: 'category_tax_assignments_updated',
        context: 'POSCategories',
        metadata: {
          category_id: selectedCategoryForTax.id,
          category_name: selectedCategoryForTax.name,
          tax_categories: selectedTaxCategories.length
        },
        actor_id: auth.authUser?.id,
        business_id: auth.selectedBusinessId
      });

      refreshTaxData(); // Refresh tax data after assignments change
      closeTaxModal();
    } catch (err) {
      console.error('Error saving tax assignments:', err);
      setError('Error saving tax assignments: ' + err.message);
    }
  };

  const getTaxSummary = (categoryId) => {
    const assignments = getCategoryTaxAssignments(categoryId);
    if (assignments.length === 0) return 'No taxes assigned';
    
    return assignments.map(assignment => {
      const tax = assignment.pos_tax_categories;
      if (!tax) return 'Unknown tax';
      
      const isRebate = tax.category_type === 'rebate';
      const isExemption = tax.category_type === 'exemption';
      
      if (isExemption) return `${tax.name} (Exempt)`;
      if (isRebate) return `${tax.name} (Rebate)`;
      return `${tax.name} (${(tax.rate * 100).toFixed(1)}%)`;
    }).join(', ');
  };

  const getColorOption = (color) => {
    return colorOptions.find(option => option.value === color);
  };

  // Main component content
  const renderContent = () => {
    if (loading || taxLoading) {
      return (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading categories and tax settings...</p>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Category Management</h2>
          <p style={styles.subtitle}>Organize inventory items with colors, visual identifiers, and tax settings</p>
          <button 
            style={styles.addButton}
            onClick={() => setShowCategoryModal(true)}
          >
            Add New Category
          </button>
        </div>

        {(error || taxError) && (
          <div style={styles.errorBanner}>
            {error || taxError}
          </div>
        )}

        {/* Categories Table */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Preview</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Color</th>
                <th style={styles.th}>Icon</th>
                <th style={styles.th}>Tax Settings</th>
                <th style={styles.th}>Order</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td colSpan="7" style={styles.emptyCell}>
                    No categories found. Create your first category using the "Add New Category" button above.
                  </td>
                </tr>
              )}
              {categories.map((category, i) => (
                <tr key={category.id} style={{
                  ...styles.row,
                  backgroundColor: i % 2 === 0 ? TavariStyles.colors.gray50 : TavariStyles.colors.white
                }}>
                  <td style={styles.td}>
                    <div 
                      style={{
                        ...styles.categoryPreview,
                        backgroundColor: category.color || TavariStyles.colors.primary
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
                        <select
                          value={editCategoryColor}
                          onChange={(e) => setEditCategoryColor(e.target.value)}
                          style={styles.colorSelect}
                        >
                          {colorOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={styles.colorDisplay}>
                        <div 
                          style={{
                            ...styles.colorSwatch,
                            backgroundColor: category.color || TavariStyles.colors.primary
                          }}
                        />
                        <span style={styles.colorName}>
                          {getColorOption(category.color || TavariStyles.colors.primary)?.name || 'Custom'}
                        </span>
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
                          {editCategoryEmoji || '🔍'}
                        </div>
                        <input
                          type="text"
                          value={editCategoryEmoji}
                          onChange={(e) => setEditCategoryEmoji(e.target.value.slice(0, 2))}
                          style={styles.emojiInput}
                          placeholder="Icon"
                        />
                        {showEmojiPicker && (
                          <div style={styles.emojiPicker}>
                            <div style={styles.emojiGrid}>
                              {commonEmojis.slice(0, 20).map(emoji => (
                                <div
                                  key={emoji}
                                  style={styles.emojiOption}
                                  onClick={() => handleEmojiSelect(emoji)}
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
                    <div style={styles.taxSettings}>
                      <div style={styles.taxSummary}>
                        {getTaxSummary(category.id)}
                      </div>
                      <button
                        style={styles.taxButton}
                        onClick={() => openTaxModal(category)}
                      >
                        Configure
                      </button>
                    </div>
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

        {/* Category Modal */}
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSave={handleCategoryModalSave}
          taxCategories={taxCategories}
          colorOptions={colorOptions}
        />

        {/* Tax Assignment Modal */}
        {showTaxModal && selectedCategoryForTax && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Tax Settings for "{selectedCategoryForTax.name}"</h3>
                <button style={styles.closeButton} onClick={closeTaxModal}>×</button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={styles.taxDescription}>
                  Select which tax rates apply to items in this category by default. 
                  Individual items can override these settings when needed.
                </div>
                
                <div style={styles.taxCategoriesList}>
                  {taxCategories.map(taxCategory => {
                    const isRebate = taxCategory.category_type === 'rebate';
                    const isExemption = taxCategory.category_type === 'exemption';
                    const isTax = taxCategory.category_type === 'tax';
                    const isSelected = selectedTaxCategories.includes(taxCategory.id);
                    
                    return (
                      <div 
                        key={taxCategory.id} 
                        style={{
                          ...styles.taxCategoryItem,
                          backgroundColor: isSelected ? TavariStyles.colors.infoBg : TavariStyles.colors.white,
                          borderColor: isSelected ? TavariStyles.colors.info : TavariStyles.colors.gray300
                        }}
                        onClick={() => handleTaxCategoryToggle(taxCategory.id)}
                      >
                        <div style={styles.taxCategoryHeader}>
                          <TavariCheckbox
                            checked={isSelected}
                            onChange={() => handleTaxCategoryToggle(taxCategory.id)}
                            size="md"
                          />
                          
                          <div style={styles.taxCategoryInfo}>
                            <div style={styles.taxCategoryName}>
                              {taxCategory.name}
                              {isRebate && <span style={styles.rebateBadge}>REBATE</span>}
                              {isExemption && <span style={styles.exemptionBadge}>EXEMPT</span>}
                              {isTax && <span style={styles.primaryBadge}>TAX</span>}
                            </div>
                            <div style={styles.taxCategoryRate}>
                              {isExemption ? 'Complete tax exemption' :
                               isRebate ? 'Removes qualifying taxes' : 
                               `${(taxCategory.rate * 100).toFixed(2)}% tax rate`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {taxCategories.length === 0 && (
                  <div style={styles.noTaxCategories}>
                    No tax categories found. Create tax categories in POS Settings first.
                  </div>
                )}

                {/* Tax Preview Section */}
                {selectedTaxCategories.length > 0 && (
                  <div style={styles.taxPreviewSection}>
                    <div style={styles.previewHeader}>
                      <h4 style={styles.previewTitle}>Tax Preview</h4>
                      <button
                        style={styles.previewToggleButton}
                        onClick={() => setShowTaxPreview(!showTaxPreview)}
                      >
                        {showTaxPreview ? 'Hide Preview' : 'Show Preview'}
                      </button>
                    </div>
                    
                    {showTaxPreview && (
                      <div style={styles.previewContent}>
                        <div style={styles.previewInputGroup}>
                          <label style={styles.previewLabel}>Sample Item Price:</label>
                          <input
                            type="number"
                            value={previewSamplePrice}
                            onChange={(e) => setPreviewSamplePrice(parseFloat(e.target.value) || 0)}
                            style={styles.previewInput}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        {(() => {
                          const preview = calculateTaxPreview(selectedCategoryForTax.id, previewSamplePrice);
                          
                          if (!preview.success) {
                            return (
                              <div style={styles.previewError}>
                                Error calculating preview: {preview.error}
                              </div>
                            );
                          }

                          if (preview.isExempt) {
                            return (
                              <div style={styles.previewResult}>
                                <div style={styles.previewTotal}>This category is tax exempt</div>
                              </div>
                            );
                          }

                          return (
                            <div style={styles.previewResult}>
                              <div style={styles.previewBreakdown}>
                                <div style={styles.previewLine}>
                                  <span>Item Price:</span>
                                  <span>${previewSamplePrice.toFixed(2)}</span>
                                </div>
                                
                                {Object.entries(preview.breakdown || {}).map(([taxName, amount]) => (
                                  <div key={taxName} style={styles.previewTaxLine}>
                                    <span>{taxName}:</span>
                                    <span>${amount.toFixed(2)}</span>
                                  </div>
                                ))}
                                
                                {Object.entries(preview.rebates || {}).map(([rebateName, amount]) => (
                                  <div key={rebateName} style={styles.previewRebateLine}>
                                    <span>{rebateName}:</span>
                                    <span>-${amount.toFixed(2)}</span>
                                  </div>
                                ))}
                                
                                <div style={styles.previewTotal}>
                                  <span>Total Tax:</span>
                                  <span>${preview.taxAmount.toFixed(2)} ({(preview.effectiveRate * 100).toFixed(2)}%)</span>
                                </div>
                                
                                <div style={styles.previewFinal}>
                                  <span>Final Price:</span>
                                  <span>${(previewSamplePrice + preview.taxAmount).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div style={styles.modalActions}>
                <button style={styles.cancelButton} onClick={closeTaxModal}>Cancel</button>
                <button style={styles.saveButton} onClick={saveTaxAssignments}>Save Tax Settings</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <POSAuthWrapper
      requireBusiness={true}
      requiredRoles={['manager', 'owner']}
      componentName="Category Management"
      onAuthReady={(authState) => {
        console.log('POSCategories: Auth ready with business:', authState.selectedBusinessId);
      }}
    >
      {renderContent()}
      
      {/* Add CSS for animations */}
      <style>
        {TavariStyles.keyframes.spin}
        {TavariStyles.keyframes.fadeIn}
      </style>
    </POSAuthWrapper>
  );
};

// Styles using TavariStyles foundation
const styles = {
  container: {
    ...TavariStyles.layout.container,
    padding: TavariStyles.spacing.xl,
    paddingTop: TavariStyles.spacing['5xl']
  },
  
  header: {
    marginBottom: TavariStyles.spacing['4xl'],
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.lg,
    alignItems: 'center'
  },
  
  title: {
    fontSize: TavariStyles.typography.fontSize['3xl'],
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    margin: 0
  },
  
  subtitle: {
    fontSize: TavariStyles.typography.fontSize.lg,
    color: TavariStyles.colors.gray600,
    margin: 0,
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  },
  
  errorBanner: {
    ...TavariStyles.components.banner.base,
    ...TavariStyles.components.banner.variants.error,
    marginBottom: TavariStyles.spacing.xl
  },
  
  loading: {
    ...TavariStyles.components.loading.container,
    height: '400px'
  },
  
  spinner: {
    ...TavariStyles.components.loading.spinner,
    marginBottom: TavariStyles.spacing.lg
  },
  
  addButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.primary,
    ...TavariStyles.components.button.sizes.lg
  },
  
  tableContainer: TavariStyles.components.table.container,
  table: TavariStyles.components.table.table,
  headerRow: TavariStyles.components.table.headerRow,
  th: TavariStyles.components.table.th,
  row: TavariStyles.components.table.row,
  td: TavariStyles.components.table.td,
  
  emptyCell: {
    padding: TavariStyles.spacing['6xl'],
    textAlign: 'center',
    color: TavariStyles.colors.gray500,
    fontStyle: 'italic',
    fontSize: TavariStyles.typography.fontSize.lg
  },
  
  categoryPreview: {
    ...TavariStyles.pos.categoryPreview,
    width: '48px',
    height: '48px'
  },
  
  previewEmoji: {
    fontSize: TavariStyles.typography.fontSize.xl
  },
  
  categoryName: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.sm,
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    color: TavariStyles.colors.gray800
  },
  
  nameEmoji: {
    fontSize: TavariStyles.typography.fontSize.lg
  },
  
  colorDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.md
  },
  
  colorSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: TavariStyles.borderRadius.sm,
    border: `1px solid ${TavariStyles.colors.gray300}`
  },
  
  colorName: {
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray500
  },
  
  colorSelect: TavariStyles.components.form.select,
  editColorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.sm
  },
  
  editEmojiSection: {
    display: 'flex',
    gap: TavariStyles.spacing.sm,
    alignItems: 'center',
    position: 'relative'
  },
  
  emojiDisplay: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${TavariStyles.colors.gray300}`,
    borderRadius: TavariStyles.borderRadius.md,
    cursor: 'pointer',
    fontSize: TavariStyles.typography.fontSize.xl,
    backgroundColor: TavariStyles.colors.white,
    transition: TavariStyles.transitions.normal
  },
  
  emojiInput: {
    ...TavariStyles.components.form.input,
    width: '60px',
    textAlign: 'center'
  },
  
  emojiPicker: {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 1000,
    backgroundColor: TavariStyles.colors.white,
    border: `1px solid ${TavariStyles.colors.gray300}`,
    borderRadius: TavariStyles.borderRadius.lg,
    padding: TavariStyles.spacing.md,
    boxShadow: TavariStyles.shadows.lg,
    maxWidth: '300px'
  },
  
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: TavariStyles.spacing.xs
  },
  
  emojiOption: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: TavariStyles.borderRadius.sm,
    fontSize: TavariStyles.typography.fontSize.lg,
    transition: TavariStyles.transitions.normal
  },
  
  input: TavariStyles.components.form.input,
  
  taxSettings: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.sm
  },
  
  taxSummary: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray700,
    maxWidth: '200px',
    lineHeight: TavariStyles.typography.lineHeight.normal
  },
  
  taxButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.warning,
    ...TavariStyles.components.button.sizes.sm
  },
  
  orderControls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: TavariStyles.spacing.xs
  },
  
  orderButton: {
    width: '28px',
    height: '28px',
    backgroundColor: TavariStyles.colors.gray50,
    border: `1px solid ${TavariStyles.colors.gray300}`,
    borderRadius: TavariStyles.borderRadius.sm,
    cursor: 'pointer',
    fontSize: TavariStyles.typography.fontSize.base,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: TavariStyles.transitions.normal
  },
  
  orderNumber: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray500,
    fontWeight: TavariStyles.typography.fontWeight.semibold
  },
  
  actions: {
    display: 'flex',
    gap: TavariStyles.spacing.xs
  },
  
  editActions: {
    display: 'flex',
    gap: TavariStyles.spacing.xs
  },
  
  editButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.secondary,
    ...TavariStyles.components.button.sizes.sm
  },
  
  deleteButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.danger,
    ...TavariStyles.components.button.sizes.sm
  },
  
  saveButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.success,
    ...TavariStyles.components.button.sizes.sm
  },
  
  cancelButton: {
    ...TavariStyles.components.button.base,
    backgroundColor: TavariStyles.colors.gray500,
    color: TavariStyles.colors.white,
    ...TavariStyles.components.button.sizes.sm
  },
  
  // Modal styles
  modal: TavariStyles.components.modal.overlay,
  modalContent: {
    ...TavariStyles.components.modal.content,
    maxWidth: '700px'
  },
  modalHeader: TavariStyles.components.modal.header,
  modalBody: TavariStyles.components.modal.body,
  modalActions: TavariStyles.components.modal.footer,
  
  modalTitle: {
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    margin: 0
  },
  
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: TavariStyles.typography.fontSize['2xl'],
    cursor: 'pointer',
    color: TavariStyles.colors.gray500,
    padding: TavariStyles.spacing.xs
  },
  
  taxDescription: {
    fontSize: TavariStyles.typography.fontSize.base,
    color: TavariStyles.colors.gray500,
    marginBottom: TavariStyles.spacing.lg,
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  },
  
  taxCategoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.sm
  },
  
  taxCategoryItem: {
    cursor: 'pointer',
    padding: TavariStyles.spacing.md,
    borderRadius: TavariStyles.borderRadius.md,
    border: `2px solid ${TavariStyles.colors.gray300}`,
    marginBottom: TavariStyles.spacing.sm,
    transition: TavariStyles.transitions.normal
  },
  
  taxCategoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.md
  },
  
  taxCategoryInfo: {
    flex: 1
  },
  
  taxCategoryName: {
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    color: TavariStyles.colors.gray800,
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.sm
  },
  
  taxCategoryRate: {
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray500,
    marginTop: '2px'
  },
  
  rebateBadge: {
    fontSize: TavariStyles.typography.fontSize.xs,
    backgroundColor: TavariStyles.colors.warning,
    color: TavariStyles.colors.white,
    padding: '2px 6px',
    borderRadius: TavariStyles.borderRadius.sm,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    textTransform: 'uppercase'
  },
  
  exemptionBadge: {
    fontSize: TavariStyles.typography.fontSize.xs,
    backgroundColor: TavariStyles.colors.danger,
    color: TavariStyles.colors.white,
    padding: '2px 6px',
    borderRadius: TavariStyles.borderRadius.sm,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    textTransform: 'uppercase'
  },
  
  primaryBadge: {
    fontSize: TavariStyles.typography.fontSize.xs,
    backgroundColor: TavariStyles.colors.success,
    color: TavariStyles.colors.white,
    padding: '2px 6px',
    borderRadius: TavariStyles.borderRadius.sm,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    textTransform: 'uppercase'
  },
  
  noTaxCategories: {
    textAlign: 'center',
    color: TavariStyles.colors.gray500,
    fontStyle: 'italic',
    padding: TavariStyles.spacing['5xl'],
    backgroundColor: TavariStyles.colors.gray50,
    borderRadius: TavariStyles.borderRadius.md
  },
  
  // Tax Preview Styles
  taxPreviewSection: {
    marginTop: TavariStyles.spacing.xl,
    padding: TavariStyles.spacing.lg,
    backgroundColor: TavariStyles.colors.gray50,
    borderRadius: TavariStyles.borderRadius.md,
    border: `1px solid ${TavariStyles.colors.gray200}`
  },
  
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TavariStyles.spacing.md
  },
  
  previewTitle: {
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    margin: 0
  },
  
  previewToggleButton: {
    ...TavariStyles.components.button.base,
    backgroundColor: '#6366f1',
    color: TavariStyles.colors.white,
    ...TavariStyles.components.button.sizes.sm
  },
  
  previewContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.md
  },
  
  previewInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.md
  },
  
  previewLabel: {
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    color: TavariStyles.colors.gray700,
    minWidth: '140px'
  },
  
  previewInput: {
    ...TavariStyles.components.form.input,
    width: '100px',
    padding: TavariStyles.spacing.sm
  },
  
  previewResult: {
    backgroundColor: TavariStyles.colors.white,
    padding: TavariStyles.spacing.md,
    borderRadius: TavariStyles.borderRadius.md,
    border: `1px solid ${TavariStyles.colors.gray300}`
  },
  
  previewBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.xs
  },
  
  previewLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.base,
    color: TavariStyles.colors.gray700
  },
  
  previewTaxLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.success,
    paddingLeft: TavariStyles.spacing.md
  },
  
  previewRebateLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.danger,
    paddingLeft: TavariStyles.spacing.md
  },
  
  previewTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    color: TavariStyles.colors.gray800,
    paddingTop: TavariStyles.spacing.xs,
    borderTop: `1px solid ${TavariStyles.colors.gray200}`
  },
  
  previewFinal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    paddingTop: TavariStyles.spacing.xs,
    borderTop: `2px solid ${TavariStyles.colors.gray700}`
  },
  
  previewError: {
    color: TavariStyles.colors.danger,
    fontStyle: 'italic',
    padding: TavariStyles.spacing.md,
    backgroundColor: TavariStyles.colors.errorBg,
    borderRadius: TavariStyles.borderRadius.sm
  }
};

export default POSCategories;