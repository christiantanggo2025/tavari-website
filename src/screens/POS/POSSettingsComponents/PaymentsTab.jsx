// src/screens/POS/POSSettingsComponents/PaymentsTab.jsx
import React from 'react';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const PaymentsTab = ({ settings, handleInputChange }) => {
  return (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Payment Settings</h3>
        
        <div style={styles.setting}>
          <TavariCheckbox
            checked={settings.tip_enabled}
            onChange={(checked) => handleInputChange('tip_enabled', checked)}
            label="Enable tip prompts"
            id="tip-enabled"
            testId="tip-enabled-checkbox"
          />
          <div style={styles.settingDescription}>
            Show tip options during checkout process.
          </div>
        </div>

        <div style={styles.setting}>
          <label style={styles.label}>Default Tip Percentage:</label>
          <div style={styles.inputGroup}>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={settings.default_tip_percent || 0}
              onChange={(e) => handleInputChange('default_tip_percent', parseFloat(e.target.value) || 0)}
              style={styles.input}
            />
            <span style={styles.inputSuffix}>({((settings.default_tip_percent || 0) * 100).toFixed(1)}%)</span>
          </div>
          <div style={styles.settingDescription}>
            Default tip percentage suggested to customers.
          </div>
        </div>

        <div style={styles.setting}>
          <label style={styles.label}>Service Fee:</label>
          <div style={styles.inputGroup}>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={settings.service_fee || 0}
              onChange={(e) => handleInputChange('service_fee', parseFloat(e.target.value) || 0)}
              style={styles.input}
            />
            <span style={styles.inputSuffix}>({((settings.service_fee || 0) * 100).toFixed(1)}%)</span>
          </div>
          <div style={styles.settingDescription}>
            Optional service fee added to all transactions.
          </div>
        </div>

        {/* Step 127: Require refund reason toggle */}
        <div style={styles.setting}>
          <TavariCheckbox
            checked={settings.require_refund_reason}
            onChange={(checked) => handleInputChange('require_refund_reason', checked)}
            label="Require reason for refunds"
            id="require-refund-reason"
            testId="require-refund-reason-checkbox"
          />
          <div style={styles.settingDescription}>
            When enabled, staff must enter a reason when processing refunds for audit purposes.
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
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
  }
};

export default PaymentsTab;