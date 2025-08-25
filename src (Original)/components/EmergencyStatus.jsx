// src/components/EmergencyStatus.jsx - System Monitor and Emergency Controls
import React, { useState, useEffect } from 'react';
import { useBusiness } from '../contexts/BusinessContext';
import { FiAlertTriangle, FiActivity, FiRefreshCw, FiShield, FiX } from 'react-icons/fi';

const EmergencyStatus = () => {
  const { debugInfo, emergencyRecovery } = useBusiness();
  const [isVisible, setIsVisible] = useState(false);
  const [autoHide, setAutoHide] = useState(true);

  // Show component when there are issues
  useEffect(() => {
    const hasIssues = 
      debugInfo?.rateLimiterStatus?.isLimited ||
      debugInfo?.rateLimiterStatus?.globalRequests > 15 ||
      debugInfo?.queueLength > 5;

    if (hasIssues && autoHide) {
      setIsVisible(true);
    } else if (!hasIssues && autoHide) {
      setIsVisible(false);
    }
  }, [debugInfo, autoHide]);

  // Don't render if not visible
  if (!isVisible) {
    return (
      <button 
        style={styles.toggleButton}
        onClick={() => setIsVisible(true)}
        title="Show system status"
      >
        <FiActivity />
      </button>
    );
  }

  const getStatusColor = () => {
    if (debugInfo?.rateLimiterStatus?.isLimited) return '#f44336';
    if (debugInfo?.rateLimiterStatus?.globalRequests > 15) return '#ff9800';
    if (debugInfo?.queueLength > 5) return '#ff9800';
    return '#4caf50';
  };

  const getStatusText = () => {
    if (debugInfo?.rateLimiterStatus?.isLimited) return 'RATE LIMITED';
    if (debugInfo?.rateLimiterStatus?.globalRequests > 15) return 'HIGH LOAD';
    if (debugInfo?.queueLength > 5) return 'QUEUE BACKLOG';
    return 'NORMAL';
  };

  return (
    <div style={{...styles.container, borderColor: getStatusColor()}}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>
          <FiShield color={getStatusColor()} />
          System Status: <span style={{color: getStatusColor()}}>{getStatusText()}</span>
        </div>
        <div style={styles.controls}>
          <button 
            style={styles.controlButton}
            onClick={() => setAutoHide(!autoHide)}
            title={autoHide ? 'Pin status panel' : 'Enable auto-hide'}
          >
            {autoHide ? '📌' : '🔒'}
          </button>
          <button 
            style={styles.controlButton}
            onClick={() => setIsVisible(false)}
          >
            <FiX />
          </button>
        </div>
      </div>

      {/* Status Grid */}
      <div style={styles.statusGrid}>
        <div style={styles.statusItem}>
          <div style={styles.statusLabel}>Rate Limiter</div>
          <div style={styles.statusValue}>
            {debugInfo?.rateLimiterStatus?.isLimited ? (
              <span style={{color: '#f44336'}}>🚫 BLOCKED</span>
            ) : (
              <span style={{color: '#4caf50'}}>✅ ACTIVE</span>
            )}
          </div>
          <div style={styles.statusDetail}>
            {debugInfo?.rateLimiterStatus?.globalRequests || 0}/{debugInfo?.rateLimiterStatus?.maxGlobal || 20} requests
          </div>
        </div>

        <div style={styles.statusItem}>
          <div style={styles.statusLabel}>Cache</div>
          <div style={styles.statusValue}>
            {debugInfo?.cacheStats?.usage || '0%'}
          </div>
          <div style={styles.statusDetail}>
            {debugInfo?.cacheStats?.validEntries || 0} valid entries
          </div>
        </div>

        <div style={styles.statusItem}>
          <div style={styles.statusLabel}>Queue</div>
          <div style={styles.statusValue}>
            {debugInfo?.queueLength || 0} pending
          </div>
          <div style={styles.statusDetail}>
            {debugInfo?.isProcessingQueue ? '⚡ Processing' : '⏸️ Idle'}
          </div>
        </div>
      </div>

      {/* Endpoint Status */}
      {debugInfo?.rateLimiterStatus?.endpointCounts && (
        <div style={styles.endpointsSection}>
          <div style={styles.sectionTitle}>Endpoint Activity</div>
          <div style={styles.endpointsList}>
            {Object.entries(debugInfo.rateLimiterStatus.endpointCounts).map(([endpoint, count]) => (
              <div key={endpoint} style={styles.endpointItem}>
                <span style={styles.endpointName}>{endpoint}</span>
                <span style={{
                  ...styles.endpointCount,
                  color: count >= 5 ? '#f44336' : count >= 3 ? '#ff9800' : '#4caf50'
                }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Actions */}
      <div style={styles.actionsSection}>
        <button 
          style={styles.emergencyButton}
          onClick={emergencyRecovery}
        >
          <FiRefreshCw />
          Emergency Reset
        </button>
        
        <button 
          style={styles.actionButton}
          onClick={() => {
            window.rateLimiter?.reset();
            console.log('🔄 Rate limiter manually reset');
          }}
        >
          Reset Rate Limiter
        </button>
        
        <button 
          style={styles.actionButton}
          onClick={() => {
            window.cacheManager?.clear();
            console.log('🧹 Cache manually cleared');
          }}
        >
          Clear Cache
        </button>
      </div>

      {/* Tips */}
      {(debugInfo?.rateLimiterStatus?.isLimited || debugInfo?.queueLength > 5) && (
        <div style={styles.tipsSection}>
          <div style={styles.tipsTitle}>💡 Tips:</div>
          <ul style={styles.tipsList}>
            <li>Wait a moment before making new requests</li>
            <li>Close unnecessary tabs/windows</li>
            <li>Refresh the page if issues persist</li>
            {debugInfo?.rateLimiterStatus?.isLimited && (
              <li>Rate limit will automatically lift in a few seconds</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const styles = {
  toggleButton: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    fontSize: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '320px',
    backgroundColor: 'white',
    border: '2px solid',
    borderRadius: '12px',
    padding: '16px',
    zIndex: 9999,
    fontFamily: 'monospace',
    fontSize: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  controls: {
    display: 'flex',
    gap: '4px',
  },
  controlButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  statusItem: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#f8f8f8',
    borderRadius: '6px',
  },
  statusLabel: {
    fontSize: '10px',
    color: '#666',
    marginBottom: '4px',
  },
  statusValue: {
    fontWeight: 'bold',
    fontSize: '11px',
    marginBottom: '2px',
  },
  statusDetail: {
    fontSize: '9px',
    color: '#999',
  },
  endpointsSection: {
    marginBottom: '12px',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: '6px',
    fontSize: '11px',
    color: '#333',
  },
  endpointsList: {
    maxHeight: '80px',
    overflowY: 'auto',
    backgroundColor: '#f8f8f8',
    padding: '6px',
    borderRadius: '4px',
  },
  endpointItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
    fontSize: '10px',
  },
  endpointName: {
    color: '#666',
    flex: 1,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  endpointCount: {
    fontWeight: 'bold',
    marginLeft: '8px',
  },
  actionsSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    marginBottom: '12px',
  },
  emergencyButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    gridColumn: 'span 2',
  },
  actionButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px',
    fontSize: '9px',
    cursor: 'pointer',
  },
  tipsSection: {
    backgroundColor: '#fff3e0',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '10px',
  },
  tipsTitle: {
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  tipsList: {
    margin: 0,
    paddingLeft: '16px',
    color: '#666',
  },
};

export default EmergencyStatus;