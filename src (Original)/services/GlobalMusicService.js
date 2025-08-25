// src/services/GlobalMusicService.js - Updated for Enhanced Playlist System

class GlobalMusicService {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.volume = 0.8;
    this.playedIndices = new Set();
    this.businessId = null;
    this.listeners = new Set();
    this.isInitialized = false;
    
    // Enhanced playlist settings
    this.currentPlaylist = null; // Full playlist object with type info
    this.defaultShufflePlaylistId = null; // Cache default shuffle playlist ID
    this.scheduledPlaylist = null;
    
    // Auto-transition settings
    this.autoTransition = true;
    this.currentSchedule = null;
    
    console.log('🎵 Enhanced GlobalMusicService created');
  }

  // Initialize the service
  async initialize(businessId) {
    if (this.isInitialized && this.businessId === businessId) {
      console.log('🎵 Service already initialized for this business');
      return;
    }

    console.log('🎵 Initializing Enhanced GlobalMusicService for business:', businessId);
    this.businessId = businessId;
    
    // Create single audio instance
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.volume = this.volume;
      this.setupAudioEvents();
    }

    // Find or create default shuffle playlist
    await this.ensureDefaultShufflePlaylist();
    
    // Load current playlist based on schedule or default to shuffle
    await this.loadCurrentPlaylist();
    
    this.isInitialized = true;
    
    // Auto-start music if we have tracks
    if (this.playlist.length > 0) {
      console.log('🎵 Auto-starting music in 2 seconds...');
      setTimeout(() => {
        this.play();
      }, 2000);
    }
    
    this.notifyListeners();
  }

  setupAudioEvents() {
    this.audio.addEventListener('ended', () => {
      console.log('🎵 Track ended');
      if (this.autoTransition) {
        this.next();
      } else {
        this.isPlaying = false;
        this.notifyListeners();
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      this.notifyListeners();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.notifyListeners();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('🎵 Audio error:', e);
      this.next(); // Skip to next track on error
    });

    this.audio.addEventListener('canplay', () => {
      if (this.isPlaying) {
        this.audio.play();
      }
    });
  }

  // Ensure default shuffle playlist exists
  async ensureDefaultShufflePlaylist() {
    try {
      // You'll need to import supabase here
      const { supabase } = await import('../supabaseClient');
      
      const { data: shufflePlaylist, error } = await supabase
        .from('music_playlists')
        .select('id')
        .eq('business_id', this.businessId)
        .eq('playlist_type', 'shuffle')
        .eq('auto_generated', true)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (shufflePlaylist) {
        this.defaultShufflePlaylistId = shufflePlaylist.id;
        console.log('🎵 Found default shuffle playlist:', shufflePlaylist.id);
      } else {
        // Create default shuffle playlist
        const { data: newPlaylist, error: createError } = await supabase
          .from('music_playlists')
          .insert({
            name: 'Default Shuffle',
            description: 'Automatically includes all tracks marked for shuffle',
            business_id: this.businessId,
            playlist_type: 'shuffle',
            shuffle_include_new_uploads: true,
            color_code: '#10B981',
            auto_generated: true
          })
          .select('id')
          .single();

        if (createError) throw createError;
        
        this.defaultShufflePlaylistId = newPlaylist.id;
        console.log('🎵 Created default shuffle playlist:', newPlaylist.id);
      }
    } catch (error) {
      console.error('🎵 Error ensuring default shuffle playlist:', error);
    }
  }

  // Load current playlist based on schedule or default to shuffle
  async loadCurrentPlaylist() {
    try {
      // Check for active scheduled playlists first
      const activePlaylist = await this.getActiveScheduledPlaylist();
      
      if (activePlaylist) {
        console.log('🎵 Loading scheduled playlist:', activePlaylist.name);
        await this.loadPlaylist(activePlaylist.id);
      } else {
        console.log('🎵 No active schedule, loading default shuffle playlist');
        await this.loadPlaylist(this.defaultShufflePlaylistId);
      }
    } catch (error) {
      console.error('🎵 Error loading current playlist:', error);
    }
  }

  // Get currently active scheduled playlist
  async getActiveScheduledPlaylist() {
    try {
      const { supabase } = await import('../supabaseClient');
      
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDate = now.toISOString().split('T')[0];

      const { data: schedules, error } = await supabase
        .from('music_schedule_calendar')
        .select('*')
        .eq('business_id', this.businessId)
        .eq('active', true)
        .or(`schedule_date.eq.${currentDate},day_of_week.eq.${currentDay},day_of_week.is.null`)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime)
        .order('priority', { ascending: false });

      if (error) throw error;

      if (schedules && schedules.length > 0) {
        // Return the highest priority schedule
        const schedule = schedules[0];
        this.currentSchedule = schedule;
        return {
          id: schedule.playlist_id,
          name: schedule.playlist_name,
          type: schedule.playlist_type,
          color: schedule.color_code,
          settings: {
            loop_playlist: schedule.loop_playlist,
            stop_when_complete: schedule.stop_when_complete,
            immediate_switch: schedule.immediate_switch
          }
        };
      }

      this.currentSchedule = null;
      return null;
    } catch (error) {
      console.error('🎵 Error getting active scheduled playlist:', error);
      return null;
    }
  }

  // Load specific playlist by ID
  async loadPlaylist(playlistId) {
    try {
      if (!playlistId) {
        console.error('🎵 No playlist ID provided');
        return;
      }

      const { supabase } = await import('../supabaseClient');

      // Get playlist info
      const { data: playlistInfo, error: playlistError } = await supabase
        .from('music_playlists')
        .select('*')
        .eq('id', playlistId)
        .single();

      if (playlistError) throw playlistError;

      this.currentPlaylist = playlistInfo;
      console.log('🎵 Loading playlist:', playlistInfo.name, '(Type:', playlistInfo.playlist_type + ')');

      if (playlistInfo.playlist_type === 'shuffle') {
        await this.loadShufflePlaylist(playlistId);
      } else {
        await this.loadOrderedPlaylist(playlistId);
      }

      // Reset playback state
      this.playedIndices.clear();
      this.currentIndex = 0;
      
      // Select first track
      if (this.playlist.length > 0) {
        this.selectTrack(0);
      }
      
      this.notifyListeners();
      
    } catch (error) {
      console.error('🎵 Error loading playlist:', error);
    }
  }

  // Load shuffle playlist (dynamically generated from rules)
  async loadShufflePlaylist(playlistId) {
    try {
      const { supabase } = await import('../supabaseClient');
      
      // Get tracks using the database function
      const { data: tracks, error } = await supabase
        .rpc('get_shuffle_playlist_tracks', { playlist_uuid: playlistId });

      if (error) throw error;

      this.playlist = tracks || [];
      console.log('🎵 Loaded shuffle playlist with', this.playlist.length, 'tracks');
      
    } catch (error) {
      console.error('🎵 Error loading shuffle playlist:', error);
      // Fallback to all shuffle tracks
      await this.loadAllShuffleTracks();
    }
  }

  // Load ordered playlist (specific track order)
  async loadOrderedPlaylist(playlistId) {
    try {
      const { supabase } = await import('../supabaseClient');
      
      const { data: playlistTracks, error } = await supabase
        .from('music_playlist_tracks')
        .select(`
          sort_order,
          music_tracks (*)
        `)
        .eq('playlist_id', playlistId)
        .order('sort_order');

      if (error) throw error;

      this.playlist = playlistTracks.map(pt => pt.music_tracks);
      console.log('🎵 Loaded ordered playlist with', this.playlist.length, 'tracks');
      
    } catch (error) {
      console.error('🎵 Error loading ordered playlist:', error);
    }
  }

  // Fallback method to load all shuffle tracks
  async loadAllShuffleTracks() {
    try {
      const { supabase } = await import('../supabaseClient');
      
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('business_id', this.businessId)
        .eq('include_in_shuffle', true)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      this.playlist = data || [];
      console.log('🎵 Fallback: Loaded', this.playlist.length, 'shuffle tracks');
      
    } catch (error) {
      console.error('🎵 Error loading fallback shuffle tracks:', error);
    }
  }

  // Select specific track
  selectTrack(index) {
    if (index >= 0 && index < this.playlist.length) {
      this.currentIndex = index;
      this.currentTrack = this.playlist[index];
      console.log('🎵 Selected track', index + 1, 'of', this.playlist.length, ':', this.currentTrack.title);
      
      // Mark as played if it's a shuffle playlist
      if (this.currentPlaylist?.playlist_type === 'shuffle') {
        this.playedIndices.add(index);
      }
    } else {
      console.error('🎵 Invalid track index:', index, 'playlist length:', this.playlist.length);
    }
  }

  // Get next track index for shuffle playlists
  getNextShuffleIndex() {
    if (this.playlist.length === 0) {
      console.log('🎵 No tracks in shuffle playlist');
      return -1;
    }
    
    // Get random unplayed track
    const unplayedIndices = [];
    for (let i = 0; i < this.playlist.length; i++) {
      if (!this.playedIndices.has(i)) {
        unplayedIndices.push(i);
      }
    }
    
    if (unplayedIndices.length === 0) {
      // All tracks played, reset
      console.log('🎵 All shuffle tracks played, resetting');
      this.playedIndices.clear();
      for (let i = 0; i < this.playlist.length; i++) {
        unplayedIndices.push(i);
      }
    }
    
    const selectedIndex = unplayedIndices[Math.floor(Math.random() * unplayedIndices.length)];
    console.log('🎵 Shuffle selected index:', selectedIndex, 'from', unplayedIndices.length, 'available');
    return selectedIndex;
  }

  // Play current track
  async play() {
    if (!this.currentTrack) {
      console.log('🎵 No track selected, selecting first track');
      if (this.playlist.length > 0) {
        this.selectTrack(0);
      } else {
        console.log('🎵 No tracks available to play');
        return;
      }
    }

    try {
      console.log('🎵 PLAYING:', this.currentTrack.title, '(Track', this.currentIndex + 1, 'of', this.playlist.length + ')');
      
      const { supabase } = await import('../supabaseClient');
      
      // Get audio URL
      const { data: urlData, error } = await supabase.storage
        .from('music-files')
        .createSignedUrl(this.currentTrack.file_path, 3600);

      if (error || !urlData?.signedUrl) {
        throw new Error('Failed to get audio URL');
      }

      // Load and play
      this.audio.src = urlData.signedUrl;
      this.audio.volume = this.volume;
      
      await this.audio.play();
      this.isPlaying = true;
      
      this.notifyListeners();
      
    } catch (error) {
      console.error('🎵 Error playing track:', error);
      this.next(); // Try next track
    }
  }

  // Pause
  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.notifyListeners();
    console.log('🎵 Paused');
  }

  // Toggle play/pause
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  // Next track - simplified logic for unified playlist system
  async next() {
    console.log('🎵 Next track requested - current playlist:', this.currentPlaylist?.name);

    // Check if we need to switch playlists based on schedule
    const activePlaylist = await this.getActiveScheduledPlaylist();
    
    if (activePlaylist && activePlaylist.id !== this.currentPlaylist?.id) {
      console.log('🎵 Schedule change detected, switching to:', activePlaylist.name);
      const wasPlaying = this.isPlaying;
      await this.loadPlaylist(activePlaylist.id);
      if (wasPlaying) {
        this.play();
      }
      return;
    }

    if (!activePlaylist && this.currentPlaylist?.id !== this.defaultShufflePlaylistId) {
      console.log('🎵 No active schedule, switching to default shuffle');
      const wasPlaying = this.isPlaying;
      await this.loadPlaylist(this.defaultShufflePlaylistId);
      if (wasPlaying) {
        this.play();
      }
      return;
    }

    // Handle next track within current playlist
    if (this.currentPlaylist?.playlist_type === 'shuffle') {
      // Shuffle playlist - get random next track
      const nextIndex = this.getNextShuffleIndex();
      if (nextIndex >= 0) {
        this.selectTrack(nextIndex);
        this.play();
      }
    } else {
      // Ordered playlist - sequential play
      const nextIndex = this.currentIndex + 1;
      
      if (nextIndex >= this.playlist.length) {
        // End of playlist reached
        const schedule = this.currentSchedule;
        
        if (schedule?.stop_when_complete) {
          console.log('🎵 Stop when complete enabled - pausing');
          this.pause();
          return;
        }
        
        if (schedule?.loop_playlist) {
          console.log('🎵 Looping playlist');
          this.selectTrack(0);
          this.play();
          return;
        }
        
        // No loop, switch to default shuffle
        console.log('🎵 Playlist ended, switching to default shuffle');
        await this.loadPlaylist(this.defaultShufflePlaylistId);
        this.play();
        return;
      }
      
      // Normal next track
      this.selectTrack(nextIndex);
      this.play();
    }
  }

  // Previous track (for manual control)
  previous() {
    if (this.currentPlaylist?.playlist_type === 'shuffle') {
      // For shuffle, just pick another random track
      const nextIndex = this.getNextShuffleIndex();
      if (nextIndex >= 0) {
        this.selectTrack(nextIndex);
        this.play();
      }
    } else {
      // For ordered playlists, go to previous track
      let prevIndex = this.currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = this.playlist.length - 1;
      }
      this.selectTrack(prevIndex);
      this.play();
    }
  }

  // Set volume
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    this.notifyListeners();
  }

  // Switch to specific playlist
  async switchToPlaylist(playlistId) {
    console.log('🎵 Manual switch to playlist:', playlistId);
    this.pause();
    await this.loadPlaylist(playlistId);
    this.play();
  }

  // Force switch to shuffle mode (bypass all schedules)
  async switchToShuffle() {
    console.log('⏭️ Force switching to shuffle mode');
    
    try {
      // Clear current playlist and schedule
      this.currentPlaylist = null;
      this.currentSchedule = null;
      
      // Load all shuffle tracks directly
      const { supabase } = await import('../supabaseClient');
      
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('business_id', this.businessId)
        .eq('include_in_shuffle', true)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      this.playlist = data || [];
      console.log('🎵 Force loaded', this.playlist.length, 'shuffle tracks');
      
      // Reset playback state
      this.playedIndices.clear();
      this.currentIndex = 0;
      
      // Select and play random track
      if (this.playlist.length > 0) {
        const randomIndex = this.getNextShuffleIndex();
        this.selectTrack(randomIndex);
        this.play();
      }
      
      this.notifyListeners();
      
      // Log the action
      await this.logAction('force_skip_playlist', 'Manually switched to shuffle mode');
      
    } catch (error) {
      console.error('⚠️ Error switching to shuffle:', error);
      throw error;
    }
  }

  // Log action for audit purposes
  async logAction(action, description) {
    try {
      const { supabase } = await import('../supabaseClient');
      
      await supabase.from('music_system_logs').insert({
        business_id: this.businessId,
        log_type: 'service_action',
        message: `GlobalMusicService: ${action}`,
        details: {
          action: action,
          description: description,
          timestamp: new Date().toISOString(),
          playlist: this.currentPlaylist?.name || 'None',
          track: this.currentTrack?.title || 'None'
        },
        logged_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }

  // Get current state
  getState() {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      volume: this.volume,
      currentTime: this.audio ? this.audio.currentTime : 0,
      duration: this.audio ? this.audio.duration : 0,
      playlist: this.playlist,
      currentIndex: this.currentIndex,
      currentPlaylist: this.currentPlaylist,
      playedCount: this.playedIndices.size,
      totalTracks: this.playlist.length,
      currentSchedule: this.currentSchedule,
      shuffleMode: this.currentPlaylist?.playlist_type === 'shuffle'
    };
  }

  // Add listener for state changes
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('🎵 Error in listener callback:', error);
      }
    });
  }

  // Check schedules periodically
  startScheduleMonitoring() {
    // Check every 30 seconds for schedule changes
    setInterval(async () => {
      const activePlaylist = await this.getActiveScheduledPlaylist();
      
      // Only switch if playlist actually changed
      if (activePlaylist && activePlaylist.id !== this.currentPlaylist?.id) {
        console.log('🎵 Schedule monitor: Switching to', activePlaylist.name);
        const wasPlaying = this.isPlaying;
        await this.loadPlaylist(activePlaylist.id);
        if (wasPlaying) {
          this.play();
        }
      } else if (!activePlaylist && this.currentPlaylist?.id !== this.defaultShufflePlaylistId) {
        console.log('🎵 Schedule monitor: No active schedule, switching to default shuffle');
        const wasPlaying = this.isPlaying;
        await this.loadPlaylist(this.defaultShufflePlaylistId);
        if (wasPlaying) {
          this.play();
        }
      }
    }, 30000);
    
    console.log('🎵 Schedule monitoring started (30s intervals)');
  }

  // Cleanup
  destroy() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
    console.log('🎵 Enhanced GlobalMusicService destroyed');
  }
}

// Create singleton instance
export const globalMusicService = new GlobalMusicService();

// Auto-initialize when business context is available
if (typeof window !== 'undefined') {
  window.globalMusicService = globalMusicService;
}