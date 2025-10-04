// src/components/InventoryEditModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  TaxOverridesModal, 
  RebateOverridesModal, 
  StationRoutingModal, 
  StockTrackingModal 
} from './InventoryModalComponents';

const InventoryEditModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  item,
  categories,
  taxCategories,
  categoryTaxAssignments,
  stations 
}) => {
  // Basic item info state
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemSKU, setItemSKU] = useState('');
  const [itemBarcode, setItemBarcode] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState(null);

  // Configuration state
  const [selectedTaxes, setSelectedTaxes] = useState([]);
  const [selectedRebates, setSelectedRebates] = useState([]);
  const [selectedStations, setSelectedStations] = useState([]);
  const [stockTrackingConfig, setStockTrackingConfig] = useState({
    trackStock: false,
    stockQuantity: null,
    lowThreshold: null
  });

  // Sub-modal visibility state
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showRebateModal, setShowRebateModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Error state
  const [error, setError] = useState(null);

  // Initialize form when item changes
  useEffect(() => {
    if (item && isOpen) {
      setItemName(item.name || '');
      setItemPrice(item.price || '');
      setItemCost(item.cost || '');
      setItemSKU(item.sku || '');
      setItemBarcode(item.barcode || '');
      setItemCategoryId(item.category_id);

      // Parse existing tax overrides
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
      setStockTrackingConfig({
        trackStock: item.track_stock || false,
        stockQuantity: item.stock_quantity || null,
        lowThreshold: item.low_stock_threshold || 5
      });
    }
  }, [item, isOpen, taxCategories]);

  // Get tax categories that apply to a specific category
  const getCategoryTaxes = (categoryId) => {
    return categoryTaxAssignments.filter(assignment => assignment.category_id === categoryId);
  };

  // Modal handlers
  const handleTaxSave = (selectedTaxes) => {
    setSelectedTaxes(selectedTaxes);
  };

  const handleRebateSave = (selectedRebates) => {
    setSelectedRebates(selectedRebates);
  };

  const handleStationSave = (selectedStations) => {
    setSelectedStations(selectedStations);
  };

  const handleStockSave = (stockConfig) => {
    setStockTrackingConfig(stockConfig);
  };

  const handleSave = () => {
    // Validation
    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }

    if (!itemPrice || parseFloat(itemPrice) < 0) {
      setError('Valid price is required');
      return;
    }

    setError(null);

    // Combine tax overrides with rebates
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
      item_tax_overrides: allTaxOverrides.length > 0 ? allTaxOverrides : null
    };

    onSave(updatedItem);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Edit Item: {item.name}</h2>
          <button style={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <div style={styles.content}>
          {error && (
            <div style={styles.errorBanner}>{error}</div>
          )}

          {/* Basic Information Section */}
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
                  placeholder="Enter item name"
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
                  placeholder="0.00"
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
                  placeholder="0.00"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>SKU</label>
                <input
                  type="text"
                  value={itemSKU}
                  onChange={(e) => setItemSKU(e.target.value)}
                  style={styles.input}
                  placeholder="Product SKU"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Barcode</label>
                <input
                  type="text"
                  value={itemBarcode}
                  onChange={(e) => setItemBarcode(e.target.value)}
                  style={styles.input}
                  placeholder="Product barcode"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select
                  value={itemCategoryId || ''}
                  onChange={(e) => setItemCategoryId(e.target.value || null)}
                  style={styles.select}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category Tax Preview */}
          {itemCategoryId && (
            <div style={styles.taxPreview}>
              <h4 style={styles.taxPreviewTitle}>Default Tax Settings for This Category:</h4>
              <div style={styles.taxPreviewContent}>
                {(() => {
                  const categoryTaxes = getCategoryTaxes(itemCategoryId);
                  const categoryName = categories.find(c => c.id === itemCategoryId)?.name || 'Selected Category';
                  
                  if (categoryTaxes.length === 0) {
                    return (
                      <div style={styles.taxPreviewText}>
                        No default taxes configured for "{categoryName}". Items in this category will have no automatic tax applications.
                      </div>
                    );
                  }
                  
                  const taxes = categoryTaxes.filter(a => a.pos_tax_categories.category_type === 'tax');
                  const rebates = categoryTaxes.filter(a => 
                    a.pos_tax_categories.category_type === 'rebate' || 
                    a.pos_tax_categories.category_type === 'exemption'
                  );
                  
                  return (
                    <div style={styles.taxBreakdown}>
                      {taxes.length > 0 && (
                        <div style={styles.taxGroup}>
                          <span style={styles.taxGroupLabel}>Taxes Applied:</span>
                          <div style={styles.taxItems}>
                            {taxes.map(assignment => (
                              <span key={assignment.id} style={styles.taxItem}>
                                {assignment.pos_tax_categories.name} ({(assignment.pos_tax_categories.rate * 100).toFixed(1)}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {rebates.length > 0 && (
                        <div style={styles.taxGroup}>
                          <span style={styles.taxGroupLabel}>Rebates/Exemptions:</span>
                          <div style={styles.taxItems}>
                            {rebates.map(assignment => (
                              <span key={assignment.id} style={styles.rebateItem}>
                                {assignment.pos_tax_categories.name} 
                                {assignment.pos_tax_categories.rate === 0 ? ' (Tax Exempt)' : ` (${(assignment.pos_tax_categories.rate * 100).toFixed(1)}% rebate)`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div style={styles.taxNote}>
                        You can override these defaults using the configuration buttons below.
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Configuration Section */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Configuration</h3>
            <div style={styles.configButtons}>
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: selectedTaxes.length > 0 ? '#0284c7' : '#6b7280'
                }}
                onClick={() => setShowTaxModal(true)}
              >
                Tax Overrides ({selectedTaxes.length})
              </button>
              
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: selectedRebates.length > 0 ? '#f59e0b' : '#6b7280'
                }}
                onClick={() => setShowRebateModal(true)}
              >
                Rebate Overrides ({selectedRebates.length})
              </button>
              
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: selectedStations.length > 0 ? '#059669' : '#6b7280'
                }}
                onClick={() => setShowStationModal(true)}
              >
                Station Routing ({selectedStations.length})
              </button>
              
              <button
                style={{
                  ...styles.configButton,
                  backgroundColor: stockTrackingConfig.trackStock ? '#7c3aed' : '#6b7280'
                }}
                onClick={() => setShowStockModal(true)}
              >
                Stock Tracking ({stockTrackingConfig.trackStock ? 'ON' : 'OFF'})
              </button>
            </div>
          </div>

          {/* Current Configuration Summary */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Current Configuration Summary</h3>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Tax Overrides:</span>
                <span style={styles.summaryValue}>
                  {selectedTaxes.length > 0 
                    ? selectedTaxes.map(id => {
                        const tax = taxCategories.find(t => t.id === id);
                        return tax ? `${tax.name} (${(tax.rate * 100).toFixed(1)}%)` : 'Unknown';
                      }).join(', ')
                    : 'None'
                  }
                </span>
              </div>

              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Rebate Overrides:</span>
                <span style={styles.summaryValue}>
                  {selectedRebates.length > 0 
                    ? selectedRebates.map(id => {
                        const rebate = taxCategories.find(t => t.id === id);
                        return rebate ? `${rebate.name}${rebate.rate === 0 ? ' (Exempt)' : ` (${(rebate.rate * 100).toFixed(1)}%)`}` : 'Unknown';
                      }).join(', ')
                    : 'None'
                  }
                </span>
              </div>

              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Station Routing:</span>
                <span style={styles.summaryValue}>
                  {selectedStations.length > 0 
                    ? selectedStations.map(id => {
                        const station = stations.find(s => s.id === id);
                        return station ? station.name : 'Unknown';
                      }).join(', ')
                    : 'No routing'
                  }
                </span>
              </div>

              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Stock Tracking:</span>
                <span style={styles.summaryValue}>
                  {stockTrackingConfig.trackStock 
                    ? `Enabled (Qty: ${stockTrackingConfig.stockQuantity || 0}, Alert: ${stockTrackingConfig.lowThreshold || 5})`
                    : 'Disabled'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={handleClose}>
            Cancel
          </button>
          <button style={styles.saveButton} onClick={handleSave}>
            Save Changes
          </button>
        </div>

        {/* Sub-modals */}
        <TaxOverridesModal
          isOpen={showTaxModal}
          onClose={() => setShowTaxModal(false)}
          onSave={handleTaxSave}
          taxCategories={taxCategories}
          selectedTaxes={selectedTaxes}
        />

        <RebateOverridesModal
          isOpen={showRebateModal}
          onClose={() => setShowRebateModal(false)}
          onSave={handleRebateSave}
          taxCategories={taxCategories}
          selectedRebates={selectedRebates}
        />

        <StationRoutingModal
          isOpen={showStationModal}
          onClose={() => setShowStationModal(false)}
          onSave={handleStationSave}
          stations={stations}
          selectedStations={selectedStations}
        />

        <StockTrackingModal
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          onSave={handleStockSave}
          trackStock={stockTrackingConfig.trackStock}
          stockQuantity={stockTrackingConfig.stockQuantity}
          lowThreshold={stockTrackingConfig.lowThreshold}
          itemName={itemName || "this item"}
        />
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 0 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontWeight: '600',
    border: '1px solid #fecaca'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e5e7eb'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  select: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none'
  },
  taxPreview: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #0284c7',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px'
  },
  taxPreviewTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '12px',
    margin: 0
  },
  taxPreviewContent: {
    fontSize: '14px',
    color: '#1e40af'
  },
  taxPreviewText: {
    fontSize: '14px',
    color: '#1e40af',
    fontStyle: 'italic'
  },
  taxBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  taxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  taxGroupLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af'
  },
  taxItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  taxItem: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid #93c5fd'
  },
  rebateItem: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid #fcd34d'
  },
  taxNote: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '8px'
  },
  configButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  configButton: {
    padding: '12px 16px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  summaryLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    minWidth: '140px',
    flexShrink: 0
  },
  summaryValue: {
    fontSize: '14px',
    color: '#6b7280',
    flex: 1,
    lineHeight: '1.4'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  }
};

export default InventoryEditModal;