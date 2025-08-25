// src/screens/Music/MusicLibrary.jsx
import React, { useState, useEffect } from 'react';
import { FiMusic, FiSearch, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiClock, FiUser } from 'react-icons/fi';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useBusiness } from '../../contexts/BusinessContext';
import useAccessProtection from '../../hooks/useAccessProtection';
import SessionManager from '../../components/SessionManager';
import { supabase } from '../../supabaseClient';

const MusicLibrary = () => {
  const { profile } = useUserProfile();
  const { business } = useBusiness();
  useAccessProtection(profile);

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShuffle, setFilterShuffle] = useState('all'); // all, shuffle, no-shuffle
  const [sortBy, setSortBy] = useState('uploaded_at'); // uploaded_at, title, artist, duration
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [editingTrack, setEditingTrack] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '' });

  // Load tracks from database
  const loadTracks = async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('music_tracks')
        .select('*')
        .eq('business_id', business.id);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;

      setTracks(data || []);
    } catch (error) {
      console.error('Error loading tracks:', error);
      alert('Failed to load music library');
    } finally {
      setLoading(false);
    }
  };

  // Load tracks when component mounts or business changes
  useEffect(() => {
    loadTracks();
  }, [business?.id, sortBy, sortOrder]);

  // Filter tracks based on search and shuffle filter
  const filteredTracks = tracks.filter(track => {
    const matchesSearch = !searchTerm || 
      track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterShuffle === 'all' || 
      (filterShuffle === 'shuffle' && track.include_in_shuffle) ||
      (filterShuffle === 'no-shuffle' && !track.include_in_shuffle);

    return matchesSearch && matchesFilter;
  });

  // Toggle shuffle inclusion for a track
  const toggleShuffle = async (track) => {
    try {
      const currentValue = track.include_in_shuffle;
      const newValue = !currentValue;
      
      console.log(`Toggling shuffle for "${track.title}": ${currentValue} → ${newValue}`);
      console.log(`Track ID: ${track.id}, Business ID: ${business.id}`);

      // Update database with explicit business_id filter for RLS
      const { data, error } = await supabase
        .from('music_tracks')
        .update({ include_in_shuffle: newValue })
        .eq('id', track.id)
        .eq('business_id', business.id) // Add this back for RLS
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Supabase update successful:', data);
      
      // Verify the update actually took effect
      if (data && data.length > 0) {
        console.log('Updated record from DB:', data[0]);
        
        // Update local state with the actual data from DB
        setTracks(prev =>
          prev.map(t =>
            t.id === track.id ? { ...t, include_in_shuffle: data[0].include_in_shuffle } : t
          )
        );
        
        console.log(`Successfully updated track ${track.title} shuffle setting to: ${data[0].include_in_shuffle}`);
        
        // Double-check by reloading a few seconds later
        setTimeout(() => {
          console.log('Reloading tracks to verify persistence...');
          loadTracks();
        }, 1000);
        
      } else {
        throw new Error('No data returned from update - possible RLS issue');
      }
      
    } catch (error) {
      console.error('Error updating shuffle setting:', error);
      
      // Show more detailed error message
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Failed to update shuffle setting: ${errorMessage}\n\nCheck console for details.`);
      
      // Force reload from database to ensure we have current state
      console.log('Reloading tracks from database...');
      await loadTracks();
    }
  };

  // Start editing a track
  const startEdit = (track) => {
    setEditingTrack(track.id);
    setEditForm({ title: track.title, artist: track.artist || '' });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingTrack(null);
    setEditForm({ title: '', artist: '' });
  };

  // Save track edits
  const saveEdit = async () => {
    try {
      const { error } = await supabase
        .from('music_tracks')
        .update({ 
          title: editForm.title,
          artist: editForm.artist || null
        })
        .eq('id', editingTrack);

      if (error) throw error;

      // Update local state
      setTracks(prev => prev.map(t => 
        t.id === editingTrack ? { 
          ...t, 
          title: editForm.title, 
          artist: editForm.artist || null 
        } : t
      ));

      cancelEdit();
    } catch (error) {
      console.error('Error updating track:', error);
      alert('Failed to update track');
    }
  };

  // Delete a track
  const deleteTrack = async (track) => {
    if (!confirm(`Are you sure you want to delete "${track.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('music-files')
        .remove([track.file_path]);

      if (storageError) {
        console.warn('Storage deletion warning:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('music_tracks')
        .delete()
        .eq('id', track.id);

      if (dbError) throw dbError;

      // Update local state
      setTracks(prev => prev.filter(t => t.id !== track.id));
    } catch (error) {
      console.error('Error deleting track:', error);
      alert('Failed to delete track');
    }
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format upload date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SessionManager>
        <div style={styles.container}>
          <div style={styles.loading}>Loading music library...</div>
        </div>
      </SessionManager>
    );
  }

  return (
    <SessionManager>
      <div style={styles.container}>
        <div style={styles.header}>
          <FiMusic size={32} style={styles.headerIcon} />
          <h1 style={styles.title}>Music Library</h1>
          <p style={styles.subtitle}>
            {tracks.length} songs in {business?.name || 'your business'} library
          </p>
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          <div style={styles.searchSection}>
            <div style={styles.searchBox}>
              <FiSearch style={styles.searchIcon} />
              <input
                style={styles.searchInput}
                type="text"
                placeholder="Search by title or artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.filters}>
            <select
              style={styles.filterSelect}
              value={filterShuffle}
              onChange={(e) => setFilterShuffle(e.target.value)}
            >
              <option value="all">All Tracks</option>
              <option value="shuffle">In Shuffle</option>
              <option value="no-shuffle">Not in Shuffle</option>
            </select>

            <select
              style={styles.filterSelect}
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <option value="uploaded_at-desc">Newest First</option>
              <option value="uploaded_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="artist-asc">Artist A-Z</option>
              <option value="artist-desc">Artist Z-A</option>
              <option value="duration-desc">Longest First</option>
              <option value="duration-asc">Shortest First</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <strong>{filteredTracks.length}</strong> songs shown
          </div>
          <div style={styles.statItem}>
            <strong>{tracks.filter(t => t.include_in_shuffle).length}</strong> in shuffle
          </div>
          <div style={styles.statItem}>
            <strong>{tracks.filter(t => !t.include_in_shuffle).length}</strong> excluded
          </div>
        </div>

        {/* Track List */}
        {filteredTracks.length === 0 ? (
          <div style={styles.emptyState}>
            <FiMusic size={48} style={styles.emptyIcon} />
            <h3>No tracks found</h3>
            <p>
              {searchTerm || filterShuffle !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Upload some music files to get started'
              }
            </p>
          </div>
        ) : (
          <div style={styles.trackList}>
            {filteredTracks.map(track => (
              <div key={track.id} style={styles.trackItem}>
                <div style={styles.trackMain}>
                  <div style={styles.trackInfo}>
                    {editingTrack === track.id ? (
                      <div style={styles.editForm}>
                        <input
                          style={styles.editInput}
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                          placeholder="Song title"
                        />
                        <input
                          style={styles.editInput}
                          type="text"
                          value={editForm.artist}
                          onChange={(e) => setEditForm({...editForm, artist: e.target.value})}
                          placeholder="Artist name"
                        />
                        <div style={styles.editActions}>
                          <button style={styles.saveButton} onClick={saveEdit}>Save</button>
                          <button style={styles.cancelButton} onClick={cancelEdit}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={styles.trackTitle}>{track.title}</h3>
                        <p style={styles.trackArtist}>
                          <FiUser size={14} />
                          {track.artist || 'Unknown Artist'}
                        </p>
                        <p style={styles.trackMeta}>
                          <FiClock size={14} />
                          {formatDuration(track.duration)} • Uploaded {formatDate(track.uploaded_at)}
                        </p>
                      </>
                    )}
                  </div>

                  <div style={styles.trackControls}>
                    <div 
                      style={{...styles.shuffleToggle, opacity: editingTrack === track.id ? 0.5 : 1}} 
                      onClick={() => editingTrack !== track.id && toggleShuffle(track)}
                    >
                      {track.include_in_shuffle ? (
                        <FiToggleRight size={24} color="#28a745" />
                      ) : (
                        <FiToggleLeft size={24} color="#6c757d" />
                      )}
                      <span style={styles.toggleLabel}>
                        {track.include_in_shuffle ? 'In Shuffle' : 'Excluded'}
                      </span>
                    </div>

                    <div style={styles.trackActions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => startEdit(track)}
                        disabled={editingTrack === track.id}
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => deleteTrack(track)}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SessionManager>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '18px',
    color: '#666',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e9ecef',
  },
  headerIcon: {
    color: '#20c997',
    marginBottom: '10px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '30px',
  },
  searchSection: {
    display: 'flex',
    justifyContent: 'center',
  },
  searchBox: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#666',
  },
  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  filters: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '2px solid #e9ecef',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    marginBottom: '30px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  statItem: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#666',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  emptyIcon: {
    color: '#ccc',
    marginBottom: '20px',
  },
  trackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  trackItem: {
    backgroundColor: '#fff',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
  },
  trackMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    flexWrap: 'wrap',
  },
  trackInfo: {
    flex: '1',
    minWidth: '250px',
  },
  trackTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  },
  trackArtist: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  trackMeta: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  editInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  editActions: {
    display: 'flex',
    gap: '10px',
  },
  saveButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  trackControls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '15px',
  },
  shuffleToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '5px',
  },
  toggleLabel: {
    fontSize: '14px',
    fontWeight: '500',
  },
  trackActions: {
    display: 'flex',
    gap: '10px',
  },
  actionButton: {
    backgroundColor: '#20c997',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default MusicLibrary;