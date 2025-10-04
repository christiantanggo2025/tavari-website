// hooks/useAuditLog.js - Centralized Audit Logging Hook with Timezone Support
import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useBusiness } from '../contexts/BusinessContext';

/**
 * Centralized audit logging hook for consistent logging across all Tavari modules
 * Automatically includes business context, user context, and timezone-aware timestamps
 * 
 * @returns {Object} Audit logging functions
 */
export const useAuditLog = () => {
  const { business } = useBusiness();
  const selectedBusinessId = business?.id;
  const [businessTimezone, setBusinessTimezone] = useState('UTC');

  // Load business timezone when business changes
  useEffect(() => {
    const loadBusinessTimezone = async () => {
      if (selectedBusinessId) {
        try {
          const { data, error } = await supabase
            .from('businesses')
            .select('timezone')
            .eq('id', selectedBusinessId)
            .single();

          if (data?.timezone && !error) {
            setBusinessTimezone(data.timezone);
            console.log(`Audit log timezone set to: ${data.timezone}`);
          } else {
            setBusinessTimezone('UTC');
            console.warn('Could not load business timezone, using UTC');
          }
        } catch (err) {
          console.error('Error loading business timezone:', err);
          setBusinessTimezone('UTC');
        }
      }
    };

    loadBusinessTimezone();
  }, [selectedBusinessId]);

  /**
   * Convert timestamp to business timezone
   */
  const getBusinessTimestamp = useCallback(() => {
    try {
      const now = new Date();
      // Convert to business timezone
      const businessTime = new Intl.DateTimeFormat('en-CA', {
        timeZone: businessTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(now);

      // Build ISO string in business timezone
      const year = businessTime.find(part => part.type === 'year').value;
      const month = businessTime.find(part => part.type === 'month').value;
      const day = businessTime.find(part => part.type === 'day').value;
      const hour = businessTime.find(part => part.type === 'hour').value;
      const minute = businessTime.find(part => part.type === 'minute').value;
      const second = businessTime.find(part => part.type === 'second').value;

      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    } catch (err) {
      console.error('Error converting to business timezone:', err);
      return new Date().toISOString();
    }
  }, [businessTimezone]);

  /**
   * Map new event types to existing enum values in audit_event_type
   */
  const mapEventType = useCallback((eventType) => {
    // Map specific event patterns to existing enum values
    if (eventType.includes('_accessed') || eventType.includes('settings_access')) {
      return 'user_profile_access';
    }
    if (eventType.includes('_load_start') || eventType.includes('_loaded') || eventType.includes('page_load')) {
      return 'user_profile_access';
    }
    if (eventType.includes('_save') || eventType.includes('_saved') || eventType.includes('settings_save')) {
      return 'user_profile_access';
    }
    if (eventType.includes('_tab_changed') || eventType.includes('tab_change')) {
      return 'user_profile_access';
    }
    if (eventType.includes('_setting_changed') || eventType.includes('settings_change')) {
      return 'user_profile_access';
    }
    if (eventType.startsWith('pos_') || eventType.includes('pos_action')) {
      return 'user_profile_access';
    }
    if (eventType.startsWith('hr_')) {
      return 'user_profile_access';
    }
    if (eventType.startsWith('music_')) {
      return 'user_profile_access';
    }
    if (eventType.startsWith('mail_')) {
      return 'user_profile_access';
    }
    if (eventType.startsWith('auth_')) {
      // Map auth events to existing enum values
      if (eventType.includes('login')) return 'login';
      if (eventType.includes('logout')) return 'logout';
      if (eventType.includes('failed_login')) return 'failed_login';
      if (eventType.includes('password_change')) return 'password_change';
      if (eventType.includes('pin_change')) return 'pin_change';
      return 'user_profile_access';
    }
    if (eventType.startsWith('session_')) {
      if (eventType.includes('timeout')) return 'timeout_logout';
      return 'user_profile_access';
    }
    if (eventType.startsWith('security_')) {
      return 'user_profile_access';
    }
    
    // Check if it's already a valid enum value
    const validEnumValues = [
      'login', 'logout', 'failed_login', 'password_change', 'pin_change',
      'pin_login', 'failed_pin_login', 'role_change', 'user_created',
      'phone_change', 'timeout_logout', 'user_profile_access'
    ];
    
    if (validEnumValues.includes(eventType)) {
      return eventType;
    }
    
    // Default to user_profile_access for any unknown event types
    return 'user_profile_access';
  }, []);

  /**
   * Log an audit event with automatic context
   * @param {string} eventType - Type of event (login, logout, create, update, delete, etc.)
   * @param {Object} details - Event-specific details
   * @param {Object} options - Additional options
   * @param {string} options.tableAffected - Table that was affected (optional)
   * @param {string} options.recordId - ID of affected record (optional)
   * @param {boolean} options.requireBusiness - Whether business context is required (default: true)
   */
  const logEvent = useCallback(async (eventType, details = {}, options = {}) => {
    try {
      const {
        tableAffected = null,
        recordId = null,
        requireBusiness = true
      } = options;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user for audit log');
        return;
      }

      // Ensure we have business context when required
      if (requireBusiness && !selectedBusinessId) {
        console.warn(`Audit log for ${eventType} requires business context but none available`);
        return; // Don't log if business context is required but missing
      }

      // Map the event type to a valid enum value
      const mappedEventType = mapEventType(eventType);

      // Get timezone-aware timestamp
      const businessTimestamp = getBusinessTimestamp();

      // Prepare audit log entry
      const auditEntry = {
        user_id: user.id,
        event_type: mappedEventType,
        details: {
          original_event_type: eventType, // Store the original event type in details
          business_timezone: businessTimezone,
          ...details,
          timestamp: businessTimestamp,
          user_agent: navigator.userAgent,
          url: window.location.href
        },
        created_at: businessTimestamp
      };

      // ALWAYS add business context when available
      if (selectedBusinessId) {
        auditEntry.business_id = selectedBusinessId;
        console.log(`Logging audit event: ${mappedEventType} for business: ${selectedBusinessId}`);
      } else {
        console.log(`Logging audit event: ${mappedEventType} (global - no business context)`);
      }

      // Add table/record context if provided
      if (tableAffected) {
        auditEntry.details.table_affected = tableAffected;
      }
      if (recordId) {
        auditEntry.details.record_id = recordId;
      }

      // Insert audit log
      const { error } = await supabase
        .from('audit_logs')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to create audit log:', error);
      } else {
        console.log(`✅ Audit log created: ${mappedEventType} (original: ${eventType}) with business_id: ${selectedBusinessId}`);
      }

    } catch (err) {
      console.error('Audit logging error:', err);
      // Don't throw - audit logging should never break the main application flow
    }
  }, [selectedBusinessId, mapEventType, getBusinessTimestamp, businessTimezone]);

  /**
   * Log user authentication events
   */
  const logAuth = useCallback((action, details = {}) => {
    return logEvent(`auth_${action}`, details, { requireBusiness: false });
  }, [logEvent]);

  /**
   * Log data creation events
   */
  const logCreate = useCallback((tableName, recordId, data = {}) => {
    return logEvent('create', { created_data: data }, { 
      tableAffected: tableName, 
      recordId 
    });
  }, [logEvent]);

  /**
   * Log data update events
   */
  const logUpdate = useCallback((tableName, recordId, oldData = {}, newData = {}) => {
    return logEvent('update', { old_data: oldData, new_data: newData }, { 
      tableAffected: tableName, 
      recordId 
    });
  }, [logEvent]);

  /**
   * Log data deletion events
   */
  const logDelete = useCallback((tableName, recordId, deletedData = {}) => {
    return logEvent('delete', { deleted_data: deletedData }, { 
      tableAffected: tableName, 
      recordId 
    });
  }, [logEvent]);

  /**
   * Log POS-specific events
   */
  const logPOS = useCallback((action, details = {}) => {
    return logEvent(`pos_${action}`, details);
  }, [logEvent]);

  /**
   * Log HR-specific events
   */
  const logHR = useCallback((action, details = {}) => {
    return logEvent(`hr_${action}`, details);
  }, [logEvent]);

  /**
   * Log Music-specific events
   */
  const logMusic = useCallback((action, details = {}) => {
    return logEvent(`music_${action}`, details);
  }, [logEvent]);

  /**
   * Log Mail-specific events
   */
  const logMail = useCallback((action, details = {}) => {
    return logEvent(`mail_${action}`, details);
  }, [logEvent]);

  /**
   * Log security events (always logged regardless of business context)
   */
  const logSecurity = useCallback((action, details = {}) => {
    return logEvent(`security_${action}`, details, { requireBusiness: false });
  }, [logEvent]);

  /**
   * Log session events
   */
  const logSession = useCallback((action, details = {}) => {
    return logEvent(`session_${action}`, details, { requireBusiness: false });
  }, [logEvent]);

  /**
   * Log manager override events (important for compliance)
   */
  const logManagerOverride = useCallback((action, reason, details = {}) => {
    return logEvent('manager_override', { 
      action, 
      reason, 
      ...details 
    });
  }, [logEvent]);

  return {
    // Core logging function
    logEvent,
    
    // Authentication events
    logAuth,
    
    // Data operations
    logCreate,
    logUpdate,
    logDelete,
    
    // Module-specific logging
    logPOS,
    logHR,
    logMusic,
    logMail,
    
    // Security & session
    logSecurity,
    logSession,
    logManagerOverride,
    
    // Context information
    hasBusinessContext: !!selectedBusinessId,
    currentBusinessId: selectedBusinessId,
    currentUserId: null, // Will be fetched when needed
    businessTimezone
  };
};

