// components/POS/POSPaymentScreenComponents/ManagerOverrideModal.jsx - Fixed
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const ManagerOverrideModal = ({
  showManagerOverride,
  setShowManagerOverride,
  overrideReason,
  managerPin,
  setManagerPin,
  overrideError,
  onApprove,
  onCancel
}) => {
  if (!showManagerOverride) return null;

  const handleCancel = () => {
    if (setShowManagerOverride) {
      setShowManagerOverride(false);
    }
    if (setManagerPin) {
      setManagerPin('');
    }
    if (onCancel) {
      onCancel();
    }
  };

  const handleApprove = () => {
    if (onApprove) {
      onApprove();
    }
  };

  const styles = {
    closeModalButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: TavariStyles.typography.fontSize['3xl'],
      cursor: 'pointer',
      color: TavariStyles.colors.gray500,
      padding: 0,
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.lg
    },
    
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    }
  };

  return (
    <div style={TavariStyles.components.modal.overlay}>
      <div style={TavariStyles.components.modal.content}>
        <div style={TavariStyles.components.modal.header}>
          <h3>Manager Override Required</h3>
          <button
            style={styles.closeModalButton}
            onClick={handleCancel}
          >
            ×
          </button>
        </div>
        
        <div style={TavariStyles.components.modal.body}>
          <p>{overrideReason}</p>
          
          <div style={styles.form}>
            <div style={styles.formGroup}>
              <label style={TavariStyles.components.form.label}>Manager PIN</label>
              <input
                type="password"
                value={managerPin || ''}
                onChange={(e) => setManagerPin && setManagerPin(e.target.value)}
                placeholder="Enter manager PIN"
                style={TavariStyles.components.form.input}
                autoFocus
                maxLength={4}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && managerPin) {
                    handleApprove();
                  }
                }}
              />
            </div>
            {overrideError && (
              <div style={{
                ...TavariStyles.components.banner.base,
                ...TavariStyles.components.banner.variants.error
              }}>
                {overrideError}
              </div>
            )}
          </div>
        </div>
        
        <div style={TavariStyles.components.modal.footer}>
          <button
            style={{
              ...TavariStyles.components.button.base,
              ...TavariStyles.components.button.variants.secondary
            }}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            style={{
              ...TavariStyles.components.button.base,
              ...TavariStyles.components.button.variants.primary,
              ...(managerPin ? {} : { opacity: 0.5, cursor: 'not-allowed' })
            }}
            onClick={handleApprove}
            disabled={!managerPin}
          >
            Approve Override
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerOverrideModal;