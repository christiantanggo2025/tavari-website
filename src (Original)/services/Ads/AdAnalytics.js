// src/services/Ads/AdAnalytics.js
import { supabase } from '../../supabaseClient';

class AdAnalytics {
  constructor() {
    this.businessId = null;
    this.analyticsQueue = [];
    this.batchSize = 50;
    this.flushInterval = 30000; // 30 seconds
    this.flushTimer = null;
    
    console.log('📊 AdAnalytics created');
  }

  async initialize(businessId) {
    this.businessId = businessId;
    
    // Start batch processing timer
    this.startBatchProcessing();
    
    console.log('📊 AdAnalytics initialized for business:', businessId);
  }

  startBatchProcessing() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushAnalyticsQueue();
    }, this.flushInterval);
  }

  async logEvent(eventType, eventData = {}) {
    if (!this.businessId) {
      console.warn('📊 AdAnalytics not initialized');
      return;
    }

    const event = {
      business_id: this.businessId,
      event_type: eventType,
      event_data: {
        ...eventData,
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        session_id: this.getSessionId()
      },
      created_at: new Date().toISOString()
    };

    // Add to queue for batch processing
    this.analyticsQueue.push(event);

    // Flush immediately for critical events
    if (this.isCriticalEvent(eventType)) {
      await this.flushAnalyticsQueue();
    }

    // Flush if queue is full
    if (this.analyticsQueue.length >= this.batchSize) {
      await this.flushAnalyticsQueue();
    }
  }

  isCriticalEvent(eventType) {
    const criticalEvents = [
      'ad_play_started',
      'ad_play_completed',
      'revenue_generated',
      'api_error',
      'system_error'
    ];
    return criticalEvents.includes(eventType);
  }

  async flushAnalyticsQueue() {
    if (this.analyticsQueue.length === 0) {
      return;
    }

    try {
      const events = [...this.analyticsQueue];
      this.analyticsQueue = [];

      const { error } = await supabase
        .from('music_analytics_events')
        .insert(events);

      if (error) {
        console.error('📊 Error flushing analytics queue:', error);
        // Re-add events to queue for retry
        this.analyticsQueue.unshift(...events);
      } else {
        console.log(`📊 Flushed ${events.length} analytics events`);
      }

    } catch (error) {
      console.error('📊 Error in flushAnalyticsQueue:', error);
    }
  }

  getSessionId() {
    // Generate or retrieve session ID
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('tavari_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('tavari_session_id', sessionId);
      }
      return sessionId;
    }
    return `server_session_${Date.now()}`;
  }

  // Ad Performance Tracking
  async logAdRequest(apiProvider, success, responseTime, details = {}) {
    await this.logEvent('ad_request', {
      api_provider: apiProvider,
      success: success,
      response_time_ms: responseTime,
      details: details
    });
  }

  async logAdPlay(adId, apiProvider, adData = {}) {
    await this.logEvent('ad_play_started', {
      ad_id: adId,
      api_provider: apiProvider,
      ad_duration: adData.duration,
      ad_title: adData.title,
      advertiser: adData.advertiser,
      cpm: adData.cpm
    });
  }

  async logAdCompleted(adId, apiProvider, actualDuration) {
    await this.logEvent('ad_play_completed', {
      ad_id: adId,
      api_provider: apiProvider,
      actual_duration: actualDuration,
      completion_rate: 1.0 // Assume full completion for background music
    });
  }

  async logRevenueGenerated(adPlayId, revenueData) {
    await this.logEvent('revenue_generated', {
      ad_play_id: adPlayId,
      api_provider: revenueData.apiProvider,
      gross_revenue: revenueData.grossRevenue,
      business_payout: revenueData.businessPayout,
      currency: revenueData.currency
    });
  }

  // Error and Performance Tracking
  async logApiError(apiProvider, error, context = {}) {
    await this.logEvent('api_error', {
      api_provider: apiProvider,
      error_message: error.message,
      error_code: error.code,
      context: context
    });
  }

  async logCacheEvent(eventType, apiProvider, cacheKey, details = {}) {
    await this.logEvent('cache_event', {
      cache_event_type: eventType, // hit, miss, eviction, error
      api_provider: apiProvider,
      cache_key: cacheKey,
      details: details
    });
  }

  async logUserAction(action, details = {}) {
    await this.logEvent('user_action', {
      action: action,
      details: details
    });
  }

  // Analytics Queries and Reports
  async getPerformanceMetrics(timeframe = '24h') {
    try {
      const startDate = this.getStartDateForTimeframe(timeframe);
      
      const { data: events, error } = await supabase
        .from('music_analytics_events')
        .select('*')
        .eq('business_id', this.businessId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return this.aggregatePerformanceMetrics(events);
      
    } catch (error) {
      console.error('📊 Error getting performance metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  aggregatePerformanceMetrics(events) {
    const metrics = {
      totalAdRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalAdPlays: 0,
      totalRevenue: 0,
      averageResponseTime: 0,
      fillRate: 0,
      providerBreakdown: {},
      revenueByProvider: {},
      errorsByType: {},
      cachePerformance: { hits: 0, misses: 0, hitRate: 0 }
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    events.forEach(event => {
      const eventType = event.event_type;
      const data = event.event_data;

      switch (eventType) {
        case 'ad_request':
          metrics.totalAdRequests++;
          if (data.success) {
            metrics.successfulRequests++;
          } else {
            metrics.failedRequests++;
          }
          
          if (data.response_time_ms) {
            totalResponseTime += data.response_time_ms;
            responseTimeCount++;
          }

          // Provider breakdown
          const provider = data.api_provider;
          if (!metrics.providerBreakdown[provider]) {
            metrics.providerBreakdown[provider] = { requests: 0, successes: 0 };
          }
          metrics.providerBreakdown[provider].requests++;
          if (data.success) {
            metrics.providerBreakdown[provider].successes++;
          }
          break;

        case 'ad_play_started':
          metrics.totalAdPlays++;
          break;

        case 'revenue_generated':
          metrics.totalRevenue += parseFloat(data.business_payout || 0);
          
          const revProvider = data.api_provider;
          if (!metrics.revenueByProvider[revProvider]) {
            metrics.revenueByProvider[revProvider] = 0;
          }
          metrics.revenueByProvider[revProvider] += parseFloat(data.business_payout || 0);
          break;

        case 'api_error':
          const errorType = data.error_code || 'unknown';
          if (!metrics.errorsByType[errorType]) {
            metrics.errorsByType[errorType] = 0;
          }
          metrics.errorsByType[errorType]++;
          break;

        case 'cache_event':
          if (data.cache_event_type === 'hit') {
            metrics.cachePerformance.hits++;
          } else if (data.cache_event_type === 'miss') {
            metrics.cachePerformance.misses++;
          }
          break;
      }
    });

    // Calculate derived metrics
    metrics.fillRate = metrics.totalAdRequests > 0 
      ? (metrics.successfulRequests / metrics.totalAdRequests) * 100 
      : 0;

    metrics.averageResponseTime = responseTimeCount > 0 
      ? totalResponseTime / responseTimeCount 
      : 0;

    const totalCacheRequests = metrics.cachePerformance.hits + metrics.cachePerformance.misses;
    metrics.cachePerformance.hitRate = totalCacheRequests > 0 
      ? (metrics.cachePerformance.hits / totalCacheRequests) * 100 
      : 0;

    return metrics;
  }

  async getRevenueAnalytics(timeframe = '30d') {
    try {
      const startDate = this.getStartDateForTimeframe(timeframe);
      
      const { data: revenueEvents, error } = await supabase
        .from('music_analytics_events')
        .select('*')
        .eq('business_id', this.businessId)
        .eq('event_type', 'revenue_generated')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      return this.aggregateRevenueAnalytics(revenueEvents, timeframe);
      
    } catch (error) {
      console.error('📊 Error getting revenue analytics:', error);
      return this.getEmptyRevenueAnalytics();
    }
  }

  aggregateRevenueAnalytics(events, timeframe) {
    const analytics = {
      totalRevenue: 0,
      totalPlays: events.length,
      averageRevenuePer: 0,
      revenueByProvider: {},
      revenueByDay: {},
      revenueByHour: {},
      trends: {
        growth: 0,
        bestPerformingProvider: null,
        peakHours: []
      }
    };

    events.forEach(event => {
      const data = event.event_data;
      const revenue = parseFloat(data.business_payout || 0);
      const date = new Date(event.created_at);
      const dayKey = date.toISOString().split('T')[0];
      const hourKey = date.getHours();

      analytics.totalRevenue += revenue;

      // Revenue by provider
      const provider = data.api_provider;
      if (!analytics.revenueByProvider[provider]) {
        analytics.revenueByProvider[provider] = { revenue: 0, plays: 0 };
      }
      analytics.revenueByProvider[provider].revenue += revenue;
      analytics.revenueByProvider[provider].plays++;

      // Revenue by day
      if (!analytics.revenueByDay[dayKey]) {
        analytics.revenueByDay[dayKey] = 0;
      }
      analytics.revenueByDay[dayKey] += revenue;

      // Revenue by hour
      if (!analytics.revenueByHour[hourKey]) {
        analytics.revenueByHour[hourKey] = 0;
      }
      analytics.revenueByHour[hourKey] += revenue;
    });

    analytics.averageRevenuePer = analytics.totalPlays > 0 
      ? analytics.totalRevenue / analytics.totalPlays 
      : 0;

    // Find best performing provider
    let bestProvider = null;
    let bestRevenue = 0;
    Object.entries(analytics.revenueByProvider).forEach(([provider, data]) => {
      if (data.revenue > bestRevenue) {
        bestRevenue = data.revenue;
        bestProvider = provider;
      }
    });
    analytics.trends.bestPerformingProvider = bestProvider;

    // Find peak hours (top 3)
    const hourlyRevenue = Object.entries(analytics.revenueByHour)
      .map(([hour, revenue]) => ({ hour: parseInt(hour), revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
    analytics.trends.peakHours = hourlyRevenue;

    // Calculate growth trend (compare first half vs second half of period)
    const sortedDays = Object.entries(analytics.revenueByDay).sort();
    if (sortedDays.length >= 2) {
      const midPoint = Math.floor(sortedDays.length / 2);
      const firstHalf = sortedDays.slice(0, midPoint).reduce((sum, [, revenue]) => sum + revenue, 0);
      const secondHalf = sortedDays.slice(midPoint).reduce((sum, [, revenue]) => sum + revenue, 0);
      
      if (firstHalf > 0) {
        analytics.trends.growth = ((secondHalf - firstHalf) / firstHalf) * 100;
      }
    }

    return analytics;
  }

  async getUserBehaviorAnalytics(timeframe = '7d') {
    try {
      const startDate = this.getStartDateForTimeframe(timeframe);
      
      const { data: userEvents, error } = await supabase
        .from('music_analytics_events')
        .select('*')
        .eq('business_id', this.businessId)
        .eq('event_type', 'user_action')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      return this.aggregateUserBehavior(userEvents);
      
    } catch (error) {
      console.error('📊 Error getting user behavior analytics:', error);
      return this.getEmptyUserBehavior();
    }
  }

  aggregateUserBehavior(events) {
    const behavior = {
      totalActions: events.length,
      actionsByType: {},
      sessionAnalysis: {},
      timePatterns: {},
      engagementMetrics: {
        averageSessionDuration: 0,
        actionsPerSession: 0,
        returningSessions: 0
      }
    };

    const sessions = {};

    events.forEach(event => {
      const data = event.event_data;
      const sessionId = data.session_id;
      const action = data.action;
      const timestamp = new Date(event.created_at);

      // Action type tracking
      if (!behavior.actionsByType[action]) {
        behavior.actionsByType[action] = 0;
      }
      behavior.actionsByType[action]++;

      // Session tracking
      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          actions: 0,
          startTime: timestamp,
          endTime: timestamp,
          uniqueActions: new Set()
        };
      }

      sessions[sessionId].actions++;
      sessions[sessionId].endTime = timestamp;
      sessions[sessionId].uniqueActions.add(action);

      // Time pattern analysis
      const hour = timestamp.getHours();
      if (!behavior.timePatterns[hour]) {
        behavior.timePatterns[hour] = 0;
      }
      behavior.timePatterns[hour]++;
    });

    // Analyze sessions
    const sessionValues = Object.values(sessions);
    if (sessionValues.length > 0) {
      const totalDuration = sessionValues.reduce((sum, session) => {
        return sum + (session.endTime - session.startTime);
      }, 0);

      const totalActions = sessionValues.reduce((sum, session) => sum + session.actions, 0);

      behavior.engagementMetrics.averageSessionDuration = totalDuration / sessionValues.length / 1000; // seconds
      behavior.engagementMetrics.actionsPerSession = totalActions / sessionValues.length;
      behavior.engagementMetrics.returningSessions = sessionValues.filter(s => s.actions > 1).length;
    }

    behavior.sessionAnalysis = {
      totalSessions: sessionValues.length,
      activeSessions: sessionValues.filter(s => s.actions >= 3).length,
      shortSessions: sessionValues.filter(s => s.actions === 1).length
    };

    return behavior;
  }

  getStartDateForTimeframe(timeframe) {
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  getEmptyMetrics() {
    return {
      totalAdRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalAdPlays: 0,
      totalRevenue: 0,
      averageResponseTime: 0,
      fillRate: 0,
      providerBreakdown: {},
      revenueByProvider: {},
      errorsByType: {},
      cachePerformance: { hits: 0, misses: 0, hitRate: 0 }
    };
  }

  getEmptyRevenueAnalytics() {
    return {
      totalRevenue: 0,
      totalPlays: 0,
      averageRevenuePer: 0,
      revenueByProvider: {},
      revenueByDay: {},
      revenueByHour: {},
      trends: {
        growth: 0,
        bestPerformingProvider: null,
        peakHours: []
      }
    };
  }

  getEmptyUserBehavior() {
    return {
      totalActions: 0,
      actionsByType: {},
      sessionAnalysis: {
        totalSessions: 0,
        activeSessions: 0,
        shortSessions: 0
      },
      timePatterns: {},
      engagementMetrics: {
        averageSessionDuration: 0,
        actionsPerSession: 0,
        returningSessions: 0
      }
    };
  }

  // Real-time Analytics
  async getRealtimeStats() {
    try {
      const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
      
      const { data: recentEvents, error } = await supabase
        .from('music_analytics_events')
        .select('*')
        .eq('business_id', this.businessId)
        .gte('created_at', last5Minutes.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        recentAdPlays: recentEvents.filter(e => e.event_type === 'ad_play_started').length,
        recentRequests: recentEvents.filter(e => e.event_type === 'ad_request').length,
        recentRevenue: recentEvents
          .filter(e => e.event_type === 'revenue_generated')
          .reduce((sum, e) => sum + parseFloat(e.event_data.business_payout || 0), 0),
        recentErrors: recentEvents.filter(e => e.event_type === 'api_error').length,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('📊 Error getting realtime stats:', error);
      return {
        recentAdPlays: 0,
        recentRequests: 0,
        recentRevenue: 0,
        recentErrors: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // Export Analytics Data
  async exportAnalyticsData(timeframe = '30d', format = 'json') {
    try {
      const startDate = this.getStartDateForTimeframe(timeframe);
      
      const { data: events, error } = await supabase
        .from('music_analytics_events')
        .select('*')
        .eq('business_id', this.businessId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const exportData = {
        exportDate: new Date().toISOString(),
        timeframe: timeframe,
        businessId: this.businessId,
        totalEvents: events.length,
        events: events
      };

      if (format === 'csv') {
        return this.convertToCSV(events);
      }

      return exportData;
      
    } catch (error) {
      console.error('📊 Error exporting analytics data:', error);
      return null;
    }
  }

  convertToCSV(events) {
    if (events.length === 0) return '';

    const headers = ['timestamp', 'event_type', 'api_provider', 'revenue', 'details'];
    const rows = events.map(event => [
      event.created_at,
      event.event_type,
      event.event_data.api_provider || '',
      event.event_data.business_payout || event.event_data.gross_revenue || '',
      JSON.stringify(event.event_data)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Anomaly Detection
  async detectAnomalies(metricType = 'revenue') {
    try {
      const last30Days = this.getStartDateForTimeframe('30d');
      
      const { data: events, error } = await supabase
        .from('music_analytics_events')
        .select('*')
        .eq('business_id', this.businessId)
        .gte('created_at', last30Days.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      return this.analyzeAnomalies(events, metricType);
      
    } catch (error) {
      console.error('📊 Error detecting anomalies:', error);
      return { anomalies: [], confidence: 0 };
    }
  }

  analyzeAnomalies(events, metricType) {
    const anomalies = [];
    
    // Group events by day
    const dailyMetrics = {};
    
    events.forEach(event => {
      const date = event.created_at.split('T')[0];
      if (!dailyMetrics[date]) {
        dailyMetrics[date] = { revenue: 0, requests: 0, errors: 0 };
      }

      switch (event.event_type) {
        case 'revenue_generated':
          dailyMetrics[date].revenue += parseFloat(event.event_data.business_payout || 0);
          break;
        case 'ad_request':
          dailyMetrics[date].requests++;
          break;
        case 'api_error':
          dailyMetrics[date].errors++;
          break;
      }
    });

    const values = Object.values(dailyMetrics).map(m => m[metricType]);
    if (values.length < 7) {
      return { anomalies: [], confidence: 0 }; // Need at least 7 days of data
    }

    // Calculate mean and standard deviation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Find anomalies (values beyond 2 standard deviations)
    const threshold = 2;
    Object.entries(dailyMetrics).forEach(([date, metrics]) => {
      const value = metrics[metricType];
      const zScore = Math.abs((value - mean) / stdDev);
      
      if (zScore > threshold) {
        anomalies.push({
          date: date,
          value: value,
          expected: mean,
          severity: zScore > 3 ? 'high' : 'medium',
          type: value > mean ? 'spike' : 'drop',
          zScore: zScore
        });
      }
    });

    return {
      anomalies: anomalies.sort((a, b) => new Date(b.date) - new Date(a.date)),
      confidence: Math.min(values.length / 30, 1), // Confidence based on data quantity
      baseline: { mean, stdDev },
      metricType
    };
  }

  // Cleanup
  async destroy() {
    // Flush any remaining events
    await this.flushAnalyticsQueue();
    
    // Clear timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.businessId = null;
    console.log('📊 AdAnalytics destroyed');
  }
}

export default AdAnalytics;