// screens/Mail/BillingManager.jsx - Debug Version
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { 
  FiDollarSign, FiMail, FiTrendingUp, FiCalendar, FiDownload, 
  FiPause, FiPlay, FiCreditCard, FiPieChart, FiSettings,
  FiAlertCircle, FiCheckCircle, FiRefreshCw, FiInfo
} from 'react-icons/fi';

const BillingManager = () => {
  const { business } = useBusiness();
  const businessId = business?.id;
  
  const [currentBilling, setCurrentBilling] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    console.log('🔍 BillingManager mounted');
    console.log('🏢 Business from context:', business);
    console.log('🆔 BusinessId:', businessId);
    
    if (businessId) {
      loadBillingData();
    } else {
      console.warn('⚠️ No businessId found - checking business context...');
      setDebugInfo({
        businessContext: business,
        businessId: businessId,
        hasContext: !!business
      });
      setLoading(false);
      setError('No business ID found. Please ensure you are logged in and have a business selected.');
    }
  }, [businessId, business]);

  const loadBillingData = async () => {
    console.log('🔄 Starting loadBillingData for businessId:', businessId);
    setLoading(true);
    setError(null);
    
    try {
      // Get current billing period
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      console.log('📅 Billing period:', {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0]
      });

      // First, let's check if the mail_billing table exists
      console.log('🗃️ Checking mail_billing table...');
      
      const { data: currentBillingData, error: billingError } = await supabase
        .from('mail_billing')
        .select('*')
        .eq('business_id', businessId)
        .gte('billing_period_start', startOfMonth.toISOString().split('T')[0])
        .lte('billing_period_end', endOfMonth.toISOString().split('T')[0])
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data

      console.log('📊 Current billing query result:', { 
        data: currentBillingData, 
        error: billingError 
      });

      if (billingError) {
        console.error('❌ Billing query error:', billingError);
        throw billingError;
      }

      // If no current billing period exists, create one
      if (!currentBillingData) {
        console.log('📝 No billing record found, creating new one...');
        
        const newBillingRecord = {
          business_id: businessId,
          billing_period_start: startOfMonth.toISOString().split('T')[0],
          billing_period_end: endOfMonth.toISOString().split('T')[0],
          included_emails: 5000,
          emails_used: 0,
          overage_emails: 0,
          overage_rate: 0.0025,
          overage_cost: 0,
          total_cost: 0,
          status: 'active'
        };

        console.log('📝 Creating billing record:', newBillingRecord);

        const { data: newBilling, error: createError } = await supabase
          .from('mail_billing')
          .insert(newBillingRecord)
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating billing record:', createError);
          throw createError;
        }

        console.log('✅ Created new billing record:', newBilling);
        setCurrentBilling(newBilling);
      } else {
        console.log('✅ Found existing billing record:', currentBillingData);
        setCurrentBilling(currentBillingData);
        setIsPaused(currentBillingData.status === 'paused');
      }

      // Get usage history (last 12 months)
      console.log('📈 Loading usage history...');
      
      const { data: historyData, error: historyError } = await supabase
        .from('mail_billing')
        .select('*')
        .eq('business_id', businessId)
        .order('billing_period_start', { ascending: false })
        .limit(12);

      console.log('📈 Usage history result:', { 
        data: historyData, 
        error: historyError 
      });

      if (historyError) {
        console.error('❌ History query error:', historyError);
        throw historyError;
      }

      setUsageHistory(historyData || []);

      // Update debug info
      setDebugInfo({
        businessId,
        currentBilling: currentBillingData,
        historyCount: historyData?.length || 0,
        billingPeriod: {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        }
      });

      console.log('✅ Billing data loaded successfully');

    } catch (err) {
      console.error('❌ Error loading billing data:', err);
      setError(`Failed to load billing data: ${err.message}`);
      setDebugInfo({
        error: err,
        businessId,
        errorCode: err.code,
        errorDetails: err.details
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentUsage = () => {
    if (!currentBilling) return { usagePercent: 0, remainingEmails: 0, isOverage: false };

    const usagePercent = Math.min((currentBilling.emails_used / currentBilling.included_emails) * 100, 100);
    const remainingEmails = Math.max(currentBilling.included_emails - currentBilling.emails_used, 0);
    const isOverage = currentBilling.emails_used > currentBilling.included_emails;

    return { usagePercent, remainingEmails, isOverage };
  };

  const calculateCosts = () => {
    if (!currentBilling) return { monthlyBase: 0, overageCost: 0, totalCost: 0 };

    const monthlyBase = isPaused ? 5.00 : 0; // $5/month for paused accounts
    const overageCost = currentBilling.overage_emails * currentBilling.overage_rate;
    const totalCost = monthlyBase + overageCost;

    return { monthlyBase, overageCost, totalCost };
  };

  const handlePauseAccount = async () => {
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
      await loadBillingData(); // Refresh data
    } catch (err) {
      console.error('Error updating account status:', err);
      setError(err.message);
    }
  };

  const exportBillingData = () => {
    const csvData = usageHistory.map(billing => ({
      Period: `${billing.billing_period_start} to ${billing.billing_period_end}`,
      'Emails Included': billing.included_emails,
      'Emails Used': billing.emails_used,
      'Overage Emails': billing.overage_emails,
      'Overage Cost': billing.overage_cost || 0,
      'Total Cost': billing.total_cost || 0,
      Status: billing.payment_status
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tavari-mail-billing-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderOverviewTab = () => {
    const usage = calculateCurrentUsage();
    const costs = calculateCosts();

    return (
      <div style={styles.tabContent}>
        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div style={styles.debugPanel}>
            <h4>🔍 Debug Info</h4>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            <p><strong>Current Billing:</strong> {currentBilling ? 'Found' : 'None'}</p>
            <p><strong>Business ID:</strong> {businessId || 'Missing'}</p>
          </div>
        )}

        {/* Current Usage Overview */}
        <div style={styles.usageOverview}>
          <h3 style={styles.sectionTitle}>
            <FiMail style={styles.sectionIcon} />
            Current Billing Period
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

  const renderHistoryTab = () => {
    return (
      <div style={styles.tabContent}>
        <div style={styles.historyHeader}>
          <h3 style={styles.sectionTitle}>
            <FiCalendar style={styles.sectionIcon} />
            Billing History
          </h3>
          {usageHistory.length > 0 && (
            <button style={styles.exportButton} onClick={exportBillingData}>
              <FiDownload style={styles.buttonIcon} />
              Export CSV
            </button>
          )}
        </div>

        <div style={styles.historyTable}>
          <div style={styles.tableHeader}>
            <div style={styles.tableHeaderCell}>Period</div>
            <div style={styles.tableHeaderCell}>Emails Used</div>
            <div style={styles.tableHeaderCell}>Overage</div>
            <div style={styles.tableHeaderCell}>Cost</div>
            <div style={styles.tableHeaderCell}>Status</div>
          </div>
          
          {usageHistory.map((billing, index) => (
            <div key={billing.id} style={styles.tableRow}>
              <div style={styles.tableCell}>
                {new Date(billing.billing_period_start).toLocaleDateString()} - {' '}
                {new Date(billing.billing_period_end).toLocaleDateString()}
              </div>
              <div style={styles.tableCell}>
                {billing.emails_used} / {billing.included_emails}
              </div>
              <div style={styles.tableCell}>
                {billing.overage_emails > 0 ? `+${billing.overage_emails}` : '—'}
              </div>
              <div style={styles.tableCell}>
                ${(billing.total_cost || 0).toFixed(2)}
              </div>
              <div style={styles.tableCell}>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: billing.status === 'active' ? '#d5edda' : 
                                 billing.status === 'paused' ? '#fff3cd' : '#f8d7da',
                  color: billing.status === 'active' ? '#155724' : 
                         billing.status === 'paused' ? '#856404' : '#721c24'
                }}>
                  {billing.status || 'active'}
                </span>
              </div>
            </div>
          ))}
          
          {usageHistory.length === 0 && (
            <div style={styles.emptyState}>
              <FiCalendar style={styles.emptyIcon} />
              <p style={styles.emptyText}>No billing history yet</p>
              <p style={styles.emptySubtext}>Send your first campaign to start tracking usage</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    return (
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
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <FiRefreshCw style={{...styles.loadingIcon, animation: 'spin 1s linear infinite'}} />
          <p>Loading billing information...</p>
          <p style={styles.loadingSubtext}>Business ID: {businessId || 'Not found'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <FiAlertCircle style={styles.errorIcon} />
          <h3>Error Loading Billing Data</h3>
          <p>{error}</p>
          {process.env.NODE_ENV === 'development' && (
            <div style={styles.debugPanel}>
              <h4>Debug Information:</h4>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
          <button style={styles.retryButton} onClick={loadBillingData}>
            <FiRefreshCw style={styles.buttonIcon} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Usage & Billing</h2>
        <div style={styles.headerActions}>
          <button style={styles.refreshButton} onClick={loadBillingData}>
            <FiRefreshCw style={styles.buttonIcon} />
            Refresh
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
            ...(activeTab === 'history' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('history')}
        >
          <FiCalendar style={styles.tabIcon} />
          History
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
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'settings' && renderSettingsTab()}

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
              {isPaused ? (
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
              <button
                style={isPaused ? styles.modalResume : styles.modalPause}
                onClick={handlePauseAccount}
              >
                {isPaused ? 'Resume Account' : 'Pause Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  // ... keeping all the existing styles from the previous version
  container: {
    padding: '40px',
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
  debugPanel: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    fontSize: '12px',
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
  loadingSubtext: {
    fontSize: '14px',
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
  // ... (continuing with all other styles from the original component)
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
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  exportButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  historyTable: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    backgroundColor: '#f8f9fa',
    padding: '16px 20px',
    fontWeight: 'bold',
    color: '#2c3e50',
    borderBottom: '1px solid #e9ecef',
  },
  tableHeaderCell: {
    fontSize: '14px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f3f4',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: '14px',
    color: '#2c3e50',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
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
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '48px',
    color: '#ccc',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#999',
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