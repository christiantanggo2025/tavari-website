// components/HR/HREmployeeProfilesComponents/EmployeeCertificateManagementModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Award, AlertTriangle, Check, Calendar, FileText, Upload } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// Import all required consistency files
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../../hooks/useTaxCalculations';
import POSAuthWrapper from '../../../components/Auth/POSAuthWrapper';
import TavariCheckbox from '../../../components/UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const EmployeeCertificateManagementModal = ({
  isOpen,
  onClose,
  employee,
  availableCertificates = [],
  onCertificatesUpdated
}) => {
  // Security context for sensitive certificate data
  const {
    validateInput,
    checkRateLimit,
    recordAction,
    logSecurityEvent
  } = useSecurityContext({
    componentName: 'EmployeeCertificateManagementModal',
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
    componentName: 'EmployeeCertificateManagementModal'
  });

  // Component state
  const [currentCertificates, setCurrentCertificates] = useState([]);
  const [selectedCertificateId, setSelectedCertificateId] = useState('');
  const [newCertificateData, setNewCertificateData] = useState({
    issue_date: '',
    expiry_date: '',
    certificate_number: '',
    document_path: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Load current certificates when modal opens
  useEffect(() => {
    if (isOpen && employee?.id) {
      loadCurrentCertificates();
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

  const loadCurrentCertificates = async () => {
    try {
      setLoading(true);
      setError(null);

      await logSecurityEvent('certificate_assignment_view', {
        employee_id: employee.id,
        employee_name: employee.full_name
      }, 'low');

      const { data, error: certError } = await supabase
        .from('employee_certificates')
        .select(`
          *,
          hr_certificates!inner(
            id,
            name,
            description,
            issuing_authority,
            requires_renewal,
            renewal_period_months
          )
        `)
        .eq('business_id', selectedBusinessId)
        .eq('employee_id', employee.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (certError) throw certError;

      // Transform data to include expiry calculations
      const transformedCerts = (data || []).map(cert => ({
        ...cert,
        is_expired: cert.expiry_date ? new Date(cert.expiry_date) < new Date() : false,
        days_until_expiry: cert.expiry_date ? Math.ceil((new Date(cert.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
        expires_soon: cert.expiry_date ? Math.ceil((new Date(cert.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) <= 30 : false
      }));

      setCurrentCertificates(transformedCerts);
    } catch (error) {
      console.error('Error loading current certificates:', error);
      setError('Failed to load current certificates: ' + error.message);
      await logSecurityEvent('certificate_assignment_load_failed', {
        employee_id: employee.id,
        error_message: error.message
      }, 'medium');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCertificate = async () => {
    if (!selectedCertificateId || !newCertificateData.issue_date) {
      setError('Please select a certificate and provide an issue date');
      return;
    }

    // Rate limiting check
    const rateLimitCheck = await checkRateLimit('assign_certificate');
    if (!rateLimitCheck.allowed) {
      setError('Rate limit exceeded. Please wait before assigning another certificate.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Find the selected certificate details
      const selectedCertificate = availableCertificates.find(c => c.id === selectedCertificateId);
      if (!selectedCertificate) {
        throw new Error('Selected certificate not found');
      }

      // Check if employee already has this certificate
      const existingCertificate = currentCertificates.find(cc => cc.certificate_id === selectedCertificateId);
      if (existingCertificate) {
        setError(`Employee already has the ${selectedCertificate.name} certificate assigned`);
        return;
      }

      // Validate dates
      if (newCertificateData.expiry_date && new Date(newCertificateData.issue_date) >= new Date(newCertificateData.expiry_date)) {
        setError('Expiry date must be after the issue date');
        return;
      }

      await logSecurityEvent('certificate_assignment_attempt', {
        employee_id: employee.id,
        employee_name: employee.full_name,
        certificate_id: selectedCertificateId,
        certificate_name: selectedCertificate.name
      }, 'medium');

      // Insert the new certificate assignment
      const { data, error: insertError } = await supabase
        .from('employee_certificates')
        .insert({
          business_id: selectedBusinessId,
          employee_id: employee.id,
          certificate_id: selectedCertificateId,
          issue_date: newCertificateData.issue_date,
          expiry_date: newCertificateData.expiry_date || null,
          certificate_number: newCertificateData.certificate_number || null,
          document_path: newCertificateData.document_path || null,
          notes: newCertificateData.notes || null,
          uploaded_by: authUser.id
        })
        .select(`
          *,
          hr_certificates!inner(
            id,
            name,
            description,
            issuing_authority,
            requires_renewal,
            renewal_period_months
          )
        `)
        .single();

      if (insertError) throw insertError;

      // Transform the returned data
      const transformedCert = {
        ...data,
        is_expired: data.expiry_date ? new Date(data.expiry_date) < new Date() : false,
        days_until_expiry: data.expiry_date ? Math.ceil((new Date(data.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
        expires_soon: data.expiry_date ? Math.ceil((new Date(data.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) <= 30 : false
      };

      // Update local state
      setCurrentCertificates(prev => [transformedCert, ...prev]);
      
      // Reset form
      setSelectedCertificateId('');
      setNewCertificateData({
        issue_date: '',
        expiry_date: '',
        certificate_number: '',
        document_path: '',
        notes: ''
      });
      setShowAddForm(false);
      
      setSuccess(`${selectedCertificate.name} certificate assigned successfully`);

      // Record action for audit
      await recordAction('assign_employee_certificate', employee.id, true);

      // Notify parent component
      if (onCertificatesUpdated) {
        onCertificatesUpdated();
      }

    } catch (error) {
      console.error('Error assigning certificate:', error);
      setError('Failed to assign certificate: ' + error.message);
      await logSecurityEvent('certificate_assignment_failed', {
        employee_id: employee.id,
        certificate_id: selectedCertificateId,
        error_message: error.message
      }, 'high');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCertificate = async (certificateAssignment) => {
    if (!confirm(`Remove ${certificateAssignment.hr_certificates.name} certificate from ${employee.full_name}?`)) {
      return;
    }

    // Rate limiting check
    const rateLimitCheck = await checkRateLimit('remove_certificate');
    if (!rateLimitCheck.allowed) {
      setError('Rate limit exceeded. Please wait before removing another certificate.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await logSecurityEvent('certificate_removal_attempt', {
        employee_id: employee.id,
        employee_name: employee.full_name,
        certificate_assignment_id: certificateAssignment.id,
        certificate_name: certificateAssignment.hr_certificates.name
      }, 'medium');

      // Soft delete by setting status to inactive
      const { error: updateError } = await supabase
        .from('employee_certificates')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', certificateAssignment.id);

      if (updateError) throw updateError;

      // Update local state
      setCurrentCertificates(prev => prev.filter(c => c.id !== certificateAssignment.id));
      setSuccess(`${certificateAssignment.hr_certificates.name} certificate removed successfully`);

      // Record action for audit
      await recordAction('remove_employee_certificate', employee.id, true);

      // Notify parent component
      if (onCertificatesUpdated) {
        onCertificatesUpdated();
      }

    } catch (error) {
      console.error('Error removing certificate:', error);
      setError('Failed to remove certificate: ' + error.message);
      await logSecurityEvent('certificate_removal_failed', {
        employee_id: employee.id,
        certificate_assignment_id: certificateAssignment.id,
        error_message: error.message
      }, 'high');
    } finally {
      setSaving(false);
    }
  };

  // Get available certificates that aren't already assigned
  const getAvailableCertificates = () => {
    const assignedCertificateIds = currentCertificates.map(cc => cc.certificate_id);
    return availableCertificates.filter(c => !assignedCertificateIds.includes(c.id));
  };

  const getCertificateStatusColor = (cert) => {
    if (cert.is_expired) return TavariStyles.colors.danger;
    if (cert.expires_soon) return TavariStyles.colors.warning;
    return TavariStyles.colors.success;
  };

  const getCertificateStatusText = (cert) => {
    if (cert.is_expired) return `Expired ${Math.abs(cert.days_until_expiry)} days ago`;
    if (cert.expires_soon) return `Expires in ${cert.days_until_expiry} days`;
    if (cert.days_until_expiry) return `Valid for ${cert.days_until_expiry} days`;
    return 'Valid';
  };

  const styles = {
    overlay: {
      ...TavariStyles.components.modal?.overlay,
      display: isOpen ? 'flex' : 'none'
    },
    modal: {
      ...TavariStyles.components.modal?.content,
      width: '700px',
      maxHeight: '85vh'
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
      maxHeight: '500px',
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
    toggleButton: {
      ...TavariStyles.components.button?.base,
      ...TavariStyles.components.button?.variants?.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs,
      marginBottom: TavariStyles.spacing.lg
    },
    addForm: {
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      marginBottom: TavariStyles.spacing.lg
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    formGroupFull: {
      display: 'flex',
      flexDirection: 'column',
      gridColumn: '1 / -1'
    },
    label: {
      ...TavariStyles.components.form?.label,
      marginBottom: TavariStyles.spacing.sm
    },
    select: {
      ...TavariStyles.components.form?.select,
      width: '100%'
    },
    input: {
      ...TavariStyles.components.form?.input,
      width: '100%'
    },
    textarea: {
      ...TavariStyles.components.form?.input,
      width: '100%',
      minHeight: '80px',
      resize: 'vertical'
    },
    formActions: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      justifyContent: 'flex-end'
    },
    addButton: {
      ...TavariStyles.components.button?.base,
      ...TavariStyles.components.button?.variants?.primary,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    cancelButton: {
      ...TavariStyles.components.button?.base,
      ...TavariStyles.components.button?.variants?.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    certificatesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.md
    },
    certificateItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.sm || '0 1px 3px rgba(0,0,0,0.1)'
    },
    certificateInfo: {
      flex: 1
    },
    certificateName: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },
    certificateDetails: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.sm
    },
    certificateStatus: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      padding: '4px 8px',
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      display: 'inline-block'
    },
    certificateActions: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm,
      alignItems: 'flex-end'
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
            <Award size={24} />
            Manage Certificate Assignments
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

          {/* Add New Certificate */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              <Plus size={20} />
              Assign New Certificate
            </h4>
            
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={styles.toggleButton}
              disabled={saving}
            >
              <Plus size={16} />
              {showAddForm ? 'Cancel' : 'Add Certificate'}
            </button>

            {showAddForm && (
              <div style={styles.addForm}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Certificate Type *</label>
                    <select
                      value={selectedCertificateId}
                      onChange={(e) => setSelectedCertificateId(e.target.value)}
                      style={styles.select}
                      disabled={saving}
                    >
                      <option value="">Choose a certificate...</option>
                      {getAvailableCertificates().map(cert => (
                        <option key={cert.id} value={cert.id}>
                          {cert.name} - {cert.issuing_authority}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Certificate Number</label>
                    <input
                      type="text"
                      value={newCertificateData.certificate_number}
                      onChange={(e) => setNewCertificateData(prev => ({
                        ...prev,
                        certificate_number: e.target.value
                      }))}
                      style={styles.input}
                      placeholder="Enter certificate number"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Issue Date *</label>
                    <input
                      type="date"
                      value={newCertificateData.issue_date}
                      onChange={(e) => setNewCertificateData(prev => ({
                        ...prev,
                        issue_date: e.target.value
                      }))}
                      style={styles.input}
                      disabled={saving}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Expiry Date</label>
                    <input
                      type="date"
                      value={newCertificateData.expiry_date}
                      onChange={(e) => setNewCertificateData(prev => ({
                        ...prev,
                        expiry_date: e.target.value
                      }))}
                      style={styles.input}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div style={styles.formGroupFull}>
                  <label style={styles.label}>Notes</label>
                  <textarea
                    value={newCertificateData.notes}
                    onChange={(e) => setNewCertificateData(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    style={styles.textarea}
                    placeholder="Additional notes about this certificate..."
                    disabled={saving}
                  />
                </div>

                <div style={styles.formActions}>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedCertificateId('');
                      setNewCertificateData({
                        issue_date: '',
                        expiry_date: '',
                        certificate_number: '',
                        document_path: '',
                        notes: ''
                      });
                    }}
                    style={styles.cancelButton}
                    disabled={saving}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleAddCertificate}
                    disabled={!selectedCertificateId || !newCertificateData.issue_date || saving}
                    style={{
                      ...styles.addButton,
                      opacity: (!selectedCertificateId || !newCertificateData.issue_date || saving) ? 0.6 : 1,
                      cursor: (!selectedCertificateId || !newCertificateData.issue_date || saving) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Check size={16} />
                    {saving ? 'Adding...' : 'Add Certificate'}
                  </button>
                </div>
              </div>
            )}

            {!showAddForm && getAvailableCertificates().length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyText}>
                  All available certificates have been assigned to this employee.
                </div>
              </div>
            )}
          </div>

          {/* Current Certificates */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              <Award size={20} />
              Current Certificate Assignments ({currentCertificates.length})
            </h4>

            {loading ? (
              <div style={styles.loading}>Loading current certificates...</div>
            ) : currentCertificates.length === 0 ? (
              <div style={styles.emptyState}>
                <Award size={48} style={styles.emptyIcon} />
                <div style={styles.emptyText}>
                  No certificates currently assigned to this employee.
                </div>
              </div>
            ) : (
              <div style={styles.certificatesList}>
                {currentCertificates.map((cert) => (
                  <div key={cert.id} style={styles.certificateItem}>
                    <div style={styles.certificateInfo}>
                      <div style={styles.certificateName}>
                        {cert.hr_certificates.name}
                      </div>
                      
                      <div style={styles.certificateDetails}>
                        <strong>Issuing Authority:</strong> {cert.hr_certificates.issuing_authority}
                        <br />
                        <strong>Issue Date:</strong> {new Date(cert.issue_date).toLocaleDateString()}
                        {cert.expiry_date && (
                          <>
                            <br />
                            <strong>Expiry Date:</strong> {new Date(cert.expiry_date).toLocaleDateString()}
                          </>
                        )}
                        {cert.certificate_number && (
                          <>
                            <br />
                            <strong>Certificate #:</strong> {cert.certificate_number}
                          </>
                        )}
                        {cert.notes && (
                          <>
                            <br />
                            <strong>Notes:</strong> {cert.notes}
                          </>
                        )}
                      </div>
                      
                      <div 
                        style={{
                          ...styles.certificateStatus,
                          backgroundColor: `${getCertificateStatusColor(cert)}20`,
                          color: getCertificateStatusColor(cert),
                          border: `1px solid ${getCertificateStatusColor(cert)}40`
                        }}
                      >
                        {getCertificateStatusText(cert)}
                      </div>
                    </div>
                    
                    <div style={styles.certificateActions}>
                      <button
                        onClick={() => handleRemoveCertificate(cert)}
                        disabled={saving}
                        style={{
                          ...styles.removeButton,
                          opacity: saving ? 0.6 : 1,
                          cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                        title="Remove certificate"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
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

export default EmployeeCertificateManagementModal;