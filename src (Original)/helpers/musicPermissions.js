// src/helpers/musicPermissions.js

/**
 * Music Permission Helper
 * Centralizes all music-related permission logic for consistent role-based access
 */

export const MUSIC_ROLES = {
  GUEST: 'guest',
  EMPLOYEE: 'employee', 
  MANAGER: 'manager',
  ADMIN: 'admin'
};

export const MUSIC_PERMISSIONS = {
  // Basic music control permissions
  CONTROL_MUSIC: 'control_music',           // Play/pause music
  SKIP_TRACKS: 'skip_tracks',               // Skip to next track
  
  // Volume and audio permissions  
  CHANGE_VOLUME: 'change_volume',           // Adjust volume levels
  MUTE_AUDIO: 'mute_audio',                 // Mute/unmute audio
  
  // Playlist permissions
  SELECT_PLAYLISTS: 'select_playlists',     // Choose different playlists
  CREATE_PLAYLISTS: 'create_playlists',     // Create new playlists
  EDIT_PLAYLISTS: 'edit_playlists',         // Modify existing playlists
  DELETE_PLAYLISTS: 'delete_playlists',     // Remove playlists
  
  // Library permissions
  VIEW_LIBRARY: 'view_library',             // View music library
  UPLOAD_MUSIC: 'upload_music',             // Add new songs
  EDIT_TRACKS: 'edit_tracks',               // Edit track metadata
  DELETE_TRACKS: 'delete_tracks',           // Remove songs
  
  // Schedule permissions
  VIEW_SCHEDULES: 'view_schedules',         // View playlist schedules
  CREATE_SCHEDULES: 'create_schedules',     // Create new schedules
  EDIT_SCHEDULES: 'edit_schedules',         // Modify schedules
  DELETE_SCHEDULES: 'delete_schedules',     // Remove schedules
  
  // Settings permissions
  VIEW_SETTINGS: 'view_settings',           // View music settings
  EDIT_SETTINGS: 'edit_settings',           // Modify music settings
  MANAGE_ADS: 'manage_ads',                 // Manage ad settings
  
  // System permissions
  VIEW_LOGS: 'view_logs',                   // View system logs
  RESTART_SYSTEM: 'restart_system',         // Restart music system
  ACCESS_MONITOR: 'access_monitor',         // Access system monitor
  
  // Advanced permissions
  OVERRIDE_SCHEDULE: 'override_schedule',   // Override scheduled playlists
  EMERGENCY_STOP: 'emergency_stop',         // Emergency stop all music
};

/**
 * Permission matrix defining what each role can do
 */
const ROLE_PERMISSIONS = {
  [MUSIC_ROLES.GUEST]: [
    // Guests have very limited permissions
  ],
  
  [MUSIC_ROLES.EMPLOYEE]: [
    // Employees can control basic playback
    MUSIC_PERMISSIONS.CONTROL_MUSIC,
    MUSIC_PERMISSIONS.SKIP_TRACKS,
    MUSIC_PERMISSIONS.VIEW_LIBRARY,
    MUSIC_PERMISSIONS.VIEW_SCHEDULES,
  ],
  
  [MUSIC_ROLES.MANAGER]: [
    // Managers inherit employee permissions plus more
    MUSIC_PERMISSIONS.CONTROL_MUSIC,
    MUSIC_PERMISSIONS.SKIP_TRACKS,
    MUSIC_PERMISSIONS.VIEW_LIBRARY,
    MUSIC_PERMISSIONS.VIEW_SCHEDULES,
    MUSIC_PERMISSIONS.CHANGE_VOLUME,
    MUSIC_PERMISSIONS.MUTE_AUDIO,
    MUSIC_PERMISSIONS.SELECT_PLAYLISTS,
    MUSIC_PERMISSIONS.UPLOAD_MUSIC,
    MUSIC_PERMISSIONS.EDIT_TRACKS,
    MUSIC_PERMISSIONS.CREATE_PLAYLISTS,
    MUSIC_PERMISSIONS.EDIT_PLAYLISTS,
    MUSIC_PERMISSIONS.VIEW_SETTINGS,
    MUSIC_PERMISSIONS.OVERRIDE_SCHEDULE,
    MUSIC_PERMISSIONS.ACCESS_MONITOR,
  ],
  
  [MUSIC_ROLES.ADMIN]: [
    // Admins have all permissions
    ...Object.values(MUSIC_PERMISSIONS)
  ]
};

