// src/components/CategoryModal.jsx
import React, { useState } from 'react';

const CategoryModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  taxCategories = [],
  colorOptions = []
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#008080');
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [selectedTaxRates, setSelectedTaxRates] = useState([]);
  const [selectedRebates, setSelectedRebates] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTaxRates, setShowTaxRates] = useState(false);
  const [showRebates, setShowRebates] = useState(false);

  // Common emojis for categories
  const commonEmojis = [
    '🍔', '🍕', '🍟', '🌭', '🥪', '🗞', '🥖', '🥗', '🍝', '🍜',
    '🍺', '🍷', '🥤', '☕', '🧊', '🍰', '🧁', '🍪', '🍩', '🍫',
    '🥘', '🍛', '🍲', '🍣', '🤍', '🥟', '🌮', '🌯', '🥙', '🍱',
    '🍎', '🥕', '🥬', '🧀', '🥔', '🍞', '🥖', '🥨', '🥯', '🥞'
  ];

  // UPDATED: Use category_type column for filtering
  const taxRatesList = taxCategories.filter(tax => 
    tax.category_type === 'tax' && tax.is_active
  );
  
  const displayRebates = taxCategories.filter(tax => 
    (tax.category_type === 'rebate' || tax.category_type === 'exemption') && tax.is_active
  );

  const handleTaxRateToggle = (taxId) => {
    setSelectedTaxRates(prev => 
      prev.includes(taxId)
        ? prev.filter(id => id !== taxId)
        : [...prev, taxId]
    );
  };

  const handleRebateToggle = (rebateId) => {
    setSelectedRebates(prev => 
      prev.includes(rebateId)
        ? prev.filter(id => id !== rebateId)
        : [...prev, rebateId]
    );
  };

  const handleSave = () => {
    if (!categoryName.trim()) {
      alert('Category name is required');
      return;
    }

    const categoryData = {
      name: categoryName.trim(),
      color: categoryColor,
      emoji: categoryEmoji.trim() || null,
      selectedTaxCategories: [...selectedTaxRates, ...selectedRebates]
    };

    onSave(categoryData);
    handleReset();
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCategoryName('');
    setCategoryColor('#008080');
    setCategoryEmoji('');
    setSelectedTaxRates([]);
    setSelectedRebates([]);
    setShowEmojiPicker(false);
    setShowTaxRates(false);
    setShowRebates(false);
  };

  const handleEmojiSelect = (emoji) => {
    setCategoryEmoji(emoji);
    setShowEmojiPicker(false);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3>Add New Category</h3>
          <button style={styles.closeButton} onClick={handleCancel}>×</button>
        </div>
        
        <div style={styles.modalBody}>
          <div style={styles.modalForm}>
            {/* Category Name */}
            <div style={styles.modalFormGroup}>
              <label style={styles.label}>Category Name *</label>
              <input
                type="text"
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                style={styles.input}
              />
            </div>

            {/* Color */}
            <div style={styles.modalFormGroup}>
              <label style={styles.label}>Color</label>
              <div style={styles.colorDropdownContainer}>
                <select
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  style={styles.colorSelect}
                >
                  {colorOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <div style={styles.colorPreview}>
                  <div 
                    style={{
                      ...styles.colorSwatch,
                      backgroundColor: categoryColor
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Icon */}
            <div style={styles.modalFormGroup}>
              <label style={styles.label}>Icon (Optional)</label>
              <div style={styles.emojiSection}>
                <div
                  style={styles.emojiDisplay}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {categoryEmoji || '🍔'}
                </div>
                <input
                  type="text"
                  placeholder="Type or select icon"
                  value={categoryEmoji}
                  onChange={(e) => setCategoryEmoji(e.target.value.slice(0, 2))}
                  style={styles.emojiInput}
                />
              </div>
              
              {showEmojiPicker && (
                <div style={styles.emojiPicker}>
                  <div style={styles.emojiGrid}>
                    {commonEmojis.map(emoji => (
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

            {/* Tax Rates - Expandable */}
            <div style={styles.modalFormGroup}>
              <div 
                style={styles.expandableHeader}
                onClick={() => setShowTaxRates(!showTaxRates)}
              >
                <label style={styles.label}>Tax Rates ({selectedTaxRates.length} selected)</label>
                <span style={styles.expandIcon}>
                  {showTaxRates ? '−' : '+'}
                </span>
              </div>
              
              {showTaxRates && (
                <div style={styles.taxList}>
                  {taxRatesList.map(taxRate => {
                    const isSelected = selectedTaxRates.includes(taxRate.id);
                    return (
                      <div 
                        key={taxRate.id} 
                        style={{
                          ...styles.taxItem,
                          backgroundColor: isSelected ? '#e0f2fe' : 'white',
                          border: isSelected ? '2px solid #0284c7' : '2px solid transparent'
                        }}
                        onClick={() => handleTaxRateToggle(taxRate.id)}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: '2px solid #008080',
                          backgroundColor: isSelected ? '#008080' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {isSelected ? '✓' : ''}
                        </div>
                        <span style={styles.taxName}>
                          {taxRate.name} - {(taxRate.rate * 100).toFixed(2)}%
                        </span>
                      </div>
                    );
                  })}
                  {taxRatesList.length === 0 && (
                    <div style={styles.noTax}>No tax rates configured</div>
                  )}
                </div>
              )}
            </div>

            {/* Rebates - Expandable */}
            <div style={styles.modalFormGroup}>
              <div 
                style={styles.expandableHeader}
                onClick={() => setShowRebates(!showRebates)}
              >
                <label style={styles.label}>Tax Rebates/Exemptions ({selectedRebates.length} selected)</label>
                <span style={styles.expandIcon}>
                  {showRebates ? '−' : '+'}
                </span>
              </div>
              
              {showRebates && (
                <div style={styles.taxList}>
                  {displayRebates.map(rebate => {
                    const isSelected = selectedRebates.includes(rebate.id);
                    return (
                      <div 
                        key={rebate.id} 
                        style={{
                          ...styles.taxItem,
                          backgroundColor: isSelected ? '#e0f2fe' : 'white',
                          border: isSelected ? '2px solid #0284c7' : '2px solid transparent'
                        }}
                        onClick={() => handleRebateToggle(rebate.id)}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: '2px solid #008080',
                          backgroundColor: isSelected ? '#008080' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {isSelected ? '✓' : ''}
                        </div>
                        <span style={styles.taxName}>
                          {rebate.name}{rebate.rate === 0 ? ' (Tax Exempt)' : ` - ${(rebate.rate * 100).toFixed(2)}%`}
                        </span>
                      </div>
                    );
                  })}
                  {displayRebates.length === 0 && (
                    <div style={styles.noTax}>No rebates configured</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div style={styles.modalActions}>
          <button style={styles.cancelButton} onClick={handleCancel}>Cancel</button>
          <button 
            style={styles.saveButton} 
            onClick={handleSave}
            disabled={!categoryName.trim()}
          >
            Save Category
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
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
    zIndex: 9999
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalBody: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    justifyContent: 'flex-end'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  modalFormGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative'
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit'
  },
  colorDropdownContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  colorSelect: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  colorPreview: {
    display: 'flex',
    alignItems: 'center'
  },
  colorSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid #d1d5db'
  },
  emojiSection: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  emojiDisplay: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    backgroundColor: 'white',
    transition: 'border-color 0.2s'
  },
  emojiInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  emojiPicker: {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 1000,
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxWidth: '300px'
  },
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '4px'
  },
  emojiOption: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '16px',
    transition: 'background-color 0.2s ease'
  },
  expandableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#f9fafb'
  },
  expandIcon: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#6b7280'
  },
  taxList: {
    border: '1px solid #d1d5db',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  taxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  taxName: {
    fontSize: '14px',
    color: '#374151'
  },
  noTax: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  saveButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  }
};

export default CategoryModal;