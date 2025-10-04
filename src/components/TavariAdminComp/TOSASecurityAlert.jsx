// TOSASecurityAlert.jsx (Component)
import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { TavariStyles } from '../../utils/TavariStyles';

const TOSASecurityAlert = ({ alert, onClose }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return TavariStyles.colors.danger;
      case 'high': return TavariStyles.colors.warning;
      default: return TavariStyles.colors.info;
    }
  };

  const styles = {
    alert: {
      position: 'fixed',
      top: TavariStyles.spacing.md,
      right: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.white,
      border: `2px solid ${getSeverityColor(alert.severity)}`,
      borderRadius: TavariStyles.borderRadius.lg,
      padding: TavariStyles.spacing.lg,
      boxShadow: TavariStyles.shadows.xl,
      maxWidth: '400px',
      zIndex: 9999
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.sm
    },
    title: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: getSeverityColor(alert.severity)
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: TavariStyles.colors.gray400
    },
    message: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm
    },
    timestamp: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500
    }
  };

  return (
    <div style={styles.alert}>
      <div style={styles.header}>
        <div style={styles.title}>
          <FiAlertTriangle style={{ marginRight: TavariStyles.spacing.xs }} />
          Security Alert
        </div>
        <button style={styles.closeButton} onClick={onClose}>
          <FiX />
        </button>
      </div>
      <div style={styles.message}>{alert.message}</div>
      <div style={styles.timestamp}>{alert.timestamp}</div>
    </div>
  );
};

export default TOSASecurityAlert;