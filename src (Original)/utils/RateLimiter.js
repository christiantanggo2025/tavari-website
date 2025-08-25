// src/utils/RateLimiter.js - Emergency Rate Limiting Utility
class RateLimiter {
  constructor() {
    this.requests = new Map(); // Track requests per endpoint
    this.globalRequests = []; // Track all requests globally
    this.maxRequestsPerEndpoint = 5; // Max requests per endpoint per window
    this.maxGlobalRequests = 20; // Max total requests per window
    this.windowMs = 1000; // 1 second window
    this.backoffMs = 5000; // 5 seconds backoff when limit hit
    this.isGloballyLimited = false;
  }

  // Check if a request should be allowed
  canMakeRequest(endpoint) {
    const now = Date.now();
    const key = this.normalizeEndpoint(endpoint);
    
    // Check global rate limit first
    if (this.isGloballyLimited) {
      console.warn('🚫 Global rate limit active - blocking all requests');
      return false;
    }

    // Clean old requests
    this.cleanOldRequests(now);
    
    // Check global limit
    if (this.globalRequests.length >= this.maxGlobalRequests) {
      console.warn('🚫 Global rate limit exceeded:', this.globalRequests.length, 'requests');
      this.activateGlobalLimit();
      return false;
    }

    // Check per-endpoint limit
    const endpointRequests = this.requests.get(key) || [];
    if (endpointRequests.length >= this.maxRequestsPerEndpoint) {
      console.warn('🚫 Endpoint rate limit exceeded for:', key, endpointRequests.length, 'requests');
      return false;
    }

    return true;
  }

  // Record a request
  recordRequest(endpoint) {
    const now = Date.now();
    const key = this.normalizeEndpoint(endpoint);
    
    // Record globally
    this.globalRequests.push(now);
    
    // Record per endpoint
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    this.requests.get(key).push(now);
    
    console.log('📊 Request recorded:', key, '| Global:', this.globalRequests.length, '| Endpoint:', this.requests.get(key).length);
  }

  // Normalize endpoint to track similar requests together
  normalizeEndpoint(url) {
    if (typeof url !== 'string') return 'unknown';
    
    // Extract table name and basic operation
    const match = url.match(/\/rest\/v1\/([^?]+)/);
    if (match) {
      const table = match[1];
      
      // Group similar operations
      if (url.includes('select=id&limit=1')) {
        return `${table}_existence_check`;
      }
      if (url.includes('business_id=')) {
        return `${table}_by_business`;
      }
      if (url.includes('select=*')) {
        return `${table}_full_select`;
      }
      
      return table;
    }
    
    return 'unknown';
  }

  // Clean requests older than the window
  cleanOldRequests(now) {
    const cutoff = now - this.windowMs;
    
    // Clean global requests
    this.globalRequests = this.globalRequests.filter(time => time > cutoff);
    
    // Clean per-endpoint requests
    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter(time => time > cutoff);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }

  // Activate global rate limiting
  activateGlobalLimit() {
    this.isGloballyLimited = true;
    console.error('🚨 EMERGENCY: Global rate limit activated - blocking all requests for', this.backoffMs, 'ms');
    
    setTimeout(() => {
      this.isGloballyLimited = false;
      this.globalRequests = [];
      this.requests.clear();
      console.log('✅ Global rate limit lifted');
    }, this.backoffMs);
  }

  // Get current status for debugging
  getStatus() {
    return {
      globalRequests: this.globalRequests.length,
      endpointCounts: Object.fromEntries(
        Array.from(this.requests.entries()).map(([key, requests]) => [key, requests.length])
      ),
      isLimited: this.isGloballyLimited,
      maxGlobal: this.maxGlobalRequests,
      maxPerEndpoint: this.maxRequestsPerEndpoint
    };
  }

  // Reset all limits (emergency)
  reset() {
    this.globalRequests = [];
    this.requests.clear();
    this.isGloballyLimited = false;
    console.log('🔄 Rate limiter reset');
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Enhanced Supabase wrapper with rate limiting
export const rateLimitedSupabase = {
  from: (table) => ({
    select: (columns = '*') => ({
      eq: (column, value) => ({
        single: async () => {
          const endpoint = `${table}?select=${columns}&${column}=eq.${value}`;
          return rateLimitedSupabase._makeRequest(endpoint, () => 
            window.supabase?.from(table).select(columns).eq(column, value).single()
          );
        },
        limit: (count) => ({
          then: async (callback) => {
            const endpoint = `${table}?select=${columns}&${column}=eq.${value}&limit=${count}`;
            const result = await rateLimitedSupabase._makeRequest(endpoint, () => 
              window.supabase?.from(table).select(columns).eq(column, value).limit(count)
            );
            return callback(result);
          }
        })
      }),
      gte: (column, value) => ({
        lte: (column2, value2) => ({
          then: async (callback) => {
            const endpoint = `${table}?select=${columns}&${column}=gte.${value}&${column2}=lte.${value2}`;
            const result = await rateLimitedSupabase._makeRequest(endpoint, () => 
              window.supabase?.from(table).select(columns).gte(column, value).lte(column2, value2)
            );
            return callback(result);
          }
        })
      }),
      limit: (count) => ({
        then: async (callback) => {
          const endpoint = `${table}?select=${columns}&limit=${count}`;
          const result = await rateLimitedSupabase._makeRequest(endpoint, () => 
            window.supabase?.from(table).select(columns).limit(count)
          );
          return callback(result);
        }
      }),
      then: async (callback) => {
        const endpoint = `${table}?select=${columns}`;
        const result = await rateLimitedSupabase._makeRequest(endpoint, () => 
          window.supabase?.from(table).select(columns)
        );
        return callback(result);
      }
    })
  }),

  _makeRequest: async (endpoint, requestFn) => {
    // Check rate limit
    if (!rateLimiter.canMakeRequest(endpoint)) {
      console.warn('⏳ Request blocked by rate limiter:', endpoint);
      
      // Return cached data or error
      return {
        data: null,
        error: {
          message: 'Rate limited - too many requests',
          code: 'RATE_LIMITED'
        }
      };
    }

    try {
      // Record the request
      rateLimiter.recordRequest(endpoint);
      
      // Make the actual request
      const result = await requestFn();
      return result;
      
    } catch (error) {
      console.error('🚨 Supabase request failed:', endpoint, error);
      
      // If it's a resource error, activate emergency mode
      if (error.message?.includes('INSUFFICIENT_RESOURCES') || 
          error.code === 'INSUFFICIENT_RESOURCES') {
        rateLimiter.activateGlobalLimit();
      }
      
      return {
        data: null,
        error: error
      };
    }
  }
};

// Export utilities
export { rateLimiter };
export default rateLimiter;