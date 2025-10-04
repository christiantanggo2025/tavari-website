// src/screens/POS/POSSettings.jsx - Complete fixed version with all tabs restored
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { logAction } from '../../helpers/posAudit';

// Foundation components
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { TavariStyles } from '../../utils/TavariStyles';

// All tab components
import GeneralTab from './POSSettingsComponents/GeneralTab';
import PaymentsTab from './POSSettingsComponents/PaymentsTab';
import TaxesTab from './POSSettingsComponents/TaxesTab';
import ReceiptsTab from './POSSettingsComponents/ReceiptsTab';
import LoyaltyTab from './POSSettingsComponents/LoyaltyTab';
import TabsTab from './POSSettingsComponents/TabsTab';
import SecurityTab from './POSSettingsComponents/SecurityTab';
import AlertsTab from './POSSettingsComponents/AlertsTab';

const POSSettings = () => {
  const navigate = useNavigate();

  // Authentication
  const auth = usePOSAuth({
    requiredRoles: ['owner', 'manager'],
    requireBusiness: true,
    componentName: 'POSSettings'
  });

  // Tax calculations hook
  const {
    taxCategories,
    loading: taxLoading,
    error: taxError,
    refreshTaxData,
    validateTaxConfiguration
  } = useTaxCalculations(auth.selectedBusinessId);

  // Tab state
  const [activeTab, setActiveTab] = useState('general');

  // Terminal-level settings state
  const [currentTerminalId, setCurrentTerminalId] = useState(null);
  const [terminalName, setTerminalName] = useState('');

  // Settings state matching actual database columns
  const [settings, setSettings] = useState({
    terminal_mode: 'manual',
    pin_required: false,
    tip_enabled: true,
    default_tip_percent: 0.15,
    tax_rate: 0.00,
    service_fee: 0.00,
    receipt_footer: '',
    loyalty_mode: 'dollars',
    auto_apply_loyalty: false,
    loyalty_min_redemption: 5.00,
    loyalty_manager_override_threshold: 50.00,
    redemption_rate: 0.01,
    auto_lock_minutes: 5,
    tab_enabled: true,
    max_tab_amount: 500.00,
    require_customer_info_for_tabs: true,
    auto_close_tabs_after_hours: 24,
    tab_number_prefix: 'TAB',
    tabs_enabled: true,
    default_tab_limit: 500.00,
    max_tab_limit: 1000.00,
    tab_limit_requires_manager: true,
    tab_auto_close_hours: 24,
    tab_warning_threshold: 0.80,
    lock_on_startup: false,
    lock_after_sale: false,
    cash_variance_threshold: 10.00,
    default_float_amount: 200.00,
    max_drawer_variance: 5.00,
    require_manager_pin_for_variance: true,
    deposit_history_requires_manager: true,
    // Additional settings for new tabs
    auto_delete_saved_carts_hours: 48,
    receipt_auto_print: true,
    receipt_auto_email: false,
    receipt_show_business_info: true,
    receipt_show_tax_details: true,
    receipt_paper_size: 'thermal_80mm',
    receipt_copies: 1,
    security_max_login_attempts: 3,
    security_lockout_duration: 300,
    security_require_pin_for_voids: true,
    security_require_pin_for_discounts: false,
    security_audit_all_actions: true,
    alerts_low_stock_threshold: 10,
    alerts_enable_email_notifications: true,
    alerts_enable_push_notifications: true,
    alerts_cash_variance_alert: true,
    alerts_failed_payment_alert: true
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load terminal ID from localStorage on component mount
  useEffect(() => {
    const storedTerminalId = localStorage.getItem('tavari_terminal_id');
    const storedTerminalName = localStorage.getItem('tavari_terminal_name');
    
    if (storedTerminalId) {
      setCurrentTerminalId(storedTerminalId);
      setTerminalName(storedTerminalName || 'Unnamed Terminal');
    }
  }, []);

  // Fetch settings on load
  useEffect(() => {
    if (auth.selectedBusinessId) {
      fetchSettings();
    }
  }, [auth.selectedBusinessId, currentTerminalId]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to get terminal-specific settings
      let settingsData = null;
      
      if (currentTerminalId) {
        const { data: terminalSettings, error: terminalError } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('business_id', auth.selectedBusinessId)
          .eq('terminal_id', currentTerminalId)
          .single();
          
        if (!terminalError) {
          settingsData = terminalSettings;
        }
      }
      
      // If no terminal-specific settings, get business defaults
      if (!settingsData) {
        const { data: businessSettings, error: businessError } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('business_id', auth.selectedBusinessId)
          .is('terminal_id', null)
          .single();
          
        if (businessError && businessError.code !== 'PGRST116') throw businessError;
        settingsData = businessSettings;
      }

      if (settingsData) {
        setSettings({
          terminal_mode: settingsData.terminal_mode || 'manual',
          pin_required: settingsData.pin_required || false,
          tip_enabled: settingsData.tip_enabled !== undefined ? settingsData.tip_enabled : true,
          default_tip_percent: parseFloat(settingsData.default_tip_percent) || 0.15,
          tax_rate: parseFloat(settingsData.tax_rate) || 0.00,
          service_fee: parseFloat(settingsData.service_fee) || 0.00,
          receipt_footer: settingsData.receipt_footer || '',
          loyalty_mode: settingsData.loyalty_mode || 'dollars',
          auto_apply_loyalty: settingsData.auto_apply_loyalty || false,
          loyalty_min_redemption: parseFloat(settingsData.loyalty_min_redemption) || 5.00,
          loyalty_manager_override_threshold: parseFloat(settingsData.loyalty_manager_override_threshold) || 50.00,
          redemption_rate: parseFloat(settingsData.redemption_rate) || 0.01,
          auto_lock_minutes: parseInt(settingsData.auto_lock_minutes) || 5,
          tab_enabled: settingsData.tab_enabled !== undefined ? settingsData.tab_enabled : true,
          max_tab_amount: parseFloat(settingsData.max_tab_amount) || 500.00,
          require_customer_info_for_tabs: settingsData.require_customer_info_for_tabs !== undefined ? settingsData.require_customer_info_for_tabs : true,
          auto_close_tabs_after_hours: parseInt(settingsData.auto_close_tabs_after_hours) || 24,
          tab_number_prefix: settingsData.tab_number_prefix || 'TAB',
          tabs_enabled: settingsData.tabs_enabled !== undefined ? settingsData.tabs_enabled : true,
          default_tab_limit: parseFloat(settingsData.default_tab_limit) || 500.00,
          max_tab_limit: parseFloat(settingsData.max_tab_limit) || 1000.00,
          tab_limit_requires_manager: settingsData.tab_limit_requires_manager !== undefined ? settingsData.tab_limit_requires_manager : true,
          tab_auto_close_hours: parseInt(settingsData.tab_auto_close_hours) || 24,
          tab_warning_threshold: parseFloat(settingsData.tab_warning_threshold) || 0.80,
          lock_on_startup: settingsData.lock_on_startup || false,
          lock_after_sale: settingsData.lock_after_sale || false,
          cash_variance_threshold: parseFloat(settingsData.cash_variance_threshold) || 10.00,
          default_float_amount: parseFloat(settingsData.default_float_amount) || 200.00,
          max_drawer_variance: parseFloat(settingsData.max_drawer_variance) || 5.00,
          require_manager_pin_for_variance: settingsData.require_manager_pin_for_variance !== undefined ? settingsData.require_manager_pin_for_variance : true,
          deposit_history_requires_manager: settingsData.deposit_history_requires_manager !== undefined ? settingsData.deposit_history_requires_manager : true,
          // Additional settings with defaults
          auto_delete_saved_carts_hours: parseInt(settingsData.auto_delete_saved_carts_hours) || 48,
          receipt_auto_print: settingsData.receipt_auto_print !== undefined ? settingsData.receipt_auto_print : true,
          receipt_auto_email: settingsData.receipt_auto_email || false,
          receipt_show_business_info: settingsData.receipt_show_business_info !== undefined ? settingsData.receipt_show_business_info : true,
          receipt_show_tax_details: settingsData.receipt_show_tax_details !== undefined ? settingsData.receipt_show_tax_details : true,
          receipt_paper_size: settingsData.receipt_paper_size || 'thermal_80mm',
          receipt_copies: parseInt(settingsData.receipt_copies) || 1,
          security_max_login_attempts: parseInt(settingsData.security_max_login_attempts) || 3,
          security_lockout_duration: parseInt(settingsData.security_lockout_duration) || 300,
          security_require_pin_for_voids: settingsData.security_require_pin_for_voids !== undefined ? settingsData.security_require_pin_for_voids : true,
          security_require_pin_for_discounts: settingsData.security_require_pin_for_discounts || false,
          security_audit_all_actions: settingsData.security_audit_all_actions !== undefined ? settingsData.security_audit_all_actions : true,
          alerts_low_stock_threshold: parseInt(settingsData.alerts_low_stock_threshold) || 10,
          alerts_enable_email_notifications: settingsData.alerts_enable_email_notifications !== undefined ? settingsData.alerts_enable_email_notifications : true,
          alerts_enable_push_notifications: settingsData.alerts_enable_push_notifications !== undefined ? settingsData.alerts_enable_push_notifications : true,
          alerts_cash_variance_alert: settingsData.alerts_cash_variance_alert !== undefined ? settingsData.alerts_cash_variance_alert : true,
          alerts_failed_payment_alert: settingsData.alerts_failed_payment_alert !== undefined ? settingsData.alerts_failed_payment_alert : true
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Error loading settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle terminal changes
  const handleTerminalChange = (terminalId) => {
    setCurrentTerminalId(terminalId);
    
    if (terminalId) {
      localStorage.setItem('tavari_terminal_id', terminalId);
    } else {
      localStorage.removeItem('tavari_terminal_id');
      localStorage.removeItem('tavari_terminal_name');
    }
    
    // Reload settings for the new terminal context
    fetchSettings();
  };

  // Fixed handleSave to work with the corrected database constraints
  const handleSave = async () => {
    setError(null);
    setSaveSuccess(false);
    
    try {
      const updatedSettings = {
        business_id: auth.selectedBusinessId,
        terminal_id: currentTerminalId || null, // Explicitly set null for business-level settings
        terminal_mode: settings.terminal_mode,
        pin_required: settings.pin_required,
        tip_enabled: settings.tip_enabled,
        default_tip_percent: Number(settings.default_tip_percent),
        tax_rate: Number(settings.tax_rate),
        service_fee: Number(settings.service_fee),
        receipt_footer: settings.receipt_footer?.trim() || '',
        loyalty_mode: settings.loyalty_mode,
        auto_apply_loyalty: settings.auto_apply_loyalty,
        loyalty_min_redemption: Number(settings.loyalty_min_redemption),
        loyalty_manager_override_threshold: Number(settings.loyalty_manager_override_threshold),
        redemption_rate: Number(settings.redemption_rate),
        auto_lock_minutes: Number(settings.auto_lock_minutes),
        tab_enabled: settings.tab_enabled,
        max_tab_amount: Number(settings.max_tab_amount),
        require_customer_info_for_tabs: settings.require_customer_info_for_tabs,
        auto_close_tabs_after_hours: Number(settings.auto_close_tabs_after_hours),
        tab_number_prefix: settings.tab_number_prefix,
        tabs_enabled: settings.tabs_enabled,
        default_tab_limit: Number(settings.default_tab_limit),
        max_tab_limit: Number(settings.max_tab_limit),
        tab_limit_requires_manager: settings.tab_limit_requires_manager,
        tab_auto_close_hours: Number(settings.tab_auto_close_hours),
        tab_warning_threshold: Number(settings.tab_warning_threshold),
        lock_on_startup: settings.lock_on_startup,
        lock_after_sale: settings.lock_after_sale,
        cash_variance_threshold: Number(settings.cash_variance_threshold),
        default_float_amount: Number(settings.default_float_amount),
        max_drawer_variance: Number(settings.max_drawer_variance),
        require_manager_pin_for_variance: settings.require_manager_pin_for_variance,
        deposit_history_requires_manager: settings.deposit_history_requires_manager,
        // Additional settings
        auto_delete_saved_carts_hours: Number(settings.auto_delete_saved_carts_hours),
        receipt_auto_print: settings.receipt_auto_print,
        receipt_auto_email: settings.receipt_auto_email,
        receipt_show_business_info: settings.receipt_show_business_info,
        receipt_show_tax_details: settings.receipt_show_tax_details,
        receipt_paper_size: settings.receipt_paper_size,
        receipt_copies: Number(settings.receipt_copies),
        security_max_login_attempts: Number(settings.security_max_login_attempts),
        security_lockout_duration: Number(settings.security_lockout_duration),
        security_require_pin_for_voids: settings.security_require_pin_for_voids,
        security_require_pin_for_discounts: settings.security_require_pin_for_discounts,
        security_audit_all_actions: settings.security_audit_all_actions,
        alerts_low_stock_threshold: Number(settings.alerts_low_stock_threshold),
        alerts_enable_email_notifications: settings.alerts_enable_email_notifications,
        alerts_enable_push_notifications: settings.alerts_enable_push_notifications,
        alerts_cash_variance_alert: settings.alerts_cash_variance_alert,
        alerts_failed_payment_alert: settings.alerts_failed_payment_alert,
        updated_at: new Date().toISOString()
      };

      // Use the proper unique constraint (business_id, terminal_id) for checking existing records
      const { data: existingSettings, error: checkError } = await supabase
        .from('pos_settings')
        .select('id')
        .eq('business_id', auth.selectedBusinessId)
        .filter('terminal_id', currentTerminalId ? 'eq' : 'is', currentTerminalId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let result;
      if (existingSettings) {
        // Update existing record using both business_id and terminal_id
        result = await supabase
          .from('pos_settings')
          .update(updatedSettings)
          .eq('business_id', auth.selectedBusinessId)
          .filter('terminal_id', currentTerminalId ? 'eq' : 'is', currentTerminalId)
          .select()
          .single();
      } else {
        // Insert new record
        result = await supabase
          .from('pos_settings')
          .insert([updatedSettings])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      await logAction({
        action: 'pos_settings_updated',
        context: 'POSSettings',
        metadata: {
          business_id: auth.selectedBusinessId,
          terminal_id: currentTerminalId,
          updated_settings: updatedSettings,
          active_tab: activeTab
        }
      });

    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Error saving settings: ' + err.message);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveSuccess(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'taxes', label: 'Taxes', icon: '📊' },
    { id: 'receipts', label: 'Receipts', icon: '🧾' },
    { id: 'loyalty', label: 'Loyalty', icon: '🎯' },
    { id: 'tabs', label: 'Tabs', icon: '📋' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' }
  ];

  const renderTabContent = () => {
    const commonProps = {
      settings,
      handleInputChange,
      businessId: auth.selectedBusinessId,
      currentTerminalId,
      onTerminalChange: handleTerminalChange,
      taxCategories,
      taxLoading,
      refreshTaxData
    };

    switch (activeTab) {
      case 'general':
        return <GeneralTab {...commonProps} />;
      case 'payments':
        return <PaymentsTab {...commonProps} />;
      case 'taxes':
        return <TaxesTab {...commonProps} />;
      case 'receipts':
        return <ReceiptsTab {...commonProps} />;
      case 'loyalty':
        return <LoyaltyTab {...commonProps} />;
      case 'tabs':
        return <TabsTab {...commonProps} />;
      case 'security':
        return <SecurityTab {...commonProps} />;
      case 'alerts':
        return <AlertsTab {...commonProps} />;
      default:
        return <GeneralTab {...commonProps} />;
    }
  };

  const handleAuthReady = (authData) => {
    console.log('POSSettings: Authentication ready', authData);
  };

  return (
    <POSAuthWrapper
      requiredRoles={['owner', 'manager']}
      requireBusiness={true}
      componentName="POSSettings"
      onAuthReady={handleAuthReady}
    >
      <div style={styles.container}>
        <div style={styles.header}>
          <h2>POS Settings</h2>
          <p>Configure your point-of-sale system settings</p>
          {currentTerminalId && (
            <div style={styles.terminalIndicator}>
              Currently configuring: <strong>{terminalName || currentTerminalId}</strong>
            </div>
          )}
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {saveSuccess && <div style={styles.successBanner}>Settings saved successfully!</div>}

        <div style={styles.tabsContainer}>
          <div style={styles.tabsHeader}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                <span style={styles.tabIcon}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div style={styles.tabsBody}>
            {loading || taxLoading ? (
              <div style={styles.loadingSettings}>Loading settings...</div>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.saveButton}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </POSAuthWrapper>
  );
};

const styles = {
  container: {
    ...TavariStyles.layout.container
  },
  header: {
    marginBottom: TavariStyles.spacing['3xl'],
    textAlign: 'center',
    color: TavariStyles.colors.gray800
  },
  terminalIndicator: {
    marginTop: TavariStyles.spacing.md,
    padding: TavariStyles.spacing.md,
    backgroundColor: TavariStyles.colors.primary,
    color: TavariStyles.colors.white,
    borderRadius: TavariStyles.borderRadius.md,
    fontSize: TavariStyles.typography.fontSize.sm,
    fontWeight: TavariStyles.typography.fontWeight.medium
  },
  errorBanner: {
    ...TavariStyles.components.banner.base,
    ...TavariStyles.components.banner.variants.error,
    marginBottom: TavariStyles.spacing.xl
  },
  successBanner: {
    ...TavariStyles.components.banner.base,
    ...TavariStyles.components.banner.variants.success,
    marginBottom: TavariStyles.spacing.xl
  },
  loadingSettings: {
    ...TavariStyles.components.loading.container
  },
  tabsContainer: {
    flex: 1,
    ...TavariStyles.layout.card,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  tabsHeader: {
    display: 'flex',
    borderBottom: `2px solid ${TavariStyles.colors.gray200}`,
    backgroundColor: TavariStyles.colors.gray50,
    overflowX: 'auto'
  },
  tab: {
    flex: 1,
    minWidth: '100px',
    padding: `${TavariStyles.spacing.lg} ${TavariStyles.spacing.xl}`,
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.medium,
    color: TavariStyles.colors.gray600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: TavariStyles.spacing.sm,
    transition: TavariStyles.transitions.normal,
    borderBottom: '3px solid transparent'
  },
  activeTab: {
    color: TavariStyles.colors.primary,
    borderBottomColor: TavariStyles.colors.primary,
    backgroundColor: TavariStyles.colors.white
  },
  tabIcon: {
    fontSize: TavariStyles.typography.fontSize.lg
  },
  tabsBody: {
    flex: 1,
    overflow: 'auto'
  },
  actions: {
    display: 'flex',
    gap: TavariStyles.spacing.lg,
    justifyContent: 'center',
    paddingTop: TavariStyles.spacing.xl,
    borderTop: `1px solid ${TavariStyles.colors.gray200}`,
    marginTop: TavariStyles.spacing.xl
  },
  saveButton: {
    ...TavariStyles.components.button.base,
    ...TavariStyles.components.button.variants.success
  }
};

export default POSSettings;