/**
 * Direct audit logging function for use outside of React components
 */
export const createAuditLog = async (eventType, details = {}, businessId = null, userId = null) => {
  try {
    // Get user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    if (!userId) {
      console.warn('Cannot create audit log without user ID');
      return;
    }

    // Get business timezone if business ID provided
    let businessTimezone = 'UTC';
    if (businessId) {
      try {
        const { data } = await supabase
          .from('businesses')
          .select('timezone')
          .eq('id', businessId)
          .single();
        
        if (data?.timezone) {
          businessTimezone = data.timezone;
        }
      } catch (err) {
        console.error('Error loading business timezone for audit log:', err);
      }
    }

    // Convert to business timezone
    const getBusinessTimestamp = (timezone) => {
      try {
        const now = new Date();
        const businessTime = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).formatToParts(now);

        const year = businessTime.find(part => part.type === 'year').value;
        const month = businessTime.find(part => part.type === 'month').value;
        const day = businessTime.find(part => part.type === 'day').value;
        const hour = businessTime.find(part => part.type === 'hour').value;
        const minute = businessTime.find(part => part.type === 'minute').value;
        const second = businessTime.find(part => part.type === 'second').value;

        return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      } catch (err) {
        console.error('Error converting to business timezone:', err);
        return new Date().toISOString();
      }
    };

    // Map event type to valid enum value
    const mapEventType = (eventType) => {
      const validEnumValues = [
        'login', 'logout', 'failed_login', 'password_change', 'pin_change',
        'pin_login', 'failed_pin_login', 'role_change', 'user_created',
        'phone_change', 'timeout_logout', 'user_profile_access'
      ];
      
      if (validEnumValues.includes(eventType)) {
        return eventType;
      }
      
      return 'user_profile_access';
    };

    const businessTimestamp = getBusinessTimestamp(businessTimezone);

    const auditEntry = {
      user_id: userId,
      event_type: mapEventType(eventType),
      details: {
        original_event_type: eventType,
        business_timezone: businessTimezone,
        ...details,
        timestamp: businessTimestamp,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      },
      created_at: businessTimestamp
    };

    if (businessId) {
      auditEntry.business_id = businessId;
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditEntry);

    if (error) {
      console.error('Failed to create audit log:', error);
    }

  } catch (err) {
    console.error('Audit logging error:', err);
  }
};

export default useAuditLog;