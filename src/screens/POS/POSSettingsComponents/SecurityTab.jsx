// src/screens/POS/POSSettingsComponents/SecurityTab.jsx
import React from 'react';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const SecurityTab = ({ settings, handleInputChange }) => {
  return (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Security Settings</h3>
        
        <div style={styles.setting}>
          <TavariCheckbox
            checked={settings.pin_required}
            onChange={(checked) => handleInputChange('pin_required', checked)}
            label="Require PIN for register access"
            id="pin-required"
            testId="pin-required-checkbox"
          />
          <div style={styles.settingDescription}>
            When enabled, employees must enter their PIN to access the register.
          </div>
        </div>

        {/* Step 131: Register Lock Settings */}
        <div style={styles.lockSection}>
          <h4 style={styles.subSectionTitle}>Register Lock Settings</h4>
          <div style={styles.settingDescription}>
            Configure when the register should automatically lock and require PIN authentication.
          </div>
          
          <div style={styles.setting}>
            <TavariCheckbox
              checked={settings.lock_on_startup}
              onChange={(checked) => handleInputChange('lock_on_startup', checked)}
              label="Lock register on startup"
              id="lock-on-startup"
              testId="lock-on-startup-checkbox"
            />
            <div style={styles.settingDescription}>
              When enabled, the register will be locked when first accessed and require any staff member's PIN to unlock.
            </div>
          </div>

          <div style={styles.setting}>
            <TavariCheckbox
              checked={settings.lock_after_sale}
              onChange={(checked) => handleInputChange('lock_after_sale', checked)}
              label="Lock register after each sale"
              id="lock-after-sale"
              testId="lock-after-sale-checkbox"
            />
            <div style={styles.settingDescription}>
              When enabled, the register will automatically lock after completing each sale. Staff must enter their PIN to continue.
            </div>
          </div>

          {/* Visual preview of current lock configuration */}
          <div style={styles.lockPreview}>
            <h5 style={styles.previewTitle}>Current Configuration:</h5>
            <div style={styles.previewContent}>
              {!settings.lock_on_startup && !settings.lock_after_sale && (
                <div style={styles.previewItem}>
                  <span style={styles.previewIcon}>🔓</span>
                  <span>Register always unlocked - Fast operation mode</span>
                </div>
              )}
              {settings.lock_on_startup && !settings.lock_after_sale && (
                <div style={styles.previewItem}>
                  <span style={styles.previewIcon}>🔐</span>
                  <span>Register locks on startup only - Secure start, continuous operation</span>
                </div>
              )}
              {!settings.lock_on_startup && settings.lock_after_sale && (
                <div style={styles.previewItem}>
                  <span style={styles.previewIcon}>🔒</span>
                  <span>Register locks after each sale - Maximum transaction security</span>
                </div>
              )}
              {settings.lock_on_startup && settings.lock_after_sale && (
                <div style={styles.previewItem}>
                  <span style={styles.previewIcon}>🛡️</span>
                  <span>Full security mode - Locks on startup and after each sale</span>
                </div>
              )}
            </div>
          </div>

          <div style={styles.settingNote}>
            <strong>Note:</strong> When locked, any staff member with POS access can unlock the register using their individual PIN. 
            All unlock events are logged for audit purposes.
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
  settingDescription: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray600,
    marginTop: TavariStyles.spacing.xs,
    fontStyle: 'italic'
  },
  lockSection: {
    marginTop: TavariStyles.spacing['2xl'],
    padding: TavariStyles.spacing.xl,
    backgroundColor: TavariStyles.colors.gray50,
    borderRadius: TavariStyles.borderRadius.lg,
    border: `2px solid ${TavariStyles.colors.gray300}`
  },
  subSectionTitle: {
    fontSize: TavariStyles.typography.fontSize.lg,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    marginBottom: TavariStyles.spacing.md
  },
  lockPreview: {
    marginTop: TavariStyles.spacing.xl,
    padding: TavariStyles.spacing.lg,
    backgroundColor: TavariStyles.colors.white,
    borderRadius: TavariStyles.borderRadius.md,
    border: `1px solid ${TavariStyles.colors.gray200}`
  },
  previewTitle: {
    fontSize: TavariStyles.typography.fontSize.base,
    fontWeight: TavariStyles.typography.fontWeight.semibold,
    color: TavariStyles.colors.gray700,
    marginBottom: TavariStyles.spacing.md
  },
  previewContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.sm
  },
  previewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: TavariStyles.spacing.md,
    padding: TavariStyles.spacing.sm,
    backgroundColor: TavariStyles.colors.gray50,
    borderRadius: TavariStyles.borderRadius.sm,
    fontSize: TavariStyles.typography.fontSize.sm,
    color: TavariStyles.colors.gray700
  },
  previewIcon: {
    fontSize: TavariStyles.typography.fontSize.xl
  },
  settingNote: {
    marginTop: TavariStyles.spacing.lg,
    padding: TavariStyles.spacing.md,
    backgroundColor: TavariStyles.colors.infoBg,
    borderRadius: TavariStyles.borderRadius.md,
    border: `1px solid ${TavariStyles.colors.info}`,
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray700,
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  }
};

export default SecurityTab;