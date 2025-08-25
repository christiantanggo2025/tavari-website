// screens/Mail/ContactsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiUserPlus, FiUserCheck, FiUserX, FiUpload, FiSearch, FiFilter } from 'react-icons/fi';

const ContactsDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalContacts: 0,
    subscribedContacts: 0,
    unsubscribedContacts: 0,
    newContactsThisMonth: 0,
    growthPercentage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContactStats();
  }, []);

  const loadContactStats = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual Supabase calls
      // const { data: contacts, error } = await supabase
      //   .from('mail_contacts')
      //   .select('id, subscribed, created_at')
      //   .eq('business_id', currentBusinessId);
      
      // Mock data for now
      const mockStats = {
        totalContacts: 1247,
        subscribedContacts: 1189,
        unsubscribedContacts: 58,
        newContactsThisMonth: 143,
        growthPercentage: 12.9
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading contact stats:', error);
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
        <div style={styles.loading}>Loading contact data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Contact Management</h1>
        <p style={styles.subtitle}>Manage your email subscribers and grow your audience</p>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiUsers /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.totalContacts.toLocaleString()}</div>
            <div style={styles.statLabel}>Total Contacts</div>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiUserCheck /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.subscribedContacts.toLocaleString()}</div>
            <div style={styles.statLabel}>Subscribed</div>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiUserX /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.unsubscribedContacts.toLocaleString()}</div>
            <div style={styles.statLabel}>Unsubscribed</div>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiUserPlus /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>+{stats.newContactsThisMonth}</div>
            <div style={styles.statLabel}>New This Month</div>
            <div style={styles.growthBadge}>+{stats.growthPercentage}%</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActionsSection}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        
        <div style={styles.buttonGrid}>
          <button 
            style={styles.primaryButton}
            onClick={() => navigateTo('/dashboard/mail/contacts/add')}
          >
            <FiUserPlus style={styles.buttonIcon} />
            <span style={styles.buttonText}>Add Contact</span>
          </button>
          
          <button 
            style={styles.primaryButton}
            onClick={() => navigateTo('/dashboard/mail/contacts/import')}
          >
            <FiUpload style={styles.buttonIcon} />
            <span style={styles.buttonText}>Import Contacts</span>
          </button>
          
          <button 
            style={styles.primaryButton}
            onClick={() => navigateTo('/dashboard/mail/contacts')}
          >
            <FiUsers style={styles.buttonIcon} />
            <span style={styles.buttonText}>View All Contacts</span>
          </button>
        </div>
      </div>

      {/* Contact Management Tools */}
      <div style={styles.toolsSection}>
        <h2 style={styles.sectionTitle}>Contact Tools</h2>
        
        <div style={styles.toolsGrid}>
          <div style={styles.toolCard} onClick={() => navigateTo('/dashboard/mail/contacts?filter=subscribed')}>
            <div style={styles.toolIcon}><FiUserCheck /></div>
            <div style={styles.toolContent}>
              <div style={styles.toolTitle}>Subscribed Contacts</div>
              <div style={styles.toolDescription}>View all active subscribers</div>
            </div>
          </div>
          
          <div style={styles.toolCard} onClick={() => navigateTo('/dashboard/mail/contacts?filter=unsubscribed')}>
            <div style={styles.toolIcon}><FiUserX /></div>
            <div style={styles.toolContent}>
              <div style={styles.toolTitle}>Unsubscribed Contacts</div>
              <div style={styles.toolDescription}>Manage unsubscribed users</div>
            </div>
          </div>
          
          <div style={styles.toolCard} onClick={() => navigateTo('/dashboard/mail/contacts?search=true')}>
            <div style={styles.toolIcon}><FiSearch /></div>
            <div style={styles.toolContent}>
              <div style={styles.toolTitle}>Search Contacts</div>
              <div style={styles.toolDescription}>Find specific contacts</div>
            </div>
          </div>
          
          <div style={styles.toolCard} onClick={() => navigateTo('/dashboard/mail/contacts/segments')}>
            <div style={styles.toolIcon}><FiFilter /></div>
            <div style={styles.toolContent}>
              <div style={styles.toolTitle}>Contact Segments</div>
              <div style={styles.toolDescription}>Create targeted lists</div>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Insights */}
      <div style={styles.insightsSection}>
        <h2 style={styles.sectionTitle}>Growth Insights</h2>
        
        <div style={styles.insightCard}>
          <div style={styles.insightHeader}>
            <h3 style={styles.insightTitle}>Contact Growth</h3>
            <div style={styles.insightPeriod}>Last 30 days</div>
          </div>
          
          <div style={styles.insightContent}>
            <div style={styles.insightStat}>
              <span style={styles.insightLabel}>New Contacts:</span>
              <span style={styles.insightValue}>+{stats.newContactsThisMonth}</span>
            </div>
            <div style={styles.insightStat}>
              <span style={styles.insightLabel}>Growth Rate:</span>
              <span style={styles.insightValue}>+{stats.growthPercentage}%</span>
            </div>
            <div style={styles.insightStat}>
              <span style={styles.insightLabel}>Retention Rate:</span>
              <span style={styles.insightValue}>95.3%</span>
            </div>
          </div>
          
          <div style={styles.insightAction}>
            <button 
              style={styles.insightButton}
              onClick={() => navigateTo('/dashboard/mail/analytics')}
            >
              View Detailed Analytics
            </button>
          </div>
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
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
  },
  header: {
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
  growthBadge: {
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginTop: '4px',
    display: 'inline-block',
  },
  quickActionsSection: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  primaryButton: {
    backgroundColor: 'white',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
    minHeight: '100px',
  },
  buttonIcon: {
    fontSize: '24px',
    color: 'teal',
  },
  buttonText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  toolsSection: {
    marginBottom: '40px',
  },
  toolsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  toolCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  toolIcon: {
    fontSize: '20px',
    color: 'teal',
    width: '40px',
    textAlign: 'center',
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
  },
  toolDescription: {
    fontSize: '14px',
    color: '#666',
  },
  insightsSection: {
    marginBottom: '40px',
  },
  insightCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  insightHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  insightTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  insightPeriod: {
    fontSize: '14px',
    color: '#666',
  },
  insightContent: {
    marginBottom: '20px',
  },
  insightStat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  insightLabel: {
    fontSize: '14px',
    color: '#666',
  },
  insightValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  insightAction: {
    textAlign: 'center',
  },
  insightButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default ContactsDashboard;