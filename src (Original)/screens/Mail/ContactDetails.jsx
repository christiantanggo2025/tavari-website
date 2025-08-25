// screens/Mail/ContactDetails.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  FiArrowLeft, FiEdit3, FiSave, FiX, FiMail, FiPhone, FiUser, 
  FiTag, FiCalendar, FiUserCheck, FiUserX, FiTrash2, FiRefreshCw
} from 'react-icons/fi';

const ContactDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [errors, setErrors] = useState({});
  const [businessId, setBusinessId] = useState(null);
  const [engagementHistory, setEngagementHistory] = useState([]);

  useEffect(() => {
    getCurrentBusiness();
  }, []);

  useEffect(() => {
    if (businessId && id) {
      loadContact();
      loadEngagementHistory();
    }
  }, [businessId, id]);

  const getCurrentBusiness = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setBusinessId(user.id);
      }
    } catch (error) {
      console.error('Error getting current business:', error);
    }
  };

  const loadContact = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mail_contacts')
        .select('*')
        .eq('id', id)
        .eq('business_id', businessId)
        .single();

      if (error) throw error;

      setContact(data);
      setEditData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        tags: (data.tags || []).join(', '),
        subscribed: data.subscribed
      });
    } catch (error) {
      console.error('Error loading contact:', error);
      if (error.code === 'PGRST116') {
        // Contact not found
        navigate('/dashboard/mail/contacts');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEngagementHistory = async () => {
    try {
      // TODO: Load engagement history when campaign sending is implemented
      // For now, show placeholder data structure
      setEngagementHistory([
        {
          id: '1',
          type: 'campaign_sent',
          campaign_name: 'Summer Special Offer',
          date: '2024-08-10T14:30:00Z',
          status: 'delivered'
        },
        {
          id: '2', 
          type: 'subscription_change',
          action: 'subscribed',
          date: '2024-08-01T10:15:00Z',
          source: 'manual'
        }
      ]);
    } catch (error) {
      console.error('Error loading engagement history:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!editData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!editData.first_name) {
      newErrors.first_name = 'First name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Clean phone number
      const cleanPhone = editData.phone ? editData.phone.replace(/\D/g, '') : '';
      const formattedPhone = cleanPhone.length >= 10 ? 
        (cleanPhone.length === 10 ? 
          `(${cleanPhone.slice(0,3)}) ${cleanPhone.slice(3,6)}-${cleanPhone.slice(6)}` :
          `+1 (${cleanPhone.slice(1,4)}) ${cleanPhone.slice(4,7)}-${cleanPhone.slice(7,11)}`
        ) : editData.phone;

      // Parse tags
      const tags = editData.tags ? 
        editData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
        [];

      const updates = {
        first_name: editData.first_name.trim(),
        last_name: editData.last_name.trim(),
        email: editData.email.toLowerCase().trim(),
        phone: formattedPhone,
        tags,
        subscribed: editData.subscribed,
        updated_at: new Date().toISOString()
      };

      // Handle subscription status change
      if (editData.subscribed !== contact.subscribed) {
        if (editData.subscribed) {
          updates.unsubscribed_at = null;
        } else {
          updates.unsubscribed_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('mail_contacts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log audit event
      await supabase.from('audit_logs').insert({
        business_id: businessId,
        action: 'update_contact',
        details: { 
          contact_id: id,
          changes: Object.keys(updates).filter(key => updates[key] !== contact[key])
        },
        created_at: new Date().toISOString()
      });

      // Reload contact data
      await loadContact();
      setEditing(false);
      setErrors({});
    } catch (error) {
      console.error('Error updating contact:', error);
      setErrors({ submit: 'Failed to update contact. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmMessage = `Delete contact "${contact.first_name} ${contact.last_name}" permanently?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('mail_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit event
      await supabase.from('audit_logs').insert({
        business_id: businessId,
        action: 'delete_contact',
        details: { 
          contact_id: id,
          email: contact.email,
          name: `${contact.first_name} ${contact.last_name}`
        },
        created_at: new Date().toISOString()
      });

      navigate('/dashboard/mail/contacts');
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact. Please try again.');
    }
  };

  const handleSubscriptionToggle = async () => {
    try {
      const newSubscribed = !contact.subscribed;
      const updates = {
        subscribed: newSubscribed,
        updated_at: new Date().toISOString()
      };

      if (newSubscribed) {
        updates.unsubscribed_at = null;
      } else {
        updates.unsubscribed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('mail_contacts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log audit event
      await supabase.from('audit_logs').insert({
        business_id: businessId,
        action: newSubscribed ? 'resubscribe_contact' : 'unsubscribe_contact',
        details: { 
          contact_id: id,
          email: contact.email,
          method: 'manual'
        },
        created_at: new Date().toISOString()
      });

      await loadContact();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription status. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEngagementIcon = (type) => {
    switch (type) {
      case 'campaign_sent':
        return <FiMail style={{ color: 'teal' }} />;
      case 'subscription_change':
        return <FiRefreshCw style={{ color: '#666' }} />;
      default:
        return <FiCalendar style={{ color: '#666' }} />;
    }
  };

  const getEngagementDescription = (item) => {
    switch (item.type) {
      case 'campaign_sent':
        return `Received campaign: ${item.campaign_name}`;
      case 'subscription_change':
        return `${item.action === 'subscribed' ? 'Subscribed' : 'Unsubscribed'} via ${item.source}`;
      default:
        return item.description || 'Activity';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading contact...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div style={styles.container}>
        <div style={styles.notFound}>Contact not found</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button 
            style={styles.backButton}
            onClick={() => navigate('/dashboard/mail/contacts')}
          >
            <FiArrowLeft style={styles.buttonIcon} />
            Back to Contacts
          </button>
          <h1 style={styles.title}>
            {contact.first_name} {contact.last_name}
          </h1>
          <div style={styles.statusBadge}>
            {contact.subscribed ? (
              <>
                <FiUserCheck style={styles.statusIcon} />
                <span>Subscribed</span>
              </>
            ) : (
              <>
                <FiUserX style={styles.statusIcon} />
                <span>Unsubscribed</span>
              </>
            )}
          </div>
        </div>
        
        <div style={styles.headerActions}>
          <button 
            style={styles.subscriptionButton}
            onClick={handleSubscriptionToggle}
          >
            {contact.subscribed ? <FiUserX /> : <FiUserCheck />}
            {contact.subscribed ? 'Unsubscribe' : 'Resubscribe'}
          </button>
          {!editing ? (
            <button 
              style={styles.editButton}
              onClick={() => setEditing(true)}
            >
              <FiEdit3 style={styles.buttonIcon} />
              Edit Contact
            </button>
          ) : (
            <div style={styles.editActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => {
                  setEditing(false);
                  setErrors({});
                  // Reset edit data
                  setEditData({
                    first_name: contact.first_name || '',
                    last_name: contact.last_name || '',
                    email: contact.email || '',
                    phone: contact.phone || '',
                    tags: (contact.tags || []).join(', '),
                    subscribed: contact.subscribed
                  });
                }}
                disabled={saving}
              >
                <FiX style={styles.buttonIcon} />
                Cancel
              </button>
              <button 
                style={styles.saveButton}
                onClick={handleSave}
                disabled={saving}
              >
                <FiSave style={styles.buttonIcon} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div style={styles.content}>
        <div style={styles.mainSection}>
          <div style={styles.contactCard}>
            <h2 style={styles.sectionTitle}>Contact Information</h2>
            
            {editing ? (
              <div style={styles.editForm}>
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
                      value={editData.first_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
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
                      value={editData.last_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiMail style={styles.labelIcon} />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    style={{
                      ...styles.input,
                      ...(errors.email ? styles.inputError : {})
                    }}
                    value={editData.email}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  />
                  {errors.email && <span style={styles.errorText}>{errors.email}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiPhone style={styles.labelIcon} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={editData.phone}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
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
                    value={editData.tags}
                    onChange={(e) => setEditData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="customer, birthday-party, vip"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editData.subscribed}
                      onChange={(e) => setEditData(prev => ({ ...prev, subscribed: e.target.checked }))}
                      style={styles.checkbox}
                    />
                    Subscribed to emails
                  </label>
                </div>

                {errors.submit && (
                  <div style={styles.errorMessage}>
                    {errors.submit}
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.contactInfo}>
                <div style={styles.infoRow}>
                  <FiMail style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Email:</span>
                  <span style={styles.infoValue}>{contact.email}</span>
                </div>

                {contact.phone && (
                  <div style={styles.infoRow}>
                    <FiPhone style={styles.infoIcon} />
                    <span style={styles.infoLabel}>Phone:</span>
                    <span style={styles.infoValue}>{contact.phone}</span>
                  </div>
                )}

                <div style={styles.infoRow}>
                  <FiTag style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Tags:</span>
                  <div style={styles.tags}>
                    {(contact.tags || []).length > 0 ? 
                      contact.tags.map(tag => (
                        <span key={tag} style={styles.tag}>{tag}</span>
                      )) : 
                      <span style={styles.noTags}>No tags</span>
                    }
                  </div>
                </div>

                <div style={styles.infoRow}>
                  <FiCalendar style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Added:</span>
                  <span style={styles.infoValue}>{formatDate(contact.created_at)}</span>
                </div>

                <div style={styles.infoRow}>
                  <FiRefreshCw style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Last Updated:</span>
                  <span style={styles.infoValue}>{formatDate(contact.updated_at)}</span>
                </div>

                <div style={styles.infoRow}>
                  <FiUser style={styles.infoIcon} />
                  <span style={styles.infoLabel}>Source:</span>
                  <span style={styles.infoValue}>{contact.source}</span>
                </div>

                {contact.unsubscribed_at && (
                  <div style={styles.infoRow}>
                    <FiUserX style={styles.infoIcon} />
                    <span style={styles.infoLabel}>Unsubscribed:</span>
                    <span style={styles.infoValue}>{formatDate(contact.unsubscribed_at)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Engagement History */}
          <div style={styles.historyCard}>
            <h2 style={styles.sectionTitle}>Engagement History</h2>
            {engagementHistory.length > 0 ? (
              <div style={styles.historyList}>
                {engagementHistory.map(item => (
                  <div key={item.id} style={styles.historyItem}>
                    <div style={styles.historyIcon}>
                      {getEngagementIcon(item.type)}
                    </div>
                    <div style={styles.historyContent}>
                      <div style={styles.historyDescription}>
                        {getEngagementDescription(item)}
                      </div>
                      <div style={styles.historyDate}>
                        {formatDate(item.date)}
                      </div>
                    </div>
                    {item.status && (
                      <div style={styles.historyStatus}>
                        {item.status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.noHistory}>
                <p>No engagement history yet.</p>
                <p style={styles.noHistorySubtext}>
                  Engagement history will appear here when this contact receives campaigns or makes subscription changes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div style={styles.dangerZone}>
          <h3 style={styles.dangerTitle}>Danger Zone</h3>
          <div style={styles.dangerActions}>
            <button 
              style={styles.deleteButton}
              onClick={handleDelete}
            >
              <FiTrash2 style={styles.buttonIcon} />
              Delete Contact
            </button>
          </div>
          <p style={styles.dangerText}>
            This action cannot be undone. The contact will be permanently removed from your database.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    minHeight: '100vh',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
  },
  notFound: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerLeft: {
    flex: 1,
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'teal',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
  },
  statusIcon: {
    fontSize: '16px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  subscriptionButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editButton: {
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
  editActions: {
    display: 'flex',
    gap: '8px',
  },
  cancelButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  saveButton: {
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
  content: {
    display: 'grid',
    gap: '30px',
  },
  mainSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
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
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#f44336',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  errorText: {
    fontSize: '12px',
    color: '#f44336',
    marginTop: '5px',
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  infoIcon: {
    fontSize: '16px',
    color: 'teal',
    width: '20px',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    minWidth: '100px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#333',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tag: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  noTags: {
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
  },
  historyIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
  },
  historyDate: {
    fontSize: '12px',
    color: '#666',
  },
  historyStatus: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#4caf50',
    textTransform: 'uppercase',
  },
  noHistory: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
  },
  noHistorySubtext: {
    fontSize: '14px',
    marginTop: '10px',
    color: '#999',
  },
  dangerZone: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #f44336',
    padding: '20px',
  },
  dangerTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: '15px',
  },
  dangerActions: {
    marginBottom: '10px',
  },
  deleteButton: {
    backgroundColor: '#f44336',
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
  dangerText: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
};

export default ContactDetails;