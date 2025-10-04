// src/screens/Music/MusicSystemMonitor.jsx
import React, { useState, useEffect } from 'react';
import { FiHardDrive, FiRefreshCw, FiTrash2, FiCheckCircle, FiAlertCircle, FiMusic, FiDownload } from 'react-icons/fi';
import { TavariStyles } from '../../utils/TavariStyles';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { SecurityWrapper } from '../../Security';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useSecurityContext } from '../../Security/useSecurityContext';

const MusicSystemMonitor = () => {
  const auth = usePOSAuth({
    requiredRoles: ['employee', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'MusicSystemMonitor'
  });

  const security = useSecurityContext({
    enableRateLimiting: true,
    enableAuditLogging: true,
    componentName: 'MusicSystemMonitor',
    sensitiveComponent: false
  });

  const [cacheStatus, setCacheStatus] = useState({
    tracksCount: 0,
    totalSizeMB: '0',
    limit: 50,
    tracks: []
  });
  const [swStatus, setSwStatus] = useState({
    registered: false,
    active: false,
    controller: null
  });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  // Check service worker status
  const checkServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      setSwStatus({
        registered: !!registration,
        active: registration?.active?.state === 'activated',
        controller: navigator.serviceWorker.controller
      });
    } catch (error) {
      console.error('Error checking service worker:', error);
      setSwStatus({ registered: false, active: false, controller: null });
    }
  };

  // Get cache size and details
  const getCacheStatus = async () => {
    if (!navigator.serviceWorker.controller) {
      setLoading(false);
      return;
    }

    try {
      const channel = new MessageChannel();
      
      const promise = new Promise((resolve, reject) => {
        channel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve(event.data);
          } else {
            reject(new Error('Failed to get cache status'));
          }
        };

        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [channel.port2]
      );

      const data = await promise;
      setCacheStatus(data);
    } catch (error) {
      console.error('Error getting cache status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear all cached music files? This will free up storage but music will need to download again.')) {
      return;
    }

    setClearing(true);
    try {
      await security.recordAction('cache_cleared', {
        tracks_count: cacheStatus.tracksCount,
        size_mb: cacheStatus.totalSizeMB
      });

      const channel = new MessageChannel();
      
      const promise = new Promise((resolve, reject) => {
        channel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve(event.data);
          } else {
            reject(new Error('Failed to clear cache'));
          }
        };
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );

      await promise;
      
      // Refresh cache status
      await getCacheStatus();
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache: ' + error.message);
    } finally {
      setClearing(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setLoading(true);
    await checkServiceWorker();
    await getCacheStatus();
  };

  // Load on mount
  useEffect(() => {
    if (auth.isReady) {
      checkServiceWorker();
      getCacheStatus();
    }
  }, [auth.isReady]);

  const styles = {
    container: {
      ...TavariStyles.layout.container,
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      textAlign: 'center',
      marginBottom: TavariStyles.spacing['4xl'],
      paddingBottom: TavariStyles.spacing.xl,
      borderBottom: `2px solid ${TavariStyles.colors.gray200}`
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.sm
    },
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing['2xl']
    },
    card: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.xl,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg
    },
    cardIcon: {
      fontSize: '32px',
      color: TavariStyles.colors.primary
    },
    cardTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800
    },
    statRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${TavariStyles.spacing.sm} 0`,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`
    },
    statLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    statValue: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800
    },
    statusBadge: (active) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.full,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      backgroundColor: active ? TavariStyles.colors.successLight : TavariStyles.colors.errorLight,
      color: active ? TavariStyles.colors.success : TavariStyles.colors.error
    }),
    trackList: {
      maxHeight: '400px',
      overflowY: 'auto',
      marginTop: TavariStyles.spacing.md
    },
    trackItem: {
      padding: TavariStyles.spacing.sm,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      marginTop: TavariStyles.spacing.lg
    },
    button: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      flex: 1
    },
    dangerButton: {
      ...TavariStyles.components.button.base,
      backgroundColor: TavariStyles.colors.error,
      color: TavariStyles.colors.white,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      flex: 1,
      cursor: 'pointer',
      border: 'none',
      ':hover': {
        backgroundColor: TavariStyles.colors.errorDark
      }
    },
    emptyState: {
      textAlign: 'center',
      padding: TavariStyles.spacing['2xl'],
      color: TavariStyles.colors.gray500
    },
    loading: {
      ...TavariStyles.layout.flexCenter,
      minHeight: '400px',
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    }
  };

  if (!auth.isReady || loading) {
    return (
      <POSAuthWrapper
        requiredRoles={['employee', 'manager', 'owner']}
        requireBusiness={true}
        componentName="MusicSystemMonitor"
      >
        <div style={styles.loading}>Loading system monitor...</div>
      </POSAuthWrapper>
    );
  }

  return (
    <POSAuthWrapper
      requiredRoles={['employee', 'manager', 'owner']}
      requireBusiness={true}
      componentName="MusicSystemMonitor"
    >
      <SecurityWrapper
        componentName="MusicSystemMonitor"
        sensitiveComponent={false}
        enableRateLimiting={true}
        enableAuditLogging={true}
      >
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>🎵 Music System Monitor</h1>
            <p style={styles.subtitle}>
              Cache status, offline playback, and system health
            </p>
          </div>

          {/* Status Cards Grid */}
          <div style={styles.grid}>
            {/* Service Worker Status */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  {swStatus.active ? <FiCheckCircle color={TavariStyles.colors.success} /> : <FiAlertCircle color={TavariStyles.colors.error} />}
                </div>
                <h2 style={styles.cardTitle}>Service Worker</h2>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Status</span>
                <span style={styles.statusBadge(swStatus.active)}>
                  {swStatus.active ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
                  {swStatus.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Registered</span>
                <span style={styles.statValue}>{swStatus.registered ? 'Yes' : 'No'}</span>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Controller</span>
                <span style={styles.statValue}>{swStatus.controller ? 'Connected' : 'Not Connected'}</span>
              </div>

              {!swStatus.active && (
                <div style={{ ...styles.emptyState, padding: TavariStyles.spacing.md, marginTop: TavariStyles.spacing.md }}>
                  <p style={{ fontSize: TavariStyles.typography.fontSize.sm }}>
                    Service worker is not active. Refresh the page to activate offline caching.
                  </p>
                </div>
              )}
            </div>

            {/* Cache Statistics */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  <FiHardDrive color={TavariStyles.colors.primary} />
                </div>
                <h2 style={styles.cardTitle}>Cache Storage</h2>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Cached Tracks</span>
                <span style={styles.statValue}>{cacheStatus.tracksCount} / {cacheStatus.limit}</span>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Total Size</span>
                <span style={styles.statValue}>{cacheStatus.totalSizeMB} MB</span>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Cache Limit</span>
                <span style={styles.statValue}>{cacheStatus.limit} tracks</span>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Storage Used</span>
                <span style={styles.statValue}>
                  {cacheStatus.limit > 0 ? Math.round((cacheStatus.tracksCount / cacheStatus.limit) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Offline Playback Info */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  <FiDownload color={TavariStyles.colors.primary} />
                </div>
                <h2 style={styles.cardTitle}>Offline Playback</h2>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Status</span>
                <span style={styles.statusBadge(swStatus.active && cacheStatus.tracksCount > 0)}>
                  {swStatus.active && cacheStatus.tracksCount > 0 ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>Available Offline</span>
                <span style={styles.statValue}>{cacheStatus.tracksCount} tracks</span>
              </div>

              <div style={{ marginTop: TavariStyles.spacing.md, padding: TavariStyles.spacing.sm, backgroundColor: TavariStyles.colors.gray50, borderRadius: TavariStyles.borderRadius.md }}>
                <p style={{ fontSize: TavariStyles.typography.fontSize.xs, color: TavariStyles.colors.gray600, margin: 0 }}>
                  💡 Cached tracks play instantly and work without internet connection.
                </p>
              </div>
            </div>
          </div>

          {/* Cached Tracks List */}
          {cacheStatus.tracksCount > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>
                  <FiMusic color={TavariStyles.colors.primary} />
                </div>
                <h2 style={styles.cardTitle}>Cached Tracks ({cacheStatus.tracksCount})</h2>
              </div>

              <div style={styles.trackList}>
                {cacheStatus.tracks && cacheStatus.tracks.length > 0 ? (
                  cacheStatus.tracks.map((track, index) => (
                    <div key={index} style={styles.trackItem}>
                      <FiMusic size={14} color={TavariStyles.colors.primary} />
                      <span>{decodeURIComponent(track.split('/').pop().replace(/_/g, ' ').replace('.mp3', ''))}</span>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyState}>
                    <p>No tracks cached yet. Play some music to start caching.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.buttonGroup}>
            <button style={styles.button} onClick={handleRefresh} disabled={loading}>
              <FiRefreshCw />
              Refresh Status
            </button>

            <button
              style={styles.dangerButton}
              onClick={handleClearCache}
              disabled={clearing || cacheStatus.tracksCount === 0}
              onMouseOver={(e) => e.target.style.backgroundColor = TavariStyles.colors.errorDark}
              onMouseOut={(e) => e.target.style.backgroundColor = TavariStyles.colors.error}
            >
              <FiTrash2 />
              {clearing ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>

          {/* Info Section */}
          <div style={{ ...styles.card, marginTop: TavariStyles.spacing.xl }}>
            <h3 style={{ ...styles.cardTitle, marginBottom: TavariStyles.spacing.md }}>
              How Caching Works
            </h3>
            <ul style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray700, lineHeight: 1.6 }}>
              <li>When you play a track for the first time, it downloads from the cloud</li>
              <li>The track is automatically saved to your browser's cache</li>
              <li>Next time you play the same track, it loads instantly from cache</li>
              <li>Cached tracks work even without internet connection</li>
              <li>Cache limit is {cacheStatus.limit} tracks - oldest tracks are removed when full</li>
              <li>Clearing cache frees up storage but requires re-downloading tracks</li>
            </ul>
          </div>
        </div>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default MusicSystemMonitor;