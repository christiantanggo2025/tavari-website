// screens/Mail/BillingManager.jsx - Fixed to prevent infinite requests
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { 
  FiDollarSign, FiMail, FiTrendingUp, FiCalendar, FiDownload, 
  FiPause, FiPlay, FiCreditCard, FiPieChart, FiSettings,
  FiAlertCircle, FiCheckCircle, FiRefreshCw, FiInfo, FiWifi, FiWifiOff
} from 'react-icons/fi';

const BillingManager = () => {
  const { business } = useBusiness();
  const businessId = business?.id;
  const loadedBusinessId = useRef(null);
  const mountedRef = useRef(true);
  
  const [currentBilling, setCurrentBilling] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const loadBillingData = useCallback(async () => {
    if (!businessId || !mountedRef.current) {
      console.log('🛑 Billing data load skipped - no business ID or component unmounted');
      return;
    }

    // Prevent duplicate loads for the same business
    if (businessId === loadedBusinessId.current) {
      console.log('🛑 Billing data already loaded for this business');
      return;
    }

    console.log('📊 Loading billing data for business:', businessId);
    setLoading(true);
    setError(null);
    setNetworkError(false);
    
    try {
      // Rate limiting check
      const now = Date.now();
      const lastRequest = window.lastBillingRequest || 0;
      if (now - lastRequest < 2000) {
        console.log('🛑 Rate limiting billing request');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      window.lastBillingRequest = now;

      // Get current billing period
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      console.log('📅 Loading billing for period:', {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0]
      });

      // Single query with timeout
      const billingPromise = supabase
        .from('mail_billing')
        .select('*')
        .eq('business_id', businessId)
        .gte('billing_period_start', startOfMonth.toISOString().split('T')[0])
        .lte('billing_period_end', endOfMonth.toISOString().split('T')[0])
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const { data: currentBillingData, error: billingError } = await Promise.race([
        billingPromise,
        timeoutPromise
      ]);

      if (!mountedRef.current) return;

      if (billingError) {
        console.error('❌ Billing query error:', billingError);
        throw billingError;
      }

      console.log('✅ Billing data loaded:', currentBillingData);

      // Create demo data if no billing record exists
      if (!currentBillingData) {
        console.log('📝 Creating demo billing record');
        
        const mockBilling = {
          id: 'demo-billing-record',
          business_id: businessId,
          billing_period_start: startOfMonth.toISOString().split('T')[0],
          billing_period_end: endOfMonth.toISOString().split('T')[0],
          included_emails: 5000,
          emails_used: 0,
          overage_emails: 0,
          overage_rate: 0.0025,
          total_amount: 0,
          status: 'active'
        };
        
        setCurrentBilling(mockBilling);
        setUsageHistory([mockBilling]);
      } else {
        setCurrentBilling(currentBillingData);
        setIsPaused(currentBillingData.status === 'paused');
        
        // Load history only if current data exists
        try {
          const { data: historyData } = await supabase
            .from('mail_billing')
            .select('*')
            .eq('business_id', businessId)
            .order('billing_period_start', { ascending: false })
            .limit(6); // Reduced limit

          if (mountedRef.current) {
            setUsageHistory(historyData || []);
          }
        } catch (historyErr) {
          console.warn('⚠️ History load failed:', historyErr);
          setUsageHistory([currentBillingData]);
        }
      }

      loadedBusinessId.current = businessId;
      setRetryCount(0);

    } catch (err) {
      console.error('❌ Billing error:', err);
      
      if (!mountedRef.current) return;
      
      // Check for network issues
      if (err.message.includes('fetch') || 
          err.message.includes('timeout') ||
          err.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
        
        setNetworkError(true);
        setError('Network connection issue. Using demo data.');
        
        // Create demo data
        const demoBilling = {
          id: 'demo-billing-record',
          business_id: businessId,
          billing_period_start: new Date().toISOString().split('T')[0].slice(0, 8) + '01',
          billing_period_end: new Date().toISOString().split('T')[0],
          included_emails: 5000,
          emails_used: 0,
          overage_emails: 0,
          overage_rate: 0.0025,
          total_amount: 0,
          status: 'active'
        };
        
        setCurrentBilling(demoBilling);
        setUsageHistory([demoBilling]);
        loadedBusinessId.current = businessId;
      } else {
        setError(`Failed to load billing data: ${err.message}`);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [businessId]);

  // Only load data when businessId actually changes
  useEffect(() => {
    console.log('🎯 BillingManager useEffect triggered:', { businessId, loaded: loadedBusinessId.current });
    
    if (businessId && businessId !== loadedBusinessId.current) {
      loadBillingData();
    } else if (!businessId) {
      setLoading(false);
      setCurrentBilling(null);
      setUsageHistory([]);
      loadedBusinessId.current = null;
    }
  }, [businessId, loadBillingData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRetry = useCallback(() => {
    if (retryCount >= 3) {
      alert('Maximum retry attempts reached. Please refresh the page.');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    loadedBusinessId.current = null; // Reset to force reload
    loadBillingData();
  }, [retryCount, loadBillingData]);

  const calculateCurrentUsage = useCallback(() => {
    if (!currentBilling) return { usagePercent: 0, remainingEmails: 0, isOverage: false };

    const usagePercent = Math.min((currentBilling.emails_used / currentBilling.included_emails) * 100, 100);
    const remainingEmails = Math.max(currentBilling.included_emails - currentBilling.emails_used, 0);
    const isOverage = currentBilling.emails_used > currentBilling.included_emails;

    return { usagePercent, remainingEmails, isOverage };
  }, [currentBilling]);

  const calculateCosts = useCallback(() => {
    if (!currentBilling) return { monthlyBase: 0, overageCost: 0, totalCost: 0 };

    const monthlyBase = isPaused ? 5.00 : 0;
    const overageCost = currentBilling.overage_emails * currentBilling.overage_rate;
    const totalCost = monthlyBase + overageCost;

    return { monthlyBase, overageCost, totalCost };
  }, [currentBilling, isPaused]);

  const handlePauseAccount = async () => {
    if (networkError) {
      alert('Cannot modify account status while in demo mode due to network issues.');
      return;
    }
    
    try {
      const newStatus = isPaused ? 'active' : 'paused';
      
      const { error } = await supabase
        .from('mail_billing')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBilling.id);

      if (error) throw error;

      setIsPaused(!isPaused);
      setShowPauseModal(false);
      
      // Force reload billing data
      loadedBusinessId.current = null;
      await loadBillingData();
    } catch (err) {
      console.error('Error updating account status:', err);
      setError(err.message);
    }
  };

  const renderOverviewTab = () => {
    const usage = calculateCurrentUsage();
    const costs = calculateCosts();

    return (
      <div style={styles.tabContent}>
        {/* Network Status Banner */}
        {networkError && (
          <div style={styles.networkBanner}>
            <FiWifiOff style={styles.networkIcon} />
            <div style={styles.networkMessage}>
              <strong>Demo Mode:</strong> Network connection issues detected. 
              Showing sample data. <button style={styles.retryLink} onClick={handleRetry}>Retry Connection</button>
            </div>
          </div>
        )}

        {/* Current Usage Overview */}
        <div style={styles.usageOverview}>
          <h3 style={styles.sectionTitle}>
            <FiMail style={styles.sectionIcon} />
            Current Billing Period
            {networkError && <span style={styles.demoLabel}>(Demo)</span>}
          </h3>
          
          <div style={styles.usageGrid}>
            <div style={styles.usageCard}>
              <div style={styles.usageHeader}>
                <span style={styles.usageLabel}>Emails Used</span>
                <span style={{
                  ...styles.usageValue,
                  color: usage.isOverage ? '#e74c3c' : '#2c3e50'
                }}>
                  {currentBilling?.emails_used || 0}
                </span>
              </div>
              <div style={styles.usageSubtext}>
                of {currentBilling?.included_emails || 5000} included
              </div>
              {usage.isOverage && (
                <div style={styles.overageAlert}>
                  <FiAlertCircle style={styles.alertIcon} />
                  Over limit by {currentBilling.overage_emails} emails
                </div>
              )}
            </div>

            <div style={styles.usageCard}>
              <div style={styles.usageHeader}>
                <span style={styles.usageLabel}>Remaining</span>
                <span style={styles.usageValue}>
                  {usage.remainingEmails}
                </span>
              </div>
              <div style={styles.usageSubtext}>
                emails in current period
              </div>
            </div>

            <div style={styles.usageCard}>
              <div style={styles.usageHeader}>
                <span style={styles.usageLabel}>Usage %</span>
                <span style={styles.usageValue}>
                  {usage.usagePercent.toFixed(1)}%
                </span>
              </div>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${Math.min(usage.usagePercent, 100)}%`,
                    backgroundColor: usage.isOverage ? '#e74c3c' : 
                                   usage.usagePercent > 80 ? '#f39c12' : '#27ae60'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div style={styles.costSection}>
          <h3 style={styles.sectionTitle}>
            <FiDollarSign style={styles.sectionIcon} />
            Cost Breakdown
          </h3>
          
          <div style={styles.costGrid}>
            <div style={styles.costCard}>
              <div style={styles.costHeader}>
                <span style={styles.costLabel}>Base Plan</span>
                <span style={styles.costValue}>
                  ${costs.monthlyBase.toFixed(2)}
                </span>
              </div>
              <div style={styles.costSubtext}>
                {isPaused ? 'Paused account fee' : 'Pay-per-email (no monthly fee)'}
              </div>
            </div>

            <div style={styles.costCard}>
              <div style={styles.costHeader}>
                <span style={styles.costLabel}>Overage Emails</span>
                <span style={styles.costValue}>
                  ${costs.overageCost.toFixed(2)}
                </span>
              </div>
              <div style={styles.costSubtext}>
                {currentBilling?.overage_emails || 0} emails × $0.0025
              </div>
            </div>

            <div style={{...styles.costCard, ...styles.totalCostCard}}>
              <div style={styles.costHeader}>
                <span style={styles.costLabel}>Total This Month</span>
                <span style={{...styles.costValue, ...styles.totalCostValue}}>
                  ${costs.totalCost.toFixed(2)}
                </span>
              </div>
              <div style={styles.costSubtext}>
                Billing period: {currentBilling?.billing_period_start} to {currentBilling?.billing_period_end}
              </div>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div style={styles.statusSection}>
          <h3 style={styles.sectionTitle}>
            <FiSettings style={styles.sectionIcon} />
            Account Status
          </h3>
          
          <div style={styles.statusCard}>
            <div style={styles.statusHeader}>
              <div style={styles.statusInfo}>
                <span style={styles.statusLabel}>
                  {isPaused ? 'Account Paused' : 'Account Active'}
                </span>
                <div style={styles.statusIndicator}>
                  {isPaused ? (
                    <FiPause style={{...styles.statusIcon, color: '#f39c12'}} />
                  ) : (
                    <FiCheckCircle style={{...styles.statusIcon, color: '#27ae60'}} />
                  )}
                </div>
              </div>
              
              <button
                style={isPaused ? styles.resumeButton : styles.pauseButton}
                onClick={() => setShowPauseModal(true)}
                disabled={networkError}
              >
                {isPaused ? (
                  <>
                    <FiPlay style={styles.buttonIcon} />
                    Resume Account
                  </>
                ) : (
                  <>
                    <FiPause style={styles.buttonIcon} />
                    Pause Account
                  </>
                )}
              </button>
            </div>
            
            <div style={styles.statusDescription}>
              {isPaused ? (
                <div style={styles.pausedInfo}>
                  <FiInfo style={styles.infoIcon} />
                  Account is paused. You're charged $5/month to retain data. 
                  Resume anytime to start sending emails again.
                </div>
              ) : (
                <div style={styles.activeInfo}>
                  Pay only for emails sent. First 5,000 emails included, 
                  then $0.0025 per additional email.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state with retry info
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <FiRefreshCw style={{...styles.loadingIcon, animation: 'spin 1s linear infinite'}} />
          <p>Loading billing information...</p>
          {retryCount > 0 && (
            <p style={styles.retryText}>Attempt {retryCount + 1}/3</p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !currentBilling) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <FiAlertCircle style={styles.errorIcon} />
          <h3>Error Loading Billing Data</h3>
          <p>{error}</p>
          <button style={styles.retryButton} onClick={handleRetry}>
            <FiRefreshCw style={styles.buttonIcon} />
            Retry ({retryCount}/3)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          Usage & Billing
          {networkError && <span style={styles.demoLabel}>(Demo Mode)</span>}
        </h2>
        <div style={styles.headerActions}>
          <button style={styles.refreshButton} onClick={handleRetry}>
            <FiRefreshCw style={styles.buttonIcon} />
            {networkError ? 'Retry Connection' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'overview' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('overview')}
        >
          <FiPieChart style={styles.tabIcon} />
          Overview
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'settings' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('settings')}
        >
          <FiSettings style={styles.tabIcon} />
          Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'settings' && (
        <div style={styles.tabContent}>
          <h3 style={styles.sectionTitle}>
            <FiCreditCard style={styles.sectionIcon} />
            Billing Settings
          </h3>
          
          <div style={styles.settingsCard}>
            <h4 style={styles.settingsTitle}>Payment Method</h4>
            <p style={styles.settingsDescription}>
              Billing is handled through Tavari Pay. Contact support to update payment methods.
            </p>
            
            <h4 style={styles.settingsTitle}>Usage Alerts</h4>
            <p style={styles.settingsDescription}>
              You'll receive email alerts when you reach 80% and 100% of your included emails.
            </p>
            
            <h4 style={styles.settingsTitle}>Seasonal Pause</h4>
            <p style={styles.settingsDescription}>
              Perfect for seasonal businesses. Pause your account for $5/month to retain all data 
              while not sending emails. Resume anytime.
            </p>
          </div>
        </div>
      )}

      {/* Pause/Resume Confirmation Modal */}
      {showPauseModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {isPaused ? 'Resume Account' : 'Pause Account'}
              </h3>
            </div>
            
            <div style={styles.modalContent}>
              {networkError ? (
                <div>
                  <p style={{color: '#f39c12'}}>
                    Cannot modify account status while in demo mode due to network issues.
                  </p>
                  <p>Please retry the connection to enable account management.</p>
                </div>
              ) : isPaused ? (
                <div>
                  <p>Resume your account to start sending emails again.</p>
                  <p>You'll return to pay-per-email billing (no monthly fee).</p>
                </div>
              ) : (
                <div>
                  <p>Pausing your account will:</p>
                  <ul style={styles.modalList}>
                    <li>Stop all email sending capabilities</li>
                    <li>Charge $5/month to retain your data</li>
                    <li>Allow you to resume anytime</li>
                  </ul>
                  <p>Perfect for seasonal businesses during off-season.</p>
                </div>
              )}
            </div>
            
            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setShowPauseModal(false)}>
                Cancel
              </button>
              {!networkError && (
                <button
                  style={isPaused ? styles.modalResume : styles.modalPause}
                  onClick={handlePauseAccount}
                >
                  {isPaused ? 'Resume Account' : 'Pause Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// All the styles remain the same
const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  demoLabel: {
    fontSize: '14px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 'normal',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  refreshButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  networkBanner: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  networkIcon: {
    fontSize: '20px',
    color: '#856404',
  },
  networkMessage: {
    color: '#856404',
    fontSize: '14px',
  },
  retryLink: {
    background: 'none',
    border: 'none',
    color: 'teal',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tabs: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '16px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    flex: 1,
    justifyContent: 'center',
  },
  activeTab: {
    color: 'teal',
    backgroundColor: '#f0f9ff',
    borderBottom: '3px solid teal',
  },
  tabIcon: {
    fontSize: '16px',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#666',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    color: 'teal',
  },
  retryText: {
    fontSize: '12px',
    color: '#999',
    marginTop: '10px',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#e74c3c',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  retryButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionIcon: {
    fontSize: '20px',
    color: 'teal',
  },
  usageOverview: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  usageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  usageCard: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  usageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  usageLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
  },
  usageValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  usageSubtext: {
    fontSize: '12px',
    color: '#999',
  },
  overageAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#fff5f5',
    color: '#e74c3c',
    padding: '8px 12px',
    borderRadius: '4px',
    marginTop: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  alertIcon: {
    fontSize: '14px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  costSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  costGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  costCard: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  totalCostCard: {
    backgroundColor: '#e8f5e8',
    border: '2px solid #27ae60',
  },
  costHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  costLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
  },
  costValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalCostValue: {
    fontSize: '24px',
    color: '#27ae60',
  },
  costSubtext: {
    fontSize: '12px',
    color: '#999',
  },
  statusSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statusCard: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  statusInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: '20px',
  },
  pauseButton: {
    backgroundColor: '#f39c12',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resumeButton: {
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDescription: {
    fontSize: '14px',
    lineHeight: '1.5',
  },
  pausedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#f39c12',
    backgroundColor: '#fff8e1',
    padding: '12px',
    borderRadius: '4px',
  },
  activeInfo: {
    color: '#666',
  },
  infoIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  settingsCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  settingsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '8px',
    marginTop: '20px',
  },
  settingsDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e9ecef',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: 0,
  },
  modalContent: {
    padding: '20px',
  },
  modalList: {
    paddingLeft: '20px',
    margin: '10px 0',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '20px',
    borderTop: '1px solid #e9ecef',
  },
  modalCancel: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalPause: {
    backgroundColor: '#f39c12',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalResume: {
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default BillingManager;