/**
 * Get user's music role based on their profile
 * @param {Object} profile - User profile object
 * @returns {string} - Music role
 */
export const getUserMusicRole = (profile) => {
  if (!profile) {
    console.log('🎵 No profile provided, defaulting to GUEST');
    return MUSIC_ROLES.GUEST;
  }
  
  // Handle both 'role' (string) and 'roles' (array) fields
  let userRole = null;
  
  if (profile.role) {
    userRole = profile.role.toLowerCase();
    console.log('🎵 Found role field:', userRole);
  } else if (profile.roles && Array.isArray(profile.roles) && profile.roles.length > 0) {
    // If roles is an array, take the highest privilege role
    const roleHierarchy = ['admin', 'manager', 'employee', 'staff'];
    userRole = profile.roles.find(role => 
      roleHierarchy.includes(role.toLowerCase())
    )?.toLowerCase();
    console.log('🎵 Found roles array:', profile.roles, 'using:', userRole);
  } else {
    console.log('🎵 Profile structure:', { 
      hasRole: !!profile.role, 
      hasRoles: !!profile.roles, 
      rolesType: typeof profile.roles,
      rolesLength: profile.roles?.length 
    });
  }
  
  if (!userRole) {
    console.log('🎵 No valid role found for user, defaulting to GUEST');
    return MUSIC_ROLES.GUEST;
  }
  
  // Map standard roles to music roles
  switch (userRole) {
    case 'admin':
      console.log('🎵 User mapped to ADMIN role');
      return MUSIC_ROLES.ADMIN;
    case 'manager':
      console.log('🎵 User mapped to MANAGER role');
      return MUSIC_ROLES.MANAGER;
    case 'employee':
    case 'staff':
      console.log('🎵 User mapped to EMPLOYEE role');
      return MUSIC_ROLES.EMPLOYEE;
    default:
      console.log('🎵 Unknown role, defaulting to GUEST:', userRole);
      return MUSIC_ROLES.GUEST;
  }
};

/**
 * Check if user has a specific music permission
 * @param {Object} profile - User profile object
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has permission
 */
export const hasPermission = (profile, permission) => {
  const userRole = getUserMusicRole(profile);
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  const hasIt = rolePermissions.includes(permission);
  
  console.log('🎵 Permission check:', {
    permission,
    userRole,
    hasPermission: hasIt,
    availablePermissions: rolePermissions.length
  });
  
  return hasIt;
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} profile - User profile object  
 * @param {Array} permissions - Array of permissions to check
 * @returns {boolean} - Whether user has any of the permissions
 */
