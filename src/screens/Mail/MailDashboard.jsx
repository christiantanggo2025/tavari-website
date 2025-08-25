// screens/Mail/MailDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { FiMail, FiUsers, FiSend, FiSettings, FiBarChart2, FiFileText, FiShield, FiDollarSign, FiActivity, FiAlertTriangle } from 'react-icons/fi';

const MailDashboard = () => {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const [stats, setStats] = useState({
    totalContacts: 0,
    subscribedContacts: 0,
    totalCampaigns: 0,
    emailsSentThisMonth: 0,
    currentMonthCost: 0.00,
    activeSubscription: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const businessId = business?.id;

  // Load dashboard statistics
  useEffect(() => {
    if (businessId) {
      loadDashboardStats();
    }
  }, [businessId]);

  const loadDashboardStats = async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Load contact stats
      const { data: contacts, error: contactsError } = await supabase
        .from('mail_contacts')
        .select('id, subscribed')
        .eq('business_id', businessId);

      if (contactsError) throw contactsError;

      // Load campaign stats
      const { data: campaigns, error: campaignsError } = await supabase
        .from('mail_campaigns')
        .select('id, status, emails_sent, created_at')
        .eq('business_id', businessId);

      if (campaignsError) throw campaignsError;

      // Load billing info for current month
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const { data: billing, error: billingError } = await supabase
        .from('mail_billing')
        .select('*')
        .eq('business_id', businessId)
        .gte('billing_period_start', startOfMonth.toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1);

      if (billingError && billingError.code !== 'PGRST116') {
        console.warn('Billing table may not exist yet:', billingError);
      }

      // Calculate stats
      const totalContacts = contacts?.length || 0;
      const subscribedContacts = contacts?.filter(c => c.subscribed).length || 0;
      const totalCampaigns = campaigns?.length || 0;
      
      // Calculate emails sent this month
      const thisMonth = campaigns?.filter(c => {
        const campaignDate = new Date(c.created_at);
        return campaignDate >= startOfMonth;
      });
      const emailsSentThisMonth = thisMonth?.reduce((sum, c) => sum + (c.emails_sent || 0), 0) || 0;

      // Calculate current month cost
      const currentBilling = billing?.[0];
      const currentMonthCost = currentBilling?.total_amount || 0;

      setStats({
        totalContacts,
        subscribedContacts,
        totalCampaigns,
        emailsSentThisMonth,
        currentMonthCost,
        activeSubscription: currentBilling
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <FiActivity style={styles.loadingIcon} />
          <div>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <FiAlertTriangle style={styles.errorIcon} />
          <h2>Dashboard Error</h2>
          <p>{error}</p>
          <button 
            style={styles.retryButton} 
            onClick={loadDashboardStats}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Tavari Mail Dashboard</h1>
        <p style={styles.subtitle}>Pay-per-email marketing with unlimited contacts</p>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiUsers /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.totalContacts.toLocaleString()}</div>
            <div style={styles.statLabel}>Total Contacts</div>
            <div style={styles.statSubtext}>
              {stats.subscribedContacts.toLocaleString()} subscribed
            </div>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiMail /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.totalCampaigns}</div>
            <div style={styles.statLabel}>Total Campaigns</div>
            <div style={styles.statSubtext}>All time</div>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiSend /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.emailsSentThisMonth.toLocaleString()}</div>
            <div style={styles.statLabel}>Emails This Month</div>
            <div style={styles.statSubtext}>Current billing period</div>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiDollarSign /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>${stats.currentMonthCost.toFixed(2)}</div>
            <div style={styles.statLabel}>This Month's Cost</div>
            <div style={styles.statSubtext}>Including overages</div>
          </div>
        </div>
      </div>

      {/* Quick Actions - 3x Grid Layout per Tavari Standards */}
      <div style={styles.quickActionsHeader}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
      </div>
      
      <div style={styles.buttonGrid}>
        <button 
          style={styles.gridButton} 
          onClick={() => navigateTo('/dashboard/mail/builder')}
        >
          <FiMail style={styles.buttonIcon} />
          <span style={styles.buttonText}>Create Campaign</span>
        </button>
        
        <button 
          style={styles.gridButton}
          onClick={() => navigateTo('/dashboard/mail/contacts')}
        >
          <FiUsers style={styles.buttonIcon} />
          <span style={styles.buttonText}>Manage Contacts</span>
        </button>
        
        <button 
          style={styles.gridButton}
          onClick={() => navigateTo('/dashboard/mail/campaigns')}
        >
          <FiFileText style={styles.buttonIcon} />
          <span style={styles.buttonText}>View Campaigns</span>
        </button>
        
        <button 
          style={styles.gridButton}
          onClick={() => navigateTo('/dashboard/mail/contacts')}
        >
          <FiUsers style={styles.buttonIcon} />
          <span style={styles.buttonText}>Import Contacts</span>
        </button>
        
        <button 
          style={styles.gridButton}
          onClick={() => navigateTo('/dashboard/mail/performance')}
        >
          <FiActivity style={styles.buttonIcon} />
          <span style={styles.buttonText}>Performance Monitor</span>
        </button>
        
        <button 
          style={styles.gridButton}
          onClick={() => navigateTo('/dashboard/mail/settings')}
        >
          <FiSettings style={styles.buttonIcon} />
          <span style={styles.buttonText}>Mail Settings</span>
        </button>
        
        <button 
          style={styles.gridButton}
          onClick={() => navigateTo('/dashboard/mail/templates')}
        >
          <FiFileText style={styles.buttonIcon} />
          <span style={styles.buttonText}>Email Templates</span>
        </button>
        
        <button 
          style={styles.gridButton}
          onClick={() => navigateTo('/dashboard/mail/billing')}
        >
          <FiBarChart2 style={styles.buttonIcon} />
          <span style={styles.buttonText}>Usage & Billing</span>
        </button>
        
        <button 
          style={styles.gridButton}
          onClick={() => navigateTo('/dashboard/mail/compliance')}
        >
          <FiShield style={styles.buttonIcon} />
          <span style={styles.buttonText}>Compliance Center</span>
        </button>
      </div>

      {/* Current Status */}
      {stats.activeSubscription && (
        <div style={styles.statusSection}>
          <h2 style={styles.sectionTitle}>Current Usage</h2>
          <div style={styles.statusCard}>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Included Emails:</span>
              <span style={styles.statusValue}>
                {stats.activeSubscription.included_emails?.toLocaleString() || '5,000'}
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Emails Used:</span>
              <span style={styles.statusValue}>
                {stats.activeSubscription.emails_used?.toLocaleString() || '0'}
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Remaining:</span>
              <span style={styles.statusValue}>
                {((stats.activeSubscription.included_emails || 5000) - (stats.activeSubscription.emails_used || 0)).toLocaleString()}
              </span>
            </div>
            {stats.activeSubscription.overage_emails > 0 && (
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>Overage Emails:</span>
                <span style={{...styles.statusValue, color: '#ff9800'}}>
                  {stats.activeSubscription.overage_emails.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module Visibility for Upselling */}
      <div style={styles.modulesSection}>
        <h3 style={styles.sectionTitle}>Other Tavari Modules</h3>
        <div style={styles.moduleButtons}>
          <button 
            style={styles.moduleButton}
            onClick={() => navigateTo('/dashboard/pos/register')}
          >
            Tavari POS
          </button>
          <button 
            style={styles.moduleButton}
            onClick={() => navigateTo('/dashboard/music/dashboard')}
          >
            Tavari Music
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    minHeight: '100vh',
  },
  loading: {
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
    animation: 'spin 1s linear infinite',
  },
  error: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  errorIcon: {
    fontSize: '48px',
    color: '#f44336',
    marginBottom: '20px',
  },
  retryButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  statIcon: {
    fontSize: '24px',
    color: 'teal',
    width: '40px',
    textAlign: 'center',
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  statSubtext: {
    fontSize: '12px',
    color: '#999',
    marginTop: '2px',
  },
  quickActionsHeader: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '40px',
  },
  gridButton: {
    backgroundColor: 'white',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '30px 20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
    minHeight: '120px',
  },
  buttonIcon: {
    fontSize: '32px',
    color: 'teal',
  },
  buttonText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  statusSection: {
    marginBottom: '40px',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 'bold',
  },
  statusValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  modulesSection: {
    marginTop: '40px',
    textAlign: 'center',
  },
  moduleButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  moduleButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  // Mobile responsiveness
  '@media (max-width: 768px)': {
    buttonGrid: {
      gridTemplateColumns: '1fr',
    },
    statsGrid: {
      gridTemplateColumns: '1fr',
    },
  },
};

// Add CSS animation for spinning icons
if (!document.querySelector('#mail-dashboard-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'mail-dashboard-styles';
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default MailDashboard;