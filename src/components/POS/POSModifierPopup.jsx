// components/POS/POSModifierPopup.jsx - Updated with Tavari foundation components
import React, { useState, useEffect } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../UI/TavariCheckbox';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { usePOSAuth } from '../../hooks/usePOSAuth';

export default function POSModifierPopup({ 
  visible, 
  onClose, 
  product, 
  onApply,
  businessId = null,
  modifierGroups = [],
  testId = null
}) {
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Authentication and tax calculations
  const auth = usePOSAuth({ requireBusiness: true, componentName: 'ModifierPopup' });
  const taxCalculations = useTaxCalculations(businessId || auth.selectedBusinessId);

  // Reset state when popup opens/closes
  useEffect(() => {
    if (visible) {
      setSelectedModifiers([]);
      setError(null);
    }
  }, [visible]);

  if (!visible) return null;

  const styles = {
    backdrop: {
      ...TavariStyles.components.modal.overlay,
      zIndex: 1500
    },
    
    modal: {
      ...TavariStyles.components.modal.content,
      width: '520px',
      maxWidth: '90vw',
      padding: TavariStyles.spacing['3xl'],
      borderRadius: TavariStyles.borderRadius.xl,
      boxShadow: TavariStyles.shadows.modal
    },
    
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.xl,
      paddingBottom: TavariStyles.spacing.lg,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`
    },
    
    title: {
      margin: 0,
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    
    closeBtn: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: TavariStyles.typography.fontSize['2xl'],
      cursor: 'pointer',
      color: TavariStyles.colors.gray400,
      padding: TavariStyles.spacing.xs,
      borderRadius: TavariStyles.borderRadius.sm,
      transition: TavariStyles.transitions.normal,
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    
    content: {
      marginBottom: TavariStyles.spacing.xl
    },
    
    placeholderText: {
      fontSize: TavariStyles.typography.fontSize.base,
      color: TavariStyles.colors.gray600,
      lineHeight: TavariStyles.typography.lineHeight.relaxed,
      textAlign: 'center',
      padding: TavariStyles.spacing['4xl'],
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px dashed ${TavariStyles.colors.gray300}`
    },
    
    modifierGroup: {
      marginBottom: TavariStyles.spacing.xl,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    groupTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.md
    },
    
    groupDescription: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.lg
    },
    
    modifiersList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.md
    },
    
    modifierItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      transition: TavariStyles.transitions.normal
    },
    
    modifierDetails: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.md,
      flex: 1
    },
    
    modifierInfo: {
      flex: 1
    },
    
    modifierName: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.xs
    },
    
    modifierDescription: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    
    modifierPrice: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      minWidth: '60px',
      textAlign: 'right'
    },
    
    summary: {
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      marginBottom: TavariStyles.spacing.xl
    },
    
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.sm
    },
    
    summaryLabel: {
      fontSize: TavariStyles.typography.fontSize.base,
      color: TavariStyles.colors.gray700
    },
    
    summaryValue: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    
    actions: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      justifyContent: 'flex-end'
    },
    
    cancelBtn: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.lg
    },
    
    applyBtn: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg
    },
    
    applyBtnDisabled: {
      backgroundColor: TavariStyles.colors.gray300,
      color: TavariStyles.colors.gray500,
      cursor: 'not-allowed'
    },
    
    errorMessage: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.lg
    },
    
    loadingMessage: {
      ...TavariStyles.components.loading.container,
      fontSize: TavariStyles.typography.fontSize.base
    }
  };

  const handleModifierToggle = (modifier, groupId) => {
    setSelectedModifiers(prev => {
      const existingIndex = prev.findIndex(m => m.id === modifier.id);
      
      if (existingIndex >= 0) {
        // Remove modifier
        return prev.filter(m => m.id !== modifier.id);
      } else {
        // Add modifier
        return [...prev, {
          ...modifier,
          group_id: groupId,
          selected: true
        }];
      }
    });
  };

  const calculateModifierTotal = () => {
    return selectedModifiers.reduce((total, modifier) => {
      return total + (Number(modifier.price) || 0);
    }, 0);
  };

  const handleApply = () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Pass selected modifiers back to parent
      onApply && onApply(selectedModifiers);
    } catch (err) {
      setError('Failed to apply modifiers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const isModifierSelected = (modifierId) => {
    return selectedModifiers.some(m => m.id === modifierId);
  };

  return (
    <div style={styles.backdrop} data-testid={testId}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            Customize: {product?.name || 'Item'}
          </h3>
          <button 
            style={styles.closeBtn} 
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        {loading && (
          <div style={styles.loadingMessage}>
            Applying modifiers...
          </div>
        )}

        <div style={styles.content}>
          {modifierGroups && modifierGroups.length > 0 ? (
            modifierGroups.map((group) => (
              <div key={group.id} style={styles.modifierGroup}>
                <div style={styles.groupTitle}>
                  {group.name}
                  {group.required && <span style={{ color: TavariStyles.colors.danger }}> *</span>}
                </div>
                
                {group.description && (
                  <div style={styles.groupDescription}>
                    {group.description}
                  </div>
                )}
                
                <div style={styles.modifiersList}>
                  {group.modifiers?.map((modifier) => (
                    <div key={modifier.id} style={styles.modifierItem}>
                      <div style={styles.modifierDetails}>
                        <TavariCheckbox
                          checked={isModifierSelected(modifier.id)}
                          onChange={() => handleModifierToggle(modifier, group.id)}
                          size="md"
                          disabled={loading}
                        />
                        
                        <div style={styles.modifierInfo}>
                          <div style={styles.modifierName}>
                            {modifier.name}
                          </div>
                          {modifier.description && (
                            <div style={styles.modifierDescription}>
                              {modifier.description}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={styles.modifierPrice}>
                        {Number(modifier.price) > 0 ? `+$${Number(modifier.price).toFixed(2)}` : 'Free'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={styles.placeholderText}>
              Placeholder for modifier groups/options.<br />
              Hook up to pos_modifier_groups later.
            </div>
          )}
        </div>

        {selectedModifiers.length > 0 && (
          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>
                Selected Modifiers: {selectedModifiers.length}
              </span>
              <span style={styles.summaryValue}>
                +${calculateModifierTotal().toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div style={styles.actions}>
          <button 
            style={styles.cancelBtn} 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            style={{
              ...styles.applyBtn,
              ...(loading ? styles.applyBtnDisabled : {})
            }}
            onClick={handleApply}
            disabled={loading}
          >
            {loading ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}