export const hasAnyPermission = (profile, permissions) => {
  return permissions.some(permission => hasPermission(profile, permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {Object} profile - User profile object
 * @param {Array} permissions - Array of permissions to check  
 * @returns {boolean} - Whether user has all permissions
 */
export const hasAllPermissions = (profile, permissions) => {
  return permissions.every(permission => hasPermission(profile, permission));
};

/**
 * Get all permissions for a user
 * @param {Object} profile - User profile object
 * @returns {Array} - Array of user's permissions
 */
export const getUserPermissions = (profile) => {
  const userRole = getUserMusicRole(profile);
  return ROLE_PERMISSIONS[userRole] || [];
};

/**
 * Get permission info for UI display
 * @param {Object} profile - User profile object
 * @returns {Object} - Permission info object
 */
export const getPermissionInfo = (profile) => {
  const userRole = getUserMusicRole(profile);
  const permissions = getUserPermissions(profile);
  
  return {
    role: userRole,
    roleDisplay: getRoleDisplay(userRole),
    permissions: permissions,
    canControlMusic: hasPermission(profile, MUSIC_PERMISSIONS.CONTROL_MUSIC),
    canChangeVolume: hasPermission(profile, MUSIC_PERMISSIONS.CHANGE_VOLUME),
    canSkipTracks: hasPermission(profile, MUSIC_PERMISSIONS.SKIP_TRACKS),
    canSelectPlaylists: hasPermission(profile, MUSIC_PERMISSIONS.SELECT_PLAYLISTS),
    canAccessSettings: hasPermission(profile, MUSIC_PERMISSIONS.EDIT_SETTINGS),
    canUploadMusic: hasPermission(profile, MUSIC_PERMISSIONS.UPLOAD_MUSIC),
    canManagePlaylists: hasPermission(profile, MUSIC_PERMISSIONS.CREATE_PLAYLISTS),
    canViewLogs: hasPermission(profile, MUSIC_PERMISSIONS.VIEW_LOGS),
    canRestartSystem: hasPermission(profile, MUSIC_PERMISSIONS.RESTART_SYSTEM),
  };
};

/**
 * Get display name for role
 * @param {string} role - Music role
 * @returns {string} - Display name with emoji
 */
export const getRoleDisplay = (role) => {
  switch (role) {
    case MUSIC_ROLES.ADMIN:
      return '👑 Admin';
    case MUSIC_ROLES.MANAGER:
      return '🏢 Manager';
    case MUSIC_ROLES.EMPLOYEE:
      return '👤 Staff';
    case MUSIC_ROLES.GUEST:
    default:
      return '❓ Guest';
  }
};

/**
 * Get permission requirements for a specific action
 * @param {string} action - Action to check requirements for
 * @returns {Object} - Requirements info
 */
export const getActionRequirements = (action) => {
  const requirements = {
    play_music: {
      permissions: [MUSIC_PERMISSIONS.CONTROL_MUSIC],
      minRole: MUSIC_ROLES.EMPLOYEE,
      description: 'Control music playback'
    },
    change_volume: {
      permissions: [MUSIC_PERMISSIONS.CHANGE_VOLUME],
      minRole: MUSIC_ROLES.MANAGER,
      description: 'Adjust volume levels'
    },
    select_playlist: {
      permissions: [MUSIC_PERMISSIONS.SELECT_PLAYLISTS],
      minRole: MUSIC_ROLES.MANAGER,
      description: 'Select different playlists'
    },
    upload_music: {
      permissions: [MUSIC_PERMISSIONS.UPLOAD_MUSIC],
      minRole: MUSIC_ROLES.MANAGER,
      description: 'Upload new music files'
    },
    manage_settings: {
      permissions: [MUSIC_PERMISSIONS.EDIT_SETTINGS],
      minRole: MUSIC_ROLES.ADMIN,
      description: 'Modify music system settings'
    },
    restart_system: {
      permissions: [MUSIC_PERMISSIONS.RESTART_SYSTEM],
      minRole: MUSIC_ROLES.ADMIN,
      description: 'Restart the music system'
    }
  };
  
  return requirements[action] || null;
};

/**
 * Log a permission-related action for audit purposes
 * @param {Object} params - Logging parameters
 * @param {Object} params.profile - User profile
 * @param {string} params.action - Action performed
 * @param {string} params.permission - Permission used
 * @param {Object} params.business - Business context
 * @param {Object} params.details - Additional details
 */
export const logPermissionAction = async ({ profile, action, permission, business, details = {} }) => {
  try {
    const { supabase } = await import('../supabaseClient');
    
    await supabase.from('music_system_logs').insert({
      business_id: business.id,
      log_type: 'permission_action',
      message: `Permission Action: ${action}`,
      details: {
        action,
        permission,
        user_id: profile.id,
        user_name: profile.name || profile.email,
        user_role: profile.role || profile.roles,
        music_role: getUserMusicRole(profile),
        timestamp: new Date().toISOString(),
        ...details
      },
      logged_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging permission action:', error);
  }
};

export default {
  MUSIC_ROLES,
  MUSIC_PERMISSIONS,
  getUserMusicRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  getPermissionInfo,
  getRoleDisplay,
  getActionRequirements,
  logPermissionAction
};