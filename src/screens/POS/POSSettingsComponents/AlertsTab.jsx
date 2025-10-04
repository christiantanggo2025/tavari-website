// src/screens/POS/POSSettingsComponents/AlertsTab.jsx
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const AlertsTab = () => {
  return (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Alert Settings</h3>
        <div style={styles.settingDescription}>
          Alert configuration options will be available in a future update.
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
  settingDescription: {
    fontSize: TavariStyles.typography.fontSize.xs,
    color: TavariStyles.colors.gray600,
    marginTop: TavariStyles.spacing.xs,
    fontStyle: 'italic'
  }
};

export default AlertsTab;