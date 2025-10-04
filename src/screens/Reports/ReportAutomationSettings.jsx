// screens/Reports/ReportAutomationSettings.jsx - Report Automation Configuration
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../utils/TavariStyles';

const ReportAutomationSettings = () => {
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [automationRules, setAutomationRules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    report_type: 'sales',
    frequency: 'daily',
    run_time: '09:00',
    email_enabled: false,
    print_enabled: false,
    email_recipients: '',
    date_range: 'yesterday',
    active: true
  });

  // Available report types (matching POSReportsScreen options)
  const reportTypes = [
    { value: 'sales', label: 'Sales Summary' },
    { value: 'transactions', label: 'Transaction Details' },
    { value: 'inventory', label: 'Inventory Report' },
    { value: 'payments', label: 'Payment Methods' },
    { value: 'refunds', label: 'Refunds Report' },
    { value: 'discounts', label: 'Discounts Applied' },
    { value: 'taxes', label: 'Tax Summary' },
    { value: 'loyalty', label: 'Loyalty Activity' },
    { value: 'employees', label: 'Employee Performance' }
  ];

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const dateRanges = [
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'current_week', label: 'Current Week' },
    { value: 'current_month', label: 'Current Month' }
  ];

  useEffect(() => {
    if (selectedBusinessId) {
      loadAutomationRules();
    }
  }, [selectedBusinessId]);

  const loadAutomationRules = async () => {
    try {
      setLoading(true);
      
      // Load existing automation rules from pos_settings or create new table
      const { data, error } = await supabase
        .from('pos_report_automation')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .order('created_at', { ascending: false });

      if (error && error.code === '42P01') {
        // Table doesn't exist, create it
        await createAutomationTable();
        setAutomationRules([]);
      } else if (error) {
        throw error;
      } else {
        setAutomationRules(data || []);
      }
    } catch (err) {
      console.error('Error loading automation rules:', err);
      // For now, use empty array if table doesn't exist
      setAutomationRules([]);
    } finally {
      setLoading(false);
    }
  };

  const createAutomationTable = async () => {
    try {
      // Create the automation table if it doesn't exist
      const { error } = await supabase.rpc('create_report_automation_table');
      if (error) {
        console.error('Error creating automation table:', error);
      }
    } catch (err) {
      console.error('Error in createAutomationTable:', err);
    }
  };

  const handleAuthReady = (authData) => {
    setSelectedBusinessId(authData.selectedBusinessId);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateRule = () => {
    setFormData({
      name: '',
      report_type: 'sales',
      frequency: 'daily',
      run_time: '09:00',
      email_enabled: false,
      print_enabled: false,
      email_recipients: '',
      date_range: 'yesterday',
      active: true
    });
    setEditingRule(null);
    setShowCreateModal(true);
  };

  const handleEditRule = (rule) => {
    setFormData({
      name: rule.name || '',
      report_type: rule.report_type || 'sales',
      frequency: rule.frequency || 'daily',
      run_time: rule.run_time || '09:00',
      email_enabled: rule.email_enabled || false,
      print_enabled: rule.print_enabled || false,
      email_recipients: rule.email_recipients || '',
      date_range: rule.date_range || 'yesterday',
      active: rule.active !== false
    });
    setEditingRule(rule);
    setShowCreateModal(true);
  };

  const handleSaveRule = async () => {
    try {
      const ruleData = {
        ...formData,
        business_id: selectedBusinessId,
        updated_at: new Date().toISOString()
      };

      if (editingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('pos_report_automation')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
      } else {
        // Create new rule
        ruleData.created_at = new Date().toISOString();
        
        const { error } = await supabase
          .from('pos_report_automation')
          .insert([ruleData]);

        if (error) throw error;
      }

      setShowCreateModal(false);
      loadAutomationRules();
    } catch (err) {
      console.error('Error saving automation rule:', err);
      alert('Error saving automation rule. Please try again.');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pos_report_automation')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      loadAutomationRules();
    } catch (err) {
      console.error('Error deleting automation rule:', err);
      alert('Error deleting automation rule. Please try again.');
    }
  };

  const toggleRuleActive = async (rule) => {
    try {
      const { error } = await supabase
        .from('pos_report_automation')
        .update({ active: !rule.active })
        .eq('id', rule.id);

      if (error) throw error;

      loadAutomationRules();
    } catch (err) {
      console.error('Error toggling rule status:', err);
      alert('Error updating rule status. Please try again.');
    }
  };

  const styles = {
    container: {
      ...TavariStyles.layout.container,
      maxWidth: '1200px',
      margin: '0 auto'
    },
    
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing['2xl'],
      flexWrap: 'wrap',
      gap: TavariStyles.spacing.md
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    
    createButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      fontSize: TavariStyles.typography.fontSize.base
    },
    
    rulesGrid: {
      display: 'grid',
      gap: TavariStyles.spacing.lg,
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
    },
    
    ruleCard: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.xl,
      position: 'relative'
    },
    
    ruleHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: TavariStyles.spacing.md
    },
    
    ruleName: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      margin: 0
    },
    
    statusBadge: {
      padding: '4px 8px',
      borderRadius: TavariStyles.borderRadius.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      cursor: 'pointer'
    },
    
    activeBadge: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.successText
    },
    
    inactiveBadge: {
      backgroundColor: TavariStyles.colors.gray200,
      color: TavariStyles.colors.gray600
    },
    
    ruleDetail: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xs
    },
    
    ruleActions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm,
      marginTop: TavariStyles.spacing.md
    },
    
    editButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.sm
    },
    
    deleteButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.danger,
      ...TavariStyles.components.button.sizes.sm
    },
    
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    
    modalContent: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing['2xl'],
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    
    modalHeader: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray800
    },
    
    formGroup: {
      marginBottom: TavariStyles.spacing.lg
    },
    
    label: {
      ...TavariStyles.components.form.label,
      marginBottom: TavariStyles.spacing.sm
    },
    
    input: {
      ...TavariStyles.components.form.input,
      width: '100%'
    },
    
    select: {
      ...TavariStyles.components.form.select,
      width: '100%'
    },
    
    modalActions: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      justifyContent: 'flex-end',
      marginTop: TavariStyles.spacing.xl
    },
    
    saveButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary
    },
    
    cancelButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary
    },
    
    emptyState: {
      textAlign: 'center',
      padding: TavariStyles.spacing['4xl'],
      color: TavariStyles.colors.gray500
    },
    
    emptyStateTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      marginBottom: TavariStyles.spacing.md
    }
  };

  if (loading) {
    return (
      <POSAuthWrapper
        requiredRoles={['manager', 'owner']}
        onAuthReady={handleAuthReady}
      >
        <div style={styles.container}>
          <div style={{ ...TavariStyles.components.loading.container }}>
            Loading automation settings...
          </div>
        </div>
      </POSAuthWrapper>
    );
  }

  return (
    <POSAuthWrapper
      requiredRoles={['manager', 'owner']}
      onAuthReady={handleAuthReady}
    >
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Report Automation Settings</h1>
          <button
            style={styles.createButton}
            onClick={handleCreateRule}
          >
            + Create Automation Rule
          </button>
        </div>

        {automationRules.length === 0 ? (
          <div style={styles.emptyState}>
            <h3 style={styles.emptyStateTitle}>No Automation Rules</h3>
            <p>Create your first automation rule to automatically generate and send reports.</p>
          </div>
        ) : (
          <div style={styles.rulesGrid}>
            {automationRules.map((rule) => (
              <div key={rule.id} style={styles.ruleCard}>
                <div style={styles.ruleHeader}>
                  <h3 style={styles.ruleName}>{rule.name || 'Unnamed Rule'}</h3>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(rule.active ? styles.activeBadge : styles.inactiveBadge)
                    }}
                    onClick={() => toggleRuleActive(rule)}
                  >
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div style={styles.ruleDetail}>
                  <strong>Report:</strong> {reportTypes.find(t => t.value === rule.report_type)?.label || rule.report_type}
                </div>
                
                <div style={styles.ruleDetail}>
                  <strong>Frequency:</strong> {frequencies.find(f => f.value === rule.frequency)?.label || rule.frequency} at {rule.run_time}
                </div>
                
                <div style={styles.ruleDetail}>
                  <strong>Date Range:</strong> {dateRanges.find(d => d.value === rule.date_range)?.label || rule.date_range}
                </div>
                
                {rule.email_enabled && (
                  <div style={styles.ruleDetail}>
                    <strong>Email:</strong> {rule.email_recipients || 'No recipients set'}
                  </div>
                )}
                
                {rule.print_enabled && (
                  <div style={styles.ruleDetail}>
                    <strong>Auto Print:</strong> Enabled
                  </div>
                )}
                
                <div style={styles.ruleActions}>
                  <button
                    style={styles.editButton}
                    onClick={() => handleEditRule(rule)}
                  >
                    Edit
                  </button>
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalHeader}>
                {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </h2>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Rule Name</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter a descriptive name for this rule"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Report Type</label>
                <select
                  style={styles.select}
                  value={formData.report_type}
                  onChange={(e) => handleInputChange('report_type', e.target.value)}
                >
                  {reportTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Frequency</label>
                <select
                  style={styles.select}
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                >
                  {frequencies.map(freq => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Time</label>
                <input
                  type="time"
                  style={styles.input}
                  value={formData.run_time}
                  onChange={(e) => handleInputChange('run_time', e.target.value)}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Date Range</label>
                <select
                  style={styles.select}
                  value={formData.date_range}
                  onChange={(e) => handleInputChange('date_range', e.target.value)}
                >
                  {dateRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <TavariCheckbox
                  checked={formData.email_enabled}
                  onChange={(checked) => handleInputChange('email_enabled', checked)}
                  label="Enable Email Delivery"
                  size="md"
                />
              </div>
              
              {formData.email_enabled && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Recipients (comma-separated)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.email_recipients}
                    onChange={(e) => handleInputChange('email_recipients', e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
              )}
              
              <div style={styles.formGroup}>
                <TavariCheckbox
                  checked={formData.print_enabled}
                  onChange={(checked) => handleInputChange('print_enabled', checked)}
                  label="Enable Auto Print"
                  size="md"
                />
              </div>
              
              <div style={styles.formGroup}>
                <TavariCheckbox
                  checked={formData.active}
                  onChange={(checked) => handleInputChange('active', checked)}
                  label="Active"
                  size="md"
                />
              </div>
              
              <div style={styles.modalActions}>
                <button
                  style={styles.cancelButton}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  style={styles.saveButton}
                  onClick={handleSaveRule}
                  disabled={!formData.name.trim()}
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </POSAuthWrapper>
  );
};

export default ReportAutomationSettings;