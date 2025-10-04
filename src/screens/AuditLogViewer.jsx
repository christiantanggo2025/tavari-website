import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useBusiness } from '../contexts/BusinessContext';
import { TavariStyles } from '../utils/TavariStyles';
import POSAuthWrapper from '../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../hooks/usePOSAuth';
import { Download } from 'lucide-react';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  // Use the exact same business pattern as HeaderBar
  const { business } = useBusiness();
  const selectedBiz = business?.id || '';

  const auth = usePOSAuth({
    requiredRoles: ['owner', 'manager'],
    requireBusiness: true,
    componentName: 'AuditLogViewer'
  });

  useEffect(() => {
    if (auth.isReady && selectedBiz) {
      console.log('AuditLogViewer: Auth ready, loading data for business:', selectedBiz);
      loadUsers();
      loadLogs();
    }
  }, [selectedBiz, auth.isReady]);

  const loadUsers = async () => {
    if (!selectedBiz) return;

    try {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, users(email)')
        .eq('business_id', selectedBiz)
        .eq('active', true);

      if (data) {
        const mapped = data.map(entry => ({
          id: entry.user_id,
          email: entry.users?.email || ''
        }));
        setUsers(mapped);
        console.log('AuditLogViewer: Loaded users:', mapped.length);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    }
  };

  const loadLogs = async () => {
    if (!selectedBiz) return;

    setLoading(true);
    setError(null);

    try {
      console.log('AuditLogViewer: Loading logs for business:', selectedBiz);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', selectedBiz)
        .order('created_at', { ascending: false })
        .limit(200);

      if (eventTypeFilter) {
        query = query.eq('event_type', eventTypeFilter);
      }
      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query;
      console.log('AuditLogViewer: Audit logs query result:', { 
        data, 
        error, 
        count: data?.length,
        business_id_filter: selectedBiz
      });
      
      if (error) throw error;
      
      setLogs(data || []);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError(`Failed to load audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // NEW: CSV Export functionality
  const exportToCSV = async () => {
    if (!selectedBiz) {
      alert('No business selected for export');
      return;
    }

    setExporting(true);
    try {
      console.log('AuditLogViewer: Starting CSV export...');

      // Load ALL logs with current filters (not limited to 200)
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', selectedBiz)
        .order('created_at', { ascending: false });

      if (eventTypeFilter) {
        query = query.eq('event_type', eventTypeFilter);
      }
      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      const { data: exportLogs, error } = await query;
      
      if (error) throw error;

      if (!exportLogs || exportLogs.length === 0) {
        alert('No audit logs found to export with current filters');
        return;
      }

      // Convert logs to CSV format
      const csvContent = generateCSV(exportLogs);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename with current date and filters
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        
        let filename = `audit_logs_${dateStr}_${timeStr}`;
        if (eventTypeFilter) filename += `_${eventTypeFilter}`;
        if (userFilter) {
          const user = users.find(u => u.id === userFilter);
          if (user) filename += `_${user.email.split('@')[0]}`;
        }
        filename += '.csv';
        
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Log the export action
        await supabase.from('audit_logs').insert({
          business_id: selectedBiz,
          user_id: auth.authUser.id,
          event_type: 'audit_logs_exported',
          details: {
            exported_count: exportLogs.length,
            filters: {
              event_type: eventTypeFilter || 'all',
              user_filter: userFilter || 'all',
              start_date: startDate || 'none',
              end_date: endDate || 'none'
            },
            filename: filename
          }
        });

        console.log(`AuditLogViewer: Exported ${exportLogs.length} logs to ${filename}`);
        alert(`Successfully exported ${exportLogs.length} audit logs to ${filename}`);
      }
      
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Generate CSV content from audit logs
  const generateCSV = (logsData) => {
    // CSV Headers
    const headers = [
      'Date',
      'Time',
      'Event Type',
      'User Email',
      'User ID',
      'Business ID',
      'Details'
    ];

    // Convert each log to CSV row
    const rows = logsData.map(log => {
      const date = new Date(log.created_at);
      const userEmail = formatUserEmail(log.user_id);
      
      // Flatten details object to string for CSV
      let detailsStr = '';
      if (log.details && typeof log.details === 'object') {
        try {
          // Create a readable summary of key details
          const keyDetails = extractKeyDetails(log.details);
          if (Object.keys(keyDetails).length > 0) {
            detailsStr = Object.entries(keyDetails)
              .map(([key, value]) => `${key}=${value}`)
              .join('; ');
          } else {
            // Fallback to JSON string
            detailsStr = JSON.stringify(log.details);
          }
        } catch (err) {
          detailsStr = String(log.details);
        }
      }

      return [
        date.toLocaleDateString('en-CA'), // Date
        date.toLocaleTimeString('en-CA', { hour12: false }), // Time
        log.event_type || '', // Event Type
        userEmail, // User Email
        log.user_id || '', // User ID
        log.business_id || '', // Business ID
        escapeCSVField(detailsStr) // Details
      ];
    });

    // Combine headers and rows
    const csvLines = [headers, ...rows];
    
    // Convert to CSV string
    return csvLines.map(row => 
      row.map(field => escapeCSVField(String(field))).join(',')
    ).join('\n');
  };

  // Escape CSV fields containing commas, quotes, or newlines
  const escapeCSVField = (field) => {
    if (!field) return '""';
    
    const str = String(field);
    
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    
    return str;
  };

  const formatUserEmail = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.email : userId;
  };

  const extractKeyDetails = (details) => {
    if (!details || typeof details !== 'object') return {};
    
    const keyFields = {};
    
    // Extract important fields in readable format
    if (details.original_event_type) keyFields.action = details.original_event_type;
    if (details.url) keyFields.page = details.url.split('/').pop() || details.url;
    if (details.to_tab) keyFields.tab = details.to_tab;
    if (details.from_tab) keyFields.from_tab = details.from_tab;
    if (details.setting_name) keyFields.setting = details.setting_name;
    if (details.old_value) keyFields.old_value = details.old_value;
    if (details.new_value) keyFields.new_value = details.new_value;
    if (details.user_agent) {
      // Extract browser info
      const ua = details.user_agent;
      if (ua.includes('Chrome')) keyFields.browser = 'Chrome';
      else if (ua.includes('Firefox')) keyFields.browser = 'Firefox';
      else if (ua.includes('Safari')) keyFields.browser = 'Safari';
      else if (ua.includes('Edge')) keyFields.browser = 'Edge';
      else keyFields.browser = 'Other';
    }
    
    return keyFields;
  };

  const styles = {
    container: {
      ...TavariStyles.layout.container,
      maxWidth: '1400px',
      margin: '0 auto'
    },
    
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing['2xl'],
      paddingBottom: TavariStyles.spacing.lg,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    
    businessInfo: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontStyle: 'italic'
    },

    // NEW: Export button styles
    headerActions: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center'
    },

    exportButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.md,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },

    exportButtonDisabled: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.md,
      opacity: 0.5,
      cursor: 'not-allowed',
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    
    filtersCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.xl
    },
    
    filtersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg
    },
    
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    
    label: {
      ...TavariStyles.components.form.label,
      margin: 0
    },
    
    select: {
      ...TavariStyles.components.form.select
    },
    
    input: {
      ...TavariStyles.components.form.input
    },
    
    refreshButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md,
      alignSelf: 'flex-end'
    },
    
    tableContainer: {
      ...TavariStyles.components.table.container,
      overflowX: 'auto'
    },
    
    table: {
      ...TavariStyles.components.table.table,
      minWidth: '1200px'
    },
    
    headerRow: {
      ...TavariStyles.components.table.headerRow
    },
    
    th: {
      ...TavariStyles.components.table.th,
      whiteSpace: 'nowrap'
    },
    
    row: {
      ...TavariStyles.components.table.row,
      cursor: 'pointer'
    },
    
    expandedRow: {
      ...TavariStyles.components.table.row,
      backgroundColor: TavariStyles.colors.gray50,
      cursor: 'pointer'
    },
    
    suspiciousRow: {
      ...TavariStyles.components.table.row,
      backgroundColor: TavariStyles.colors.errorBg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      cursor: 'pointer'
    },
    
    td: {
      ...TavariStyles.components.table.td,
      verticalAlign: 'top'
    },
    
    dateCell: {
      ...TavariStyles.components.table.td,
      minWidth: '140px',
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    eventTypeCell: {
      ...TavariStyles.components.table.td,
      minWidth: '160px'
    },
    
    userCell: {
      ...TavariStyles.components.table.td,
      minWidth: '200px',
      fontSize: TavariStyles.typography.fontSize.sm
    },
    
    detailsCell: {
      ...TavariStyles.components.table.td,
      maxWidth: '300px',
      minWidth: '250px'
    },
    
    keyDetail: {
      display: 'inline-block',
      backgroundColor: TavariStyles.colors.gray100,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      marginRight: TavariStyles.spacing.xs,
      marginBottom: TavariStyles.spacing.xs,
      border: `1px solid ${TavariStyles.colors.gray300}`
    },
    
    keyDetailLabel: {
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700
    },
    
    keyDetailValue: {
      color: TavariStyles.colors.gray600,
      marginLeft: TavariStyles.spacing.xs
    },
    
    expandButton: {
      background: 'none',
      border: 'none',
      color: TavariStyles.colors.primary,
      cursor: 'pointer',
      fontSize: TavariStyles.typography.fontSize.sm,
      padding: TavariStyles.spacing.xs,
      borderRadius: TavariStyles.borderRadius.sm,
      marginTop: TavariStyles.spacing.xs
    },
    
    rawDetails: {
      backgroundColor: TavariStyles.colors.gray50,
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontFamily: TavariStyles.typography.fontFamilyMono,
      whiteSpace: 'pre-wrap',
      maxHeight: '200px',
      overflow: 'auto',
      marginTop: TavariStyles.spacing.sm,
      border: `1px solid ${TavariStyles.colors.gray300}`
    },
    
    suspiciousIcon: {
      color: TavariStyles.colors.danger,
      marginLeft: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.lg
    },
    
    loadingContainer: {
      ...TavariStyles.layout.flexCenter,
      height: '300px',
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },
    
    errorContainer: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      textAlign: 'center'
    },
    
    emptyState: {
      ...TavariStyles.layout.flexCenter,
      height: '300px',
      flexDirection: 'column',
      color: TavariStyles.colors.gray500
    },
    
    emptyStateText: {
      fontSize: TavariStyles.typography.fontSize.lg,
      marginBottom: TavariStyles.spacing.md
    },
    
    originalEventType: {
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      display: 'inline-block'
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={styles.loadingContainer}>
          Loading audit logs...
        </div>
      );
    }

    if (error) {
      return (
        <div style={styles.errorContainer}>
          {error}
        </div>
      );
    }

    if (logs.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateText}>
            No audit logs found
          </div>
          <div>
            Try adjusting your filters or date range
          </div>
          <div style={{ marginTop: TavariStyles.spacing.md, fontSize: TavariStyles.typography.fontSize.sm }}>
            Searching for business: {selectedBiz}
          </div>
        </div>
      );
    }

    return (
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Date & Time</th>
              <th style={styles.th}>Event Type</th>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Key Details</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const isSuspicious = log.event_type === 'suspicious_activity';
              const isExpanded = expandedRow === log.id;
              const originalEventType = log.details?.original_event_type;
              const keyDetails = extractKeyDetails(log.details);
              
              return (
                <React.Fragment key={log.id}>
                  <tr
                    style={isSuspicious ? styles.suspiciousRow : (isExpanded ? styles.expandedRow : styles.row)}
                    onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                  >
                    <td style={styles.dateCell}>
                      {new Date(log.created_at).toLocaleDateString('en-CA')}
                      <br />
                      <span style={{ color: TavariStyles.colors.gray500 }}>
                        {new Date(log.created_at).toLocaleTimeString('en-CA', { 
                          hour12: false, 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </td>
                    <td style={styles.eventTypeCell}>
                      <div>
                        {log.event_type}
                        {isSuspicious && (
                          <span style={styles.suspiciousIcon}>🚨</span>
                        )}
                      </div>
                      {originalEventType && (
                        <div style={{ marginTop: TavariStyles.spacing.xs }}>
                          <span style={styles.originalEventType}>
                            {originalEventType}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={styles.userCell}>
                      {formatUserEmail(log.user_id)}
                    </td>
                    <td style={styles.detailsCell}>
                      {Object.entries(keyDetails).map(([key, value]) => (
                        <div key={key} style={styles.keyDetail}>
                          <span style={styles.keyDetailLabel}>{key}:</span>
                          <span style={styles.keyDetailValue}>
                            {String(value).length > 30 ? String(value).substring(0, 30) + '...' : String(value)}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td style={styles.td}>
                      <button 
                        style={styles.expandButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRow(isExpanded ? null : log.id);
                        }}
                      >
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan="5" style={styles.td}>
                        <div style={styles.rawDetails}>
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <POSAuthWrapper
      requiredRoles={['owner', 'manager']}
      requireBusiness={true}
      componentName="AuditLogViewer"
    >
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Audit Logs</h1>
            {business && (
              <div style={styles.businessInfo}>
                Viewing logs for: {business.name} ({selectedBiz})
              </div>
            )}
          </div>
          
          {/* NEW: Export button in header */}
          <div style={styles.headerActions}>
            <button
              style={exporting ? styles.exportButtonDisabled : styles.exportButton}
              onClick={exportToCSV}
              disabled={exporting || loading || logs.length === 0}
              title="Export current filtered logs to CSV"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div style={styles.filtersCard}>
          <div style={styles.filtersGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Event Type</label>
              <select 
                style={styles.select}
                value={eventTypeFilter} 
                onChange={e => setEventTypeFilter(e.target.value)}
              >
                <option value="">All Events</option>
                <option value="login">Login</option>
                <option value="failed_login">Failed Login</option>
                <option value="logout">Logout</option>
                <option value="timeout_logout">Timeout Logout</option>
                <option value="user_created">User Created</option>
                <option value="pin_change">PIN Change</option>
                <option value="user_profile_access">Profile Access</option>
                <option value="suspicious_activity">Suspicious Activity</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>User</label>
              <select 
                style={styles.select}
                value={userFilter} 
                onChange={e => setUserFilter(e.target.value)}
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>Start Date</label>
              <input 
                type="date" 
                style={styles.input}
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>End Date</label>
              <input 
                type="date" 
                style={styles.input}
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
              />
            </div>
          </div>

          <button 
            onClick={loadLogs} 
            style={styles.refreshButton}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh Logs'}
          </button>
        </div>

        {renderContent()}
      </div>
    </POSAuthWrapper>
  );
};

export default AuditLogViewer;