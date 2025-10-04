// components/POS/StockTrackingModal.jsx - Fixed with correct database schema and calculated stock
import React, { useState, useEffect } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../UI/TavariCheckbox';
import { supabase } from '../../supabaseClient';

const StockTrackingModal = ({
  isOpen,
  onClose,
  onSave,
  trackStock,
  stockQuantity,
  lowThreshold,
  itemName,
  itemId = null,
  businessId = null
}) => {
  const [enableTracking, setEnableTracking] = useState(false);
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculatedCurrentStock, setCalculatedCurrentStock] = useState(null);

  useEffect(() => {
    if (isOpen) {
      console.log('StockTrackingModal opened with:', { trackStock, stockQuantity, lowThreshold });
      setEnableTracking(trackStock || false);
      
      // Use the passed stockQuantity (which should already be calculated)
      const currentStock = stockQuantity || 0;
      setCurrentQuantity(currentStock.toString());
      setCalculatedCurrentStock(currentStock);
      setLowStockThreshold(lowThreshold || 5);
      
      if (itemId && businessId) {
        fetchStockMovements();
      }
    }
  }, [isOpen, trackStock, stockQuantity, lowThreshold, itemId, businessId]);

  const fetchStockMovements = async () => {
    if (!itemId || !businessId) return;
    
    setLoading(true);
    try {
      console.log('Fetching stock movements for item:', itemId, 'business:', businessId);
      
      // Get sales (stock reductions) - pos_sale_items has direct business_id
      const { data: sales, error: salesError } = await supabase
        .from('pos_sale_items')
        .select(`
          id,
          quantity,
          unit_price,
          created_at,
          sale_id,
          pos_sales(
            id,
            sale_number
          )
        `)
        .eq('inventory_id', itemId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (salesError) {
        console.error('Sales fetch error:', salesError);
      } else {
        console.log('Sales found:', sales);
      }

      // Get refunds (stock increases when restocked) - pos_refund_items has direct business_id
      const { data: refunds, error: refundsError } = await supabase
        .from('pos_refund_items')
        .select(`
          id,
          quantity_refunded,
          unit_price,
          restock,
          created_at,
          refund_id,
          pos_refunds(
            id
          )
        `)
        .eq('inventory_id', itemId)
        .eq('business_id', businessId)
        .eq('restock', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (refundsError) {
        console.error('Refunds fetch error:', refundsError);
      } else {
        console.log('Refunds found:', refunds);
      }

      // Combine and sort movements
      const allMovements = [
        ...(sales || []).map(sale => ({
          id: `sale-${sale.id}`,
          type: 'sale',
          quantity_change: -sale.quantity,
          reference: sale.pos_sales?.sale_number || `Sale-${sale.sale_id?.slice(0, 8)}`,
          created_at: sale.created_at,
          unit_price: sale.unit_price
        })),
        ...(refunds || []).map(refund => ({
          id: `refund-${refund.id}`,
          type: 'refund_restock',
          quantity_change: refund.quantity_refunded,
          reference: `Refund-${refund.refund_id?.slice(0, 8)}`,
          created_at: refund.created_at,
          unit_price: refund.unit_price
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log('Combined stock movements:', allMovements);
      setStockMovements(allMovements);
      
      // Recalculate current stock based on movements if we have movements
      if (allMovements.length > 0) {
        const totalStockChange = allMovements.reduce((total, movement) => total + movement.quantity_change, 0);
        const initialStock = parseInt(currentQuantity) || 0;
        const recalculatedStock = Math.max(0, initialStock - totalStockChange);
        
        console.log('Stock calculation:', {
          initialStock,
          totalStockChange,
          recalculatedStock
        });
        
        setCalculatedCurrentStock(recalculatedStock);
      }
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const stockToSave = enableTracking ? (parseInt(currentQuantity) || 0) : null;
    
    console.log('Saving stock settings:', {
      trackStock: enableTracking,
      stockQuantity: stockToSave,
      lowThreshold: enableTracking ? (parseInt(lowStockThreshold) || 5) : null
    });
    
    onSave({
      trackStock: enableTracking,
      stockQuantity: stockToSave,
      lowThreshold: enableTracking ? (parseInt(lowStockThreshold) || 5) : null
    });
    onClose();
  };

  const calculateTotalStockChange = () => {
    return stockMovements.reduce((total, movement) => total + movement.quantity_change, 0);
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      boxShadow: TavariStyles.shadows.xl,
      maxWidth: '700px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      padding: TavariStyles.spacing.xl,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      margin: 0,
      color: TavariStyles.colors.gray800
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: TavariStyles.colors.gray500,
      padding: '4px'
    },
    content: {
      padding: TavariStyles.spacing.xl,
      flex: 1,
      overflowY: 'auto'
    },
    section: {
      marginBottom: TavariStyles.spacing.xl,
      paddingBottom: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    lastSection: {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottom: 'none'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: TavariStyles.spacing.lg,
      marginTop: TavariStyles.spacing.md
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs
    },
    label: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },
    input: {
      padding: TavariStyles.spacing.md,
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.base,
      outline: 'none',
      transition: TavariStyles.transitions.normal
    },
    currentStockDisplay: {
      backgroundColor: TavariStyles.colors.infoBg,
      border: `1px solid ${TavariStyles.colors.info}`,
      borderRadius: TavariStyles.borderRadius.md,
      padding: TavariStyles.spacing.md,
      marginTop: TavariStyles.spacing.md,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.infoText,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    summary: {
      backgroundColor: TavariStyles.colors.infoBg,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.md,
      marginBottom: TavariStyles.spacing.lg,
      border: `1px solid ${TavariStyles.colors.info}`
    },
    summaryTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.infoText,
      marginBottom: TavariStyles.spacing.md
    },
    summaryStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: TavariStyles.spacing.md
    },
    summaryItem: {
      textAlign: 'center'
    },
    summaryNumber: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.infoText
    },
    summaryLabel: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.infoText
    },
    positive: {
      color: TavariStyles.colors.success
    },
    negative: {
      color: TavariStyles.colors.danger
    },
    movementsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm,
      maxHeight: '300px',
      overflowY: 'auto'
    },
    movementItem: {
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    movementHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.xs
    },
    movementType: {
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    saleType: {
      backgroundColor: TavariStyles.colors.danger,
      color: TavariStyles.colors.white
    },
    refundType: {
      backgroundColor: TavariStyles.colors.success,
      color: TavariStyles.colors.white
    },
    quantityChange: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    movementDetails: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xs
    },
    movementPrice: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500
    },
    noMovements: {
      textAlign: 'center',
      padding: TavariStyles.spacing['4xl'],
      color: TavariStyles.colors.gray400,
      fontStyle: 'italic'
    },
    loadingText: {
      textAlign: 'center',
      padding: TavariStyles.spacing.lg,
      color: TavariStyles.colors.gray500
    },
    footer: {
      padding: TavariStyles.spacing.xl,
      borderTop: `1px solid ${TavariStyles.colors.gray200}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: TavariStyles.spacing.md
    },
    selectedCount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.md
    },
    cancelButton: {
      padding: `${TavariStyles.spacing.md} ${TavariStyles.spacing.xl}`,
      backgroundColor: TavariStyles.colors.gray100,
      color: TavariStyles.colors.gray700,
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal
    },
    saveButton: {
      padding: `${TavariStyles.spacing.md} ${TavariStyles.spacing.xl}`,
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      border: `1px solid ${TavariStyles.colors.primary}`,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal
    }
  };

  const totalStockChange = calculateTotalStockChange();
  const displayCurrentStock = calculatedCurrentStock ?? (parseInt(currentQuantity) || 0);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Stock Tracking - {itemName}</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          {/* Enable/Disable Tracking */}
          <div style={styles.section}>
            <TavariCheckbox
              checked={enableTracking}
              onChange={setEnableTracking}
              label="Enable stock tracking for this item"
              size="md"
            />

            {enableTracking && (
              <>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Current Stock Quantity</label>
                    <input
                      type="number"
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(e.target.value)}
                      style={styles.input}
                      min="0"
                      placeholder="Enter current stock"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Low Stock Threshold</label>
                    <input
                      type="number"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      style={styles.input}
                      min="0"
                      placeholder="Alert when stock is low"
                    />
                  </div>
                </div>
                
                {/* Current Stock Display */}
                {stockMovements.length > 0 && (
                  <div style={styles.currentStockDisplay}>
                    Calculated Current Stock: {displayCurrentStock} units
                    {totalStockChange !== 0 && (
                      <span> (Net change from movements: {totalStockChange >= 0 ? '+' : ''}{totalStockChange})</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stock Movement Summary */}
          {enableTracking && itemId && stockMovements.length > 0 && (
            <div style={styles.summary}>
              <h4 style={styles.summaryTitle}>Stock Movement Summary</h4>
              <div style={styles.summaryStats}>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryNumber}>{stockMovements.length}</div>
                  <div style={styles.summaryLabel}>Total Movements</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={{
                    ...styles.summaryNumber,
                    ...(totalStockChange >= 0 ? styles.positive : styles.negative)
                  }}>
                    {totalStockChange >= 0 ? '+' : ''}{totalStockChange}
                  </div>
                  <div style={styles.summaryLabel}>Net Change</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryNumber}>
                    {stockMovements.filter(m => m.type === 'sale').length}
                  </div>
                  <div style={styles.summaryLabel}>Sales</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryNumber}>
                    {stockMovements.filter(m => m.type === 'refund_restock').length}
                  </div>
                  <div style={styles.summaryLabel}>Restocks</div>
                </div>
              </div>
            </div>
          )}

          {/* Stock Movement History */}
          {enableTracking && itemId && (
            <div style={{...styles.section, ...styles.lastSection}}>
              <h4>Recent Stock Movements</h4>
              {loading ? (
                <div style={styles.loadingText}>Loading movements...</div>
              ) : stockMovements.length === 0 ? (
                <div style={styles.noMovements}>
                  No stock movements found. Stock will be automatically tracked when items are sold or refunded with restocking enabled.
                </div>
              ) : (
                <div style={styles.movementsList}>
                  {stockMovements.map(movement => (
                    <div key={movement.id} style={styles.movementItem}>
                      <div style={styles.movementHeader}>
                        <div style={{display: 'flex', alignItems: 'center', gap: TavariStyles.spacing.md}}>
                          <span style={{
                            ...styles.movementType,
                            ...(movement.type === 'sale' ? styles.saleType : styles.refundType)
                          }}>
                            {movement.type === 'sale' ? 'SALE' : 'REFUND'}
                          </span>
                          <span style={styles.movementDetails}>{movement.reference}</span>
                        </div>
                        <span style={{
                          ...styles.quantityChange,
                          ...(movement.quantity_change >= 0 ? styles.positive : styles.negative)
                        }}>
                          {movement.quantity_change >= 0 ? '+' : ''}{movement.quantity_change}
                        </span>
                      </div>
                      <div style={styles.movementDetails}>
                        {new Date(movement.created_at).toLocaleString()}
                      </div>
                      <div style={styles.movementPrice}>
                        Unit price: ${Number(movement.unit_price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.selectedCount}>
            {enableTracking ? 'Stock tracking enabled' : 'Stock tracking disabled'}
          </span>
          <div style={styles.buttonGroup}>
            <button onClick={onClose} style={styles.cancelButton}>Cancel</button>
            <button onClick={handleSave} style={styles.saveButton}>Save Stock Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTrackingModal;