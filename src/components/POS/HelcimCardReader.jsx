// components/POS/HelcimCardReader.jsx - Helcim 2nd Gen Terminal Interface Component
import React, { useState, useEffect } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import useHelcimPayment from '../../hooks/useHelcimPayment';

/**
 * Helcim Card Reader Interface Component
 * Handles card payment processing through Helcim 2nd Gen terminal
 * 
 * @param {Object} props
 * @param {number} props.amount - Payment amount in cents
 * @param {string} props.currency - Currency code (default: CAD)
 * @param {string} props.saleId - POS sale ID for tracking
 * @param {string} props.description - Transaction description
 * @param {Function} props.onPaymentSuccess - Callback for successful payment
 * @param {Function} props.onPaymentError - Callback for payment errors
 * @param {Function} props.onCancel - Callback for cancellation
 * @param {string} props.businessId - Business ID for transaction tracking
 * @param {boolean} props.isVisible - Whether the component is visible
 * @returns {React.ReactNode} Helcim card reader interface
 */
const HelcimCardReader = ({
  amount,
  currency = 'CAD',
  saleId,
  description,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
  businessId,
  isVisible = true
}) => {
  const {
    isProcessing,
    terminalConnected,
    error,
    initializeTerminal,
    processPayment,
    cancelTransaction,
    checkTerminalStatus
  } = useHelcimPayment(businessId);

  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [paymentStep, setPaymentStep] = useState('ready'); // ready, processing, success, error
  const [retryCount, setRetryCount] = useState(0);

  // Format amount for display
  const formatAmount = (amountInCents) => {
    return (amountInCents / 100).toFixed(2);
  };

  // Initialize terminal connection when component mounts
  useEffect(() => {
    if (isVisible && businessId) {
      checkConnection();
    }
  }, [isVisible, businessId]);

  // Check terminal connection status
  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const isConnected = await checkTerminalStatus();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch (err) {
      console.error('Terminal connection check failed:', err);
      setConnectionStatus('disconnected');
    }
  };

  // Process the card payment
  const handleProcessPayment = async () => {
    if (!terminalConnected) {
      onPaymentError?.('Terminal not connected. Please check connection and try again.');
      return;
    }

    setPaymentStep('processing');

    try {
      const paymentData = {
        amount,
        currency,
        saleId,
        description: description || `POS Sale ${saleId}`,
        terminalName: 'Tavari-POS'
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        setPaymentStep('success');
        
        // Call success callback with payment details
        onPaymentSuccess?.({
          type: 'helcim_card',
          amount,
          transactionId: result.transactionId,
          approvalCode: result.approvalCode,
          cardType: result.cardType,
          lastFour: result.lastFour,
          message: result.message
        });
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      setPaymentStep('error');
      onPaymentError?.(err.message);
    }
  };

  // Cancel current transaction
  const handleCancelPayment = async () => {
    if (isProcessing) {
      try {
        await cancelTransaction();
      } catch (err) {
        console.error('Cancel transaction error:', err);
      }
    }
    setPaymentStep('ready');
    onCancel?.();
  };

  // Retry connection
  const handleRetryConnection = async () => {
    setRetryCount(prev => prev + 1);
    await checkConnection();
  };

  // Retry payment
  const handleRetryPayment = () => {
    setPaymentStep('ready');
    handleProcessPayment();
  };

  const styles = {
    container: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      maxWidth: '500px',
      margin: '0 auto',
      textAlign: 'center'
    },
    
    header: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.lg
    },
    
    amount: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.xl
    },
    
    status: {
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.md,
      marginBottom: TavariStyles.spacing.lg,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    statusConnected: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.successText,
      border: `1px solid ${TavariStyles.colors.success}`
    },
    
    statusDisconnected: {
      backgroundColor: TavariStyles.colors.errorBg,
      color: TavariStyles.colors.errorText,
      border: `1px solid ${TavariStyles.colors.danger}`
    },
    
    statusChecking: {
      backgroundColor: TavariStyles.colors.infoBg,
      color: TavariStyles.colors.infoText,
      border: `1px solid ${TavariStyles.colors.info}`
    },
    
    instructions: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xl,
      lineHeight: TavariStyles.typography.lineHeight.relaxed
    },
    
    processingIndicator: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.xl
    },
    
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #f3f4f6',
      borderTop: '4px solid #008080',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      justifyContent: 'center',
      marginTop: TavariStyles.spacing.xl
    },
    
    primaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg
    },
    
    secondaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.lg
    },
    
    dangerButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.danger,
      ...TavariStyles.components.button.sizes.lg
    },
    
    successIcon: {
      fontSize: '48px',
      color: TavariStyles.colors.success,
      marginBottom: TavariStyles.spacing.lg
    },
    
    errorIcon: {
      fontSize: '48px',
      color: TavariStyles.colors.danger,
      marginBottom: TavariStyles.spacing.lg
    },
    
    terminalInfo: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      marginTop: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md
    }
  };

  if (!isVisible) {
    return null;
  }

  // Connection Status Display
  const renderConnectionStatus = () => {
    let statusStyle = styles.statusChecking;
    let statusText = 'Checking terminal connection...';
    
    if (connectionStatus === 'connected' && terminalConnected) {
      statusStyle = { ...styles.status, ...styles.statusConnected };
      statusText = '✓ Terminal connected and ready';
    } else if (connectionStatus === 'disconnected' || !terminalConnected) {
      statusStyle = { ...styles.status, ...styles.statusDisconnected };
      statusText = '✗ Terminal not connected';
    }

    return (
      <div style={statusStyle}>
        {statusText}
      </div>
    );
  };

  // Payment Step Content
  const renderPaymentContent = () => {
    switch (paymentStep) {
      case 'processing':
        return (
          <>
            <div style={styles.processingIndicator}>
              <div style={styles.spinner}></div>
              <span>Processing payment...</span>
            </div>
            <p style={styles.instructions}>
              Please follow the prompts on the terminal to complete your payment.
              Insert, tap, or swipe your card when prompted.
            </p>
            <div style={styles.buttonGroup}>
              <button 
                style={styles.dangerButton}
                onClick={handleCancelPayment}
                disabled={!isProcessing}
              >
                Cancel Payment
              </button>
            </div>
          </>
        );
        
      case 'success':
        return (
          <>
            <div style={styles.successIcon}>✓</div>
            <p style={styles.instructions}>
              Payment processed successfully!
            </p>
          </>
        );
        
      case 'error':
        return (
          <>
            <div style={styles.errorIcon}>✗</div>
            <p style={styles.instructions}>
              Payment failed: {error}
            </p>
            <div style={styles.buttonGroup}>
              <button 
                style={styles.primaryButton}
                onClick={handleRetryPayment}
              >
                Retry Payment
              </button>
              <button 
                style={styles.secondaryButton}
                onClick={handleCancelPayment}
              >
                Cancel
              </button>
            </div>
          </>
        );
        
      default: // ready
        return (
          <>
            <p style={styles.instructions}>
              Press "Process Payment" to begin card payment on the terminal.
              Your customer can then insert, tap, or swipe their card.
            </p>
            <div style={styles.buttonGroup}>
              <button 
                style={styles.primaryButton}
                onClick={handleProcessPayment}
                disabled={!terminalConnected || isProcessing}
              >
                Process Payment
              </button>
              <button 
                style={styles.secondaryButton}
                onClick={handleCancelPayment}
              >
                Cancel
              </button>
            </div>
            {(!terminalConnected || connectionStatus === 'disconnected') && (
              <div style={styles.buttonGroup}>
                <button 
                  style={styles.secondaryButton}
                  onClick={handleRetryConnection}
                >
                  Retry Connection {retryCount > 0 && `(${retryCount})`}
                </button>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div style={styles.container}>
      {/* Add CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <h2 style={styles.header}>Helcim Card Payment</h2>
      
      <div style={styles.amount}>
        ${formatAmount(amount)} {currency}
      </div>
      
      {renderConnectionStatus()}
      
      {renderPaymentContent()}
      
        <div style={styles.terminalInfo}>
          Account ID: {businessId ? '2500681603' : 'Not configured'}<br/>
          Transaction: {saleId || 'N/A'}
        </div>
    </div>
  );
};

export default HelcimCardReader;