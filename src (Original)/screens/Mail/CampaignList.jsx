// screens/Mail/CampaignList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { FiMail, FiPlus, FiEdit3, FiSend, FiEye, FiTrash2, FiCopy, FiClock, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

const CampaignList = () => {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, draft, sent, scheduled
  const [error, setError] = useState(null);

  const businessId = business?.id;

  useEffect(() => {
    if (businessId) {
      loadCampaigns();
    }
  }, [businessId, filter]);

  const loadCampaigns = async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('mail_campaigns')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading campaigns:', error);
        setError('Failed to load campaigns. Please try again.');
        setCampaigns([]);
        return;
      }

      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setError('Failed to load campaigns. Please try again.');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <FiCheckCircle style={{ color: '#4caf50' }} />;
      case 'draft':
        return <FiEdit3 style={{ color: '#ff9800' }} />;
      case 'scheduled':
        return <FiClock style={{ color: '#2196f3' }} />;
      case 'failed':
        return <FiAlertCircle style={{ color: '#f44336' }} />;
      case 'sending':
        return <FiRefreshCw style={{ color: '#2196f3' }} />;
      default:
        return <FiMail style={{ color: '#666' }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'draft':
        return 'Draft';
      case 'scheduled':
        return 'Scheduled';
      case 'failed':
        return 'Failed';
      case 'sending':
        return 'Sending';
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = (campaignId) => {
    navigate(`/dashboard/mail/builder/${campaignId}`);
  };

  const handleDuplicate = async (campaign) => {
    try {
      // Create a duplicate campaign
      const duplicateData = {
        business_id: businessId,
        name: `${campaign.name} (Copy)`,
        subject_line: campaign.subject_line,
        preheader_text: campaign.preheader_text,
        content_json: campaign.content_json,
        content_html: campaign.content_html,
        status: 'draft',
        total_recipients: 0,
        emails_sent: 0,
        created_by: campaign.created_by
      };

      const { data, error } = await supabase
        .from('mail_campaigns')
        .insert([duplicateData])
        .select()
        .single();

      if (error) {
        console.error('Error duplicating campaign:', error);
        alert('Failed to duplicate campaign. Please try again.');
        return;
      }

      // Reload campaigns to show the new duplicate
      loadCampaigns();
      
      // Navigate to edit the new campaign
      navigate(`/dashboard/mail/builder/${data.id}`);
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      alert('Failed to duplicate campaign. Please try again.');
    }
  };

  const handleDelete = async (campaignId, campaignName) => {
    if (!window.confirm(`Are you sure you want to delete "${campaignName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('mail_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('business_id', businessId);

      if (error) {
        console.error('Error deleting campaign:', error);
        alert('Failed to delete campaign. Please try again.');
        return;
      }

      // Reload campaigns to remove the deleted one
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign. Please try again.');
    }
  };

  const filteredCampaigns = campaigns;

  // Count campaigns by status for filter tabs
  const campaignCounts = {
    all: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    sending: campaigns.filter(c => c.status === 'sending').length
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <FiRefreshCw style={{ ...styles.loadingIcon, animation: 'spin 1s linear infinite' }} />
          <div>Loading campaigns...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Email Campaigns</h1>
          <p style={styles.subtitle}>Create and manage your email marketing campaigns</p>
        </div>
        <button 
          style={styles.createButton}
          onClick={() => navigate('/dashboard/mail/builder')}
        >
          <FiPlus style={styles.buttonIcon} />
          Create Campaign
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorMessage}>
          <FiAlertCircle style={styles.errorIcon} />
          <span>{error}</span>
          <button 
            style={styles.retryButton}
            onClick={loadCampaigns}
          >
            <FiRefreshCw style={styles.buttonIcon} />
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={styles.filterTabs}>
        {[
          { key: 'all', label: `All (${campaignCounts.all})` },
          { key: 'draft', label: `Drafts (${campaignCounts.draft})` },
          { key: 'sent', label: `Sent (${campaignCounts.sent})` },
          { key: 'scheduled', label: `Scheduled (${campaignCounts.scheduled})` },
          ...(campaignCounts.sending > 0 ? [{ key: 'sending', label: `Sending (${campaignCounts.sending})` }] : [])
        ].map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.filterTab,
              ...(filter === tab.key ? styles.activeFilterTab : {})
            }}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><FiMail /></div>
          <h3 style={styles.emptyTitle}>
            {filter === 'all' 
              ? 'No campaigns found'
              : `No ${filter} campaigns found`
            }
          </h3>
          <p style={styles.emptyText}>
            {filter === 'all' 
              ? "You haven't created any campaigns yet. Create your first email campaign to get started!"
              : `No campaigns with status "${filter}" found. Try switching to a different filter or create a new campaign.`
            }
          </p>
          <button 
            style={styles.emptyButton}
            onClick={() => navigate('/dashboard/mail/builder')}
          >
            <FiPlus style={styles.buttonIcon} />
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div style={styles.campaignsList}>
          {filteredCampaigns.map(campaign => (
            <div key={campaign.id} style={styles.campaignCard}>
              <div style={styles.campaignHeader}>
                <div style={styles.campaignInfo}>
                  <div style={styles.campaignName}>{campaign.name}</div>
                  <div style={styles.campaignSubject}>{campaign.subject_line}</div>
                </div>
                <div style={styles.campaignStatus}>
                  {getStatusIcon(campaign.status)}
                  <span style={styles.statusText}>{getStatusText(campaign.status)}</span>
                </div>
              </div>
              
              <div style={styles.campaignStats}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Recipients:</span>
                  <span style={styles.statValue}>
                    {(campaign.total_recipients || 0).toLocaleString()}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Sent:</span>
                  <span style={styles.statValue}>
                    {(campaign.emails_sent || 0).toLocaleString()}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Created:</span>
                  <span style={styles.statValue}>{formatDate(campaign.created_at)}</span>
                </div>
                {campaign.sent_at && (
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Sent:</span>
                    <span style={styles.statValue}>{formatDate(campaign.sent_at)}</span>
                  </div>
                )}
                {campaign.scheduled_at && (
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Scheduled:</span>
                    <span style={styles.statValue}>{formatDate(campaign.scheduled_at)}</span>
                  </div>
                )}
              </div>
              
              <div style={styles.campaignActions}>
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                  <button 
                    style={styles.actionButton}
                    onClick={() => handleEdit(campaign.id)}
                  >
                    <FiEdit3 style={styles.actionIcon} />
                    Edit
                  </button>
                )}
                
                <button 
                  style={styles.actionButton}
                  onClick={() => navigate(`/dashboard/mail/campaigns/${campaign.id}`)}
                >
                  <FiEye style={styles.actionIcon} />
                  View Details
                </button>
                
                <button 
                  style={styles.actionButton}
                  onClick={() => handleDuplicate(campaign)}
                >
                  <FiCopy style={styles.actionIcon} />
                  Duplicate
                </button>
                
                {campaign.status === 'draft' && (
                  <button 
                    style={{...styles.actionButton, ...styles.sendButton}}
                    onClick={() => navigate(`/dashboard/mail/send/${campaign.id}`)}
                  >
                    <FiSend style={styles.actionIcon} />
                    Send Now
                  </button>
                )}
                
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                  <button 
                    style={{...styles.actionButton, ...styles.deleteButton}}
                    onClick={() => handleDelete(campaign.id, campaign.name)}
                  >
                    <FiTrash2 style={styles.actionIcon} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerLeft: {
    flex: 1,
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
  createButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
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
  errorMessage: {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#f44336',
  },
  errorIcon: {
    fontSize: '18px',
  },
  retryButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
  },
  filterTabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '30px',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '4px',
    border: '1px solid #ddd',
    flexWrap: 'wrap',
  },
  filterTab: {
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  activeFilterTab: {
    backgroundColor: 'teal',
    color: 'white',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  emptyIcon: {
    fontSize: '48px',
    color: '#ccc',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
    lineHeight: '1.5',
  },
  emptyButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  campaignsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  campaignCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    transition: 'all 0.2s ease',
  },
  campaignHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
    gap: '20px',
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px',
  },
  campaignSubject: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.4',
  },
  campaignStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f8f8f8',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
  },
  statusText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  campaignStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '16px',
    color: '#333',
    fontWeight: 'bold',
  },
  campaignActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: 'white',
    border: '2px solid #ddd',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  actionIcon: {
    fontSize: '14px',
  },
  sendButton: {
    backgroundColor: 'teal',
    borderColor: 'teal',
    color: 'white',
  },
  deleteButton: {
    borderColor: '#f44336',
    color: '#f44336',
  },
};

export default CampaignList;