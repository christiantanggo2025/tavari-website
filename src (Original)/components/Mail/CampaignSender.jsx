// src/components/Mail/CampaignSender.jsx - Send Campaign Modal
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import EmailService from '../../helpers/Mail/EmailService';
import { FiSend, FiX, FiAlertTriangle, FiCheckCircle, FiLoader } from 'react-icons/fi';

const CampaignSender = ({ campaign, isOpen, onClose, onSent }) => {
  const { business } = useBusiness();
  const [step, setStep] = useState('review'); // review, confirm, sending, complete
  const [contactStats, setContactStats] = useState(null);
  const [testEmails, setTestEmails] = useState('');
  const [sendingProgress, setSendingProgress] = useState(0);
  const [sendResult, setSendResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && campaign) {
      loadContactStats();
    }
  }, [isOpen, campaign]);

  const loadContactStats = async () => {
    try {
      const businessId = business?.id;
      if (!businessId) return;

      // Get total contacts
      const { data: totalContacts, error: totalError } = await supabase
        .from('mail_contacts')
        .select('id')
        .eq('business_id', businessId);

      if (totalError) throw totalError;

      // Get subscribed contacts
      const { data: subscribedContacts, error: subscribedError } = await supabase
        .from('mail_contacts')
        .select('id')
        .eq('business_id', businessId)
        .eq('subscribed', true);

      if (subscribedError) throw subscribedError;

      // Get unsubscribed count
      const { data: unsubscribedContacts, error: unsubscribedError } = await supabase
        .from('mail_unsubscribes')
        .select('id')
        .eq('business_id', businessId);

      if (unsubscribedError) throw unsubscribedError;

      setContactStats({
        total: totalContacts?.length || 0,
        subscribed: subscribedContacts?.length || 0,
        unsubscribed: unsubscribedContacts?.length || 0
      });

    } catch (error) {
      console.error('Error loading contact stats:', error);
    }
  };

  const handleSendTest = async () => {
    if (!testEmails.trim()) {
      alert('Please enter at least one test email address');
      return;
    }

    setLoading(true);
    try {
      const emails = testEmails.split(',').map(email => email.trim()).filter(Boolean);
      
      // Get mail settings
      const { data: settings, error } = await supabase
        .from('mail_settings')
        .select('*')
        .eq('business_id', business?.id)
        .single();

      if (error) throw error;

      // Send test emails
      for (const email of emails) {
        const testHTML = campaign.content_html
          .replace('{UnsubscribeLink}', '#test-unsubscribe')
          .replace('{UpdatePreferencesLink}', '#test-preferences')
          .replace('{Email}', email);

        await EmailService.sendViaSES({
          to: email,
          from: `${settings.from_name} <${settings.from_email}>`,
          subject: `[TEST] ${campaign.subject_line}`,
          html: testHTML,
          replyTo: settings.reply_to || settings.from_email
        });
      }

      alert(`Test emails sent to: ${emails.join(', ')}`);
      
    } catch (error) {
      console.error('Test send error:', error);
      alert('Error sending test emails: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    setStep('sending');
    setLoading(true);
    
    try {
      const result = await EmailService.queueCampaign(campaign.id, business?.id);
      
      if (result.success) {
        setSendResult(result);
        setStep('complete');
        
        // Simulate progress updates
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 10;
          if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
          }
          setSendingProgress(Math.round(progress));
        }, 500);

        // Call onSent callback after a delay
        setTimeout(() => {
          onSent && onSent();
        }, 3000);
        
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Send campaign error:', error);
      alert('Error sending campaign: ' + error.message);
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  const validateCampaign = () => {
    const errors = [];

    if (!campaign.name?.trim()) {
      errors.push('Campaign name is required');
    }

    if (!campaign.subject_line?.trim()) {
      errors.push('Subject line is required');
    }

    if (!campaign.content_html || campaign.content_html.trim().length < 50) {
      errors.push('Campaign content is too short');
    }

    if (!contactStats || contactStats.subscribed === 0) {
      errors.push('No subscribed contacts found');
    }

    return errors;
  };

  const resetModal = () => {
    setStep('review');
    setSendingProgress(0);
    setSendResult(null);
    setTestEmails('');
  };

  if (!isOpen) return null;

  const validationErrors = validateCampaign();

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {step === 'review' && 'Send Campaign'}
            {step === 'confirm' && 'Confirm Send'}
            {step === 'sending' && 'Sending Campaign'}
            {step === 'complete' && 'Campaign Sent'}
          </h2>
          <button 
            style={styles.closeButton} 
            onClick={() => {
              resetModal();
              onClose();
            }}
          >
            <FiX />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {step === 'review' && (
            <>
              {/* Campaign Overview */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Campaign Overview</h3>
                <div style={styles.campaignInfo}>
                  <div style={styles.infoRow}>
                    <strong>Name:</strong> {campaign.name}
                  </div>
                  <div style={styles.infoRow}>
                    <strong>Subject:</strong> {campaign.subject_line}
                  </div>
                  {campaign.preheader_text && (
                    <div style={styles.infoRow}>
                      <strong>Preheader:</strong> {campaign.preheader_text}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Statistics */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Recipient Information</h3>
                {contactStats ? (
                  <div style={styles.statsGrid}>
                    <div style={styles.statBox}>
                      <div style={styles.statNumber}>{contactStats.subscribed}</div>
                      <div style={styles.statLabel}>Will Receive Email</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statNumber}>{contactStats.total}</div>
                      <div style={styles.statLabel}>Total Contacts</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statNumber}>{contactStats.unsubscribed}</div>
                      <div style={styles.statLabel}>Unsubscribed</div>
                    </div>
                  </div>
                ) : (
                  <div style={styles.loading}>Loading contact information...</div>
                )}
              </div>

              {/* Test Email Section */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Send Test Email</h3>
                <div style={styles.testEmailSection}>
                  <input
                    type="text"
                    style={styles.testEmailInput}
                    placeholder="Enter test email addresses (comma separated)"
                    value={testEmails}
                    onChange={(e) => setTestEmails(e.target.value)}
                  />
                  <button
                    style={styles.testButton}
                    onClick={handleSendTest}
                    disabled={loading || !testEmails.trim()}
                  >
                    {loading ? <FiLoader className="spin" /> : <FiSend />}
                    Send Test
                  </button>
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div style={styles.errorSection}>
                  <div style={styles.errorHeader}>
                    <FiAlertTriangle />
                    Please fix these issues before sending:
                  </div>
                  <ul style={styles.errorList}>
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {step === 'confirm' && (
            <div style={styles.confirmSection}>
              <div style={styles.confirmIcon}>
                <FiAlertTriangle size={48} color="#ff9800" />
              </div>
              <h3 style={styles.confirmTitle}>Ready to Send?</h3>
              <p style={styles.confirmText}>
                This campaign will be sent to <strong>{contactStats?.subscribed || 0}</strong> subscribers.
                This action cannot be undone.
              </p>
              <div style={styles.confirmButtons}>
                <button 
                  style={styles.cancelButton}
                  onClick={() => setStep('review')}
                >
                  Cancel
                </button>
                <button 
                  style={styles.confirmButton}
                  onClick={handleSendCampaign}
                >
                  <FiSend />
                  Send Now
                </button>
              </div>
            </div>
          )}

          {step === 'sending' && (
            <div style={styles.sendingSection}>
              <div style={styles.sendingIcon}>
                <FiLoader size={48} color="teal" className="spin" />
              </div>
              <h3 style={styles.sendingTitle}>Sending Campaign</h3>
              <p style={styles.sendingText}>
                Your campaign is being sent to {contactStats?.subscribed || 0} recipients.
              </p>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${sendingProgress}%`
                  }}
                />
              </div>
              <div style={styles.progressText}>
                {sendingProgress}% complete
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div style={styles.completeSection}>
              <div style={styles.completeIcon}>
                <FiCheckCircle size={48} color="#4caf50" />
              </div>
              <h3 style={styles.completeTitle}>Campaign Sent Successfully!</h3>
              <p style={styles.completeText}>
                Your campaign has been queued and is being delivered to {sendResult?.recipientCount || 0} recipients.
              </p>
              <button 
                style={styles.doneButton}
                onClick={() => {
                  resetModal();
                  onClose();
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div style={styles.footer}>
            <button 
              style={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              style={styles.primaryButton}
              onClick={() => setStep('confirm')}
              disabled={validationErrors.length > 0}
            >
              <FiSend />
              Continue to Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
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
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '5px',
  },
  content: {
    padding: '25px',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  section: {
    marginBottom: '25px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
  },
  campaignInfo: {
    backgroundColor: '#f8f8f8',
    padding: '15px',
    borderRadius: '8px',
  },
  infoRow: {
    marginBottom: '8px',
    fontSize: '14px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
  },
  statBox: {
    textAlign: 'center',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'teal',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
  },
  testEmailSection: {
    display: 'flex',
    gap: '10px',
    alignItems: 'stretch',
  },
  testEmailInput: {
    flex: 1,
    padding: '10px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  testButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '6px',
    padding: '10px 15px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap',
  },
  errorSection: {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '8px',
    padding: '15px',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#c62828',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  errorList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#c62828',
  },
  confirmSection: {
    textAlign: 'center',
    padding: '20px',
  },
  confirmIcon: {
    marginBottom: '20px',
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
  },
  confirmText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '25px',
  },
  confirmButtons: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  sendingSection: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  sendingIcon: {
    marginBottom: '20px',
  },
  sendingTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  sendingText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '30px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#eee',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'teal',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#666',
  },
  completeSection: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  completeIcon: {
    marginBottom: '20px',
  },
  completeTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
  },
  completeText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '25px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderTop: '1px solid #eee',
  },
  cancelButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  confirmButton: {
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  primaryButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  doneButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 30px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: '20px',
  },
};

export default CampaignSender;