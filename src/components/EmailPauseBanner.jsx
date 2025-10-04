// components/EmailPauseBanner.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPause, FiSettings } from 'react-icons/fi';

const EmailPauseBanner = ({ 
  showSettingsButton = true, 
  customMessage,
  style = {} 
}) => {
  const navigate = useNavigate();
  
  const [emailSendingPaused, setEmailSendingPaused] = useState(() => {
    const stored = localStorage.getItem('EMAIL_SENDING_PAUSED');
    return stored ? JSON.parse(stored) : true; // Default to paused for safety
  });

  // Listen for localStorage changes to update pause state in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('EMAIL_SENDING_PAUSED');
      setEmailSendingPaused(stored ? JSON.parse(stored) : true);
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for a custom event we can trigger from the same tab
    window.addEventListener('emailPauseStateChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('emailPauseStateChanged', handleStorageChange);
    };
  }, []);

  // Don't render anything if email sending is not paused
  if (!emailSendingPaused) {
    return null;
  }

  const defaultMessage = "All campaigns and email sends are currently blocked. Go to Mail Settings to enable sending.";
  const displayMessage = customMessage || defaultMessage;

  return (
    <div style={{...styles.pauseBanner, ...style}}>
      <div style={styles.pauseBannerContent}>
        <FiPause style={styles.pauseIcon} />
        <div style={styles.pauseText}>
          <strong>EMAIL SENDING PAUSED</strong>
          <span>{displayMessage}</span>
        </div>
        {showSettingsButton && (
          <button 
            style={styles.settingsButton}
            onClick={() => navigate('/dashboard/mail/settings')}
          >
            <FiSettings style={styles.buttonIcon} />
            Mail Settings
          </button>
        )}
      </div>
    </div>
  );
};

// Hook to get pause state for other components
export const useEmailPauseState = () => {
  const [emailSendingPaused, setEmailSendingPaused] = useState(() => {
    const stored = localStorage.getItem('EMAIL_SENDING_PAUSED');
    return stored ? JSON.parse(stored) : true;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('EMAIL_SENDING_PAUSED');
      setEmailSendingPaused(stored ? JSON.parse(stored) : true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('emailPauseStateChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('emailPauseStateChanged', handleStorageChange);
    };
  }, []);

  const toggleEmailSending = () => {
    const newState = !emailSendingPaused;
    setEmailSendingPaused(newState);
    localStorage.setItem('EMAIL_SENDING_PAUSED', JSON.stringify(newState));
    
    // Trigger custom event for same-tab updates
    window.dispatchEvent(new Event('emailPauseStateChanged'));
    
    return newState;
  };

  return { emailSendingPaused, toggleEmailSending };
};

// Helper function to block email sends with user feedback
export const blockEmailSendIfPaused = (actionName = 'email sending') => {
  const stored = localStorage.getItem('EMAIL_SENDING_PAUSED');
  const isPaused = stored ? JSON.parse(stored) : true;
  
  if (isPaused) {
    alert(`${actionName} is currently PAUSED. Go to Mail Settings to enable sending.`);
    return true; // Blocked
  }
  
  return false; // Not blocked
};

const styles = {
  pauseBanner: {
    backgroundColor: '#f44336',
    color: 'white',
    padding: '0',
    marginBottom: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
  },
  pauseBannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px 25px',
    flexWrap: 'wrap',
  },
  pauseIcon: {
    fontSize: '24px',
    color: 'white',
    flexShrink: 0,
  },
  pauseText: {
    flex: 1,
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  settingsButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  buttonIcon: {
    fontSize: '16px',
  },
  
  // Mobile responsiveness
  '@media (max-width: 768px)': {
    pauseBannerContent: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '15px',
    },
    settingsButton: {
      justifyContent: 'center',
    },
  },
};

export default EmailPauseBanner;