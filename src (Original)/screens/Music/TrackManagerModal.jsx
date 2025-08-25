import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FiPlus, FiTrash, FiMusic, FiX } from 'react-icons/fi';
import styles from './PlaylistManager.module.css';

const TrackManagerModal = ({ playlist, onClose, onUpdate }) => {
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [availableTracks, setAvailableTracks] = useState([]);
  const [trackSearchTerm, setTrackSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Load playlist tracks
  const loadPlaylistTracks = async () => {
    if (!playlist?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('music_playlist_tracks')
        .select(`
          *,
          track:music_tracks(*)
        `)
        .eq('playlist_id', playlist.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPlaylistTracks(data || []);
    } catch (error) {
      console.error('Error loading playlist tracks:', error);
    }
  };

  // Load available tracks
  const loadAvailableTracks = async () => {
    if (!playlist?.business_id) return;
    
    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('business_id', playlist.business_id)
        .order('title', { ascending: true });

      if (error) throw error;
      setAvailableTracks(data || []);
    } catch (error) {
      console.error('Error loading available tracks:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (playlist?.id) {
      setLoading(true);
      Promise.all([loadPlaylistTracks(), loadAvailableTracks()])
        .finally(() => setLoading(false));
    }
  }, [playlist?.id]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Add track to playlist
  const addTrackToPlaylist = async (trackId) => {
    try {
      // Get current max sort order
      const { data: maxOrder } = await supabase
        .from('music_playlist_tracks')
        .select('sort_order')
        .eq('playlist_id', playlist.id)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = (maxOrder?.[0]?.sort_order || 0) + 1;

      const { error } = await supabase
        .from('music_playlist_tracks')
        .insert([{
          playlist_id: playlist.id,
          track_id: trackId,
          sort_order: nextOrder
        }]);

      if (error) throw error;
      
      await loadPlaylistTracks();
      onUpdate(); // Update parent component
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      alert('Error adding track: ' + error.message);
    }
  };

  // Remove track from playlist
  const removeTrackFromPlaylist = async (trackId) => {
    try {
      const { error } = await supabase
        .from('music_playlist_tracks')
        .delete()
        .eq('playlist_id', playlist.id)
        .eq('track_id', trackId);

      if (error) throw error;
      
      await loadPlaylistTracks();
      onUpdate(); // Update parent component
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      alert('Error removing track: ' + error.message);
    }
  };

  // Filter available tracks based on search
  const filteredAvailableTracks = availableTracks.filter(track => 
    !playlistTracks.some(pt => pt.track.id === track.id) &&
    (track.title.toLowerCase().includes(trackSearchTerm.toLowerCase()) ||
     track.artist?.toLowerCase().includes(trackSearchTerm.toLowerCase()))
  );

  if (!playlist) return null;

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '20px'
  };

  const modalContentStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '2px solid #14B8A6',
    padding: '30px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
  };

  const trackManagerStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '25px',
    flex: 1,
    minHeight: 0
  };

  const trackSectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  };

  const trackListStyle = {
    border: '2px solid #14B8A6',
    borderRadius: '8px',
    padding: '15px',
    height: '350px',
    overflowY: 'auto',
    backgroundColor: '#fafafa'
  };

  return (
    <div 
      style={modalStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div style={modalContentStyle}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Manage Tracks: {playlist.name}</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            <FiX />
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading tracks...</div>
        ) : (
          <div style={trackManagerStyle}>
            {/* Current Playlist Tracks */}
            <div style={trackSectionStyle}>
              <div className={styles.trackSectionHeader}>
                <h3 className={styles.trackSectionTitle}>Current Tracks ({playlistTracks.length})</h3>
              </div>
              <div style={trackListStyle}>
                {playlistTracks.map((playlistTrack, index) => (
                  <div key={playlistTrack.track.id} className={styles.trackItem}>
                    <div className={styles.trackInfo}>
                      <span className={styles.trackNumber}>{index + 1}.</span>
                      <div className={styles.trackDetails}>
                        <h4>{playlistTrack.track.title}</h4>
                        <p>{playlistTrack.track.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTrackFromPlaylist(playlistTrack.track.id)}
                      className={`${styles.iconButton} ${styles.danger}`}
                      title="Remove Track"
                    >
                      <FiTrash />
                    </button>
                  </div>
                ))}
                {playlistTracks.length === 0 && (
                  <div className={styles.trackEmptyState}>
                    <FiMusic className={styles.trackEmptyIcon} />
                    <p>No tracks in this playlist yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Available Tracks */}
            <div style={trackSectionStyle}>
              <div className={styles.trackSectionHeader}>
                <h3 className={styles.trackSectionTitle}>Available Tracks</h3>
                <input
                  type="text"
                  placeholder="Search tracks..."
                  value={trackSearchTerm}
                  onChange={(e) => setTrackSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <div style={trackListStyle}>
                {filteredAvailableTracks.map((track) => (
                  <div key={track.id} className={styles.trackItem}>
                    <div className={styles.trackInfo}>
                      <div className={styles.trackDetails}>
                        <h4>{track.title}</h4>
                        <p>{track.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addTrackToPlaylist(track.id)}
                      className={`${styles.iconButton} ${styles.primary}`}
                      title="Add Track"
                    >
                      <FiPlus />
                    </button>
                  </div>
                ))}
                {filteredAvailableTracks.length === 0 && (
                  <div className={styles.trackEmptyState}>
                    <FiMusic className={styles.trackEmptyIcon} />
                    <p>
                      {trackSearchTerm ? 'No tracks match your search' : 'All tracks already added'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackManagerModal;