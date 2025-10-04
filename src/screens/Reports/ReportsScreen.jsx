// screens/Reports/ReportsScreen.jsx
import React, { useState } from 'react';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import POSReportsScreen from '../POS/POSReportsScreen';
import { TavariStyles } from '../../utils/TavariStyles';

const ReportsScreen = () => {
  const [activeTab, setActiveTab] = useState('pos');

  const tabs = [
    { id: 'pos', name: 'POS Reports', icon: '🏪' },
    { id: 'music', name: 'Music Reports', icon: '🎵', disabled: true },
    { id: 'mail', name: 'Mail Reports', icon: '📧', disabled: true },
    { id: 'hr', name: 'HR Reports', icon: '👥', disabled: true },
    { id: 'overview', name: 'Business Overview', icon: '📊', disabled: true }
  ];

  const styles = {
    container: {
      ...TavariStyles.layout.container
    },
    
    header: {
      marginBottom: TavariStyles.spacing['3xl'],
      textAlign: 'center'
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md
    },
    
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },
    
    tabContainer: {
      marginBottom: TavariStyles.spacing.xl,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows.sm,
      overflow: 'hidden'
    },
    
    tabList: {
      display: 'flex',
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    tab: {
      flex: 1,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      border: 'none',
      cursor: 'pointer',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: TavariStyles.spacing.sm,
      transition: TavariStyles.transitions.normal,
      borderRight: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    tabActive: {
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white
    },
    
    tabDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      backgroundColor: TavariStyles.colors.gray100
    },
    
    tabContent: {
      minHeight: '600px'
    },
    
    placeholderContent: {
      padding: TavariStyles.spacing['4xl'],
      textAlign: 'center',
      color: TavariStyles.colors.gray500
    },
    
    comingSoon: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      marginBottom: TavariStyles.spacing.lg
    },
    
    comingDescription: {
      fontSize: TavariStyles.typography.fontSize.base,
      lineHeight: TavariStyles.typography.lineHeight.relaxed,
      maxWidth: '500px',
      margin: '0 auto'
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pos':
        return (
          <div style={styles.tabContent}>
            {/* Remove the wrapper here since POSReportsScreen will handle its own auth */}
            <POSReportsContentWrapper />
          </div>
        );
      
      case 'music':
        return (
          <div style={styles.placeholderContent}>
            <div style={styles.comingSoon}>Music Reports Coming Soon</div>
            <div style={styles.comingDescription}>
              Track music performance, licensing fees, playlist analytics, and venue engagement metrics.
            </div>
          </div>
        );
      
      case 'mail':
        return (
          <div style={styles.placeholderContent}>
            <div style={styles.comingSoon}>Mail Reports Coming Soon</div>
            <div style={styles.comingDescription}>
              Analyze email campaign performance, delivery rates, customer engagement, and ROI metrics.
            </div>
          </div>
        );
      
      case 'hr':
        return (
          <div style={styles.placeholderContent}>
            <div style={styles.comingSoon}>HR Reports Coming Soon</div>
            <div style={styles.comingDescription}>
              Monitor employee performance, attendance, training compliance, and workforce analytics.
            </div>
          </div>
        );
      
      case 'overview':
        return (
          <div style={styles.placeholderContent}>
            <div style={styles.comingSoon}>Business Overview Coming Soon</div>
            <div style={styles.comingDescription}>
              Comprehensive business intelligence combining data from all Tavari modules for executive insights.
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Business Reports & Analytics</h1>
        <p style={styles.subtitle}>Comprehensive reporting across all Tavari modules</p>
      </div>

      <div style={styles.tabContainer}>
        <div style={styles.tabList}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
                ...(tab.disabled ? styles.tabDisabled : {})
              }}
              disabled={tab.disabled}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
              {tab.disabled && <span style={{ fontSize: '10px' }}>(Soon)</span>}
            </button>
          ))}
        </div>

        {renderTabContent()}
      </div>
    </div>
  );
};

// Create a wrapper component that handles authentication for POSReportsScreen
const POSReportsContentWrapper = () => {
  return (
    <POSAuthWrapper
      requiredRoles={['owner', 'manager', 'employee']}
      requireBusiness={true}
      componentName="POSReportsContent"
    >
      <POSReportsScreenContent />
    </POSAuthWrapper>
  );
};

// Component that receives auth data properly
const POSReportsScreenContent = () => {
  const [authData, setAuthData] = useState(null);

  return (
    <POSAuthWrapper
      requiredRoles={['owner', 'manager', 'employee']}
      requireBusiness={true}
      componentName="POSReportsWrapper"
      onAuthReady={(auth) => {
        console.log('POSReports: Auth ready with data:', auth);
        setAuthData(auth);
      }}
    >
      {authData ? (
        <POSReportsScreen authData={authData} />
      ) : (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Loading POS reports...
        </div>
      )}
    </POSAuthWrapper>
  );
};

export default ReportsScreen;