// components/HR/HRSettingsComponents/EmployeeManagementTab.jsx - Employee Management Settings Enhanced with Wage Management
import React, { useState, useCallback } from 'react';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import POSAuthWrapper from '../../Auth/POSAuthWrapper';
import TavariCheckbox from '../../UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';
import { supabase } from '../../../supabaseClient';

const EmployeeManagementTab = ({
  settings,
  onSettingsChange,
  selectedBusinessId,
  businessData,
  userRole,
  authUser,
  saving
}) => {
  // State for wage adjustment operations
  const [wageAdjustmentType, setWageAdjustmentType] = useState('percentage'); // 'percentage' or 'amount'
  const [wageAdjustmentValue, setWageAdjustmentValue] = useState('');
  const [isProcessingWageUpdate, setIsProcessingWageUpdate] = useState(false);
  const [wageUpdateMessage, setWageUpdateMessage] = useState('');

  // Security context for sensitive employee management settings
  const {
    validateInput,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'EmployeeManagementTab',
    sensitiveComponent: true,
    enableAuditLogging: true,
    securityLevel: 'medium'
  });

  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId);

  const handleInputChange = async (field, value) => {
    await logSecurityEvent('employee_settings_change', {
      field,
      new_value: typeof value === 'boolean' ? value : 'redacted',
      business_id: selectedBusinessId
    }, 'low');

    onSettingsChange(field, value);
  };

  // Handle wage updates that affect all employees
  const handleWageUpdate = useCallback(async (updateType) => {
    if (isProcessingWageUpdate) return;
    
    try {
      setIsProcessingWageUpdate(true);
      setWageUpdateMessage('');

      // Get all employees for this business - EXCLUDE terminated employees
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select(`
          id, wage, first_name, last_name, full_name, is_student, birth_date, employment_status,
          business_users!inner(business_id)
        `)
        .eq('business_users.business_id', selectedBusinessId)
        .neq('employment_status', 'terminated')
        .not('wage', 'is', null)
        .order('employment_status', { ascending: true });

      if (employeesError) {
        console.error('Database error:', employeesError);
        throw new Error(`Database error: ${employeesError.message}`);
      }

      console.log('DEBUG: Raw employee data from database:', employees);
      console.log('DEBUG: Number of employees found:', employees?.length || 0);
      
      if (!employees || employees.length === 0) {
        setWageUpdateMessage('No employees found for this business.');
        return;
      }

      let updatedEmployees = [];
      const regularMinWage = parseFloat(settings.minimum_wage_regular) || 0;
      const studentMinWage = parseFloat(settings.minimum_wage_student) || regularMinWage;

      console.log('DEBUG: Minimum wages - Regular:', regularMinWage, 'Student:', studentMinWage);
      console.log('DEBUG: Update type:', updateType);

      switch (updateType) {
        case 'update_to_minimum':
          // Update employees to minimum wage (assume all regular employees for now)
          console.log('DEBUG: Processing update_to_minimum for', employees.length, 'employees');
          
          for (const employee of employees) {
            const currentWage = parseFloat(employee.wage) || 0;
            const applicableMinWage = regularMinWage; // Simplified - use regular min wage for all
            
            console.log(`DEBUG: ${employee.full_name} (${employee.employment_status}) - Current: $${currentWage}, Min: $${applicableMinWage}`);
            
            if (currentWage < applicableMinWage) {
              console.log(`DEBUG: UPDATING ${employee.full_name} from $${currentWage} to $${applicableMinWage}`);
              
              // Simple update without audit fields to avoid constraint issues
              const { error } = await supabase
                .from('users')
                .update({ 
                  wage: applicableMinWage
                })
                .eq('id', employee.id);

              if (!error) {
                updatedEmployees.push({
                  name: employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown Employee',
                  old_wage: currentWage,
                  new_wage: applicableMinWage,
                  type: 'Regular',
                  status: employee.employment_status || 'unknown'
                });
                console.log(`SUCCESS: Updated ${employee.full_name} wage to $${applicableMinWage}`);
              } else {
                console.error(`ERROR updating ${employee.full_name}:`, error);
              }
            } else {
              console.log(`DEBUG: SKIPPING ${employee.full_name} - already at/above minimum`);
            }
          }
          break;

        case 'increase_all_wages':
          // Increase all wages by specified amount or percentage
          const adjustmentValue = parseFloat(wageAdjustmentValue) || 0;
          if (adjustmentValue === 0) {
            throw new Error('Please enter a valid adjustment amount (can be negative to decrease wages)');
          }

          for (const employee of employees) {
            const currentWage = parseFloat(employee.wage) || 0;
            let newWage;

            if (wageAdjustmentType === 'percentage') {
              newWage = currentWage * (1 + adjustmentValue / 100);
            } else {
              newWage = currentWage + adjustmentValue;
            }

            // Ensure new wage meets minimum wage requirements (use regular minimum for all)
            const applicableMinWage = regularMinWage;
            newWage = Math.max(newWage, applicableMinWage);

            if (Math.abs(newWage - currentWage) > 0.01) { // Only update if there's a meaningful change
              // Simple update without audit fields to avoid constraint issues
              const { error } = await supabase
                .from('users')
                .update({ 
                  wage: newWage
                })
                .eq('id', employee.id);

              if (!error) {
                updatedEmployees.push({
                  name: employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown Employee',
                  old_wage: currentWage,
                  new_wage: newWage,
                  type: 'Regular',
                  status: employee.employment_status || 'unknown'
                });
                console.log(`SUCCESS: Updated ${employee.full_name} wage to $${newWage}`);
              } else {
                console.error('Error updating employee wage:', error);
              }
            }
          }
          break;
      }

      // Simple success message without security logging
      if (updatedEmployees.length > 0) {
        setWageUpdateMessage(`Successfully updated wages for ${updatedEmployees.length} employee(s):\n` +
          updatedEmployees.map(emp => 
            `• ${emp.name} (${emp.status}): $${formatTaxAmount ? formatTaxAmount(emp.old_wage) : emp.old_wage.toFixed(2)}/hr → $${formatTaxAmount ? formatTaxAmount(emp.new_wage) : emp.new_wage.toFixed(2)}/hr`
          ).join('\n'));
      } else {
        setWageUpdateMessage('No employees required wage updates.');
      }

    } catch (error) {
      console.error('Wage update error:', error);
      setWageUpdateMessage(`Error updating wages: ${error.message}`);
    } finally {
      setIsProcessingWageUpdate(false);
    }
  }, [selectedBusinessId, userRole, authUser, settings, wageAdjustmentType, wageAdjustmentValue, formatTaxAmount, isProcessingWageUpdate]);

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
    fullWidth: {
      gridColumn: '1 / -1'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    label: {
      ...TavariStyles.components.form?.label || {
        fontSize: TavariStyles.typography.fontSize.sm,
        fontWeight: TavariStyles.typography.fontWeight.medium,
        color: TavariStyles.colors.gray700,
        marginBottom: TavariStyles.spacing.sm,
        display: 'block'
      }
    },
    input: {
      ...TavariStyles.components.form?.input || {
        padding: '12px 16px',
        border: `1px solid ${TavariStyles.colors.gray300}`,
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        fontSize: TavariStyles.typography.fontSize.sm,
        transition: 'border-color 0.2s',
        fontFamily: 'inherit',
        backgroundColor: TavariStyles.colors.white
      },
      width: '90%'
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
    helpText: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic',
      marginTop: TavariStyles.spacing.xs
    },
    wageSection: {
      backgroundColor: `linear-gradient(135deg, ${TavariStyles.colors.primary}08 0%, ${TavariStyles.colors.white} 100%)`,
      border: `2px solid ${TavariStyles.colors.primary}20`
    },
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    button: {
      ...TavariStyles.components.button?.base || {
        padding: '12px 20px',
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        border: 'none',
        fontSize: TavariStyles.typography.fontSize.sm,
        fontWeight: TavariStyles.typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      },
      ...TavariStyles.components.button?.variants?.primary || {
        backgroundColor: TavariStyles.colors.primary,
        color: TavariStyles.colors.white
      }
    },
    dangerButton: {
      ...TavariStyles.components.button?.base || {
        padding: '12px 20px',
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        border: 'none',
        fontSize: TavariStyles.typography.fontSize.sm,
        fontWeight: TavariStyles.typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      },
      backgroundColor: TavariStyles.colors.warning,
      color: TavariStyles.colors.white
    },
    secondaryButton: {
      ...TavariStyles.components.button?.base || {
        padding: '12px 20px',
        borderRadius: TavariStyles.borderRadius?.md || '6px',
        fontSize: TavariStyles.typography.fontSize.sm,
        fontWeight: TavariStyles.typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      },
      backgroundColor: TavariStyles.colors.white,
      color: TavariStyles.colors.primary,
      border: `1px solid ${TavariStyles.colors.primary}`
    },
    disabledButton: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    radioGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.lg,
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.md
    },
    radioOption: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      cursor: 'pointer'
    },
    messageBox: {
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginTop: TavariStyles.spacing.md,
      whiteSpace: 'pre-line',
      fontFamily: 'monospace',
      fontSize: TavariStyles.typography.fontSize.xs,
      backgroundColor: TavariStyles.colors.gray50,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    warningBox: {
      backgroundColor: TavariStyles.colors.warning + '10',
      border: `1px solid ${TavariStyles.colors.warning}`,
      color: TavariStyles.colors.warning,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginBottom: TavariStyles.spacing.md,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium
    }
  };

  return (
    <div style={styles.container}>
      {/* Basic Employee Configuration */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Basic Employee Configuration</h3>
        
        <div style={styles.grid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Probation Period (days)
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={settings.probation_period_days || 90}
              onChange={(e) => handleInputChange('probation_period_days', parseInt(e.target.value) || 0)}
              disabled={saving}
              style={styles.input}
            />
            <span style={styles.description}>
              Default probation period for new employees
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Employee Number Prefix
            </label>
            <input
              type="text"
              maxLength="10"
              value={settings.employee_number_prefix || 'EMP'}
              onChange={(e) => handleInputChange('employee_number_prefix', e.target.value)}
              disabled={saving}
              style={styles.input}
              placeholder="EMP"
            />
            <span style={styles.description}>
              Prefix for auto-generated employee numbers (e.g., EMP001, EMP002)
            </span>
          </div>
        </div>
      </div>

      {/* Wage Management Section */}
      <div style={{ ...styles.section, ...styles.wageSection }}>
        <h3 style={styles.sectionTitle}>Wage Management & Minimum Wage Settings</h3>
        
        <div style={styles.warningBox}>
          Important: Wage changes affect all employees and are permanently logged for audit purposes. Ensure you have proper authorization before making changes.
        </div>

        {/* Minimum Wage Settings */}
        <div style={styles.grid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Regular Minimum Wage ($/hour)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.minimum_wage_regular || ''}
              onChange={(e) => handleInputChange('minimum_wage_regular', parseFloat(e.target.value) || 0)}
              disabled={saving}
              style={styles.input}
              placeholder="17.20"
            />
            <span style={styles.description}>
              Minimum wage for regular employees (Ontario: $17.20/hr as of Oct 2024)
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Student Minimum Wage ($/hour)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.minimum_wage_student || ''}
              onChange={(e) => handleInputChange('minimum_wage_student', parseFloat(e.target.value) || 0)}
              disabled={saving}
              style={styles.input}
              placeholder="16.20"
            />
            <span style={styles.description}>
              Minimum wage for students under 18 or working less than 28 hours/week (Ontario: $16.20/hr)
            </span>
          </div>
        </div>

        {/* Bulk Wage Update Actions */}
        <div style={styles.fullWidth}>
          <h4 style={{ ...styles.sectionTitle, fontSize: TavariStyles.typography.fontSize.lg, marginTop: TavariStyles.spacing.xl }}>
            Bulk Wage Update Actions
          </h4>

          {/* Update to Minimum Wage */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Update All Employees to Meet Minimum Wage</label>
            <div style={styles.buttonGroup}>
              <button
                style={{
                  ...styles.button,
                  ...(isProcessingWageUpdate ? styles.disabledButton : {})
                }}
                onClick={() => handleWageUpdate('update_to_minimum')}
                disabled={saving || isProcessingWageUpdate}
              >
                {isProcessingWageUpdate ? 'Updating Wages...' : 'Update to Minimum Wage'}
              </button>
            </div>
            <span style={styles.description}>
              Updates all employees earning below minimum wage to their applicable minimum wage (regular or student rate)
            </span>
          </div>

          {/* Increase All Wages */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Increase All Employee Wages</label>
            
            <div style={styles.radioGroup}>
              <label style={styles.radioOption}>
                <input
                  type="radio"
                  name="wageAdjustmentType"
                  value="percentage"
                  checked={wageAdjustmentType === 'percentage'}
                  onChange={(e) => setWageAdjustmentType(e.target.value)}
                  disabled={saving || isProcessingWageUpdate}
                />
                <span>Percentage Increase (%)</span>
              </label>
              <label style={styles.radioOption}>
                <input
                  type="radio"
                  name="wageAdjustmentType"
                  value="amount"
                  checked={wageAdjustmentType === 'amount'}
                  onChange={(e) => setWageAdjustmentType(e.target.value)}
                  disabled={saving || isProcessingWageUpdate}
                />
                <span>Dollar Amount Increase ($)</span>
              </label>
            </div>

            <div style={styles.buttonGroup}>
              <input
                type="number"
                min="-100"
                step={wageAdjustmentType === 'percentage' ? '0.1' : '0.01'}
                value={wageAdjustmentValue}
                onChange={(e) => setWageAdjustmentValue(e.target.value)}
                disabled={saving || isProcessingWageUpdate}
                style={{ ...styles.input, width: '120px' }}
                placeholder={wageAdjustmentType === 'percentage' ? '5.0' : '1.00'}
              />
              <span style={styles.label}>
                {wageAdjustmentType === 'percentage' ? '%' : '$/hour'}
              </span>
              <button
                style={{
                  ...styles.dangerButton,
                  ...(isProcessingWageUpdate || !wageAdjustmentValue ? styles.disabledButton : {})
                }}
                onClick={() => handleWageUpdate('increase_all_wages')}
                disabled={saving || isProcessingWageUpdate || !wageAdjustmentValue}
              >
                {isProcessingWageUpdate ? 'Applying Increase...' : 'Apply Wage Increase to All'}
              </button>
            </div>
            
            <span style={styles.description}>
              {wageAdjustmentType === 'percentage' 
                ? 'Increases all employee wages by the specified percentage. Wages will be adjusted to meet minimum wage requirements if necessary.'
                : 'Increases all employee wages by the specified dollar amount per hour. Use negative values to decrease wages. Wages will be adjusted to meet minimum wage requirements if necessary.'}
            </span>
          </div>

          {wageUpdateMessage && (
            <div style={styles.messageBox}>
              {wageUpdateMessage}
            </div>
          )}
        </div>
      </div>

      {/* Employee Number Generation */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Employee Number Generation</h3>
        
        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.auto_generate_employee_numbers ?? true}
              onChange={(checked) => handleInputChange('auto_generate_employee_numbers', checked)}
              label="Auto-generate employee numbers"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Automatically assign sequential employee numbers when creating new employees
            </span>
          </div>
        </div>
      </div>

      {/* Employee Profile Management */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Employee Profile Management</h3>
        
        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.allow_employee_self_edit ?? true}
              onChange={(checked) => handleInputChange('allow_employee_self_edit', checked)}
              label="Allow employees to edit their own profiles"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Employees can update their contact information, emergency contacts, and other personal details
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.require_manager_approval_profile_changes ?? false}
              onChange={(checked) => handleInputChange('require_manager_approval_profile_changes', checked)}
              label="Require manager approval for profile changes"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              All employee profile changes must be reviewed and approved by a manager before taking effect
            </span>
          </div>
        </div>
      </div>

      {/* Department and Role Management */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Department and Role Management</h3>
        
        <div style={styles.grid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Default Department
            </label>
            <input
              type="text"
              maxLength="50"
              value={settings.default_department || ''}
              onChange={(e) => handleInputChange('default_department', e.target.value)}
              disabled={saving}
              style={styles.input}
              placeholder="General"
            />
            <span style={styles.description}>
              Default department for new employees
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Default Job Title
            </label>
            <input
              type="text"
              maxLength="50"
              value={settings.default_job_title || ''}
              onChange={(e) => handleInputChange('default_job_title', e.target.value)}
              disabled={saving}
              style={styles.input}
              placeholder="Employee"
            />
            <span style={styles.description}>
              Default job title for new employees
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Contact Requirements */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Emergency Contact Requirements</h3>
        
        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.require_emergency_contact ?? true}
              onChange={(checked) => handleInputChange('require_emergency_contact', checked)}
              label="Require emergency contact information"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              All employees must provide at least one emergency contact
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.require_multiple_emergency_contacts ?? false}
              onChange={(checked) => handleInputChange('require_multiple_emergency_contacts', checked)}
              label="Require multiple emergency contacts"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Employees must provide at least two emergency contacts
            </span>
          </div>
        </div>
      </div>

      {/* Photo and Identification */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Photo and Identification</h3>
        
        <div style={styles.toggleGroup}>
          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.require_employee_photo ?? false}
              onChange={(checked) => handleInputChange('require_employee_photo', checked)}
              label="Require employee photos"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              All employees must upload a profile photo
            </span>
          </div>

          <div style={styles.toggleItem}>
            <TavariCheckbox
              checked={settings.allow_photo_updates ?? true}
              onChange={(checked) => handleInputChange('allow_photo_updates', checked)}
              label="Allow employees to update their photos"
              disabled={saving}
              size="md"
            />
            <span style={styles.description}>
              Employees can update their profile photos themselves
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagementTab;