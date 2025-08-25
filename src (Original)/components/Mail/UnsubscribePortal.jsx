// src/components/Mail/UnsubscribePortal.jsx - Public unsubscribe page
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FiCheckCircle, FiAlertTriangle, FiMail, FiSettings } from 'react-icons/fi';

const UnsubscribePortal = () => {
  const location = useLocation();
  const [status, setStatus] = useState('loading'); // loading, success, error, already_unsubscribed
  const [tokenData, setTokenData] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [message, setMessage] = useState('');
  const [showResubscribe, setShowResubscribe] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    
    if (token) {
      processUnsubscribe(token);
    } else {
      setStatus('error');
      setMessage('Invalid unsubscribe link. No token provided.');
    }
  }, [location]);

  const processUnsubscribe = async (token) => {
    try {
      // Decode token
      const decodedData = JSON.parse(atob(token));
      const { campaign, contact, business, timestamp } = decodedData;
      
      setTokenData(decodedData);

      // Check if token is too old (30 days)
      const tokenAge = Date.now() - timestamp;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (tokenAge > maxAge) {
        setStatus('error');
        setMessage('This unsubscribe link has expired. Please contact us directly to unsubscribe.');
        return;
      }

      // Get business information
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', business)
        .single();

      if (businessError) throw businessError;
      setBusinessName(businessData.name);

      // Check if already unsubscribed
      const { data: existingUnsubscribe } = await supabase
        .from('mail_unsubscribes')
        .select('*')
        .eq('business_id', business)
        .eq('contact_id', contact)
        .single();

      if (existingUnsubscribe) {
        setStatus('already_unsubscribed');
        setShowResubscribe(true);
        setMessage(`You are already unsubscribed from ${businessData.name} emails.`);
        return;
      }

      // Process unsubscribe
      await performUnsubscribe(business, contact, campaign);
      
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setStatus('error');
      setMessage('There was an error processing your unsubscribe request. Please try again or contact support.');
    }
  };

  const performUnsubscribe = async (businessId, contactId, campaignId) => {
    try {
      // Get contact information
      const { data: contactData, error: contactError } = await supabase
        .from('mail_contacts')
        .select('email')
        .eq('id', contactId)
        .single();

      if (contactError) throw contactError;

      // Add to unsubscribes table
      const { error: unsubscribeError } = await supabase
        .from('mail_unsubscribes')
        .insert({
          business_id: businessId,
          email: contactData.email,
          contact_id: contactId,
          campaign_id: campaignId,
          unsubscribed_at: new Date().toISOString(),
          source: 'campaign_link',
          ip_address: null, // Would be set by backend in production
          user_agent: navigator.userAgent
        });

      if (unsubscribeError && unsubscribeError.code !== '23505') { // Ignore duplicate key error
        throw unsubscribeError;
      }

      // Update contact subscription status
      const { error: updateError } = await supabase
        .from('mail_contacts')
        .update({
          subscribed: false,
          unsubscribed_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (updateError) throw updateError;

      setStatus('success');
      setMessage(`You have been successfully unsubscribed from ${businessName} emails.`);
      setShowResubscribe(true);

    } catch (error) {
      console.error('Perform unsubscribe error:', error);
      setStatus('error');
      setMessage('There was an error processing your unsubscribe request.');
    }
  };

  const handleResubscribe = async () => {
    if (!tokenData) return;

    try {
      const { contact, business } = tokenData;

      // Remove from unsubscribes table
      await supabase
        .from('mail_unsubscribes')
        .delete()
        .eq('business_id', business)
        .eq('contact_id', contact);

      // Update contact subscription status
      await supabase
        .from('mail_contacts')
        .update({
          subscribed: true,
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null
        })
        .eq('id', contact);

      setStatus('resubscribed');
      setMessage(`You have been resubscribed to ${businessName} emails.`);
      setShowResubscribe(false);

    } catch (error) {
      console.error('Resubscribe error:', error);
      setMessage('There was an error resubscribing. Please contact us directly.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div style={styles.statusSection}>
            <div style={styles.loadingIcon}>
              <div style={styles.spinner}></div>
            </div>
            <h2 style={styles.statusTitle}>Processing Request</h2>
            <p style={styles.statusText}>Please wait while we process your unsubscribe request...</p>
          </div>
        );

      case 'success':
        return (
          <div style={styles.statusSection}>
            <div style={styles.successIcon}>
              <FiCheckCircle size={64} color="#4caf50" />
            </div>
            <h2 style={styles.statusTitle}>Successfully Unsubscribed</h2>
            <p style={styles.statusText}>{message}</p>
            <div style={styles.infoBox}>
              <p><strong>What this means:</strong></p>
              <ul style={styles.infoList}>
                <li>You will no longer receive marketing emails from {businessName}</li>
                <li>You may still receive transactional emails (receipts, confirmations)</li>
                <li>Your contact information will be kept to honor this unsubscribe request</li>
              </ul>
            </div>
            {showResubscribe && (
              <div style={styles.resubscribeSection}>
                <p style={styles.resubscribeText}>
                  Changed your mind? You can resubscribe at any time.
                </p>
                <button style={styles.resubscribeButton} onClick={handleResubscribe}>
                  <FiMail />
                  Resubscribe to Emails
                </button>
              </div>
            )}
          </div>
        );

      case 'already_unsubscribed':
        return (
          <div style={styles.statusSection}>
            <div style={styles.infoIcon}>
              <FiSettings size={64} color="#ff9800" />
            </div>
            <h2 style={styles.statusTitle}>Already Unsubscribed</h2>
            <p style={styles.statusText}>{message}</p>
            {showResubscribe && (
              <div style={styles.resubscribeSection}>
                <p style={styles.resubscribeText}>
                  Would you like to resubscribe to receive emails from {businessName}?
                </p>
                <button style={styles.resubscribeButton} onClick={handleResubscribe}>
                  <FiMail />
                  Resubscribe to Emails
                </button>
              </div>
            )}
          </div>
        );

      case 'resubscribed':
        return (
          <div style={styles.statusSection}>
            <div style={styles.successIcon}>
              <FiCheckCircle size={64} color="#4caf50" />
            </div>
            <h2 style={styles.statusTitle}>Welcome Back!</h2>
            <p style={styles.statusText}>{message}</p>
            <div style={styles.infoBox}>
              <p><strong>What this means:</strong></p>
              <ul style={styles.infoList}>
                <li>You will receive marketing emails from {businessName} again</li>
                <li>You can unsubscribe at any time using the link in our emails</li>
                <li>We respect your privacy and email preferences</li>
              </ul>
            </div>
          </div>
        );

      case 'error':
        return (
          <div style={styles.statusSection}>
            <div style={styles.errorIcon}>
              <FiAlertTriangle size={64} color="#f44336" />
            </div>
            <h2 style={styles.statusTitle}>Unable to Process Request</h2>
            <p style={styles.statusText}>{message}</p>
            <div style={styles.supportSection}>
              <p><strong>Need help?</strong></p>
              <p>Please contact {businessName} directly:</p>
              <ul style={styles.supportList}>
                <li>Forward this email to them with your unsubscribe request</li>
                <li>Visit their website for contact information</li>
                <li>Call them directly if you have their phone number</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Email Preferences</h1>
        {businessName && (
          <p style={styles.businessName}>for {businessName}</p>
        )}
      </div>
      
      <div style={styles.content}>
        {renderContent()}
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          This page is secured and your privacy is protected.
        </p>
        <p style={styles.footerText}>
          Powered by Tavari Mail
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f8f8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  businessName: {
    fontSize: '18px',
    color: '#666',
    margin: 0,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    marginBottom: '40px',
  },
  statusSection: {
    textAlign: 'center',
  },
  loadingIcon: {
    marginBottom: '30px',
  },
  spinner: {
    width: '64px',
    height: '64px',
    border: '6px solid #f3f3f3',
    borderTop: '6px solid teal',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  successIcon: {
    marginBottom: '30px',
  },
  infoIcon: {
    marginBottom: '30px',
  },
  errorIcon: {
    marginBottom: '30px',
  },
  statusTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  statusText: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '30px',
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    border: '1px solid #b3d9ff',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'left',
    marginBottom: '30px',
  },
  infoList: {
    margin: '10px 0 0 0',
    paddingLeft: '20px',
    color: '#333',
  },
  resubscribeSection: {
    borderTop: '1px solid #eee',
    paddingTop: '30px',
    marginTop: '30px',
  },
  resubscribeText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px',
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  supportSection: {
    backgroundColor: '#fff3e0',
    border: '1px solid #ffcc80',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'left',
  },
  supportList: {
    margin: '10px 0 0 0',
    paddingLeft: '20px',
    color: '#333',
  },
  footer: {
    textAlign: 'center',
    color: '#999',
  },
  footerText: {
    fontSize: '14px',
    margin: '5px 0',
  },
};

// Add CSS for spinner animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default UnsubscribePortal;