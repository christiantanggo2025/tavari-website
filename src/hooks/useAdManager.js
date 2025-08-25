// src/hooks/useAdManager.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { globalAdManager } from '../services/Ads/AdManager';
import { useBusiness } from './useBusiness';

export const useAdManager = () => {
  const { business } = useBusiness();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentAd, setCurrentAd] = useState(null);
  const [adSettings, setAdSettings] = useState({
    enabled: true,
    frequency: 5,
    maxAdsPerHour: 6,
    volumeAdjustment: 0.8
  });
  
  // Enhanced state for build plan requirements
  const [systemHealth, setSystemHealth] = useState({
    status: 'unknown',
    providers: {},
    lastCheck: null
  });
  
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    totalPlays: 0,
    averageCPM: 0,
    revenueByProvider: {},
    pendingPayout: 0
  });
  
  const [realTimeStats, setRealTimeStats] = useState({
    recentAdPlays: 0,
    recentRevenue: 0,
    lastUpdated: null,
    activeCampaigns: 0
  });
  
  const [apiProviders, setApiProviders] = useState([]);
  const [adQueue, setAdQueue] = useState([]);
  const [playbackHistory, setPlaybackHistory] = useState([]);
  
  const trackCountRef = useRef(0);
  const lastAdTimeRef = useRef(0);
  const initializationPromiseRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);
  const realtimeIntervalRef = useRef(null);

  // Initialize ad manager when business changes
  useEffect(() => {
    if (business?.id && !globalAdManager.isInitialized) {
      initializeAdManager();
    } else if (globalAdManager.isInitialized && globalAdManager.businessId === business?.id) {
      setIsInitialized(true);
      loadCurrentSettings();
      startPeriodicUpdates();
    }
    
    return () => {
      stopPeriodicUpdates();
    };
  }, [business?.id]);

  const initializeAdManager = useCallback(async () => {
    if (!business?.id) return;
    
    // Prevent multiple simultaneous initializations
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    setIsLoading(true);
    setError(null);

    const initPromise = (async () => {
      try {
        console.log('🎯 Initializing AdManager for business:', business.id);
        
        await globalAdManager.initialize(business.id);
        
        setIsInitialized(true);
        await Promise.all([
          loadCurrentSettings(),
          loadApiProviders(),
          loadRevenueStats(),
          checkSystemHealth()
        ]);
        
        startPeriodicUpdates();
        
        console.log('🎯 AdManager initialized successfully');
        
      } catch (err) {
        console.error('🎯 Error initializing AdManager:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
        initializationPromiseRef.current = null;
      }
    })();

    initializationPromiseRef.current = initPromise;
    return initPromise;
  }, [business?.id]);

  const loadCurrentSettings = useCallback(async () => {
    if (!globalAdManager.isInitialized) return;

    try {
      const settings = globalAdManager.adSettings;
      setAdSettings(settings);
    } catch (err) {
      console.error('🎯 Error loading ad settings:', err);
    }
  }, []);

  const loadApiProviders = useCallback(async () => {
    if (!globalAdManager.isInitialized) return;

    try {
      const providers = [];
      for (const [name, provider] of globalAdManager.apiProviders) {
        const info = provider.getProviderInfo ? provider.getProviderInfo() : {
          name,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
          active: true,
          initialized: true
        };
        providers.push(info);
      }
      setApiProviders(providers);
    } catch (err) {
      console.error('🎯 Error loading API providers:', err);
    }
  }, []);

  const loadRevenueStats = useCallback(async (timeframe = '30days') => {
    if (!globalAdManager.isInitialized) return;

    try {
      const stats = await globalAdManager.getRevenueStats(timeframe);
      if (stats) {
        setRevenueStats(prev => ({
          ...prev,
          ...stats
        }));
      }
    } catch (err) {
      console.error('🎯 Error loading revenue stats:', err);
    }
  }, []);

  const checkSystemHealth = useCallback(async () => {
    if (!globalAdManager.isInitialized) return;

    try {
      const health = await globalAdManager.healthCheck();
      if (health) {
        setSystemHealth({
          status: health.initialized ? 'healthy' : 'error',
          providers: health.providers || {},
          lastCheck: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('🎯 Error checking system health:', err);
      setSystemHealth({
        status: 'error',
        providers: {},
        lastCheck: new Date().toISOString()
      });
    }
  }, []);

  const loadRealTimeStats = useCallback(async () => {
    if (!globalAdManager.isInitialized || !globalAdManager.adAnalytics) return;

    try {
      const stats = await globalAdManager.adAnalytics.getRealtimeStats();
      if (stats) {
        setRealTimeStats(stats);
      }
    } catch (err) {
      console.error('🎯 Error loading real-time stats:', err);
    }
  }, []);

  const startPeriodicUpdates = useCallback(() => {
    // Health check every 2 minutes
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }
    healthCheckIntervalRef.current = setInterval(checkSystemHealth, 120000);

    // Real-time stats every 30 seconds
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
    }
    realtimeIntervalRef.current = setInterval(loadRealTimeStats, 30000);
  }, [checkSystemHealth, loadRealTimeStats]);

  const stopPeriodicUpdates = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
  }, []);

  const requestAd = useCallback(async (forceRequest = false) => {
    if (!isInitialized || !adSettings.enabled) {
      console.log('🎯 Ad request blocked - not initialized or disabled');
      return null;
    }

    try {
      setError(null);
      
      // Check if it's time for an ad (unless forced)
      if (!forceRequest) {
        trackCountRef.current += 1;
        
        // Check frequency
        if (trackCountRef.current % adSettings.frequency !== 0) {
          console.log(`🎯 Not time for ad yet (track ${trackCountRef.current}, frequency ${adSettings.frequency})`);
          return null;
        }
        
        // Check hourly limit
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        if (lastAdTimeRef.current > hourAgo) {
          // In a real implementation, you'd check actual hourly count from database
          // For now, we'll use a simple time-based check
          console.log('🎯 Hourly ad limit reached (simplified check)');
          return null;
        }
      }

      console.log('🎯 Requesting ad from AdManager...');
      
      const ad = await globalAdManager.getNextAd(trackCountRef.current);
      
      if (ad) {
        setCurrentAd(ad);
        lastAdTimeRef.current = Date.now();
        
        // Add to playback history
        setPlaybackHistory(prev => [
          {
            id: ad.id,
            title: ad.title,
            provider: ad.providerName,
            timestamp: new Date().toISOString(),
            revenue: ad.cpm ? (ad.cpm / 1000) * 0.6 : 0 // Business share estimate
          },
          ...prev.slice(0, 49) // Keep last 50 entries
        ]);
        
        // Log analytics event
        await logAdEvent('ad_request_success', {
          ad_id: ad.id,
          provider: ad.providerName,
          track_count: trackCountRef.current
        });
        
        console.log('🎯 Ad received:', ad.title);
      } else {
        await logAdEvent('ad_request_failed', {
          track_count: trackCountRef.current,
          reason: 'no_ad_available'
        });
      }
      
      return ad;
      
    } catch (err) {
      console.error('🎯 Error requesting ad:', err);
      setError(err.message);
      await logAdEvent('ad_request_error', {
        error: err.message,
        track_count: trackCountRef.current
      });
      return null;
    }
  }, [isInitialized, adSettings]);

  const preloadAds = useCallback(async (count = 3) => {
    if (!isInitialized) return;

    try {
      const preloadedAds = [];
      for (let i = 0; i < count; i++) {
        // Use cache preloading from AdManager
        for (const [providerName] of globalAdManager.apiProviders) {
          if (globalAdManager.adCache) {
            await globalAdManager.adCache.preloadAds(providerName, 1);
          }
        }
      }
      console.log(`🎯 Preloaded ads for better performance`);
    } catch (err) {
      console.error('🎯 Error preloading ads:', err);
    }
  }, [isInitialized]);

  const updateSettings = useCallback(async (newSettings) => {
    if (!isInitialized) return false;

    try {
      setError(null);
      
      await globalAdManager.updateAdSettings(newSettings);
      setAdSettings(prev => ({ ...prev, ...newSettings }));
      
      // Log settings change
      await logAdEvent('settings_updated', {
        changes: newSettings,
        previous_settings: adSettings
      });
      
      console.log('🎯 Ad settings updated');
      return true;
      
    } catch (err) {
      console.error('🎯 Error updating ad settings:', err);
      setError(err.message);
      return false;
    }
  }, [isInitialized, adSettings]);

  const getRevenueStats = useCallback(async (timeframe = '30days') => {
    if (!isInitialized) return null;

    try {
      setError(null);
      const stats = await globalAdManager.getRevenueStats(timeframe);
      if (stats) {
        setRevenueStats(prev => ({ ...prev, ...stats }));
      }
      return stats;
    } catch (err) {
      console.error('🎯 Error getting revenue stats:', err);
      setError(err.message);
      return null;
    }
  }, [isInitialized]);

  const getSystemHealth = useCallback(async () => {
    if (!isInitialized) return null;

    try {
      setError(null);
      const health = await globalAdManager.healthCheck();
      if (health) {
        setSystemHealth({
          status: health.initialized ? 'healthy' : 'error',
          providers: health.providers || {},
          lastCheck: new Date().toISOString()
        });
      }
      return health;
    } catch (err) {
      console.error('🎯 Error getting system health:', err);
      setError(err.message);
      return null;
    }
  }, [isInitialized]);

  const clearAdCache = useCallback(async (apiProvider = null) => {
    if (!isInitialized) return false;

    try {
      setError(null);
      
      if (globalAdManager.adCache) {
        const result = await globalAdManager.adCache.clearCache(apiProvider);
        console.log('🎯 Ad cache cleared');
        
        // Log cache clear event
        await logAdEvent('cache_cleared', {
          provider: apiProvider || 'all',
          cleared_by: 'user'
        });
        
        return result;
      }
      
      return false;
      
    } catch (err) {
      console.error('🎯 Error clearing ad cache:', err);
      setError(err.message);
      return false;
    }
  }, [isInitialized]);

  const testApiProvider = useCallback(async (providerName) => {
    if (!isInitialized) return { success: false, error: 'Not initialized' };

    try {
      setError(null);
      
      const health = await globalAdManager.healthCheck();
      const providerHealth = health?.providers?.[providerName];
      
      if (providerHealth) {
        const success = providerHealth.status === 'healthy';
        
        // Log test event
        await logAdEvent('provider_test', {
          provider: providerName,
          success,
          status: providerHealth.status
        });
        
        return {
          success,
          status: providerHealth.status,
          responseTime: providerHealth.responseTime || 0,
          fillRate: providerHealth.fillRate || 0
        };
      }
      
      return { success: false, error: 'Provider not found' };
      
    } catch (err) {
      console.error(`🎯 Error testing ${providerName}:`, err);
      return { success: false, error: err.message };
    }
  }, [isInitialized]);

  const resetTrackCount = useCallback(() => {
    trackCountRef.current = 0;
    console.log('🎯 Track count reset to 0');
  }, []);

  const onAdCompleted = useCallback(async (adData) => {
    console.log('🎯 Ad completed:', adData);
    setCurrentAd(null);
    
    // Update revenue stats
    await loadRevenueStats();
    
    // Log completion event
    await logAdEvent('ad_completed', {
      ad_id: adData.adId,
      completion_rate: adData.completionRate || 1.0,
      actual_duration: adData.actualDuration
    });
  }, [loadRevenueStats]);

  const onAdError = useCallback(async (error) => {
    console.error('🎯 Ad playback error:', error);
    setError(error.message);
    setCurrentAd(null);
    
    // Log error event
    await logAdEvent('ad_error', {
      error: error.message,
      error_type: 'playback'
    });
  }, []);

  // Analytics helpers
  const logAdEvent = useCallback(async (eventType, eventData = {}) => {
    if (!isInitialized || !globalAdManager.adAnalytics) return;

    try {
      await globalAdManager.adAnalytics.logEvent(eventType, {
        ...eventData,
        business_id: business?.id,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('🎯 Error logging ad event:', err);
    }
  }, [isInitialized, business?.id]);

  const getAnalytics = useCallback(async (timeframe = '7d') => {
    if (!isInitialized || !globalAdManager.adAnalytics) return null;

    try {
      setError(null);
      return await globalAdManager.adAnalytics.getPerformanceMetrics(timeframe);
    } catch (err) {
      console.error('🎯 Error getting analytics:', err);
      setError(err.message);
      return null;
    }
  }, [isInitialized]);

  const exportAnalytics = useCallback(async (timeframe = '30d', format = 'json') => {
    if (!isInitialized || !globalAdManager.adAnalytics) return null;

    try {
      setError(null);
      return await globalAdManager.adAnalytics.exportAnalyticsData(timeframe, format);
    } catch (err) {
      console.error('🎯 Error exporting analytics:', err);
      setError(err.message);
      return null;
    }
  }, [isInitialized]);

  const refreshAllData = useCallback(async () => {
    if (!isInitialized) return;

    try {
      setIsLoading(true);
      await Promise.all([
        loadRevenueStats(),
        checkSystemHealth(),
        loadRealTimeStats(),
        loadApiProviders()
      ]);
    } catch (err) {
      console.error('🎯 Error refreshing data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, loadRevenueStats, checkSystemHealth, loadRealTimeStats, loadApiProviders]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    currentAd,
    adSettings,
    systemHealth,
    revenueStats,
    realTimeStats,
    apiProviders,
    adQueue,
    playbackHistory,
    trackCount: trackCountRef.current,
    
    // Actions
    initializeAdManager,
    requestAd,
    preloadAds,
    updateSettings,
    resetTrackCount,
    clearAdCache,
    testApiProvider,
    refreshAllData,
    
    // Event handlers
    onAdCompleted,
    onAdError,
    
    // Data fetching
    getRevenueStats,
    getSystemHealth,
    getAnalytics,
    exportAnalytics,
    
    // Analytics
    logAdEvent,
    
    // Direct access to manager (use with caution)
    adManager: globalAdManager
  };
};

export default useAdManager;