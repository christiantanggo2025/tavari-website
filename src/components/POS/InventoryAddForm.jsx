// components/POS/InventoryAddForm.jsx - Add new item form component
import React, { useState } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import ModifierGroupSelectionModal from './ModifierGroupSelectionModal';
import { 
  TaxOverridesModal, 
  RebateOverridesModal, 
  StationRoutingModal, 
  StockTrackingModal 
} from '../InventoryModalComponents';

const InventoryAddForm = ({
  categories = [],
  taxCalc,
  stations = [],
  businessId,
  onAddItem,
  error,
  expanded,
  onToggleExpanded
}) => {
  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemSKU, setNewItemSKU] = useState('');
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState(null);

  // Configuration state
  const [selectedTaxes, setSelectedTaxes] = useState([]);
  const [selectedRebates, setSelectedRebates] = useState([]);
  const [selectedStations, setSelectedStations] = useState([]);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState([]);
  const [stockTrackingConfig, setStockTrackingConfig] = useState({
    trackStock: false,
    stockQuantity: null,
    lowThreshold: 5
  });

  // Modal visibility state
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showRebateModal, setShowRebateModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);

  const resetForm = () => {
    setNewItemName('');
    setNewItemPrice('');
    setNewItemCost('');
    setNewItemSKU('');
    setNewItemBarcode('');
    setNewItemCategoryId(null);
    setSelectedTaxes([]);
    setSelectedRebates([]);
    setSelectedStations([]);
    setSelectedModifierGroups([]);
    setStockTrackingConfig({
      trackStock: false,
      stockQuantity: null,
      lowThreshold: 5
    });
  };

  const handleAddItem = async () => {
    const allTaxOverrides = [...selectedTaxes, ...selectedRebates];
    const itemData = {
      name: newItemName.trim(),
      price: parseFloat(newItemPrice) || 0,
      cost: parseFloat(newItemCost) || 0,
      sku: newItemSKU.trim() || null,
      barcode: newItemBarcode.trim() || null,
      category_id: newItemCategoryId || null,
      station_ids: selectedStations.length > 0 ? selectedStations : null,
      track_stock: stockTrackingConfig.trackStock,
      stock_quantity: stockTrackingConfig.trackStock ? stockTrackingConfig.stockQuantity : null,
      low_stock_threshold: stockTrackingConfig.trackStock ? stockTrackingConfig.lowThreshold : null,
      item_tax_overrides: allTaxOverrides.length > 0 ? allTaxOverrides : null,
      modifier_groups: selectedModifierGroups.length > 0 ? selectedModifierGroups : null
    };

    const success = await onAddItem(itemData);
    if (success) {
      resetForm();
    }
  };

  const styles = {
    addSection: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.xl,
      border: `2px solid ${TavariStyles.colors.primary}`,
      transition: 'all 0.3s ease'
    },
    addSectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.lg,
      cursor: 'pointer',
      userSelect: 'none'
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    expandButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.ghost,
      ...TavariStyles.components.button.sizes.sm,
      padding: TavariStyles.spacing.sm,
      minWidth: 'auto'
    },
    addSectionContent: {
      overflow: 'hidden',
      transition: 'max-height 0.3s ease, opacity 0.3s ease',
      maxHeight: expanded ? '2000px' : '0',
      opacity: expanded ? 1 : 0
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.lg
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.lg,
      alignItems: 'end'
    },
    input: {
      ...TavariStyles.components.form.input
    },
    select: {
      ...TavariStyles.components.form.select
    },
    taxPreview: {
      backgroundColor: TavariStyles.colors.infoBg,
      border: `2px solid ${TavariStyles.colors.info}`,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.xl,
      marginTop: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.sm
    },
    taxPreviewTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.infoText,
      marginBottom: TavariStyles.spacing.md,
      margin: 0
    },
    configButtons: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: TavariStyles.spacing.lg,
      marginTop: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.xl
    },
    configButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.md,
      color: TavariStyles.colors.white,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      textAlign: 'center'
    },
    addButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg,
      justifySelf: 'start'
    }
  };

  return (
    <div style={styles.addSection}>
      <div 
        style={styles.addSectionHeader}
        onClick={onToggleExpanded}
      >
        <h3 style={styles.sectionTitle}>Add New Item</h3>
        <button 
          style={styles.expandButton}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpanded();
          }}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>
      
      <div style={styles.addSectionContent}>
        <div style={styles.form}>
          <div style={styles.formRow}>
            <input
              type="text"
              placeholder="Item name *"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="Price *"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              style={styles.input}
              step="0.01"
              min="0"
            />
            <input
              type="number"
              placeholder="Cost"
              value={newItemCost}
              onChange={(e) => setNewItemCost(e.target.value)}
              style={styles.input}
              step="0.01"
              min="0"
            />
          </div>
          
          <div style={styles.formRow}>
            <input
              type="text"
              placeholder="SKU"
              value={newItemSKU}
              onChange={(e) => setNewItemSKU(e.target.value)}
              style={styles.input}
            />
            <input
              type="text"
              placeholder="Barcode"
              value={newItemBarcode}
              onChange={(e) => setNewItemBarcode(e.target.value)}
              style={styles.input}
            />
            <select
              value={newItemCategoryId || ''}
              onChange={(e) => setNewItemCategoryId(e.target.value || null)}
              style={styles.select}
            >
              <option value="">-- Select Category --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Category Tax Preview */}
          {newItemCategoryId && (
            <div style={styles.taxPreview}>
              <h4 style={styles.taxPreviewTitle}>Default Tax Settings for This Category</h4>
              {/* Tax preview content here */}
            </div>
          )}

          {/* Configuration Buttons */}
          <div style={styles.configButtons}>
            <button
              style={{
                ...styles.configButton,
                backgroundColor: selectedTaxes.length > 0 ? TavariStyles.colors.info : TavariStyles.colors.gray500
              }}
              onClick={() => setShowTaxModal(true)}
            >
              Tax Overrides ({selectedTaxes.length})
            </button>
            
            <button
              style={{
                ...styles.configButton,
                backgroundColor: selectedRebates.length > 0 ? TavariStyles.colors.warning : TavariStyles.colors.gray500
              }}
              onClick={() => setShowRebateModal(true)}
            >
              Rebate Overrides ({selectedRebates.length})
            </button>
            
            <button
              style={{
                ...styles.configButton,
                backgroundColor: selectedStations.length > 0 ? TavariStyles.colors.success : TavariStyles.colors.gray500
              }}
              onClick={() => setShowStationModal(true)}
            >
              Station Routing ({selectedStations.length})
            </button>
            
            <button
              style={{
                ...styles.configButton,
                backgroundColor: stockTrackingConfig.trackStock ? TavariStyles.colors.secondary : TavariStyles.colors.gray500
              }}
              onClick={() => setShowStockModal(true)}
            >
              Stock Tracking ({stockTrackingConfig.trackStock ? 'ON' : 'OFF'})
            </button>

            <button
              style={{
                ...styles.configButton,
                backgroundColor: selectedModifierGroups.length > 0 ? TavariStyles.colors.primary : TavariStyles.colors.gray500
              }}
              onClick={() => setShowModifierModal(true)}
            >
              Modifier Groups ({selectedModifierGroups.length})
            </button>
          </div>

          <button onClick={handleAddItem} style={styles.addButton}>
            Add Item
          </button>
        </div>
      </div>

      {/* Configuration Modals */}
      <TaxOverridesModal
        isOpen={showTaxModal}
        onClose={() => setShowTaxModal(false)}
        onSave={setSelectedTaxes}
        taxCategories={taxCalc.taxCategories}
        selectedTaxes={selectedTaxes}
      />

      <RebateOverridesModal
        isOpen={showRebateModal}
        onClose={() => setShowRebateModal(false)}
        onSave={setSelectedRebates}
        taxCategories={taxCalc.taxCategories}
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
        onSave={setStockTrackingConfig}
        trackStock={stockTrackingConfig.trackStock}
        stockQuantity={stockTrackingConfig.stockQuantity}
        lowThreshold={stockTrackingConfig.lowThreshold}
        itemName={newItemName || "this item"}
      />

      <ModifierGroupSelectionModal
        isOpen={showModifierModal}
        onClose={() => setShowModifierModal(false)}
        onSave={setSelectedModifierGroups}
        businessId={businessId}
        selectedModifierGroups={selectedModifierGroups}
        itemName={newItemName || "new item"}
      />
    </div>
  );
};

export default InventoryAddForm;