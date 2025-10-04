// components/POS/HelcimTerminalWorkflow.jsx - Terminal Integration Workflow
import React, { useState } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

/**
 * Helcim Terminal workflow component that guides users through terminal setup
 * and provides payment processing interface without direct API calls
 */
const HelcimTerminalWorkflow = ({ businessId, onPaymentComplete }) => {
  const [currentStep, setCurrentStep] = useState('check');
  const [terminalStatus, setTerminalStatus] = useState('unknown');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [lastPaymentResult, setLastPaymentResult] = useState(null);

  // Mock terminal check (replace with actual backend call later)
  const checkTerminalConnection = () => {
    setCurrentStep('checking');
    
    // Simulate checking process
    setTimeout(() => {
      // For now, we'll assume terminal is connected if we have config
      const hasConfig = import.meta.env.VITE_HELCIM_API_TOKEN && 
                       import.meta.env.VITE_HELCIM_ACCOUNT_ID;
      
      if (hasConfig) {
        setTerminalStatus('connected');
        setCurrentStep('ready');
      } else {
        setTerminalStatus('config_missing');
        setCurrentStep('setup');
      }
    }, 2000);
  };

  const processPayment = () => {
    if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    setPaymentInProgress(true);
    setCurrentStep('processing');

    // Simulate payment processing
    // In a real implementation, this would:
    // 1. Call your backend
    // 2. Backend calls Helcim API
    // 3. Return result to frontend
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate for demo
      
      const result = {
        success,
        amount: paymentAmount,
        transactionId: success ? `TXN_${Date.now()}` : null,
        error: success ? null : 'Payment declined - insufficient funds',
        timestamp: new Date().toISOString()
      };

      setLastPaymentResult(result);
      setPaymentInProgress(false);
      setCurrentStep(success ? 'success' : 'error');

      if (success && onPaymentComplete) {
        onPaymentComplete(result);
      }
    }, 3000);
  };

  const resetWorkflow = () => {
    setCurrentStep('ready');
    setPaymentAmount('');
    setLastPaymentResult(null);
  };

  const styles = {
    container: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      maxWidth: '600px',
      margin: '20px auto',
      textAlign: 'center'
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.lg
    },
    
    stepCard: {
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.lg,
      marginBottom: TavariStyles.spacing.lg,
      border: '2px solid'
    },
    
    stepConnected: {
      backgroundColor: TavariStyles.colors.successBg,
      borderColor: TavariStyles.colors.success,
      color: TavariStyles.colors.successText
    },
    
    stepWarning: {
      backgroundColor: TavariStyles.colors.warningBg,
      borderColor: TavariStyles.colors.warning,
      color: TavariStyles.colors.warningText
    },
    
    stepError: {
      backgroundColor: TavariStyles.colors.errorBg,
      borderColor: TavariStyles.colors.danger,
      color: TavariStyles.colors.errorText
    },
    
    stepInfo: {
      backgroundColor: TavariStyles.colors.infoBg,
      borderColor: TavariStyles.colors.info,
      color: TavariStyles.colors.infoText
    },
    
    button: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.lg,
      marginRight: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.md
    },
    
    buttonSecondary: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.lg,
      marginRight: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.md
    },
    
    input: {
      ...TavariStyles.components.form.input,
      fontSize: TavariStyles.typography.fontSize.xl,
      textAlign: 'center',
      marginBottom: TavariStyles.spacing.lg,
      maxWidth: '200px',
      margin: `0 auto ${TavariStyles.spacing.lg} auto`
    },
    
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #f3f4f6',
      borderTop: '4px solid #008080',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 20px auto'
    },
    
    icon: {
      fontSize: '48px',
      marginBottom: TavariStyles.spacing.md
    },
    
    details: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginTop: TavariStyles.spacing.md,
      lineHeight: '1.5'
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'check':
        return (
          <div style={styles.stepCard}>
            <div style={styles.icon}>🔌</div>
            <h3>Helcim Terminal Integration</h3>
            <p>Check if your Helcim Generation 2 terminal is ready for payments</p>
            <button style={styles.button} onClick={checkTerminalConnection}>
              Check Terminal Connection
            </button>
            <div style={styles.details}>
              Account ID: {import.meta.env.VITE_HELCIM_ACCOUNT_ID || 'Not configured'}<br/>
              API Token: {import.meta.env.VITE_HELCIM_API_TOKEN ? 'Present' : 'Missing'}
            </div>
          </div>
        );

      case 'checking':
        return (
          <div style={{ ...styles.stepCard, ...styles.stepInfo }}>
            <div style={styles.spinner}></div>
            <h3>Checking Terminal Status...</h3>
            <p>Verifying connection to your Helcim terminal</p>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        );

      case 'setup':
        return (
          <div style={{ ...styles.stepCard, ...styles.stepWarning }}>
            <div style={styles.icon}>⚠️</div>
            <h3>Configuration Required</h3>
            <p>Your Helcim terminal configuration is incomplete</p>
            <div style={styles.details}>
              <strong>Required:</strong><br/>
              • VITE_HELCIM_API_TOKEN in .env file<br/>
              • VITE_HELCIM_ACCOUNT_ID in .env file<br/>
              • Terminal registered with Helcim account
            </div>
            <button style={styles.buttonSecondary} onClick={() => setCurrentStep('check')}>
              Back to Check
            </button>
          </div>
        );

      case 'ready':
        return (
          <div style={{ ...styles.stepCard, ...styles.stepConnected }}>
            <div style={styles.icon}>✅</div>
            <h3>Terminal Ready</h3>
            <p>
              {terminalStatus === 'manually_configured' 
                ? `Terminal configured with serial: ${localStorage.getItem('helcim_terminal_serial')}`
                : 'Your Helcim terminal is configured and ready for payments'
              }
            </p>
            
            <div style={{ margin: TavariStyles.spacing.lg }}>
              <label style={{ display: 'block', marginBottom: TavariStyles.spacing.sm }}>
                Payment Amount (CAD)
              </label>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            
            <button 
              style={styles.button} 
              onClick={processPayment}
              disabled={!paymentAmount}
            >
              Process Payment
            </button>
            <button style={styles.buttonSecondary} onClick={checkTerminalConnection}>
              Recheck Connection
            </button>
            
            {terminalStatus === 'manually_configured' && (
              <button 
                style={styles.buttonSecondary} 
                onClick={() => {
                  localStorage.removeItem('helcim_terminal_serial');
                  setCurrentStep('check');
                  setShowManualConfig(false);
                }}
              >
                Reset Configuration
              </button>
            )}
          </div>
        );

      case 'processing':
        return (
          <div style={{ ...styles.stepCard, ...styles.stepInfo }}>
            <div style={styles.spinner}></div>
            <h3>Processing Payment...</h3>
            <p>Amount: ${paymentAmount} CAD</p>
            <p>Please follow prompts on your terminal</p>
            <div style={styles.details}>
              This may take up to 30 seconds
            </div>
          </div>
        );

      case 'success':
        return (
          <div style={{ ...styles.stepCard, ...styles.stepConnected }}>
            <div style={styles.icon}>🎉</div>
            <h3>Payment Successful!</h3>
            <p>Amount: ${lastPaymentResult?.amount} CAD</p>
            <div style={styles.details}>
              Transaction ID: {lastPaymentResult?.transactionId}<br/>
              Time: {new Date(lastPaymentResult?.timestamp).toLocaleString()}
            </div>
            <button style={styles.button} onClick={resetWorkflow}>
              Process Another Payment
            </button>
          </div>
        );

      case 'error':
        return (
          <div style={{ ...styles.stepCard, ...styles.stepError }}>
            <div style={styles.icon}>❌</div>
            <h3>Payment Failed</h3>
            <p>Amount: ${lastPaymentResult?.amount} CAD</p>
            <div style={styles.details}>
              Error: {lastPaymentResult?.error}<br/>
              Time: {new Date(lastPaymentResult?.timestamp).toLocaleString()}
            </div>
            <button style={styles.button} onClick={resetWorkflow}>
              Try Again
            </button>
            <button style={styles.buttonSecondary} onClick={checkTerminalConnection}>
              Check Connection
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Helcim Terminal Payment</h2>
      {renderStep()}
    </div>
  );
};

export default HelcimTerminalWorkflow;