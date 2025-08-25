import React, { useState, useEffect } from 'react';
import { FiMonitor, FiWifi, FiSmartphone, FiSettings, FiDownload } from 'react-icons/fi';
import AudioPlayer from '../../components/Music/AudioPlayer';
import DesktopSystemMonitor from '../../components/Desktop/DesktopSystemMonitor';
import UpdateManager from '../../components/Desktop/UpdateManager';
import InstallationManager from '../../components/Desktop/InstallationManager';
import { useBusiness } from '../../contexts/BusinessContext';
import { useUserProfile } from '../../hooks/useUserProfile';

const DesktopMusicDashboard = () => {
  const { business } = useBusiness();
  const { profile } = useUserProfile();
  const [isElectron, setIsElectron] = useState(false);
  const [remoteServerInfo, setRemoteServerInfo] = useState(null);
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const checkElectron = async () => {
      if (window.electronAPI) {
        setIsElectron(true);
        await initializeDesktopFeatures();
      }
    };
    
    checkElectron();
  }, []);

  const initializeDesktopFeatures = async () => {
    try {
      // Get remote server info
      const serverInfo = await window.electronAPI.getServerInfo();
      setRemoteServerInfo(serverInfo);
      
      // Start remote server if not running
      if (!serverInfo.running) {
        await window.electronAPI.startRemoteServer();
      }
      
    } catch (error) {
      console.error('Desktop initialization error:', error);
    }
  };

  const generateQRCode = (url) => {
    // Simple QR code generation (in real app, use a proper QR library)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  // If not in Electron, show regular music dashboard
  if (!isElectron) {
    return (
      <div style={styles.fallbackContainer}>
        <div style={styles.fallbackMessage}>
          <FiMonitor size={48} style={styles.fallbackIcon} />
          <h2>Desktop Features Not Available</h2>
          <p>
            These features are only available in the Tavari Music Desktop application.
          </p>
          <AudioPlayer />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <FiMonitor size={32} style={styles.headerIcon} />
          <div>
            <h1 style={styles.title}>Tavari Music Desktop</h1>
            <p style={styles.subtitle}>
              Professional background music system for {business?.name || 'your business'}
            </p>
          </div>
        </div>
      </div>

      {/* Installation Check */}
      <InstallationManager />

      {/* Main Content Grid */}
      <div style={styles.contentGrid}>
        {/* Music Player Section */}
        <div style={styles.playerSection}>
          <h3 style={styles.sectionTitle}>Music Player</h3>
          <AudioPlayer />
        </div>

        {/* Remote Control Section */}
        <div style={styles.remoteSection}>
          <h3 style={styles.sectionTitle}>Remote Control</h3>
          <div style={styles.remoteContent}>
            {remoteServerInfo?.running ? (
              <div style={styles.remoteActive}>
                <div style={styles.remoteStatus}>
                  <FiWifi size={20} style={styles.statusIcon} />
                  <span>Remote control server active</span>
                </div>
                <div style={styles.remoteUrl}>
                  <strong>Access URL:</strong> {remoteServerInfo.url}
                </div>
                <div style={styles.remoteActions}>
                  <button 
                    style={styles.qrButton}
                    onClick={() => setShowQR(!showQR)}
                  >
                    <FiSmartphone size={16} />
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                  </button>
                </div>
                {showQR && (
                  <div style={styles.qrContainer}>
                    <img 
                      src={generateQRCode(remoteServerInfo.url)}
                      alt="QR Code for remote access"
                      style={styles.qrCode}
                    />
                    <p style={styles.qrInstructions}>
                      Scan with your phone to control music remotely
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.remoteInactive}>
                <p>Remote control server not available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Monitoring */}
      <DesktopSystemMonitor />

      {/* Update Management */}
      <UpdateManager />

      {/* Quick Settings */}
      <div style={styles.quickSettings}>
        <h3 style={styles.sectionTitle}>Quick Settings</h3>
        <div style={styles.settingsGrid}>
          <div style={styles.settingCard}>
            <FiSettings size={24} style={styles.settingIcon} />
            <div>
              <h4 style={styles.settingTitle}>Auto-Start</h4>
              <p style={styles.settingDescription}>Start with Windows</p>
            </div>
            <label style={styles.settingToggle}>
              <input type="checkbox" defaultChecked />
              <span style={styles.toggleSlider}></span>
            </label>
          </div>
          
          <div style={styles.settingCard}>
            <FiDownload size={24} style={styles.settingIcon} />
            <div>
              <h4 style={styles.settingTitle}>Auto-Update</h4>
              <p style={styles.settingDescription}>Download updates automatically</p>
            </div>
            <label style={styles.settingToggle}>
              <input type="checkbox" defaultChecked />
              <span style={styles.toggleSlider}></span>
            </label>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div style={styles.statusBar}>
        <div style={styles.statusItem}>
          <FiWifi size={16} />
          <span>Connected to Tavari Cloud</span>
        </div>
        <div style={styles.statusItem}>
          <FiMonitor size={16} />
          <span>Desktop App v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  fallbackContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '40px',
  },
  fallbackMessage: {
    textAlign: 'center',
    maxWidth: '600px',
  },
  fallbackIcon: {
    color: '#ccc',
    marginBottom: '20px',
  },
  header: {
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e9ecef',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  headerIcon: {
    color: '#20c997',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '30px',
    marginBottom: '40px',
  },
  playerSection: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
  },
  remoteSection: {
    backgroundColor: '#f8f9fa',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 20px 0',
  },
  remoteContent: {
    fontSize: '14px',
  },
  remoteActive: {
    color: '#333',
  },
  remoteStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '15px',
    color: '#28a745',
    fontWeight: '500',
  },
  statusIcon: {
    color: '#28a745',
  },
  remoteUrl: {
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  remoteActions: {
    marginBottom: '15px',
  },
  qrButton: {
    backgroundColor: '#20c997',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  qrContainer: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  qrCode: {
    maxWidth: '150px',
    height: 'auto',
    marginBottom: '10px',
  },
  qrInstructions: {
    fontSize: '12px',
    color: '#666',
    margin: '0',
  },
  remoteInactive: {
    color: '#dc3545',
    fontStyle: 'italic',
  },
  quickSettings: {
    backgroundColor: '#f8f9fa',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
    marginBottom: '30px',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  settingCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #e9ecef',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  settingIcon: {
    color: '#20c997',
  },
  settingTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 4px 0',
  },
  settingDescription: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  settingToggle: {
    position: 'relative',
    marginLeft: 'auto',
    cursor: 'pointer',
  },
  toggleSlider: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
    backgroundColor: '#e9ecef',
    borderRadius: '12px',
    transition: 'background-color 0.3s',
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 0',
    borderTop: '1px solid #e9ecef',
    fontSize: '14px',
    color: '#666',
    flexWrap: 'wrap',
    gap: '15px',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};

export default DesktopMusicDashboard;