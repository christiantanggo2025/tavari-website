import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FiPlus, FiEdit, FiTrash, FiMusic, FiShuffle, FiList, FiX, FiSkipForward } from 'react-icons/fi';
import { useBusiness } from '../../contexts/BusinessContext';
import TrackManagerModal from './TrackManagerModal';
import styles from './PlaylistManager.module.css';

const PlaylistManager = () => {
  const [playlists, setPlaylists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { business } = useBusiness();

  // Modal states
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showTrackManager, setShowTrackManager] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(null);

  // Form states
  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    description: '',
    playlist_type: 'ordered',
    color_code: '#14B8A6',
    shuffle_include_new_uploads: true,
    priority: 1
  });

  // Helper function to get random color for playlists
  const getRandomColor = () => {
    const colors = [
      '#14B8A6', '#10B981', '#0D9488', '#059669', 
      '#047857', '#065F46', '#064E3B', '#022C22'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Load playlists
  const loadPlaylists = async () => {
    if (!business?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .select(`
          *,
          track_count:music_playlist_tracks(count)
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process track counts
      const processedPlaylists = data.map(playlist => ({
        ...playlist,
        track_count: playlist.track_count?.[0]?.count || 0
      }));
      
      setPlaylists(processedPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  // Load tracks for playlist creation
  const loadTracks = async () => {
    if (!business?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('business_id', business.id)
        .order('title', { ascending: true });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
    }
  };

  // Load all data
  useEffect(() => {
    if (business?.id) {
      setLoading(true);
      Promise.all([loadPlaylists(), loadTracks()])
        .finally(() => setLoading(false));
    }
  }, [business?.id]);

  // Create playlist
  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .insert([{
          name: playlistForm.name,
          description: playlistForm.description,
          playlist_type: playlistForm.playlist_type,
          color_code: playlistForm.color_code || getRandomColor(),
          shuffle_include_new_uploads: playlistForm.shuffle_include_new_uploads,
          business_id: business.id
        }])
        .select()
        .single();

      if (error) throw error;

      setPlaylists(prev => [data, ...prev]);
      setShowCreatePlaylist(false);
      setPlaylistForm({
        name: '',
        description: '',
        playlist_type: 'ordered',
        color_code: '#14B8A6',
        shuffle_include_new_uploads: true,
        priority: 1
      });
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('Error creating playlist: ' + error.message);
    }
  };

  // Check if playlist is used in schedules
  const checkPlaylistSchedules = async (playlistId) => {
    try {
      const { data, error } = await supabase
        .from('music_playlist_schedules')
        .select(`
          id,
          schedule_date,
          day_of_week,
          start_time,
          end_time,
          active,
          repeat_type
        `)
        .eq('playlist_id', playlistId)
        .eq('business_id', business.id);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error checking playlist schedules:', error);
      return [];
    }
  };

  // Initiate playlist deletion with schedule check
  const initiateDeletePlaylist = async (playlist) => {
    console.log('🗑️ Checking schedules for playlist:', playlist.name);
    
    const schedules = await checkPlaylistSchedules(playlist.id);
    
    if (schedules.length > 0) {
      console.log('⚠️ Found', schedules.length, 'schedule(s) using this playlist');
      setShowDeleteWarning({
        playlist,
        schedules
      });
    } else {
      // No schedules, proceed with normal deletion
      console.log('✅ No schedules found, proceeding with deletion');
      if (confirm(`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`)) {
        await deletePlaylist(playlist.id);
      }
    }
  };

  // Delete playlist (after confirmation)
  const deletePlaylist = async (playlistId, forceDelete = false) => {
    try {
      if (forceDelete) {
        console.log('🗑️ Force deleting playlist and all schedules:', playlistId);
        
        // Delete all schedules first
        const { error: schedulesError } = await supabase
          .from('music_playlist_schedules')
          .delete()
          .eq('playlist_id', playlistId)
          .eq('business_id', business.id);

        if (schedulesError) {
          console.warn('Schedules delete warning:', schedulesError);
        }
      }

      // Delete all tracks from the playlist
      const { error: tracksError } = await supabase
        .from('music_playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId);

      if (tracksError) {
        console.error('Error removing tracks from playlist:', tracksError);
        throw new Error(`Failed to remove tracks from playlist: ${tracksError.message}`);
      }

      // Delete the playlist itself
      const { error: playlistError } = await supabase
        .from('music_playlists')
        .delete()
        .eq('id', playlistId)
        .eq('business_id', business.id);

      if (playlistError) {
        console.error('Error deleting playlist:', playlistError);
        throw new Error(`Failed to delete playlist: ${playlistError.message}`);
      }

      console.log('✅ Successfully deleted playlist');

      // Update local state
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      setShowDeleteWarning(null);
      
      alert('Playlist deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert('Error deleting playlist: ' + error.message);
    }
  };

  // Force skip current playlist (switch to shuffle immediately)
  const forceSkipPlaylist = async () => {
    try {
      console.log('⏭️ Force skipping current playlist');
      
      // Check if globalMusicService is available
      if (window.globalMusicService) {
        // Force switch to shuffle mode
        await window.globalMusicService.switchToShuffle();
        alert('Switched to shuffle mode!');
      } else {
        console.error('GlobalMusicService not available');
        alert('Music service not available. Try refreshing the page.');
      }
    } catch (error) {
      console.error('Error force skipping playlist:', error);
      alert('Error switching playlist: ' + error.message);
    }
  };

  // Format schedule info for display
  const formatScheduleInfo = (schedule) => {
    const time = `${schedule.start_time} - ${schedule.end_time}`;
    
    if (schedule.schedule_date) {
      const date = new Date(schedule.schedule_date + 'T00:00:00').toLocaleDateString();
      const repeatInfo = schedule.repeat_type !== 'once' ? ` (${schedule.repeat_type})` : '';
      return `${date} ${time}${repeatInfo}`;
    } else if (schedule.day_of_week !== null) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${days[schedule.day_of_week]} ${time}`;
    }
    
    return time;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading playlists...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Playlist Manager</h1>
        <p className={styles.subtitle}>Create and manage playlists for your music system</p>
      </div>

      {/* Action Buttons - Tavari 3x Grid Standard */}
      <div className={styles.actionGrid}>
        <button
          onClick={() => setShowCreatePlaylist(true)}
          className={styles.actionButton}
        >
          <FiPlus className={styles.actionIcon} />
          Create Playlist
        </button>
        <button
          onClick={forceSkipPlaylist}
          className={styles.actionButton}
          style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
        >
          <FiSkipForward className={styles.actionIcon} />
          Force Skip Playlist
        </button>
        <button disabled className={styles.actionButton}>
          <FiEdit className={styles.actionIcon} />
          Bulk Edit
        </button>
      </div>

      {/* Playlists Grid */}
      {playlists.length > 0 ? (
        <div className={styles.playlistGrid}>
          {playlists.map((playlist) => (
            <div key={playlist.id} className={styles.playlistCard}>
              <div className={styles.playlistHeader}>
                <div className={styles.playlistInfo}>
                  <div
                    className={styles.colorIndicator}
                    style={{ backgroundColor: playlist.color_code }}
                  />
                  <div>
                    <h3 className={styles.playlistTitle}>{playlist.name}</h3>
                    <div className={styles.playlistMeta}>
                      {playlist.playlist_type === 'shuffle' ? (
                        <><FiShuffle /> Shuffle</>
                      ) : (
                        <><FiList /> Ordered</>
                      )}
                      <span>• {playlist.track_count} tracks</span>
                    </div>
                  </div>
                </div>
                <div className={styles.playlistActions}>
                  <button
                    onClick={() => setShowTrackManager(playlist)}
                    className={`${styles.iconButton} ${styles.primary}`}
                    title="Manage Tracks"
                  >
                    <FiMusic />
                  </button>
                  <button
                    onClick={() => initiateDeletePlaylist(playlist)}
                    className={`${styles.iconButton} ${styles.danger}`}
                    title="Delete Playlist"
                  >
                    <FiTrash />
                  </button>
                </div>
              </div>
              
              {playlist.description && (
                <p className={styles.playlistDescription}>{playlist.description}</p>
              )}
              
              <div className={styles.playlistDate}>
                <div>Created {new Date(playlist.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <FiMusic className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No playlists yet</h3>
          <p className={styles.emptyDescription}>Create your first playlist to get started</p>
          <button onClick={() => setShowCreatePlaylist(true)} className={styles.primaryButton}>
            Create Playlist
          </button>
        </div>
      )}

      {/* Track Manager Modal */}
      {showTrackManager && (
        <TrackManagerModal
          playlist={showTrackManager}
          onClose={() => setShowTrackManager(null)}
          onUpdate={loadPlaylists}
        />
      )}

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>⚠️ Playlist Used in Schedules</h2>
              <button
                onClick={() => setShowDeleteWarning(null)}
                className={styles.closeButton}
              >
                <FiX />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '16px', marginBottom: '15px' }}>
                The playlist "<strong>{showDeleteWarning.playlist.name}</strong>" is currently used in the following schedules:
              </p>
              
              <div style={{ 
                backgroundColor: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '8px', 
                padding: '15px',
                marginBottom: '20px'
              }}>
                {showDeleteWarning.schedules.map((schedule, index) => (
                  <div key={schedule.id} style={{ marginBottom: '8px' }}>
                    <strong>Schedule {index + 1}:</strong> {formatScheduleInfo(schedule)}
                    {schedule.active && <span style={{ color: '#059669', marginLeft: '10px' }}>• Active</span>}
                    {!schedule.active && <span style={{ color: '#6b7280', marginLeft: '10px' }}>• Inactive</span>}
                  </div>
                ))}
              </div>
              
              <p style={{ fontSize: '14px', color: '#666' }}>
                Deleting this playlist will also remove all associated schedules. This action cannot be undone.
              </p>
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={() => setShowDeleteWarning(null)}
                className={`${styles.button} ${styles.secondary}`}
              >
                Cancel
              </button>
              <button
                onClick={() => deletePlaylist(showDeleteWarning.playlist.id, true)}
                className={`${styles.button} ${styles.primary}`}
                style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
              >
                Delete Playlist & Schedules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Playlist</h2>
              <button
                onClick={() => setShowCreatePlaylist(false)}
                className={styles.closeButton}
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={createPlaylist}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Playlist Name</label>
                <input
                  type="text"
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, name: e.target.value }))}
                  className={styles.input}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, description: e.target.value }))}
                  className={styles.textarea}
                  rows="3"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Playlist Type</label>
                <select
                  value={playlistForm.playlist_type}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, playlist_type: e.target.value }))}
                  className={styles.select}
                >
                  <option value="ordered">Ordered</option>
                  <option value="shuffle">Shuffle</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Color</label>
                <input
                  type="color"
                  value={playlistForm.color_code}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, color_code: e.target.value }))}
                  className={styles.colorInput}
                />
              </div>

              {playlistForm.playlist_type === 'shuffle' && (
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={playlistForm.shuffle_include_new_uploads}
                      onChange={(e) => setPlaylistForm(prev => ({ 
                        ...prev, 
                        shuffle_include_new_uploads: e.target.checked 
                      }))}
                      className={styles.checkbox}
                    />
                    Include new uploads automatically
                  </label>
                </div>
              )}

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylist(false)}
                  className={`${styles.button} ${styles.secondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.primary}`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistManager;