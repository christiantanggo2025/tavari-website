// components/POS/BarcodeScanHandler.jsx - Enhanced with QR Error Handling for Step 141
import React, { useEffect, useRef, useState } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import { AlertTriangle, RotateCcw, Keyboard, ArrowLeft } from 'lucide-react';

/**
 * Barcode scan handler with comprehensive error handling for unreadable QR codes
 * and invalid receipt IDs (Step 141 completion)
 * 
 * @param {Object} props
 * @param {Function} props.onScan - Callback when barcode is scanned
 * @param {boolean} props.disabled - Whether scanning is disabled
 * @param {number} props.bufferTimeout - Time between keystrokes before buffer reset (default: 100ms)
 * @param {string} props.testId - Test ID for testing
 */
export default function BarcodeScanHandler({ 
  onScan, 
  disabled = false,
  bufferTimeout = 100,
  testId = 'barcode-scan-handler'
}) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  
  // Error handling state
  const [showErrorScreen, setShowErrorScreen] = useState(false);
  const [errorType, setErrorType] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualEntry, setManualEntry] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');

  useEffect(() => {
    if (disabled) return;

    const onKeyDown = (e) => {
      // Ignore if user is typing in an input field or error screen is showing
      if (showErrorScreen || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      const now = Date.now();
      const delta = now - (lastKeyTimeRef.current || 0);
      
      // Reset buffer if too slow between keys
      if (delta > bufferTimeout) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        
        if (code && code.length > 0) {
          console.log('Barcode scanned:', code);
          setLastScannedCode(code);
          handleScannedCode(code);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only add printable characters, ignore modifier keys
        bufferRef.current += e.key;
        
        // Prevent default to avoid typing in focused elements
        if (bufferRef.current.length === 1) {
          e.preventDefault();
        }
      }
    };

    const onKeyUp = (e) => {
      // Clear buffer if escape is pressed
      if (e.key === 'Escape') {
        bufferRef.current = '';
        if (showErrorScreen) {
          handleCloseError();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onScan, disabled, bufferTimeout, showErrorScreen]);

  // Handle scanned code with error detection
  const handleScannedCode = (code) => {
    try {
      // Validate QR code format and content
      const validationResult = validateScannedCode(code);
      
      if (!validationResult.isValid) {
        showError(validationResult.errorType, validationResult.message);
        return;
      }
      
      // If validation passes, proceed with the scan
      if (onScan) {
        onScan(code);
      }
    } catch (err) {
      console.error('Error processing scanned code:', err);
      showError('processing_error', 'An unexpected error occurred while processing the scanned code.');
    }
  };

  // Validate scanned code format and content
  const validateScannedCode = (code) => {
    // Check for empty or whitespace-only codes
    if (!code || code.trim().length === 0) {
      return {
        isValid: false,
        errorType: 'unreadable',
        message: 'The QR code appears to be empty or unreadable. Please try scanning again.'
      };
    }

    // Check for obviously corrupted data (random characters, too short, etc.)
    if (code.length < 3) {
      return {
        isValid: false,
        errorType: 'unreadable',
        message: 'The scanned code is too short and appears to be corrupted. Please try scanning again.'
      };
    }

    // Check for invalid characters that might indicate a corrupted scan
    const hasControlChars = /[\x00-\x1F\x7F-\x9F]/.test(code);
    if (hasControlChars) {
      return {
        isValid: false,
        errorType: 'unreadable',
        message: 'The QR code contains invalid characters and may be corrupted. Please try scanning again.'
      };
    }

    // If this looks like it should be a receipt ID but has invalid format
    if (code.startsWith('R') || code.startsWith('receipt') || code.toLowerCase().includes('receipt')) {
      // Extract potential receipt ID
      const receiptIdMatch = code.match(/[A-Z0-9-]{6,}/i);
      if (!receiptIdMatch) {
        return {
          isValid: false,
          errorType: 'invalid_receipt',
          message: 'This appears to be a receipt QR code, but the receipt ID format is invalid.'
        };
      }
    }

    // Check for extremely long codes that might be corrupted
    if (code.length > 500) {
      return {
        isValid: false,
        errorType: 'unreadable',
        message: 'The scanned code is unusually long and may be corrupted. Please try scanning again.'
      };
    }

    // If we get here, the code appears valid
    return {
      isValid: true
    };
  };

  // Show error screen with specific error type
  const showError = (type, message) => {
    setErrorType(type);
    setErrorMessage(message);
    setShowErrorScreen(true);
    setShowManualEntry(false);
    setManualEntry('');
  };

  // Handle retry scan
  const handleRetryScan = () => {
    bufferRef.current = '';
    setShowErrorScreen(false);
    setErrorType(null);
    setErrorMessage('');
    setLastScannedCode('');
  };

  // Handle manual entry mode
  const handleManualEntry = () => {
    setShowManualEntry(true);
  };

  // Submit manual entry
  const handleSubmitManual = () => {
    if (manualEntry.trim().length === 0) {
      return;
    }

    const validationResult = validateScannedCode(manualEntry.trim());
    
    if (!validationResult.isValid) {
      setErrorMessage(validationResult.message);
      return;
    }

    // Close error screen and process manual entry
    setShowErrorScreen(false);
    setManualEntry('');
    setShowManualEntry(false);
    
    if (onScan) {
      onScan(manualEntry.trim());
    }
  };

  // Close error screen
  const handleCloseError = () => {
    setShowErrorScreen(false);
    setShowManualEntry(false);
    setErrorType(null);
    setErrorMessage('');
    setManualEntry('');
    setLastScannedCode('');
  };

  // Get error icon based on error type
  const getErrorIcon = () => {
    switch (errorType) {
      case 'unreadable':
        return <RotateCcw size={48} />;
      case 'invalid_receipt':
        return <AlertTriangle size={48} />;
      case 'processing_error':
        return <AlertTriangle size={48} />;
      default:
        return <AlertTriangle size={48} />;
    }
  };

  // Get error title based on error type
  const getErrorTitle = () => {
    switch (errorType) {
      case 'unreadable':
        return 'QR Code Unreadable';
      case 'invalid_receipt':
        return 'Invalid Receipt ID';
      case 'processing_error':
        return 'Processing Error';
      default:
        return 'Scan Error';
    }
  };

  const styles = {
    // Error screen overlay
    errorOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    },

    // Error modal content
    errorModal: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing['3xl'],
      maxWidth: '500px',
      width: '90%',
      textAlign: 'center',
      boxShadow: TavariStyles.shadows.xl
    },

    // Error icon
    errorIcon: {
      color: TavariStyles.colors.danger,
      marginBottom: TavariStyles.spacing.lg
    },

    // Error title
    errorTitle: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },

    // Error message
    errorMessage: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing['2xl'],
      lineHeight: TavariStyles.typography.lineHeight.relaxed
    },

    // Manual entry section
    manualEntrySection: {
      marginBottom: TavariStyles.spacing.xl,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },

    manualEntryTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },

    manualInput: {
      ...TavariStyles.components.form.input,
      width: '100%',
      marginBottom: TavariStyles.spacing.md
    },

    // Button group
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      justifyContent: 'center',
      flexWrap: 'wrap'
    },

    // Button styles
    primaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },

    secondaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.lg,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },

    dangerButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.danger,
      ...TavariStyles.components.button.sizes.lg
    },

    // Debug info (development only)
    debugInfo: {
      marginTop: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.infoBg,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.infoText,
      fontFamily: TavariStyles.typography.fontFamilyMono
    },

    // Status indicator (development)
    indicator: {
      position: 'fixed',
      bottom: TavariStyles.spacing.md,
      left: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.sm,
      backgroundColor: disabled ? TavariStyles.colors.gray300 : TavariStyles.colors.success,
      color: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      zIndex: 9999,
      userSelect: 'none'
    }
  };

  // Render error screen modal
  const renderErrorScreen = () => {
    if (!showErrorScreen) return null;

    return (
      <div style={styles.errorOverlay} onClick={(e) => e.stopPropagation()}>
        <div style={styles.errorModal}>
          <div style={styles.errorIcon}>
            {getErrorIcon()}
          </div>
          
          <h2 style={styles.errorTitle}>
            {getErrorTitle()}
          </h2>
          
          <p style={styles.errorMessage}>
            {errorMessage}
          </p>

          {/* Manual entry section */}
          {showManualEntry && (
            <div style={styles.manualEntrySection}>
              <h3 style={styles.manualEntryTitle}>
                Manual Entry
              </h3>
              <input
                type="text"
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                placeholder="Enter receipt number or QR code data manually"
                style={styles.manualInput}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitManual();
                  }
                }}
                autoFocus
              />
              <div style={styles.buttonGroup}>
                <button
                  style={styles.primaryButton}
                  onClick={handleSubmitManual}
                  disabled={!manualEntry.trim()}
                >
                  Submit
                </button>
                <button
                  style={styles.secondaryButton}
                  onClick={() => setShowManualEntry(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!showManualEntry && (
            <div style={styles.buttonGroup}>
              <button
                style={styles.primaryButton}
                onClick={handleRetryScan}
              >
                <RotateCcw size={16} />
                Try Scanning Again
              </button>
              
              <button
                style={styles.secondaryButton}
                onClick={handleManualEntry}
              >
                <Keyboard size={16} />
                Manual Entry
              </button>
              
              <button
                style={styles.dangerButton}
                onClick={handleCloseError}
              >
                <ArrowLeft size={16} />
                Cancel
              </button>
            </div>
          )}

          {/* Debug information in development */}
          {process.env.NODE_ENV === 'development' && lastScannedCode && (
            <div style={styles.debugInfo}>
              <strong>Debug Info:</strong><br />
              Last scanned: {lastScannedCode}<br />
              Length: {lastScannedCode.length}<br />
              Error type: {errorType}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Error screen modal */}
      {renderErrorScreen()}
      
      {/* Development status indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={styles.indicator}
          data-testid={testId}
          title={`Barcode scanning ${disabled ? 'disabled' : 'active'}`}
        >
          📷 {disabled ? 'Scan Disabled' : 'Scan Ready'}
        </div>
      )}
    </>
  );
}