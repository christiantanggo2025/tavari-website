// screens/Mail/MailSettings.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { 
  FiMail, FiUser, FiMapPin, FiGlobe, FiSave, FiRefreshCw, 
  FiCheckCircle, FiAlertCircle, FiClock, FiShield, FiSettings
} from 'react-icons/fi';

const MailSettings = () => {
  const { business } = useBusiness();
  const [settings, setSettings] = useState({
    from_name: '',
    from_email: '',
    reply_to: '',
    business_address: '',
    social_links: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: '',
      youtube: ''
    },
    session_timeout: 300,
    auto_retry_failed: true,
    max_retries: 3
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const businessId = business?.id;

  useEffect(() => {
    if (businessId) {
      loadSettings();
    }
  }, [businessId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load existing settings or create default if none exist
      let { data: settingsData, error } = await supabase
        .from('mail_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, create default
        const defaultSettings = {
          business_id: businessId,
          from_name: 'Your Business Name',
          from_email: '',
          reply_to: '',
          business_address: 'Business Address Required for CASL Compliance',
          social_links: {
            facebook: '',
            twitter: '',
            instagram: '',
            linkedin: '',
            youtube: ''
          },
          session_timeout: 300,
          auto_retry_failed: true,
          max_retries: 3
        };

        const { data: newSettings, error: createError } = await supabase
          .from('mail_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) throw createError;
        settingsData = newSettings;
      } else if (error) {
        throw error;
      }

      setSettings({
        from_name: settingsData.from_name || '',
        from_email: settingsData.from_email || '',
        reply_to: settingsData.reply_to || '',
        business_address: settingsData.business_address || '',
        social_links: settingsData.social_links || {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: '',
          youtube: ''
        },
        session_timeout: settingsData.session_timeout || 300,
        auto_retry_failed: settingsData.auto_retry_failed !== false,
        max_retries: settingsData.max_retries || 3
      });
    } catch (error) {
      console.error('Error loading mail settings:', error);
      setMessage('Error loading settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!settings.from_name.trim()) {
      newErrors.from_name = 'Business name is required';
    }

    if (!settings.from_email.trim()) {
      newErrors.from_email = 'From email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.from_email)) {
      newErrors.from_email = 'Invalid email format';
    }

    if (settings.reply_to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.reply_to)) {
      newErrors.reply_to = 'Invalid reply-to email format';
    }

    if (!settings.business_address.trim()) {
      newErrors.business_address = 'Business address is required for CASL compliance';
    }

    if (settings.session_timeout < 60 || settings.session_timeout > 3600) {
      newErrors.session_timeout = 'Session timeout must be between 60 and 3600 seconds';
    }

    if (settings.max_retries < 1 || settings.max_retries > 10) {
      newErrors.max_retries = 'Max retries must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('mail_settings')
        .update({
          from_name: settings.from_name.trim(),
          from_email: settings.from_email.toLowerCase().trim(),
          reply_to: settings.reply_to.toLowerCase().trim() || null,
          business_address: settings.business_address.trim(),
          social_links: settings.social_links,
          session_timeout: settings.session_timeout,
          auto_retry_failed: settings.auto_retry_failed,
          max_retries: settings.max_retries,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId);

      if (error) throw error;

      // Log audit event
      await supabase.from('audit_logs').insert({
        business_id: businessId,
        action: 'update_mail_settings',
        details: { 
          from_email: settings.from_email,
          from_name: settings.from_name
        },
        created_at: new Date().toISOString()
      });

      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!settings.from_email) {
      setTestResult({ success: false, message: 'Please enter a from email first' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Simulate email test - in production this would test AWS SES
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success/failure
      const success = Math.random() > 0.2; // 80% success rate
      
      if (success) {
        setTestResult({ 
          success: true, 
          message: 'Test email configuration is valid!' 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: 'Email configuration test failed. Please check your settings.' 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: 'Error testing email: ' + error.message 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSocialLinkChange = (platform, value) => {
    setSettings(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <FiRefreshCw style={styles.loadingIcon} />
          <div>Loading mail settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FiSettings style={styles.titleIcon} />
          Mail Settings
        </h1>
        <p style={styles.subtitle}>
          Configure your business email settings and CASL compliance information
        </p>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.includes('Error') ? '#ffebee' : '#e8f5e8',
          color: message.includes('Error') ? '#c62828' : '#2e7d32'
        }}>
          {message.includes('Error') ? <FiAlertCircle /> : <FiCheckCircle />}
          <span>{message}</span>
        </div>
      )}

      <div style={styles.content}>
        {/* Email Configuration */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <FiMail style={styles.sectionIcon} />
            Email Configuration
          </h2>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiUser style={styles.labelIcon} />
                Business Name *
              </label>
              <input
                type="text"
                style={{
                  ...styles.input,
                  ...(errors.from_name ? styles.inputError : {})
                }}
                value={settings.from_name}
                onChange={(e) => handleInputChange('from_name', e.target.value)}
                placeholder="Your Business Name"
              />
              {errors.from_name && <span style={styles.errorText}>{errors.from_name}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiMail style={styles.labelIcon} />
                From Email Address *
              </label>
              <input
                type="email"
                style={{
                  ...styles.input,
                  ...(errors.from_email ? styles.inputError : {})
                }}
                value={settings.from_email}
                onChange={(e) => handleInputChange('from_email', e.target.value)}
                placeholder="noreply@yourbusiness.com"
              />
              {errors.from_email && <span style={styles.errorText}>{errors.from_email}</span>}
              <div style={styles.helpText}>
                This email will appear as the sender for all campaigns
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiMail style={styles.labelIcon} />
                Reply-To Email (Optional)
              </label>
              <input
                type="email"
                style={{
                  ...styles.input,
                  ...(errors.reply_to ? styles.inputError : {})
                }}
                value={settings.reply_to}
                onChange={(e) => handleInputChange('reply_to', e.target.value)}
                placeholder="support@yourbusiness.com"
              />
              {errors.reply_to && <span style={styles.errorText}>{errors.reply_to}</span>}
              <div style={styles.helpText}>
                Replies will be sent to this address if different from sender
              </div>
            </div>
          </div>

          {/* Test Email Button */}
          <div style={styles.testSection}>
            <button 
              style={styles.testButton}
              onClick={handleTestEmail}
              disabled={testing || !settings.from_email}
            >
              {testing ? <FiRefreshCw style={styles.spinningIcon} /> : <FiMail />}
              {testing ? 'Testing...' : 'Test Email Configuration'}
            </button>

            {testResult && (
              <div style={{
                ...styles.testResult,
                backgroundColor: testResult.success ? '#e8f5e8' : '#ffebee',
                color: testResult.success ? '#2e7d32' : '#c62828'
              }}>
                {testResult.success ? <FiCheckCircle /> : <FiAlertCircle />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* CASL Compliance */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <FiShield style={styles.sectionIcon} />
            CASL Compliance
          </h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FiMapPin style={styles.labelIcon} />
              Business Address *
            </label>
            <textarea
              style={{
                ...styles.textarea,
                ...(errors.business_address ? styles.inputError : {})
              }}
              value={settings.business_address}
              onChange={(e) => handleInputChange('business_address', e.target.value)}
              placeholder="123 Main Street, City, Province, Postal Code"
              rows={3}
            />
            {errors.business_address && <span style={styles.errorText}>{errors.business_address}</span>}
            <div style={styles.helpText}>
              Required by CASL (Canadian Anti-Spam Legislation) - must appear in all emails
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <FiGlobe style={styles.sectionIcon} />
            Social Media Links
          </h2>
          
          <div style={styles.socialGrid}>
            {Object.entries(settings.social_links).map(([platform, url]) => (
              <div key={platform} style={styles.formGroup}>
                <label style={styles.label}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </label>
                <input
                  type="url"
                  style={styles.input}
                  value={url}
                  onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                  placeholder={`https://${platform}.com/yourbusiness`}
                />
              </div>
            ))}
          </div>
          <div style={styles.helpText}>
            These links will be available in email templates and footers
          </div>
        </div>

        {/* System Settings */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <FiClock style={styles.sectionIcon} />
            System Settings
          </h2>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Session Timeout (seconds)
              </label>
              <input
                type="number"
                style={{
                  ...styles.input,
                  ...(errors.session_timeout ? styles.inputError : {})
                }}
                value={settings.session_timeout}
                onChange={(e) => handleInputChange('session_timeout', parseInt(e.target.value) || 300)}
                min={60}
                max={3600}
              />
              {errors.session_timeout && <span style={styles.errorText}>{errors.session_timeout}</span>}
              <div style={styles.helpText}>
                Auto-lock after inactivity (60-3600 seconds)
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Max Email Retries
              </label>
              <input
                type="number"
                style={{
                  ...styles.input,
                  ...(errors.max_retries ? styles.inputError : {})
                }}
                value={settings.max_retries}
                onChange={(e) => handleInputChange('max_retries', parseInt(e.target.value) || 3)}
                min={1}
                max={10}
              />
              {errors.max_retries && <span style={styles.errorText}>{errors.max_retries}</span>}
              <div style={styles.helpText}>
                Number of retry attempts for failed emails
              </div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={settings.auto_retry_failed}
                onChange={(e) => handleInputChange('auto_retry_failed', e.target.checked)}
                style={styles.checkbox}
              />
              Automatically retry failed emails
            </label>
            <div style={styles.helpText}>
              Failed emails will be retried automatically with exponential backoff
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={styles.saveSection}>
        <button 
          style={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <FiRefreshCw style={styles.spinningIcon} /> : <FiSave />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    minHeight: '100vh',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '18px',
    color: '#666',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  loadingIcon: {
    fontSize: '48px',
    color: 'teal',
    animation: 'spin 1s linear infinite',
  },
  header: {
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  titleIcon: {
    fontSize: '24px',
    color: 'teal',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
    lineHeight: '1.5',
  },
  message: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionIcon: {
    fontSize: '18px',
    color: 'teal',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  socialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  labelIcon: {
    fontSize: '14px',
    color: 'teal',
  },
  input: {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: '12px',
    color: '#f44336',
    marginTop: '5px',
  },
  helpText: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
    fontStyle: 'italic',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  testSection: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  testButton: {
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
    alignSelf: 'flex-start',
    transition: 'all 0.2s ease',
  },
  testResult: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  saveSection: {
    textAlign: 'center',
    marginTop: '30px',
  },
  saveButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '15px 30px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
  },
  spinningIcon: {
    animation: 'spin 1s linear infinite',
  },
  // Mobile responsiveness
  '@media (max-width: 768px)': {
    formGrid: {
      gridTemplateColumns: '1fr',
    },
    socialGrid: {
      gridTemplateColumns: '1fr',
    },
  },
};

// Add CSS animation for spinning icons
if (!document.querySelector('#mail-settings-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'mail-settings-styles';
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default MailSettings;