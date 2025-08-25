// src/services/Ads/AdCache.js
import { supabase } from '../../supabaseClient';

class AdCache {
  constructor() {
    this.businessId = null;
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 50;
    this.defaultTTL = 300; // 5 minutes in seconds
    
    console.log('💾 AdCache created');
  }

  async initialize(businessId) {
    this.businessId = businessId;
    
    // Clean up expired cache entries on startup
    await this.cleanupExpired();
    
    // Load recent cache entries into memory
    await this.loadMemoryCache();
    
    console.log('💾 AdCache initialized for business:', businessId);
  }

  async getAd(apiProvider, targetingParams = {}) {
    if (!this.businessId) {
      console.warn('💾 AdCache not initialized');
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(apiProvider, targetingParams);
      
      // Check memory cache first (fastest)
      if (this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey);
        if (cached.expiresAt > Date.now()) {
          console.log(`💾 Memory cache hit for ${apiProvider}`);
          return cached.ad;
        } else {
          // Expired, remove from memory
          this.memoryCache.delete(cacheKey);
        }
      }

      // Check database cache
      const { data: cacheEntry, error } = await supabase
        .from('music_ad_cache')
        .select('*')
        .eq('business_id', this.businessId)
        .eq('api_provider', apiProvider)
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('💾 Error querying cache:', error);
        return null;
      }

      if (cacheEntry) {
        console.log(`💾 Database cache hit for ${apiProvider}`);
        
        // Add to memory cache for faster future access
        this.addToMemoryCache(cacheKey, cacheEntry.ad_content, cacheEntry.expires_at);
        
        return {
          id: cacheEntry.ad_content.id,
          audioUrl: cacheEntry.audio_url || cacheEntry.ad_content.audioUrl,
          duration: cacheEntry.duration || cacheEntry.ad_content.duration,
          title: cacheEntry.ad_content.title,
          advertiser: cacheEntry.ad_content.advertiser,
          metadata: cacheEntry.ad_content.metadata || {}
        };
      }

