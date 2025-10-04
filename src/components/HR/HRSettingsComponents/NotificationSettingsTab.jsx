// components/HR/HRSettingsComponents/NotificationSettingsTab.jsx - Notification Settings
import React from 'react';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import POSAuthWrapper from '../../Auth/POSAuthWrapper';
import TavariCheckbox from '../../UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const NotificationSettingsTab = ({
  settings,
  onSettingsChange,
  selectedBusinessId,
  businessData,
  userRole,
  authUser,
  saving
}) => {
  // Security context for notification settings
  const {
    validateInput,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'NotificationSettingsTab',
    sensitiveComponent: false,
    enableAuditLogging: true,
    securityLevel: 'low'
  });

  const handleInputChange = async (field, value) => {
    await logSecurityEvent('notification_settings_change', {
      field,
      business_id: selectedBusinessId
    }, 'low');

    onSettingsChange(field, value);
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xl
    },
    section: {
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.xl,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.sm || '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      margin: `0 0 ${TavariStyles.spacing.lg} 0`
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: TavariStyles.spacing.xl
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    label: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },
    input: {
      ...TavariStyles.components.form?.input || {
        padding: '12px 16px',
        border: `1px solid ${TavariStyles.colors.gray300}`,
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        fontSize: TavariStyles.typography.fontSize.sm,
        backgroundColor: TavariStyles.colors.white
      },
      width: '100%'
    },
    select: {
      ...TavariStyles.components.form?.select || {
        padding: '12px 16px',
        border: `1px solid ${TavariStyles.colors.gray300}`,
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        fontSize: TavariStyles.typography.fontSize.sm,
        backgroundColor: TavariStyles.colors.white,
        cursor: 'pointer'
      },
      width: '100%'
    },
    toggleGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.lg
    },
    toggleItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    description: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500,
      marginTop: TavariStyles.spacing.xs
    },
    infoBox: {
      backgroundColor: TavariStyles.colors.infoBg,
      color: TavariStyles.colors.infoText,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      fontSize: TavariStyles.typography.fontSize.xs,
      marginTop: TavariStyles.spacing.md
    }
  };

  return (
    <div style={styles.container}>
      {/* Primary Notification Settings */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Primary Notification Settings</h3>
        
        <div style={styles.grid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Primary HR Notification Email *
            </label>
            <input
              type="email"
              value={settings.notification_email || ''}
              onChange={(e) => handleInputChange('notification_email', e.target.value)}
              disabled={saving}
              style={styles.input}
              placeholder="hr@company.com"
            />
            <span style={styles.description}>
              Primary email address for HR notifications and alerts
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Secondary HR Email
            </label>
            <input
              type="email"
              value={settings.secondary_notification_email || ''}
              onChange={(e) => handleInputChange('secondary_notification_email', e.target.value)}
              disabled={saving}
              style={styles.input}
              placeholder="hr-backup@company.com"
            />
            <span style={styles.description}>
              Backup email address for critical HR notifications
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Manager Notification Email
            </label>
            <input
              type="email"
              value={settings.manager_notification_email || ''}
              onChange={(e) => handleInputChange('manager_notification_email', e.target.value)}
              disabled={saving}
              style={styles.input}
              placeholder="management@company.com"
            />
            <span style={styles.description}>
              Email for management-level notifications and approvals
            </span>
          </div>
        </div>
      </div>

      {/* Contract and Employment Alerts */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Contract and Employment Alerts</h3>
        
        <div style={styles.grid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Contract Expiry Warning (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.contract_expiry_warning_days || 30}
              onChange={(e) => handleInputChange('contract_expiry_warning_days', parseInt(e.target.value) || 30)}
              disabled={saving}
              style={styles.input}
            />
            <span style={styles.description}>
              Days before contract expiry to send warning notifications
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Probation Period Ending Warning (days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.probation_ending_warning_days || 7}
              onChange={(e) => handleInputChange('probation_ending_warning_days', parseInt(e.target.value) || 7)}
              disabled={saving}
              style={styles.input}
            />
            <span style={styles.description}>
              Days before probation period ends to send notifications
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Anniversary Notification
            </label>
            <select
              value={settings.anniversary_notification_timing || 'week_before'}
              onChange={(e) => handleInputChange('anniversary_notification_timing', e.target.value)}
              disabled={saving}
              style={styles.select}
            >
              <option value="disabled">Disabled</option>
              <option value="day_of">Day of Anniversary</option>
              <option value="week_before">Week Before</option>
              <option value="month_before">Month Before</option>
            </select>
            <span style={styles.description}>
              When to send employee work anniversary notifications
            </span>
          </div>
        </div>

        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_contract_renewals ?? true}
              onChange={(checked) => handleInputChange('notify_contract_renewals', checked)}
              label="Notify for contract renewals"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Send notifications when employee contracts are up for renewal
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_employment_milestones ?? true}
              onChange={(checked) => handleInputChange('notify_employment_milestones', checked)}
              label="Notify for employment milestones"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Send notifications for work anniversaries and employment milestones
            </span>
          </div>
        </div>
      </div>

      {/* Policy and Training Notifications */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Policy and Training Notifications</h3>
        
        <div style={styles.grid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Policy Acknowledgment Deadline (days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={settings.policy_acknowledgment_deadline_days || 14}
              onChange={(e) => handleInputChange('policy_acknowledgment_deadline_days', parseInt(e.target.value) || 14)}
              disabled={saving}
              style={styles.input}
            />
            <span style={styles.description}>
              Days employees have to acknowledge new policies before escalation
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Training Deadline Warning (days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.training_deadline_warning_days || 7}
              onChange={(e) => handleInputChange('training_deadline_warning_days', parseInt(e.target.value) || 7)}
              disabled={saving}
              style={styles.input}
            />
            <span style={styles.description}>
              Days before training deadline to send reminder notifications
            </span>
          </div>
        </div>

        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_policy_updates ?? true}
              onChange={(checked) => handleInputChange('notify_policy_updates', checked)}
              label="Notify employees of policy updates"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Automatically notify employees when policies are updated or new policies are added
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_training_assignments ?? true}
              onChange={(checked) => handleInputChange('notify_training_assignments', checked)}
              label="Notify employees of training assignments"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Send notifications when new training is assigned to employees
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_overdue_acknowledgments ?? true}
              onChange={(checked) => handleInputChange('notify_overdue_acknowledgments', checked)}
              label="Notify managers of overdue acknowledgments"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Alert managers when employees have overdue policy acknowledgments or training
            </span>
          </div>
        </div>
      </div>

      {/* Leave and Attendance Notifications */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Leave and Attendance Notifications</h3>
        
        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_leave_requests ?? true}
              onChange={(checked) => handleInputChange('notify_leave_requests', checked)}
              label="Notify managers of leave requests"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Send immediate notifications to managers when leave requests are submitted
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_attendance_issues ?? true}
              onChange={(checked) => handleInputChange('notify_attendance_issues', checked)}
              label="Notify of attendance issues"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Alert managers about excessive tardiness, absences, or attendance patterns
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_low_leave_balances ?? false}
              onChange={(checked) => handleInputChange('notify_low_leave_balances', checked)}
              label="Notify employees of low leave balances"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Alert employees when their vacation or sick leave balances are running low
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_leave_balance_expiry ?? true}
              onChange={(checked) => handleInputChange('notify_leave_balance_expiry', checked)}
              label="Notify of upcoming leave balance expiry"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Warn employees before vacation time expires or is forfeited
            </span>
          </div>
        </div>
      </div>

      {/* Payroll and Benefits Notifications */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Payroll and Benefits Notifications</h3>
        
        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_payroll_processed ?? true}
              onChange={(checked) => handleInputChange('notify_payroll_processed', checked)}
              label="Notify when payroll is processed"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Send notifications to HR when payroll runs are successfully processed
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_payroll_errors ?? true}
              onChange={(checked) => handleInputChange('notify_payroll_errors', checked)}
              label="Notify of payroll errors"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Immediate alerts for payroll processing errors or validation failures
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_wage_changes ?? true}
              onChange={(checked) => handleInputChange('notify_wage_changes', checked)}
              label="Notify of wage changes"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Alert HR and managers when employee wages or salaries are modified
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_benefits_eligibility ?? true}
              onChange={(checked) => handleInputChange('notify_benefits_eligibility', checked)}
              label="Notify of benefits eligibility changes"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Alert when employees become eligible for benefits or when eligibility changes
            </span>
          </div>
        </div>
      </div>

      {/* System and Security Notifications */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>System and Security Notifications</h3>
        
        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_failed_login_attempts ?? true}
              onChange={(checked) => handleInputChange('notify_failed_login_attempts', checked)}
              label="Notify of failed login attempts"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Alert HR of repeated failed login attempts or potential security issues
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_data_exports ?? true}
              onChange={(checked) => handleInputChange('notify_data_exports', checked)}
              label="Notify of employee data exports"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Alert when employee data is exported from the system
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.notify_system_maintenance ?? true}
              onChange={(checked) => handleInputChange('notify_system_maintenance', checked)}
              label="Notify of scheduled maintenance"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Send advance notifications of scheduled system maintenance windows
            </span>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Failed Login Threshold
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.failed_login_threshold || 5}
              onChange={(e) => handleInputChange('failed_login_threshold', parseInt(e.target.value) || 5)}
              disabled={saving}
              style={styles.input}
            />
            <span style={styles.description}>
              Number of failed login attempts before triggering security notification
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Notification Frequency
            </label>
            <select
              value={settings.notification_frequency || 'immediate'}
              onChange={(e) => handleInputChange('notification_frequency', e.target.value)}
              disabled={saving}
              style={styles.select}
            >
              <option value="immediate">Immediate</option>
              <option value="hourly">Hourly Digest</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Summary</option>
            </select>
            <span style={styles.description}>
              How frequently to send non-critical notifications
            </span>
          </div>
        </div>

        <div style={styles.infoBox}>
          <strong>Email Configuration:</strong> Ensure your email server is properly configured to send notifications. 
          Test notifications regularly to verify delivery. Critical alerts are always sent immediately regardless of frequency settings.
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsTab;