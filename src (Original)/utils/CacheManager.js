// src/utils/CacheManager.js - Smart Caching Layer
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 30000; // 30 seconds default
    this.maxCacheSize = 100; // Maximum cached items
    
    // Different TTLs for different data types
    this.ttlConfig = {
      'businesses_existence': 60000, // 1 minute - businesses don't change often
      'mail_billing': 10000, // 10 seconds - billing data can be cached briefly
      'mail_settings': 120000, // 2 minutes - settings change rarely
      'mail_contacts': 5000, // 5 seconds - contacts change more frequently
      'mail_campaigns': 5000, // 5 seconds - campaigns change frequently
      'user_data': 30000, // 30 seconds - user data
    };
  }

  // Generate cache key from request parameters
  generateKey(table, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${table}:${sortedParams}`;
  }

  // Get data from cache
  get(table, params = {}) {
    const key = this.generateKey(table, params);
    const now = Date.now();
    
    if (this.cache.has(key)) {
      const timestamp = this.timestamps.get(key);
      const ttl = this.getTTL(table);
      
      if (now - timestamp < ttl) {
        console.log('📦 Cache hit:', key);
        return this.cache.get(key);
      } else {
        // Expired - remove from cache
        this.cache.delete(key);
        this.timestamps.delete(key);
        console.log('⏰ Cache expired:', key);
      }
    }
    
    return null;
  }

  // Set data in cache
  set(table, params = {}, data) {
    const key = this.generateKey(table, params);
    const now = Date.now();
    
    // Enforce cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, data);
    this.timestamps.set(key, now);
    
    console.log('💾 Cache set:', key, '| Size:', this.cache.size);
  }

  // Get TTL for specific table
  getTTL(table) {
    // Check for specific patterns
    for (const [pattern, ttl] of Object.entries(this.ttlConfig)) {
      if (table.includes(pattern.replace('_', ''))) {
        return ttl;
      }
    }
    
    return this.defaultTTL;
  }

  // Remove oldest cache entries
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.timestamps.delete(oldestKey);
      console.log('🗑️ Evicted oldest cache entry:', oldestKey);
    }
  }

  // Clear cache for specific table
  invalidate(table) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(table + ':')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.timestamps.delete(key);
    });
    
    console.log('🧹 Invalidated cache for:', table, '| Removed:', keysToDelete.length, 'entries');
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    console.log('🔄 Cache cleared completely');
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, timestamp] of this.timestamps.entries()) {
      const table = key.split(':')[0];
      const ttl = this.getTTL(table);
      
      if (now - timestamp < ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxCacheSize,
      usage: (this.cache.size / this.maxCacheSize * 100).toFixed(1) + '%'
    };
  }

  // Cleanup expired entries (call periodically)
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, timestamp] of this.timestamps.entries()) {
      const table = key.split(':')[0];
      const ttl = this.getTTL(table);
      
      if (now - timestamp >= ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.timestamps.delete(key);
    });
    
    if (keysToDelete.length > 0) {
      console.log('🧹 Cleaned up', keysToDelete.length, 'expired cache entries');
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Set up periodic cleanup
setInterval(() => {
  cacheManager.cleanup();
}, 60000); // Clean up every minute

// Enhanced Supabase wrapper with caching and rate limiting
export const optimizedSupabase = {
  from: (table) => ({
    select: (columns = '*') => ({
      eq: (column, value) => ({
        single: async () => {
          const params = { select: columns, [column]: value, single: true };
          
          // Check cache first
          const cached = cacheManager.get(table, params);
          if (cached) {
            return cached;
          }
          
          const endpoint = `${table}?select=${columns}&${column}=eq.${value}`;
          
          // Check rate limit
          if (!window.rateLimiter?.canMakeRequest(endpoint)) {
            console.warn('⏳ Request blocked by rate limiter, returning cached data');
            return {
              data: null,
              error: { message: 'Rate limited', code: 'RATE_LIMITED' }
            };
          }
          
          try {
            // Record request and make call
            window.rateLimiter?.recordRequest(endpoint);
            const result = await window.supabase?.from(table).select(columns).eq(column, value).single();
            
            // Cache successful results
            if (result && !result.error) {
              cacheManager.set(table, params, result);
            }
            
            return result;
          } catch (error) {
            console.error('🚨 Optimized Supabase request failed:', error);
            return { data: null, error };
          }
        },
        
        limit: (count) => ({
          then: async (callback) => {
            const params = { select: columns, [column]: value, limit: count };
            
            // Check cache first
            const cached = cacheManager.get(table, params);
            if (cached) {
              return callback(cached);
            }
            
            const endpoint = `${table}?select=${columns}&${column}=eq.${value}&limit=${count}`;
            
            // Check rate limit
            if (!window.rateLimiter?.canMakeRequest(endpoint)) {
              console.warn('⏳ Request blocked by rate limiter');
              return callback({
                data: [],
                error: { message: 'Rate limited', code: 'RATE_LIMITED' }
              });
            }
            
            try {
              window.rateLimiter?.recordRequest(endpoint);
              const result = await window.supabase?.from(table).select(columns).eq(column, value).limit(count);
              
              if (result && !result.error) {
                cacheManager.set(table, params, result);
              }
              
              return callback(result);
            } catch (error) {
              console.error('🚨 Optimized Supabase request failed:', error);
              return callback({ data: [], error });
            }
          }
        })
      }),
      
      gte: (column, value) => ({
        lte: (column2, value2) => ({
          then: async (callback) => {
            const params = { select: columns, [`${column}_gte`]: value, [`${column2}_lte`]: value2 };
            
            // Check cache first
            const cached = cacheManager.get(table, params);
            if (cached) {
              return callback(cached);
            }
            
            const endpoint = `${table}?select=${columns}&${column}=gte.${value}&${column2}=lte.${value2}`;
            
            if (!window.rateLimiter?.canMakeRequest(endpoint)) {
              return callback({
                data: [],
                error: { message: 'Rate limited', code: 'RATE_LIMITED' }
              });
            }
            
            try {
              window.rateLimiter?.recordRequest(endpoint);
              const result = await window.supabase?.from(table).select(columns).gte(column, value).lte(column2, value2);
              
              if (result && !result.error) {
                cacheManager.set(table, params, result);
              }
              
              return callback(result);
            } catch (error) {
              return callback({ data: [], error });
            }
          }
        })
      }),
      
      limit: (count) => ({
        then: async (callback) => {
          const params = { select: columns, limit: count };
          
          const cached = cacheManager.get(table, params);
          if (cached) {
            return callback(cached);
          }
          
          const endpoint = `${table}?select=${columns}&limit=${count}`;
          
          if (!window.rateLimiter?.canMakeRequest(endpoint)) {
            return callback({
              data: [],
              error: { message: 'Rate limited', code: 'RATE_LIMITED' }
            });
          }
          
          try {
            window.rateLimiter?.recordRequest(endpoint);
            const result = await window.supabase?.from(table).select(columns).limit(count);
            
            if (result && !result.error) {
              cacheManager.set(table, params, result);
            }
            
            return callback(result);
          } catch (error) {
            return callback({ data: [], error });
          }
        }
      })
    })
  }),
  
  // Utility methods
  invalidateCache: (table) => cacheManager.invalidate(table),
  clearCache: () => cacheManager.clear(),
  getCacheStats: () => cacheManager.getStats()
};

export { cacheManager };
export default optimizedSupabase;