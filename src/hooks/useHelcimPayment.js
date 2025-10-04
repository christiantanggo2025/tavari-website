// hooks/useHelcimPayment.js - Updated Helcim Generation 2 Terminal Integration
import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for Helcim Generation 2 terminal payment processing
 * Handles terminal discovery, payment processing, and connection status
 */
const useHelcimPayment = (businessId) => {
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [availableTerminals, setAvailableTerminals] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helcim API configuration
  const HELCIM_CONFIG = {
    baseUrl: 'https://api.helcim.com/v2',
    apiToken: import.meta.env.VITE_HELCIM_API_TOKEN,
    accountId: import.meta.env.VITE_HELCIM_ACCOUNT_ID
  };

  console.log('Helcim Config:', {
    hasToken: !!HELCIM_CONFIG.apiToken,
    accountId: HELCIM_CONFIG.accountId,
    baseUrl: HELCIM_CONFIG.baseUrl
  });

  /**
   * Make authenticated request to Helcim API
   */
  const makeHelcimRequest = useCallback(async (endpoint, options = {}) => {
    const url = `${HELCIM_CONFIG.baseUrl}${endpoint}`;
    
    const requestOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HELCIM_CONFIG.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...options
    };

    console.log('Making Helcim API request:', { 
      url, 
      method: requestOptions.method,
      hasAuth: !!requestOptions.headers.Authorization 
    });

    try {
      const response = await fetch(url, requestOptions);
      
      console.log('Helcim API response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Helcim API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Helcim API success data:', data);
      return data;
    } catch (err) {
      console.error('Helcim request failed:', err);
      throw err;
    }
  }, [HELCIM_CONFIG.apiToken, HELCIM_CONFIG.baseUrl]);

  /**
   * Check terminal status and fetch available terminals
   */
  const checkTerminalStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Checking terminal status...');
      
      // First, try to get account info to verify API access
      try {
        const accountData = await makeHelcimRequest('/account');
        console.log('Account data received:', accountData);
      } catch (accountErr) {
        console.error('Account check failed:', accountErr);
        setError(`API Access Failed: ${accountErr.message}`);
        setTerminalConnected(false);
        return false;
      }

      // Try to get terminals
      try {
        const terminalsData = await makeHelcimRequest('/terminals');
        console.log('Terminals data received:', terminalsData);
        
        if (terminalsData && terminalsData.terminals) {
          setAvailableTerminals(terminalsData.terminals);
          
          // Check for online terminals
          const onlineTerminals = terminalsData.terminals.filter(terminal => {
            const isOnline = terminal.status === 'online' || 
                            terminal.status === 'connected' || 
                            terminal.connected === true ||
                            terminal.status === 'active';
            console.log(`Terminal ${terminal.id}: status=${terminal.status}, connected=${terminal.connected}, isOnline=${isOnline}`);
            return isOnline;
          });
          
          const hasConnectedTerminal = onlineTerminals.length > 0;
          setTerminalConnected(hasConnectedTerminal);
          
          if (hasConnectedTerminal) {
            console.log(`Found ${onlineTerminals.length} connected terminals`);
            setError(null);
          } else {
            console.log('No terminals are currently online');
            setError('No terminals are currently online. Please check your terminal connection.');
          }
          
          return hasConnectedTerminal;
        } else {
          console.log('No terminals data in response');
          setTerminalConnected(false);
          setAvailableTerminals([]);
          setError('No terminals found in your account');
          return false;
        }
      } catch (terminalsErr) {
        console.error('Terminals fetch failed:', terminalsErr);
        setError(`Terminal Fetch Failed: ${terminalsErr.message}`);
        setTerminalConnected(false);
        setAvailableTerminals([]);
        return false;
      }
      
    } catch (err) {
      console.error('Terminal status check failed:', err);
      setError(err.message);
      setTerminalConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [makeHelcimRequest]);

  /**
   * Initialize terminal connection
   */
  const initializeTerminal = useCallback(async () => {
    console.log('Initializing terminal connection...');
    return await checkTerminalStatus();
  }, [checkTerminalStatus]);

  /**
   * Process payment through terminal
   */
  const processPayment = useCallback(async (amount, terminalId = null) => {
    setIsLoading(true);
    setError(null);

    try {
      // Find an available terminal if none specified
      const targetTerminal = terminalId ? 
        availableTerminals.find(t => t.id === terminalId) :
        availableTerminals.find(t => t.status === 'online' || t.connected);

      if (!targetTerminal) {
        throw new Error('No terminal available for payment processing');
      }

      console.log('Processing payment:', { 
        amount, 
        terminalId: targetTerminal.id,
        terminal: targetTerminal 
      });

      const paymentData = {
        amount: parseFloat(amount).toFixed(2),
        currency: 'CAD',
        terminalId: targetTerminal.id,
        type: 'purchase'
      };

      const response = await makeHelcimRequest('/payment/terminal', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      console.log('Payment response:', response);
      return { success: true, data: response };
    } catch (err) {
      console.error('Payment processing failed:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [makeHelcimRequest, availableTerminals]);

  /**
   * Get detailed terminal information
   */
  const getTerminalInfo = useCallback(() => {
    return {
      connected: terminalConnected,
      count: availableTerminals.length,
      terminals: availableTerminals,
      config: {
        hasApiToken: !!HELCIM_CONFIG.apiToken,
        accountId: HELCIM_CONFIG.accountId,
        baseUrl: HELCIM_CONFIG.baseUrl
      }
    };
  }, [terminalConnected, availableTerminals, HELCIM_CONFIG]);

  // Auto-initialize on mount if we have required config
  useEffect(() => {
    if (HELCIM_CONFIG.apiToken && HELCIM_CONFIG.accountId) {
      console.log('Auto-initializing Helcim terminal...');
      checkTerminalStatus();
    } else {
      console.warn('Missing Helcim configuration:', {
        hasToken: !!HELCIM_CONFIG.apiToken,
        hasAccountId: !!HELCIM_CONFIG.accountId
      });
      setError('Missing Helcim API credentials in environment variables');
    }
  }, [checkTerminalStatus, HELCIM_CONFIG.apiToken, HELCIM_CONFIG.accountId]);

  return {
    // State
    terminalConnected,
    availableTerminals,
    error,
    isLoading,
    
    // Actions
    initializeTerminal,
    checkTerminalStatus,
    processPayment,
    getTerminalInfo,
    
    // Legacy compatibility
    terminalStatus: terminalConnected ? 'connected' : 'disconnected'
  };
};

export default useHelcimPayment;