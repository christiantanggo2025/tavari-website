// src/components/Ads/AdScheduler.jsx - PRODUCTION VERSION
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Switch, 
  Slider, 
  Button, 
  TextInput,
  Chip,
  List,
  IconButton,
  Portal,
  Modal,
  Divider,
  Menu,
  DataTable,
  ProgressBar,
  Banner,
  FAB,
  Dialog,
  Paragraph,
  RadioButton,
  Checkbox,
  HelperText
} from 'react-native-paper';
import { useBusiness } from '../../hooks/useBusiness';
import { useUserProfile } from '../../hooks/useUserProfile';
import { supabase } from '../../supabaseClient';
import { globalAdManager } from '../../services/Ads/AdManager';

const AdScheduler = ({ onSettingsChange, showAdvanced = true }) => {
  const { business } = useBusiness();
  const { profile } = useUserProfile();
  
  // ==============================================
  // STATE MANAGEMENT
  // ==============================================
  
  // Main schedule state
  const [schedules, setSchedules] = useState([]);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [currentScheduleId, setCurrentScheduleId] = useState(null);
  
  // Business context state
  const [businessHours, setBusinessHours] = useState([]);
  const [holidayRules, setHolidayRules] = useState([]);
  const [apiProviders, setApiProviders] = useState([]);
  
  // Performance & analytics state
  const [schedulePerformance, setSchedulePerformance] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalAdsToday: 0,
    revenueToday: 0,
    fillRate: 0,
    averageCPM: 0
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTimeRuleModal, setShowTimeRuleModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({ visible: false, item: null, type: null });
  
  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    schedule_name: '',
    description: '',
    ad_frequency: 5,
    max_ads_per_hour: 6,
    min_break_between_ads_seconds: 300,
    priority_apis: ['spotify', 'google', 'siriusxm', 'networks'],
    volume_adjustment: 0.8,
    fade_in_duration_ms: 1000,
    fade_out_duration_ms: 1000,
    respect_business_hours: true,
    weekend_enabled: true,
    holiday_enabled: false,
    timezone: 'America/Toronto',
    approval_required: false
  });
  
  const [timeRuleForm, setTimeRuleForm] = useState({
    rule_name: '',
    rule_type: 'time_range',
    start_time: '09:00',
    end_time: '17:00',
    days_of_week: [1, 2, 3, 4, 5],
    effective_start_date: null,
    effective_end_date: null,
    frequency_override: null,
    max_ads_override: null,
    api_priority_override: null,
    is_blackout_period: false,
    is_boost_period: false,
    boost_multiplier: 1.0,
    enabled: true
  });
  
  const [holidayForm, setHolidayForm] = useState({
    holiday_name: '',
    holiday_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurrence_pattern: 'yearly',
    ads_enabled: false,
    frequency_override: null,
    special_message: ''
  });
  
  // ==============================================
  // UTILITY FUNCTIONS
  // ==============================================
  
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount || 0);
  }, []);
  
  const formatTime = useCallback((timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, []);
  
  const getDayName = useCallback((dayNumber) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
  }, []);
  
  const getDayAbbr = useCallback((dayNumber) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNumber] || 'X';
  }, []);
  
  const validateTimeRange = useCallback((startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return start < end;
  }, []);
  
  const calculateEstimatedAds = useCallback(() => {
    if (!activeSchedule) return 0;
    
    const hoursPerDay = businessHours.reduce((total, hour) => {
      if (hour.is_closed) return total;
      const start = new Date(`2000-01-01T${hour.open_time}`);
      const end = new Date(`2000-01-01T${hour.close_time}`);
      return total + ((end - start) / (1000 * 60 * 60));
    }, 0);
    
    const adsPerHour = Math.min(activeSchedule.max_ads_per_hour, 60 / (activeSchedule.ad_frequency * 3)); // Assuming 3 min per song
    return Math.round(hoursPerDay * adsPerHour * 7); // Weekly estimate
  }, [activeSchedule, businessHours]);
  
  // ==============================================
  // DATA LOADING FUNCTIONS
  // ==============================================
  
  const loadSchedules = useCallback(async () => {
    if (!business?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('music_ad_schedule')
        .select(`
          *,
          music_ad_time_rules (*)
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setSchedules(data || []);
      
      // Set active schedule if none selected
      if (!currentScheduleId && data?.length > 0) {
        const active = data.find(s => s.active) || data[0];
        setCurrentScheduleId(active.id);
        setActiveSchedule(active);
      }
      
    } catch (err) {
      console.error('Error loading schedules:', err);
      setError('Failed to load ad schedules');
    }
  }, [business?.id, currentScheduleId]);
  
  const loadBusinessHours = useCallback(async () => {
    if (!business?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('music_business_hours')
        .select('*')
        .eq('business_id', business.id)
        .order('day_of_week');
      
      if (error) throw error;
      setBusinessHours(data || []);
      
    } catch (err) {
      console.error('Error loading business hours:', err);
    }
  }, [business?.id]);
  
  const loadHolidayRules = useCallback(async () => {
    if (!business?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('music_ad_holiday_rules')
        .select('*')
        .eq('business_id', business.id)
        .eq('active', true)
        .order('holiday_date');
      
      if (error) throw error;
      setHolidayRules(data || []);
      
    } catch (err) {
      console.error('Error loading holiday rules:', err);
    }
  }, [business?.id]);
  
  const loadApiProviders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('music_ad_apis')
        .select('*')
        .eq('active', true)
        .order('priority');
      
      if (error) throw error;
      setApiProviders(data || []);
      
    } catch (err) {
      console.error('Error loading API providers:', err);
    }
  }, []);
  
  const loadPerformanceData = useCallback(async () => {
    if (!business?.id || !currentScheduleId) return;
    
    try {
      const { data, error } = await supabase
        .from('music_ad_schedule_performance')
        .select('*')
        .eq('business_id', business.id)
        .eq('schedule_id', currentScheduleId)
        .gte('date_recorded', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date_recorded', { ascending: false });
      
      if (error) throw error;
      
      // Calculate analytics
      const totalAds = data?.reduce((sum, record) => sum + record.ads_served, 0) || 0;
      const totalRevenue = data?.reduce((sum, record) => sum + record.total_revenue, 0) || 0;
      const totalRequests = data?.reduce((sum, record) => sum + record.ads_served + record.ads_failed, 0) || 0;
      const fillRate = totalRequests > 0 ? (totalAds / totalRequests) * 100 : 0;
      const averageCPM = data?.reduce((sum, record) => sum + record.average_cpm, 0) / (data?.length || 1) || 0;
      
      setAnalytics({
        totalAdsToday: data?.filter(d => d.date_recorded === new Date().toISOString().split('T')[0])
          .reduce((sum, record) => sum + record.ads_served, 0) || 0,
        revenueToday: data?.filter(d => d.date_recorded === new Date().toISOString().split('T')[0])
          .reduce((sum, record) => sum + record.total_revenue, 0) || 0,
        fillRate: Math.round(fillRate * 100) / 100,
        averageCPM: Math.round(averageCPM * 10000) / 10000
      });
      
      setSchedulePerformance(data || []);
      
    } catch (err) {
      console.error('Error loading performance data:', err);
    }
  }, [business?.id, currentScheduleId]);
  
  const loadConflicts = useCallback(async () => {
    if (!business?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('music_ad_schedule_conflicts')
        .select(`
          *,
          music_ad_schedule!primary_schedule_id (schedule_name),
          music_ad_time_rules (rule_name)
        `)
        .eq('business_id', business.id)
        .eq('status', 'unresolved')
        .order('detected_at', { ascending: false });
      
      if (error) throw error;
      setConflicts(data || []);
      
    } catch (err) {
      console.error('Error loading conflicts:', err);
    }
  }, [business?.id]);
  
  // ==============================================
  // CRUD OPERATIONS
  // ==============================================
  
  const saveSchedule = useCallback(async () => {
    if (!business?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate form
      if (!scheduleForm.schedule_name.trim()) {
        throw new Error('Schedule name is required');
      }
      
      if (scheduleForm.ad_frequency < 1 || scheduleForm.ad_frequency > 50) {
        throw new Error('Ad frequency must be between 1 and 50 songs');
      }
      
      if (scheduleForm.max_ads_per_hour < 1 || scheduleForm.max_ads_per_hour > 20) {
        throw new Error('Max ads per hour must be between 1 and 20');
      }
      
      const scheduleData = {
        ...scheduleForm,
        business_id: business.id,
        created_by: profile?.id,
        updated_at: new Date().toISOString()
      };
      
      let result;
      if (currentScheduleId && activeSchedule) {
        // Update existing schedule
        const { data, error } = await supabase
          .from('music_ad_schedule')
          .update(scheduleData)
          .eq('id', currentScheduleId)
          .eq('business_id', business.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new schedule
        const { data, error } = await supabase
          .from('music_ad_schedule')
          .insert(scheduleData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        setCurrentScheduleId(result.id);
      }
      
      setActiveSchedule(result);
      setIsDirty(false);
      setSuccessMessage('Schedule saved successfully');
      setShowScheduleModal(false);
      
      // Reload data
      await loadSchedules();
      
      // Update global ad manager
      if (globalAdManager?.updateAdSettings) {
        await globalAdManager.updateAdSettings(result);
      }
      
      if (onSettingsChange) {
        onSettingsChange(result);
      }
      
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [business?.id, profile?.id, scheduleForm, currentScheduleId, activeSchedule, onSettingsChange]);
  
  const saveTimeRule = useCallback(async () => {
    if (!currentScheduleId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate form
      if (!timeRuleForm.rule_name.trim()) {
        throw new Error('Rule name is required');
      }
      
      if (!validateTimeRange(timeRuleForm.start_time, timeRuleForm.end_time)) {
        throw new Error('Start time must be before end time');
      }
      
      if (timeRuleForm.days_of_week.length === 0) {
        throw new Error('At least one day must be selected');
      }
      
      const ruleData = {
        ...timeRuleForm,
        schedule_id: currentScheduleId,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('music_ad_time_rules')
        .insert(ruleData);
      
      if (error) throw error;
      
      setSuccessMessage('Time rule saved successfully');
      setShowTimeRuleModal(false);
      
      // Reset form
      setTimeRuleForm({
        rule_name: '',
        rule_type: 'time_range',
        start_time: '09:00',
        end_time: '17:00',
        days_of_week: [1, 2, 3, 4, 5],
        effective_start_date: null,
        effective_end_date: null,
        frequency_override: null,
        max_ads_override: null,
        api_priority_override: null,
        is_blackout_period: false,
        is_boost_period: false,
        boost_multiplier: 1.0,
        enabled: true
      });
      
      // Reload data
      await loadSchedules();
      await loadConflicts();
      
    } catch (err) {
      console.error('Error saving time rule:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentScheduleId, timeRuleForm, validateTimeRange]);
  
  const saveHolidayRule = useCallback(async () => {
    if (!business?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate form
      if (!holidayForm.holiday_name.trim()) {
        throw new Error('Holiday name is required');
      }
      
      const ruleData = {
        ...holidayForm,
        business_id: business.id
      };
      
      const { error } = await supabase
        .from('music_ad_holiday_rules')
        .insert(ruleData);
      
      if (error) throw error;
      
      setSuccessMessage('Holiday rule saved successfully');
      setShowHolidayModal(false);
      
      // Reset form
      setHolidayForm({
        holiday_name: '',
        holiday_date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        recurrence_pattern: 'yearly',
        ads_enabled: false,
        frequency_override: null,
        special_message: ''
      });
      
      // Reload data
      await loadHolidayRules();
      
    } catch (err) {
      console.error('Error saving holiday rule:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [business?.id, holidayForm]);
  
  const deleteItem = useCallback(async (id, type) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let tableName;
      let conditions = { id };
      
      switch (type) {
        case 'schedule':
          tableName = 'music_ad_schedule';
          conditions.business_id = business.id;
          break;
        case 'timeRule':
          tableName = 'music_ad_time_rules';
          break;
        case 'holiday':
          tableName = 'music_ad_holiday_rules';
          conditions.business_id = business.id;
          break;
        default:
          throw new Error('Invalid item type');
      }
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .match(conditions);
      
      if (error) throw error;
      
      setSuccessMessage(`${type} deleted successfully`);
      setConfirmDeleteDialog({ visible: false, item: null, type: null });
      
      // Reload relevant data
      switch (type) {
        case 'schedule':
          await loadSchedules();
          if (currentScheduleId === id) {
            setCurrentScheduleId(null);
            setActiveSchedule(null);
          }
          break;
        case 'timeRule':
          await loadSchedules();
          break;
        case 'holiday':
          await loadHolidayRules();
          break;
      }
      
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [business?.id, currentScheduleId]);
  
  const resolveConflict = useCallback(async (conflictId, resolutionNotes) => {
    try {
      const { error } = await supabase
        .from('music_ad_schedule_conflicts')
        .update({
          status: 'resolved',
          resolved_by: profile?.id,
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString()
        })
        .eq('id', conflictId)
        .eq('business_id', business.id);
      
      if (error) throw error;
      
      setSuccessMessage('Conflict resolved successfully');
      await loadConflicts();
      
    } catch (err) {
      console.error('Error resolving conflict:', err);
      setError(err.message);
    }
  }, [business?.id, profile?.id]);
  
  // ==============================================
  // EFFECTS
  // ==============================================
  
  useEffect(() => {
    if (business?.id) {
      Promise.all([
        loadSchedules(),
        loadBusinessHours(),
        loadHolidayRules(),
        loadApiProviders(),
        loadConflicts()
      ]);
    }
  }, [business?.id]);
  
  useEffect(() => {
    if (currentScheduleId) {
      loadPerformanceData();
    }
  }, [currentScheduleId, loadPerformanceData]);
  
  useEffect(() => {
    // Clear success message after 5 seconds
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  // ==============================================
  // COMPUTED VALUES
  // ==============================================
  
  const currentStatus = useMemo(() => {
    if (!activeSchedule || !activeSchedule.active) {
      return { status: 'inactive', message: 'Ad scheduling is disabled', color: '#666' };
    }
    
    const now = new Date();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const currentDay = now.getDay();
    
    // Check holiday rules
    const today = now.toISOString().split('T')[0];
    const holidayRule = holidayRules.find(h => h.holiday_date === today);
    if (holidayRule && !holidayRule.ads_enabled) {
      return { status: 'holiday', message: `No ads - ${holidayRule.holiday_name}`, color: '#ff9800' };
    }
    
    // Check business hours
    if (activeSchedule.respect_business_hours) {
      const todayHours = businessHours.find(h => h.day_of_week === currentDay);
      if (todayHours && (todayHours.is_closed || !todayHours.open_time || !todayHours.close_time)) {
        return { status: 'closed', message: 'Business closed - No ads', color: '#f44336' };
      }
      
      if (todayHours) {
        const openTime = new Date(`2000-01-01T${todayHours.open_time}`).getHours() + 
                        new Date(`2000-01-01T${todayHours.open_time}`).getMinutes() / 60;
        const closeTime = new Date(`2000-01-01T${todayHours.close_time}`).getHours() + 
                         new Date(`2000-01-01T${todayHours.close_time}`).getMinutes() / 60;
        
        if (currentTime < openTime || currentTime > closeTime) {
          return { status: 'closed', message: 'Outside business hours', color: '#f44336' };
        }
      }
    }
    
    // Check time rules
    const activeTimeRule = activeSchedule.music_ad_time_rules?.find(rule => {
      if (!rule.enabled) return false;
      if (!rule.days_of_week.includes(currentDay)) return false;
      
      const ruleStart = new Date(`2000-01-01T${rule.start_time}`).getHours() + 
                       new Date(`2000-01-01T${rule.start_time}`).getMinutes() / 60;
      const ruleEnd = new Date(`2000-01-01T${rule.end_time}`).getHours() + 
                     new Date(`2000-01-01T${rule.end_time}`).getMinutes() / 60;
      
      if (rule.is_blackout_period) {
        return currentTime >= ruleStart && currentTime <= ruleEnd;
      } else {
        return currentTime >= ruleStart && currentTime <= ruleEnd;
      }
    });
    
    if (activeTimeRule?.is_blackout_period) {
      return { status: 'blackout', message: `Blackout period - ${activeTimeRule.rule_name}`, color: '#f44336' };
    }
    
    if (activeTimeRule) {
      return { 
        status: 'active', 
        message: `Active - ${activeTimeRule.rule_name}`, 
        color: '#4caf50'
      };
    }
    
    return { status: 'active', message: 'Ad scheduling active', color: '#4caf50' };
  }, [activeSchedule, businessHours, holidayRules]);
  
  const estimatedWeeklyAds = useMemo(() => calculateEstimatedAds(), [calculateEstimatedAds]);
  
  const estimatedWeeklyRevenue = useMemo(() => {
    return estimatedWeeklyAds * (analytics.averageCPM || 0.02); // Default 2¢ CPM
  }, [estimatedWeeklyAds, analytics.averageCPM]);
  
  // ==============================================
  // RENDER FUNCTIONS
  // ==============================================
  
  const renderScheduleSelector = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Schedule</Text>
          <View style={styles.headerActions}>
            <Menu
              visible={false}
              anchor={
                <Button 
                  mode="outlined" 
                  onPress={() => {/* Menu toggle */}}
                  icon="chevron-down"
                  compact
                >
                  {activeSchedule?.schedule_name || 'Select Schedule'}
                </Button>
              }
            >
              {schedules.map(schedule => (
                <Menu.Item
                  key={schedule.id}
                  onPress={() => {
                    setCurrentScheduleId(schedule.id);
                    setActiveSchedule(schedule);
                  }}
                  title={schedule.schedule_name}
                  leadingIcon={schedule.active ? 'check-circle' : 'circle-outline'}
                />
              ))}
            </Menu>
            
            <IconButton
              icon="plus"
              onPress={() => {
                setScheduleForm({
                  schedule_name: '',
                  description: '',
                  ad_frequency: 5,
                  max_ads_per_hour: 6,
                  min_break_between_ads_seconds: 300,
                  priority_apis: ['spotify', 'google', 'siriusxm', 'networks'],
                  volume_adjustment: 0.8,
                  fade_in_duration_ms: 1000,
                  fade_out_duration_ms: 1000,
                  respect_business_hours: true,
                  weekend_enabled: true,
                  holiday_enabled: false,
                  timezone: 'America/Toronto',
                  approval_required: false
                });
                setShowScheduleModal(true);
              }}
            />
          </View>
        </View>
        
        {/* Current Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: currentStatus.color }]} />
          <Text style={styles.statusText}>{currentStatus.message}</Text>
        </View>
        
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.totalAdsToday}</Text>
            <Text style={styles.statLabel}>Ads Today</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(analytics.revenueToday)}</Text>
            <Text style={styles.statLabel}>Revenue Today</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.fillRate}%</Text>
            <Text style={styles.statLabel}>Fill Rate</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(analytics.averageCPM)}</Text>
            <Text style={styles.statLabel}>Avg CPM</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
  
  const renderBasicSettings = () => {
    if (!activeSchedule) return null;
    
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Basic Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Ad Scheduling</Text>
              <Text style={styles.settingDescription}>
                Turn ad scheduling on or off for this configuration
              </Text>
            </View>
            <Switch 
              value={activeSchedule.active}
              onValueChange={async (value) => {
                try {
                  const { error } = await supabase
                    .from('music_ad_schedule')
                    .update({ active: value, updated_at: new Date().toISOString() })
                    .eq('id', activeSchedule.id)
                    .eq('business_id', business.id);
                  
                  if (error) throw error;
                  
                  setActiveSchedule(prev => ({ ...prev, active: value }));
                  setSuccessMessage(value ? 'Ad scheduling enabled' : 'Ad scheduling disabled');
                } catch (err) {
                  setError('Failed to update schedule status');
                }
              }}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                Ad Frequency: Every {activeSchedule.ad_frequency} songs
              </Text>
              <Text style={styles.settingDescription}>
                How often ads play between music tracks
              </Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={20}
            step={1}
            value={activeSchedule.ad_frequency}
            onValueChange={(value) => {
              setActiveSchedule(prev => ({ ...prev, ad_frequency: Math.round(value) }));
              setIsDirty(true);
            }}
            minimumTrackTintColor="#009688"
            maximumTrackTintColor="#e0e0e0"
            thumbStyle={{ backgroundColor: '#009688' }}
          />
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                Max Ads Per Hour: {activeSchedule.max_ads_per_hour}
              </Text>
              <Text style={styles.settingDescription}>
                Limit total ads played per hour to prevent over-saturation
              </Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={20}
            step={1}
            value={activeSchedule.max_ads_per_hour}
            onValueChange={(value) => {
              setActiveSchedule(prev => ({ ...prev, max_ads_per_hour: Math.round(value) }));
              setIsDirty(true);
            }}
            minimumTrackTintColor="#009688"
            maximumTrackTintColor="#e0e0e0"
            thumbStyle={{ backgroundColor: '#009688' }}
          />
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                Ad Volume: {Math.round(activeSchedule.volume_adjustment * 100)}%
              </Text>
              <Text style={styles.settingDescription}>
                Volume level for advertisements relative to music
              </Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.3}
            maximumValue={1.0}
            step={0.1}
            value={activeSchedule.volume_adjustment}
            onValueChange={(value) => {
              setActiveSchedule(prev => ({ ...prev, volume_adjustment: value }));
              setIsDirty(true);
            }}
            minimumTrackTintColor="#009688"
            maximumTrackTintColor="#e0e0e0"
            thumbStyle={{ backgroundColor: '#009688' }}
          />
          
          {/* Estimates */}
          <Divider style={styles.divider} />
          
          <View style={styles.estimatesContainer}>
            <Text style={styles.estimatesTitle}>Weekly Estimates</Text>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Estimated Ads:</Text>
              <Text style={styles.estimateValue}>{estimatedWeeklyAds}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Estimated Revenue:</Text>
              <Text style={styles.estimateValue}>{formatCurrency(estimatedWeeklyRevenue)}</Text>
            </View>
          </View>
          
        </Card.Content>
      </Card>
    );
  };
  
  const renderTimeRules = () => {
    if (!activeSchedule) return null;
    
    const timeRules = activeSchedule.music_ad_time_rules || [];
    
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Time-Based Rules</Text>
            <Button
              mode="outlined"
              onPress={() => setShowTimeRuleModal(true)}
              icon="plus"
              compact
            >
              Add Rule
            </Button>
          </View>
          
          {timeRules.length === 0 ? (
            <Text style={styles.emptyText}>
              No time rules configured. Ads will follow basic settings 24/7.
            </Text>
          ) : (
            timeRules.map((rule) => (
              <List.Item
                key={rule.id}
                title={rule.rule_name}
                description={`${formatTime(rule.start_time)} - ${formatTime(rule.end_time)} • ${rule.days_of_week.map(d => getDayAbbr(d)).join(', ')}`}
                left={(props) => (
                  <List.Icon 
                    {...props} 
                    icon={rule.enabled ? (rule.is_blackout_period ? 'cancel' : 'clock-check') : 'clock-outline'} 
                    color={rule.enabled ? (rule.is_blackout_period ? '#f44336' : '#009688') : '#999'}
                  />
                )}
                right={(props) => (
                  <View style={styles.ruleActions}>
                    <Switch
                      value={rule.enabled}
                      onValueChange={async (enabled) => {
                        try {
                          const { error } = await supabase
                            .from('music_ad_time_rules')
                            .update({ enabled, updated_at: new Date().toISOString() })
                            .eq('id', rule.id);
                          
                          if (error) throw error;
                          
                          await loadSchedules();
                          setSuccessMessage('Time rule updated');
                        } catch (err) {
                          setError('Failed to update time rule');
                        }
                      }}
                    />
                    <IconButton
                      icon="delete"
                      size={16}
                      onPress={() => setConfirmDeleteDialog({
                        visible: true,
                        item: rule,
                        type: 'timeRule'
                      })}
                    />
                  </View>
                )}
                style={[
                  styles.ruleItem,
                  !rule.enabled && styles.disabledRule,
                  rule.is_blackout_period && styles.blackoutRule
                ]}
              />
            ))
          )}
        </Card.Content>
      </Card>
    );
  };
  
  const renderAdvancedSettings = () => {
    if (!showAdvanced || !activeSchedule) return null;
    
    return (
      <>
        {/* Business Hours Integration */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Business Hours Integration</Text>
              <Button
                mode="outlined"
                onPress={() => setShowBusinessHoursModal(true)}
                icon="clock"
                compact
              >
                Configure
              </Button>
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Respect Business Hours</Text>
                <Text style={styles.settingDescription}>
                  Only play ads during your business operating hours
                </Text>
              </View>
              <Switch 
                value={activeSchedule.respect_business_hours}
                onValueChange={(value) => {
                  setActiveSchedule(prev => ({ ...prev, respect_business_hours: value }));
                  setIsDirty(true);
                }}
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Weekend Ads</Text>
                <Text style={styles.settingDescription}>
                  Enable ads on weekends
                </Text>
              </View>
              <Switch 
                value={activeSchedule.weekend_enabled}
                onValueChange={(value) => {
                  setActiveSchedule(prev => ({ ...prev, weekend_enabled: value }));
                  setIsDirty(true);
                }}
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Holiday Ads</Text>
                <Text style={styles.settingDescription}>
                  Enable ads on statutory holidays
                </Text>
              </View>
              <Switch 
                value={activeSchedule.holiday_enabled}
                onValueChange={(value) => {
                  setActiveSchedule(prev => ({ ...prev, holiday_enabled: value }));
                  setIsDirty(true);
                }}
              />
            </View>
            
            {/* Business Hours Summary */}
            <View style={styles.businessHoursSummary}>
              <Text style={styles.businessHoursTitle}>Current Business Hours</Text>
              {businessHours.map(hour => (
                <View key={hour.day_of_week} style={styles.businessHourRow}>
                  <Text style={styles.dayName}>{getDayName(hour.day_of_week)}</Text>
                  <Text style={styles.hourRange}>
                    {hour.is_closed ? 'Closed' : 
                     `${formatTime(hour.open_time)} - ${formatTime(hour.close_time)}`}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
        
        {/* Holiday Rules */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Holiday Rules</Text>
              <Button
                mode="outlined"
                onPress={() => setShowHolidayModal(true)}
                icon="plus"
                compact
              >
                Add Holiday
              </Button>
            </View>
            
            {holidayRules.length === 0 ? (
              <Text style={styles.emptyText}>
                No holiday rules configured. Using default Canadian holidays.
              </Text>
            ) : (
              holidayRules.map((holiday) => (
                <List.Item
                  key={holiday.id}
                  title={holiday.holiday_name}
                  description={`${holiday.holiday_date} • ${holiday.ads_enabled ? 'Ads enabled' : 'Ads disabled'}`}
                  left={(props) => (
                    <List.Icon 
                      {...props} 
                      icon={holiday.ads_enabled ? 'check-circle' : 'cancel'} 
                      color={holiday.ads_enabled ? '#009688' : '#f44336'}
                    />
                  )}
                  right={(props) => (
                    <IconButton
                      icon="delete"
                      size={16}
                      onPress={() => setConfirmDeleteDialog({
                        visible: true,
                        item: holiday,
                        type: 'holiday'
                      })}
                    />
                  )}
                  style={styles.holidayItem}
                />
              ))
            )}
          </Card.Content>
        </Card>
        
        {/* API Priority Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>API Provider Priority</Text>
            <Text style={styles.sectionDescription}>
              Drag to reorder API providers by priority (highest first)
            </Text>
            
            {activeSchedule.priority_apis?.map((apiName, index) => {
              const provider = apiProviders.find(p => p.api_name === apiName);
              return (
                <List.Item
                  key={apiName}
                  title={provider?.display_name || apiName}
                  description={`Priority ${index + 1}`}
                  left={(props) => (
                    <List.Icon {...props} icon="drag-horizontal" />
                  )}
                  style={styles.apiProviderItem}
                />
              );
            })}
          </Card.Content>
        </Card>
        
        {/* Performance Analytics */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance Analytics</Text>
              <Button
                mode="outlined"
                onPress={() => setShowPerformanceModal(true)}
                icon="chart-line"
                compact
              >
                View Details
              </Button>
            </View>
            
            <View style={styles.performanceGrid}>
              <View style={styles.performanceCard}>
                <Text style={styles.performanceValue}>{analytics.fillRate}%</Text>
                <Text style={styles.performanceLabel}>Fill Rate</Text>
                <ProgressBar 
                  progress={analytics.fillRate / 100} 
                  color="#009688"
                  style={styles.progressBar}
                />
              </View>
              
              <View style={styles.performanceCard}>
                <Text style={styles.performanceValue}>{formatCurrency(analytics.averageCPM)}</Text>
                <Text style={styles.performanceLabel}>Avg CPM</Text>
              </View>
              
              <View style={styles.performanceCard}>
                <Text style={styles.performanceValue}>{analytics.totalAdsToday}</Text>
                <Text style={styles.performanceLabel}>Ads Today</Text>
              </View>
              
              <View style={styles.performanceCard}>
                <Text style={styles.performanceValue}>{formatCurrency(analytics.revenueToday)}</Text>
                <Text style={styles.performanceLabel}>Revenue Today</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Conflicts & Warnings */}
        {conflicts.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Schedule Conflicts</Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowConflictModal(true)}
                  icon="alert"
                  compact
                >
                  Resolve ({conflicts.length})
                </Button>
              </View>
              
              {conflicts.slice(0, 3).map((conflict) => (
                <Banner
                  key={conflict.id}
                  visible={true}
                  actions={[
                    {
                      label: 'Resolve',
                      onPress: () => resolveConflict(conflict.id, 'Acknowledged by user')
                    }
                  ]}
                  icon="alert"
                  style={[
                    styles.conflictBanner,
                    conflict.severity === 'error' && styles.errorBanner,
                    conflict.severity === 'warning' && styles.warningBanner
                  ]}
                >
                  {conflict.conflict_description}
                </Banner>
              ))}
            </Card.Content>
          </Card>
        )}
      </>
    );
  };
  
  const renderScheduleModal = () => (
    <Portal>
      <Modal 
        visible={showScheduleModal} 
        onDismiss={() => setShowScheduleModal(false)}
        contentContainerStyle={styles.modal}
      >
        <ScrollView>
          <Text style={styles.modalTitle}>
            {currentScheduleId ? 'Edit Schedule' : 'Create New Schedule'}
          </Text>
          
          <TextInput
            label="Schedule Name *"
            value={scheduleForm.schedule_name}
            onChangeText={(text) => setScheduleForm(prev => ({ ...prev, schedule_name: text }))}
            style={styles.input}
            error={!scheduleForm.schedule_name.trim()}
          />
          <HelperText type="error" visible={!scheduleForm.schedule_name.trim()}>
            Schedule name is required
          </HelperText>
          
          <TextInput
            label="Description"
            value={scheduleForm.description}
            onChangeText={(text) => setScheduleForm(prev => ({ ...prev, description: text }))}
            style={styles.input}
            multiline
            numberOfLines={3}
          />
          
          <Divider style={styles.modalDivider} />
          
          <Text style={styles.inputLabel}>Ad Frequency (Every X songs)</Text>
          <View style={styles.sliderContainer}>
            <Text>{scheduleForm.ad_frequency}</Text>
            <Slider
              style={styles.modalSlider}
              minimumValue={1}
              maximumValue={20}
              step={1}
              value={scheduleForm.ad_frequency}
              onValueChange={(value) => setScheduleForm(prev => ({ 
                ...prev, 
                ad_frequency: Math.round(value) 
              }))}
            />
          </View>
          
          <Text style={styles.inputLabel}>Max Ads Per Hour</Text>
          <View style={styles.sliderContainer}>
            <Text>{scheduleForm.max_ads_per_hour}</Text>
            <Slider
              style={styles.modalSlider}
              minimumValue={1}
              maximumValue={20}
              step={1}
              value={scheduleForm.max_ads_per_hour}
              onValueChange={(value) => setScheduleForm(prev => ({ 
                ...prev, 
                max_ads_per_hour: Math.round(value) 
              }))}
            />
          </View>
          
          <Text style={styles.inputLabel}>Volume Adjustment</Text>
          <View style={styles.sliderContainer}>
            <Text>{Math.round(scheduleForm.volume_adjustment * 100)}%</Text>
            <Slider
              style={styles.modalSlider}
              minimumValue={0.3}
              maximumValue={1.0}
              step={0.1}
              value={scheduleForm.volume_adjustment}
              onValueChange={(value) => setScheduleForm(prev => ({ 
                ...prev, 
                volume_adjustment: value 
              }))}
            />
          </View>
          
          <Divider style={styles.modalDivider} />
          
          <View style={styles.checkboxRow}>
            <Checkbox
              status={scheduleForm.respect_business_hours ? 'checked' : 'unchecked'}
              onPress={() => setScheduleForm(prev => ({ 
                ...prev, 
                respect_business_hours: !prev.respect_business_hours 
              }))}
            />
            <Text style={styles.checkboxLabel}>Respect Business Hours</Text>
          </View>
          
          <View style={styles.checkboxRow}>
            <Checkbox
              status={scheduleForm.weekend_enabled ? 'checked' : 'unchecked'}
              onPress={() => setScheduleForm(prev => ({ 
                ...prev, 
                weekend_enabled: !prev.weekend_enabled 
              }))}
            />
            <Text style={styles.checkboxLabel}>Enable Weekend Ads</Text>
          </View>
          
          <View style={styles.checkboxRow}>
            <Checkbox
              status={scheduleForm.holiday_enabled ? 'checked' : 'unchecked'}
              onPress={() => setScheduleForm(prev => ({ 
                ...prev, 
                holiday_enabled: !prev.holiday_enabled 
              }))}
            />
            <Text style={styles.checkboxLabel}>Enable Holiday Ads</Text>
          </View>
          
          <View style={styles.checkboxRow}>
            <Checkbox
              status={scheduleForm.approval_required ? 'checked' : 'unchecked'}
              onPress={() => setScheduleForm(prev => ({ 
                ...prev, 
                approval_required: !prev.approval_required 
              }))}
            />
            <Text style={styles.checkboxLabel}>Require Manager Approval</Text>
          </View>
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowScheduleModal(false)}
              style={styles.modalButton}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={saveSchedule}
              style={styles.modalButton}
              disabled={isLoading || !scheduleForm.schedule_name.trim()}
              loading={isLoading}
            >
              {currentScheduleId ? 'Update' : 'Create'}
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
  
  const renderTimeRuleModal = () => (
    <Portal>
      <Modal 
        visible={showTimeRuleModal} 
        onDismiss={() => setShowTimeRuleModal(false)}
        contentContainerStyle={styles.modal}
      >
        <ScrollView>
          <Text style={styles.modalTitle}>Add Time-Based Rule</Text>
          
          <TextInput
            label="Rule Name *"
            value={timeRuleForm.rule_name}
            onChangeText={(text) => setTimeRuleForm(prev => ({ ...prev, rule_name: text }))}
            style={styles.input}
            error={!timeRuleForm.rule_name.trim()}
          />
          
          <Text style={styles.inputLabel}>Rule Type</Text>
          <RadioButton.Group
            onValueChange={(value) => setTimeRuleForm(prev => ({ ...prev, rule_type: value }))}
            value={timeRuleForm.rule_type}
          >
            <View style={styles.radioRow}>
              <RadioButton value="time_range" />
              <Text style={styles.radioLabel}>Normal Time Range</Text>
            </View>
            <View style={styles.radioRow}>
              <RadioButton value="blackout" />
              <Text style={styles.radioLabel}>Blackout Period (No Ads)</Text>
            </View>
            <View style={styles.radioRow}>
              <RadioButton value="boost" />
              <Text style={styles.radioLabel}>Boost Period (More Ads)</Text>
            </View>
          </RadioButton.Group>
          
          <View style={styles.timeRow}>
            <TextInput
              label="Start Time"
              value={timeRuleForm.start_time}
              onChangeText={(text) => setTimeRuleForm(prev => ({ ...prev, start_time: text }))}
              style={[styles.input, styles.timeInput]}
              placeholder="HH:MM"
            />
            <TextInput
              label="End Time"
              value={timeRuleForm.end_time}
              onChangeText={(text) => setTimeRuleForm(prev => ({ ...prev, end_time: text }))}
              style={[styles.input, styles.timeInput]}
              placeholder="HH:MM"
            />
          </View>
          
          <Text style={styles.inputLabel}>Days of Week</Text>
          <View style={styles.daysContainer}>
            {[1, 2, 3, 4, 5, 6, 0].map(day => (
              <Chip
                key={day}
                selected={timeRuleForm.days_of_week.includes(day)}
                onPress={() => {
                  const newDays = timeRuleForm.days_of_week.includes(day)
                    ? timeRuleForm.days_of_week.filter(d => d !== day)
                    : [...timeRuleForm.days_of_week, day].sort();
                  setTimeRuleForm(prev => ({ ...prev, days_of_week: newDays }));
                }}
                style={styles.dayChip}
              >
                {getDayAbbr(day)}
              </Chip>
            ))}
          </View>
          
          {timeRuleForm.rule_type === 'boost' && (
            <>
              <Text style={styles.inputLabel}>Boost Multiplier</Text>
              <View style={styles.sliderContainer}>
                <Text>{timeRuleForm.boost_multiplier}x</Text>
                <Slider
                  style={styles.modalSlider}
                  minimumValue={1.1}
                  maximumValue={5.0}
                  step={0.1}
                  value={timeRuleForm.boost_multiplier}
                  onValueChange={(value) => setTimeRuleForm(prev => ({ 
                    ...prev, 
                    boost_multiplier: Math.round(value * 10) / 10 
                  }))}
                />
              </View>
            </>
          )}
          
          <View style={styles.checkboxRow}>
            <Checkbox
              status={timeRuleForm.is_blackout_period ? 'checked' : 'unchecked'}
              onPress={() => setTimeRuleForm(prev => ({ 
                ...prev, 
                is_blackout_period: !prev.is_blackout_period 
              }))}
            />
            <Text style={styles.checkboxLabel}>Blackout Period (No Ads)</Text>
          </View>
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowTimeRuleModal(false)}
              style={styles.modalButton}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={saveTimeRule}
              style={styles.modalButton}
              disabled={isLoading || !timeRuleForm.rule_name.trim()}
              loading={isLoading}
            >
              Save Rule
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
  
  const renderHolidayModal = () => (
    <Portal>
      <Modal 
        visible={showHolidayModal} 
        onDismiss={() => setShowHolidayModal(false)}
        contentContainerStyle={styles.modal}
      >
        <Text style={styles.modalTitle}>Add Holiday Rule</Text>
        
        <TextInput
          label="Holiday Name *"
          value={holidayForm.holiday_name}
          onChangeText={(text) => setHolidayForm(prev => ({ ...prev, holiday_name: text }))}
          style={styles.input}
          error={!holidayForm.holiday_name.trim()}
        />
        
        <TextInput
          label="Holiday Date *"
          value={holidayForm.holiday_date}
          onChangeText={(text) => setHolidayForm(prev => ({ ...prev, holiday_date: text }))}
          style={styles.input}
          placeholder="YYYY-MM-DD"
        />
        
        <View style={styles.checkboxRow}>
          <Checkbox
            status={holidayForm.is_recurring ? 'checked' : 'unchecked'}
            onPress={() => setHolidayForm(prev => ({ 
              ...prev, 
              is_recurring: !prev.is_recurring 
            }))}
          />
          <Text style={styles.checkboxLabel}>Recurring Holiday</Text>
        </View>
        
        <View style={styles.checkboxRow}>
          <Checkbox
            status={holidayForm.ads_enabled ? 'checked' : 'unchecked'}
            onPress={() => setHolidayForm(prev => ({ 
              ...prev, 
              ads_enabled: !prev.ads_enabled 
            }))}
          />
          <Text style={styles.checkboxLabel}>Enable Ads on This Holiday</Text>
        </View>
        
        <TextInput
          label="Special Message"
          value={holidayForm.special_message}
          onChangeText={(text) => setHolidayForm(prev => ({ ...prev, special_message: text }))}
          style={styles.input}
          multiline
          numberOfLines={2}
          placeholder="Optional message for this holiday"
        />
        
        <View style={styles.modalActions}>
          <Button
            mode="outlined"
            onPress={() => setShowHolidayModal(false)}
            style={styles.modalButton}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={saveHolidayRule}
            style={styles.modalButton}
            disabled={isLoading || !holidayForm.holiday_name.trim()}
            loading={isLoading}
          >
            Save Holiday
          </Button>
        </View>
      </Modal>
    </Portal>
  );
  
  const renderConfirmDeleteDialog = () => (
    <Portal>
      <Dialog 
        visible={confirmDeleteDialog.visible} 
        onDismiss={() => setConfirmDeleteDialog({ visible: false, item: null, type: null })}
      >
        <Dialog.Title>Confirm Delete</Dialog.Title>
        <Dialog.Content>
          <Paragraph>
            Are you sure you want to delete this {confirmDeleteDialog.type}? This action cannot be undone.
          </Paragraph>
          {confirmDeleteDialog.item && (
            <Paragraph style={styles.deleteItemName}>
              "{confirmDeleteDialog.item.schedule_name || confirmDeleteDialog.item.rule_name || confirmDeleteDialog.item.holiday_name}"
            </Paragraph>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => setConfirmDeleteDialog({ visible: false, item: null, type: null })}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onPress={() => deleteItem(confirmDeleteDialog.item?.id, confirmDeleteDialog.type)}
            disabled={isLoading}
            loading={isLoading}
            textColor="#f44336"
          >
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
  
  const renderSaveButton = () => {
    if (!isDirty) return null;
    
    return (
      <FAB
        style={styles.fab}
        icon="content-save"
        onPress={async () => {
          try {
            setIsLoading(true);
            
            const { error } = await supabase
              .from('music_ad_schedule')
              .update({
                ...activeSchedule,
                updated_at: new Date().toISOString()
              })
              .eq('id', activeSchedule.id)
              .eq('business_id', business.id);
            
            if (error) throw error;
            
            setIsDirty(false);
            setSuccessMessage('Settings saved successfully');
            
            // Update global ad manager
            if (globalAdManager?.updateAdSettings) {
              await globalAdManager.updateAdSettings(activeSchedule);
            }
            
            if (onSettingsChange) {
              onSettingsChange(activeSchedule);
            }
            
          } catch (err) {
            setError('Failed to save settings');
          } finally {
            setIsLoading(false);
          }
        }}
        disabled={isLoading}
      />
    );
  };
  
  // ==============================================
  // MAIN RENDER
  // ==============================================
  
  if (isLoading && !activeSchedule) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ad scheduler...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Success Banner */}
        {successMessage && (
          <Banner
            visible={true}
            actions={[
              {
                label: 'Dismiss',
                onPress: () => setSuccessMessage('')
              }
            ]}
            icon="check-circle"
            style={styles.successBanner}
          >
            {successMessage}
          </Banner>
        )}
        
        {/* Error Banner */}
        {error && (
          <Banner
            visible={true}
            actions={[
              {
                label: 'Dismiss',
                onPress: () => setError(null)
              }
            ]}
            icon="alert-circle"
            style={styles.errorBanner}
          >
            {error}
          </Banner>
        )}
        
        {/* Main Content */}
        {renderScheduleSelector()}
        {renderBasicSettings()}
        {renderTimeRules()}
        {renderAdvancedSettings()}
        
        {/* Modals */}
        {renderScheduleModal()}
        {renderTimeRuleModal()}
        {renderHolidayModal()}
        {renderConfirmDeleteDialog()}
        
        {/* Save FAB */}
        {renderSaveButton()}
      </ScrollView>
    </View>
  );
};

// ==============================================
// STYLES
// ==============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10
  },
  card: {
    margin: 10,
    backgroundColor: '#fff',
    elevation: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#009688'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center'
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10
  },
  settingInfo: {
    flex: 1,
    marginRight: 15
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: 10
  },
  divider: {
    marginVertical: 15
  },
  estimatesContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    marginTop: 10
  },
  estimatesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  estimateLabel: {
    fontSize: 14,
    color: '#388e3c'
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32'
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20
  },
  ruleItem: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: '#fff'
  },
  disabledRule: {
    opacity: 0.6
  },
  blackoutRule: {
    backgroundColor: '#ffebee'
  },
  ruleActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  businessHoursSummary: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  businessHoursTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  businessHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  dayName: {
    fontSize: 14,
    color: '#333',
    minWidth: 80
  },
  hourRange: {
    fontSize: 14,
    color: '#666'
  },
  holidayItem: {
    paddingVertical: 8,
    paddingHorizontal: 0
  },
  apiProviderItem: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10
  },
  performanceCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center'
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009688',
    marginBottom: 5
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  progressBar: {
    marginTop: 5,
    height: 4
  },
  conflictBanner: {
    marginBottom: 10
  },
  errorBanner: {
    backgroundColor: '#ffebee'
  },
  warningBanner: {
    backgroundColor: '#fff3e0'
  },
  successBanner: {
    backgroundColor: '#e8f5e8',
    margin: 10,
    marginBottom: 0
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  input: {
    marginBottom: 10
  },
  modalDivider: {
    marginVertical: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    marginTop: 15,
    color: '#333'
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  modalSlider: {
    flex: 1,
    marginLeft: 15
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8
  },
  timeRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15
  },
  timeInput: {
    flex: 1
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  dayChip: {
    marginRight: 0
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20
  },
  modalButton: {
    minWidth: 80
  },
  deleteItemName: {
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginTop: 10
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#009688'
  }
});

export default AdScheduler;