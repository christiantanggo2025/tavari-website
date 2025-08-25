// src/components/Ads/RevenueTracker.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../hooks/useBusiness';
import { useUserProfile } from '../../hooks/useUserProfile';

const RevenueTracker = ({ refreshInterval = 30000, showAdvanced = true }) => {
  const { business } = useBusiness();
  const { profile } = useUserProfile();
  
  // State Management
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    totalPlays: 0,
    revenueByProvider: {},
    revenueByDay: [],
    averageCPM: 0,
    fillRate: 0,
    topPerformingAds: [],
    revenueByHour: []
  });
  
  const [timeframe, setTimeframe] = useState('7days');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [error, setError] = useState(null);
  
  const [realTimeStats, setRealTimeStats] = useState({
    recentAdPlays: 0,
    recentRevenue: 0,
    lastUpdated: null,
    currentCPM: 0,
    activeCampaigns: 0
  });

  const [payoutData, setPayoutData] = useState({
    pendingAmount: 0,
    paidAmount: 0,
    nextPayoutDate: null,
    payoutHistory: []
  });

  const [analyticsData, setAnalyticsData] = useState({
    conversionRate: 0,
    audienceRetention: 0,
    peakHours: [],
    seasonalTrends: []
  });

  const timeframeOptions = [
    { label: 'Today', value: 'today' },
    { label: '7 Days', value: '7days' },
    { label: '30 Days', value: '30days' },
    { label: '90 Days', value: '90days' },
    { label: 'Year', value: 'year' }
  ];

  const metricOptions = [
    { label: 'Revenue', value: 'revenue' },
    { label: 'Ad Plays', value: 'plays' },
    { label: 'CPM', value: 'cpm' },
    { label: 'Fill Rate', value: 'fillrate' }
  ];

  // Load data on component mount and timeframe change
  useEffect(() => {
    if (business?.id) {
      loadAllData();
      
      // Set up refresh interval
      const interval = setInterval(() => {
        loadRealTimeStats();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [timeframe, business?.id, refreshInterval]);

  // Data Loading Functions
  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadRevenueData(),
        loadRealTimeStats(),
        loadPayoutData(),
        loadAnalyticsData()
      ]);
    } catch (err) {
      console.error('Error loading revenue tracker data:', err);
      setError('Failed to load revenue data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRevenueData = async () => {
    if (!business?.id) return;

    try {
      const dateRange = getDateRange(timeframe);
      
      // Load revenue and plays data
      const { data: revenueRecords, error: revenueError } = await supabase
        .from('music_ad_revenue_detailed')
        .select(`
          *,
          music_ad_plays!inner (
            played_at,
            ad_id,
            music_ads (
              title,
              advertiser,
              cpm,
              duration
            )
          )
        `)
        .eq('business_id', business.id)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false });

      if (revenueError) throw revenueError;

      // Load ad performance data
      const { data: performanceData, error: perfError } = await supabase
        .from('music_api_performance')
        .select('*')
        .eq('business_id', business.id)
        .gte('date_recorded', dateRange.start.split('T')[0])
        .lte('date_recorded', dateRange.end.split('T')[0]);

      if (perfError) throw perfError;

      // Process the data
      processRevenueData(revenueRecords || [], performanceData || []);
      
    } catch (error) {
      console.error('Error loading revenue data:', error);
      throw error;
    }
  };

  const loadRealTimeStats = async () => {
    if (!business?.id) return;

    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Get recent plays
      const { count: recentPlays, error: playsError } = await supabase
        .from('music_ad_plays')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('played_at', fiveMinutesAgo.toISOString());

      if (playsError) throw playsError;

      // Get recent revenue
      const { data: recentRevenue, error: revenueError } = await supabase
        .from('music_ad_revenue_detailed')
        .select('business_payout')
        .eq('business_id', business.id)
        .gte('created_at', fiveMinutesAgo.toISOString());

      if (revenueError) throw revenueError;

      // Get current CPM
      const { data: currentAds, error: adsError } = await supabase
        .from('music_ads')
        .select('cpm')
        .eq('active', true)
        .limit(10);

      if (adsError) throw adsError;

      // Get active campaigns count
      const { count: activeCampaigns, error: campaignError } = await supabase
        .from('music_ad_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('active', true);

      if (campaignError) throw campaignError;

      const totalRecentRevenue = recentRevenue?.reduce((sum, record) => 
        sum + parseFloat(record.business_payout || 0), 0) || 0;
      
      const avgCurrentCPM = currentAds?.length > 0 
        ? currentAds.reduce((sum, ad) => sum + parseFloat(ad.cpm || 0), 0) / currentAds.length
        : 0;

      setRealTimeStats({
        recentAdPlays: recentPlays || 0,
        recentRevenue: totalRecentRevenue,
        lastUpdated: new Date().toISOString(),
        currentCPM: avgCurrentCPM,
        activeCampaigns: activeCampaigns || 0
      });
      
    } catch (error) {
      console.error('Error loading real-time stats:', error);
    }
  };

  const loadPayoutData = async () => {
    if (!business?.id) return;

    try {
      // Load payout records
      const { data: payouts, error: payoutError } = await supabase
        .from('music_ad_payouts')
        .select('*')
        .eq('business_id', business.id)
        .order('payout_date', { ascending: false });

      if (payoutError) throw payoutError;

      // Calculate pending revenue
      const { data: pendingRevenue, error: pendingError } = await supabase
        .from('music_ad_revenue_detailed')
        .select('business_payout')
        .eq('business_id', business.id)
        .eq('payout_status', 'pending');

      if (pendingError) throw pendingError;

      const pendingAmount = pendingRevenue?.reduce((sum, record) => 
        sum + parseFloat(record.business_payout || 0), 0) || 0;

      const paidAmount = payouts?.reduce((sum, payout) => 
        sum + parseFloat(payout.amount || 0), 0) || 0;

      // Calculate next payout date (assuming monthly payouts on the 15th)
      const now = new Date();
      const nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      if (now.getDate() >= 15) {
        nextPayout.setMonth(nextPayout.getMonth() + 1);
      }

      setPayoutData({
        pendingAmount,
        paidAmount,
        nextPayoutDate: nextPayout.toISOString(),
        payoutHistory: payouts || []
      });
      
    } catch (error) {
      console.error('Error loading payout data:', error);
    }
  };

  const loadAnalyticsData = async () => {
    if (!business?.id) return;

    try {
      const dateRange = getDateRange(timeframe);

      // Load conversion and retention data
      const { data: analyticsRecords, error } = await supabase
        .from('music_ad_analytics')
        .select('*')
        .eq('business_id', business.id)
        .gte('date_recorded', dateRange.start.split('T')[0])
        .lte('date_recorded', dateRange.end.split('T')[0]);

      if (error) throw error;

      // Process analytics data
      const avgConversion = analyticsRecords?.length > 0
        ? analyticsRecords.reduce((sum, record) => sum + (record.conversion_rate || 0), 0) / analyticsRecords.length
        : 0;

      const avgRetention = analyticsRecords?.length > 0
        ? analyticsRecords.reduce((sum, record) => sum + (record.audience_retention || 0), 0) / analyticsRecords.length
        : 0;

      setAnalyticsData({
        conversionRate: avgConversion,
        audienceRetention: avgRetention,
        peakHours: calculatePeakHours(analyticsRecords || []),
        seasonalTrends: calculateSeasonalTrends(analyticsRecords || [])
      });
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  // Data Processing Functions
  const processRevenueData = (revenueRecords, performanceData) => {
    const totalRevenue = revenueRecords.reduce((sum, record) => 
      sum + parseFloat(record.business_payout || 0), 0);

    const totalPlays = revenueRecords.length;

    const revenueByProvider = {};
    const revenueByDay = {};
    const revenueByHour = Array(24).fill(0);

    revenueRecords.forEach(record => {
      const provider = record.api_provider || 'unknown';
      const date = record.created_at.split('T')[0];
      const hour = new Date(record.created_at).getHours();
      const amount = parseFloat(record.business_payout || 0);

      // Group by provider
      revenueByProvider[provider] = (revenueByProvider[provider] || 0) + amount;

      // Group by day
      if (!revenueByDay[date]) {
        revenueByDay[date] = { date, revenue: 0, plays: 0 };
      }
      revenueByDay[date].revenue += amount;
      revenueByDay[date].plays += 1;

      // Group by hour
      revenueByHour[hour] += amount;
    });

    // Calculate average CPM
    const totalCPM = revenueRecords.reduce((sum, record) => {
      const cpm = record.music_ad_plays?.music_ads?.cpm || 0;
      return sum + parseFloat(cpm);
    }, 0);
    const averageCPM = totalPlays > 0 ? totalCPM / totalPlays : 0;

    // Calculate fill rate from performance data
    const totalRequests = performanceData.reduce((sum, record) => 
      sum + (record.total_requests || 0), 0);
    const successfulRequests = performanceData.reduce((sum, record) => 
      sum + (record.successful_requests || 0), 0);
    const fillRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    // Get top performing ads
    const adPerformance = {};
    revenueRecords.forEach(record => {
      const adId = record.music_ad_plays?.ad_id;
      const adData = record.music_ad_plays?.music_ads;
      if (adId && adData) {
        if (!adPerformance[adId]) {
          adPerformance[adId] = {
            id: adId,
            title: adData.title,
            advertiser: adData.advertiser,
            revenue: 0,
            plays: 0,
            cpm: parseFloat(adData.cpm || 0)
          };
        }
        adPerformance[adId].revenue += parseFloat(record.business_payout || 0);
        adPerformance[adId].plays += 1;
      }
    });

    const topPerformingAds = Object.values(adPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    setRevenueData({
      totalRevenue,
      totalPlays,
      revenueByProvider,
      revenueByDay: Object.values(revenueByDay).sort((a, b) => a.date.localeCompare(b.date)),
      averageCPM,
      fillRate,
      topPerformingAds,
      revenueByHour
    });
  };

  const calculatePeakHours = (analyticsRecords) => {
    const hourlyData = Array(24).fill(0);
    analyticsRecords.forEach(record => {
      if (record.peak_hour !== null) {
        hourlyData[record.peak_hour] += 1;
      }
    });
    
    return hourlyData.map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const calculateSeasonalTrends = (analyticsRecords) => {
    const monthlyData = {};
    analyticsRecords.forEach(record => {
      const month = new Date(record.date_recorded).getMonth();
      monthlyData[month] = (monthlyData[month] || 0) + (record.total_revenue || 0);
    });
    
    return Object.entries(monthlyData).map(([month, revenue]) => ({
      month: parseInt(month),
      revenue
    }));
  };

  // Utility Functions
  const getDateRange = (timeframe) => {
    const now = new Date();
    const start = new Date();

    switch (timeframe) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start.setDate(now.getDate() - 7);
        break;
      case '30days':
        start.setDate(now.getDate() - 30);
        break;
      case '90days':
        start.setDate(now.getDate() - 90);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 7);
    }

    return {
      start: start.toISOString(),
      end: now.toISOString()
    };
  };

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

  const getProjectedEarnings = () => {
    if (timeframe === 'today') {
      const dailyRate = revenueData.totalRevenue;
      return {
        weekly: dailyRate * 7,
        monthly: dailyRate * 30,
        yearly: dailyRate * 365
      };
    } else if (timeframe === '7days') {
      const weeklyRate = revenueData.totalRevenue;
      return {
        weekly: weeklyRate,
        monthly: weeklyRate * 4.33,
        yearly: weeklyRate * 52
      };
    } else {
      const monthlyRate = revenueData.totalRevenue;
      return {
        weekly: monthlyRate / 4.33,
        monthly: monthlyRate,
        yearly: monthlyRate * 12
      };
    }
  };

  const getPerformanceIndicator = () => {
    const avgCPM = revenueData.averageCPM;
    
    if (avgCPM >= 0.020) {
      return { level: 'excellent', color: '#4caf50', text: 'Excellent' };
    } else if (avgCPM >= 0.015) {
      return { level: 'good', color: '#8bc34a', text: 'Good' };
    } else if (avgCPM >= 0.010) {
      return { level: 'average', color: '#ff9800', text: 'Average' };
    } else {
      return { level: 'low', color: '#f44336', text: 'Low' };
    }
  };

  const exportData = async (format) => {
    try {
      const exportData = {
        timeframe,
        generatedAt: new Date().toISOString(),
        summary: {
          totalRevenue: revenueData.totalRevenue,
          totalPlays: revenueData.totalPlays,
          averageCPM: revenueData.averageCPM,
          fillRate: revenueData.fillRate
        },
        revenueByProvider: revenueData.revenueByProvider,
        revenueByDay: revenueData.revenueByDay,
        topPerformingAds: revenueData.topPerformingAds,
        payoutData: payoutData
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        downloadFile(blob, `revenue-report-${timeframe}.json`);
      } else if (format === 'csv') {
        const csvData = convertToCSV(exportData);
        const blob = new Blob([csvData], { type: 'text/csv' });
        downloadFile(blob, `revenue-report-${timeframe}.csv`);
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const convertToCSV = (data) => {
    const headers = ['Date', 'Revenue', 'Plays', 'Provider', 'CPM'];
    const rows = data.revenueByDay.map(day => [
      day.date,
      day.revenue,
      day.plays,
      'Combined',
      (day.revenue / Math.max(day.plays, 1)).toFixed(4)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const openProviderDetails = (provider) => {
    setSelectedProvider(provider);
    setShowDetailsModal(true);
  };

  const projections = getProjectedEarnings();
  const performance = getPerformanceIndicator();

  if (isLoading && revenueData.totalRevenue === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <div style={styles.loadingText}>Loading revenue data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorText}>{error}</div>
        <button onClick={loadAllData} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Controls */}
      <div style={styles.headerControls}>
        <div style={styles.timeframeSelector}>
          {timeframeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setTimeframe(option.value)}
              style={{
                ...styles.timeframeButton,
                ...(timeframe === option.value ? styles.timeframeButtonActive : {})
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        <div style={styles.headerActions}>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            style={styles.exportButton}
          >
            📊 Export Data
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Live Stats</h3>
          <span style={styles.lastUpdated}>
            {realTimeStats.lastUpdated 
              ? `Updated ${new Date(realTimeStats.lastUpdated).toLocaleTimeString()}`
              : 'Loading...'
            }
          </span>
        </div>
        
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{realTimeStats.recentAdPlays}</div>
            <div style={styles.statLabel}>Ads (5min)</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{formatCurrency(realTimeStats.recentRevenue)}</div>
            <div style={styles.statLabel}>Revenue (5min)</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{formatCurrency(realTimeStats.currentCPM)}</div>
            <div style={styles.statLabel}>Current CPM</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{realTimeStats.activeCampaigns}</div>
            <div style={styles.statLabel}>Active Campaigns</div>
          </div>
        </div>
      </div>

      {/* Main Revenue Summary */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Revenue Summary - {timeframeOptions.find(t => t.value === timeframe)?.label}</h3>
          <div style={styles.performanceIndicator}>
            <span style={styles.performanceLabel}>Performance:</span>
            <span style={{
              ...styles.performanceChip,
              backgroundColor: performance.color + '20',
              color: performance.color
            }}>
              {performance.text}
            </span>
          </div>
        </div>
        
        <div style={styles.mainStatsGrid}>
          <div style={styles.primaryStat}>
            <div style={styles.primaryValue}>{formatCurrency(revenueData.totalRevenue)}</div>
            <div style={styles.primaryLabel}>Total Revenue</div>
          </div>
          
          <div style={styles.secondaryStats}>
            <div style={styles.secondaryStat}>
              <div style={styles.secondaryValue}>{formatNumber(revenueData.totalPlays)}</div>
              <div style={styles.secondaryLabel}>Ad Plays</div>
            </div>
            <div style={styles.secondaryStat}>
              <div style={styles.secondaryValue}>{formatCurrency(revenueData.averageCPM)}</div>
              <div style={styles.secondaryLabel}>Avg CPM</div>
            </div>
            <div style={styles.secondaryStat}>
              <div style={styles.secondaryValue}>{revenueData.fillRate.toFixed(1)}%</div>
              <div style={styles.secondaryLabel}>Fill Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Provider */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Revenue by Provider</h3>
        </div>
        
        {Object.keys(revenueData.revenueByProvider).length === 0 ? (
          <div style={styles.noDataText}>No revenue data available</div>
        ) : (
          <div style={styles.providerList}>
            {Object.entries(revenueData.revenueByProvider)
              .sort(([,a], [,b]) => b - a)
              .map(([provider, revenue]) => {
                const percentage = revenueData.totalRevenue > 0 
                  ? (revenue / revenueData.totalRevenue) * 100 
                  : 0;
                
                return (
                  <div 
                    key={provider} 
                    style={styles.providerItem}
                    onClick={() => openProviderDetails(provider)}
                  >
                    <div style={styles.providerInfo}>
                      <div style={styles.providerName}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </div>
                      <div style={styles.providerPercentage}>
                        {percentage.toFixed(1)}% of total revenue
                      </div>
                    </div>
                    <div style={styles.providerRevenue}>
                      {formatCurrency(revenue)}
                    </div>
                    <div style={styles.progressBar}>
                      <div 
                        style={{
                          ...styles.progressFill,
                          width: `${percentage}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}
      </div>

      {/* Revenue Chart */}
      {revenueData.revenueByDay.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Revenue Trend</h3>
            <div style={styles.metricSelector}>
              {metricOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedMetric(option.value)}
                  style={{
                    ...styles.metricButton,
                    ...(selectedMetric === option.value ? styles.metricButtonActive : {})
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          <div style={styles.chartContainer}>
            <svg width="100%" height="300" viewBox="0 0 800 300">
              {/* Simple line chart implementation */}
              {revenueData.revenueByDay.map((day, index) => {
                const x = (index / (revenueData.revenueByDay.length - 1)) * 760 + 20;
                const value = selectedMetric === 'revenue' ? day.revenue :
                             selectedMetric === 'plays' ? day.plays :
                             selectedMetric === 'cpm' ? (day.revenue / Math.max(day.plays, 1)) :
                             (day.plays / Math.max(day.plays, 1)) * 100;
                const maxValue = Math.max(...revenueData.revenueByDay.map(d => 
                  selectedMetric === 'revenue' ? d.revenue :
                  selectedMetric === 'plays' ? d.plays :
                  selectedMetric === 'cpm' ? (d.revenue / Math.max(d.plays, 1)) :
                  100
                ));
                const y = 280 - (value / maxValue) * 260;
                
                return (
                  <g key={index}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#009688"
                    />
                    {index > 0 && (
                      <line
                        x1={(index - 1) / (revenueData.revenueByDay.length - 1) * 760 + 20}
                        y1={280 - (
                          selectedMetric === 'revenue' ? revenueData.revenueByDay[index - 1].revenue :
                          selectedMetric === 'plays' ? revenueData.revenueByDay[index - 1].plays :
                          selectedMetric === 'cpm' ? (revenueData.revenueByDay[index - 1].revenue / Math.max(revenueData.revenueByDay[index - 1].plays, 1)) :
                          100
                        ) / maxValue * 260}
                        x2={x}
                        y2={y}
                        stroke="#009688"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Projections */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Projected Earnings</h3>
          <span style={styles.projectionNote}>
            Based on current {timeframe} performance
          </span>
        </div>
        
        <div style={styles.projectionsGrid}>
          <div style={styles.projectionItem}>
            <div style={styles.projectionValue}>{formatCurrency(projections.weekly)}</div>
            <div style={styles.projectionLabel}>Weekly</div>
          </div>
          <div style={styles.projectionItem}>
            <div style={styles.projectionValue}>{formatCurrency(projections.monthly)}</div>
            <div style={styles.projectionLabel}>Monthly</div>
          </div>
          <div style={styles.projectionItem}>
            <div style={styles.projectionValue}>{formatCurrency(projections.yearly)}</div>
            <div style={styles.projectionLabel}>Yearly</div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      {showAdvanced && (
        <>
          {/* Top Performing Ads */}
          {revenueData.topPerformingAds.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Top Performing Ads</h3>
              </div>
              
              <div style={styles.adsList}>
                {revenueData.topPerformingAds.slice(0, 5).map((ad, index) => (
                  <div key={ad.id} style={styles.adItem}>
                    <div style={styles.adRank}>#{index + 1}</div>
                    <div style={styles.adInfo}>
                      <div style={styles.adTitle}>{ad.title}</div>
                      <div style={styles.adAdvertiser}>{ad.advertiser}</div>
                    </div>
                    <div style={styles.adStats}>
                      <div style={styles.adRevenue}>{formatCurrency(ad.revenue)}</div>
                      <div style={styles.adPlays}>{ad.plays} plays</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payout Information */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Payout Information</h3>
            </div>
            
            <div style={styles.payoutGrid}>
              <div style={styles.payoutItem}>
                <div style={styles.payoutValue}>{formatCurrency(payoutData.pendingAmount)}</div>
                <div style={styles.payoutLabel}>Pending Payout</div>
              </div>
              <div style={styles.payoutItem}>
                <div style={styles.payoutValue}>{formatCurrency(payoutData.paidAmount)}</div>
                <div style={styles.payoutLabel}>Total Paid</div>
              </div>
              <div style={styles.payoutItem}>
                <div style={styles.payoutValue}>
                  {payoutData.nextPayoutDate 
                    ? new Date(payoutData.nextPayoutDate).toLocaleDateString()
                    : 'TBD'
                  }
                </div>
                <div style={styles.payoutLabel}>Next Payout</div>
              </div>
            </div>
          </div>

          {/* Performance Analytics */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Performance Analytics</h3>
            </div>
            
            <div style={styles.analyticsGrid}>
              <div style={styles.analyticsItem}>
                <div style={styles.analyticsValue}>{(analyticsData.conversionRate * 100).toFixed(1)}%</div>
                <div style={styles.analyticsLabel}>Conversion Rate</div>
              </div>
              <div style={styles.analyticsItem}>
                <div style={styles.analyticsValue}>{(analyticsData.audienceRetention * 100).toFixed(1)}%</div>
                <div style={styles.analyticsLabel}>Audience Retention</div>
              </div>
              <div style={styles.analyticsItem}>
                <div style={styles.analyticsValue}>
                  {analyticsData.peakHours.length > 0 
                    ? `${analyticsData.peakHours[0].hour}:00`
                    : 'N/A'
                  }
                </div>
                <div style={styles.analyticsLabel}>Peak Hour</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Provider Details Modal */}
      {showDetailsModal && selectedProvider && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} Details
            </h3>
            
            <div style={styles.modalStats}>
              <div style={styles.modalStat}>
                <div style={styles.modalStatValue}>
                  {formatCurrency(revenueData.revenueByProvider[selectedProvider] || 0)}
                </div>
                <div style={styles.modalStatLabel}>Total Revenue</div>
              </div>
              
              <div style={styles.modalStat}>
                <div style={styles.modalStatValue}>
                  {((revenueData.revenueByProvider[selectedProvider] || 0) / Math.max(revenueData.totalRevenue, 1) * 100).toFixed(1)}%
                </div>
                <div style={styles.modalStatLabel}>Share of Total</div>
              </div>
            </div>

            <div style={styles.modalInfo}>
              <h4 style={styles.modalInfoTitle}>Provider Information</h4>
              <p style={styles.modalInfoText}>
                {getProviderDescription(selectedProvider)}
              </p>
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              style={styles.modalCloseButton}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Export Revenue Data</h3>
            
            <div style={styles.exportOptions}>
              <button
                onClick={() => exportData('csv')}
                style={styles.exportButton}
              >
                📄 Export as CSV
              </button>
              <button
                onClick={() => exportData('json')}
                style={styles.exportButton}
              >
                📋 Export as JSON
              </button>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              style={styles.modalCloseButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function getProviderDescription(provider) {
    const descriptions = {
      spotify: 'Spotify Ad Studio provides premium audio advertising with high-quality targeting and competitive CPM rates.',
      google: 'Google Ad Manager offers programmatic audio advertising with extensive reach and real-time optimization.',
      siriusxm: 'SiriusXM Media Canada delivers premium Canadian content with higher CPM rates for quality inventory.',
      networks: 'Ad Networks provide fill inventory from multiple sources to maximize revenue coverage.',
      test: 'Test provider for development and demonstration purposes.'
    };
    
    return descriptions[provider] || 'Third-party advertising provider delivering targeted audio advertisements.';
  }
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e9ecef',
    borderTop: '4px solid #009688',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px'
  },
  loadingText: {
    fontSize: '16px',
    color: '#666'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  errorText: {
    fontSize: '16px',
    color: '#f44336',
    marginBottom: '20px',
    textAlign: 'center'
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#009688',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  headerControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  timeframeSelector: {
    display: 'flex',
    gap: '5px'
  },
  timeframeButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    color: '#333',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  timeframeButtonActive: {
    backgroundColor: '#009688',
    color: '#fff',
    borderColor: '#009688'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  refreshButton: {
    padding: '8px 16px',
    border: '1px solid #009688',
    backgroundColor: '#fff',
    color: '#009688',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  exportButton: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: '#009688',
    color: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  lastUpdated: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px'
  },
  statItem: {
    textAlign: 'center'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase'
  },
  performanceIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  performanceLabel: {
    fontSize: '14px',
    color: '#333'
  },
  performanceChip: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  mainStatsGrid: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px'
  },
  primaryStat: {
    textAlign: 'center'
  },
  primaryValue: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: '10px'
  },
  primaryLabel: {
    fontSize: '18px',
    color: '#666'
  },
  secondaryStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '30px',
    width: '100%'
  },
  secondaryStat: {
    textAlign: 'center'
  },
  secondaryValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px'
  },
  secondaryLabel: {
    fontSize: '14px',
    color: '#666'
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: '40px 0'
  },
  providerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  providerItem: {
    padding: '15px',
    border: '1px solid #eee',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative'
  },
  providerInfo: {
    marginBottom: '10px'
  },
  providerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px'
  },
  providerPercentage: {
    fontSize: '14px',
    color: '#666'
  },
  providerRevenue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: '10px'
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#eee',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#009688',
    transition: 'width 0.3s ease'
  },
  metricSelector: {
    display: 'flex',
    gap: '5px'
  },
  metricButton: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    color: '#333',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  metricButtonActive: {
    backgroundColor: '#009688',
    color: '#fff',
    borderColor: '#009688'
  },
  chartContainer: {
    width: '100%',
    height: '300px',
    marginTop: '20px'
  },
  projectionNote: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  },
  projectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px'
  },
  projectionItem: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  projectionValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: '10px'
  },
  projectionLabel: {
    fontSize: '14px',
    color: '#666'
  },
  adsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  adItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    border: '1px solid #eee',
    borderRadius: '8px',
    gap: '15px'
  },
  adRank: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#009688',
    minWidth: '40px'
  },
  adInfo: {
    flex: 1
  },
  adTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px'
  },
  adAdvertiser: {
    fontSize: '14px',
    color: '#666'
  },
  adStats: {
    textAlign: 'right'
  },
  adRevenue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: '5px'
  },
  adPlays: {
    fontSize: '12px',
    color: '#666'
  },
  payoutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px'
  },
  payoutItem: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  payoutValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: '10px'
  },
  payoutLabel: {
    fontSize: '14px',
    color: '#666'
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px'
  },
  analyticsItem: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  analyticsValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: '10px'
  },
  analyticsLabel: {
    fontSize: '14px',
    color: '#666'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '30px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  },
  modalStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  modalStat: {
    textAlign: 'center'
  },
  modalStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: '10px'
  },
  modalStatLabel: {
    fontSize: '14px',
    color: '#666'
  },
  modalInfo: {
    marginBottom: '20px'
  },
  modalInfoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px'
  },
  modalInfoText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5'
  },
  modalCloseButton: {
    padding: '10px 20px',
    backgroundColor: '#009688',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'block',
    margin: '0 auto'
  },
  exportOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px'
  }
};

// Add CSS animations
if (!document.querySelector('#revenue-tracker-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'revenue-tracker-styles';
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .providerItem:hover {
      background-color: #f8f9fa !important;
      border-color: #009688 !important;
    }
    
    .timeframeButton:hover {
      background-color: #f5f5f5 !important;
    }
    
    .refreshButton:hover, .exportButton:hover {
      opacity: 0.8;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default RevenueTracker;