      console.log(`💾 Cache miss for ${apiProvider}`);
      return null;
      
    } catch (error) {
      console.error('💾 Error getting cached ad:', error);
      return null;
    }
  }

  async cacheAd(apiProvider, ad, ttlSeconds = null) {
    if (!this.businessId || !ad) {
      console.warn('💾 Cannot cache ad - missing businessId or ad data');
      return false;
    }

    try {
      const cacheKey = this.generateCacheKey(apiProvider, {});
      const ttl = ttlSeconds || this.defaultTTL;
      const expiresAt = new Date(Date.now() + ttl * 1000);

      // Prepare ad content for storage
      const adContent = {
        id: ad.id,
        title: ad.title,
        advertiser: ad.advertiser,
        audioUrl: ad.audioUrl,
        duration: ad.duration,
        metadata: ad.metadata || {},
        cachedAt: new Date().toISOString()
      };

      // Store in database
      const { error } = await supabase
        .from('music_ad_cache')
        .upsert({
          business_id: this.businessId,
          api_provider: apiProvider,
          cache_key: cacheKey,
          ad_content: adContent,
          audio_url: ad.audioUrl,
          duration: ad.duration,
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'business_id,api_provider,cache_key'
        });

      if (error) {
        console.error('💾 Error caching ad to database:', error);
        return false;
      }

      // Add to memory cache
      this.addToMemoryCache(cacheKey, adContent, expiresAt.toISOString());

      console.log(`💾 Cached ad for ${apiProvider}, expires in ${ttl}s`);
      return true;
      
    } catch (error) {
      console.error('💾 Error caching ad:', error);
      return false;
    }
  }

  generateCacheKey(apiProvider, targetingParams = {}) {
    // Create a deterministic cache key based on targeting parameters
    const keyParts = [
      apiProvider,
      targetingParams.businessType || 'default',
      targetingParams.location || 'default',
      Math.floor((targetingParams.timeOfDay || new Date().getHours()) / 4) // Group by 4-hour periods
    ];

    return keyParts.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  addToMemoryCache(cacheKey, adContent, expiresAt) {
    try {
      // Enforce memory cache size limit
      if (this.memoryCache.size >= this.maxMemoryCacheSize) {
        // Remove oldest entry
        const firstKey = this.memoryCache.keys().next().value;
        this.memoryCache.delete(firstKey);
      }

      this.memoryCache.set(cacheKey, {
        ad: adContent,
        expiresAt: new Date(expiresAt).getTime()
      });

    } catch (error) {
      console.error('💾 Error adding to memory cache:', error);
    }
  }

  async loadMemoryCache() {
    try {
      // Load recent cache entries for this business
      const { data: cacheEntries, error } = await supabase
        .from('music_ad_cache')
        .select('cache_key, ad_content, expires_at')
        .eq('business_id', this.businessId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(this.maxMemoryCacheSize);

      if (error) {
        console.error('💾 Error loading memory cache:', error);
        return;
      }

      cacheEntries?.forEach(entry => {
        this.addToMemoryCache(entry.cache_key, entry.ad_content, entry.expires_at);
      });

      console.log(`💾 Loaded ${cacheEntries?.length || 0} entries into memory cache`);
      
    } catch (error) {
      console.error('💾 Error loading memory cache:', error);
    }
  }

  async cleanupExpired() {
    try {
      const { error } = await supabase
        .from('music_ad_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('💾 Error cleaning up expired cache:', error);
      } else {
        console.log('💾 Cleaned up expired cache entries');
      }

      // Clean memory cache
      const now = Date.now();
      for (const [key, value] of this.memoryCache.entries()) {
        if (value.expiresAt <= now) {
          this.memoryCache.delete(key);
        }
      }
      
    } catch (error) {
      console.error('💾 Error during cache cleanup:', error);
    }
  }

  async preloadAds(apiProvider, count = 3) {
    try {
      console.log(`💾 Preloading ${count} ads for ${apiProvider}...`);
      
      // This would typically involve calling the API provider to fetch and cache ads
      // For now, we'll just ensure we have space in the cache
      
      const currentCacheCount = await this.getCacheCount(apiProvider);
      console.log(`💾 Current cache count for ${apiProvider}: ${currentCacheCount}`);
      
      return currentCacheCount;
      
    } catch (error) {
      console.error('💾 Error preloading ads:', error);
      return 0;
    }
  }

  async getCacheCount(apiProvider = null) {
    try {
      let query = supabase
        .from('music_ad_cache')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', this.businessId)
        .gt('expires_at', new Date().toISOString());

      if (apiProvider) {
        query = query.eq('api_provider', apiProvider);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
      
    } catch (error) {
      console.error('💾 Error getting cache count:', error);
      return 0;
    }
  }

  async clearCache(apiProvider = null) {
    try {
      let query = supabase
        .from('music_ad_cache')
        .delete()
        .eq('business_id', this.businessId);

      if (apiProvider) {
        query = query.eq('api_provider', apiProvider);
      }

      const { error } = await query;

      if (error) throw error;

      // Clear memory cache
      if (apiProvider) {
        for (const [key, value] of this.memoryCache.entries()) {
          if (key.startsWith(apiProvider + '_')) {
            this.memoryCache.delete(key);
          }
        }
      } else {
        this.memoryCache.clear();
      }

      console.log(`💾 Cleared cache${apiProvider ? ' for ' + apiProvider : ''}`);
      return true;
      
    } catch (error) {
      console.error('💾 Error clearing cache:', error);
      return false;
    }
  }

  getCacheStats() {
    return {
      memorySize: this.memoryCache.size,
      maxMemorySize: this.maxMemoryCacheSize,
      businessId: this.businessId
    };
  }

  // Periodic maintenance (call this from a timer)
  async performMaintenance() {
    try {
      console.log('💾 Starting cache maintenance...');
      
      await this.cleanupExpired();
      
      // Optimize memory cache by removing least recently used items if needed
      if (this.memoryCache.size > this.maxMemoryCacheSize * 0.8) {
        const keysToRemove = Math.floor(this.memoryCache.size * 0.2);
        const keys = Array.from(this.memoryCache.keys());
        
        for (let i = 0; i < keysToRemove; i++) {
          this.memoryCache.delete(keys[i]);
        }
        
        console.log(`💾 Removed ${keysToRemove} items from memory cache`);
      }
      
      console.log('💾 Cache maintenance completed');
      
    } catch (error) {
      console.error('💾 Error during cache maintenance:', error);
    }
  }
}

export default AdCache;