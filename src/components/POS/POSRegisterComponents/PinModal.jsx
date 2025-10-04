// components/POS/POSRegisterComponents/PinModal.jsx
import React, { useRef, useEffect } from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const PinModal = ({
  showPinModal,
  pinInput,
  setPinInput,
  pinError,
  setPinError,
  failedAttempts,
  currentUnlockingUser,
  onPinUnlock
}) => {
  const pinInputRef = useRef(null);

  // Keep focus on PIN input when modal is shown
  useEffect(() => {
    if (showPinModal && pinInputRef.current) {
      setTimeout(() => {
        if (pinInputRef.current) {
          pinInputRef.current.focus();
        }
      }, 100);
    }
  }, [showPinModal]);

  if (!showPinModal) return null;

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
      zIndex: 10000
    },
    
    modalContent: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      maxWidth: '400px',
      width: '90%',
      boxShadow: TavariStyles.shadows.xl
    },
    
    modalHeader: {
      padding: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      textAlign: 'center'
    },
    
    modalBody: {
      padding: TavariStyles.spacing.lg
    },
    
    modalFooter: {
      padding: TavariStyles.spacing.lg,
      borderTop: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    pinInput: {
      ...TavariStyles.components.form.input,
      width: '120px',
      margin: '0 auto',
      display: 'block',
      fontSize: '24px',
      textAlign: 'center',
      letterSpacing: '8px',
      fontFamily: 'monospace'
    },
    
    errorText: {
      color: TavariStyles.colors.danger,
      textAlign: 'center',
      marginTop: '10px',
      fontSize: '14px'
    },
    
    attemptsText: {
      textAlign: 'center',
      marginTop: '10px',
      fontSize: '12px',
      color: TavariStyles.colors.gray600
    },
    
    unlockButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      width: '100%'
    },
    
    userInfo: {
      padding: '10px',
      backgroundColor: TavariStyles.colors.gray50,
      borderTop: `1px solid ${TavariStyles.colors.gray200}`,
      fontSize: '12px',
      textAlign: 'center',
      color: TavariStyles.colors.gray600
    }
  };

  return (
    <div 
      style={styles.modal}
      onClick={(e) => {
        e.stopPropagation();
        if (pinInputRef.current) {
          pinInputRef.current.focus();
        }
      }}
    >
      <div 
        style={styles.modalContent}
        onClick={(e) => {
          e.stopPropagation();
          if (pinInputRef.current) {
            pinInputRef.current.focus();
          }
        }}
      >
        <div style={styles.modalHeader}>
          <h3>Register Locked</h3>
        </div>
        
        <div style={styles.modalBody}>
          <p style={{ marginBottom: '20px', textAlign: 'center' }}>
            Enter any staff member's 4-digit PIN to unlock the register
          </p>
          
          <input
            ref={pinInputRef}
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setPinInput(value);
              setPinError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && pinInput.length === 4) {
                onPinUnlock();
              }
            }}
            onBlur={(e) => {
              e.preventDefault();
              setTimeout(() => {
                if (showPinModal && pinInputRef.current) {
                  pinInputRef.current.focus();
                }
              }, 10);
            }}
            placeholder="••••"
            style={styles.pinInput}
            autoFocus
            disabled={failedAttempts >= 3}
            autoComplete="off"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          
          {pinError && (
            <p style={styles.errorText}>
              {pinError}
            </p>
          )}
          
          <div style={styles.attemptsText}>
            Attempts: {failedAttempts}/3
          </div>
        </div>
        
        <div style={styles.modalFooter}>
          <button
            onClick={onPinUnlock}
            disabled={failedAttempts >= 3 || pinInput.length !== 4}
            style={{
              ...styles.unlockButton,
              opacity: (failedAttempts >= 3 || pinInput.length !== 4) ? 0.5 : 1,
              cursor: (failedAttempts >= 3 || pinInput.length !== 4) ? 'not-allowed' : 'pointer'
            }}
          >
            {failedAttempts >= 3 ? 'Locked - Contact Manager' : 'Unlock Register'}
          </button>
        </div>
        
        {currentUnlockingUser && (
          <div style={styles.userInfo}>
            Last unlocked by: {currentUnlockingUser.full_name || currentUnlockingUser.email}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinModal;