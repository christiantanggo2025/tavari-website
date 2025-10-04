// hooks/useTOSAMultiBusinessData.js - Multi-Business Data Hook for TOSA
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * TOSA Multi-Business Data Hook
 * Provides cross-business data access and management for Tavari employees
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.selectedBusinessId - Currently selected business ID
 * @param {boolean} options.autoLoad - Auto-load data on mount (default: true)
 * @param {string} options.componentName - Component name for logging
 * @returns {Object} Multi-business data and methods
 */
export const useTOSAMultiBusinessData = (options = {}) => {
  const {
    selectedBusinessId = null,
    autoLoad = true,
    componentName = 'TOSAComponent'
  } = options;

  // State management
  const [businesses, setBusinesses] = useState([]);
  const [businessData, setBusinessData] = useState({});
  const [aggregatedStats, setAggregatedStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (autoLoad) {
      loadAllBusinesses();
    }
  }, [autoLoad]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadBusinessDetails(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  /**
   * Load all businesses in the system
   */
  const loadAllBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: businessError } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          is_active,
          subscription_status,
          last_login,
          business_settings (
            business_type,
            timezone,
            currency
          ),
          user_roles!inner (
            id
          )
        `)
        .order('created_at', { ascending: false });

      if (businessError) throw businessError;

      setBusinesses(data || []);
      await calculateAggregatedStats(data || []);

    } catch (err) {
      console.error('Error loading businesses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load detailed data for a specific business
   */
  const loadBusinessDetails = useCallback(async (businessId) => {
    if (!businessId) return;

    try {
      // Load comprehensive business data
      const [
        businessResult,
        employeesResult,
        transactionsResult,
        securityResult,
        modulesResult
      ] = await Promise.all([
        // Basic business info
        supabase
          .from('businesses')
          .select(`
            *,
            business_settings (*),
            business_subscriptions (*)
          `)
          .eq('id', businessId)
          .single(),

        // Employee count
        supabase
          .from('user_roles')
          .select('id')
          .eq('business_id', businessId)
          .eq('active', true),

        // Recent transaction stats (if POS module exists)
        supabase
          .from('pos_transactions')
          .select('total_amount, created_at')
          .eq('business_id', businessId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1000),

        // Security events (last 7 days)
        supabase
          .from('security_audit_logs')
          .select('severity, event_type, created_at')
          .eq('business_id', businessId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

        // Module usage
        supabase
          .from('business_module_usage')
          .select('module_name, usage_count, last_used')
          .eq('business_id', businessId)
      ]);

      const businessDetails = {
        info: businessResult.data,
        employeeCount: employeesResult.data?.length || 0,
        transactionStats: calculateTransactionStats(transactionsResult.data || []),
        securityEvents: securityResult.data || [],
        moduleUsage: modulesResult.data || [],
        lastUpdated: new Date().toISOString()
      };

      setBusinessData(prev => ({
        ...prev,
        [businessId]: businessDetails
      }));

    } catch (err) {
      console.error('Error loading business details:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Calculate transaction statistics
   */
  const calculateTransactionStats = (transactions) => {
    if (!transactions.length) {
      return {
        totalRevenue: 0,
        transactionCount: 0,
        averageTransaction: 0,
        dailyAverage: 0
      };
    }

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const transactionCount = transactions.length;
    const averageTransaction = totalRevenue / transactionCount;

    // Calculate daily average (last 30 days)
    const uniqueDays = new Set(
      transactions.map(t => new Date(t.created_at).toDateString())
    ).size;
    const dailyAverage = totalRevenue / Math.max(uniqueDays, 1);

    return {
      totalRevenue,
      transactionCount,
      averageTransaction,
      dailyAverage
    };
  };

  /**
   * Calculate aggregated statistics across all businesses
   */
  const calculateAggregatedStats = useCallback(async (businessList) => {
    try {
      const stats = {
        totalBusinesses: businessList.length,
        activeBusinesses: businessList.filter(b => b.is_active).length,
        totalEmployees: 0,
        subscriptionBreakdown: {},
        businessTypeBreakdown: {},
        recentSignups: 0,
        monthlyGrowth: 0
      };

      // Calculate subscription breakdown
      businessList.forEach(business => {
        const status = business.subscription_status || 'unknown';
        stats.subscriptionBreakdown[status] = (stats.subscriptionBreakdown[status] || 0) + 1;

        const type = business.business_settings?.business_type || 'unknown';
        stats.businessTypeBreakdown[type] = (stats.businessTypeBreakdown[type] || 0) + 1;
      });

      // Count total employees across all businesses
      const { data: employeeData } = await supabase
        .from('user_roles')
        .select('business_id')
        .eq('active', true);

      stats.totalEmployees = employeeData?.length || 0;

      // Recent signups (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      stats.recentSignups = businessList.filter(
        b => new Date(b.created_at) > thirtyDaysAgo
      ).length;

      // Monthly growth calculation
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const previousMonthSignups = businessList.filter(
        b => new Date(b.created_at) > sixtyDaysAgo && new Date(b.created_at) <= thirtyDaysAgo
      ).length;

      if (previousMonthSignups > 0) {
        stats.monthlyGrowth = ((stats.recentSignups - previousMonthSignups) / previousMonthSignups) * 100;
      }

      setAggregatedStats(stats);

    } catch (err) {
      console.error('Error calculating aggregated stats:', err);
    }
  }, []);

  /**
   * Search businesses by various criteria
   */
  const searchBusinesses = useCallback(async (searchTerm, filters = {}) => {
    try {
      let query = supabase
        .from('businesses')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          is_active,
          subscription_status,
          business_settings (
            business_type,
            timezone
          )
        `);

      // Apply text search
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      // Apply filters
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters.subscriptionStatus) {
        query = query.eq('subscription_status', filters.subscriptionStatus);
      }

      if (filters.businessType) {
        query = query.eq('business_settings.business_type', filters.businessType);
      }

      if (filters.createdAfter) {
        query = query.gte('created_at', filters.createdAfter);
      }

      if (filters.createdBefore) {
        query = query.lte('created_at', filters.createdBefore);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      return data || [];

    } catch (err) {
      console.error('Error searching businesses:', err);
      throw err;
    }
  }, []);

  /**
   * Get security summary across all businesses
   */
  const getSecuritySummary = useCallback(async (timeRange = 7) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('business_id, severity, event_type, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const summary = {
        totalEvents: data.length,
        criticalEvents: data.filter(e => e.severity === 'critical').length,
        highEvents: data.filter(e => e.severity === 'high').length,
        eventsByType: {},
        eventsByBusiness: {},
        timeline: {}
      };

      data.forEach(event => {
        // Count by type
        summary.eventsByType[event.event_type] = (summary.eventsByType[event.event_type] || 0) + 1;

        // Count by business
        if (event.business_id) {
          summary.eventsByBusiness[event.business_id] = (summary.eventsByBusiness[event.business_id] || 0) + 1;
        }

        // Timeline data
        const date = new Date(event.created_at).toDateString();
        summary.timeline[date] = (summary.timeline[date] || 0) + 1;
      });

      return summary;

    } catch (err) {
      console.error('Error getting security summary:', err);
      throw err;
    }
  }, []);

  /**
   * Update business information
   */
  const updateBusiness = useCallback(async (businessId, updates) => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setBusinesses(prev => 
        prev.map(b => b.id === businessId ? { ...b, ...data } : b)
      );

      // Reload business details
      await loadBusinessDetails(businessId);

      return data;

    } catch (err) {
      console.error('Error updating business:', err);
      throw err;
    }
  }, [loadBusinessDetails]);

  /**
   * Get business analytics data
   */
  const getBusinessAnalytics = useCallback(async (businessId, timeRange = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const [logins, transactions, employees] = await Promise.all([
        // Login activity
        supabase
          .from('audit_logs')
          .select('created_at, event_type')
          .eq('business_id', businessId)
          .in('event_type', ['login', 'logout'])
          .gte('created_at', startDate.toISOString()),

        // Transaction data
        supabase
          .from('pos_transactions')
          .select('total_amount, created_at')
          .eq('business_id', businessId)
          .gte('created_at', startDate.toISOString()),

        // Employee activity
        supabase
          .from('user_roles')
          .select('last_login, created_at')
          .eq('business_id', businessId)
          .eq('active', true)
      ]);

      return {
        loginActivity: logins.data || [],
        transactionData: transactions.data || [],
        employeeData: employees.data || []
      };

    } catch (err) {
      console.error('Error getting business analytics:', err);
      throw err;
    }
  }, []);

  return {
    // Data state
    businesses,
    businessData,
    aggregatedStats,
    loading,
    error,

    // Core methods
    loadAllBusinesses,
    loadBusinessDetails,
    searchBusinesses,
    updateBusiness,

    // Analytics methods
    getSecuritySummary,
    getBusinessAnalytics,

    // Utility methods
    refreshData: () => {
      loadAllBusinesses();
      if (selectedBusinessId) {
        loadBusinessDetails(selectedBusinessId);
      }
    },
    clearError: () => setError(null),

    // Computed values
    activeBusinessCount: businesses.filter(b => b.is_active).length,
    totalBusinessCount: businesses.length,
    selectedBusinessData: selectedBusinessId ? businessData[selectedBusinessId] : null
  };
};

export default useTOSAMultiBusinessData;