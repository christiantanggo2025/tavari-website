// src/screens/Music/MusicLibrary.jsx - Fixed Database Constraints and Error Handling
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMusic, FiSearch, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiClock, FiUser, FiFilter, FiRefreshCw, FiDownload, FiCheckCircle } from 'react-icons/fi';

// Tavari Build Standards - Required imports
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { SecurityWrapper } from '../../Security';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useSecurityContext } from '../../Security/useSecurityContext';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';

// Database connection
import { supabase } from '../../supabaseClient';

/**
 * Music Library - Manage and organize music tracks
 * Integrates with all Tavari build standards for consistency
 */
const MusicLibrary = () => {
  const navigate = useNavigate();

  // Tavari standardized authentication
  const auth = usePOSAuth({
    requiredRoles: ['employee', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'MusicLibrary'
  });

  // Tavari standardized security
  const security = useSecurityContext({
    enableRateLimiting: true,
    enableDeviceTracking: true,
    enableInputValidation: true,
    enableAuditLogging: true,
    componentName: 'MusicLibrary',
    sensitiveComponent: false
  });

  // Tax calculations
  const taxCalc = useTaxCalculations(auth.selectedBusinessId);

  // Refs to prevent infinite loops
  const initializedRef = useRef(false);
  const loadingRef = useRef(false);

  // Local state for music library
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShuffle, setFilterShuffle] = useState('all');
  const [sortBy, setSortBy] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingTrack, setEditingTrack] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', album: '' });
  const [errors, setErrors] = useState({});
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Duplicate detection state
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateMethod, setDuplicateMethod] = useState('exact');
  const [removingDuplicates, setRemovingDuplicates] = useState(false);

  // Advanced filters
  const [filters, setFilters] = useState({
    minDuration: '',
    maxDuration: '',
    uploadDateFrom: '',
    uploadDateTo: '',
    hasArtist: 'all'
  });

  // Load tracks function - stable with useCallback
  const loadTracks = useCallback(async () => {
    if (!auth.selectedBusinessId || loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    setErrors(prev => ({ ...prev, loading: null }));

    try {
      let query = supabase
        .from('music_tracks')
        .select('*')
        .eq('business_id', auth.selectedBusinessId);

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;

      setTracks(data || []);

      // Log access only once per session (with error handling)
      if (!initializedRef.current) {
        try {
          if (security && security.logSecurityEvent) {
            await security.logSecurityEvent('music_library_accessed', {
              track_count: data?.length || 0,
              sort_by: sortBy,
              sort_order: sortOrder
            }, 'low');
          }
        } catch (logError) {
          // Security logging is optional - don't break functionality
          console.warn('Security logging unavailable:', logError.message);
        }
      }

    } catch (error) {
      console.error('Error loading tracks:', error);
      setErrors(prev => ({ 
        ...prev, 
        loading: 'Failed to load music library. Please try again.' 
      }));
    } finally {
      setLoading(false);
      loadingRef.current = false;
      initializedRef.current = true;
    }
  }, [auth.selectedBusinessId, sortBy, sortOrder]);

  // Initialize data loading - only once when ready
  useEffect(() => {
    if (auth.isReady && auth.selectedBusinessId && !initializedRef.current) {
      loadTracks();
    }
  }, [auth.isReady, auth.selectedBusinessId]);

  // Handle sort changes
  useEffect(() => {
    if (initializedRef.current && auth.selectedBusinessId) {
      loadTracks();
    }
  }, [sortBy, sortOrder, loadTracks]);

  // Enhanced filtering with advanced options
  const filteredTracks = tracks.filter(track => {
    const matchesSearch = !searchTerm || 
      track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.album?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesShuffleFilter = filterShuffle === 'all' || 
      (filterShuffle === 'shuffle' && track.include_in_shuffle) ||
      (filterShuffle === 'no-shuffle' && !track.include_in_shuffle);

    const matchesDuration = (!filters.minDuration || track.duration >= parseInt(filters.minDuration)) &&
                           (!filters.maxDuration || track.duration <= parseInt(filters.maxDuration));

    const trackDate = new Date(track.uploaded_at);
    const matchesUploadDate = (!filters.uploadDateFrom || trackDate >= new Date(filters.uploadDateFrom)) &&
                             (!filters.uploadDateTo || trackDate <= new Date(filters.uploadDateTo));

    const matchesArtistFilter = filters.hasArtist === 'all' ||
                               (filters.hasArtist === 'yes' && track.artist) ||
                               (filters.hasArtist === 'no' && !track.artist);

    return matchesSearch && matchesShuffleFilter && matchesDuration && 
           matchesUploadDate && matchesArtistFilter;
  });

  /**
   * Safe security logging wrapper
   */
  const safeSecurityLog = async (eventType, details, severity = 'low') => {
    try {
      if (security && security.logSecurityEvent) {
        await security.logSecurityEvent(eventType, details, severity);
      }
    } catch (error) {
      // Security logging is optional - log but don't throw
      console.warn(`Security logging failed for ${eventType}:`, error.message);
    }
  };

  /**
   * Safe rate limiting wrapper
   */
  const safeRateLimit = async (action, maxAttempts, timeWindow) => {
    try {
      if (security && security.checkRateLimit) {
        return await security.checkRateLimit(action, maxAttempts, timeWindow);
      }
    } catch (error) {
      console.warn(`Rate limiting failed for ${action}:`, error.message);
    }
    // Return allowed if rate limiting is unavailable
    return { allowed: true };
  };

  /**
   * Toggle shuffle inclusion with enhanced validation
   */
  const toggleShuffle = async (track) => {
    try {
      // Safe rate limiting check
      const rateLimitResult = await safeRateLimit('shuffle_toggle', 30, 60000);
      
      if (!rateLimitResult.allowed) {
        setErrors(prev => ({ 
          ...prev, 
          shuffle: 'Too many changes. Please wait before making more updates.' 
        }));
        return;
      }

      const newValue = !track.include_in_shuffle;
      
      if (!auth.hasRole(['manager', 'owner']) && track.uploaded_by !== auth.authUser.id) {
        setErrors(prev => ({ 
          ...prev, 
          shuffle: 'You can only modify tracks you uploaded.' 
        }));
        return;
      }

      const { data, error } = await supabase
        .from('music_tracks')
        .update({ include_in_shuffle: newValue })
        .eq('id', track.id)
        .eq('business_id', auth.selectedBusinessId)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setTracks(prev =>
          prev.map(t =>
            t.id === track.id ? { ...t, include_in_shuffle: data[0].include_in_shuffle } : t
          )
        );

        // Safe security logging
        await safeSecurityLog('track_shuffle_toggled', {
          track_id: track.id,
          track_title: track.title,
          new_value: newValue,
          changed_by: auth.authUser.id
        }, 'low');

        setErrors(prev => ({ ...prev, shuffle: null }));
      } else {
        throw new Error('No data returned from update');
      }
      
    } catch (error) {
      console.error('Error updating shuffle setting:', error);
      setErrors(prev => ({ 
        ...prev, 
        shuffle: `Failed to update shuffle setting: ${error.message}` 
      }));
    }
  };

  const startEdit = (track) => {
    if (!auth.hasRole(['manager', 'owner']) && track.uploaded_by !== auth.authUser.id) {
      setErrors(prev => ({ 
        ...prev, 
        edit: 'You can only edit tracks you uploaded.' 
      }));
      return;
    }

    setEditingTrack(track.id);
    setEditForm({ 
      title: track.title, 
      artist: track.artist || '', 
      album: track.album || '' 
    });
    setErrors(prev => ({ ...prev, edit: null }));
  };

  const cancelEdit = () => {
    setEditingTrack(null);
    setEditForm({ title: '', artist: '', album: '' });
    setErrors(prev => ({ ...prev, edit: null }));
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) {
      setErrors(prev => ({ 
        ...prev, 
        edit: 'Please provide a valid title (required).' 
      }));
      return;
    }

    try {
      const { error } = await supabase
        .from('music_tracks')
        .update({ 
          title: editForm.title.trim(),
          artist: editForm.artist.trim() || null,
          album: editForm.album.trim() || null
        })
        .eq('id', editingTrack)
        .eq('business_id', auth.selectedBusinessId);

      if (error) throw error;

      setTracks(prev => prev.map(t => 
        t.id === editingTrack ? { 
          ...t, 
          title: editForm.title.trim(), 
          artist: editForm.artist.trim() || null,
          album: editForm.album.trim() || null
        } : t
      ));

      await safeSecurityLog('track_edited', {
        track_id: editingTrack,
        changes: editForm,
        edited_by: auth.authUser.id
      }, 'medium');

      cancelEdit();

    } catch (error) {
      console.error('Error updating track:', error);
      setErrors(prev => ({ 
        ...prev, 
        edit: `Failed to update track: ${error.message}` 
      }));
    }
  };

  /**
   * Delete track with proper playlist cleanup
   */
  const deleteTrack = async (track) => {
    if (!auth.hasRole(['manager', 'owner']) && track.uploaded_by !== auth.authUser.id) {
      setErrors(prev => ({ 
        ...prev, 
        delete: 'You can only delete tracks you uploaded.' 
      }));
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${track.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      // First, remove track from all playlists to avoid foreign key constraint
      const { error: playlistError } = await supabase
        .from('music_playlist_tracks')
        .delete()
        .eq('track_id', track.id);

      if (playlistError) {
        console.warn('Failed to remove track from playlists:', playlistError);
        // Continue anyway - this might not be critical
      }

      // Delete file from storage (optional)
      try {
        await supabase.storage
          .from('music-files')
          .remove([track.file_path]);
      } catch (storageError) {
        console.warn('Storage deletion warning:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('music_tracks')
        .delete()
        .eq('id', track.id)
        .eq('business_id', auth.selectedBusinessId);

      if (dbError) throw dbError;

      setTracks(prev => prev.filter(t => t.id !== track.id));

      await safeSecurityLog('track_deleted', {
        track_id: track.id,
        track_title: track.title,
        deleted_by: auth.authUser.id
      }, 'medium');

      setErrors(prev => ({ ...prev, delete: null }));

    } catch (error) {
      console.error('Error deleting track:', error);
      setErrors(prev => ({ 
        ...prev, 
        delete: `Failed to delete track: ${error.message}` 
      }));
    }
  };

  // Duplicate detection functions
  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const findDuplicates = useCallback(() => {
    const duplicateGroups = [];
    const processed = new Set();

    tracks.forEach((track, index) => {
      if (processed.has(track.id)) return;

      const duplicatesOfThisTrack = [track];
      
      tracks.forEach((otherTrack, otherIndex) => {
        if (index !== otherIndex && !processed.has(otherTrack.id)) {
          let isDuplicate = false;

          switch (duplicateMethod) {
            case 'exact':
              isDuplicate = 
                track.title.toLowerCase().trim() === otherTrack.title.toLowerCase().trim() &&
                (track.artist || '').toLowerCase().trim() === (otherTrack.artist || '').toLowerCase().trim();
              break;
              
            case 'similar':
              const similarity = calculateSimilarity(track.title, otherTrack.title);
              isDuplicate = similarity > 0.85 &&
                (track.artist || '').toLowerCase().trim() === (otherTrack.artist || '').toLowerCase().trim();
              break;
              
            case 'duration':
              const durationMatch = Math.abs((track.duration || 0) - (otherTrack.duration || 0)) <= 2;
              const titleSimilarity = calculateSimilarity(track.title, otherTrack.title);
              isDuplicate = durationMatch && titleSimilarity > 0.7;
              break;
              
            default:
              isDuplicate = false;
          }

          if (isDuplicate) {
            duplicatesOfThisTrack.push(otherTrack);
          }
        }
      });

      if (duplicatesOfThisTrack.length > 1) {
        duplicatesOfThisTrack.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
        duplicateGroups.push(duplicatesOfThisTrack);
        duplicatesOfThisTrack.forEach(track => processed.add(track.id));
      }
    });

    setDuplicates(duplicateGroups);
    
    // Safe security logging
    safeSecurityLog('duplicates_detected', {
      method: duplicateMethod,
      groups_found: duplicateGroups.length,
      total_duplicates: duplicateGroups.reduce((sum, group) => sum + group.length, 0)
    }, 'low');

  }, [tracks, duplicateMethod]);

  /**
   * Remove duplicates with proper constraint handling
   */
  const removeDuplicates = async (group, keepIndex) => {
    if (!window.confirm(`Remove ${group.length - 1} duplicate(s) of "${group[0].title}"?`)) {
      return;
    }

    setRemovingDuplicates(true);
    
    try {
      const tracksToRemove = group.filter((_, index) => index !== keepIndex);
      const trackIds = tracksToRemove.map(track => track.id);
      const filePaths = tracksToRemove.map(track => track.file_path);

      // Remove tracks from playlists first to avoid foreign key constraints
      const { error: playlistError } = await supabase
        .from('music_playlist_tracks')
        .delete()
        .in('track_id', trackIds);

      if (playlistError) {
        console.warn('Failed to remove tracks from playlists:', playlistError);
        // Continue anyway - might not be critical
      }

      // Delete files from storage (optional)
      try {
        if (filePaths.length > 0) {
          await supabase.storage
            .from('music-files')
            .remove(filePaths);
        }
      } catch (storageError) {
        console.warn('Storage deletion warning:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('music_tracks')
        .delete()
        .in('id', trackIds)
        .eq('business_id', auth.selectedBusinessId);

      if (dbError) throw dbError;

      setTracks(prev => prev.filter(t => !trackIds.includes(t.id)));
      setDuplicates(prev => prev.filter(g => g !== group));

      await safeSecurityLog('duplicates_removed', {
        removed_count: tracksToRemove.length,
        kept_track: group[keepIndex].title,
        removed_tracks: tracksToRemove.map(t => ({ id: t.id, title: t.title }))
      }, 'medium');

      setErrors(prev => ({ ...prev, duplicates: null }));

    } catch (error) {
      console.error('Error removing duplicates:', error);
      setErrors(prev => ({ 
        ...prev, 
        duplicates: `Failed to remove duplicates: ${error.message}` 
      }));
    } finally {
      setRemovingDuplicates(false);
    }
  };

  /**
   * Auto-remove duplicates with proper constraint handling
   */
  const autoRemoveDuplicates = async () => {
    if (duplicates.length === 0) return;
    
    const totalDuplicates = duplicates.reduce((sum, group) => sum + group.length - 1, 0);
    
    if (!window.confirm(
      `Auto-remove ${totalDuplicates} duplicate tracks? This will keep the oldest version of each duplicate group. This action cannot be undone.`
    )) {
      return;
    }

    setRemovingDuplicates(true);
    
    try {
      let allTracksToRemove = [];
      let allFilesToRemove = [];

      duplicates.forEach(group => {
        const tracksToRemove = group.slice(1); // Keep the first (oldest)
        allTracksToRemove.push(...tracksToRemove.map(t => t.id));
        allFilesToRemove.push(...tracksToRemove.map(t => t.file_path));
      });

      // Remove tracks from playlists first to avoid foreign key constraints
      if (allTracksToRemove.length > 0) {
        const { error: playlistError } = await supabase
          .from('music_playlist_tracks')
          .delete()
          .in('track_id', allTracksToRemove);

        if (playlistError) {
          console.warn('Failed to remove tracks from playlists:', playlistError);
          // Continue anyway - might not be critical
        }
      }

      // Delete files from storage (optional)
      try {
        if (allFilesToRemove.length > 0) {
          await supabase.storage
            .from('music-files')
            .remove(allFilesToRemove);
        }
      } catch (storageError) {
        console.warn('Storage deletion warning:', storageError);
      }

      // Delete from database in batches
      const batchSize = 50; // Smaller batches for better reliability
      for (let i = 0; i < allTracksToRemove.length; i += batchSize) {
        const batch = allTracksToRemove.slice(i, i + batchSize);
        
        const { error: dbError } = await supabase
          .from('music_tracks')
          .delete()
          .in('id', batch)
          .eq('business_id', auth.selectedBusinessId);

        if (dbError) {
          console.error(`Error deleting batch ${i / batchSize + 1}:`, dbError);
          throw dbError;
        }
      }

      setTracks(prev => prev.filter(t => !allTracksToRemove.includes(t.id)));
      setDuplicates([]);
      setShowDuplicates(false);

      await safeSecurityLog('auto_duplicates_removed', {
        removed_count: allTracksToRemove.length,
        groups_processed: duplicates.length,
        method: duplicateMethod
      }, 'medium');

      setErrors(prev => ({ ...prev, duplicates: null }));

    } catch (error) {
      console.error('Error auto-removing duplicates:', error);
      setErrors(prev => ({ 
        ...prev, 
        duplicates: `Failed to auto-remove duplicates: ${error.message}. Some tracks may be referenced in playlists.` 
      }));
    } finally {
      setRemovingDuplicates(false);
    }
  };

  const handleBulkShuffleToggle = async (includeInShuffle) => {
    if (selectedTracks.length === 0) return;

    try {
      const { error } = await supabase
        .from('music_tracks')
        .update({ include_in_shuffle: includeInShuffle })
        .in('id', selectedTracks)
        .eq('business_id', auth.selectedBusinessId);

      if (error) throw error;

      setTracks(prev => prev.map(t => 
        selectedTracks.includes(t.id) ? { ...t, include_in_shuffle: includeInShuffle } : t
      ));

      await safeSecurityLog('tracks_bulk_shuffle_toggled', {
        track_count: selectedTracks.length,
        new_value: includeInShuffle,
        changed_by: auth.authUser.id
      }, 'medium');

      setSelectedTracks([]);
      setBulkEditMode(false);

    } catch (error) {
      console.error('Error bulk updating tracks:', error);
      setErrors(prev => ({ 
        ...prev, 
        bulk: `Failed to update tracks: ${error.message}` 
      }));
    }
  };

  // Utility functions
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '--';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const styles = {
    container: {
      ...TavariStyles.layout.container,
      maxWidth: '1400px',
      margin: '0 auto'
    },

    loading: {
      ...TavariStyles.layout.flexCenter,
      minHeight: '400px',
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },

    errorBanner: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.lg
    },

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

    controls: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.xl
    },

    controlsHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: TavariStyles.spacing.lg
    },

    bulkActions: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center'
    },

    searchSection: {
      marginBottom: TavariStyles.spacing.lg
    },

    searchBox: {
      position: 'relative',
      maxWidth: '500px',
      margin: '0 auto'
    },

    searchIcon: {
      position: 'absolute',
      left: TavariStyles.spacing.md,
      top: '50%',
      transform: 'translateY(-50%)',
      color: TavariStyles.colors.gray500
    },

    searchInput: {
      ...TavariStyles.components.form.input,
      paddingLeft: TavariStyles.spacing['4xl'],
      width: '100%'
    },

    filtersRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg
    },

    filterSelect: {
      ...TavariStyles.components.form.select
    },

    advancedFilters: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      marginTop: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50
    },

    advancedFiltersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md
    },

    filterInput: {
      ...TavariStyles.components.form.input
    },

    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.xl,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md
    },

    statItem: {
      textAlign: 'center',
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },

    statNumber: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      display: 'block'
    },

    trackList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.md
    },

    trackItem: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      transition: TavariStyles.transitions.normal
    },

    trackMain: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: TavariStyles.spacing.lg
    },

    trackInfo: {
      flex: 1,
      minWidth: '250px'
    },

    trackTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },

    trackArtist: {
      fontSize: TavariStyles.typography.fontSize.md,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xs,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },

    trackMeta: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs,
      flexWrap: 'wrap'
    },

    editForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.md
    },

    editInput: {
      ...TavariStyles.components.form.input
    },

    editActions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },

    saveButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.success,
      ...TavariStyles.components.button.sizes.sm
    },

    cancelButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.sm
    },

    trackControls: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: TavariStyles.spacing.md
    },

    shuffleToggle: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      cursor: 'pointer',
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.md,
      transition: TavariStyles.transitions.normal
    },

    toggleLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },

    trackActions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },

    actionButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.sm,
      minWidth: 'auto',
      padding: TavariStyles.spacing.sm
    },

    deleteButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.danger,
      ...TavariStyles.components.button.sizes.sm,
      minWidth: 'auto',
      padding: TavariStyles.spacing.sm
    },

    primaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md
    },

    emptyState: {
      textAlign: 'center',
      padding: TavariStyles.spacing['6xl'],
      color: TavariStyles.colors.gray500
    },

    emptyIcon: {
      color: TavariStyles.colors.gray300,
      marginBottom: TavariStyles.spacing.lg
    },

    duplicatesPanel: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      marginTop: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.warningBg,
      border: `2px solid ${TavariStyles.colors.warning}`
    },

    duplicatesHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.lg,
      flexWrap: 'wrap',
      gap: TavariStyles.spacing.md
    },

    duplicateControls: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center',
      flexWrap: 'wrap'
    },

    noDuplicates: {
      textAlign: 'center',
      padding: TavariStyles.spacing['3xl'],
      color: TavariStyles.colors.success
    },

    duplicatesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.lg
    },

    duplicatesCount: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },

    duplicateGroup: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      border: `1px solid ${TavariStyles.colors.gray300}`
    },

    duplicateGroupHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.md,
      paddingBottom: TavariStyles.spacing.sm,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },

    groupInfo: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      backgroundColor: TavariStyles.colors.gray100,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm
    },

    duplicateItems: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },

    duplicateItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      gap: TavariStyles.spacing.md
    },

    duplicateItemInfo: {
      flex: 1,
      minWidth: 0
    },

    duplicateItemHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.xs
    },

    keepLabel: {
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.success,
      backgroundColor: TavariStyles.colors.successBg,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm
    },

    duplicateItemMeta: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      lineHeight: TavariStyles.typography.lineHeight.normal
    },

    duplicateItemActions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    }
  };

  if (loading) {
    return (
      <POSAuthWrapper 
        componentName="MusicLibrary"
        requiredRoles={['employee', 'manager', 'owner']}
      >
        <SecurityWrapper 
          componentName="MusicLibrary"
          sensitiveComponent={false}
        >
          <div style={styles.loading}>Loading Music Library...</div>
        </SecurityWrapper>
      </POSAuthWrapper>
    );
  }

  return (
    <POSAuthWrapper 
      componentName="MusicLibrary"
      requiredRoles={['employee', 'manager', 'owner']}
    >
      <SecurityWrapper 
        componentName="MusicLibrary"
        sensitiveComponent={false}
      >
        <div style={styles.container}>
          {/* Error Messages */}
          {Object.values(errors).some(error => error) && (
            <div style={styles.errorBanner}>
              {Object.values(errors).filter(error => error).join('. ')}
            </div>
          )}

          {/* Header */}
          <div style={styles.header}>
            <FiMusic size={48} style={styles.headerIcon} />
            <h1 style={styles.title}>Music Library</h1>
            <p style={styles.subtitle}>
              {tracks.length} songs in {auth.businessData?.name || 'your business'} library
            </p>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <div style={styles.controlsHeader}>
              <h3>Library Controls</h3>
              <div style={styles.bulkActions}>
                <TavariCheckbox
                  checked={bulkEditMode}
                  onChange={setBulkEditMode}
                  label="Bulk Edit Mode"
                  size="sm"
                />
                <button
                  style={styles.actionButton}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <FiFilter size={16} />
                  Filters
                </button>
                <button
                  style={styles.actionButton}
                  onClick={() => {
                    findDuplicates();
                    setShowDuplicates(!showDuplicates);
                  }}
                >
                  <FiTrash2 size={16} />
                  Find Duplicates
                </button>
                <button
                  style={styles.actionButton}
                  onClick={loadTracks}
                >
                  <FiRefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Search */}
            <div style={styles.searchSection}>
              <div style={styles.searchBox}>
                <FiSearch style={styles.searchIcon} />
                <input
                  style={styles.searchInput}
                  type="text"
                  placeholder="Search by title, artist, or album..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Basic Filters */}
            <div style={styles.filtersRow}>
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

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div style={styles.advancedFilters}>
                <h4>Advanced Filters</h4>
                <div style={styles.advancedFiltersGrid}>
                  <div>
                    <label style={TavariStyles.components.form.label}>Min Duration (seconds)</label>
                    <input
                      style={styles.filterInput}
                      type="number"
                      value={filters.minDuration}
                      onChange={(e) => setFilters(prev => ({ ...prev, minDuration: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label style={TavariStyles.components.form.label}>Max Duration (seconds)</label>
                    <input
                      style={styles.filterInput}
                      type="number"
                      value={filters.maxDuration}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxDuration: e.target.value }))}
                      placeholder="600"
                    />
                  </div>
                  <div>
                    <label style={TavariStyles.components.form.label}>Upload Date From</label>
                    <input
                      style={styles.filterInput}
                      type="date"
                      value={filters.uploadDateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, uploadDateFrom: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={TavariStyles.components.form.label}>Upload Date To</label>
                    <input
                      style={styles.filterInput}
                      type="date"
                      value={filters.uploadDateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, uploadDateTo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={TavariStyles.components.form.label}>Has Artist Info</label>
                    <select
                      style={styles.filterSelect}
                      value={filters.hasArtist}
                      onChange={(e) => setFilters(prev => ({ ...prev, hasArtist: e.target.value }))}
                    >
                      <option value="all">All Tracks</option>
                      <option value="yes">Has Artist</option>
                      <option value="no">Missing Artist</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Duplicate Detection Panel */}
            {showDuplicates && (
              <div style={styles.duplicatesPanel}>
                <div style={styles.duplicatesHeader}>
                  <h4>Duplicate Detection</h4>
                  <div style={styles.duplicateControls}>
                    <select
                      style={styles.filterSelect}
                      value={duplicateMethod}
                      onChange={(e) => {
                        setDuplicateMethod(e.target.value);
                        findDuplicates();
                      }}
                    >
                      <option value="exact">Exact Match (Title + Artist)</option>
                      <option value="similar">Similar Title (85% match)</option>
                      <option value="duration">Duration + Title (70% match)</option>
                    </select>
                    <button
                      style={styles.primaryButton}
                      onClick={findDuplicates}
                      disabled={removingDuplicates}
                    >
                      Scan for Duplicates
                    </button>
                    {duplicates.length > 0 && (
                      <button
                        style={styles.deleteButton}
                        onClick={autoRemoveDuplicates}
                        disabled={removingDuplicates}
                      >
                        {removingDuplicates ? 'Removing...' : 'Auto-Remove All'}
                      </button>
                    )}
                  </div>
                </div>

                {duplicates.length === 0 ? (
                  <div style={styles.noDuplicates}>
                    <FiCheckCircle size={32} color={TavariStyles.colors.success} />
                    <p>No duplicates found using {duplicateMethod} method!</p>
                  </div>
                ) : (
                  <div style={styles.duplicatesList}>
                    <p style={styles.duplicatesCount}>
                      Found {duplicates.length} duplicate group(s) with {duplicates.reduce((sum, group) => sum + group.length, 0)} total tracks
                    </p>
                    
                    {duplicates.map((group, groupIndex) => (
                      <div key={groupIndex} style={styles.duplicateGroup}>
                        <div style={styles.duplicateGroupHeader}>
                          <h5>Duplicate Group {groupIndex + 1}: "{group[0].title}"</h5>
                          <span style={styles.groupInfo}>
                            {group.length} versions found
                          </span>
                        </div>
                        
                        <div style={styles.duplicateItems}>
                          {group.map((track, trackIndex) => (
                            <div key={track.id} style={{
                              ...styles.duplicateItem,
                              backgroundColor: trackIndex === 0 ? TavariStyles.colors.successBg : TavariStyles.colors.gray50
                            }}>
                              <div style={styles.duplicateItemInfo}>
                                <div style={styles.duplicateItemHeader}>
                                  <strong>{track.title}</strong>
                                  {trackIndex === 0 && (
                                    <span style={styles.keepLabel}>KEEP (Oldest)</span>
                                  )}
                                </div>
                                <div style={styles.duplicateItemMeta}>
                                  Artist: {track.artist || 'Unknown'} • 
                                  Duration: {formatDuration(track.duration)} • 
                                  Uploaded: {formatDate(track.uploaded_at)}
                                  {track.file_size && ` • ${formatFileSize(track.file_size)}`}
                                </div>
                              </div>
                              
                              <div style={styles.duplicateItemActions}>
                                <button
                                  style={trackIndex === 0 ? styles.primaryButton : styles.actionButton}
                                  onClick={() => removeDuplicates(group, trackIndex)}
                                  disabled={removingDuplicates}
                                >
                                  {trackIndex === 0 ? 'Keep This' : 'Remove'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bulk Actions */}
            {bulkEditMode && selectedTracks.length > 0 && (
              <div style={{ 
                marginTop: TavariStyles.spacing.lg,
                padding: TavariStyles.spacing.lg,
                backgroundColor: TavariStyles.colors.infoBg,
                borderRadius: TavariStyles.borderRadius.md
              }}>
                <p>{selectedTracks.length} tracks selected</p>
                <div style={{ display: 'flex', gap: TavariStyles.spacing.md }}>
                  <button
                    style={styles.primaryButton}
                    onClick={() => handleBulkShuffleToggle(true)}
                  >
                    Add to Shuffle
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={() => handleBulkShuffleToggle(false)}
                  >
                    Remove from Shuffle
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={() => setSelectedTracks([])}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={styles.stats}>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{filteredTracks.length}</span>
              Showing
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{tracks.filter(t => t.include_in_shuffle).length}</span>
              In Shuffle
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{tracks.filter(t => !t.include_in_shuffle).length}</span>
              Excluded
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{tracks.filter(t => !t.artist).length}</span>
              Missing Artist
            </div>
            {duplicates.length > 0 && (
              <div style={styles.statItem}>
                <span style={{...styles.statNumber, color: TavariStyles.colors.warning}}>
                  {duplicates.reduce((sum, group) => sum + group.length - 1, 0)}
                </span>
                Duplicates Found
              </div>
            )}
          </div>

          {/* Track List */}
          {filteredTracks.length === 0 ? (
            <div style={styles.emptyState}>
              <FiMusic size={48} style={styles.emptyIcon} />
              <h3>No tracks found</h3>
              <p>
                {searchTerm || filterShuffle !== 'all' || showAdvancedFilters
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
                    {/* Bulk selection checkbox */}
                    {bulkEditMode && (
                      <TavariCheckbox
                        checked={selectedTracks.includes(track.id)}
                        onChange={(checked) => {
                          setSelectedTracks(prev => 
                            checked 
                              ? [...prev, track.id]
                              : prev.filter(id => id !== track.id)
                          );
                        }}
                        size="sm"
                      />
                    )}

                    <div style={styles.trackInfo}>
                      {editingTrack === track.id ? (
                        <div style={styles.editForm}>
                          <input
                            style={styles.editInput}
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                            placeholder="Song title *"
                          />
                          <input
                            style={styles.editInput}
                            type="text"
                            value={editForm.artist}
                            onChange={(e) => setEditForm({...editForm, artist: e.target.value})}
                            placeholder="Artist name"
                          />
                          <input
                            style={styles.editInput}
                            type="text"
                            value={editForm.album}
                            onChange={(e) => setEditForm({...editForm, album: e.target.value})}
                            placeholder="Album name"
                          />
                          <div style={styles.editActions}>
                            <button style={styles.saveButton} onClick={saveEdit}>
                              Save Changes
                            </button>
                            <button style={styles.cancelButton} onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 style={styles.trackTitle}>{track.title}</h3>
                          <p style={styles.trackArtist}>
                            <FiUser size={14} />
                            {track.artist || 'Unknown Artist'}
                          </p>
                          {track.album && (
                            <p style={styles.trackArtist}>
                              <FiMusic size={14} />
                              {track.album}
                            </p>
                          )}
                          <p style={styles.trackMeta}>
                            <FiClock size={14} />
                            {formatDuration(track.duration)}
                            <span>•</span>
                            Uploaded {formatDate(track.uploaded_at)}
                            {track.file_size && (
                              <>
                                <span>•</span>
                                {formatFileSize(track.file_size)}
                              </>
                            )}
                          </p>
                        </>
                      )}
                    </div>

                    <div style={styles.trackControls}>
                      <div 
                        style={{
                          ...styles.shuffleToggle,
                          opacity: editingTrack === track.id ? 0.5 : 1,
                          backgroundColor: track.include_in_shuffle ? TavariStyles.colors.successBg : TavariStyles.colors.gray100
                        }} 
                        onClick={() => editingTrack !== track.id && toggleShuffle(track)}
                      >
                        {track.include_in_shuffle ? (
                          <FiToggleRight size={24} color={TavariStyles.colors.success} />
                        ) : (
                          <FiToggleLeft size={24} color={TavariStyles.colors.gray500} />
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
                          title="Edit Track Info"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => deleteTrack(track)}
                          title="Delete Track"
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
      </SecurityWrapper>
    </POSAuthWrapper>
  );
};

export default MusicLibrary;