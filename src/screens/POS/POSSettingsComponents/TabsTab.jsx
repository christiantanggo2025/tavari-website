// src/screens/POS/POSSettingsComponents/TabsTab.jsx
import React from 'react';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const TabsTab = ({ settings, handleInputChange }) => {
  return (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Tab Management Settings</h3>
        <div style={styles.settingDescription}>
          Configure how customer tabs are created and managed in your POS system.
        </div>
        
        <div style={styles.setting}>
          <TavariCheckbox
            checked={settings.tabs_enabled}
            onChange={(checked) => handleInputChange('tabs_enabled', checked)}
            label="Enable tab functionality"
            id="tabs-enabled"
            testId="tabs-enabled-checkbox"
          />
          <div style={styles.settingDescription}>
            Allow employees to create and manage customer tabs for preauthorized orders.
          </div>
        </div>

        {settings.tabs_enabled && (
          <>
            <div style={styles.setting}>
              <label style={styles.label}>Default Tab Limit:</label>
              <div style={styles.inputGroup}>
                <span>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={settings.max_tab_limit || 999999}
                  value={settings.default_tab_limit || 0}
                  onChange={(e) => handleInputChange('default_tab_limit', parseFloat(e.target.value) || 0)}
                  style={styles.input}
                />
              </div>
              <div style={styles.settingDescription}>
                Default spending limit for new tabs. Employees can create tabs up to this amount.
              </div>
            </div>

            <div style={styles.setting}>
              <label style={styles.label}>Maximum Tab Limit:</label>
              <div style={styles.inputGroup}>
                <span>$</span>
                <input
                  type="number"
                  step="0.01"
                  min={settings.default_tab_limit || 0}
                  value={settings.max_tab_limit || 0}
                  onChange={(e) => handleInputChange('max_tab_limit', parseFloat(e.target.value) || 0)}
                  style={styles.input}
                />
              </div>
              <div style={styles.settingDescription}>
                Maximum spending limit for tabs. Managers can approve tabs up to this amount.
              </div>
            </div>

            <div style={styles.setting}>
              <TavariCheckbox
                checked={settings.tab_limit_requires_manager}
                onChange={(checked) => handleInputChange('tab_limit_requires_manager', checked)}
                label="Require manager approval for limits above default"
                id="tab-manager-required"
                testId="tab-manager-required-checkbox"
              />
              <div style={styles.settingDescription}>
                When enabled, tabs above the default limit require manager PIN approval.
              </div>
            </div>

            <div style={styles.setting}>
              <label style={styles.label}>Tab Warning Threshold:</label>
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={settings.tab_warning_threshold || 0.8}
                  onChange={(e) => handleInputChange('tab_warning_threshold', parseFloat(e.target.value) || 0.8)}
                  style={styles.input}
                />
                <span style={styles.inputSuffix}>({((settings.tab_warning_threshold || 0.8) * 100).toFixed(0)}% of limit)</span>
              </div>
              <div style={styles.settingDescription}>
                Show warning when tab reaches this percentage of its limit.
              </div>
            </div>

            <div style={styles.setting}>
              <label style={styles.label}>Auto-Close Tabs After:</label>
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.tab_auto_close_hours || 24}
                  onChange={(e) => handleInputChange('tab_auto_close_hours', parseInt(e.target.value) || 24)}
                  style={styles.input}
                />
                <span style={styles.inputSuffix}>hours</span>
              </div>
              <div style={styles.settingDescription}>
                Automatically close tabs that haven't been paid after this many hours. Set to 168 (7 days) maximum.
              </div>
            </div>

            <div style={styles.tabLimitsPreview}>
              <h4 style={styles.subSectionTitle}>Tab Limits Preview</h4>
              <div style={styles.limitsGrid}>
                <div style={styles.limitCard}>
                  <div style={styles.limitCardTitle}>Employee Can Create</div>
                  <div style={styles.limitCardAmount}>${(settings.default_tab_limit || 0).toFixed(2)}</div>
                  <div style={styles.limitCardNote}>Without manager approval</div>
                </div>
                <div style={styles.limitCard}>
                  <div style={styles.limitCardTitle}>Manager Can Approve</div>
                  <div style={styles.limitCardAmount}>${(settings.max_tab_limit || 0).toFixed(2)}</div>
                  <div style={styles.limitCardNote}>With PIN verification</div>
                </div>
                <div style={styles.limitCard}>
                  <div style={styles.limitCardTitle}>Warning Threshold</div>
                  <div style={styles.limitCardAmount}>${((settings.default_tab_limit || 0) * (settings.tab_warning_threshold || 0.8)).toFixed(2)}</div>
                  <div style={styles.limitCardNote}>Default limit warning</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  // Add all tab-specific styles here
  tabContent: {
    padding: TavariStyles.spacing['3xl']
  },
  section: {
    marginBottom: TavariStyles.spacing['3xl']
  },
  sectionTitle: {
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    marginBottom: TavariStyles.spacing.xl,
    paddingBottom: TavariStyles.spacing.md,
    borderBottom: `2px solid ${TavariStyles.colors.primary}`
  },
  setting: {
    marginBottom: TavariStyles.spacing.xl
  },
  label: {
    ...TavariStyles.components.form.label
  },
  input: {
    ...TavariStyles.components.form.input,
    width: '120px'
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.sm
  },
  inputSuffix: {
    fontSize: TavariStyles.typography.fontSize.base,
    color: TavariStyles.colors.gray600
  },
  settingDescription: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray600,
    marginTop: TavariStyles.spacing.xs,
    fontStyle: 'italic'
  },
  tabLimitsPreview: {
    marginTop: TavariStyles.spacing['2xl'],
    padding: TavariStyles.spacing.xl,
    backgroundColor: TavariStyles.colors.gray50,
    borderRadius: TavariStyles.borderRadius.lg,
    border: `2px solid ${TavariStyles.colors.primary}`
  },
  subSectionTitle: {
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    marginBottom: TavariStyles.spacing.md
  },
  limitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: TavariStyles.spacing.lg,
    marginTop: TavariStyles.spacing.lg
  },
  limitCard: {
    padding: TavariStyles.spacing.lg,
    backgroundColor: TavariStyles.colors.white,
    borderRadius: TavariStyles.borderRadius.md,
    border: `1px solid ${TavariStyles.colors.gray200}`,
    textAlign: 'center',
    boxShadow: TavariStyles.shadows.sm
  },
  limitCardTitle: {
    fontSize: TavariStyles.typography.fontSize.sm,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    color: TavariStyles.colors.gray600,
    marginBottom: TavariStyles.spacing.sm
  },
  limitCardAmount: {
    fontSize: TavariStyles.typography.fontSize['2xl'],
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.primary,
    marginBottom: TavariStyles.spacing.xs
  },
  limitCardNote: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray500,
    fontStyle: 'italic'
  }
};

export default TabsTab;