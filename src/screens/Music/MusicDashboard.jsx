// src/screens/Music/MusicDashboard.jsx - Cleaned up (PIN protection handled by SidebarNav)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMusic, FiUpload, FiList, FiSettings, FiLock, FiPlay, FiPause, FiVolume2, FiWifi, FiWifiOff } from 'react-icons/fi';

// Tavari Build Standards - Required imports
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { SecurityWrapper } from '../../Security';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useSecurityContext } from '../../Security/useSecurityContext';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';

// Music-specific components
import AudioPlayer from '../../components/Music/AudioPlayer';
import SystemMonitor from '../../components/Music/SystemMonitor';

/**
 * Music Dashboard - Main hub for music management
 * PIN protection is now handled by SidebarNav - no custom lock needed
 */
const MusicDashboard = () => {
  const navigate = useNavigate();

  // Tavari standardized authentication
  const auth = usePOSAuth({
    requiredRoles: ['manager', 'owner'], // Music access restricted to managers and owners
    requireBusiness: true,
    componentName: 'MusicDashboard'
  });

  // Tavari standardized security
  const security = useSecurityContext({
    enableRateLimiting: true,
    enableDeviceTracking: true,
    enableInputValidation: true,
    enableAuditLogging: true,
    componentName: 'MusicDashboard',
    sensitiveComponent: true // Music dashboard contains business content
  });

  // Tax calculations (for potential music purchases/licensing)
  const taxCalc = useTaxCalculations(auth.selectedBusinessId);

  // Local state for music-specific features (removed lock-related state)
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);

  // Log dashboard access
  useEffect(() => {
    const logAccess = async () => {
      await security.logSecurityEvent('music_dashboard_access', {
        user_role: auth.userRole,
        business_id: auth.selectedBusinessId
      }, 'low');

      await security.recordAction('music_dashboard_view', true);
    };

    if (auth.selectedBusinessId) {
      logAccess();
    }
  }, [auth.selectedBusinessId, auth.userRole, security]);

  const styles = {
    container: {
      ...TavariStyles.layout.container,
      maxWidth: '1200px',
      margin: '0 auto'
    },

    // No access screen using Tavari styles
    noAccess: {
      ...TavariStyles.layout.card,
      textAlign: 'center',
      padding: TavariStyles.spacing['6xl'],
      margin: '40px auto',
      maxWidth: '500px'
    },

    lockIcon: {
      color: TavariStyles.colors.gray500,
      marginBottom: TavariStyles.spacing.lg
    },

    noAccessTitle: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },

    noAccessText: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.md,
      lineHeight: TavariStyles.typography.lineHeight.relaxed
    },

    roleText: {
      fontSize: TavariStyles.typography.fontSize.md,
      color: TavariStyles.colors.gray500,
      marginBottom: TavariStyles.spacing.md
    },

    accessInfo: {
      fontSize: TavariStyles.typography.fontSize.md,
      color: TavariStyles.colors.primary,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },

    // Header section
    header: {
      textAlign: 'center',
      marginBottom: TavariStyles.spacing['4xl'],
      paddingBottom: TavariStyles.spacing.xl,
      borderBottom: `2px solid ${TavariStyles.colors.gray200}`
    },

    headerIcon: {
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.md
    },

    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },

    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },

    // Quick Player (always visible now)
    playerSection: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing['4xl'],
      border: `2px solid ${TavariStyles.colors.primary}`,
      background: `linear-gradient(135deg, ${TavariStyles.colors.white} 0%, ${TavariStyles.colors.gray50} 100%)`
    },

    playerTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.lg,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: TavariStyles.spacing.md
    },

    playerIcon: {
      color: TavariStyles.colors.primary
    },

    // Quick actions grid
    actionsSection: {
      marginBottom: TavariStyles.spacing['4xl']
    },

    actionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: TavariStyles.spacing.xl
    },

    actionCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing['3xl'],
      textAlign: 'center',
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal,
      border: `2px solid ${TavariStyles.colors.gray200}`
    },

    actionIcon: {
      color: TavariStyles.colors.primary,
      marginBottom: TavariStyles.spacing.lg
    },

    actionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },

    actionDescription: {
      fontSize: TavariStyles.typography.fontSize.md,
      color: TavariStyles.colors.gray600,
      lineHeight: TavariStyles.typography.lineHeight.relaxed
    },

    // Monitor section
    monitorSection: {
      marginBottom: TavariStyles.spacing['4xl']
    },

    // Security settings section
    securitySection: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.xl
    },

    securityTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.lg
    },

    checkboxContainer: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.md
    }
  };

  // Don't render if user doesn't have access
  if (!auth.hasRole(['manager', 'owner'])) {
    return (
      <POSAuthWrapper 
        componentName="MusicDashboard"
        requiredRoles={['manager', 'owner']}
      >
        <SecurityWrapper 
          componentName="MusicDashboard"
          sensitiveComponent={true}
        >
          <div style={styles.container}>
            <div style={styles.noAccess}>
              <FiLock size={48} style={styles.lockIcon} />
              <h2 style={styles.noAccessTitle}>Access Denied</h2>
              <p style={styles.noAccessText}>
                You do not have permission to access the Music Dashboard.
              </p>
              <p style={styles.roleText}>
                Current role: {auth.userRole || 'Unknown'}
              </p>
              <p style={styles.accessInfo}>
                Required roles: Manager or Owner
              </p>
            </div>
          </div>
        </SecurityWrapper>
      </POSAuthWrapper>
    );
  }

  return (
    <POSAuthWrapper 
      componentName="MusicDashboard"
      requiredRoles={['manager', 'owner']}
    >
      <SecurityWrapper 
        componentName="MusicDashboard"
        sensitiveComponent={true}
      >
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <FiMusic size={48} style={styles.headerIcon} />
            <h1 style={styles.title}>Tavari Music Dashboard</h1>
            <p style={styles.subtitle}>
              {auth.businessData?.name ? `Managing music for ${auth.businessData.name}` : 'Music Management System'}
            </p>
          </div>

          {/* Quick Player (Always Visible) */}
          <div style={styles.playerSection}>
            <h3 style={styles.playerTitle}>
              <FiMusic style={styles.playerIcon} />
              Quick Music Player
            </h3>
            <div style={{ width: '100%' }}>
              <AudioPlayer />
            </div>
          </div>

          {/* Security Settings */}
          <div style={styles.securitySection}>
            <h3 style={styles.securityTitle}>Security Settings</h3>
            <div style={styles.checkboxContainer}>
              <TavariCheckbox
                checked={autoLockEnabled}
                onChange={setAutoLockEnabled}
                label="Auto-lock after 15 minutes of inactivity (handled by SidebarNav)"
                size="md"
                disabled={true}
              />
            </div>
            <p style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray500 }}>
              PIN protection is now managed centrally by the navigation system.
            </p>
          </div>

          {/* Quick Actions Section */}
          <div style={styles.actionsSection}>
            <div style={styles.actionsGrid}>
              <div 
                style={styles.actionCard}
                onClick={() => navigate('/dashboard/music/upload')}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.primary;
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.gray200;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <FiUpload size={32} style={styles.actionIcon} />
                <h3 style={styles.actionTitle}>Upload Music</h3>
                <p style={styles.actionDescription}>
                  Add new songs to your music library
                </p>
              </div>
              
              <div 
                style={styles.actionCard}
                onClick={() => navigate('/dashboard/music/library')}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.primary;
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.gray200;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <FiMusic size={32} style={styles.actionIcon} />
                <h3 style={styles.actionTitle}>Music Library</h3>
                <p style={styles.actionDescription}>
                  View and manage your song collection
                </p>
              </div>
              
              <div 
                style={styles.actionCard}
                onClick={() => navigate('/dashboard/music/playlists')}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.primary;
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.gray200;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <FiList size={32} style={styles.actionIcon} />
                <h3 style={styles.actionTitle}>Playlists</h3>
                <p style={styles.actionDescription}>
                  Create and manage custom playlists
                </p>
              </div>
              
              <div 
                style={styles.actionCard}
                onClick={() => navigate('/dashboard/music/settings')}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.primary;
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.gray200;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <FiSettings size={32} style={styles.actionIcon} />
                <h3 style={styles.actionTitle}>Music Settings</h3>
                <p style={styles.actionDescription}>
                  Configure volume, shuffle, and preferences
                </p>
              </div>

              {/* Advanced player card */}
              <div 
                style={styles.actionCard}
                onClick={() => navigate('/dashboard/music/player')}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.primary;
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = TavariStyles.colors.gray200;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <FiPlay size={32} style={styles.actionIcon} />
                <h3 style={styles.actionTitle}>Advanced Player</h3>
                <p style={styles.actionDescription}>
                  Full-featured player with detailed controls
                </p>
              </div>

              {/* System status card */}
              <div 
                style={{
                  ...styles.actionCard,
                  borderColor: security.securityState.isSecure ? TavariStyles.colors.success : TavariStyles.colors.warning
                }}
              >
                {security.securityState.isSecure ? <FiWifi size={32} style={{...styles.actionIcon, color: TavariStyles.colors.success}} /> : <FiWifiOff size={32} style={{...styles.actionIcon, color: TavariStyles.colors.warning}} />}
                <h3 style={styles.actionTitle}>System Status</h3>
                <p style={styles.actionDescription}>
                  {security.securityState.isSecure ? 'All systems operational' : 'Security warnings detected'}
                </p>
              </div>
            </div>
          </div>

          {/* System Monitor */}
          <div style={styles.monitorSection}>
            <SystemMonitor />
          </div>

          {/* Security Status Display */}
          {security.securityState.threats.length > 0 && (
            <div style={{
              ...TavariStyles.components.banner.base,
              ...TavariStyles.components.banner.variants.warning,
              position: 'fixed',
              bottom: TavariStyles.spacing.lg,
              right: TavariStyles.spacing.lg,
              maxWidth: '300px',
              zIndex: 1000
            }}>
              Security Alert: {security.securityState.threats.length} threat(s) detected
            </div>
          )}
        </div>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default MusicDashboard;