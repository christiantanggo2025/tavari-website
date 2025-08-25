// screens/Mail/UnsubscribePage.jsx - Public unsubscribe page
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FiMail, FiCheck, FiX, FiRefreshCw, FiArrowLeft, FiUser, FiSettings 
} from 'react-icons/fi';
import { supabase } from '../../supabaseClient';

const UnsubscribePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing'); // processing, success, error, already_unsubscribed
  const [contact, setContact] = useState(null);
  const [business, setBusiness] = useState(null);
  const [message, setMessage] = useState('');
  const [resubscribing, setResubscribing] = useState(false);

  // Extract token from URL
  const getTokenFromURL = () => {
    const params = new URLSearchParams(location.search);
    return params.get('token');
  };

  // Decode unsubscribe token
  const decodeToken = (token) => {
    try {
      const decoded = atob(token);
      const [contactId, businessId, timestamp] = decoded.split(':');
      return { contactId, businessId, timestamp };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Process unsubscribe
  useEffect(() => {
    const processUnsubscribe = async () => {
      const token = getTokenFromURL();
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid unsubscribe link. No token provided.');
        setLoading(false);
        return;
      }

      const tokenData = decodeToken(token);
      if (!tokenData) {
        setStatus('error');
        setMessage('Invalid unsubscribe token format.');
        setLoading(false);
        return;
      }

      const { contactId, businessId } = tokenData;

      try {
        // Get contact information
        const { data: contactData, error: contactError } = await supabase
          .from('mail_contacts')
          .select('*')
          .eq('id', contactId)
          .eq('business_id', businessId)
          .single();

        if (contactError) {
          console.error('Error fetching contact:', contactError);
          setStatus('error');
          setMessage('Contact not found or invalid token.');
          setLoading(false);
          return;
        }

        setContact(contactData);

        // Get business information
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .single();

        if (!businessError && businessData) {
          setBusiness(businessData);
        }

        // Check if already unsubscribed
        if (!contactData.subscribed) {
          setStatus('already_unsubscribed');
          setMessage('This email address is already unsubscribed from our mailing list.');
          setLoading(false);
          return;
        }

        // Process unsubscribe
        const { error: updateError } = await supabase
          .from('mail_contacts')
          .update({ 
            subscribed: false,
            unsubscribed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', contactId)
          .eq('business_id', businessId);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          setStatus('error');
          setMessage('Failed to process unsubscribe request. Please try again.');
          setLoading(false);
          return;
        }

        // Log unsubscribe event
        try {
          await supabase
            .from('mail_unsubscribes')
            .insert({
              business_id: businessId,
              email: contactData.email,
              contact_id: contactId,
              unsubscribed_at: new Date().toISOString(),
              source: 'email_link',
              ip_address: null, // Would need additional setup to capture IP
              user_agent: navigator.userAgent
            });
        } catch (logError) {
          console.warn('Failed to log unsubscribe event:', logError);
          // Don't fail the unsubscribe for logging issues
        }

        setStatus('success');
        setMessage('You have been successfully unsubscribed from our mailing list.');
        setLoading(false);

      } catch (error) {
        console.error('Error processing unsubscribe:', error);
        setStatus('error');
        setMessage('An error occurred while processing your request. Please try again.');
        setLoading(false);
      }
    };

    processUnsubscribe();
  }, [location.search]);

  // Handle resubscribe
  const handleResubscribe = async () => {
    if (!contact) return;

    setResubscribing(true);
    
    try {
      const { error } = await supabase
        .from('mail_contacts')
        .update({ 
          subscribed: true,
          unsubscribed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contact.id)
        .eq('business_id', contact.business_id);

      if (error) {
        console.error('Error resubscribing:', error);
        alert('Failed to resubscribe. Please try again.');
        return;
      }

      // Remove from unsubscribe log
      await supabase
        .from('mail_unsubscribes')
        .delete()
        .eq('contact_id', contact.id)
        .eq('business_id', contact.business_id);

      setStatus('resubscribed');
      setMessage('You have been resubscribed to our mailing list.');
      setContact(prev => ({ ...prev, subscribed: true }));

    } catch (error) {
      console.error('Error resubscribing:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setResubscribing(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <FiRefreshCw style={{ ...styles.statusIcon, animation: 'spin 1s linear infinite' }} />;
      case 'success':
        return <FiCheck style={{ ...styles.statusIcon, color: '#4caf50' }} />;
      case 'resubscribed':
        return <FiMail style={{ ...styles.statusIcon, color: '#2196f3' }} />;
      case 'already_unsubscribed':
        return <FiX style={{ ...styles.statusIcon, color: '#ff9800' }} />;
      case 'error':
      default:
        return <FiX style={{ ...styles.statusIcon, color: '#f44336' }} />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'processing':
        return 'Processing your request...';
      case 'success':
        return 'Successfully Unsubscribed';
      case 'resubscribed':
        return 'Successfully Resubscribed';
      case 'already_unsubscribed':
        return 'Already Unsubscribed';
      case 'error':
      default:
        return 'Error Processing Request';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#4caf50';
      case 'resubscribed':
        return '#2196f3';
      case 'already_unsubscribed':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#666';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>T</div>
            <span style={styles.logoText}>TAVARI</span>
          </div>
          <h1 style={styles.title}>Email Preferences</h1>
        </div>

        {/* Status Section */}
        <div style={styles.statusSection}>
          {getStatusIcon()}
          <h2 style={{ ...styles.statusTitle, color: getStatusColor() }}>
            {getStatusTitle()}
          </h2>
          <p style={styles.statusMessage}>{message}</p>
        </div>

        {/* Contact Information */}
        {contact && (
          <div style={styles.contactInfo}>
            <div style={styles.contactRow}>
              <FiMail style={styles.contactIcon} />
              <span style={styles.contactEmail}>{contact.email}</span>
            </div>
            {contact.first_name && contact.last_name && (
              <div style={styles.contactRow}>
                <FiUser style={styles.contactIcon} />
                <span style={styles.contactName}>
                  {contact.first_name} {contact.last_name}
                </span>
              </div>
            )}
            {business && (
              <div style={styles.contactRow}>
                <FiSettings style={styles.contactIcon} />
                <span style={styles.businessName}>
                  Communications from {business.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.actionsSection}>
          {status === 'success' && contact && (
            <div style={styles.actionGroup}>
              <p style={styles.actionDescription}>
                Changed your mind? You can resubscribe at any time.
              </p>
              <button
                style={styles.resubscribeButton}
                onClick={handleResubscribe}
                disabled={resubscribing}
              >
                {resubscribing ? (
                  <>
                    <FiRefreshCw style={{ ...styles.buttonIcon, animation: 'spin 1s linear infinite' }} />
                    Resubscribing...
                  </>
                ) : (
                  <>
                    <FiMail style={styles.buttonIcon} />
                    Resubscribe to Emails
                  </>
                )}
              </button>
            </div>
          )}

          {status === 'resubscribed' && (
            <div style={styles.actionGroup}>
              <p style={styles.actionDescription}>
                You'll continue to receive emails from us. Thank you for staying subscribed!
              </p>
            </div>
          )}

          {status === 'already_unsubscribed' && contact && (
            <div style={styles.actionGroup}>
              <p style={styles.actionDescription}>
                Want to receive emails again? You can resubscribe below.
              </p>
              <button
                style={styles.resubscribeButton}
                onClick={handleResubscribe}
                disabled={resubscribing}
              >
                {resubscribing ? (
                  <>
                    <FiRefreshCw style={{ ...styles.buttonIcon, animation: 'spin 1s linear infinite' }} />
                    Resubscribing...
                  </>
                ) : (
                  <>
                    <FiMail style={styles.buttonIcon} />
                    Resubscribe to Emails
                  </>
                )}
              </button>
            </div>
          )}

          {status === 'error' && (
            <div style={styles.actionGroup}>
              <p style={styles.actionDescription}>
                If you continue to have problems, please contact our support team.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            This is an automated system for managing email preferences.
            <br />
            {business?.name || 'Tavari Systems'} • 539 First Street, London, ON N5V 1Z5
          </p>
        </div>

        {/* Back to Home */}
        <div style={styles.backSection}>
          <button
            style={styles.backButton}
            onClick={() => window.location.href = 'https://tavarios.ca'}
          >
            <FiArrowLeft style={styles.buttonIcon} />
            Return to Tavari
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
  },
  header: {
    marginBottom: '30px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: 'teal',
    color: 'white',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    marginRight: '12px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  statusSection: {
    marginBottom: '30px',
    padding: '30px 20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  statusIcon: {
    fontSize: '48px',
    marginBottom: '15px',
  },
  statusTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  statusMessage: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.5',
    margin: 0,
  },
  contactInfo: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    textAlign: 'left',
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  contactIcon: {
    fontSize: '18px',
    color: 'teal',
    marginRight: '12px',
    width: '20px',
  },
  contactEmail: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  contactName: {
    fontSize: '14px',
    color: '#666',
  },
  businessName: {
    fontSize: '14px',
    color: '#666',
  },
  actionsSection: {
    marginBottom: '30px',
  },
  actionGroup: {
    marginBottom: '20px',
  },
  actionDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '15px',
    lineHeight: '1.5',
  },
  resubscribeButton: {
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
    justifyContent: 'center',
    gap: '8px',
    margin: '0 auto',
    transition: 'all 0.2s ease',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  footer: {
    borderTop: '1px solid #e0e0e0',
    paddingTop: '20px',
    marginBottom: '20px',
  },
  footerText: {
    fontSize: '12px',
    color: '#999',
    lineHeight: '1.4',
    margin: 0,
  },
  backSection: {
    borderTop: '1px solid #e0e0e0',
    paddingTop: '20px',
  },
  backButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 auto',
    transition: 'all 0.2s ease',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default UnsubscribePage;