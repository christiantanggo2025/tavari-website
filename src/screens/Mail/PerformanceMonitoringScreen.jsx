// screens/Mail/PerformanceMonitoringScreen.jsx - Step 133: Performance Monitoring & Alerts
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import systemTests from '../../helpers/Mail/systemTests';
import {
  FiActivity, FiAlertTriangle, FiCheckCircle, FiClock, FiTrendingUp, 
  FiTrendingDown, FiZap, FiSettings, FiRefreshCw, FiBell, FiMail,
  FiShield, FiBarChart2, FiTarget, FiGlobe, FiX, FiEye
} from 'react-icons/fi';

const PerformanceMonitoringScreen = () => {
  const { business } = useBusiness();
  const [performanceData, setPerformanceData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);
  const [thresholds, setThresholds] = useState({
    minThroughput: 1.0, // emails per second
    maxQueueTime: 5000, // milliseconds
    maxProcessTime: 3000, // milliseconds
    maxErrorRate: 5, // percentage
    alertCooldown: 300 // seconds between same alerts
  });
  const [realtimeStats, setRealtimeStats] = useState({
    currentThroughput: 0,
    avgQueueTime: 0,
    avgProcessTime: 0,
    errorRate: 0,
    lastUpdated: null
  });
  const [showSettings, setShowSettings] = useState(false);

  const businessId = business?.id;

  // Create performance metrics table if it doesn't exist
  const createPerformanceTable = useCallback(async () => {
    try {
      await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS mail_performance_metrics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
            metric_type TEXT NOT NULL, -- throughput, queue_time, process_time, error_rate
            metric_value DECIMAL(10,4) NOT NULL,
            threshold_value DECIMAL(10,4),
            status TEXT DEFAULT 'normal', -- normal, warning, critical
            recorded_at TIMESTAMP DEFAULT timezone('utc'::text, now()),
            metadata JSONB DEFAULT '{}'
          );
        `
      });

      await supabase.rpc('execute_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS mail_performance_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
            alert_type TEXT NOT NULL, -- throughput_low, queue_high, process_slow, error_spike
            severity TEXT DEFAULT 'warning', -- info, warning, critical
            message TEXT NOT NULL,
            current_value DECIMAL(10,4),
            threshold_value DECIMAL(10,4),
            acknowledged BOOLEAN DEFAULT false,
            acknowledged_by UUID REFERENCES users(id),
            acknowledged_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT timezone('utc'::text, now()),
            resolved_at TIMESTAMP
          );
        `
      });

      // Add RLS policies
      await supabase.rpc('execute_sql', {
        query: `
          ALTER TABLE mail_performance_metrics ENABLE ROW LEVEL SECURITY;
          ALTER TABLE mail_performance_alerts ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY IF NOT EXISTS "Users can access metrics for their business" 
          ON mail_performance_metrics
          FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE id = auth.uid()));
          
          CREATE POLICY IF NOT EXISTS "Users can access alerts for their business" 
          ON mail_performance_alerts
          FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE id = auth.uid()));
        `
      });

      console.log('Performance monitoring tables created');
    } catch (error) {
      console.error('Error creating performance tables:', error);
    }
  }, []);

  // Load performance data and alerts
  const loadPerformanceData = useCallback(async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);

      // Load recent performance metrics (last 24 hours)
      const { data: metrics, error: metricsError } = await supabase
        .from('mail_performance_metrics')
        .select('*')
        .eq('business_id', businessId)
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1000);

      if (metricsError) throw metricsError;

      // Load active alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('mail_performance_alerts')
        .select('*')
        .eq('business_id', businessId)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      setPerformanceData(metrics || []);
      setAlerts(alertsData || []);

      // Calculate current stats
      if (metrics && metrics.length > 0) {
        const recent = metrics.slice(0, 20); // Last 20 data points
        const currentThroughput = recent.find(m => m.metric_type === 'throughput')?.metric_value || 0;
        const avgQueueTime = recent.filter(m => m.metric_type === 'queue_time')
          .reduce((sum, m) => sum + m.metric_value, 0) / Math.max(1, recent.filter(m => m.metric_type === 'queue_time').length);
        const avgProcessTime = recent.filter(m => m.metric_type === 'process_time')
          .reduce((sum, m) => sum + m.metric_value, 0) / Math.max(1, recent.filter(m => m.metric_type === 'process_time').length);
        const errorRate = recent.find(m => m.metric_type === 'error_rate')?.metric_value || 0;

        setRealtimeStats({
          currentThroughput,
          avgQueueTime,
          avgProcessTime,
          errorRate,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // Record performance metric
  const recordMetric = useCallback(async (type, value, thresholdValue = null, status = 'normal', metadata = {}) => {
    if (!businessId) return;

    try {
      await supabase
        .from('mail_performance_metrics')
        .insert({
          business_id: businessId,
          metric_type: type,
          metric_value: value,
          threshold_value: thresholdValue,
          status: status,
          metadata: metadata
        });
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }, [businessId]);

  // Create performance alert
  const createAlert = useCallback(async (type, severity, message, currentValue, thresholdValue) => {
    if (!businessId) return;

    try {
      // Check for recent similar alerts (cooldown)
      const { data: recentAlerts } = await supabase
        .from('mail_performance_alerts')
        .select('*')
        .eq('business_id', businessId)
        .eq('alert_type', type)
        .gte('created_at', new Date(Date.now() - thresholds.alertCooldown * 1000).toISOString());

      if (recentAlerts && recentAlerts.length > 0) {
        console.log('Alert cooldown active for', type);
        return;
      }

      await supabase
        .from('mail_performance_alerts')
        .insert({
          business_id: businessId,
          alert_type: type,
          severity: severity,
          message: message,
          current_value: currentValue,
          threshold_value: thresholdValue
        });

      // Reload alerts
      loadPerformanceData();
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }, [businessId, thresholds.alertCooldown, loadPerformanceData]);

  // Run performance benchmark and record metrics
  const runPerformanceBenchmark = useCallback(async () => {
    if (!businessId) return;

    try {
      setMonitoring(true);
      console.log('Running performance benchmark...');

      const benchmarkResult = await systemTests.performanceBenchmark(businessId, 50);
      
      if (benchmarkResult.success && benchmarkResult.metrics) {
        const { throughput, queueTime, processTime, totalTime } = benchmarkResult.metrics;
        
        // Record metrics
        await recordMetric('throughput', throughput, thresholds.minThroughput, 
          throughput < thresholds.minThroughput ? 'warning' : 'normal');
        await recordMetric('queue_time', queueTime, thresholds.maxQueueTime,
          queueTime > thresholds.maxQueueTime ? 'warning' : 'normal');
        await recordMetric('process_time', processTime, thresholds.maxProcessTime,
          processTime > thresholds.maxProcessTime ? 'warning' : 'normal');

        // Check thresholds and create alerts
        if (throughput < thresholds.minThroughput) {
          await createAlert('throughput_low', 'warning', 
            `Email throughput dropped to ${throughput.toFixed(2)} emails/sec (threshold: ${thresholds.minThroughput})`,
            throughput, thresholds.minThroughput);
        }

        if (queueTime > thresholds.maxQueueTime) {
          await createAlert('queue_high', 'warning',
            `Queue time increased to ${queueTime}ms (threshold: ${thresholds.maxQueueTime}ms)`,
            queueTime, thresholds.maxQueueTime);
        }

        if (processTime > thresholds.maxProcessTime) {
          await createAlert('process_slow', 'warning',
            `Process time increased to ${processTime}ms (threshold: ${thresholds.maxProcessTime}ms)`,
            processTime, thresholds.maxProcessTime);
        }

        console.log('Performance benchmark completed:', benchmarkResult.metrics);
      } else {
        // Record error rate metric
        await recordMetric('error_rate', 100, thresholds.maxErrorRate, 'critical');
        await createAlert('benchmark_failed', 'critical',
          'Performance benchmark failed completely', 100, 0);
      }

      // Reload data to show new metrics
      loadPerformanceData();
    } catch (error) {
      console.error('Error running performance benchmark:', error);
      await createAlert('benchmark_error', 'critical',
        `Performance monitoring error: ${error.message}`, 0, 0);
    } finally {
      setMonitoring(false);
    }
  }, [businessId, thresholds, recordMetric, createAlert, loadPerformanceData]);

  // Acknowledge alert
  const acknowledgeAlert = async (alertId) => {
    try {
      await supabase
        .from('mail_performance_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      loadPerformanceData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId) => {
    try {
      await supabase
        .from('mail_performance_alerts')
        .update({
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      loadPerformanceData();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  // Update monitoring thresholds
  const updateThresholds = async (newThresholds) => {
    setThresholds(newThresholds);
    setShowSettings(false);
    
    // Save to business settings or local storage
    try {
      localStorage.setItem(`mail_performance_thresholds_${businessId}`, JSON.stringify(newThresholds));
    } catch (error) {
      console.error('Error saving thresholds:', error);
    }
  };

  // Load saved thresholds
  useEffect(() => {
    if (businessId) {
      try {
        const saved = localStorage.getItem(`mail_performance_thresholds_${businessId}`);
        if (saved) {
          setThresholds(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading saved thresholds:', error);
      }
    }
  }, [businessId]);

  // Initialize and load data
  useEffect(() => {
    if (businessId) {
      createPerformanceTable();
      loadPerformanceData();
    }
  }, [businessId, createPerformanceTable, loadPerformanceData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (businessId && !monitoring) {
        runPerformanceBenchmark();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [businessId, monitoring, runPerformanceBenchmark]);

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical': return <FiAlertTriangle style={{ color: '#f44336' }} />;
      case 'warning': return <FiAlertTriangle style={{ color: '#ff9800' }} />;
      default: return <FiBell style={{ color: '#2196f3' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#f44336';
      case 'warning': return '#ff9800';
      case 'normal': return '#4caf50';
      default: return '#666';
    }
  };

  const formatMetric = (value, type) => {
    switch (type) {
      case 'throughput': return `${value.toFixed(2)} emails/sec`;
      case 'queue_time':
      case 'process_time': return `${Math.round(value)}ms`;
      case 'error_rate': return `${value.toFixed(1)}%`;
      default: return value.toString();
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <FiRefreshCw style={{ ...styles.loadingIcon, animation: 'spin 1s linear infinite' }} />
          <div>Loading performance data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Performance Monitoring</h1>
          <p style={styles.subtitle}>Real-time email system performance and alerts</p>
        </div>
        <div style={styles.headerActions}>
          <button 
            style={styles.secondaryButton}
            onClick={() => setShowSettings(true)}
          >
            <FiSettings style={styles.buttonIcon} />
            Thresholds
          </button>
          <button 
            style={styles.secondaryButton}
            onClick={loadPerformanceData}
          >
            <FiRefreshCw style={styles.buttonIcon} />
            Refresh
          </button>
          <button 
            style={styles.primaryButton}
            onClick={runPerformanceBenchmark}
            disabled={monitoring}
          >
            <FiZap style={styles.buttonIcon} />
            {monitoring ? 'Running...' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div style={styles.alertsSection}>
          <h3 style={styles.sectionTitle}>
            <FiBell style={styles.sectionIcon} />
            Active Alerts ({alerts.length})
          </h3>
          <div style={styles.alertsList}>
            {alerts.map(alert => (
              <div key={alert.id} style={styles.alertCard}>
                <div style={styles.alertHeader}>
                  {getAlertIcon(alert.severity)}
                  <span style={styles.alertMessage}>{alert.message}</span>
                  <div style={styles.alertActions}>
                    {!alert.acknowledged && (
                      <button 
                        style={styles.alertActionButton}
                        onClick={() => acknowledgeAlert(alert.id)}
                        title="Acknowledge"
                      >
                        <FiCheckCircle />
                      </button>
                    )}
                    <button 
                      style={styles.alertActionButton}
                      onClick={() => resolveAlert(alert.id)}
                      title="Resolve"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
                <div style={styles.alertDetails}>
                  <span style={styles.alertTimestamp}>
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                  {alert.current_value && alert.threshold_value && (
                    <span style={styles.alertValues}>
                      Current: {alert.current_value} | Threshold: {alert.threshold_value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Stats */}
      <div style={styles.statsSection}>
        <h3 style={styles.sectionTitle}>
          <FiActivity style={styles.sectionIcon} />
          Current Performance
        </h3>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <FiZap style={styles.statIcon} />
              <span style={styles.statLabel}>Throughput</span>
            </div>
            <div style={styles.statValue}>
              {formatMetric(realtimeStats.currentThroughput, 'throughput')}
            </div>
            <div style={styles.statThreshold}>
              Threshold: {formatMetric(thresholds.minThroughput, 'throughput')}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <FiClock style={styles.statIcon} />
              <span style={styles.statLabel}>Queue Time</span>
            </div>
            <div style={styles.statValue}>
              {formatMetric(realtimeStats.avgQueueTime, 'queue_time')}
            </div>
            <div style={styles.statThreshold}>
              Threshold: {formatMetric(thresholds.maxQueueTime, 'queue_time')}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <FiBarChart2 style={styles.statIcon} />
              <span style={styles.statLabel}>Process Time</span>
            </div>
            <div style={styles.statValue}>
              {formatMetric(realtimeStats.avgProcessTime, 'process_time')}
            </div>
            <div style={styles.statThreshold}>
              Threshold: {formatMetric(thresholds.maxProcessTime, 'process_time')}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <FiAlertTriangle style={styles.statIcon} />
              <span style={styles.statLabel}>Error Rate</span>
            </div>
            <div style={styles.statValue}>
              {formatMetric(realtimeStats.errorRate, 'error_rate')}
            </div>
            <div style={styles.statThreshold}>
              Threshold: {formatMetric(thresholds.maxErrorRate, 'error_rate')}
            </div>
          </div>
        </div>
        
        {realtimeStats.lastUpdated && (
          <div style={styles.lastUpdated}>
            Last updated: {realtimeStats.lastUpdated.toLocaleString()}
          </div>
        )}
      </div>

      {/* Performance History */}
      <div style={styles.historySection}>
        <h3 style={styles.sectionTitle}>
          <FiTrendingUp style={styles.sectionIcon} />
          Recent Performance History
        </h3>
        
        {performanceData && performanceData.length > 0 ? (
          <div style={styles.historyTable}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableHeaderCell}>Time</th>
                  <th style={styles.tableHeaderCell}>Metric</th>
                  <th style={styles.tableHeaderCell}>Value</th>
                  <th style={styles.tableHeaderCell}>Threshold</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.slice(0, 20).map(metric => (
                  <tr key={metric.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      {new Date(metric.recorded_at).toLocaleString()}
                    </td>
                    <td style={styles.tableCell}>
                      {metric.metric_type.replace('_', ' ')}
                    </td>
                    <td style={styles.tableCell}>
                      {formatMetric(metric.metric_value, metric.metric_type)}
                    </td>
                    <td style={styles.tableCell}>
                      {metric.threshold_value ? formatMetric(metric.threshold_value, metric.metric_type) : 'N/A'}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(metric.status) + '20',
                        color: getStatusColor(metric.status)
                      }}>
                        {metric.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <FiBarChart2 style={styles.emptyIcon} />
            <p style={styles.emptyText}>No performance data available. Run a benchmark to start monitoring.</p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Performance Thresholds</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowSettings(false)}
              >
                <FiX />
              </button>
            </div>
            <div style={styles.modalContent}>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                updateThresholds({
                  minThroughput: parseFloat(formData.get('minThroughput')),
                  maxQueueTime: parseInt(formData.get('maxQueueTime')),
                  maxProcessTime: parseInt(formData.get('maxProcessTime')),
                  maxErrorRate: parseFloat(formData.get('maxErrorRate')),
                  alertCooldown: parseInt(formData.get('alertCooldown'))
                });
              }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Minimum Throughput (emails/sec)</label>
                  <input 
                    type="number" 
                    name="minThroughput"
                    step="0.1"
                    min="0.1"
                    defaultValue={thresholds.minThroughput}
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Maximum Queue Time (ms)</label>
                  <input 
                    type="number" 
                    name="maxQueueTime"
                    min="100"
                    defaultValue={thresholds.maxQueueTime}
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Maximum Process Time (ms)</label>
                  <input 
                    type="number" 
                    name="maxProcessTime"
                    min="100"
                    defaultValue={thresholds.maxProcessTime}
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Maximum Error Rate (%)</label>
                  <input 
                    type="number" 
                    name="maxErrorRate"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue={thresholds.maxErrorRate}
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Alert Cooldown (seconds)</label>
                  <input 
                    type="number" 
                    name="alertCooldown"
                    min="60"
                    defaultValue={thresholds.alertCooldown}
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formActions}>
                  <button 
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => setShowSettings(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.saveButton}>
                    Save Thresholds
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  primaryButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonIcon: {
    fontSize: '14px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#666',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    color: 'teal',
  },
  alertsSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionIcon: {
    color: 'teal',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  alertCard: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '6px',
    padding: '15px',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  alertMessage: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  alertActions: {
    display: 'flex',
    gap: '8px',
  },
  alertActionButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '5px',
  },
  alertDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
  },
  alertTimestamp: {
    fontStyle: 'italic',
  },
  alertValues: {
    fontWeight: 'bold',
  },
  statsSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    marginBottom: '20px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '15px',
  },
  statCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
    padding: '15px',
    textAlign: 'center',
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  statIcon: {
    fontSize: '18px',
    color: 'teal',
  },
  statLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px',
  },
  statThreshold: {
    fontSize: '12px',
    color: '#999',
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic',
  },
  historySection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
  },
  historyTable: {
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f8f8f8',
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '1px solid #ddd',
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
  },
  tableCell: {
    padding: '12px',
    fontSize: '14px',
    color: '#333',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '15px',
    color: '#ccc',
  },
  emptyText: {
    fontSize: '16px',
    margin: 0,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #f0f0f0',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
    padding: '5px',
  },
  modalContent: {
    padding: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  saveButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default PerformanceMonitoringScreen;
