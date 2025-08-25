import React, { useState, useEffect } from 'react';
import { FiDownload, FiCheck, FiAlertCircle, FiKey } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';

const InstallationManager = () => {
  const { business } = useBusiness();
  const [installationData, setInstallationData] = useState(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('license'); // license, register, complete

  useEffect(() => {
    checkExistingInstallation();
  }, []);

  const checkExistingInstallation = async () => {
    try {
      // Check if this device is already registered
      const deviceInfo = await window.electronAPI?.getSystemInfo();
      if (!deviceInfo) return; // Not in Electron environment
      
      const { data, error } = await supabase
        .from('music_installations')
        .select('*')
        .eq('device_fingerprint', deviceInfo.fingerprint)
        .eq('status', 'active')
        .single();

      if (data) {
        setInstallationData(data);
        setStep('complete');
      }
    } catch (error) {
      console.log('No existing installation found');
    }
  };

  const validateAndRegister = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate license key
      const { data: license, error: licenseError } = await supabase
        .from('music_license_keys')
        .select('*')
        .eq('license_key', licenseKey)
        .eq('status', 'active')
        .single();

      if (licenseError || !license) {
        setError('Invalid or expired license key');
        setLoading(false);
        return;
      }

      // Check installation limit
      if (license.current_installations >= license.max_installations) {
        setError('License key has reached maximum installations');
        setLoading(false);
        return;
      }

      // Get device information
      const deviceInfo = await window.electronAPI.getSystemInfo();
      const registrationData = await window.electronAPI.registerInstallation({
        businessId: license.business_id,
        licenseKey: licenseKey
      });

      // Register installation in database
      const { data: installation, error: installError } = await supabase
        .from('music_installations')
        .insert({
          business_id: license.business_id,
          device_fingerprint: registrationData.fingerprint,
          device_name: registrationData.device_name,
          windows_version: registrationData.windows_version,
          app_version: registrationData.app_version,
          license_type: license.license_type || 'trial',
          expires_at: license.expires_at
        })
        .select()
        .single();

      if (installError) throw installError;

      // Update license key usage
      await supabase
        .from('music_license_keys')
        .update({ 
          current_installations: license.current_installations + 1 
        })
        .eq('id', license.id);

      setInstallationData(installation);
      setStep('complete');
      
      // Show success notification
      window.electronAPI?.showNotification(
        'Installation Complete',
        'Tavari Music Desktop is now activated!'
      );

    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to register installation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    await window.electronAPI?.restartApp();
  };

  if (step === 'complete' && installationData) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <FiCheck size={48} style={styles.successIcon} />
          <h2 style={styles.title}>Installation Complete!</h2>
          <p style={styles.subtitle}>
            Tavari Music Desktop is now activated and ready to use.
          </p>
          
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <strong>Device:</strong> {installationData.device_name}
            </div>
            <div style={styles.infoItem}>
              <strong>License Type:</strong> {installationData.license_type}
            </div>
            <div style={styles.infoItem}>
              <strong>Version:</strong> {installationData.app_version}
            </div>
            <div style={styles.infoItem}>
              <strong>Activated:</strong> {new Date(installationData.installed_at).toLocaleDateString()}
            </div>
          </div>

          <button style={styles.restartButton} onClick={handleRestart}>
            <FiDownload size={16} />
            Restart to Complete Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <FiKey size={48} style={styles.keyIcon} />
        <h2 style={styles.title}>Activate Tavari Music Desktop</h2>
        <p style={styles.subtitle}>
          Enter your license key to activate this installation.
        </p>

        <div style={styles.form}>
          <input
            type="text"
            style={styles.input}
            placeholder="Enter license key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
            maxLength={50}
          />
          
          {error && (
            <div style={styles.error}>
              <FiAlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            style={styles.activateButton}
            onClick={validateAndRegister}
            disabled={loading || !licenseKey.trim()}
          >
            {loading ? 'Activating...' : 'Activate Installation'}
          </button>
        </div>

        <div style={styles.help}>
          <h4>Need Help?</h4>
          <p>
            Contact your system administrator or Tavari support for your license key.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '2px solid #e9ecef',
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '2px solid #28a745',
  },
  keyIcon: {
    color: '#20c997',
    marginBottom: '20px',
  },
  successIcon: {
    color: '#28a745',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
  },
  form: {
    marginBottom: '30px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: '2px',
    marginBottom: '20px',
    boxSizing: 'border-box',
  },
  error: {
    color: '#dc3545',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  activateButton: {
    backgroundColor: '#20c997',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
  },
  restartButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    margin: '20px auto 0 auto',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    margin: '30px 0',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  infoItem: {
    fontSize: '14px',
    color: '#333',
  },
  help: {
    textAlign: 'left',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
};

export default InstallationManager;