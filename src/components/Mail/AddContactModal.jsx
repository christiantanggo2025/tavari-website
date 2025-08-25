// components/Mail/AddContactModal.jsx
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { FiX, FiUser, FiMail, FiPhone, FiTag, FiSave, FiUserPlus } from 'react-icons/fi';

const AddContactModal = ({ isOpen, onClose, onContactAdded, businessId }) => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    tags: '',
    source: 'manual'
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Name validation (at least first name required)
    if (!formData.first_name) {
      newErrors.first_name = 'First name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForDuplicate = async (email) => {
    try {
      const { data, error } = await supabase
        .from('mail_contacts')
        .select('id, first_name, last_name, email, subscribed')
        .eq('business_id', businessId)
        .eq('email', email.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error checking for duplicate:', error);
      return null;
    }
  };

  const handleInputChange = async (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Check for duplicates when email changes
    if (field === 'email' && value) {
      const duplicate = await checkForDuplicate(value);
      if (duplicate) {
        setDuplicateWarning({
          ...duplicate,
          message: `Contact already exists: ${duplicate.first_name} ${duplicate.last_name}`
        });
      } else {
        setDuplicateWarning(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!businessId) {
      setErrors({ submit: 'No business selected. Please select a business from the header.' });
      return;
    }
    
    setSaving(true);
    try {
      console.log('Adding contact to business:', businessId);

      // Clean phone number
      const cleanPhone = formData.phone ? formData.phone.replace(/\D/g, '') : '';
      const formattedPhone = cleanPhone.length >= 10 ? 
        (cleanPhone.length === 10 ? 
          `(${cleanPhone.slice(0,3)}) ${cleanPhone.slice(3,6)}-${cleanPhone.slice(6)}` :
          `+1 (${cleanPhone.slice(1,4)}) ${cleanPhone.slice(4,7)}-${cleanPhone.slice(7,11)}`
        ) : formData.phone;

      // Parse tags
      const tags = formData.tags ? 
        formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
        [];

      // Try direct insert first (simpler than using the function)
      const contactData = {
        business_id: businessId, // Use the business ID from context
        email: formData.email.toLowerCase(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formattedPhone,
        tags: tags,
        source: formData.source,
        subscribed: true
      };

      console.log('Inserting contact data:', contactData);

      const { data, error } = await supabase
        .from('mail_contacts')
        .insert(contactData)
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Contact created successfully:', data);

      // Log audit event
      try {
        await supabase.from('audit_logs').insert({
          business_id: businessId,
          action: 'add_contact_manual',
          details: { 
            contact_id: data.id,
            email: formData.email,
            was_duplicate: !!duplicateWarning
          },
          created_at: new Date().toISOString()
        });
      } catch (auditError) {
        console.warn('Audit log failed (non-critical):', auditError);
      }

      // Reset form
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        tags: '',
        source: 'manual'
      });
      setDuplicateWarning(null);
      setErrors({});

      // Notify parent component
      if (onContactAdded) {
        onContactAdded(data.id);
      }

      onClose();
    } catch (error) {
      console.error('Error adding contact:', error);
      
      // Handle specific duplicate email error
      if (error.code === '23505' && error.message.includes('mail_contacts_business_id_email_key')) {
        setErrors({ submit: 'This email address already exists in your contacts. Please use a different email or update the existing contact.' });
      } else {
        setErrors({ submit: `Failed to add contact: ${error.message}` });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExisting = async () => {
    if (!duplicateWarning) return;

    setSaving(true);
    try {
      const updates = {};
      if (formData.first_name && !duplicateWarning.first_name) {
        updates.first_name = formData.first_name.trim();
      }
      if (formData.last_name && !duplicateWarning.last_name) {
        updates.last_name = formData.last_name.trim();
      }
      if (formData.phone) {
        const cleanPhone = formData.phone.replace(/\D/g, '');
        updates.phone = cleanPhone.length >= 10 ? 
          (cleanPhone.length === 10 ? 
            `(${cleanPhone.slice(0,3)}) ${cleanPhone.slice(3,6)}-${cleanPhone.slice(6)}` :
            `+1 (${cleanPhone.slice(1,4)}) ${cleanPhone.slice(4,7)}-${cleanPhone.slice(7,11)}`
          ) : formData.phone;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        
        const { error } = await supabase
          .from('mail_contacts')
          .update(updates)
          .eq('id', duplicateWarning.id);

        if (error) throw error;
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        business_id: businessId,
        action: 'update_existing_contact',
        details: { 
          contact_id: duplicateWarning.id,
          updates: Object.keys(updates)
        },
        created_at: new Date().toISOString()
      });

      if (onContactAdded) {
        onContactAdded(duplicateWarning.id);
      }

      onClose();
    } catch (error) {
      console.error('Error updating contact:', error);
      setErrors({ submit: 'Failed to update contact. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Add New Contact</h2>
          <button style={styles.closeButton} onClick={onClose}>
            <FiX />
          </button>
        </div>

        {duplicateWarning && (
          <div style={styles.duplicateWarning}>
            <div style={styles.warningHeader}>
              <FiUserPlus style={styles.warningIcon} />
              <span style={styles.warningTitle}>Contact Already Exists</span>
            </div>
            <p style={styles.warningMessage}>{duplicateWarning.message}</p>
            <p style={styles.warningSubtext}>
              Status: {duplicateWarning.subscribed ? 'Subscribed' : 'Unsubscribed'}
            </p>
            <div style={styles.warningActions}>
              <button 
                style={styles.updateButton}
                onClick={handleUpdateExisting}
                disabled={saving}
              >
                Update Existing Contact
              </button>
              <button 
                style={styles.cancelButton}
                onClick={() => setDuplicateWarning(null)}
              >
                Continue Adding New
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FiMail style={styles.labelIcon} />
              Email Address *
            </label>
            <input
              type="email"
              style={{
                ...styles.input,
                ...(errors.email ? styles.inputError : {}),
                ...(duplicateWarning ? styles.inputWarning : {})
              }}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john@example.com"
              required
            />
            {errors.email && <span style={styles.errorText}>{errors.email}</span>}
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiUser style={styles.labelIcon} />
                First Name *
              </label>
              <input
                type="text"
                style={{
                  ...styles.input,
                  ...(errors.first_name ? styles.inputError : {})
                }}
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="John"
                required
              />
              {errors.first_name && <span style={styles.errorText}>{errors.first_name}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiUser style={styles.labelIcon} />
                Last Name
              </label>
              <input
                type="text"
                style={styles.input}
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FiPhone style={styles.labelIcon} />
              Phone Number
            </label>
            <input
              type="tel"
              style={styles.input}
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FiTag style={styles.labelIcon} />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              style={styles.input}
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="customer, birthday-party, vip"
            />
            <span style={styles.helpText}>
              Use tags to organize contacts (e.g., "customer", "birthday-party", "vip")
            </span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Source</label>
            <select
              style={styles.select}
              value={formData.source}
              onChange={(e) => handleInputChange('source', e.target.value)}
            >
              <option value="manual">Manual Entry</option>
              <option value="pos">POS System</option>
              <option value="booking">Booking System</option>
              <option value="waiver">Waiver System</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </div>

          {errors.submit && (
            <div style={styles.errorMessage}>
              {errors.submit}
            </div>
          )}

          <div style={styles.formActions}>
            <button 
              type="button" 
              style={styles.cancelFormButton}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={styles.submitButton}
              disabled={saving || !!duplicateWarning}
            >
              <FiSave style={styles.buttonIcon} />
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 0 20px',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '5px',
  },
  duplicateWarning: {
    backgroundColor: '#fff8e1',
    border: '1px solid #ffb74d',
    borderRadius: '6px',
    padding: '15px',
    margin: '0 20px 20px 20px',
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  warningIcon: {
    color: '#f57c00',
    fontSize: '16px',
  },
  warningTitle: {
    fontWeight: 'bold',
    color: '#f57c00',
  },
  warningMessage: {
    margin: '0 0 5px 0',
    color: '#333',
  },
  warningSubtext: {
    margin: '0 0 15px 0',
    fontSize: '14px',
    color: '#666',
  },
  warningActions: {
    display: 'flex',
    gap: '10px',
  },
  updateButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: 'white',
    color: '#f57c00',
    border: '1px solid #f57c00',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  form: {
    padding: '0 20px 20px 20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  labelIcon: {
    fontSize: '16px',
    color: 'teal',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  inputError: {
    borderColor: '#f44336',
  },
  inputWarning: {
    borderColor: '#ff9800',
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
  },
  helpText: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
    display: 'block',
  },
  errorText: {
    fontSize: '12px',
    color: '#f44336',
    marginTop: '5px',
    display: 'block',
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '20px',
    borderTop: '1px solid #f0f0f0',
  },
  cancelFormButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  submitButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonIcon: {
    fontSize: '14px',
  },
};

export default AddContactModal;