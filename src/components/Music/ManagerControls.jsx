// src/components/Music/ManagerControls.jsx - Enhanced with Track Position
import React, { useState, useEffect } from 'react';
import { FiPlay, FiPause, FiSkipForward, FiVolume2, FiShuffle, FiList, FiLock } from 'react-icons/fi';
import { globalMusicService } from '../../services/GlobalMusicService';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { useUserProfile } from '../../hooks/useUserProfile';

const ManagerControls = () => {
  const [musicState, setMusicState] = useState(globalMusicService.getState());
  const [userPermissions, setUserPermissions] = useState({
    canControlMusic: false,
    canChangeVolume: false,
    canSkipTracks: false,
    canSelectPlaylists: false,
  });
  const [userRole, setUserRole] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);

  const { business } = useBusiness();
  const { profile } = useUserProfile();

  // Listen to music service updates
  useEffect(() => {
    const unsubscribe = globalMusicService.addListener(setMusicState);
    setMusicState(globalMusicService.getState());
    return unsubscribe;
  }, []);

  // Load user role and permissions
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!profile?.id || !business?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('business_id', business.id)
          .single();

        if (error) throw error;

        const role = data?.role || 'employee';
        setUserRole(role);
        updatePermissions(role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('employee');
        updatePermissions('employee');
      }
    };

    fetchUserRole();
    loadPlaylists();
  }, [profile?.id, business?.id]);

  const updatePermissions = (role) => {
    const roleLevel = role?.toLowerCase() || 'employee';
    
    const permissions = {
      canControlMusic: ['employee', 'manager', 'admin', 'owner'].includes(roleLevel),
      canChangeVolume: ['manager', 'admin', 'owner'].includes(roleLevel),
      canSkipTracks: ['employee', 'manager', 'admin', 'owner'].includes(roleLevel),
      canSelectPlaylists: ['manager', 'admin', 'owner'].includes(roleLevel),
    };

    setUserPermissions(permissions);
  };

  const loadPlaylists = async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .select(`
          id,
          name,
          description
        `)

        .eq('business_id', business.id)
        .order('name');

      if (error) throw error;

      // fetch track counts separately
      const playlistsWithTrackCount = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from('music_playlist_tracks')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', playlist.id);

          return {
            ...playlist,
            trackCount: count || 0,
          };
        })
      );

      setPlaylists(playlistsWithTrackCount);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  const handlePlayPause = async () => {
    if (!userPermissions.canControlMusic) {
      alert('You do not have permission to control music playback.');
      return;
    }

    globalMusicService.controls().toggle();
    await logAction('toggle_play', musicState.isPlaying ? 'Paused music' : 'Started music');
  };

  const handleSkip = async () => {
    if (!userPermissions.canSkipTracks) {
      alert('You do not have permission to skip tracks.');
      return;
    }

    globalMusicService.controls().next();
    await logAction('skip', `Skipped track: ${musicState.currentTrack?.title || 'Unknown'}`);
  };

  const handleVolumeChange = async (newVolume) => {
    if (!userPermissions.canChangeVolume) {
      alert('You do not have permission to change volume.');
      return;
    }

    globalMusicService.controls().setVolume(newVolume);
    await logAction('volume_change', `Changed volume to ${Math.round(newVolume * 100)}%`);
  };

  const handlePlaylistSelect = async (playlist) => {
    if (!userPermissions.canSelectPlaylists) {
      alert('You do not have permission to select playlists.');
      return;
    }

    try {
      await globalMusicService.switchToPlaylist(playlist.id);

      // Immediately reflect the change in UI (don’t wait for service broadcast)
      setMusicState(prev => ({
        ...prev,
        currentPlaylistId: playlist.id,
        playlistInfo: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || '',
        },
        // we’re explicitly entering playlist mode
        shuffleMode: false,
        isShuffleAllMode: false,
      }));

      setShowPlaylistSelector(false);
      await logAction('playlist_select', `Selected playlist: ${playlist.name}`);
    } catch (error) {
      console.error('Playlist selection error:', error);
    }
  };

  const handleShuffleMode = async () => {
    if (!userPermissions.canSelectPlaylists) {
      alert('You do not have permission to change music mode.');
      return;
    }

    try {
      await globalMusicService.switchToShuffle();

      // update UI immediately
      setMusicState(prev => ({
        ...prev,
        shuffleMode: true,
        isShuffleAllMode: true,
        playlistInfo: null,
        currentPlaylistId: null,
      }));

      await logAction('shuffle_mode', 'Toggled shuffle mode');
    } catch (error) {
      console.error('Shuffle mode error:', error);
    }
  };

  const logAction = async (action, description) => {
    try {
      await supabase.from('music_system_logs').insert({
        business_id: business.id,
        log_type: 'manager_action',
        message: `Manager Control: ${action}`,
        details: {
          action: action,
          description: description,
          user_id: profile.id,
          user_name: profile.name || profile.email,
          user_role: userRole,
          timestamp: new Date().toISOString()
        },
        logged_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging manager action:', error);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUserRoleDisplay = () => {
    if (!userRole) return '⏳ Loading...';
    
    const role = userRole.toLowerCase();
    switch (role) {
      case 'owner': return '👑 Owner';
      case 'admin': return '🔧 Admin';
      case 'manager': return '🏢 Manager';
      case 'employee': return '👤 Staff';
      default: return '❓ Guest';
    }
  };

  // Show loading state
  if (!userRole) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading permissions...</div>
      </div>
    );
  }

  // Don't render if user has no music permissions
  if (!userPermissions.canControlMusic) {
    return (
      <div style={styles.noAccess}>
        <FiLock size={24} style={styles.lockIcon} />
        <p style={styles.noAccessText}>
          Music controls not available for your role
        </p>
        <small style={styles.roleText}>
          Current role: {getUserRoleDisplay()}
        </small>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>Music Manager</h3>
          <span style={styles.userRole}>{getUserRoleDisplay()}</span>
        </div>
      </div>

      {/* Enhanced Track Display with Position */}
      <div style={styles.trackDisplay}>
        {musicState.currentTrack ? (
          <>
            <div style={styles.trackTitle}>
              🎵 {musicState.currentTrack.title}
            </div>
            <div style={styles.trackArtist}>
              {musicState.currentTrack.artist || 'Unknown Artist'}
            </div>
            {/* ENHANCED: Show detailed track position and mode info */}
            <div style={styles.positionInfo}>
              {musicState.isShuffleAllMode ? (
                <>🔀 <strong>Shuffle All Tracks</strong> • Track {musicState.currentTrackNumber} of {musicState.totalTracks}</>
              ) : musicState.shuffleMode ? (
                <>🔀 <strong>Shuffle Playlist</strong> • Track {musicState.currentTrackNumber} of {musicState.totalTracks}</>
              ) : (
                <>📋 <strong>Playlist Mode</strong> • Track {musicState.currentTrackNumber} of {musicState.totalTracks}</>
              )}
            </div>
            {/* Additional context */}
            {musicState.playlistInfo?.name && (
              <div style={styles.modeContext}>
                {musicState.playlistInfo.name}
                {musicState.playlistInfo.description && (
                  <span style={styles.modeDescription}> • {musicState.playlistInfo.description}</span>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={styles.noTrack}>Music system starting...</div>
            <div style={styles.systemInfo}>
              {musicState.totalTracks > 0 ? 
                `${musicState.totalTracks} tracks available in system` : 
                'No tracks loaded'
              }
            </div>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <span style={styles.timeDisplay}>{formatTime(musicState.currentTime)}</span>
        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: musicState.duration ? `${(musicState.currentTime / musicState.duration) * 100}%` : '0%'
            }}
          />
        </div>
        <span style={styles.timeDisplay}>{formatTime(musicState.duration)}</span>
      </div>

      {/* Control Buttons */}
      <div style={styles.controls}>
        <button
          style={styles.controlButton}
          onClick={handlePlayPause}
          disabled={!userPermissions.canControlMusic}
          title={musicState.isPlaying ? 'Pause Music' : 'Play Music'}
        >
          {musicState.isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
          <span style={styles.buttonLabel}>
            {musicState.isPlaying ? 'Pause' : 'Play'}
          </span>
        </button>

        <button
          style={styles.controlButton}
          onClick={handleSkip}
          disabled={!userPermissions.canSkipTracks}
          title="Skip to Next Track"
        >
          <FiSkipForward size={20} />
          <span style={styles.buttonLabel}>Skip</span>
        </button>

        <button
          style={styles.controlButton}
          onClick={() => setShowPlaylistSelector(!showPlaylistSelector)}
          disabled={!userPermissions.canSelectPlaylists}
          title="Select Playlist"
        >
          <FiList size={20} />
          <span style={styles.buttonLabel}>Playlist</span>
        </button>
      </div>

      {/* Volume Control */}
      {userPermissions.canChangeVolume && (
        <div style={styles.volumeSection}>
          <div style={styles.volumeHeader}>
            <FiVolume2 size={18} />
            <span style={styles.volumeLabel}>Volume</span>
          </div>
          <div style={styles.volumeControl}>
            <input
              style={styles.volumeSlider}
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={musicState.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            />
            <span style={styles.volumeDisplay}>{Math.round(musicState.volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      {userPermissions.canSelectPlaylists && (
        <div style={styles.modeSection}>
          <button
            style={{
              ...styles.modeButton,
              ...(musicState.isShuffleAllMode || musicState.shuffleMode ? styles.activeModeButton : {})
            }}
            onClick={handleShuffleMode}
            title={
              musicState.isShuffleAllMode || musicState.shuffleMode
                ? 'Disable Shuffle'
                : 'Enable Shuffle'
            }
          >
            <FiShuffle size={16} />
            {musicState.isShuffleAllMode
              ? 'Shuffle All'
              : musicState.shuffleMode
                ? 'Shuffle Playlist'
                : 'Shuffle Off'}
          </button>
        </div>
      )}

      {/* Playlist Selector */}
      {showPlaylistSelector && userPermissions.canSelectPlaylists && (
        <div style={styles.playlistSelector}>
          <div style={styles.playlistHeader}>
            <h4 style={styles.playlistTitle}>Select Playlist</h4>
            <button 
              style={styles.closeButton}
              onClick={() => setShowPlaylistSelector(false)}
            >
              ×
            </button>
          </div>
          <div style={styles.playlistList}>
            {playlists.length === 0 ? (
              <div style={styles.noPlaylists}>No playlists available</div>
            ) : (
              playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  style={{
                    ...styles.playlistItem,
                    ...(playlist.id === musicState.currentPlaylistId ? styles.activePlaylistItem : {})
                  }}
                  onClick={() => handlePlaylistSelect(playlist)}
                >
                  <div style={styles.playlistName}>{playlist.name}</div>
                  <div style={styles.playlistTracks}>{playlist.trackCount} tracks</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '2px solid #14B8A6',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '500px',
    margin: '0 auto',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#666',
  },
  noAccess: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
  },
  lockIcon: {
    color: '#856404',
    marginBottom: '10px',
  },
  noAccessText: {
    fontSize: '16px',
    color: '#856404',
    marginBottom: '10px',
  },
  roleText: {
    fontSize: '14px',
    color: '#6c757d',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #e9ecef',
    paddingBottom: '10px',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  userRole: {
    fontSize: '12px',
    color: '#14B8A6',
    fontWeight: '500',
  },
  trackDisplay: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  trackTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px',
  },
  trackArtist: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
  },
  positionInfo: {
    fontSize: '13px',
    color: '#14B8A6',
    fontWeight: '600',
    marginBottom: '5px',
  },
  modeContext: {
    fontSize: '11px',
    color: '#666',
    fontStyle: 'italic',
  },
  modeDescription: {
    color: '#999',
  },
  noTrack: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '5px',
  },
  systemInfo: {
    fontSize: '12px',
    color: '#999',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  timeDisplay: {
    fontSize: '12px',
    color: '#666',
    minWidth: '35px',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14B8A6',
    transition: 'width 0.1s ease',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  controlButton: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    color: '#666',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  buttonLabel: {
    fontSize: '11px',
    fontWeight: '500',
  },
  volumeSection: {
    marginBottom: '20px',
  },
  volumeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    color: '#666',
  },
  volumeLabel: {
    fontSize: '14px',
    fontWeight: '500',
  },
  volumeControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  volumeSlider: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    background: '#e9ecef',
    outline: 'none',
    cursor: 'pointer',
  },
  volumeDisplay: {
    fontSize: '12px',
    color: '#666',
    minWidth: '35px',
  },
  modeSection: {
    marginBottom: '20px',
  },
  modeButton: {
    width: '100%',
    padding: '10px 15px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#666',
    transition: 'all 0.2s',
  },
  activeModeButton: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
    color: '#fff',
  },
  playlistSelector: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '15px',
  },
  playlistHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  playlistTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
  },
  playlistList: {
    maxHeight: '200px',
    overflowY: 'auto',
  },
  playlistItem: {
    padding: '10px',
    backgroundColor: '#fff',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activePlaylistItem: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
    color: '#fff',
  },
  playlistName: {
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '2px',
  },
  playlistTracks: {
    fontSize: '11px',
    opacity: 0.8,
  },
  noPlaylists: {
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
    padding: '20px',
  },
};

export default ManagerControls;