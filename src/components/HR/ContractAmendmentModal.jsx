import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const ContractAmendmentModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  originalContract, 
  businessId 
}) => {
  const navigate = useNavigate();

  // Authentication state (inline like TabScreen)
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [formData, setFormData] = useState({
    amendmentType: '',
    amendmentReason: '',
    effectiveDate: '',
    previousValue: {},
    newValue: {}
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Amendment type options
  const amendmentTypes = [
    { value: 'wage_change', label: 'Wage Change' },
    { value: 'position_change', label: 'Position Change' },
    { value: 'terms_modification', label: 'Terms Modification' },
    { value: 'schedule_change', label: 'Schedule Change' },
    { value: 'benefits_change', label: 'Benefits Change' },
    { value: 'other', label: 'Other' }
  ];

  // Authentication setup (copied from TabScreen pattern)
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isOpen) return;

      try {
        console.log('ContractAmendmentModal: Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          console.error('ContractAmendmentModal: No valid session');
          setAuthError('Authentication required');
          return;
        }

        setAuthUser(session.user);

        if (!businessId) {
          setAuthError('No business selected');
          return;
        }

        // Verify user has access to this business
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('business_id', businessId)
          .eq('active', true)
          .single();

        if (roleError || !userRole) {
          console.error('ContractAmendmentModal: User not authorized for this business:', roleError);
          setAuthError('Not authorized for this business');
          return;
        }

        console.log('ContractAmendmentModal: User role verified:', userRole.role);
        setAuthLoading(false);

      } catch (err) {
        console.error('ContractAmendmentModal: Authentication error:', err);
        setAuthError(err.message);
        setAuthLoading(false);
      }
    };

    if (isOpen) {
      initializeAuth();
      resetForm();
    }
  }, [isOpen, businessId]);

  const resetForm = () => {
    setFormData({
      amendmentType: '',
      amendmentReason: '',
      effectiveDate: '',
      previousValue: {},
      newValue: {}
    });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleValueChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amendmentType) {
      newErrors.amendmentType = 'Amendment type is required';
    }

    if (!formData.amendmentReason?.trim()) {
      newErrors.amendmentReason = 'Amendment reason is required';
    }

    if (!formData.effectiveDate) {
      newErrors.effectiveDate = 'Effective date is required';
    }

    // Validate that effective date is not in the past
    const effectiveDate = new Date(formData.effectiveDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (effectiveDate < today) {
      newErrors.effectiveDate = 'Effective date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call the database function to create amendment
      const { data, error } = await supabase.rpc('create_contract_amendment_version', {
        p_business_id: businessId,
        p_employee_id: employee.id,
        p_original_contract_file_id: originalContract?.id || null,
        p_amendment_type: formData.amendmentType,
        p_amendment_reason: formData.amendmentReason,
        p_previous_value: formData.previousValue,
        p_new_value: formData.newValue,
        p_effective_date: formData.effectiveDate,
        p_created_by: authUser.id
      });

      if (error) {
        throw error;
      }

      console.log('Amendment created successfully:', data);
      
      // Close modal and refresh parent component
      onClose();
      
    } catch (error) {
      console.error('Error creating contract amendment:', error);
      setErrors({ submit: 'Failed to create contract amendment. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderAmendmentFields = () => {
    switch (formData.amendmentType) {
      case 'wage_change':
        return (
          <div style={styles.fieldGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Previous Wage</label>
              <input
                type="number"
                step="0.01"
                style={styles.formInput}
                value={formData.previousValue.wage || ''}
                onChange={(e) => handleValueChange('previousValue', 'wage', parseFloat(e.target.value) || 0)}
                placeholder="Current wage"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>New Wage</label>
              <input
                type="number"
                step="0.01"
                style={styles.formInput}
                value={formData.newValue.wage || ''}
                onChange={(e) => handleValueChange('newValue', 'wage', parseFloat(e.target.value) || 0)}
                placeholder="New wage"
              />
            </div>
          </div>
        );
        
      case 'position_change':
        return (
          <div style={styles.fieldGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Previous Position</label>
              <input
                type="text"
                style={styles.formInput}
                value={formData.previousValue.position || ''}
                onChange={(e) => handleValueChange('previousValue', 'position', e.target.value)}
                placeholder="Current position"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>New Position</label>
              <input
                type="text"
                style={styles.formInput}
                value={formData.newValue.position || ''}
                onChange={(e) => handleValueChange('newValue', 'position', e.target.value)}
                placeholder="New position"
              />
            </div>
          </div>
        );
        
      case 'schedule_change':
        return (
          <div style={styles.fieldGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Previous Schedule</label>
              <textarea
                style={styles.formTextarea}
                rows="3"
                value={formData.previousValue.schedule || ''}
                onChange={(e) => handleValueChange('previousValue', 'schedule', e.target.value)}
                placeholder="Current schedule details"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>New Schedule</label>
              <textarea
                style={styles.formTextarea}
                rows="3"
                value={formData.newValue.schedule || ''}
                onChange={(e) => handleValueChange('newValue', 'schedule', e.target.value)}
                placeholder="New schedule details"
              />
            </div>
          </div>
        );
        
      default:
        return (
          <div style={styles.fieldGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Previous Value</label>
              <textarea
                style={styles.formTextarea}
                rows="3"
                value={formData.previousValue.details || ''}
                onChange={(e) => handleValueChange('previousValue', 'details', e.target.value)}
                placeholder="Current details"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>New Value</label>
              <textarea
                style={styles.formTextarea}
                rows="3"
                value={formData.newValue.details || ''}
                onChange={(e) => handleValueChange('newValue', 'details', e.target.value)}
                placeholder="New details"
              />
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  // Loading and error states (same pattern as TabScreen)
  if (authLoading) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', height: '200px'}}>
            <h3>Loading Amendment Form...</h3>
            <p>Authenticating user and loading business data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', height: '200px'}}>
            <h3>Authentication Error</h3>
            <p>{authError}</p>
            <button 
              style={styles.createButton}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Create Contract Amendment</h2>
          <button onClick={onClose} style={styles.modalClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.modalContent}>
          {/* Employee Info */}
          <div style={styles.employeeInfo}>
            <h3 style={styles.sectionTitle}>Employee Information</h3>
            <p style={styles.employeeDetails}>
              {employee?.first_name} {employee?.last_name} - {employee?.position}
            </p>
            {originalContract && (
              <p style={styles.contractDetails}>
                Original Contract: {originalContract.file_name}
              </p>
            )}
          </div>

          {/* Amendment Type */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Amendment Type *</label>
            <select
              style={{
                ...styles.formSelect,
                borderColor: errors.amendmentType ? '#dc2626' : '#008080'
              }}
              value={formData.amendmentType}
              onChange={(e) => handleInputChange('amendmentType', e.target.value)}
            >
              <option value="">Select amendment type</option>
              {amendmentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.amendmentType && (
              <div style={styles.errorMessage}>{errors.amendmentType}</div>
            )}
          </div>

          {/* Amendment Fields */}
          {formData.amendmentType && (
            <div style={styles.formGroup}>
              <label style={styles.sectionTitle}>Amendment Details</label>
              {renderAmendmentFields()}
            </div>
          )}

          {/* Effective Date */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Effective Date *</label>
            <input
              type="date"
              style={{
                ...styles.formInput,
                borderColor: errors.effectiveDate ? '#dc2626' : '#008080'
              }}
              value={formData.effectiveDate}
              onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
            />
            {errors.effectiveDate && (
              <div style={styles.errorMessage}>{errors.effectiveDate}</div>
            )}
          </div>

          {/* Amendment Reason */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Reason for Amendment *</label>
            <textarea
              style={{
                ...styles.formTextarea,
                borderColor: errors.amendmentReason ? '#dc2626' : '#008080'
              }}
              rows="3"
              value={formData.amendmentReason}
              onChange={(e) => handleInputChange('amendmentReason', e.target.value)}
              placeholder="Explain the reason for this amendment..."
            />
            {errors.amendmentReason && (
              <div style={styles.errorMessage}>{errors.amendmentReason}</div>
            )}
          </div>

          {errors.submit && (
            <div style={styles.errorBanner}>
              {errors.submit}
            </div>
          )}

          {/* Form Actions */}
          <div style={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.createButton,
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Amendment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f8f9fa'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  modalContent: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  container: {
    display: 'flex',
    flexDirection: 'column'
  },
  employeeInfo: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
    margin: 0
  },
  employeeDetails: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0'
  },
  contractDetails: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0',
    fontStyle: 'italic'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '6px'
  },
  formInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  formSelect: {
    width: '100%',
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  formTextarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px',
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginTop: '10px'
  },
  errorMessage: {
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '4px'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '15px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    padding: '12px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  createButton: {
    padding: '12px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default ContractAmendmentModal;