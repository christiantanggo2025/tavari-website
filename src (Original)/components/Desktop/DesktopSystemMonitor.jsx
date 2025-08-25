import React, { useState, useEffect } from 'react';
import { FiMonitor, FiWifi, FiHardDrive, FiCpu, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';

const DesktopSystemMonitor = () => {
  const { business } = useBusiness();
  const [systemHealth, setSystemHealth] = useState({
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    audio_device_status: 'unknown',
    network_status: 'unknown',
    uptime_seconds: 0,
    last_error: null
  });
  const [installationInfo, setInstallationInfo] = useState(null);
  const [isReporting, setIsReporting] = useState(true);
  const [lastReportTime, setLastReportTime] = useState(null);

  useEffect(() => {
    initializeMonitoring();
    const interval = setInterval(updateSystemHealth, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const initializeMonitoring = async () => {
    // Get installation info from electron
    const deviceInfo = await window.electronAPI?.getSystemInfo();
    if (deviceInfo) {
      // Find our installation record
      const { data } = await supabase
        .from('music_installations')
        .select('*')
        .eq('device_fingerprint', deviceInfo.fingerprint)
        .single();
      
      if (data) {
        setInstallationInfo(data);
      }
    }
    
    // Initial health check
    updateSystemHealth();
  };

  const updateSystemHealth = async () => {
    try {
      // Get system information from Electron
      const systemInfo = await window.electronAPI?.getSystemInfo();
      if (!systemInfo) return;

      // Simulate system metrics (in real implementation, these would come from system APIs)
      const health = {
        cpu_usage: Math.random() * 30 + 10, // 10-40% CPU
        memory_usage: Math.random() * 20 + 30, // 30-50% Memory
        disk_usage: Math.random() * 10 + 60, // 60-70% Disk
        audio_device_status: 'connected',
        network_status: navigator.onLine ? 'online' : 'offline',
        uptime_seconds: Math.floor(process.uptime?.() || 0),
        last_error: null
      };

      setSystemHealth(health);

      // Report to server if enabled
      if (isReporting && installationInfo) {
        await reportHealthToServer(health);
      }

    } catch (error) {
      console.error('Health update error:', error);
      setSystemHealth(prev => ({
        ...prev,
        last_error: error.message,
        network_status: 'error'
      }));
    }
  };

  const reportHealthToServer = async (health) => {
    try {
      const { error } = await supabase
        .from('music_system_health')
        .insert({
          installation_id: installationInfo.id,
          ...health,
          reported_at: new Date().toISOString()
        });

      if (!error) {
        setLastReportTime(new Date());
        
        // Update installation last_seen
        await supabase
          .from('music_installations')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', installationInfo.id);
      }
    } catch (error) {
      console.error('Health reporting error:', error);
    }
  };

  const handleRestartApp = async () => {
    if (confirm('Are you sure you want to restart Tavari Music? Music will resume automatically.')) {
      await window.electronAPI?.restartApp();
    }
  };

  const handleCheckUpdates = async () => {
    try {
      const updateInfo = await window.electronAPI?.checkForUpdates();
      if (updateInfo) {
        alert('Checking for updates...');
      }
    } catch (error) {
      alert('Update check failed: ' + error.message);
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const getHealthColor = (value, type) => {
    switch (type) {
      case 'cpu':
      case 'memory':
      case 'disk':
        if (value > 80) return '#dc3545';
        if (value > 60) return '#ffc107';
        return '#28a745';
      case 'status':
        return value === 'connected' || value === 'online' ? '#28a745' : '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <FiMonitor size={24} style={styles.headerIcon} />
        <h3 style={styles.title}>Desktop System Monitor</h3>
        <div style={styles.headerActions}>
          <button style={styles.actionButton} onClick={handleCheckUpdates}>
            <FiRefreshCw size={14} />
            Check Updates
          </button>
          <button style={styles.restartButton} onClick={handleRestartApp}>
            <FiRefreshCw size={14} />
            Restart
          </button>
        </div>
      </div>

      {/* Installation Info */}
      {installationInfo && (
        <div style={styles.installationInfo}>
          <h4 style={styles.sectionTitle}>Installation Information</h4>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <strong>Device:</strong> {installationInfo.device_name}
            </div>
            <div style={styles.infoItem}>
              <strong>Version:</strong> {installationInfo.app_version}
            </div>
            <div style={styles.infoItem}>
              <strong>License:</strong> {installationInfo.license_type}
            </div>
            <div style={styles.infoItem}>
              <strong>Status:</strong> 
              <span style={{ color: getHealthColor(installationInfo.status, 'status') }}>
                {installationInfo.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* System Health Metrics */}
      <div style={styles.healthGrid}>
        <div style={styles.healthCard}>
          <div style={styles.healthHeader}>
            <FiCpu size={20} style={{ color: getHealthColor(systemHealth.cpu_usage, 'cpu') }} />
            <span>CPU Usage</span>
          </div>
          <div style={styles.healthValue}>
            {systemHealth.cpu_usage.toFixed(1)}%
          </div>
          <div style={styles.healthBar}>
            <div 
              style={{
                ...styles.healthBarFill,
                width: `${systemHealth.cpu_usage}%`,
                backgroundColor: getHealthColor(systemHealth.cpu_usage, 'cpu')
              }}
            />
          </div>
        </div>

        <div style={styles.healthCard}>
          <div style={styles.healthHeader}>
            <FiHardDrive size={20} style={{ color: getHealthColor(systemHealth.memory_usage, 'memory') }} />
            <span>Memory Usage</span>
          </div>
          <div style={styles.healthValue}>
            {systemHealth.memory_usage.toFixed(1)}%
          </div>
          <div style={styles.healthBar}>
            <div 
              style={{
                ...styles.healthBarFill,
                width: `${systemHealth.memory_usage}%`,
                backgroundColor: getHealthColor(systemHealth.memory_usage, 'memory')
              }}
            />
          </div>
        </div>

        <div style={styles.healthCard}>
          <div style={styles.healthHeader}>
            <FiWifi size={20} style={{ color: getHealthColor(systemHealth.network_status, 'status') }} />
            <span>Network</span>
          </div>
          <div style={styles.healthValue}>
            {systemHealth.network_status}
          </div>
        </div>

        <div style={styles.healthCard}>
          <div style={styles.healthHeader}>
            <FiMonitor size={20} style={{ color: getHealthColor(systemHealth.audio_device_status, 'status') }} />
            <span>Audio Device</span>
          </div>
          <div style={styles.healthValue}>
            {systemHealth.audio_device_status}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div style={styles.statusSection}>
        <div style={styles.statusItem}>
          <strong>Uptime:</strong> {formatUptime(systemHealth.uptime_seconds)}
        </div>
        <div style={styles.statusItem}>
          <strong>Health Reporting:</strong> 
          <span style={{ color: isReporting ? '#28a745' : '#dc3545' }}>
            {isReporting ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {lastReportTime && (
          <div style={styles.statusItem}>
            <strong>Last Report:</strong> {lastReportTime.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Error Display */}
      {systemHealth.last_error && (
        <div style={styles.errorSection}>
          <FiAlertTriangle size={16} style={styles.errorIcon} />
          <span>Error: {systemHealth.last_error}</span>
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <label style={styles.controlLabel}>
          <input
            type="checkbox"
            checked={isReporting}
            onChange={(e) => setIsReporting(e.target.checked)}
          />
          <span>Enable health reporting to server</span>
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
    flexWrap: 'wrap',
    gap: '15px',
  },
  headerIcon: {
    color: '#20c997',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
    flex: 1,
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  actionButton: {
    backgroundColor: '#20c997',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  restartButton: {
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  installationInfo: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #e9ecef',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 15px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
  },
  infoItem: {
    fontSize: '14px',
    color: '#333',
  },
  healthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },
  healthCard: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #e9ecef',
  },
  healthHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
  },
  healthValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  healthBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  statusSection: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '15px',
    fontSize: '14px',
  },
  statusItem: {
    color: '#333',
  },
  errorSection: {
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  errorIcon: {
    color: '#721c24',
  },
  controls: {
    borderTop: '1px solid #e9ecef',
    paddingTop: '15px',
  },
  controlLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
  },
};

export default DesktopSystemMonitor;