// src/contexts/BusinessContext.jsx - Fixed with setBusiness function
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import rateLimiter from '../utils/RateLimiter.js';
import { cacheManager } from '../utils/CacheManager.js';

const BusinessContext = createContext();

export const useBusinessContext = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
};

// Keep the old export for backwards compatibility
export const useBusiness = useBusinessContext;

export const BusinessProvider = ({ children }) => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestQueue, setRequestQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Rate-limited business fetching
  const fetchBusinessWithRateLimit = async (retries = 3) => {
    const cacheKey = 'current_business';
    
    // Check cache first
    const cached = cacheManager.get('businesses', { current: true });
    if (cached && cached.data) {
      setBusiness(cached.data);
      setLoading(false);
      return cached.data;
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest('businesses_existence_check')) {
      console.warn('⏳ Business fetch blocked by rate limiter');
      
      // Use any cached data, even if slightly stale
      const staleData = localStorage.getItem('tavari_current_business');
      if (staleData) {
        try {
          const parsed = JSON.parse(staleData);
          setBusiness(parsed);
          setLoading(false);
          return parsed;
        } catch (e) {
          console.warn('Failed to parse cached business data');
        }
      }
      
      setError('Rate limited - too many requests. Please wait a moment.');
      setLoading(false);
      return null;
    }

    try {
      rateLimiter.recordRequest('businesses_existence_check');
      
      const { data, error: supabaseError } = await supabase
        .from('businesses')
        .select('*')
        .limit(1)
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      if (data) {
        setBusiness(data);
        setError(null);
        
        // Cache the result
        cacheManager.set('businesses', { current: true }, { data });
        
        // Store in localStorage as backup
        localStorage.setItem('tavari_current_business', JSON.stringify(data));
        
        console.log('✅ Business loaded successfully:', data.name);
      } else {
        console.warn('⚠️ No business found');
        setBusiness(null);
      }

      setLoading(false);
      return data;

    } catch (error) {
      console.error('❌ Error fetching business:', error);
      
      // Handle specific error types
      if (error.message?.includes('INSUFFICIENT_RESOURCES') || 
          error.code === 'INSUFFICIENT_RESOURCES') {
        console.error('🚨 Resource exhaustion detected - activating emergency mode');
        rateLimiter.activateGlobalLimit();
        
        setError('System overloaded. Using cached data if available.');
        
        // Try to use cached data
        const fallbackData = localStorage.getItem('tavari_current_business');
        if (fallbackData) {
          try {
            const parsed = JSON.parse(fallbackData);
            setBusiness(parsed);
            setLoading(false);
            return parsed;
          } catch (e) {
            console.warn('Failed to parse fallback business data');
          }
        }
      } else if (retries > 0) {
        // Retry with exponential backoff
        const delay = (4 - retries) * 1000; // 1s, 2s, 3s delays
        console.log(`🔄 Retrying business fetch in ${delay}ms (${retries} retries left)`);
        
        setTimeout(() => {
          fetchBusinessWithRateLimit(retries - 1);
        }, delay);
        return null;
      }

      setError(error.message || 'Failed to load business data');
      setLoading(false);
      return null;
    }
  };

  // Queue management for rate-limited requests
  const addToQueue = (requestFn, priority = 'normal') => {
    setRequestQueue(prev => [...prev, { requestFn, priority, timestamp: Date.now() }]);
  };

  // Process queued requests
  const processQueue = async () => {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    setIsProcessingQueue(true);
    
    // Sort by priority (high first) and timestamp (older first)
    const sortedQueue = [...requestQueue].sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return a.timestamp - b.timestamp;
    });

    // Process one request at a time with delays
    for (let i = 0; i < Math.min(sortedQueue.length, 3); i++) {
      const { requestFn } = sortedQueue[i];
      
      try {
        await requestFn();
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between requests
      } catch (error) {
        console.error('Queue processing error:', error);
      }
    }
    
    // Remove processed requests
    setRequestQueue(prev => prev.slice(Math.min(prev.length, 3)));
    setIsProcessingQueue(false);
  };

  // Process queue periodically
  useEffect(() => {
    const interval = setInterval(processQueue, 2000); // Process every 2 seconds
    return () => clearInterval(interval);
  }, [requestQueue, isProcessingQueue]);

  // Initialize business context
  useEffect(() => {
    let mounted = true;
    let initTimer;

    const initializeBusiness = async () => {
      // Add small random delay to prevent thundering herd
      const delay = Math.random() * 1000;
      
      initTimer = setTimeout(async () => {
        if (!mounted) return;
        
        console.log('🏢 Initializing Business Context...');
        await fetchBusinessWithRateLimit();
      }, delay);
    };

    initializeBusiness();

    return () => {
      mounted = false;
      if (initTimer) clearTimeout(initTimer);
    };
  }, []);

  // Global error monitoring
  useEffect(() => {
    const handleGlobalError = (event) => {
      const errorMessage = event.error?.message || '';
      const reasonMessage = event.reason?.toString?.() || '';
      
      if (errorMessage.includes('INSUFFICIENT_RESOURCES') ||
          reasonMessage.includes('INSUFFICIENT_RESOURCES')) {
        console.error('🚨 Global resource exhaustion detected');
        rateLimiter.activateGlobalLimit();
        setError('System overloaded. Please wait a moment before continuing.');
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  // Provide debug utilities
  const debugInfo = {
    rateLimiterStatus: rateLimiter.getStatus(),
    cacheStats: cacheManager.getStats(),
    queueLength: requestQueue.length,
    isProcessingQueue
  };

  // Emergency recovery function
  const emergencyRecovery = () => {
    console.log('🆘 Emergency recovery initiated');
    
    rateLimiter.reset();
    cacheManager.clear();
    setRequestQueue([]);
    setError(null);
    
    // Try to reload business after a delay
    setTimeout(() => {
      fetchBusinessWithRateLimit();
    }, 2000);
  };

  const contextValue = {
    business,
    selectedBusinessId: business?.id, // Add this for backwards compatibility
    setBusiness, // Add this function that HeaderBar expects
    loading,
    error,
    refetchBusiness: fetchBusinessWithRateLimit,
    addToQueue,
    debugInfo,
    emergencyRecovery
  };

  return (
    <BusinessContext.Provider value={contextValue}>
      {children}
    </BusinessContext.Provider>
  );
};

export default BusinessProvider;