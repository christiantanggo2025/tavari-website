// components/POS/POSRegisterComponents/SaveCartModal.jsx - Fixed version
import React, { useState, useEffect, useRef } from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const SaveCartModal = ({
  showSaveCartModal,
  onSaveCart,
  onClose
}) => {
  // Move state management inside the modal to prevent parent re-renders
  const [saveCartName, setSaveCartName] = useState('');
  const inputRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (showSaveCartModal) {
      setSaveCartName('');
      // Focus the input after a small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showSaveCartModal]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (showSaveCartModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showSaveCartModal, onClose]);

  // Handle Enter key to save
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && saveCartName.trim()) {
      e.preventDefault();
      handleSaveCart();
    }
  };

  // Prevent modal from closing when clicking inside the modal content
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  // Handle input change - this stays local to the modal
  const handleInputChange = (e) => {
    setSaveCartName(e.target.value);
  };

  // Handle save with validation
  const handleSaveCart = () => {
    if (!saveCartName.trim()) {
      return;
    }
    // Pass the cart name to the parent's save function
    onSaveCart(saveCartName.trim());
  };

  if (!showSaveCartModal) return null;

  const styles = {
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: TavariStyles.spacing.lg
    },
    
    modalContent: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      width: '100%',
      maxWidth: '450px',
      minWidth: '300px',
      boxShadow: TavariStyles.shadows.xl,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.xl,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      backgroundColor: TavariStyles.colors.gray50
    },
    
    modalTitle: {
      margin: 0,
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800
    },
    
    modalBody: {
      padding: TavariStyles.spacing.xl,
      flex: 1
    },
    
    modalFooter: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.xl,
      borderTop: `1px solid ${TavariStyles.colors.gray200}`,
      justifyContent: 'flex-end',
      backgroundColor: TavariStyles.colors.gray50
    },
    
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: TavariStyles.colors.gray600,
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.md,
      transition: TavariStyles.transitions.normal,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px'
    },
    
    label: {
      ...TavariStyles.components.form.label,
      marginBottom: TavariStyles.spacing.sm,
      color: TavariStyles.colors.gray700
    },
    
    input: {
      ...TavariStyles.components.form.input,
      width: '100%',
      fontSize: TavariStyles.typography.fontSize.base,
      padding: TavariStyles.spacing.lg,
      border: `2px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.md,
      transition: TavariStyles.transitions.normal,
      boxSizing: 'border-box',
      outline: 'none'
    },
    
    inputFocused: {
      borderColor: TavariStyles.colors.primary,
      boxShadow: `0 0 0 3px ${TavariStyles.colors.primary}20`
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
    
    saveButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      pointerEvents: 'none'
    }
  };

  return (
    <div 
      style={styles.modal} 
      onClick={onClose}
    >
      <div 
        style={styles.modalContent}
        onClick={handleContentClick}
      >
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Save Current Cart</h3>
          <button 
            onClick={onClose}
            style={styles.closeButton}
            title="Close"
          >
            ×
          </button>
        </div>
        
        <div style={styles.modalBody}>
          <label style={styles.label}>
            Enter a name for this saved cart:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={saveCartName}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Customer A's Order"
            style={styles.input}
            maxLength={100}
            autoComplete="off"
          />
          {saveCartName.length > 80 && (
            <div style={{
              fontSize: TavariStyles.typography.fontSize.sm,
              color: TavariStyles.colors.warning,
              marginTop: TavariStyles.spacing.sm
            }}>
              {100 - saveCartName.length} characters remaining
            </div>
          )}
        </div>
        
        <div style={styles.modalFooter}>
          <button
            onClick={onClose}
            style={styles.cancelButton}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCart}
            disabled={!saveCartName.trim()}
            style={{
              ...styles.saveButton,
              ...((!saveCartName.trim()) ? styles.saveButtonDisabled : {})
            }}
            type="button"
          >
            Save Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveCartModal;