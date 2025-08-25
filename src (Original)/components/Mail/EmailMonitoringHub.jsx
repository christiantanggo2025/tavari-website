// components/Mail/EmailMonitoringHub.jsx - Integration Component for Steps 174-175
import React, { useState } from 'react';
import { 
  FiMail, FiAlertTriangle, FiBarChart2, FiSettings, 
  FiEye, FiUsers, FiTrendingUp, FiTarget
} from 'react-icons/fi';
import EmailErrorDashboard from './EmailErrorDashboard';
import CampaignSendStatus from './CampaignSendStatus';

const EmailMonitoringHub = ({ isOpen, onClose }) => {
  const [activeView, setActiveView] = useState('overview');
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const handleViewChange = (view, campaignId = null) => {
    setActiveView(view);
    setSelectedCampaign(campaignId);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Hub Overview */}
      {activeView === 'overview' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.header}>
              <h2 style={styles.title}>Email Monitoring Hub</h2>
              <button style={styles.closeButton} onClick={onClose}>
                <FiX />
              </button>
            </div>

            <div style={styles.content}>
              <div style={styles.hubGrid}>
                {/* Error Tracking Card */}
                <div style={styles.hubCard} onClick={() => handleViewChange('errors')}>
                  <div style={styles.cardHeader}>
                    <FiAlertTriangle style={{ ...styles.cardIcon, color: '#f44336' }} />
                    <h3 style={styles.cardTitle}>Error Tracking</h3>
                  </div>
                  <div style={styles.cardDescription}>
                    Monitor failed sends, bounces, spam complaints, and delivery issues across all campaigns.
                  </div>
                  <div style={styles.cardFeatures}>
                    <div style={styles.feature}>✓ Real-time error logging</div>
                    <div style={styles.feature}>✓ Error categorization & filtering</div>
                    <div style={styles.feature}>✓ Bounce & complaint tracking</div>
                    <div style={styles.feature}>✓ Error resolution workflow</div>
                  </div>
                  <div style={styles.cardAction}>
                    <span>View Error Dashboard</span>
                    <FiBarChart2 style={styles.actionIcon} />
                  </div>
                </div>

                {/* Send Status Card */}
                <div style={styles.hubCard} onClick={() => handleViewChange('sends')}>
                  <div style={styles.cardHeader}>
                    <FiMail style={{ ...styles.cardIcon, color: '#2196f3' }} />
                    <h3 style={styles.cardTitle}>Send Status Tracking</h3>
                  </div>
                  <div style={styles.cardDescription}>
                    Track individual email delivery status, opens, clicks, and engagement for each campaign.
                  </div>
                  <div style={styles.cardFeatures}>
                    <div style={styles.feature}>✓ Per-contact delivery status</div>
                    <div style={styles.feature}>✓ Engagement timeline tracking</div>
                    <div style={styles.feature}>✓ Campaign performance metrics</div>
                    <div style={styles.feature}>✓ Export & reporting tools</div>
                  </div>
                  <div style={styles.cardAction}>
                    <span>View Send Dashboard</span>
                    <FiEye style={styles.actionIcon} />
                  </div>
                </div>

                {/* Quick Stats Card */}
                <div style={styles.statsCard}>
                  <div style={styles.cardHeader}>
                    <FiTrendingUp style={{ ...styles.cardIcon, color: '#4caf50' }} />
                    <h3 style={styles.cardTitle}>Quick Stats</h3>
                  </div>
                  <div style={styles.quickStats}>
                    <div style={styles.statItem}>
                      <div style={styles.statNumber}>0</div>
                      <div style={styles.statLabel}>Active Errors</div>
                    </div>
                    <div style={styles.statItem}>
                      <div style={styles.statNumber}>0</div>
                      <div style={styles.statLabel}>Emails Today</div>
                    </div>
                    <div style={styles.statItem}>
                      <div style={styles.statNumber}>0%</div>
                      <div style={styles.statLabel}>Success Rate</div>
                    </div>
                  </div>
                  <div style={styles.statsNote}>
                    Connect your campaigns to see real-time statistics
                  </div>
                </div>

                {/* Integration Guide Card */}
                <div style={styles.guideCard}>
                  <div style={styles.cardHeader}>
                    <FiSettings style={{ ...styles.cardIcon, color: '#ff9800' }} />
                    <h3 style={styles.cardTitle}>Integration Setup</h3>
                  </div>
                  <div style={styles.guideContent}>
                    <div style={styles.guideStep}>
                      <div style={styles.stepNumber}>1</div>
                      <div style={styles.stepText}>Run the database schema setup in Supabase</div>
                    </div>
                    <div style={styles.guideStep}>
                      <div style={styles.stepNumber}>2</div>
                      <div style={styles.stepText}>Configure Amazon SES webhooks</div>
                    </div>
                    <div style={styles.guideStep}>
                      <div style={styles.stepNumber}>3</div>
                      <div style={styles.stepText}>Enable error logging in emailSendingService.js</div>
                    </div>
                    <div style={styles.guideStep}>
                      <div style={styles.stepNumber}>4</div>
                      <div style={styles.stepText}>Start sending campaigns to populate data</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.footer}>
                <p style={styles.footerText}>
                  This monitoring hub integrates with your existing email system to provide comprehensive tracking and error management.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Dashboard */}
      {activeView === 'errors' && (
        <EmailErrorDashboard 
          isOpen={true} 
          onClose={() => handleViewChange('overview')} 
        />
      )}

      {/* Send Status Dashboard */}
      {activeView === 'sends' && (
        <CampaignSendStatus 
          isOpen={true} 
          onClose={() => handleViewChange('overview')}
          campaignId={selectedCampaign}
        />
      )}
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '95%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
    borderRadius: '12px 12px 0 0',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '5px',
  },
  content: {
    padding: '30px',
  },
  hubGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  hubCard: {
    backgroundColor: 'white',
    border: '2px solid #ddd',
    borderRadius: '12px',
    padding: '25px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      borderColor: 'teal',
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
    },
  },
  statsCard: {
    backgroundColor: '#f8f8f8',
    border: '2px solid #ddd',
    borderRadius: '12px',
    padding: '25px',
  },
  guideCard: {
    backgroundColor: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '12px',
    padding: '25px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px',
  },
  cardIcon: {
    fontSize: '24px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  cardDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '15px',
  },
  cardFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  feature: {
    fontSize: '13px',
    color: '#333',
    paddingLeft: '10px',
  },
  cardAction: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'teal',
  },
  actionIcon: {
    fontSize: '16px',
  },
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '15px',
  },
  statItem: {
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
  },
  statsNote: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  guideContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  guideStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  stepNumber: {
    backgroundColor: '#ff9800',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  stepText: {
    fontSize: '14px',
    color: '#333',
  },
  footer: {
    textAlign: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #f0f0f0',
  },
  footerText: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
};

export default EmailMonitoringHub;