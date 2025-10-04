// components/Music/AudioPlayer.jsx - Cache-free version with restored volume UI
import React, { useState, useEffect, useCallback } from 'react';
import { FiPlay, FiPause, FiSkipForward, FiSkipBack, FiVolume2, FiWifi, FiWifiOff } from 'react-icons/fi';

// Tavari Build Standards - Required imports
import { SecurityWrapper } from '../../Security';
import { useSecurityContext } from '../../Security';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import POSAuthWrapper from '../Auth/POSAuthWrapper';
import TavariCheckbox from '../UI/TavariCheckbox';
import { TavariStyles } from '../../utils/TavariStyles';
import { globalMusicService } from '../../services/GlobalMusicService';

const AudioPlayer = () => {
  // Tavari standardized authentication
  const auth = usePOSAuth({
    requiredRoles: ['employee', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'AudioPlayer'
  });

  // Tavari standardized security
  const security = useSecurityContext({
    enableRateLimiting: true,
    enableDeviceTracking: true,
    enableInputValidation: true,
    enableAuditLogging: true,
    componentName: 'MusicAudioPlayer',
    sensitiveComponent: false,
    securityLevel: 'medium'
  });

  // Tavari tax calculations (for potential music licensing costs)
  const taxCalc = useTaxCalculations(auth.selectedBusinessId);

  // Component state
  const [state, setState] = useState(globalMusicService.getState());

  // Subscribe to music state only — initialization is owned by App.jsx
  useEffect(() => {
    if (!auth.isReady) return;

    const unsubscribe = globalMusicService.addListener(setState);

    // sync once on mount
    setState(globalMusicService.getState());

    // 🔑 Add handler to auto-advance when track ends
    const audio = globalMusicService.getAudioElement?.();
    if (audio) {
      audio.onended = async () => {
        try {
          await globalMusicService.next();
        } catch (err) {
          console.error("Auto-next failed:", err);
        }
      };
    }

    return () => {
      unsubscribe();
      if (audio) {
        audio.onended = null;
      }
    };
  }, [auth.isReady]);

  // Control handlers with security logging
  const handlePlay = useCallback(async () => {
    try {
      await security.recordAction('music_play', { 
        track: state.currentTrack?.title,
        business_id: auth.selectedBusinessId 
      });
      await globalMusicService.play();
    } catch (error) {
      console.error('Play failed:', error);
      security.logSecurityEvent('music_play_error', { error: error.message }, 'low');
    }
  }, [security, state.currentTrack, auth.selectedBusinessId]);

  const handlePause = useCallback(async () => {
    try {
      await security.recordAction('music_pause', { 
        track: state.currentTrack?.title,
        business_id: auth.selectedBusinessId 
      });
      globalMusicService.pause();
    } catch (error) {
      console.error('Pause failed:', error);
      security.logSecurityEvent('music_pause_error', { error: error.message }, 'low');
    }
  }, [security, state.currentTrack, auth.selectedBusinessId]);

  const handleNext = useCallback(async () => {
    try {
      await security.recordAction('music_next', { 
        from_track: state.currentTrack?.title,
        business_id: auth.selectedBusinessId 
      });
      await globalMusicService.next();
    } catch (error) {
      console.error('Next failed:', error);
      security.logSecurityEvent('music_next_error', { error: error.message }, 'low');
    }
  }, [security, state.currentTrack, auth.selectedBusinessId]);

  const handlePrevious = useCallback(async () => {
    try {
      await security.recordAction('music_previous', { 
        from_track: state.currentTrack?.title,
        business_id: auth.selectedBusinessId 
      });
      await globalMusicService.previous();
    } catch (error) {
      console.error('Previous failed:', error);
      security.logSecurityEvent('music_previous_error', { error: error.message }, 'low');
    }
  }, [security, state.currentTrack, auth.selectedBusinessId]);

  const handleVolumeChange = useCallback(async (e) => {
    const volume = parseFloat(e.target.value);
    try {
      await security.recordAction('music_volume_change', { 
        new_volume: Math.round(volume * 100),
        business_id: auth.selectedBusinessId 
      });
      globalMusicService.setVolume(volume);
    } catch (error) {
      console.error('Volume change failed:', error);
    }
  }, [security, auth.selectedBusinessId]);

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Connection status
  const getConnectionStatus = () => {
    if (state.isOnline) {
      return { icon: FiWifi, color: TavariStyles.colors.success, text: 'Online' };
    } else {
      return { icon: FiWifiOff, color: TavariStyles.colors.warning, text: 'Offline' };
    }
  };

  // Tavari standardized styles
  const styles = {
    player: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.lg || '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      padding: TavariStyles.spacing?.xl || '20px',
      maxWidth: '600px',
      margin: '0 auto'
    },
    
    statusBar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing?.md || '12px',
      padding: TavariStyles.spacing?.sm || '8px',
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px'
    },
    
    statusItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: TavariStyles.typography?.fontSize?.sm || '13px',
      color: TavariStyles.colors.gray600
    },
    
    trackInfo: {
      textAlign: 'center',
      marginBottom: TavariStyles.spacing?.lg || '16px',
      padding: TavariStyles.spacing?.md || '12px',
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px'
    },
    
    trackTitle: {
      fontSize: TavariStyles.typography?.fontSize?.lg || '16px',
      fontWeight: TavariStyles.typography?.fontWeight?.semibold || '600',
      color: TavariStyles.colors.gray800,
      marginBottom: '4px'
    },
    
    trackArtist: {
      fontSize: TavariStyles.typography?.fontSize?.sm || '13px',
      color: TavariStyles.colors.gray600
    },
    
    controls: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: TavariStyles.spacing?.lg || '16px',
      marginBottom: TavariStyles.spacing?.lg || '16px'
    },
    
    controlButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      cursor: 'pointer',
      fontSize: '20px',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: TavariStyles.colors.primaryDark
      },
      ':disabled': {
        backgroundColor: TavariStyles.colors.gray400,
        cursor: 'not-allowed'
      }
    },
    
    playButton: {
      width: '56px',
      height: '56px',
      fontSize: '24px'
    },
    
    volumeSection: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing?.md || '12px',
      marginBottom: TavariStyles.spacing?.md || '12px',
      padding: TavariStyles.spacing?.sm || '8px',
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px'
    },
    
    volumeSlider: {
      flex: 1,
      height: '4px',
      backgroundColor: TavariStyles.colors.gray200,
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
      '-webkit-appearance': 'none',
      appearance: 'none'
    },
    
    volumeLabel: {
      fontSize: TavariStyles.typography?.fontSize?.xs || '12px',
      color: TavariStyles.colors.gray600,
      minWidth: '35px',
      textAlign: 'right',
      fontWeight: TavariStyles.typography?.fontWeight?.medium || '500'
    },
    
    progressSection: {
      marginBottom: TavariStyles.spacing?.md || '12px'
    },
    
    progressBar: {
      width: '100%',
      height: '6px',
      backgroundColor: TavariStyles.colors.gray200,
      borderRadius: '3px',
      overflow: 'hidden',
      cursor: 'pointer'
    },
    
    progressFill: {
      height: '100%',
      backgroundColor: TavariStyles.colors.primary,
      width: `${state.duration ? (state.currentTime / state.duration) * 100 : 0}%`,
      transition: 'width 0.1s ease'
    },
    
    timeDisplay: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: TavariStyles.typography?.fontSize?.xs || '12px',
      color: TavariStyles.colors.gray600,
      marginTop: '4px',
      fontFamily: TavariStyles.typography?.fontFamilyMono || 'monospace'
    }
  };

  // Render loading state
  if (!auth.isReady) {
    return (
      <POSAuthWrapper 
        requiredRoles={['employee', 'manager', 'owner']} 
        requireBusiness={true}
        componentName="AudioPlayer"
      >
        <div style={styles.player}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={styles.trackArtist}>Loading music player...</div>
          </div>
        </div>
      </POSAuthWrapper>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <POSAuthWrapper 
      requiredRoles={['employee', 'manager', 'owner']} 
      requireBusiness={true}
      componentName="AudioPlayer"
    >
      <SecurityWrapper
        componentName="AudioPlayer"
        sensitiveComponent={false}
        enableRateLimiting={true}
        enableAuditLogging={true}
        securityLevel="medium"
      >
        <div style={styles.player}>
          {/* Status Bar */}
          <div style={styles.statusBar}>
            <div style={styles.statusItem}>
              {React.createElement(connectionStatus.icon, { 
                size: 16, 
                color: connectionStatus.color 
              })}
              <span>{connectionStatus.text}</span>
            </div>
            
            <div style={styles.statusItem}>
              <span>{state.playlist?.length || 0} tracks</span>
            </div>
            
            <div style={styles.statusItem}>
              <span>Streaming Mode</span>
            </div>
          </div>

          {/* Track Info */}
          <div style={styles.trackInfo}>
            {state.currentTrack ? (
              <>
                <div style={styles.trackTitle}>{state.currentTrack.title}</div>
                <div style={styles.trackArtist}>
                  {state.currentTrack.artist || 'Unknown Artist'}
                </div>
              </>
            ) : (
              <div style={styles.trackArtist}>
                {state.isInitialized ? 'No track loaded' : 'Initializing...'}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div style={styles.progressSection}>
            <div style={styles.progressBar}>
              <div style={styles.progressFill}></div>
            </div>
            <div style={styles.timeDisplay}>
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatTime(state.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <button 
              style={styles.controlButton}
              onClick={handlePrevious}
              disabled={!state.readyToPlay}
              onMouseOver={(e) => e.target.style.backgroundColor = TavariStyles.colors.primaryDark}
              onMouseOut={(e) => e.target.style.backgroundColor = TavariStyles.colors.primary}
            >
              <FiSkipBack />
            </button>
            
            <button 
              style={{...styles.controlButton, ...styles.playButton}}
              onClick={state.isPlaying ? handlePause : handlePlay}
              disabled={!state.readyToPlay}
              onMouseOver={(e) => e.target.style.backgroundColor = TavariStyles.colors.primaryDark}
              onMouseOut={(e) => e.target.style.backgroundColor = TavariStyles.colors.primary}
            >
              {state.isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            
            <button 
              style={styles.controlButton}
              onClick={handleNext}
              disabled={!state.readyToPlay}
              onMouseOver={(e) => e.target.style.backgroundColor = TavariStyles.colors.primaryDark}
              onMouseOut={(e) => e.target.style.backgroundColor = TavariStyles.colors.primary}
            >
              <FiSkipForward />
            </button>
          </div>

          {/* Volume Section - RESTORED AND ENHANCED */}
          <div style={styles.volumeSection}>
            <FiVolume2 size={20} color={TavariStyles.colors.primary} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.volume}
              onChange={handleVolumeChange}
              style={styles.volumeSlider}
              className="volume-slider"
            />
            <span style={styles.volumeLabel}>
              {Math.round(state.volume * 100)}%
            </span>
          </div>
        </div>
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default AudioPlayer;