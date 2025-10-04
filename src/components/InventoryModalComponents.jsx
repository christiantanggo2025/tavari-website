// src/components/InventoryModalComponents.jsx
import React, { useState } from 'react';

// Tax Overrides Modal
export const TaxOverridesModal = ({ isOpen, onClose, onSave, taxCategories, selectedTaxes }) => {
  const [localSelectedTaxes, setLocalSelectedTaxes] = useState(selectedTaxes || []);

  const handleToggle = (taxId) => {
    setLocalSelectedTaxes(prev => 
      prev.includes(taxId) 
        ? prev.filter(id => id !== taxId)
        : [...prev, taxId]
    );
  };

  const handleSave = () => {
    onSave(localSelectedTaxes);
    onClose();
  };

  const taxRates = taxCategories.filter(tax => tax.category_type === 'tax');

  if (!isOpen) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3>Tax Rate Overrides</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.modalBody}>
          <div style={styles.modalDescription}>
            Select which tax rates should apply to this item instead of category defaults.
          </div>
          
          <div style={styles.optionsList}>
            {taxRates.map(tax => {
              const isSelected = localSelectedTaxes.includes(tax.id);
              return (
                <div 
                  key={tax.id}
                  style={{
                    ...styles.optionItem,
                    backgroundColor: isSelected ? '#e0f2fe' : 'white',
                    border: isSelected ? '2px solid #0284c7' : '2px solid #e5e7eb'
                  }}
                  onClick={() => handleToggle(tax.id)}
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
                  
                  <div style={styles.optionInfo}>
                    <div style={styles.optionName}>{tax.name}</div>
                    <div style={styles.optionRate}>{(tax.rate * 100).toFixed(2)}% tax rate</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {taxRates.length === 0 && (
            <div style={styles.noOptions}>
              No tax rates configured. Set up tax rates in POS Settings first.
            </div>
          )}
        </div>
        
        <div style={styles.modalActions}>
          <button style={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button style={styles.saveButton} onClick={handleSave}>
            Save Tax Overrides ({localSelectedTaxes.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// Rebate Overrides Modal
export const RebateOverridesModal = ({ isOpen, onClose, onSave, taxCategories, selectedRebates }) => {
  const [localSelectedRebates, setLocalSelectedRebates] = useState(selectedRebates || []);

  const handleToggle = (rebateId) => {
    setLocalSelectedRebates(prev => 
      prev.includes(rebateId) 
        ? prev.filter(id => id !== rebateId)
        : [...prev, rebateId]
    );
  };

  const handleSave = () => {
    onSave(localSelectedRebates);
    onClose();
  };

  const rebates = taxCategories.filter(tax => 
    tax.category_type === 'rebate' || tax.category_type === 'exemption'
  );

  if (!isOpen) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3>Rebate & Exemption Overrides</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.modalBody}>
          <div style={styles.modalDescription}>
            Select which rebates or exemptions should apply to this item.
          </div>
          
          <div style={styles.optionsList}>
            {rebates.map(rebate => {
              const isSelected = localSelectedRebates.includes(rebate.id);
              return (
                <div 
                  key={rebate.id}
                  style={{
                    ...styles.optionItem,
                    backgroundColor: isSelected ? '#fef3c7' : 'white',
                    border: isSelected ? '2px solid #f59e0b' : '2px solid #e5e7eb'
                  }}
                  onClick={() => handleToggle(rebate.id)}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '2px solid #f59e0b',
                    backgroundColor: isSelected ? '#f59e0b' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {isSelected ? '✓' : ''}
                  </div>
                  
                  <div style={styles.optionInfo}>
                    <div style={styles.optionName}>{rebate.name}</div>
                    <div style={styles.optionRate}>
                      {rebate.rate === 0 ? 'Tax exempt' : `${(rebate.rate * 100).toFixed(2)}% rebate`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {rebates.length === 0 && (
            <div style={styles.noOptions}>
              No rebates configured. Set up rebates in POS Settings first.
            </div>
          )}
        </div>
        
        <div style={styles.modalActions}>
          <button style={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button style={styles.saveButton} onClick={handleSave}>
            Save Rebate Overrides ({localSelectedRebates.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// Station Routing Modal
export const StationRoutingModal = ({ isOpen, onClose, onSave, stations, selectedStations }) => {
  const [localSelectedStations, setLocalSelectedStations] = useState(selectedStations || []);

  const handleToggle = (stationId) => {
    setLocalSelectedStations(prev => 
      prev.includes(stationId) 
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  const handleSave = () => {
    onSave(localSelectedStations);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3>Station Routing</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.modalBody}>
          <div style={styles.modalDescription}>
            Select which stations should receive orders for this item (kitchen, bar, etc.).
          </div>
          
          <div style={styles.optionsList}>
            {stations.map(station => {
              const isSelected = localSelectedStations.includes(station.id);
              return (
                <div 
                  key={station.id}
                  style={{
                    ...styles.optionItem,
                    backgroundColor: isSelected ? '#d1fae5' : 'white',
                    border: isSelected ? '2px solid #059669' : '2px solid #e5e7eb'
                  }}
                  onClick={() => handleToggle(station.id)}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '2px solid #059669',
                    backgroundColor: isSelected ? '#059669' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {isSelected ? '✓' : ''}
                  </div>
                  
                  <div style={styles.optionInfo}>
                    <div style={styles.optionName}>{station.name}</div>
                    <div style={styles.optionRate}>Orders will be sent here</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {stations.length === 0 && (
            <div style={styles.noOptions}>
              No stations configured. Set up stations in POS Settings first.
            </div>
          )}
        </div>
        
        <div style={styles.modalActions}>
          <button style={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button style={styles.saveButton} onClick={handleSave}>
            Save Station Routing ({localSelectedStations.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// Stock Tracking Modal
export const StockTrackingModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  trackStock, 
  stockQuantity, 
  lowThreshold,
  itemName = "this item"
}) => {
  const [localTrackStock, setLocalTrackStock] = useState(trackStock || false);
  const [localStockQuantity, setLocalStockQuantity] = useState(stockQuantity || '');
  const [localLowThreshold, setLocalLowThreshold] = useState(lowThreshold || '5');
  const [showStockHistory, setShowStockHistory] = useState(false);

  const handleSave = () => {
    onSave({
      trackStock: localTrackStock,
      stockQuantity: localTrackStock ? parseInt(localStockQuantity) || 0 : null,
      lowThreshold: localTrackStock ? parseInt(localLowThreshold) || 5 : null
    });
    onClose();
  };

  // Sample stock history for demonstration
  const stockHistory = [
    { type: 'sale', quantity: -2, date: '2025-01-15', note: 'Sale #1234' },
    { type: 'receive', quantity: +50, date: '2025-01-14', note: 'Received inventory' },
    { type: 'manual', quantity: -1, date: '2025-01-13', note: 'Damaged item removed' },
    { type: 'sale', quantity: -3, date: '2025-01-12', note: 'Sale #1230' }
  ];

  if (!isOpen) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3>Stock Tracking for {itemName}</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.modalBody}>
          <div style={styles.modalDescription}>
            Configure inventory tracking and stock levels for this item.
          </div>
          
          <div style={styles.trackingToggle}>
            <h4>Enable Stock Tracking</h4>
            <div style={styles.toggleButtons}>
              <button
                style={{
                  ...styles.toggleButton,
                  ...(localTrackStock === false ? styles.activeToggleButton : {})
                }}
                onClick={() => setLocalTrackStock(false)}
              >
                No
              </button>
              <button
                style={{
                  ...styles.toggleButton,
                  ...(localTrackStock === true ? styles.activeToggleButton : {})
                }}
                onClick={() => setLocalTrackStock(true)}
              >
                Yes
              </button>
            </div>
          </div>

          {localTrackStock && (
            <div style={styles.stockConfig}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Current Stock Quantity:</label>
                <input
                  type="number"
                  value={localStockQuantity}
                  onChange={(e) => setLocalStockQuantity(e.target.value)}
                  style={styles.input}
                  placeholder="0"
                  min="0"
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Low Stock Alert Threshold:</label>
                <input
                  type="number"
                  value={localLowThreshold}
                  onChange={(e) => setLocalLowThreshold(e.target.value)}
                  style={styles.input}
                  placeholder="5"
                  min="1"
                />
              </div>

              <div style={styles.expandableSection}>
                <button
                  style={styles.expandButton}
                  onClick={() => setShowStockHistory(!showStockHistory)}
                >
                  Stock Movement History {showStockHistory ? '▼' : '▶'}
                </button>
                
                {showStockHistory && (
                  <div style={styles.stockHistory}>
                    <div style={styles.historyHeader}>
                      <span>Date</span>
                      <span>Type</span>
                      <span>Change</span>
                      <span>Note</span>
                    </div>
                    {stockHistory.map((entry, index) => (
                      <div key={index} style={styles.historyEntry}>
                        <span style={styles.historyDate}>{entry.date}</span>
                        <span style={{
                          ...styles.historyType,
                          color: entry.type === 'sale' ? '#dc2626' : 
                                entry.type === 'receive' ? '#059669' : '#f59e0b'
                        }}>
                          {entry.type.toUpperCase()}
                        </span>
                        <span style={{
                          ...styles.historyQuantity,
                          color: entry.quantity > 0 ? '#059669' : '#dc2626'
                        }}>
                          {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                        </span>
                        <span style={styles.historyNote}>{entry.note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div style={styles.modalActions}>
          <button style={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button style={styles.saveButton} onClick={handleSave}>
            Save Stock Settings
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
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
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
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px'
  },
  modalDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: '1.5'
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  optionItem: {
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  optionInfo: {
    flex: 1
  },
  optionName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  optionRate: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px'
  },
  noOptions: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '40px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  trackingToggle: {
    marginBottom: '20px'
  },
  toggleButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  toggleButton: {
    padding: '10px 24px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#6b7280',
    minWidth: '80px'
  },
  activeToggleButton: {
    borderColor: '#008080',
    backgroundColor: '#008080',
    color: 'white'
  },
  stockConfig: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  inputLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  expandableSection: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  expandButton: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    textAlign: 'left'
  },
  stockHistory: {
    padding: '16px'
  },
  historyHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 80px 2fr',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  historyEntry: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 80px 2fr',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '13px'
  },
  historyDate: {
    color: '#374151'
  },
  historyType: {
    fontWeight: '600',
    fontSize: '11px'
  },
  historyQuantity: {
    fontWeight: 'bold'
  },
  historyNote: {
    color: '#6b7280'
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
  }
};