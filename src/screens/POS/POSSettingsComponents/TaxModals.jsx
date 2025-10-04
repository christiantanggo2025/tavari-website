// src/screens/POS/POSSettingsComponents/TaxModals.jsx
import React from 'react';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

export const AddTaxCategoryModal = ({ newTaxCategory, setNewTaxCategory, onSave, onClose }) => {
  const handleSave = () => {
    if (!newTaxCategory.name.trim()) {
      alert('Please enter a tax category name');
      return;
    }
    if (newTaxCategory.rate <= 0) {
      alert('Tax rate must be greater than 0%');
      return;
    }
    onSave();
  };

  const handleRateChange = (value) => {
    setNewTaxCategory(prev => ({ ...prev, rate: value / 100 }));
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3>Add Primary Tax Category</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.modalBody}>
          <div style={styles.setting}>
            <label style={styles.label}>Tax Name:</label>
            <input
              type="text"
              value={newTaxCategory.name}
              onChange={(e) => setNewTaxCategory(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., GST, PST, HST"
              style={styles.modalInput}
            />
          </div>
          
          <div style={styles.setting}>
            <label style={styles.label}>Tax Rate:</label>
            <div style={styles.inputGroup}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={(newTaxCategory.rate * 100).toFixed(2)}
                onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
                style={styles.modalInput}
              />
              <span>%</span>
            </div>
            <div style={styles.settingDescription}>
              Enter as percentage (e.g., 5 for 5%)
            </div>
          </div>
        </div>
        
        <div style={styles.modalActions}>
          <button style={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button style={styles.saveButton} onClick={handleSave}>Add Tax</button>
        </div>
      </div>
    </div>
  );
};

export const AddRebateModal = ({ newTaxCategory, setNewTaxCategory, taxCategories, onSave, onClose }) => {
  const primaryTaxes = taxCategories || [];
  
  const handleSave = () => {
    if (!newTaxCategory.name.trim()) {
      alert('Please enter a rebate name');
      return;
    }
    if (!newTaxCategory.rebate_affects || newTaxCategory.rebate_affects.length === 0) {
      alert('Please select which taxes this rebate affects');
      return;
    }
    onSave();
  };

  const handleTaxAffectsChange = (taxId, checked) => {
    setNewTaxCategory(prev => ({
      ...prev,
      rebate_affects: checked
        ? [...(prev.rebate_affects || []), taxId]
        : (prev.rebate_affects || []).filter(id => id !== taxId)
    }));
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3>Add Tax Rebate</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.modalBody}>
          <div style={styles.setting}>
            <label style={styles.label}>Rebate Name:</label>
            <input
              type="text"
              value={newTaxCategory.name}
              onChange={(e) => setNewTaxCategory(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., GST Holiday 2024-2025, Native Status Exemption"
              style={styles.modalInput}
            />
          </div>
          
          <div style={styles.setting}>
            <label style={styles.label}>Which taxes does this rebate affect?</label>
            <div style={styles.verticalCheckboxGroup}>
              <TavariCheckbox
                checked={(newTaxCategory.rebate_affects || []).includes('all')}
                onChange={(checked) => handleTaxAffectsChange('all', checked)}
                label="All taxes (zero-rated)"
                id="rebate-all-taxes"
              />
              
              {primaryTaxes.map(tax => (
                <TavariCheckbox
                  key={tax.id}
                  checked={(newTaxCategory.rebate_affects || []).includes(tax.id)}
                  onChange={(checked) => handleTaxAffectsChange(tax.id, checked)}
                  label={`${tax.name} (${(tax.rate * 100).toFixed(2)}%)`}
                  id={`rebate-tax-${tax.id}`}
                />
              ))}
            </div>
            <div style={styles.settingDescription}>
              Select which specific taxes should be removed by this rebate.
            </div>
          </div>
          
          <div style={styles.setting}>
            <label style={styles.label}>Valid Date Range (optional):</label>
            <div style={styles.dateRangeGroup}>
              <div style={styles.dateField}>
                <label style={styles.dateLabel}>Start Date:</label>
                <input
                  type="date"
                  value={newTaxCategory.valid_from || ''}
                  onChange={(e) => setNewTaxCategory(prev => ({ ...prev, valid_from: e.target.value || null }))}
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.dateField}>
                <label style={styles.dateLabel}>End Date:</label>
                <input
                  type="date"
                  value={newTaxCategory.valid_to || ''}
                  onChange={(e) => setNewTaxCategory(prev => ({ ...prev, valid_to: e.target.value || null }))}
                  style={styles.modalInput}
                />
              </div>
            </div>
            <div style={styles.settingDescription}>
              Set dates for temporary rebates like tax holidays. Leave empty for permanent rebates.
            </div>
          </div>
          
          <div style={styles.setting}>
            <label style={styles.label}>Minimum Amount (optional):</label>
            <div style={styles.inputGroup}>
              <span>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newTaxCategory.minimum_amount}
                onChange={(e) => setNewTaxCategory(prev => ({ ...prev, minimum_amount: parseFloat(e.target.value) || 0 }))}
                style={styles.modalInput}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div style={styles.setting}>
            <label style={styles.label}>Maximum Amount (optional):</label>
            <div style={styles.inputGroup}>
              <span>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newTaxCategory.maximum_amount || ''}
                onChange={(e) => setNewTaxCategory(prev => ({ ...prev, maximum_amount: e.target.value ? parseFloat(e.target.value) : null }))}
                style={styles.modalInput}
                placeholder="No limit"
              />
            </div>
            <div style={styles.settingDescription}>
              Leave empty for no upper limit.
            </div>
          </div>
        </div>
        
        <div style={styles.modalActions}>
          <button style={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button style={styles.saveButton} onClick={handleSave}>Add Rebate</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modal: {
    ...TavariStyles.components.modal.overlay
  },
  modalContent: {
    ...TavariStyles.components.modal.content,
    maxWidth: '500px'
  },
  modalHeader: {
    ...TavariStyles.components.modal.header
  },
  modalBody: {
    ...TavariStyles.components.modal.body
  },
  modalActions: {
    ...TavariStyles.components.modal.footer
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: TavariStyles.colors.gray600
  },
  setting: {
    marginBottom: TavariStyles.spacing.xl
  },
  label: {
    ...TavariStyles.components.form.label
  },
  modalInput: {
    ...TavariStyles.components.form.input,
    width: '100%'
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.sm
  },
  settingDescription: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray600,
    marginTop: TavariStyles.spacing.xs,
    fontStyle: 'italic'
  },
  verticalCheckboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.md,
    marginTop: TavariStyles.spacing.md
  },
  dateRangeGroup: {
    display: 'flex',
    gap: TavariStyles.spacing.lg,
    marginTop: TavariStyles.spacing.sm
  },
  dateField: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  dateLabel: {
    fontSize: TavariStyles.typography.fontSize.xs,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray700,
    marginBottom: TavariStyles.spacing.xs
  },
  cancelButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.secondary,
    flex: 1
  },
  saveButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.success
  }
};