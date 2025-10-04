// components/HR/HRPayrollComponents/EETRT-FrequencyDetection.jsx
import React from 'react';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const EETRT_FrequencyDetection = ({ selectedEmployee, reportConfig, setReportConfig }) => {
  const PAYMENT_FREQUENCIES = {
    'weekly': { label: 'Weekly (52 periods/year)', periods: 52 },
    'bi_weekly': { label: 'Bi-Weekly (26 periods/year)', periods: 26 },
    'semi_monthly': { label: 'Semi-Monthly (24 periods/year)', periods: 24 },
    'monthly': { label: 'Monthly (12 periods/year)', periods: 12 }
  };

  const handleFrequencyOverride = (enabled) => {
    setReportConfig(prev => ({
      ...prev,
      paymentFrequencyOverride: enabled,
      paymentFrequency: enabled ? 
        (prev.detectedFrequency || 'bi_weekly') : 
        'auto_detect'
    }));
  };

  const getEffectivePaymentFrequency = () => {
    if (reportConfig.paymentFrequencyOverride && reportConfig.paymentFrequency !== 'auto_detect') {
      return reportConfig.paymentFrequency;
    }
    return reportConfig.detectedFrequency || 'bi_weekly';
  };

  const getPayPeriodsPerYear = () => {
    const frequency = getEffectivePaymentFrequency();
    return PAYMENT_FREQUENCIES[frequency]?.periods || 26;
  };

  const styles = {
    section: {
      marginBottom: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: '12px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.md,
      color: TavariStyles.colors.gray800
    },
    frequencyDetection: {
      backgroundColor: TavariStyles.colors.info + '10',
      border: `1px solid ${TavariStyles.colors.info}40`,
      borderRadius: '8px',
      padding: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.md
    },
    confidenceBar: {
      height: '6px',
      backgroundColor: TavariStyles.colors.gray200,
      borderRadius: '3px',
      overflow: 'hidden',
      marginTop: TavariStyles.spacing.xs
    },
    confidenceFill: {
      height: '100%',
      backgroundColor: TavariStyles.colors.success,
      transition: 'width 0.3s ease'
    },
    override: {
      backgroundColor: TavariStyles.colors.warning + '20',
      border: `1px solid ${TavariStyles.colors.warning}`,
      borderRadius: '6px',
      padding: TavariStyles.spacing.sm,
      marginTop: TavariStyles.spacing.sm
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs,
      marginBottom: TavariStyles.spacing.md
    },
    label: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },
    select: {
      padding: '12px 16px',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: '6px',
      fontSize: TavariStyles.typography.fontSize.sm,
      backgroundColor: TavariStyles.colors.white
    }
  };

  if (!selectedEmployee) return null;

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Payment Frequency Configuration</div>
      
      {/* Detection Results */}
      <div style={styles.frequencyDetection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: TavariStyles.spacing.xs }}>
          <span style={{ fontWeight: TavariStyles.typography.fontWeight.semibold }}>
            Detected Frequency: {reportConfig.detectedFrequency ? 
              PAYMENT_FREQUENCIES[reportConfig.detectedFrequency]?.label : 
              'Unable to detect'}
          </span>
          <span style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray600 }}>
            Confidence: {reportConfig.frequencyConfidence}%
          </span>
        </div>
        
        {/* Confidence Bar */}
        <div style={styles.confidenceBar}>
          <div 
            style={{
              ...styles.confidenceFill,
              width: `${reportConfig.frequencyConfidence}%`,
              backgroundColor: reportConfig.frequencyConfidence >= 80 ? 
                TavariStyles.colors.success : 
                reportConfig.frequencyConfidence >= 60 ? 
                TavariStyles.colors.warning : 
                TavariStyles.colors.danger
            }}
          />
        </div>
        
        <div style={{ fontSize: TavariStyles.typography.fontSize.xs, color: TavariStyles.colors.gray600, marginTop: TavariStyles.spacing.xs }}>
          Based on analysis of payroll entries
        </div>
      </div>

      {/* Override Controls */}
      <div style={styles.formGroup}>
        <TavariCheckbox
          checked={reportConfig.paymentFrequencyOverride}
          onChange={handleFrequencyOverride}
          label="Override automatic detection and manually set payment frequency"
          size="md"
        />
      </div>

      {reportConfig.paymentFrequencyOverride && (
        <div style={styles.override}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Manual Payment Frequency:</label>
            <select
              style={styles.select}
              value={reportConfig.paymentFrequency}
              onChange={(e) => setReportConfig(prev => ({ 
                ...prev, 
                paymentFrequency: e.target.value 
              }))}
            >
              {Object.entries(PAYMENT_FREQUENCIES).map(([key, freq]) => (
                <option key={key} value={key}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: TavariStyles.typography.fontSize.xs, color: TavariStyles.colors.gray600 }}>
            ⚠️ Manual override will be used for all calculations instead of automatic detection
          </div>
        </div>
      )}

      {/* Current Settings Summary */}
      <div style={{ backgroundColor: TavariStyles.colors.gray50, padding: TavariStyles.spacing.sm, borderRadius: '6px', marginTop: TavariStyles.spacing.md }}>
        <div style={{ fontSize: TavariStyles.typography.fontSize.sm, fontWeight: TavariStyles.typography.fontWeight.semibold }}>
          Effective Settings:
        </div>
        <div style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray700 }}>
          • Frequency: {PAYMENT_FREQUENCIES[getEffectivePaymentFrequency()]?.label}
          <br />
          • Pay Periods/Year: {getPayPeriodsPerYear()}
          <br />
          • Source: {reportConfig.paymentFrequencyOverride ? 'Manual Override' : 'Auto-Detected'}
        </div>
      </div>
    </div>
  );
};

export default EETRT_FrequencyDetection;