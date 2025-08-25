// src/hooks/useRevenueTracking.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { globalAdManager } from '../services/Ads/AdManager';
import { useBusiness } from './useBusiness';

export const useRevenueTracking = (refreshInterval = 30000) => {
  const { business } = useBusiness();
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalPlays: 0,
    averageCPM: 0,
    revenueByProvider: {},
    revenueByDay: {},
    pendingPayout: 0,
    lastPayout: null
  });
  
  const [realTimeStats, setRealTimeStats] = useState({
    recentRevenue: 0,
    recentPlays: 0,
    lastUpdated: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projections, setProjections] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0
  });

  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    if (business?.id && globalAdManager.isInitialized) {
      loadRevenueData();
      startPeriodicRefresh();
    }

    return () => {
      stopPeriodicRefresh();
    };
  }, [business?.id, globalAdManager.isInitialized]);

  const startPeriodicRefresh = useCallback(() => {
    stopPeriodicRefresh();
    
    refreshIntervalRef.current = setInterval(() => {
      loadRealTimeStats();
    }, refreshInterval);
  }, [refreshInterval]);

  const stopPeriodicRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  const loadRevenueData = useCallback(async (timeframe = 'all') => {
    if (!globalAdManager.isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load revenue stats for different timeframes
      const [totalStats, todayStats, weekStats, monthStats] = await Promise.all([
        globalAdManager.getRevenueStats('30days'),
        globalAdManager.getRevenueStats('today'),
        globalAdManager.getRevenueStats('7days'),
        globalAdManager.getRevenueStats('30days')
      ]);

      // Calculate projections based on current performance
      const projectedEarnings = calculateProjections(todayStats, weekStats, monthStats);

      setRevenueData({
        totalRevenue: totalStats.totalRevenue,
        todayRevenue: todayStats.totalRevenue,
        weekRevenue: weekStats.totalRevenue,
        monthRevenue: monthStats.totalRevenue,
        totalPlays: totalStats.totalPlays,
        averageCPM: totalStats.averageCPM,
        revenueByProvider: totalStats.revenueByProvider,
        revenueByDay: totalStats.revenueByDay || {},
        pendingPayout: totalStats.pendingPayout || 0,
        lastPayout: totalStats.lastPayout || null
      });

      setProjections(projectedEarnings);

      // Load real-time stats
      await loadRealTimeStats();

    } catch (err) {
      console.error('💰 Error loading revenue data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRealTimeStats = useCallback(async () => {
    if (!globalAdManager?.adAnalytics) return;

    try {
      const stats = await globalAdManager.adAnalytics.getRealtimeStats();
      
      setRealTimeStats({
        recentRevenue: stats.recentRevenue || 0,
        recentPlays: stats.recentAdPlays || 0,
        lastUpdated: stats.lastUpdated || new Date().toISOString()
      });

    } catch (err) {
      console.error('💰 Error loading real-time stats:', err);
    }
  }, []);

  const calculateProjections = useCallback((todayStats, weekStats, monthStats) => {
    const todayRevenue = todayStats.totalRevenue || 0;
    const weekRevenue = weekStats.totalRevenue || 0;
    const monthRevenue = monthStats.totalRevenue || 0;

    // Use different time periods for more accurate projections
    const dailyAverage = weekRevenue / 7; // Better than just today's data
    const weeklyAverage = monthRevenue / 4.33; // More stable than single week
    const monthlyAverage = monthRevenue;

    return {
      daily: dailyAverage,
      weekly: weeklyAverage,
      monthly: monthlyAverage,
      yearly: monthlyAverage * 12
    };
  }, []);

  const getRevenueGrowth = useCallback((timeframe = '7days') => {
    if (!revenueData.revenueByDay || Object.keys(revenueData.revenueByDay).length < 2) {
      return { growth: 0, trend: 'stable' };
    }

    const sortedDays = Object.entries(revenueData.revenueByDay)
      .sort(([a], [b]) => new Date(a) - new Date(b));

    if (sortedDays.length < 2) {
      return { growth: 0, trend: 'stable' };
    }

    // Compare first half vs second half
    const midPoint = Math.floor(sortedDays.length / 2);
    const firstHalf = sortedDays.slice(0, midPoint);
    const secondHalf = sortedDays.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, [, revenue]) => sum + revenue, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, [, revenue]) => sum + revenue, 0) / secondHalf.length;

    if (firstHalfAvg === 0) {
      return { growth: 0, trend: 'stable' };
    }

    const growth = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    let trend = 'stable';
    if (growth > 5) trend = 'up';
    else if (growth < -5) trend = 'down';

    return { growth: Math.round(growth * 100) / 100, trend };
  }, [revenueData.revenueByDay]);

  const getTopPerformingProvider = useCallback(() => {
    if (!revenueData.revenueByProvider || Object.keys(revenueData.revenueByProvider).length === 0) {
      return null;
    }

    const providers = Object.entries(revenueData.revenueByProvider);
    const topProvider = providers.reduce((max, current) => 
      current[1] > max[1] ? current : max
    );

    return {
      name: topProvider[0],
      revenue: topProvider[1],
      percentage: (topProvider[1] / revenueData.totalRevenue) * 100
    };
  }, [revenueData.revenueByProvider, revenueData.totalRevenue]);

  const getPayoutStatus = useCallback(() => {
    const minimumPayout = 25.00; // Default minimum payout
    const pending = revenueData.pendingPayout || 0;
    
    if (pending >= minimumPayout) {
      return {
        status: 'ready',
        message: 'Ready for payout',
        amount: pending,
        progress: 1.0
      };
    } else {
      const progress = pending / minimumPayout;
      const remaining = minimumPayout - pending;
      
      return {
        status: 'pending',
        message: `${remaining.toFixed(2)} until next payout`,
        amount: pending,
        progress: progress
      };
    }
  }, [revenueData.pendingPayout]);

  const exportRevenueData = useCallback(async (timeframe = '30days', format = 'json') => {
    if (!globalAdManager?.adAnalytics) return null;

    try {
      setError(null);
      return await globalAdManager.adAnalytics.exportAnalyticsData(timeframe, format);
    } catch (err) {
      console.error('💰 Error exporting revenue data:', err);
      setError(err.message);
      return null;
    }
  }, []);

  const getRevenueAnalytics = useCallback(async (timeframe = '30d') => {
    if (!globalAdManager?.adAnalytics) return null;

    try {
      setError(null);
      return await globalAdManager.adAnalytics.getRevenueAnalytics(timeframe);
    } catch (err) {
      console.error('💰 Error getting revenue analytics:', err);
      setError(err.message);
      return null;
    }
  }, []);

  const detectAnomalies = useCallback(async () => {
    if (!globalAdManager?.adAnalytics) return null;

    try {
      setError(null);
      return await globalAdManager.adAnalytics.detectAnomalies('revenue');
    } catch (err) {
      console.error('💰 Error detecting anomalies:', err);
      setError(err.message);
      return null;
    }
  }, []);

  const refreshData = useCallback(async () => {
    await loadRevenueData();
  }, [loadRevenueData]);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount || 0);
  }, []);

  const formatNumber = useCallback((num) => {
    return new Intl.NumberFormat('en-CA').format(num || 0);
  }, []);

  const getRevenueMetrics = useCallback(() => {
    const growth = getRevenueGrowth();
    const topProvider = getTopPerformingProvider();
    const payoutStatus = getPayoutStatus();

    return {
      ...revenueData,
      growth,
      topProvider,
      payoutStatus,
      projections,
      realTime: realTimeStats
    };
  }, [revenueData, getRevenueGrowth, getTopPerformingProvider, getPayoutStatus, projections, realTimeStats]);

  // Performance indicators
  const getPerformanceLevel = useCallback(() => {
    const avgCPM = revenueData.averageCPM || 0;
    
    if (avgCPM >= 0.020) {
      return { level: 'excellent', color: '#4caf50', text: 'Excellent Performance' };
    } else if (avgCPM >= 0.015) {
      return { level: 'good', color: '#8bc34a', text: 'Good Performance' };
    } else if (avgCPM >= 0.010) {
      return { level: 'average', color: '#ff9800', text: 'Average Performance' };
    } else if (avgCPM > 0) {
      return { level: 'low', color: '#f44336', text: 'Below Average' };
    } else {
      return { level: 'none', color: '#9e9e9e', text: 'No Data' };
    }
  }, [revenueData.averageCPM]);

  // Revenue milestones
  const getNextMilestone = useCallback(() => {
    const current = revenueData.totalRevenue || 0;
    const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    
    const nextMilestone = milestones.find(milestone => milestone > current);
    
    if (nextMilestone) {
      const progress = current / nextMilestone;
      const remaining = nextMilestone - current;
      
      return {
        target: nextMilestone,
        current: current,
        remaining: remaining,
        progress: progress,
        message: `${remaining.toFixed(2)} until ${nextMilestone} milestone`
      };
    }
    
    return null;
  }, [revenueData.totalRevenue]);

  return {
    // Core data
    revenueData,
    realTimeStats,
    projections,
    
    // Status
    isLoading,
    error,
    
    // Computed metrics
    getRevenueMetrics,
    getRevenueGrowth,
    getTopPerformingProvider,
    getPayoutStatus,
    getPerformanceLevel,
    getNextMilestone,
    
    // Actions
    loadRevenueData,
    refreshData,
    exportRevenueData,
    getRevenueAnalytics,
    detectAnomalies,
    
    // Utilities
    formatCurrency,
    formatNumber,
    
    // Control
    startPeriodicRefresh,
    stopPeriodicRefresh
  };
};

export default useRevenueTracking;