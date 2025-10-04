// screens/Mail/CampaignDetails.jsx - Step 132: Sending History & Logs with Pause Protection
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import EmailPauseBanner, { blockEmailSendIfPaused } from '../../components/EmailPauseBanner';
import {
  FiArrowLeft, FiMail, FiUsers, FiCheckCircle, FiXCircle, 
  FiClock, FiRefreshCw, FiDownload, FiEye, FiEdit3,
  FiSend, FiAlertTriangle, FiBarChart2, FiCalendar
} from 'react-icons/fi';

const CampaignDetails = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { business } = useBusiness();
  const [campaign, setCampaign] = useState(null);
  const [sendLogs, setSendLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const businessId = business?.id;

  // Load campaign details
  const loadCampaign = async () => {
    if (!businessId || !campaignId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mail_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        console.error('Error loading campaign:', error);
        // Fallback to mock data if campaign not found
        if (error.code === 'PGRST116') {
          const mockCampaign = {
            id: campaignId,
            name: 'Sample Campaign',
            subject_line: 'Welcome to our newsletter!',
            status: 'draft',
            total_recipients: 0,
            emails_sent: 0,
            created_at: new Date().toISOString(),
            sent_at: null
          };
          setCampaign(mockCampaign);
        }
        return;
      }
      
      setCampaign(data);
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load campaign send logs
  const loadSendLogs = async () => {
    if (!businessId || !campaignId) return;
    
    try {
      setLogsLoading(true);
      const { data, error } = await supabase
        .from('mail_campaign_sends')
        .select(`
          *,
          mail_contacts(email, first_name, last_name)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Error loading send logs:', error);
        setSendLogs([]);
        return;
      }
      
      setSendLogs(data || []);
    } catch (error) {
      console.error('Error loading send logs:', error);
      setSendLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
    loadSendLogs();
  }, [businessId, campaignId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return '#4caf50';
      case 'failed': return '#f44336';
      case 'pending': return '#ff9800';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <FiCheckCircle style={{ color: getStatusColor(status) }} />;
      case 'failed': return <FiXCircle style={{ color: getStatusColor(status) }} />;
      case 'pending': return <FiClock style={{ color: getStatusColor(status) }} />;
      default: return <FiMail style={{ color: getStatusColor(status) }} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportSendLogs = () => {
    if (sendLogs.length === 0) return;
    
    const csvContent = [
      ['Email', 'Name', 'Status', 'Sent At', 'Error Message'].join(','),
      ...sendLogs.map(log => [
        log.email_address,
        `${log.mail_contacts?.first_name || ''} ${log.mail_contacts?.last_name || ''}`.trim(),
        log.status,
        log.sent_at ? new Date(log.sent_at).toISOString() : '',
        log.error_message || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campaign_${campaignId}_send_logs.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Protected navigation functions
  const handleEditCampaign = () => {
    if (blockEmailSendIfPaused('Campaign editing')) return;
    navigate(`/dashboard/mail/builder/${campaignId}`);
  };

  const handleSendCampaign = () => {
    if (blockEmailSendIfPaused('Campaign sending')) return;
    navigate(`/dashboard/mail/sender/${campaignId}`);
  };

  // Calculate stats
  const stats = {
    total: sendLogs.length,
    sent: sendLogs.filter(log => log.status === 'sent').length,
    failed: sendLogs.filter(log => log.status === 'failed').length,
    pending: sendLogs.filter(log => log.status === 'pending').length
  };

  const successRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <FiRefreshCw style={{ ...styles.loadingIcon, animation: 'spin 1s linear infinite' }} />
          <div>Loading campaign details...</div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <FiAlertTriangle style={styles.errorIcon} />
          <h2>Campaign Not Found</h2>
          <p>The campaign you're looking for doesn't exist or you don't have permission to view it.</p>
          <button 
            style={styles.backButton}
            onClick={() => navigate('/dashboard/mail/campaigns')}
          >
            <FiArrowLeft style={styles.buttonIcon} />
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Email Pause Banner */}
      <EmailPauseBanner />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button 
            style={styles.backButton}
            onClick={() => navigate('/dashboard/mail/campaigns')}
          >
            <FiArrowLeft style={styles.buttonIcon} />
            Back to Campaigns
          </button>
          <div style={styles.campaignInfo}>
            <h1 style={styles.title}>{campaign.name}</h1>
            <p style={styles.subtitle}>{campaign.subject_line}</p>
          </div>
        </div>
        <div style={styles.headerActions}>
          {campaign.status === 'draft' && (
            <button 
              style={styles.editButton}
              onClick={handleEditCampaign}
            >
              <FiEdit3 style={styles.buttonIcon} />
              Edit
            </button>
          )}
          <button 
            style={styles.previewButton}
            onClick={() => navigate(`/dashboard/mail/preview/${campaignId}`)}
          >
            <FiEye style={styles.buttonIcon} />
            Preview
          </button>
          {(campaign.status === 'draft' || campaign.status === 'ready') && (
            <button 
              style={styles.sendButton}
              onClick={handleSendCampaign}
            >
              <FiSend style={styles.buttonIcon} />
              Send Campaign
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <FiMail style={{ color: 'teal' }} />
          </div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.total.toLocaleString()}</div>
            <div style={styles.statLabel}>Total Recipients</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <FiCheckCircle style={{ color: '#4caf50' }} />
          </div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.sent.toLocaleString()}</div>
            <div style={styles.statLabel}>Successfully Sent</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <FiXCircle style={{ color: '#f44336' }} />
          </div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.failed.toLocaleString()}</div>
            <div style={styles.statLabel}>Failed</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <FiBarChart2 style={{ color: 'teal' }} />
          </div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{successRate}%</div>
            <div style={styles.statLabel}>Success Rate</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          {[
            { key: 'overview', label: 'Overview', icon: FiMail },
            { key: 'logs', label: 'Send Logs', icon: FiSend },
            { key: 'analytics', label: 'Analytics', icon: FiBarChart2 }
          ].map(tab => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.activeTab : {})
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon style={styles.tabIcon} />
              {tab.label}
            </button>
          ))}
        </div>
        
        {activeTab === 'logs' && (
          <button 
            style={styles.exportButton}
            onClick={exportSendLogs}
            disabled={sendLogs.length === 0}
          >
            <FiDownload style={styles.buttonIcon} />
            Export Logs
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'overview' && (
          <div style={styles.overviewContent}>
            <div style={styles.campaignDetails}>
              <h3 style={styles.sectionTitle}>Campaign Details</h3>
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Status:</span>
                  <span style={styles.detailValue}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(campaign.status) + '20',
                      color: getStatusColor(campaign.status)
                    }}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </span>
                </div>
                
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Created:</span>
                  <span style={styles.detailValue}>{formatDate(campaign.created_at)}</span>
                </div>
                
                {campaign.sent_at && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Sent:</span>
                    <span style={styles.detailValue}>{formatDate(campaign.sent_at)}</span>
                  </div>
                )}
                
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Subject Line:</span>
                  <span style={styles.detailValue}>{campaign.subject_line}</span>
                </div>

                {campaign.preheader_text && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Preheader:</span>
                    <span style={styles.detailValue}>{campaign.preheader_text}</span>
                  </div>
                )}

                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Total Recipients:</span>
                  <span style={styles.detailValue}>{campaign.total_recipients || stats.total}</span>
                </div>

                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Emails Sent:</span>
                  <span style={styles.detailValue}>{campaign.emails_sent || stats.sent}</span>
                </div>

                {campaign.status === 'sent' && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Delivery Rate:</span>
                    <span style={styles.detailValue}>{successRate}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {(campaign.status === 'draft' || campaign.status === 'ready') && (
              <div style={styles.quickActions}>
                <h3 style={styles.sectionTitle}>Quick Actions</h3>
                <div style={styles.actionButtons}>
                  {campaign.status === 'draft' && (
                    <button 
                      style={styles.actionButton}
                      onClick={handleEditCampaign}
                    >
                      <FiEdit3 style={styles.buttonIcon} />
                      Continue Editing
                    </button>
                  )}
                  <button 
                    style={styles.actionButton}
                    onClick={() => navigate(`/dashboard/mail/preview/${campaignId}`)}
                  >
                    <FiEye style={styles.buttonIcon} />
                    Preview Email
                  </button>
                  <button 
                    style={styles.primaryActionButton}
                    onClick={handleSendCampaign}
                  >
                    <FiSend style={styles.buttonIcon} />
                    Send Campaign
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div style={styles.logsContent}>
            <div style={styles.logsHeader}>
              <h3 style={styles.sectionTitle}>Send Logs</h3>
              <div style={styles.logsFilters}>
                {/* Future: Add status filters here */}
              </div>
            </div>
            
            {logsLoading ? (
              <div style={styles.logsLoading}>
                <FiRefreshCw style={{ ...styles.loadingIcon, animation: 'spin 1s linear infinite' }} />
                <div>Loading send logs...</div>
              </div>
            ) : sendLogs.length === 0 ? (
              <div style={styles.emptyState}>
                <FiMail style={styles.emptyIcon} />
                <h4>No Send Logs Found</h4>
                <p>This campaign hasn't been sent yet or no logs are available.</p>
                {(campaign.status === 'draft' || campaign.status === 'ready') && (
                  <button 
                    style={styles.emptySendButton}
                    onClick={handleSendCampaign}
                  >
                    <FiSend style={styles.buttonIcon} />
                    Send Campaign Now
                  </button>
                )}
              </div>
            ) : (
              <div style={styles.logsTable}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.tableHeaderCell}>Email</th>
                      <th style={styles.tableHeaderCell}>Name</th>
                      <th style={styles.tableHeaderCell}>Status</th>
                      <th style={styles.tableHeaderCell}>Sent At</th>
                      <th style={styles.tableHeaderCell}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sendLogs.map(log => (
                      <tr key={log.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{log.email_address}</td>
                        <td style={styles.tableCell}>
                          {log.mail_contacts ? 
                            `${log.mail_contacts.first_name || ''} ${log.mail_contacts.last_name || ''}`.trim() || 'N/A'
                            : 'N/A'
                          }
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.statusCell}>
                            {getStatusIcon(log.status)}
                            <span style={styles.statusText}>{log.status}</span>
                          </div>
                        </td>
                        <td style={styles.tableCell}>{formatDate(log.sent_at)}</td>
                        <td style={styles.tableCell}>
                          {log.error_message ? (
                            <span style={styles.errorText} title={log.error_message}>
                              {log.error_message.length > 50 
                                ? log.error_message.substring(0, 50) + '...'
                                : log.error_message
                              }
                            </span>
                          ) : (
                            <span style={styles.successText}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={styles.analyticsContent}>
            <div style={styles.comingSoon}>
              <FiBarChart2 style={styles.comingSoonIcon} />
              <h3>Analytics Coming Soon</h3>
              <p>Email engagement analytics will be available in a future update.</p>
              <p>Track opens, clicks, unsubscribes, and more detailed metrics.</p>
            </div>
          </div>
        )}
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
  },
  error: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  errorIcon: {
    fontSize: '48px',
    color: '#f44336',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    gap: '20px',
  },
  headerLeft: {
    flex: 1,
  },
  backButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '15px',
    transition: 'all 0.2s ease',
  },
  buttonIcon: {
    fontSize: '14px',
  },
  campaignInfo: {
    marginLeft: '0',
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
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  editButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  previewButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  sendButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  statIcon: {
    fontSize: '24px',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
  },
  tabsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '4px',
    border: '1px solid #ddd',
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    backgroundColor: 'teal',
    color: 'white',
  },
  tabIcon: {
    fontSize: '14px',
  },
  exportButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  tabContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    minHeight: '400px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
    marginBottom: '30px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '14px',
    color: '#333',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  quickActions: {
    borderTop: '1px solid #f0f0f0',
    paddingTop: '20px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  primaryActionButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  logsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  logsLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#666',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '15px',
    color: '#ccc',
  },
  emptySendButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '15px',
    transition: 'all 0.2s ease',
  },
  logsTable: {
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f8f8f8',
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '1px solid #ddd',
    fontSize: '14px',
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
    transition: 'background-color 0.2s ease',
  },
  tableCell: {
    padding: '12px',
    fontSize: '14px',
    color: '#333',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statusCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusText: {
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  errorText: {
    color: '#f44336',
    fontSize: '12px',
    cursor: 'help',
  },
  successText: {
    color: '#4caf50',
  },
  comingSoon: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
  },
  comingSoonIcon: {
    fontSize: '48px',
    marginBottom: '15px',
    color: '#ccc',
  },
  
  // Mobile responsiveness
  '@media (max-width: 768px)': {
    container: {
      padding: '20px',
    },
    header: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '15px',
    },
    headerActions: {
      justifyContent: 'stretch',
    },
    statsGrid: {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    detailsGrid: {
      gridTemplateColumns: '1fr',
    },
    actionButtons: {
      flexDirection: 'column',
    },
    tabsContainer: {
      flexDirection: 'column',
      gap: '15px',
      alignItems: 'stretch',
    },
    tabs: {
      flexDirection: 'column',
    },
  },
};

// Add CSS animation for spinning icons
if (!document.querySelector('#campaign-details-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'campaign-details-styles';
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .campaign-details-table-row:hover {
      background-color: #f9f9f9 !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default CampaignDetails;