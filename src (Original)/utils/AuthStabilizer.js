// src/utils/AuthStabilizer.js - Bulletproof Auth State Management
import { supabase } from '../supabaseClient';

class AuthStabilizer {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.authListeners = [];
    this.retryCount = 0;
    this.maxRetries = 5;
    this.isInitialized = false;
    
    // Start monitoring immediately
    this.initialize();
  }

  async initialize() {
    console.log('🔐 AuthStabilizer: Initializing...');
    
    // Get initial session with retry
    await this.getCurrentUserWithRetry();
    
    // Set up auth state listener
    this.setupAuthListener();
    
    // Set up periodic health check
    this.setupHealthCheck();
    
    this.isInitialized = true;
    console.log('✅ AuthStabilizer: Initialized successfully');
  }

  async getCurrentUserWithRetry(attempt = 1) {
    try {
      console.log(`🔍 AuthStabilizer: Getting user (attempt ${attempt})`);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (session?.user) {
        this.setAuthenticatedUser(session.user);
        return session.user;
      } else {
        this.setUnauthenticatedUser();
        return null;
      }
      
    } catch (error) {
      console.error(`❌ AuthStabilizer: Failed to get user (attempt ${attempt}):`, error);
      
      if (attempt < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`⏳ AuthStabilizer: Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.getCurrentUserWithRetry(attempt + 1);
      } else {
        console.error('🚨 AuthStabilizer: Max retries exceeded');
        this.setUnauthenticatedUser();
        return null;
      }
    }
  }

  setupAuthListener() {
    console.log('👂 AuthStabilizer: Setting up auth listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 AuthStabilizer: Auth state changed - ${event}`, {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id
      });
      
      if (session?.user) {
        this.setAuthenticatedUser(session.user);
      } else {
        this.setUnauthenticatedUser();
      }
      
      // Notify listeners
      this.notifyListeners(event, session);
    });

    // Store subscription for cleanup
    this.authSubscription = subscription;
  }

  setupHealthCheck() {
    // Check auth state every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isAuthenticated) return;
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.warn('⚠️ AuthStabilizer: Health check failed - user lost');
          this.setUnauthenticatedUser();
        } else if (user.id !== this.currentUser?.id) {
          console.log('🔄 AuthStabilizer: User changed during health check');
          this.setAuthenticatedUser(user);
        }
      } catch (error) {
        console.error('❌ AuthStabilizer: Health check error:', error);
      }
    }, 30000);
  }

  setAuthenticatedUser(user) {
    const wasAuthenticated = this.isAuthenticated;
    const previousUserId = this.currentUser?.id;
    
    this.currentUser = user;
    this.isAuthenticated = true;
    this.retryCount = 0;
    
    // Store in localStorage as backup
    localStorage.setItem('tavari_auth_backup', JSON.stringify({
      userId: user.id,
      email: user.email,
      timestamp: Date.now()
    }));
    
    if (!wasAuthenticated || previousUserId !== user.id) {
      console.log('✅ AuthStabilizer: User authenticated:', user.email);
    }
  }

  setUnauthenticatedUser() {
    const wasAuthenticated = this.isAuthenticated;
    
    this.currentUser = null;
    this.isAuthenticated = false;
    
    // Clear backup
    localStorage.removeItem('tavari_auth_backup');
    
    if (wasAuthenticated) {
      console.log('🚪 AuthStabilizer: User signed out');
    }
  }

  // Get current user with fallback
  getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    // Try backup from localStorage
    try {
      const backup = localStorage.getItem('tavari_auth_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        const isRecent = Date.now() - parsed.timestamp < 300000; // 5 minutes
        
        if (isRecent) {
          console.log('📦 AuthStabilizer: Using backup user data');
          return { id: parsed.userId, email: parsed.email };
        }
      }
    } catch (error) {
      console.warn('Failed to parse auth backup:', error);
    }
    
    return null;
  }

  // Get user ID with multiple fallbacks
  getUserId() {
    // Primary: Current user
    if (this.currentUser?.id) {
      return this.currentUser.id;
    }
    
    // Fallback 1: Try to get from Supabase directly
    try {
      const user = supabase.auth.getUser();
      if (user?.data?.user?.id) {
        return user.data.user.id;
      }
    } catch (error) {
      console.warn('Failed to get user from Supabase:', error);
    }
    
    // Fallback 2: localStorage backup
    try {
      const backup = localStorage.getItem('tavari_auth_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        return parsed.userId;
      }
    } catch (error) {
      console.warn('Failed to get user from backup:', error);
    }
    
    return null;
  }

  // Check if user is authenticated with retries
  async isUserAuthenticated() {
    if (this.isAuthenticated && this.currentUser) {
      return true;
    }
    
    // Try to refresh auth state
    const user = await this.getCurrentUserWithRetry();
    return !!user;
  }

  // Add listener for auth state changes
  addAuthListener(callback) {
    this.authListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners
  notifyListeners(event, session) {
    this.authListeners.forEach(callback => {
      try {
        callback(event, session, this.currentUser);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  // Force refresh auth state
  async refreshAuth() {
    console.log('🔄 AuthStabilizer: Force refreshing auth state');
    await this.getCurrentUserWithRetry();
  }

  // Get status for debugging
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAuthenticated: this.isAuthenticated,
      currentUser: this.currentUser ? {
        id: this.currentUser.id,
        email: this.currentUser.email
      } : null,
      retryCount: this.retryCount,
      listenersCount: this.authListeners.length
    };
  }

  // Cleanup
  destroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.authListeners = [];
    console.log('🧹 AuthStabilizer: Destroyed');
  }
}

// Create singleton instance
const authStabilizer = new AuthStabilizer();

// Enhanced Supabase wrapper that ensures auth
export const authAwareSupabase = {
  from: (table) => ({
    select: (columns = '*') => ({
      eq: (column, value) => ({
        single: async () => {
          // Ensure user is authenticated before making request
          const isAuth = await authStabilizer.isUserAuthenticated();
          if (!isAuth) {
            return {
              data: null,
              error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' }
            };
          }
          
          return supabase.from(table).select(columns).eq(column, value).single();
        }
      })
    }),
    
    insert: (data) => ({
      select: () => ({
        single: async () => {
          const isAuth = await authStabilizer.isUserAuthenticated();
          if (!isAuth) {
            return {
              data: null,
              error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' }
            };
          }
          
          // Add user context to data if it has business_id
          const enrichedData = { ...data };
          if (enrichedData.business_id && !enrichedData.created_by) {
            enrichedData.created_by = authStabilizer.getUserId();
          }
          
          return supabase.from(table).insert(enrichedData).select().single();
        }
      })
    }),
    
    update: (data) => ({
      eq: (column, value) => ({
        select: () => ({
          single: async () => {
            const isAuth = await authStabilizer.isUserAuthenticated();
            if (!isAuth) {
              return {
                data: null,
                error: { message: 'User not authenticated', code: 'UNAUTHENTICATED' }
              };
            }
            
            return supabase.from(table).update(data).eq(column, value).select().single();
          }
        })
      })
    })
  }),
  
  // Direct access to auth stabilizer
  auth: authStabilizer
};

export { authStabilizer };
export default authStabilizer;