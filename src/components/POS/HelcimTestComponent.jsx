// components/POS/HelcimTestComponent.jsx - Enhanced Helcim Integration Test
import React, { useState, useEffect } from 'react';
import useHelcimPayment from '../../hooks/useHelcimPayment';
import { TavariStyles } from '../../utils/TavariStyles';

/**
 * Enhanced test component to verify Helcim integration works
 */
const HelcimTestComponent = ({ businessId }) => {
  const {
    terminalConnected,
    availableTerminals,
    error,
    isLoading,
    initializeTerminal,
    checkTerminalStatus,
    getTerminalInfo
  } = useHelcimPayment(businessId);

  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const addTestResult = (test, result, details = '') => {
    setTestResults(prev => [...prev, {
      test,
      result,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runDetailedTests = async () => {
    setTesting(true);
    setTestResults([]);

    try {
      const info = getTerminalInfo();
      
      // Test 1: Configuration Check
      addTestResult('Configuration Check', 'INFO', 
        `API Token: ${info.config.hasApiToken ? 'Present' : 'Missing'}\n` +
        `Account ID: ${info.config.accountId || 'Missing'}\n` +
        `Base URL: ${info.config.baseUrl}`
      );

      // Test 2: API Authentication
      addTestResult('API Authentication', 'TESTING', 'Verifying API credentials...');
      
      const authResponse = await fetch('https://api.helcim.com/v2/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_HELCIM_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (authResponse.ok) {
        const accountData = await authResponse.json();
        addTestResult('API Authentication', 'SUCCESS', 
          `Account verified: ${accountData.companyName || 'Unknown'}\n` +
          `Account ID: ${accountData.accountId || 'Unknown'}`
        );
      } else {
        const errorText = await authResponse.text();
        addTestResult('API Authentication', 'FAILED', 
          `Status: ${authResponse.status}\nError: ${errorText}`
        );
        return; // Stop if auth fails
      }

      // Test 3: Terminal Discovery
      addTestResult('Terminal Discovery', 'TESTING', 'Fetching available terminals...');
      
      const terminalsResponse = await fetch('https://api.helcim.com/v2/terminals', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_HELCIM_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (terminalsResponse.ok) {
        const terminalsData = await terminalsResponse.json();
        const terminals = terminalsData.terminals || [];
        
        addTestResult('Terminal Discovery', 'SUCCESS', 
          `Found ${terminals.length} terminals in account`
        );

        // Test each terminal
        terminals.forEach((terminal, index) => {
          const status = terminal.status || (terminal.connected ? 'connected' : 'disconnected');
          const resultType = status === 'online' || status === 'connected' ? 'ONLINE' : 'OFFLINE';
          
          addTestResult(`Terminal ${index + 1}`, resultType,
            `ID: ${terminal.id || 'Unknown'}\n` +
            `Status: ${status}\n` +
            `Type: ${terminal.type || 'Unknown'}\n` +
            `Name: ${terminal.name || 'Unnamed'}\n` +
            `Location: ${terminal.location || 'Unknown'}`
          );
        });

        if (terminals.length === 0) {
          addTestResult('Terminal Status', 'WARNING', 
            'No terminals found in account. Please ensure your terminal is properly registered.'
          );
        }
      } else {
        const errorText = await terminalsResponse.text();
        addTestResult('Terminal Discovery', 'FAILED', 
          `Status: ${terminalsResponse.status}\nError: ${errorText}`
        );
      }

      // Test 4: Hook Integration
      addTestResult('Hook Integration', 'TESTING', 'Testing React hook integration...');
      const hookResult = await checkTerminalStatus();
      addTestResult('Hook Integration', hookResult ? 'SUCCESS' : 'FAILED',
        `Hook reports ${availableTerminals.length} terminals\n` +
        `Connection status: ${terminalConnected ? 'Connected' : 'Disconnected'}\n` +
        `Error: ${error || 'None'}`
      );

    } catch (err) {
      addTestResult('Test Error', 'FAILED', `Unexpected error: ${err.message}`);
      console.error('Test error:', err);
    } finally {
      setTesting(false);
    }
  };

  // Auto-run tests on mount
  useEffect(() => {
    if (!testing && testResults.length === 0) {
      runDetailedTests();
    }
  }, []);

  const styles = {
    container: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      maxWidth: '1000px',
      margin: '20px auto'
    },
    
    header: {
      textAlign: 'center',
      marginBottom: TavariStyles.spacing.xl
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },
    
    statusCard: {
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.md,
      marginBottom: TavariStyles.spacing.lg,
      textAlign: 'center',
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    statusConnected: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.successText,
      border: `2px solid ${TavariStyles.colors.success}`
    },
    
    statusDisconnected: {
      backgroundColor: TavariStyles.colors.errorBg,
      color: TavariStyles.colors.errorText,
      border: `2px solid ${TavariStyles.colors.danger}`
    },
    
    button: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      marginRight: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.md
    },
    
    buttonSecondary: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      marginRight: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.md
    },
    
    results: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    
    resultItem: {
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.md,
      border: '1px solid #e5e7eb'
    },
    
    resultSuccess: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
    resultFailed: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
    resultTesting: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
    resultWarning: { backgroundColor: '#fef3c7', borderColor: '#d97706' },
    resultOnline: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
    resultOffline: { backgroundColor: '#fef3c7', borderColor: '#d97706' },
    resultInfo: { backgroundColor: '#f0f9ff', borderColor: '#0284c7' },
    
    resultHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: TavariStyles.spacing.xs
    },
    
    testName: {
      fontWeight: TavariStyles.typography.fontWeight.bold,
      fontSize: TavariStyles.typography.fontSize.base
    },
    
    testResult: {
      fontWeight: TavariStyles.typography.fontWeight.medium,
      fontSize: TavariStyles.typography.fontSize.sm,
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: 'rgba(0,0,0,0.1)'
    },
    
    testDetails: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      whiteSpace: 'pre-line',
      lineHeight: '1.4'
    },
    
    timestamp: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500,
      marginTop: TavariStyles.spacing.xs
    }
  };

  const getResultStyle = (result) => {
    const baseStyle = styles.resultItem;
    switch (result) {
      case 'SUCCESS': return { ...baseStyle, ...styles.resultSuccess };
      case 'FAILED': return { ...baseStyle, ...styles.resultFailed };
      case 'TESTING': return { ...baseStyle, ...styles.resultTesting };
      case 'WARNING': return { ...baseStyle, ...styles.resultWarning };
      case 'ONLINE': return { ...baseStyle, ...styles.resultOnline };
      case 'OFFLINE': return { ...baseStyle, ...styles.resultOffline };
      case 'INFO': return { ...baseStyle, ...styles.resultInfo };
      default: return baseStyle;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Helcim Generation 2 Terminal Test</h2>
        <p>Complete diagnostic test for your Helcim terminal integration</p>
        
        <div style={{
          ...styles.statusCard,
          ...(terminalConnected ? styles.statusConnected : styles.statusDisconnected)
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>
            Terminal Status: {terminalConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
          <div style={{ fontSize: '14px' }}>
            Found {availableTerminals.length} terminal(s) | Account: 2500681603
          </div>
          {error && (
            <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'normal' }}>
              Last Error: {error}
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: TavariStyles.spacing.xl }}>
        <button 
          style={styles.button}
          onClick={runDetailedTests}
          disabled={testing}
        >
          {testing ? 'Running Tests...' : 'Run Full Diagnostic'}
        </button>
        
        <button 
          style={styles.buttonSecondary}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
        
        <button 
          style={styles.buttonSecondary}
          onClick={checkTerminalStatus}
          disabled={isLoading}
        >
          {isLoading ? 'Checking...' : 'Refresh Status'}
        </button>
      </div>

      {showDetails && testResults.length > 0 && (
        <div style={styles.results}>
          <h3 style={{ marginBottom: TavariStyles.spacing.md }}>Test Results:</h3>
          {testResults.map((result, index) => (
            <div key={index} style={getResultStyle(result.result)}>
              <div style={styles.resultHeader}>
                <div style={styles.testName}>{result.test}</div>
                <div style={styles.testResult}>{result.result}</div>
              </div>
              {result.details && (
                <div style={styles.testDetails}>{result.details}</div>
              )}
              <div style={styles.timestamp}>[{result.timestamp}]</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HelcimTestComponent;