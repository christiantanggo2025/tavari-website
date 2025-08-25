// src/components/Music/ManagerControls.jsx
import React, { useState, useEffect } from 'react';
import { FiPlay, FiPause, FiSkipForward, FiVolume2, FiList, FiShuffle, FiLock } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { globalMusicService } from '../../services/GlobalMusicService';

const ManagerControls = () => {
  const { business } = useBusiness();
  const { profile } = useUserProfile();
  const [userRole, setUserRole] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [musicState, setMusicState] = useState(globalMusicService.getState());
  const [userPermissions, setUserPermissions] = useState({
    canControlMusic: false,
    canChangeVolume: false,
    canSkipTracks: false,
    canSelectPlaylists: false,
  });

  // Listen to music service updates
  useEffect(() => {
    const unsubscribe = globalMusicService.addListener(setMusicState);
    setMusicState(globalMusicService.getState());
    return unsubscribe;
  }, []);

  // Fetch user role and permissions
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!profile?.id || !business?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('business_id', business.id)
          .eq('active', true)
          .single();

        if (data) {
          setUserRole(data.role);
          checkUserPermissions(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [profile?.id, business?.id]);

  // Load playlists
  useEffect(() => {
    loadPlaylists();
  }, [business?.id]);

  const checkUserPermissions = (role) => {
    const roleLevel = role?.toLowerCase();
    
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
          description,
          music_playlist_tracks(
            music_tracks(title, artist)
          )
        `)
        .eq('business_id', business.id)
        .order('name');

      if (error) throw error;

      const playlistsWithTrackCount = (data || []).map(playlist => ({
        ...playlist,
        trackCount: playlist.music_playlist_tracks?.length || 0
      }));

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

    globalMusicService.togglePlay();
    await logAction('toggle_play', musicState.isPlaying ? 'Paused music' : 'Started music');
  };

  const handleSkip = async () => {
    if (!userPermissions.canSkipTracks) {
      alert('You do not have permission to skip tracks.');
      return;
    }

    globalMusicService.next();
    await logAction('skip', `Skipped track: ${musicState.currentTrack?.title || 'Unknown'}`);
  };

  const handleVolumeChange = async (newVolume) => {
    if (!userPermissions.canChangeVolume) {
      alert('You do not have permission to change volume.');
      return;
    }

    globalMusicService.setVolume(newVolume);
    await logAction('volume_change', `Changed volume to ${Math.round(newVolume * 100)}%`);
  };

  const handlePlaylistSelect = async (playlist) => {
    if (!userPermissions.canSelectPlaylists) {
      alert('You do not have permission to select playlists.');
      return;
    }

    try {
      await globalMusicService.switchToPlaylist(playlist.id);
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

    await globalMusicService.switchToShuffle();
    await logAction('shuffle_mode', 'Switched to shuffle mode');
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

      {/* Current Track Display */}
      <div style={styles.trackDisplay}>
        {musicState.currentTrack ? (
          <>
            <div style={styles.trackTitle}>
              🎵 {musicState.currentTrack.title}
            </div>
            <div style={styles.trackArtist}>
              {musicState.currentTrack.artist || 'Unknown Artist'}
            </div>
            <div style={styles.modeInfo}>
              {musicState.shuffleMode ? (
                `🔀 Shuffle • ${musicState.playedCount}/${musicState.totalTracks} played`
              ) : (
                `📋 Playlist • Track ${musicState.currentIndex + 1}/${musicState.totalTracks}`
              )}
            </div>
          </>
        ) : (
          <div style={styles.noTrack}>Music system starting...</div>
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
              ...(musicState.shuffleMode ? styles.activeModeButton : {})
            }}
            onClick={handleShuffleMode}
          >
            <FiShuffle size={16} />
            Shuffle Mode
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
              playlists.map(playlist => (
                <div
                  key={playlist.id}
                  style={styles.playlistItem}
                  onClick={() => handlePlaylistSelect(playlist)}
                >
                  <div style={styles.playlistName}>{playlist.name}</div>
                  <div style={styles.playlistInfo}>
                    {playlist.trackCount} tracks
                    {playlist.description && (
                      <span style={styles.playlistDescription}>
                        • {playlist.description}
                      </span>
                    )}
                  </div>
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
    border: '2px solid #20c997',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '400px',
    margin: '0 auto',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  loading: {
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '400px',
    margin: '0 auto',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6c757d',
  },
  noAccess: {
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '400px',
    margin: '0 auto',
  },
  lockIcon: {
    color: '#6c757d',
    marginBottom: '10px',
  },
  noAccessText: {
    fontSize: '14px',
    color: '#6c757d',
    margin: '0 0 10px 0',
  },
  roleText: {
    fontSize: '12px',
    color: '#999',
  },
  header: {
    marginBottom: '20px',
  },
  titleSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
  },
  userRole: {
    fontSize: '12px',
    color: '#20c997',
    fontWeight: '500',
    padding: '4px 8px',
    backgroundColor: '#e8f8f5',
    borderRadius: '12px',
  },
  trackDisplay: {
    textAlign: 'center',
    marginBottom: '15px',
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
    marginBottom: '8px',
  },
  modeInfo: {
    fontSize: '12px',
    color: '#999',
    fontWeight: '500',
  },
  noTrack: {
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  timeDisplay: {
    fontSize: '11px',
    color: '#666',
    minWidth: '30px',
  },
  progressBar: {
    flex: 1,
    height: '4px',
    backgroundColor: '#e9ecef',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#20c997',
    transition: 'width 0.1s ease',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  controlButton: {
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    padding: '12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '12px',
    color: '#333',
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
  },
  volumeLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
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
    fontWeight: '500',
  },
  modeSection: {
    marginBottom: '20px',
    textAlign: 'center',
  },
  modeButton: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#666',
    transition: 'all 0.2s',
  },
  activeModeButton: {
    backgroundColor: '#20c997',
    borderColor: '#20c997',
    color: '#fff',
  },
  playlistSelector: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    marginBottom: '15px',
    maxHeight: '200px',
    overflow: 'hidden',
  },
  playlistHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#fff',
  },
  playlistTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    color: '#666',
    cursor: 'pointer',
    padding: '0',
    width: '20px',
    height: '20px',
  },
  playlistList: {
    maxHeight: '150px',
    overflowY: 'auto',
  },
  noPlaylists: {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
  },
  playlistItem: {
    padding: '12px 15px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  playlistName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '4px',
  },
  playlistInfo: {
    fontSize: '12px',
    color: '#666',
  },
  playlistDescription: {
    color: '#999',
  },
};

export default ManagerControls;