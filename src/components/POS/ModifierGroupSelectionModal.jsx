// components/POS/ModifierGroupSelectionModal.jsx - Updated to use existing pos_modifier_group_items table
import React, { useState, useEffect } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../UI/TavariCheckbox';
import { supabase } from '../../supabaseClient';

const ModifierGroupSelectionModal = ({
  isOpen,
  onClose,
  onSave,
  businessId,
  selectedModifierGroups = [],
  itemName = "this item"
}) => {
  const [modifierGroups, setModifierGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && businessId) {
      fetchModifierGroups();
    }
  }, [isOpen, businessId]);

  useEffect(() => {
    if (isOpen) {
      setSelectedGroups(selectedModifierGroups || []);
    }
  }, [isOpen, selectedModifierGroups]);

  const fetchModifierGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      // First get modifier groups
      const { data: groups, error: groupsError } = await supabase
        .from('pos_modifier_groups')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (groupsError) throw groupsError;

      // Then get modifier items for each group using existing table structure
      const groupsWithItems = await Promise.all(
        (groups || []).map(async (group) => {
          const { data: items, error: itemsError } = await supabase
            .from('pos_modifier_group_items')
            .select(`
              id,
              price_override,
              is_free,
              pos_inventory(
                id,
                name,
                price
              )
            `)
            .eq('modifier_group_id', group.id)
            .eq('is_active', true);

          if (itemsError) {
            console.warn('Error fetching items for group:', group.name, itemsError);
          }

          return {
            ...group,
            items: items || []
          };
        })
      );

      setModifierGroups(groupsWithItems);
    } catch (err) {
      console.error('Error fetching modifier groups:', err);
      setError('Failed to load modifier groups: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => {
      const isSelected = prev.includes(groupId);
      if (isSelected) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleSave = () => {
    onSave(selectedGroups);
    onClose();
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      ...TavariStyles.components.modal.overlay
    },
    modal: {
      ...TavariStyles.components.modal.content,
      maxWidth: '700px',
      width: '90%',
      maxHeight: '80vh'
    },
    header: {
      ...TavariStyles.components.modal.header
    },
    title: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: TavariStyles.colors.gray500
    },
    content: {
      ...TavariStyles.components.modal.body,
      maxHeight: '50vh',
      overflowY: 'auto'
    },
    description: {
      fontSize: TavariStyles.typography.fontSize.base,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xl,
      lineHeight: TavariStyles.typography.lineHeight.relaxed
    },
    errorBanner: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.lg
    },
    loadingMessage: {
      textAlign: 'center',
      padding: TavariStyles.spacing['4xl'],
      color: TavariStyles.colors.gray500
    },
    groupsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.lg
    },
    groupCard: {
      border: `1px solid ${TavariStyles.colors.gray200}`,
      borderRadius: TavariStyles.borderRadius.md,
      padding: TavariStyles.spacing.lg,
      transition: TavariStyles.transitions.normal
    },
    groupCardSelected: {
      borderColor: TavariStyles.colors.primary,
      backgroundColor: TavariStyles.colors.gray50
    },
    groupHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.md
    },
    groupInfo: {
      flex: 1
    },
    groupName: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.xs
    },
    groupSettings: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500,
      marginBottom: TavariStyles.spacing.sm
    },
    modifiersList: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.sm,
      marginTop: TavariStyles.spacing.md
    },
    modifierItem: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray700,
      backgroundColor: TavariStyles.colors.gray100,
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    modifierName: {
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    modifierPrice: {
      color: TavariStyles.colors.gray600
    },
    noGroups: {
      textAlign: 'center',
      padding: TavariStyles.spacing['4xl'],
      color: TavariStyles.colors.gray400,
      fontStyle: 'italic'
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
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md
    },
    selectedCount: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginRight: TavariStyles.spacing.md
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Modifier Groups for {itemName}</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          <div style={styles.description}>
            Select which modifier groups customers can choose from when ordering this item. 
            Modifier groups let customers customize their order (sizes, toppings, sides, etc.).
          </div>

          {error && (
            <div style={styles.errorBanner}>{error}</div>
          )}

          {loading ? (
            <div style={styles.loadingMessage}>Loading modifier groups...</div>
          ) : modifierGroups.length === 0 ? (
            <div style={styles.noGroups}>
              No modifier groups found. Create modifier groups in the POS settings first.
            </div>
          ) : (
            <div style={styles.groupsList}>
              {modifierGroups.map(group => {
                const isSelected = selectedGroups.includes(group.id);
                
                return (
                  <div 
                    key={group.id} 
                    style={{
                      ...styles.groupCard,
                      ...(isSelected ? styles.groupCardSelected : {})
                    }}
                  >
                    <div style={styles.groupHeader}>
                      <TavariCheckbox
                        checked={isSelected}
                        onChange={() => handleGroupToggle(group.id)}
                        size="md"
                      />
                      
                      <div style={styles.groupInfo}>
                        <div style={styles.groupName}>{group.name}</div>
                        
                        <div style={styles.groupSettings}>
                          {group.is_required && 'Required • '}
                          {group.min_selection > 0 && `Min: ${group.min_selection} • `}
                          {group.max_selection > 0 && `Max: ${group.max_selection} • `}
                          {group.max_free_items > 0 && `${group.max_free_items} free`}
                        </div>
                        
                        {group.items && group.items.length > 0 && (
                          <div style={styles.modifiersList}>
                            {group.items.map(item => (
                              <div key={item.id} style={styles.modifierItem}>
                                <div style={styles.modifierName}>
                                  {item.pos_inventory?.name || 'Unknown Item'}
                                </div>
                                <div style={styles.modifierPrice}>
                                  {item.is_free ? 'Free' : 
                                   item.price_override !== null ? `$${Number(item.price_override).toFixed(2)}` :
                                   item.pos_inventory?.price > 0 ? `+$${Number(item.pos_inventory.price).toFixed(2)}` : 'Free'
                                  }
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.selectedCount}>
            {selectedGroups.length} modifier group{selectedGroups.length !== 1 ? 's' : ''} selected
          </span>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.saveButton} onClick={handleSave}>
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifierGroupSelectionModal;