import React, { useState, useEffect } from 'react';
import { FiDownload, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';

const UpdateManager = () => {
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, downloading, ready, error
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState('');
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);

  useEffect(() => {
    initializeUpdateManager();
    const interval = setInterval(checkForUpdates, 3600000); // Check every hour
    
    return () => clearInterval(interval);
  }, []);

  const initializeUpdateManager = async () => {
    // Get current version from Electron
    const systemInfo = await window.electronAPI?.getSystemInfo();
    if (systemInfo?.appVersion) {
      setCurrentVersion(systemInfo.appVersion);
    }
    
    // Initial update check
    checkForUpdates();
  };

  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    setError('');
    
    try {
      // Check Supabase for latest version
      const { data, error } = await supabase
        .from('music_app_versions')
        .select('*')
        .eq('status', 'active')
        .order('released_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data && isNewerVersion(data.version_number, currentVersion)) {
        setAvailableUpdate(data);
        setUpdateStatus('available');
        
        // Auto-download if enabled
        if (autoUpdateEnabled) {
          downloadUpdate(data);
        }
      } else {
        setUpdateStatus('current');
        setAvailableUpdate(null);
      }
      
    } catch (error) {
      console.error('Update check failed:', error);
      setError('Failed to check for updates');
      setUpdateStatus('error');
    }
  };

  const isNewerVersion = (latest, current) => {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  };

  const downloadUpdate = async (updateData) => {
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    
    try {
      // Simulate download progress (in real implementation, this would use Electron's download manager)
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setUpdateStatus('ready');
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download update');
      setUpdateStatus('error');
    }
  };

  const installUpdate = async () => {
    try {
      // In Electron, this would trigger app restart and update installation
      await window.electronAPI?.restartApp();
    } catch (error) {
      console.error('Install failed:', error);
      setError('Failed to install update');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusIcon = () => {
    switch (updateStatus) {
      case 'checking':
        return <FiRefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />;
      case 'current':
        return <FiCheck size={20} color="#28a745" />;
      case 'available':
        return <FiDownload size={20} color="#20c997" />;
      case 'downloading':
        return <FiDownload size={20} color="#ffc107" />;
      case 'ready':
        return <FiCheck size={20} color="#28a745" />;
      case 'error':
        return <FiAlertCircle size={20} color="#dc3545" />;
      default:
        return <FiRefreshCw size={20} />;
    }
  };

  const getStatusMessage = () => {
    switch (updateStatus) {
      case 'checking':
        return 'Checking for updates...';
      case 'current':
        return 'You have the latest version';
      case 'available':
        return `Update available: v${availableUpdate?.version_number}`;
      case 'downloading':
        return `Downloading update... ${downloadProgress.toFixed(0)}%`;
      case 'ready':
        return 'Update ready to install';
      case 'error':
        return error || 'Update check failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Update Manager</h3>
        <button 
          style={styles.checkButton}
          onClick={checkForUpdates}
          disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
        >
          <FiRefreshCw size={16} />
          Check for Updates
        </button>
      </div>

      {/* Current Version */}
      <div style={styles.versionInfo}>
        <div style={styles.versionItem}>
          <strong>Current Version:</strong> v{currentVersion}
        </div>
        {availableUpdate && (
          <div style={styles.versionItem}>
            <strong>Latest Version:</strong> v{availableUpdate.version_number}
          </div>
        )}
      </div>

      {/* Status Display */}
      <div style={styles.statusSection}>
        <div style={styles.statusDisplay}>
          {getStatusIcon()}
          <span style={styles.statusText}>{getStatusMessage()}</span>
        </div>

        {updateStatus === 'downloading' && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${downloadProgress}%`
                }}
              />
            </div>
            <span style={styles.progressText}>{downloadProgress.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Update Details */}
      {availableUpdate && (
        <div style={styles.updateDetails}>
          <h4 style={styles.detailsTitle}>Update Details</h4>
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <strong>Version:</strong> {availableUpdate.version_number}
            </div>
            <div style={styles.detailItem}>
              <strong>Size:</strong> {formatFileSize(availableUpdate.file_size_bytes)}
            </div>
            <div style={styles.detailItem}>
              <strong>Released:</strong> {new Date(availableUpdate.released_at).toLocaleDateString()}
            </div>
            <div style={styles.detailItem}>
              <strong>Type:</strong> {availableUpdate.is_critical_update ? 'Critical' : 'Standard'}
            </div>
          </div>
          
          {availableUpdate.release_notes && (
            <div style={styles.releaseNotes}>
              <strong>Release Notes:</strong>
              <p>{availableUpdate.release_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actions}>
        {updateStatus === 'available' && !autoUpdateEnabled && (
          <button 
            style={styles.downloadButton}
            onClick={() => downloadUpdate(availableUpdate)}
          >
            <FiDownload size={16} />
            Download Update
          </button>
        )}
        
        {updateStatus === 'ready' && (
          <button 
            style={styles.installButton}
            onClick={installUpdate}
          >
            <FiRefreshCw size={16} />
            Install and Restart
          </button>
        )}
      </div>

      {/* Settings */}
      <div style={styles.settings}>
        <label style={styles.settingLabel}>
          <input
            type="checkbox"
            checked={autoUpdateEnabled}
            onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
          />
          <span>Automatically download updates</span>
        </label>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
  },
  checkButton: {
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
  versionInfo: {
    display: 'flex',
    gap: '30px',
    marginBottom: '20px',
    fontSize: '14px',
    flexWrap: 'wrap',
  },
  versionItem: {
    color: '#333',
  },
  statusSection: {
    marginBottom: '20px',
  },
  statusDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  statusText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#20c997',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#666',
    minWidth: '35px',
  },
  updateDetails: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #e9ecef',
    marginBottom: '20px',
  },
  detailsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 15px 0',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '15px',
  },
  detailItem: {
    fontSize: '14px',
    color: '#333',
  },
  releaseNotes: {
    fontSize: '14px',
    color: '#333',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  downloadButton: {
    backgroundColor: '#20c997',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  installButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  settings: {
    borderTop: '1px solid #e9ecef',
    paddingTop: '15px',
  },
  settingLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
  },
};

// Add spinner animation CSS
if (!document.querySelector('#update-manager-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'update-manager-styles';
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default UpdateManager;