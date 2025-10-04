// components/POS/HelcimBackendIntegration.jsx - Backend Integration Guide
import React, { useState } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

/**
 * Component that explains and demonstrates the proper backend integration
 * approach for Helcim Generation 2 terminals
 */
const HelcimBackendIntegration = () => {
  const [showCode, setShowCode] = useState(false);
  const [selectedExample, setSelectedExample] = useState('endpoint');

  const examples = {
    endpoint: {
      title: 'Backend API Endpoint (Node.js/Express)',
      language: 'javascript',
      code: `// routes/helcim.js - Backend endpoint for Helcim terminal integration
const express = require('express');
const router = express.Router();

// Helcim configuration from environment variables
const HELCIM_CONFIG = {
  baseUrl: 'https://api.helcim.com/v2',
  apiToken: process.env.HELCIM_API_TOKEN,
  accountId: process.env.HELCIM_ACCOUNT_ID
};

// Get terminal status
router.get('/terminals', async (req, res) => {
  try {
    const response = await fetch(\`\${HELCIM_CONFIG.baseUrl}/terminals\`, {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${HELCIM_CONFIG.apiToken}\`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(\`Helcim API error: \${response.status}\`);
    }

    const data = await response.json();
    res.json({
      success: true,
      terminals: data.terminals || [],
      count: data.terminals?.length || 0
    });
  } catch (error) {
    console.error('Helcim terminals fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process terminal payment
router.post('/payment', async (req, res) => {
  try {
    const { amount, terminalId, currency = 'CAD' } = req.body;

    if (!amount || !terminalId) {
      return res.status(400).json({
        success: false,
        error: 'Amount and terminal ID are required'
      });
    }

    const paymentData = {
      amount: parseFloat(amount).toFixed(2),
      currency,
      terminalId,
      type: 'purchase'
    };

    const response = await fetch(\`\${HELCIM_CONFIG.baseUrl}/payment/terminal\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${HELCIM_CONFIG.apiToken}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || \`Payment failed: \${response.status}\`);
    }

    res.json({
      success: true,
      transaction: data,
      transactionId: data.transactionId
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;`
    },
    
    frontend: {
      title: 'Frontend Service (React)',
      language: 'javascript',
      code: `// services/helcimService.js - Frontend service for backend integration
class HelcimService {
  constructor(baseUrl = '/api/helcim') {
    this.baseUrl = baseUrl;
  }

  async makeRequest(endpoint, options = {}) {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || \`Request failed: \${response.status}\`);
    }

    return data;
  }

  // Get available terminals
  async getTerminals() {
    return this.makeRequest('/terminals');
  }

  // Process payment through terminal
  async processPayment(amount, terminalId) {
    return this.makeRequest('/payment', {
      method: 'POST',
      body: JSON.stringify({
        amount: parseFloat(amount),
        terminalId,
        currency: 'CAD'
      })
    });
  }

  // Check terminal status
  async checkTerminalStatus(terminalId) {
    return this.makeRequest(\`/terminals/\${terminalId}/status\`);
  }
}

export default new HelcimService();

// Usage in React component:
import { useState } from 'react';
import helcimService from '../services/helcimService';

export const useHelcimTerminal = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processPayment = async (amount, terminalId) => {
    setLoading(true);
    setError(null);

    try {
      const result = await helcimService.processPayment(amount, terminalId);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { processPayment, loading, error };
};`
    },
    
    supabase: {
      title: 'Supabase Edge Function',
      language: 'javascript',
      code: `// supabase/functions/helcim-terminal/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()
    
    const HELCIM_CONFIG = {
      baseUrl: 'https://api.helcim.com/v2',
      apiToken: Deno.env.get('HELCIM_API_TOKEN'),
      accountId: Deno.env.get('HELCIM_ACCOUNT_ID')
    }

    let result;

    switch (action) {
      case 'getTerminals':
        const terminalsResponse = await fetch(\`\${HELCIM_CONFIG.baseUrl}/terminals\`, {
          headers: {
            'Authorization': \`Bearer \${HELCIM_CONFIG.apiToken}\`,
            'Content-Type': 'application/json'
          }
        });
        result = await terminalsResponse.json();
        break;

      case 'processPayment':
        const paymentResponse = await fetch(\`\${HELCIM_CONFIG.baseUrl}/payment/terminal\`, {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${HELCIM_CONFIG.apiToken}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: data.amount,
            terminalId: data.terminalId,
            currency: data.currency || 'CAD',
            type: 'purchase'
          })
        });
        result = await paymentResponse.json();
        break;

      default:
        throw new Error(\`Unknown action: \${action}\`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})`
    }
  };

  const styles = {
    container: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      maxWidth: '1000px',
      margin: '20px auto'
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.lg,
      textAlign: 'center'
    },
    
    explanation: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.xl,
      backgroundColor: TavariStyles.colors.infoBg,
      border: `2px solid ${TavariStyles.colors.info}`
    },
    
    problem: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.errorBg,
      border: `2px solid ${TavariStyles.colors.danger}`
    },
    
    solution: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.successBg,
      border: `2px solid ${TavariStyles.colors.success}`
    },
    
    tabContainer: {
      display: 'flex',
      marginBottom: TavariStyles.spacing.md,
      borderBottom: `2px solid ${TavariStyles.colors.gray200}`
    },
    
    tab: {
      padding: TavariStyles.spacing.md,
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      marginRight: TavariStyles.spacing.md,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    activeTab: {
      borderBottomColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.primary,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    
    codeBlock: {
      backgroundColor: '#f8f9fa',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.md,
      padding: TavariStyles.spacing.lg,
      overflow: 'auto',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontFamily: TavariStyles.typography.fontFamilyMono,
      lineHeight: '1.5'
    },
    
    button: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      marginBottom: TavariStyles.spacing.md
    },
    
    steps: {
      listStyle: 'none',
      padding: 0
    },
    
    step: {
      padding: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      borderLeft: `4px solid ${TavariStyles.colors.primary}`
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Helcim Terminal Backend Integration</h2>
      
      <div style={styles.problem}>
        <h3>🚫 Current Issue: CORS Error</h3>
        <p>
          The "Failed to fetch" error occurs because Helcim's API doesn't allow direct calls 
          from browser applications due to CORS (Cross-Origin Resource Sharing) restrictions.
        </p>
        <p>
          <strong>Browser → Helcim API = ❌ Blocked</strong>
        </p>
      </div>

      <div style={styles.solution}>
        <h3>✅ Solution: Backend Proxy</h3>
        <p>
          Create a backend endpoint that acts as a proxy between your frontend and Helcim's API.
        </p>
        <p>
          <strong>Browser → Your Backend → Helcim API = ✅ Works</strong>
        </p>
      </div>

      <div style={styles.explanation}>
        <h3>📋 Implementation Steps</h3>
        <ol style={styles.steps}>
          <li style={styles.step}>
            <strong>1. Create Backend Endpoint</strong><br/>
            Set up a server route that handles Helcim API calls
          </li>
          <li style={styles.step}>
            <strong>2. Secure API Credentials</strong><br/>
            Store Helcim API token in backend environment variables
          </li>
          <li style={styles.step}>
            <strong>3. Frontend Service</strong><br/>
            Create a service that calls your backend instead of Helcim directly
          </li>
          <li style={styles.step}>
            <strong>4. Test Integration</strong><br/>
            Verify terminal connection and payment processing works
          </li>
        </ol>
      </div>

      <button 
        style={styles.button}
        onClick={() => setShowCode(!showCode)}
      >
        {showCode ? 'Hide Code Examples' : 'Show Code Examples'}
      </button>

      {showCode && (
        <>
          <div style={styles.tabContainer}>
            {Object.entries(examples).map(([key, example]) => (
              <div
                key={key}
                style={{
                  ...styles.tab,
                  ...(selectedExample === key ? styles.activeTab : {})
                }}
                onClick={() => setSelectedExample(key)}
              >
                {example.title}
              </div>
            ))}
          </div>

          <div style={styles.codeBlock}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {examples[selectedExample].code}
            </pre>
          </div>
        </>
      )}

      <div style={styles.explanation}>
        <h3>🎯 Next Steps for Your Integration</h3>
        <p>
          <strong>Option 1:</strong> Use Supabase Edge Functions (recommended for your setup)<br/>
          <strong>Option 2:</strong> Add Express.js backend endpoints<br/>
          <strong>Option 3:</strong> Use the workflow component above for payment processing
        </p>
        <p>
          The workflow component provides a complete payment interface that can be 
          connected to your backend when ready.
        </p>
      </div>
    </div>
  );
};

export default HelcimBackendIntegration;