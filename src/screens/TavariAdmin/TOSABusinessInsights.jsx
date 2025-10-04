// TOSABusinessInsights.jsx
import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiUsers, FiDollarSign, FiBarChart } from 'react-icons/fi';
import { TavariStyles } from '../../utils/TavariStyles';
import { SecurityWrapper } from '../../Security';
import { useTOSATavariAuth } from '../../hooks/useTOSATavariAuth';
import TOSAHeaderBar from '../../components/TavariAdminComp/TOSAHeaderBar';
import TOSASidebarNav from '../../components/TavariAdminComp/TOSASidebarNav';

const TOSABusinessInsights = () => {
  const [insights, setInsights] = useState({
    totalRevenue: '$2,456,789',
    activeBusinesses: '1,234',
    monthlyGrowth: '+12.5%',
    customerSatisfaction: '94.2%'
  });

  const auth = useTOSATavariAuth({
    requiredPermissions: ['business_insights'],
    componentName: 'TOSABusinessInsights'
  });

  const styles = {
    container: { display: 'flex', minHeight: '100vh', backgroundColor: TavariStyles.colors.gray50 },
    content: { flex: 1, display: 'flex', flexDirection: 'column' },
    main: { flex: 1, padding: TavariStyles.spacing.xl, paddingTop: '120px' },
    title: { fontSize: TavariStyles.typography.fontSize['2xl'], fontWeight: TavariStyles.typography.fontWeight.bold, marginBottom: TavariStyles.spacing.xl },
    insightsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: TavariStyles.spacing.lg },
    insightCard: { backgroundColor: TavariStyles.colors.white, padding: TavariStyles.spacing.lg, borderRadius: TavariStyles.borderRadius.lg, boxShadow: TavariStyles.shadows.md, textAlign: 'center' },
    insightValue: { fontSize: TavariStyles.typography.fontSize['2xl'], fontWeight: TavariStyles.typography.fontWeight.bold, color: TavariStyles.colors.success },
    insightLabel: { fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray600, marginTop: TavariStyles.spacing.xs }
  };

  if (!auth.isAuthenticated) return <div>Access denied.</div>;

  return (
    <SecurityWrapper componentName="TOSABusinessInsights">
      <div style={styles.container}>
        <TOSASidebarNav />
        <div style={styles.content}>
          <TOSAHeaderBar />
          <main style={styles.main}>
            <h1 style={styles.title}>Business Insights & Analytics</h1>
            <div style={styles.insightsGrid}>
              {Object.entries(insights).map(([key, value]) => (
                <div key={key} style={styles.insightCard}>
                  <div style={styles.insightValue}>{value}</div>
                  <div style={styles.insightLabel}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default TOSABusinessInsights;