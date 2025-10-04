// components/POS/InventoryEditModal.jsx - Updated with variant logic removed
import React, { useState, useEffect } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import ModifierGroupSelectionModal from './ModifierGroupSelectionModal';
import StockTrackingModal from './StockTrackingModal';
import { 
  TaxOverridesModal, 
  RebateOverridesModal, 
  StationRoutingModal
} from '../InventoryModalComponents';

const InventoryEditModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  item,
  categories = [],
  taxCategories = [],
  categoryTaxAssignments = [],
  stations = [],
  businessId
}) => {
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemSKU, setItemSKU] = useState('');
  const [itemBarcode, setItemBarcode] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState(null);
  const [selectedTaxes, setSelectedTaxes] = useState([]);
  const [selectedRebates, setSelectedRebates] = useState([]);
  const [selectedStations, setSelectedStations] = useState([]);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState([]);
  const [stockTrackingConfig, setStockTrackingConfig] = useState({
    trackStock: false,
    stockQuantity: null,
    lowThreshold: null
  });
  
  // Modal visibility state
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showRebateModal, setShowRebateModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (item && isOpen) {
      console.log('InventoryEditModal initializing with item:', item);
      
      setItemName(item.name || '');
      setItemPrice(item.price || '');
      setItemCost(item.cost || '');
      setItemSKU(item.sku || '');
      setItemBarcode(item.barcode || '');
      setItemCategoryId(item.category_id);

      // Process tax overrides
      const taxOverrides = Array.isArray(item.item_tax_overrides) ? item.item_tax_overrides : [];
      const taxes = taxOverrides.filter(id => {
        const tax = taxCategories.find(t => t.id === id);
        return tax && tax.category_type === 'tax';
      });
      const rebates = taxOverrides.filter(id => {
        const tax = taxCategories.find(t => t.id === id);
        return tax && (tax.category_type === 'rebate' || tax.category_type === 'exemption');
      });

      setSelectedTaxes(taxes);
      setSelectedRebates(rebates);
      setSelectedStations(Array.isArray(item.station_ids) ? item.station_ids : []);
      
      // Process modifier groups - get IDs from the modifier groups array
      const modifierGroupIds = item.modifier_groups?.map(mg => mg.id) || [];
      setSelectedModifierGroups(modifierGroupIds);
      
      // Set stock tracking configuration - USE CALCULATED STOCK
      const currentStock = item.calculated_stock ?? item.stock_quantity ?? 0;
      setStockTrackingConfig({
        trackStock: item.track_stock || false,
        stockQuantity: currentStock,
        lowThreshold: item.low_stock_threshold || 5
      });
      
      console.log('Stock tracking config set:', {
        trackStock: item.track_stock,
        stockQuantity: currentStock,
        calculatedStock: item.calculated_stock,
        storedStock: item.stock_quantity,
        lowThreshold: item.low_stock_threshold
      });
      
      setError(null);
    }
  }, [item, isOpen, taxCategories]);

  const handleSave = async () => {
    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }
    if (!itemPrice || parseFloat(itemPrice) < 0) {
      setError('Valid price is required');
      return;
    }
    
    setError(null);
    setSaving(true);

    try {
      const allTaxOverrides = [...selectedTaxes, ...selectedRebates];
      const updatedItem = {
        ...item,
        name: itemName.trim(),
        price: parseFloat(itemPrice) || 0,
        cost: parseFloat(itemCost) || 0,
        sku: itemSKU.trim() || null,
        barcode: itemBarcode.trim() || null,
        category_id: itemCategoryId || null,
        station_ids: selectedStations.length > 0 ? selectedStations : null,
        track_stock: stockTrackingConfig.trackStock,
        stock_quantity: stockTrackingConfig.trackStock ? stockTrackingConfig.stockQuantity : null,
        low_stock_threshold: stockTrackingConfig.trackStock ? stockTrackingConfig.lowThreshold : null,
        item_tax_overrides: allTaxOverrides.length > 0 ? allTaxOverrides : null,
        modifier_groups: selectedModifierGroups.length > 0 ? selectedModifierGroups : []
      };
      
      console.log('Saving updated item:', updatedItem);
      await onSave(updatedItem);
    } catch (err) {
      setError('Failed to save changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStockTrackingSave = (stockConfig) => {
    console.log('Stock tracking config updated:', stockConfig);
    setStockTrackingConfig({
      trackStock: stockConfig.trackStock,
      stockQuantity: stockConfig.stockQuantity,
      lowThreshold: stockConfig.lowThreshold
    });
  };

  if (!isOpen || !item) return null;

  const styles = {
    overlay: {
      ...TavariStyles.components.modal.overlay
    },
    modal: {
      ...TavariStyles.components.modal.content,
      maxWidth: '800px',
      width: '90%',
      maxHeight: '90vh'
    },
    header: {
      ...TavariStyles.components.modal.header
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: '28px',
      cursor: 'pointer',
      color: TavariStyles.colors.gray500,
      padding: '4px'
    },
    content: {
      ...TavariStyles.components.modal.body
    },
    errorBanner: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.xl
    },
    section: {
      marginBottom: TavariStyles.spacing['3xl']
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.lg,
      paddingBottom: TavariStyles.spacing.sm,
      borderBottom: `2px solid ${TavariStyles.colors.gray200}`
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: TavariStyles.spacing.lg
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      ...TavariStyles.components.form.label
    },
    input: {
      ...TavariStyles.components.form.input
    },
    select: {
      ...TavariStyles.components.form.select
    },
    configButtons: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: TavariStyles.spacing.md
    },
    configButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.md,
      color: TavariStyles.colors.white,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      textAlign: 'center'
    },
    footer: {
      ...TavariStyles.components.modal.footer
    },
    cancelButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.md
    },
    saveButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.success,
      ...TavariStyles.components.button.sizes.md
    },
    saveButtonDisabled: {
      backgroundColor: TavariStyles.colors.gray300,
      color: TavariStyles.colors.gray500,
      cursor: 'not-allowed'
    },
    modifierPreview: {
      backgroundColor: TavariStyles.colors.gray50,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      borderRadius: TavariStyles.borderRadius.md,
      padding: TavariStyles.spacing.md,
      marginTop: TavariStyles.spacing.md
    },
    modifierPreviewTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm
    },
    modifierList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: TavariStyles.spacing.sm
    },
    modifierTag: {
      fontSize: TavariStyles.typography.fontSize.xs,
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    stockPreview: {
      backgroundColor: TavariStyles.colors.successBg,
      border: `1px solid ${TavariStyles.colors.success}`,
      borderRadius: TavariStyles.borderRadius.md,
      padding: TavariStyles.spacing.md,
      marginTop: TavariStyles.spacing.md
    },
    stockPreviewTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.successText,
      marginBottom: TavariStyles.spacing.sm
    },
    stockInfo: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.successText
    }
  };

  // Calculate current stock for display - use calculated stock if available
  const displayStock = item.calculated_stock ?? item.stock_quantity ?? 0;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Edit Item: {item.name}</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Basic Information</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Item Name *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  style={styles.input}
                  disabled={saving}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Price *</label>
                <input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  style={styles.input}
                  step="0.01"
                  min="0"
                  disabled={saving}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Cost</label>
                <input
                  type="number"
                  value={itemCost}
                  onChange={(e) => setItemCost(e.target.value)}
                  style={styles.input}
                  step="0.01"
                  min="0"
                  disabled={saving}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>SKU</label>
                <input
                  type="text"
                  value={itemSKU}
                  onChange={(e) => setItemSKU(e.target.value)}
                  style={styles.input}
                  disabled={saving}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Barcode</label>
                <input
                  type="text"
                  value={itemBarcode}
                  onChange={(e) => setItemBarcode(e.target.value)}
                  style={styles.input}
                  disabled={saving}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select
                  value={itemCategoryId || ''}
                  onChange={(e) => setItemCategoryId(e.target.value || null)}
                  style={styles.select}
                  disabled={saving}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Current Modifier Groups Preview */}
          {selectedModifierGroups.length > 0 && (
            <div style={styles.modifierPreview}>
              <div style={styles.modifierPreviewTitle}>
                Current Modifier Groups ({selectedModifierGroups.length}):
              </div>
              <div style={styles.modifierList}>
                {item.modifier_groups?.map(mg => (
                  <span key={mg.id} style={styles.modifierTag}>
                    {mg.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Current Stock Tracking Preview - FIXED TO SHOW CALCULATED STOCK */}
          {stockTrackingConfig.trackStock && (
            <div style={styles.stockPreview}>
              <div style={styles.stockPreviewTitle}>
                Stock Tracking Enabled
              </div>
              <div style={styles.stockInfo}>
                Current Stock: {displayStock} • 
                Low Threshold: {stockTrackingConfig.lowThreshold || 5}
              </div>
            </div>
          )}

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Configuration</h3>
            <div style={styles.configButtons}>
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: selectedTaxes.length > 0 ? TavariStyles.colors.info : TavariStyles.colors.gray500
                }}
                onClick={() => setShowTaxModal(true)}
                disabled={saving}
              >
                Tax Overrides ({selectedTaxes.length})
              </button>
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: selectedRebates.length > 0 ? TavariStyles.colors.warning : TavariStyles.colors.gray500
                }}
                onClick={() => setShowRebateModal(true)}
                disabled={saving}
              >
                Rebate Overrides ({selectedRebates.length})
              </button>
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: selectedStations.length > 0 ? TavariStyles.colors.success : TavariStyles.colors.gray500
                }}
                onClick={() => setShowStationModal(true)}
                disabled={saving}
              >
                Station Routing ({selectedStations.length})
              </button>
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: stockTrackingConfig.trackStock ? TavariStyles.colors.secondary : TavariStyles.colors.gray500
                }}
                onClick={() => setShowStockModal(true)}
                disabled={saving}
              >
                Stock Tracking ({stockTrackingConfig.trackStock ? 'ON' : 'OFF'})
              </button>
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: selectedModifierGroups.length > 0 ? TavariStyles.colors.primary : TavariStyles.colors.gray500
                }}
                onClick={() => setShowModifierModal(true)}
                disabled={saving}
              >
                Modifier Groups ({selectedModifierGroups.length})
              </button>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button 
            style={styles.cancelButton} 
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            style={{
              ...styles.saveButton,
              ...(saving ? styles.saveButtonDisabled : {})
            }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Configuration Modals */}
        <TaxOverridesModal
          isOpen={showTaxModal}
          onClose={() => setShowTaxModal(false)}
          onSave={setSelectedTaxes}
          taxCategories={taxCategories}
          selectedTaxes={selectedTaxes}
        />
        <RebateOverridesModal
          isOpen={showRebateModal}
          onClose={() => setShowRebateModal(false)}
          onSave={setSelectedRebates}
          taxCategories={taxCategories}
          selectedRebates={selectedRebates}
        />
        <StationRoutingModal
          isOpen={showStationModal}
          onClose={() => setShowStationModal(false)}
          onSave={setSelectedStations}
          stations={stations}
          selectedStations={selectedStations}
        />
        <StockTrackingModal
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          onSave={handleStockTrackingSave}
          trackStock={stockTrackingConfig.trackStock}
          stockQuantity={displayStock} // FIXED: Pass calculated stock
          lowThreshold={stockTrackingConfig.lowThreshold}
          itemName={itemName || "this item"}
          itemId={item.id}
          businessId={businessId}
        />
        <ModifierGroupSelectionModal
          isOpen={showModifierModal}
          onClose={() => setShowModifierModal(false)}
          onSave={setSelectedModifierGroups}
          businessId={businessId}
          selectedModifierGroups={selectedModifierGroups}
          itemName={itemName || "this item"}
        />
      </div>
    </div>
  );
};

export default InventoryEditModal;