// components/POS/POSRegisterComponents/CategorySelector.jsx
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const CategorySelector = ({
  categories = [],
  activeCategory,
  onCategorySelect,
  registerLocked = false
}) => {
  const styles = {
    categories: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.xl,
      maxHeight: '120px',
      overflowY: 'auto'
    },
    
    categoryButton: {
      ...TavariStyles.components.button.base,
      border: `2px solid ${TavariStyles.colors.primary}`,
      borderRadius: TavariStyles.borderRadius.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      fontSize: TavariStyles.typography.fontSize.base,
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      transition: TavariStyles.transitions.normal,
      backgroundColor: TavariStyles.colors.white
    }
  };

  return (
    <div style={styles.categories}>
      <button
        style={{
          ...styles.categoryButton,
          backgroundColor: activeCategory === null ? TavariStyles.colors.primary : TavariStyles.colors.white,
          color: activeCategory === null ? TavariStyles.colors.white : TavariStyles.colors.gray700,
          opacity: registerLocked ? 0.5 : 1,
          cursor: registerLocked ? 'not-allowed' : 'pointer'
        }}
        onClick={() => !registerLocked && onCategorySelect(null)}
        disabled={registerLocked}
      >
        All
      </button>
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            style={{
              ...styles.categoryButton,
              backgroundColor: isActive ? (cat.color || TavariStyles.colors.primary) : TavariStyles.colors.white,
              color: isActive ? TavariStyles.colors.white : TavariStyles.colors.gray700,
              borderColor: cat.color || TavariStyles.colors.primary,
              opacity: registerLocked ? 0.5 : 1,
              cursor: registerLocked ? 'not-allowed' : 'pointer'
            }}
            onClick={() => !registerLocked && onCategorySelect(cat.id)}
            disabled={registerLocked}
          >
            {cat.emoji && <span style={{ marginRight: "6px" }}>{cat.emoji}</span>}
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

export default CategorySelector;