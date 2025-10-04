// services/PlaylistService.js - Fixed to handle database function field mapping
import { supabase } from '../supabaseClient';

class PlaylistService {
  /**
   * Get a specific playlist by ID
   */
  async getPlaylist(playlistId) {
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .select('*')
        .eq('id', playlistId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching playlist:', error);
      return null;
    }
  }

  /**
   * Get tracks for an ordered playlist in sort_order
   */
  async getPlaylistTracks(playlistId) {
    try {
      const { data, error } = await supabase
        .from('music_playlist_tracks')
        .select(`
          sort_order,
          track:music_tracks(*)
        `)
        .eq('playlist_id', playlistId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Return just the tracks in order
      return data?.map(item => item.track) || [];
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      return [];
    }
  }

  /**
   * Get shuffle tracks using the existing database function
   * FIXED: Handle field mapping from database function
   */
  async getShuffleTracks(playlistId) {
    try {
      console.log('🎵 Using database function get_shuffle_playlist_tracks for playlist:', playlistId);
      
      // Use the existing database function that handles all the shuffle logic
      const { data, error } = await supabase
        .rpc('get_shuffle_playlist_tracks', {
          playlist_uuid: playlistId
        });

      if (error) {
        console.error('🎵 Database function error:', error);
        throw error;
      }

      // FIX: Map the database function results to expected format
      const mappedData = data?.map(track => ({
        id: track.track_id || track.id,  // Handle both field names
        title: track.title,
        artist: track.artist,
        file_path: track.file_path,
        duration: track.duration,
        business_id: track.business_id,
        include_in_shuffle: track.include_in_shuffle
      })) || [];

      console.log(`🎵 Database function returned ${mappedData.length} tracks`);
      return mappedData;
    } catch (error) {
      console.error('Error fetching shuffle tracks with database function:', error);
      
      // Fallback to direct query if database function fails
      console.log('🎵 Falling back to direct query');
      return this.getShuffleTracksFallback(playlistId);
    }
  }

  /**
   * Fallback method for getting shuffle tracks if database function fails
   */
  async getShuffleTracksFallback(playlistId) {
    try {
      // Get the playlist to find the business_id
      const playlist = await this.getPlaylist(playlistId);
      if (!playlist) {
        throw new Error('Playlist not found for fallback shuffle');
      }

      // Direct query as fallback
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('business_id', playlist.business_id)
        .eq('include_in_shuffle', true)
        .order('title');

      if (error) throw error;
      
      console.log(`🎵 Fallback query returned ${data?.length || 0} tracks`);
      return data || [];
    } catch (error) {
      console.error('Error in shuffle tracks fallback:', error);
      return [];
    }
  }

  /**
   * Load playlist based on type (ordered or shuffle)
   */
  async loadPlaylistContent(playlistId) {
    try {
      // Get playlist info
      const playlist = await this.getPlaylist(playlistId);
      
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      let tracks;

      if (playlist.playlist_type === 'shuffle') {
        console.log('🎵 Loading shuffle playlist using database function');
        // For shuffle playlists, use the database function that handles exclusion rules
        tracks = await this.getShuffleTracks(playlistId);
        
        // Shuffle the array
        tracks = this.shuffleArray([...tracks]);
        console.log(`🎵 Shuffled ${tracks.length} tracks`);
      } else {
        console.log('🎵 Loading ordered playlist');
        // For ordered playlists, get tracks in sort_order
        tracks = await this.getPlaylistTracks(playlistId);
        console.log(`🎵 Loaded ${tracks.length} ordered tracks`);
      }

      return {
        playlist,
        tracks
      };
    } catch (error) {
      console.error('Error loading playlist content:', error);
      throw error;
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get the default shuffle playlist for a business
   */
  async getDefaultShufflePlaylist(businessId) {
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .select('*')
        .eq('business_id', businessId)
        .eq('playlist_type', 'shuffle')
        .eq('auto_generated', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching default shuffle playlist:', error);
      return null;
    }
  }

  /**
   * Create default shuffle playlist if it doesn't exist
   * Uses the existing create_default_shuffle_playlist function if available
   */
  async ensureDefaultShufflePlaylist(businessId) {
    try {
      let defaultPlaylist = await this.getDefaultShufflePlaylist(businessId);
      
      if (!defaultPlaylist) {
        console.log('🎵 Creating default shuffle playlist for business:', businessId);
        
        // Try to use the database function first
        try {
          console.log('🎵 Attempting to use database function create_default_shuffle_playlist');
          
          const { data, error } = await supabase
            .rpc('create_default_shuffle_playlist', {
              business_uuid: businessId
            });

          if (error) {
            console.log('🎵 Database function failed, using direct insert');
            throw error;
          }

          // Get the created playlist
          defaultPlaylist = await this.getDefaultShufflePlaylist(businessId);
          console.log('🎵 Default shuffle playlist created via database function');
          
        } catch (funcError) {
          console.log('🎵 Database function not available or failed, using direct insert');
          
          // Fallback to direct insert
          const { data, error } = await supabase
            .from('music_playlists')
            .insert({
              name: 'Default Shuffle',
              description: 'Automatically includes all tracks marked for shuffle',
              business_id: businessId,
              playlist_type: 'shuffle',
              shuffle_include_new_uploads: true,
              auto_generated: true,
              color_code: '#10B981',
              priority: 1
            })
            .select()
            .single();

          if (error) throw error;
          defaultPlaylist = data;
          
          console.log('🎵 Default shuffle playlist created via direct insert');
        }
      }

      return defaultPlaylist;
    } catch (error) {
      console.error('Error ensuring default shuffle playlist:', error);
      throw error;
    }
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(playlistData) {
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .insert(playlistData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Update a playlist
   */
  async updatePlaylist(playlistId, updates) {
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .update(updates)
        .eq('id', playlistId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(playlistId) {
    try {
      // First delete all playlist tracks
      await supabase
        .from('music_playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId);

      // Delete any related schedules
      await supabase
        .from('music_playlist_schedules')
        .delete()
        .eq('playlist_id', playlistId);

      // Then delete the playlist
      const { error } = await supabase
        .from('music_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  /**
   * Add track to playlist
   */
  async addTrackToPlaylist(playlistId, trackId, sortOrder = null) {
    try {
      // If no sort order provided, get the next available order
      if (sortOrder === null) {
        const { data: maxOrderData } = await supabase
          .from('music_playlist_tracks')
          .select('sort_order')
          .eq('playlist_id', playlistId)
          .order('sort_order', { ascending: false })
          .limit(1);

        sortOrder = (maxOrderData?.[0]?.sort_order || 0) + 1;
      }

      const { data, error } = await supabase
        .from('music_playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: trackId,
          sort_order: sortOrder
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      throw error;
    }
  }

  /**
   * Remove track from playlist
   */
  async removeTrackFromPlaylist(playlistId, trackId) {
    try {
      const { error } = await supabase
        .from('music_playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      throw error;
    }
  }

  /**
   * Get all playlists for a business
   */
  async getBusinessPlaylists(businessId) {
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .select(`
          *,
          track_count:music_playlist_tracks(count)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process track counts
      return data?.map(playlist => ({
        ...playlist,
        track_count: playlist.track_count?.[0]?.count || 0
      })) || [];
    } catch (error) {
      console.error('Error fetching business playlists:', error);
      return [];
    }
  }

  /**
   * Reorder tracks in a playlist
   */
  async reorderPlaylistTracks(playlistId, trackIds) {
    try {
      const updates = trackIds.map((trackId, index) => ({
        playlist_id: playlistId,
        track_id: trackId,
        sort_order: index + 1
      }));

      // Delete existing tracks
      await supabase
        .from('music_playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId);

      // Insert with new order
      const { error } = await supabase
        .from('music_playlist_tracks')
        .insert(updates);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error reordering playlist tracks:', error);
      throw error;
    }
  }

  /**
   * Check if a track is in a playlist
   */
  async isTrackInPlaylist(playlistId, trackId) {
    try {
      const { data, error } = await supabase
        .from('music_playlist_tracks')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId)
        .single();

      if (error && error.code === 'PGRST116') {
        return false; // No rows returned
      }
      
      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking if track is in playlist:', error);
      return false;
    }
  }

  /**
   * Get playlist statistics
   */
  async getPlaylistStats(playlistId) {
    try {
      const playlist = await this.getPlaylist(playlistId);
      
      if (!playlist) {
        return {
          trackCount: 0,
          totalDuration: 0,
          formattedDuration: '0:00'
        };
      }

      let tracks;
      if (playlist.playlist_type === 'shuffle') {
        tracks = await this.getShuffleTracks(playlistId);
      } else {
        tracks = await this.getPlaylistTracks(playlistId);
      }

      const trackCount = tracks?.length || 0;
      const totalDuration = tracks?.reduce((sum, track) => {
        return sum + (track?.duration || 0);
      }, 0) || 0;

      return {
        trackCount,
        totalDuration,
        formattedDuration: this.formatDuration(totalDuration)
      };
    } catch (error) {
      console.error('Error getting playlist stats:', error);
      return {
        trackCount: 0,
        totalDuration: 0,
        formattedDuration: '0:00'
      };
    }
  }

  /**
   * Format duration in seconds to MM:SS
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const playlistService = new PlaylistService();
export default playlistService;