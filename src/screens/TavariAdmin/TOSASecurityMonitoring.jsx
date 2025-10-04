// screens/TavariAdmin/TOSASecurityMonitoring.jsx
import React, { useState, useEffect } from 'react';
import { FiShield, FiAlertTriangle, FiFilter, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import { SecurityWrapper } from '../../Security';
import { useTOSATavariAuth } from '../../hooks/useTOSATavariAuth';
import { useTOSAMultiBusinessData } from '../../hooks/useTOSAMultiBusinessData';
import TOSAHeaderBar from '../../components/TavariAdminComp/TOSAHeaderBar';
import TOSASidebarNav from '../../components/TavariAdminComp/TOSASidebarNav';
import TOSABusinessSelector from '../../components/TavariAdminComp/TOSABusinessSelector';

const TOSASecurityMonitoring = () => {
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    severity: 'all',
    eventType: 'all',
    timeRange: '7',
    businessId: 'all'
  });

  const auth = useTOSATavariAuth({
    requiredPermissions: ['security_monitoring'],
    componentName: 'TOSASecurityMonitoring'
  });

  const { businesses, getSecuritySummary } = useTOSAMultiBusinessData({
    autoLoad: true
  });

  useEffect(() => {
    loadSecurityEvents();
  }, [filters]);

  const loadSecurityEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('security_audit_logs')
        .select(`
          *,
          businesses (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (filters.businessId !== 'all') {
        query = query.eq('business_id', filters.businessId);
      }

      if (filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }

      if (filters.eventType !== 'all') {
        query = query.eq('event_type', filters.eventType);
      }

      // Time range filter
      const daysAgo = parseInt(filters.timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      query = query.gte('created_at', startDate.toISOString());

      const { data, error } = await query;

      if (error) throw error;
      setSecurityEvents(data || []);

      await auth.logUserAction('security_events_loaded', {
        filters: filters,
        count: data?.length || 0
      });

    } catch (error) {
      console.error('Error loading security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return TavariStyles.colors.danger;
      case 'high': return TavariStyles.colors.warning;
      case 'medium': return TavariStyles.colors.info;
      case 'low': return TavariStyles.colors.success;
      default: return TavariStyles.colors.gray400;
    }
  };

  const exportSecurityData = async () => {
    try {
      const csvData = securityEvents.map(event => ({
        timestamp: new Date(event.created_at).toLocaleString(),
        business: event.businesses?.name || 'Unknown',
        severity: event.severity,
        event_type: event.event_type,
        user_id: event.user_id || 'System',
        details: JSON.stringify(event.details)
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      await auth.logUserAction('security_data_exported', {
        event_count: securityEvents.length,
        filters: filters
      });

    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: TavariStyles.colors.gray50,
      fontFamily: TavariStyles.typography.fontFamily
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '250px' // Account for fixed sidebar width
    },
    main: {
      flex: 1,
      padding: TavariStyles.spacing.xl,
      paddingTop: '120px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.xl
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800
    },
    actions: {
      display: 'flex',
      gap: TavariStyles.spacing.md
    },
    button: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    primaryButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary
    },
    filtersCard: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg,
      boxShadow: TavariStyles.shadows.md
    },
    filtersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.lg,
      alignItems: 'end'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs
    },
    label: {
      ...TavariStyles.components.form.label
    },
    select: {
      ...TavariStyles.components.form.select
    },
    summaryCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.xl
    },
    summaryCard: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.lg,
      boxShadow: TavariStyles.shadows.md
    },
    summaryNumber: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.xs
    },
    summaryLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    eventsTable: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      boxShadow: TavariStyles.shadows.md,
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray100,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      textAlign: 'left',
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    td: {
      padding: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
      verticalAlign: 'top'
    },
    severityBadge: {
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.white
    },
    eventDetails: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      maxWidth: '300px',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  };

  if (auth.authLoading) {
    return <div>Loading Security Monitoring...</div>;
  }

  if (!auth.isAuthenticated) {
    return <div>Access denied. Security monitoring access required.</div>;
  }

  const criticalEvents = securityEvents.filter(e => e.severity === 'critical').length;
  const highEvents = securityEvents.filter(e => e.severity === 'high').length;
  const todayEvents = securityEvents.filter(e => 
    new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <SecurityWrapper componentName="TOSASecurityMonitoring" sensitiveComponent={true}>
      <div style={styles.container}>
        <TOSASidebarNav />
        
        <div style={styles.content}>
          <TOSAHeaderBar />
          
          <main style={styles.main}>
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>Security Monitoring</h1>
                <TOSABusinessSelector onBusinessSelect={(business) => {
                  setSelectedBusinessId(business?.id);
                  setFilters(prev => ({ ...prev, businessId: business?.id || 'all' }));
                }} />
              </div>
              
              <div style={styles.actions}>
                <button style={styles.button} onClick={loadSecurityEvents} disabled={loading}>
                  <FiRefreshCw />
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
                <button style={styles.button} onClick={exportSecurityData}>
                  <FiDownload />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryCards}>
              <div style={styles.summaryCard}>
                <div style={{...styles.summaryNumber, color: TavariStyles.colors.danger}}>
                  {criticalEvents}
                </div>
                <div style={styles.summaryLabel}>Critical Events</div>
              </div>
              
              <div style={styles.summaryCard}>
                <div style={{...styles.summaryNumber, color: TavariStyles.colors.warning}}>
                  {highEvents}
                </div>
                <div style={styles.summaryLabel}>High Priority Events</div>
              </div>
              
              <div style={styles.summaryCard}>
                <div style={{...styles.summaryNumber, color: TavariStyles.colors.info}}>
                  {todayEvents}
                </div>
                <div style={styles.summaryLabel}>Today's Events</div>
              </div>
              
              <div style={styles.summaryCard}>
                <div style={{...styles.summaryNumber, color: TavariStyles.colors.success}}>
                  {securityEvents.length}
                </div>
                <div style={styles.summaryLabel}>Total Events</div>
              </div>
            </div>

            {/* Filters */}
            <div style={styles.filtersCard}>
              <div style={styles.filtersGrid}>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Severity</label>
                  <select
                    style={styles.select}
                    value={filters.severity}
                    onChange={(e) => setFilters({...filters, severity: e.target.value})}
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.label}>Event Type</label>
                  <select
                    style={styles.select}
                    value={filters.eventType}
                    onChange={(e) => setFilters({...filters, eventType: e.target.value})}
                  >
                    <option value="all">All Types</option>
                    <option value="login_failure">Login Failures</option>
                    <option value="unauthorized_access">Unauthorized Access</option>
                    <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
                    <option value="suspicious_activity">Suspicious Activity</option>
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.label}>Time Range</label>
                  <select
                    style={styles.select}
                    value={filters.timeRange}
                    onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
                  >
                    <option value="1">Last 24 Hours</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.label}>Business</label>
                  <select
                    style={styles.select}
                    value={filters.businessId}
                    onChange={(e) => setFilters({...filters, businessId: e.target.value})}
                  >
                    <option value="all">All Businesses</option>
                    {businesses.map(business => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Events Table */}
            <div style={styles.eventsTable}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>Business</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Event Type</th>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {securityEvents.map((event, index) => (
                    <tr key={index}>
                      <td style={styles.td}>
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td style={styles.td}>
                        {event.businesses?.name || 'System'}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.severityBadge,
                            backgroundColor: getSeverityColor(event.severity)
                          }}
                        >
                          {event.severity}
                        </span>
                      </td>
                      <td style={styles.td}>{event.event_type}</td>
                      <td style={styles.td}>{event.user_id || 'System'}</td>
                      <td style={styles.td}>
                        <div style={styles.eventDetails}>
                          {JSON.stringify(event.details)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {securityEvents.length === 0 && !loading && (
                <div style={{ padding: TavariStyles.spacing.xl, textAlign: 'center', color: TavariStyles.colors.gray500 }}>
                  No security events found for the selected filters.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default TOSASecurityMonitoring;