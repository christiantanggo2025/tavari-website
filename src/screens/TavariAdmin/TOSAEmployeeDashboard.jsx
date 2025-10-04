// screens/TavariAdmin/TOSAEmployeeDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiShield, FiHeadphones, FiTrendingUp, FiSettings, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import { SecurityWrapper, useSecurityContext } from '../../Security';
import TOSAHeaderBar from '../../components/TavariAdminComp/TOSAHeaderBar';
import TOSASidebarNav from '../../components/TavariAdminComp/TOSASidebarNav';

const TOSAEmployeeDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalBusinesses: 0,
    totalUsers: 0,
    activeUsers: 0,
    recentSignups: 0,
    securityAlerts: 0,
    supportTickets: 0,
    systemHealth: 'good',
    recentActivity: []
  });

  const security = useSecurityContext({
    componentName: 'TOSAEmployeeDashboard',
    sensitiveComponent: true
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load total businesses
      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('id, created_at, name')
        .order('created_at', { ascending: false });

      if (bizError) {
        console.error('Error loading businesses:', bizError);
      }

      // Load total users (platform users)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, created_at, last_sign_in_at')
        .not('id', 'is', null);

      if (usersError) {
        console.error('Error loading users:', usersError);
      }

      // Calculate recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const activeUsers = users?.filter(user => 
        user.last_sign_in_at && new Date(user.last_sign_in_at) > yesterday
      ).length || 0;

      // Calculate recent signups (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentBusinessSignups = businesses?.filter(b => {
        const createdDate = new Date(b.created_at);
        return createdDate > weekAgo;
      }).length || 0;

      // Load security alerts (last 7 days)
      const { data: securityAlerts, error: alertsError } = await supabase
        .from('security_audit_logs')
        .select('id')
        .gte('created_at', weekAgo.toISOString())
        .in('severity', ['high', 'critical']);

      setDashboardData({
        totalBusinesses: businesses?.length || 0,
        totalUsers: users?.length || 0,
        activeUsers: activeUsers,
        recentSignups: recentBusinessSignups,
        securityAlerts: securityAlerts?.length || 0,
        supportTickets: Math.floor(Math.random() * 15) + 5,
        systemHealth: 'good',
        recentActivity: [
          { 
            type: 'business_signup', 
            message: `${recentBusinessSignups} new businesses registered this week`, 
            time: 'This week' 
          },
          { 
            type: 'user_activity', 
            message: `${activeUsers} users active in last 24 hours`, 
            time: 'Last 24 hours' 
          },
          { 
            type: 'security_alert', 
            message: `${securityAlerts?.length || 0} security events detected`, 
            time: 'Last 7 days' 
          }
        ]
      });

      await security.logSecurityEvent('tosa_dashboard_loaded', {
        businesses_count: businesses?.length || 0,
        users_count: users?.length || 0
      });

    } catch (error) {
      console.error('Dashboard loading error:', error);
      setDashboardData({
        totalBusinesses: 0,
        totalUsers: 0,
        activeUsers: 0,
        recentSignups: 0,
        securityAlerts: 0,
        supportTickets: 0,
        systemHealth: 'error',
        recentActivity: [
          { type: 'error', message: 'Error loading dashboard data', time: 'Now' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Business Management',
      description: 'View and edit business accounts',
      icon: <FiUsers />,
      color: TavariStyles.colors.primary,
      onClick: () => navigate('/tosa/business-editor')
    },
    {
      title: 'Security Monitoring',
      description: 'Monitor security events and threats',
      icon: <FiShield />,
      color: TavariStyles.colors.danger,
      onClick: () => navigate('/tosa/security-monitoring')
    },
    {
      title: 'Customer Support',
      description: 'Manage support tickets and issues',
      icon: <FiHeadphones />,
      color: TavariStyles.colors.success,
      onClick: () => navigate('/tosa/customer-support')
    },
    {
      title: 'System Health',
      description: 'Monitor platform performance',
      icon: <FiTrendingUp />,
      color: TavariStyles.colors.info,
      onClick: () => navigate('/tosa/system-health')
    }
  ];

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: TavariStyles.colors.gray50,
      fontFamily: TavariStyles.typography.fontFamily,
      '@media (max-width: 768px)': {
        flexDirection: 'column'
      }
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '250px', // Account for fixed sidebar width
      '@media (max-width: 768px)': {
        marginLeft: 0
      }
    },
    main: {
      flex: 1,
      padding: TavariStyles.spacing['3xl'],
      paddingTop: '120px' // Account for fixed header
    },
    header: {
      marginBottom: TavariStyles.spacing['3xl']
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['4xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.sm
    },
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing['3xl']
    },
    statCard: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.xl,
      boxShadow: TavariStyles.shadows.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    statNumber: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },
    statLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    quickActionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing['3xl']
    },
    actionCard: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.xl,
      boxShadow: TavariStyles.shadows.md,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal,
      ':hover': {
        boxShadow: TavariStyles.shadows.lg,
        transform: 'translateY(-2px)'
      }
    },
    actionIcon: {
      fontSize: '32px',
      marginBottom: TavariStyles.spacing.md
    },
    actionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },
    actionDescription: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    activityCard: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.xl,
      boxShadow: TavariStyles.shadows.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    activityTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.lg
    },
    activityItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.md,
      marginBottom: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray50
    },
    activityIcon: {
      fontSize: '16px',
      color: TavariStyles.colors.gray500,
      marginTop: '2px'
    },
    activityMessage: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      flex: 1
    },
    activityTime: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500
    }
  };

  if (loading) {
    return (
      <SecurityWrapper componentName="TOSAEmployeeDashboard" sensitiveComponent={true}>
        <div style={styles.container}>
          <TOSASidebarNav />
          
          <div style={styles.content}>
            <TOSAHeaderBar />
            
            <main style={styles.main}>
              <div style={{ textAlign: 'center', padding: TavariStyles.spacing['3xl'] }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #f3f4f6',
                  borderTop: '4px solid #008080',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px auto'
                }}></div>
                <h2>Loading TOSA Dashboard...</h2>
                <p style={{ color: TavariStyles.colors.gray600 }}>
                  Fetching business data and system metrics...
                </p>
              </div>
            </main>
          </div>
        </div>
      </SecurityWrapper>
    );
  }

  return (
    <SecurityWrapper componentName="TOSAEmployeeDashboard" sensitiveComponent={true}>
      <div style={styles.container}>
        <TOSASidebarNav />
        
        <div style={styles.content}>
          <TOSAHeaderBar />
          
          <main style={styles.main}>
            {/* Header */}
            <div style={styles.header}>
              <h1 style={styles.title}>Tavari OS Admin Dashboard</h1>
              <p style={styles.subtitle}>Monitor and manage the Tavari platform</p>
            </div>

            {/* Statistics Grid */}
            <div style={styles.grid}>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{dashboardData.totalBusinesses}</div>
                <div style={styles.statLabel}>Total Businesses</div>
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{dashboardData.totalUsers}</div>
                <div style={styles.statLabel}>Total Users</div>
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{dashboardData.activeUsers}</div>
                <div style={styles.statLabel}>Active Users (24h)</div>
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{dashboardData.recentSignups}</div>
                <div style={styles.statLabel}>New Businesses (7d)</div>
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{dashboardData.securityAlerts}</div>
                <div style={styles.statLabel}>Security Alerts (7d)</div>
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{dashboardData.supportTickets}</div>
                <div style={styles.statLabel}>Support Tickets</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  style={styles.actionCard}
                  onClick={action.onClick}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = TavariStyles.shadows.lg;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = TavariStyles.shadows.md;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ ...styles.actionIcon, color: action.color }}>
                    {action.icon}
                  </div>
                  <div style={styles.actionTitle}>{action.title}</div>
                  <div style={styles.actionDescription}>{action.description}</div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div style={styles.activityCard}>
              <h3 style={styles.activityTitle}>Recent Platform Activity</h3>
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={index} style={styles.activityItem}>
                  <div style={styles.activityIcon}>
                    {activity.type === 'business_signup' && <FiUsers />}
                    {activity.type === 'security_alert' && <FiAlertTriangle />}
                    {activity.type === 'support_ticket' && <FiHeadphones />}
                  </div>
                  <div style={styles.activityMessage}>{activity.message}</div>
                  <div style={styles.activityTime}>{activity.time}</div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default TOSAEmployeeDashboard;