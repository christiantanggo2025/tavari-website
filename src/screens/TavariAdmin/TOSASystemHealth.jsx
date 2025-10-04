// TOSASystemHealth.jsx
import React, { useState, useEffect } from 'react';
import { FiMonitor, FiDatabase, FiCpu, FiHardDrive } from 'react-icons/fi';
import { TavariStyles } from '../../utils/TavariStyles';
import { SecurityWrapper } from '../../Security';
import { useTOSATavariAuth } from '../../hooks/useTOSATavariAuth';
import TOSAHeaderBar from '../../components/TavariAdminComp/TOSAHeaderBar';
import TOSASidebarNav from '../../components/TavariAdminComp/TOSASidebarNav';

const TOSASystemHealth = () => {
  const [metrics, setMetrics] = useState({
    uptime: '99.9%',
    responseTime: '120ms',
    dbConnections: '45/100',
    storageUsed: '67%',
    cpuUsage: '23%',
    memoryUsage: '45%'
  });

  const auth = useTOSATavariAuth({
    requiredPermissions: ['system_monitoring'],
    componentName: 'TOSASystemHealth'
  });

  const styles = {
    container: { display: 'flex', minHeight: '100vh', backgroundColor: TavariStyles.colors.gray50 },
    content: { flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '250px' },
    main: { flex: 1, padding: TavariStyles.spacing.xl, paddingTop: '120px' },
    title: { fontSize: TavariStyles.typography.fontSize['2xl'], fontWeight: TavariStyles.typography.fontWeight.bold, marginBottom: TavariStyles.spacing.xl },
    metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: TavariStyles.spacing.lg },
    metricCard: { backgroundColor: TavariStyles.colors.white, padding: TavariStyles.spacing.lg, borderRadius: TavariStyles.borderRadius.lg, boxShadow: TavariStyles.shadows.md, textAlign: 'center' },
    metricValue: { fontSize: TavariStyles.typography.fontSize['2xl'], fontWeight: TavariStyles.typography.fontWeight.bold, color: TavariStyles.colors.primary },
    metricLabel: { fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray600, marginTop: TavariStyles.spacing.xs }
  };

  if (!auth.isAuthenticated) return <div>Access denied.</div>;

  return (
    <SecurityWrapper componentName="TOSASystemHealth">
      <div style={styles.container}>
        <TOSASidebarNav />
        <div style={styles.content}>
          <TOSAHeaderBar />
          <main style={styles.main}>
            <h1 style={styles.title}>System Health & Performance</h1>
            <div style={styles.metricsGrid}>
              {Object.entries(metrics).map(([key, value]) => (
                <div key={key} style={styles.metricCard}>
                  <div style={styles.metricValue}>{value}</div>
                  <div style={styles.metricLabel}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default TOSASystemHealth;