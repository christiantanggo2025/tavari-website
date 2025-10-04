// components/HR/HREmployeeProfilesComponents/EmployeePremiumAssignmentModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// Import all required consistency files
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const EmployeePremiumAssignmentModal = ({
  isOpen,
  onClose,
  employee,
  availablePremiums = [],
  onPremiumsUpdated
}) => {
  // Security context for sensitive premium data
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'EmployeePremiumAssignmentModal',
    sensitiveComponent: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    securityLevel: 'high'
  });

  // Authentication
  const {
    selectedBusinessId,
    authUser,
    userRole
  } = usePOSAuth({
    requiredRoles: ['owner', 'manager', 'admin'],
    requireBusiness: true,
    componentName: 'EmployeePremiumAssignmentModal'
  });

  // Tax calculations for formatting
  const { formatTaxAmount } = useTaxCalculations(selectedBusinessId);

  // Component state
  const [currentPremiums, setCurrentPremiums] = useState([]);
  const [selectedPremiumId, setSelectedPremiumId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load current premiums when modal opens
  useEffect(() => {
    if (isOpen && employee?.id) {
      loadCurrentPremiums();
    }
  }, [isOpen, employee?.id]);

  // Clear messages after a delay
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadCurrentPremiums = async () => {
    try {
      setLoading(true);
      setError(null);

      await logSecurityEvent('premium_assignment_view', {
        employee_id: employee.id,
        employee_name: employee.full_name
      }, 'low');

      const { data, error: premiumError } = await supabase
        .from('hrpayroll_employee_premiums')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .eq('user_id', employee.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (premiumError) throw premiumError;

      setCurrentPremiums(data || []);
    } catch (error) {
      console.error('Error loading current premiums:', error);
      setError('Failed to load current premiums: ' + error.message);
      await logSecurityEvent('premium_assignment_load_failed', {
        employee_id: employee.id,
        error_message: error.message
      }, 'medium');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPremium = async () => {
    if (!selectedPremiumId) {
      setError('Please select a premium to assign');
      return;
    }

    // Rate limiting check
    const rateLimitCheck = await checkRateLimit('assign_premium');
    if (!rateLimitCheck.allowed) {
      setError('Rate limit exceeded. Please wait before assigning another premium.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Find the selected premium details
      const selectedPremium = availablePremiums.find(p => p.id === selectedPremiumId);
      if (!selectedPremium) {
        throw new Error('Selected premium not found');
      }

      // Check if employee already has this premium
      const existingPremium = currentPremiums.find(cp => cp.premium_name === selectedPremium.name);
      if (existingPremium) {
        setError(`Employee already has the ${selectedPremium.name} premium assigned`);
        return;
      }

      await logSecurityEvent('premium_assignment_attempt', {
        employee_id: employee.id,
        employee_name: employee.full_name,
        premium_id: selectedPremiumId,
        premium_name: selectedPremium.name
      }, 'medium');

      // Insert the new premium assignment
      const { data, error: insertError } = await supabase
        .from('hrpayroll_employee_premiums')
        .insert({
          business_id: selectedBusinessId,
          user_id: employee.id,
          premium_name: selectedPremium.name,
          premium_rate: selectedPremium.rate,
          applies_to_all_hours: selectedPremium.applies_to === 'all_hours'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setCurrentPremiums(prev => [...prev, data]);
      setSelectedPremiumId('');
      setSuccess(`${selectedPremium.name} premium assigned successfully`);

      // Record action for audit
      await recordAction('assign_employee_premium', employee.id, true);

      // Notify parent component
      if (onPremiumsUpdated) {
        onPremiumsUpdated();
      }

    } catch (error) {
      console.error('Error assigning premium:', error);
      setError('Failed to assign premium: ' + error.message);
      await logSecurityEvent('premium_assignment_failed', {
        employee_id: employee.id,
        premium_id: selectedPremiumId,
        error_message: error.message
      }, 'high');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePremium = async (premiumAssignment) => {
    if (!confirm(`Remove ${premiumAssignment.premium_name} premium from ${employee.full_name}?`)) {
      return;
    }

    // Rate limiting check
    const rateLimitCheck = await checkRateLimit('remove_premium');
    if (!rateLimitCheck.allowed) {
      setError('Rate limit exceeded. Please wait before removing another premium.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await logSecurityEvent('premium_removal_attempt', {
        employee_id: employee.id,
        employee_name: employee.full_name,
        premium_id: premiumAssignment.id,
        premium_name: premiumAssignment.premium_name
      }, 'medium');

      // Soft delete by setting is_active to false
      const { error: updateError } = await supabase
        .from('hrpayroll_employee_premiums')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', premiumAssignment.id);

      if (updateError) throw updateError;

      // Update local state
      setCurrentPremiums(prev => prev.filter(p => p.id !== premiumAssignment.id));
      setSuccess(`${premiumAssignment.premium_name} premium removed successfully`);

      // Record action for audit
      await recordAction('remove_employee_premium', employee.id, true);

      // Notify parent component
      if (onPremiumsUpdated) {
        onPremiumsUpdated();
      }

    } catch (error) {
      console.error('Error removing premium:', error);
      setError('Failed to remove premium: ' + error.message);
      await logSecurityEvent('premium_removal_failed', {
        employee_id: employee.id,
        premium_id: premiumAssignment.id,
        error_message: error.message
      }, 'high');
    } finally {
      setSaving(false);
    }
  };

  // Get available premiums that aren't already assigned
  const getAvailablePremiums = () => {
    const assignedPremiumNames = currentPremiums.map(cp => cp.premium_name);
    return availablePremiums.filter(p => !assignedPremiumNames.includes(p.name));
  };

  const styles = {
    overlay: {
      ...TavariStyles.components.modal?.overlay,
      display: isOpen ? 'flex' : 'none'
    },
    modal: {
      ...TavariStyles.components.modal?.content,
      width: '600px',
      maxHeight: '80vh'
    },
    header: {
      ...TavariStyles.components.modal?.header,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: TavariStyles.colors.gray500,
      cursor: 'pointer',
      padding: TavariStyles.spacing.sm
    },
    body: {
      ...TavariStyles.components.modal?.body,
      maxHeight: '400px',
      overflowY: 'auto'
    },
    employeeInfo: {
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginBottom: TavariStyles.spacing.xl,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    employeeName: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },
    employeeDetails: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    section: {
      marginBottom: TavariStyles.spacing.xl
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.lg,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    addSection: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'flex-end',
      marginBottom: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    selectGroup: {
      flex: 1
    },
    label: {
      ...TavariStyles.components.form?.label,
      marginBottom: TavariStyles.spacing.sm
    },
    select: {
      ...TavariStyles.components.form?.select,
      width: '100%'
    },
    addButton: {
      ...TavariStyles.components.button?.base,
      ...TavariStyles.components.button?.variants?.primary,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs,
      whiteSpace: 'nowrap'
    },
    premiumsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.md
    },
    premiumItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.sm || '0 1px 3px rgba(0,0,0,0.1)'
    },
    premiumInfo: {
      flex: 1
    },
    premiumName: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },
    premiumDetails: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600
    },
    premiumRate: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.success,
      marginRight: TavariStyles.spacing.lg
    },
    removeButton: {
      ...TavariStyles.components.button?.base,
      backgroundColor: TavariStyles.colors.errorBg,
      color: TavariStyles.colors.danger,
      border: `1px solid ${TavariStyles.colors.danger}50`,
      padding: TavariStyles.spacing.sm,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    emptyState: {
      textAlign: 'center',
      padding: TavariStyles.spacing['3xl'],
      color: TavariStyles.colors.gray500
    },
    emptyIcon: {
      color: TavariStyles.colors.gray400,
      marginBottom: TavariStyles.spacing.lg
    },
    emptyText: {
      fontSize: TavariStyles.typography.fontSize.lg
    },
    message: {
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      marginBottom: TavariStyles.spacing.lg,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    errorMessage: {
      backgroundColor: TavariStyles.colors.errorBg,
      color: TavariStyles.colors.danger,
      border: `1px solid ${TavariStyles.colors.danger}30`
    },
    successMessage: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.success,
      border: `1px solid ${TavariStyles.colors.success}30`
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: TavariStyles.spacing['3xl'],
      color: TavariStyles.colors.gray600
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            <DollarSign size={24} />
            Manage Premium Assignments
          </h3>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.body}>
          {/* Employee Info */}
          <div style={styles.employeeInfo}>
            <div style={styles.employeeName}>{employee?.full_name}</div>
            <div style={styles.employeeDetails}>
              {employee?.position && `${employee.position} • `}
              {employee?.department && `${employee.department} • `}
              Employee #{employee?.employee_number}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div style={{...styles.message, ...styles.errorMessage}}>
              <AlertTriangle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div style={{...styles.message, ...styles.successMessage}}>
              <Check size={20} />
              {success}
            </div>
          )}

          {/* Add New Premium */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              <Plus size={20} />
              Assign New Premium
            </h4>
            
            <div style={styles.addSection}>
              <div style={styles.selectGroup}>
                <label style={styles.label}>Select Premium</label>
                <select
                  value={selectedPremiumId}
                  onChange={(e) => setSelectedPremiumId(e.target.value)}
                  style={styles.select}
                  disabled={saving}
                >
                  <option value="">Choose a premium...</option>
                  {getAvailablePremiums().map(premium => (
                    <option key={premium.id} value={premium.id}>
                      {premium.name} - ${formatTaxAmount(premium.rate)}
                      {premium.rate_type === 'percentage' ? '%' : ''}
                      {premium.applies_to !== 'all_hours' && ` (${premium.applies_to})`}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleAddPremium}
                disabled={!selectedPremiumId || saving}
                style={{
                  ...styles.addButton,
                  opacity: (!selectedPremiumId || saving) ? 0.6 : 1,
                  cursor: (!selectedPremiumId || saving) ? 'not-allowed' : 'pointer'
                }}
              >
                <Plus size={16} />
                {saving ? 'Adding...' : 'Add Premium'}
              </button>
            </div>

            {getAvailablePremiums().length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyText}>
                  All available premiums have been assigned to this employee.
                </div>
              </div>
            )}
          </div>

          {/* Current Premiums */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              <DollarSign size={20} />
              Current Premium Assignments ({currentPremiums.length})
            </h4>

            {loading ? (
              <div style={styles.loading}>Loading current premiums...</div>
            ) : currentPremiums.length === 0 ? (
              <div style={styles.emptyState}>
                <DollarSign size={48} style={styles.emptyIcon} />
                <div style={styles.emptyText}>
                  No premiums currently assigned to this employee.
                </div>
              </div>
            ) : (
              <div style={styles.premiumsList}>
                {currentPremiums.map((premium) => (
                  <div key={premium.id} style={styles.premiumItem}>
                    <div style={styles.premiumInfo}>
                      <div style={styles.premiumName}>{premium.premium_name}</div>
                      <div style={styles.premiumDetails}>
                        {premium.applies_to_all_hours ? 'Applies to all hours' : 'Applies to specific hours'}
                        {' • '}
                        Assigned {new Date(premium.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div style={styles.premiumRate}>
                      +${formatTaxAmount(premium.premium_rate)}
                    </div>
                    
                    <button
                      onClick={() => handleRemovePremium(premium)}
                      disabled={saving}
                      style={{
                        ...styles.removeButton,
                        opacity: saving ? 0.6 : 1,
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                      title="Remove premium"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePremiumAssignmentModal;