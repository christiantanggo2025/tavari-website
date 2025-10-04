// screens/POS/POSDailyDepositScreen.jsx - Daily Cash Deposit Management
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

// Foundation Components
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { TavariStyles } from '../../utils/TavariStyles';

// Deposit Components
import POSDepositCountComponent from '../../components/POS/POSDailyDepositScreen/POSDepositCountComponent';
import POSDepositHistoryComponent from '../../components/POS/POSDailyDepositScreen/POSDepositHistoryComponent';

const POSDailyDepositScreen = () => {
  const navigate = useNavigate();
  
  // Authentication using standardized hook
  const auth = usePOSAuth({
    requiredRoles: ['manager', 'owner'],
    requireBusiness: true,
    componentName: 'POSDailyDepositScreen'
  });

  // State management
  const [activeTab, setActiveTab] = useState('deposit');
  const [businessSettings, setBusinessSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load business settings on component mount
  useEffect(() => {
    if (auth.isReady && auth.selectedBusinessId) {
      loadBusinessSettings();
    }
  }, [auth.isReady, auth.selectedBusinessId]);

  const loadBusinessSettings = async () => {
    try {
      setLoading(true);
      
      const { data: settings, error: settingsError } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      // Set default settings if none exist
      const defaultSettings = {
        default_float_amount: 200.00,
        max_drawer_variance: 5.00,
        require_manager_pin_for_variance: true,
        deposit_history_requires_manager: true,
        ...settings
      };

      setBusinessSettings(defaultSettings);
      
    } catch (err) {
      console.error('Error loading business settings:', err);
      setError('Failed to load business settings');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while authentication and settings are loading
  if (!auth.isReady || loading) {
    return (
      <POSAuthWrapper
        requiredRoles={['manager', 'owner']}
        componentName="POSDailyDepositScreen"
      >
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={TavariStyles.components.loading.spinner}></div>
            <div>Loading daily deposit screen...</div>
            <style>{TavariStyles.keyframes.spin}</style>
          </div>
        </div>
      </POSAuthWrapper>
    );
  }

  // Show error state if settings failed to load
  if (error) {
    return (
      <POSAuthWrapper
        requiredRoles={['manager', 'owner']}
        componentName="POSDailyDepositScreen"
      >
        <div style={styles.container}>
          <div style={styles.errorContainer}>
            <h3 style={styles.errorTitle}>Error Loading Daily Deposit</h3>
            <p style={styles.errorMessage}>{error}</p>
            <button
              style={TavariStyles.utils.merge(
                TavariStyles.components.button.base,
                TavariStyles.components.button.variants.primary
              )}
              onClick={loadBusinessSettings}
            >
              Retry
            </button>
          </div>
        </div>
      </POSAuthWrapper>
    );
  }

  return (
    <POSAuthWrapper
      requiredRoles={['manager', 'owner']}
      componentName="POSDailyDepositScreen"
    >
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Daily Deposit</h1>
            <p style={styles.subtitle}>
              Manage cash counting and deposit reconciliation
            </p>
          </div>
          <button
            style={TavariStyles.utils.merge(
              TavariStyles.components.button.base,
              TavariStyles.components.button.variants.secondary
            )}
            onClick={() => navigate('/dashboard/pos/register')}
          >
            Back to Register
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <div style={styles.tabNav}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'deposit' ? styles.activeTab : styles.inactiveTab)
              }}
              onClick={() => setActiveTab('deposit')}
            >
              Current Deposit
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'history' ? styles.activeTab : styles.inactiveTab)
              }}
              onClick={() => setActiveTab('history')}
            >
              Deposit History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={styles.tabContent}>
          {activeTab === 'deposit' && (
            <POSDepositCountComponent
              businessId={auth.selectedBusinessId}
              userId={auth.authUser?.id}
              businessSettings={businessSettings}
              onDepositComplete={() => {
                // Refresh settings and switch to history tab to show new deposit
                loadBusinessSettings();
                setActiveTab('history');
              }}
            />
          )}
          
          {activeTab === 'history' && (
            <POSDepositHistoryComponent
              businessId={auth.selectedBusinessId}
              userId={auth.authUser?.id}
              businessSettings={businessSettings}
            />
          )}
        </div>
      </div>
    </POSAuthWrapper>
  );
};

// Styles using TavariStyles as foundation
const styles = {
  container: {
    ...TavariStyles.layout.container,
    padding: TavariStyles.spacing.xl,
    gap: TavariStyles.spacing.xl
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: TavariStyles.spacing.xl,
    paddingBottom: TavariStyles.spacing.lg,
    borderBottom: `2px solid ${TavariStyles.colors.gray200}`
  },

  headerContent: {
    flex: 1
  },

  title: {
    fontSize: TavariStyles.typography.fontSize['3xl'],
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    margin: 0,
    marginBottom: TavariStyles.spacing.sm
  },

  subtitle: {
    fontSize: TavariStyles.typography.fontSize.lg,
    color: TavariStyles.colors.gray600,
    margin: 0
  },

  tabContainer: {
    marginBottom: TavariStyles.spacing.xl
  },

  tabNav: {
    display: 'flex',
    borderBottom: `2px solid ${TavariStyles.colors.gray200}`,
    gap: 0
  },

  tab: {
    background: 'none',
    border: 'none',
    padding: `${TavariStyles.spacing.lg} ${TavariStyles.spacing.xl}`,
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: TavariStyles.transitions.normal,
    borderBottom: '3px solid transparent',
    position: 'relative',
    top: '2px'
  },

  activeTab: {
    color: TavariStyles.colors.primary,
    borderBottomColor: TavariStyles.colors.primary,
    backgroundColor: TavariStyles.colors.white
  },

  inactiveTab: {
    color: TavariStyles.colors.gray600,
    backgroundColor: TavariStyles.colors.gray50,
    ':hover': {
      backgroundColor: TavariStyles.colors.gray100,
      color: TavariStyles.colors.gray800
    }
  },

  tabContent: {
    flex: 1,
    backgroundColor: TavariStyles.colors.white,
    borderRadius: TavariStyles.borderRadius.lg,
    border: `1px solid ${TavariStyles.colors.gray200}`,
    overflow: 'hidden'
  },

  loading: {
    ...TavariStyles.components.loading.container,
    minHeight: '400px'
  },

  errorContainer: {
    ...TavariStyles.layout.card,
    padding: TavariStyles.spacing['3xl'],
    textAlign: 'center',
    maxWidth: '500px',
    margin: '0 auto',
    marginTop: TavariStyles.spacing['6xl']
  },

  errorTitle: {
    fontSize: TavariStyles.typography.fontSize['2xl'],
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.danger,
    marginBottom: TavariStyles.spacing.lg
  },

  errorMessage: {
    fontSize: TavariStyles.typography.fontSize.lg,
    color: TavariStyles.colors.gray600,
    marginBottom: TavariStyles.spacing.xl,
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  }
};

export default POSDailyDepositScreen;