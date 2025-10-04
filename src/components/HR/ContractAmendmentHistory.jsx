import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const ContractAmendmentHistory = ({ employee, businessId, isOpen, onClose }) => {
  const navigate = useNavigate();

  // Authentication state (inline like TabScreen)
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [amendments, setAmendments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmendment, setSelectedAmendment] = useState(null);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);

  // Authentication setup (copied from TabScreen pattern)
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isOpen) return;

      try {
        console.log('ContractAmendmentHistory: Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          console.error('ContractAmendmentHistory: No valid session');
          setAuthError('Authentication required');
          return;
        }

        setAuthUser(session.user);

        if (!businessId) {
          setAuthError('No business selected');
          return;
        }

        // Verify user has access to this business and get role
        const { data: userRoleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('business_id', businessId)
          .eq('active', true)
          .single();

        if (roleError || !userRoleData) {
          console.error('ContractAmendmentHistory: User not authorized for this business:', roleError);
          setAuthError('Not authorized for this business');
          return;
        }

        setUserRole(userRoleData.role);
        console.log('ContractAmendmentHistory: User role verified:', userRoleData.role);
        setAuthLoading(false);

      } catch (err) {
        console.error('ContractAmendmentHistory: Authentication error:', err);
        setAuthError(err.message);
        setAuthLoading(false);
      }
    };

    if (isOpen) {
      initializeAuth();
    }
  }, [isOpen, businessId]);

  useEffect(() => {
    if (isOpen && employee && !authLoading && authUser) {
      loadAmendments();
    }
  }, [isOpen, employee, businessId, authLoading, authUser]);

  const loadAmendments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: amendmentError } = await supabase
        .from('contract_amendment_history')
        .select('*')
        .eq('business_id', businessId)
        .eq('employee_id', employee.id)
        .order('amendment_number', { ascending: false });

      if (amendmentError) {
        throw amendmentError;
      }

      setAmendments(data || []);
    } catch (err) {
      console.error('Error loading amendments:', err);
      setError('Failed to load amendment history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAmendment = async (amendmentId) => {
    if (!authUser || !['owner', 'manager'].includes(userRole)) {
      setError('You do not have permission to approve amendments');
      return;
    }

    try {
      setApproving(true);
      setError(null);

      const { data, error: approveError } = await supabase.rpc('approve_contract_amendment', {
        p_amendment_id: amendmentId,
        p_approved_by: authUser.id
      });

      if (approveError) {
        throw approveError;
      }

      if (data) {
        // Reload amendments to show updated status
        await loadAmendments();
      } else {
        setError('Failed to approve amendment. Please check the amendment status.');
      }
    } catch (err) {
      console.error('Error approving amendment:', err);
      setError('Failed to approve amendment: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return '#6b7280';
      case 'pending_approval': return '#f59e0b';
      case 'approved': return '#059669';
      case 'signed': return '#3b82f6';
      case 'active': return '#008080';
      case 'superseded': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const formatAmendmentType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([key, val]) => (
        <div key={key} style={styles.valueRow}>
          <span style={styles.valueLabel}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: </span>
          <span style={styles.valueText}>{val}</span>
        </div>
      ));
    }
    return value;
  };

  const canApprove = (amendment) => {
    return authUser && 
           ['owner', 'manager'].includes(userRole) && 
           amendment.status === 'pending_approval' &&
           amendment.created_by !== authUser.id;
  };

  if (!isOpen) return null;

  // Loading and error states (same pattern as TabScreen)
  if (authLoading) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', height: '200px'}}>
            <h3>Loading Amendment History...</h3>
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
          <div>
            <h2 style={styles.modalTitle}>Contract Amendment History</h2>
            <p style={styles.modalSubtitle}>
              {employee?.first_name} {employee?.last_name}
            </p>
          </div>
          <button onClick={onClose} style={styles.modalClose}>×</button>
        </div>

        <div style={styles.modalContent}>
          {error && (
            <div style={styles.errorBanner}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={styles.loading}>
              <div>Loading amendment history...</div>
            </div>
          ) : amendments.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📄</div>
              <div style={styles.emptyTitle}>No amendments found</div>
              <div style={styles.emptyText}>
                No contract amendments have been created for this employee.
              </div>
            </div>
          ) : (
            <div style={styles.amendmentList}>
              {amendments.map((amendment) => (
                <div key={amendment.id} style={styles.amendmentCard}>
                  <div style={styles.amendmentHeader}>
                    <div style={styles.amendmentTitle}>
                      <h3 style={styles.amendmentNumber}>Amendment #{amendment.amendment_number}</h3>
                      <div 
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: `${getStatusColor(amendment.status)}20`,
                          color: getStatusColor(amendment.status),
                          border: `1px solid ${getStatusColor(amendment.status)}40`
                        }}
                      >
                        {amendment.status.replace(/_/g, ' ').toUpperCase()}
                      </div>
                    </div>
                    
                    {canApprove(amendment) && (
                      <button
                        onClick={() => handleApproveAmendment(amendment.id)}
                        disabled={approving}
                        style={{
                          ...styles.approveButton,
                          opacity: approving ? 0.5 : 1
                        }}
                      >
                        {approving ? 'Approving...' : 'Approve'}
                      </button>
                    )}
                  </div>
                  
                  <div style={styles.amendmentDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Type:</span>
                      <span style={styles.detailValue}>{formatAmendmentType(amendment.amendment_type)}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Effective Date:</span>
                      <span style={styles.detailValue}>{new Date(amendment.effective_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {amendment.amendment_reason && (
                    <div style={styles.reasonSection}>
                      <div style={styles.sectionTitle}>Reason:</div>
                      <div style={styles.reasonText}>{amendment.amendment_reason}</div>
                    </div>
                  )}

                  <div style={styles.valuesSection}>
                    <div style={styles.valueColumn}>
                      <div style={styles.sectionTitle}>Previous Value:</div>
                      <div style={styles.valueBox}>
                        {amendment.previous_value ? formatValue(amendment.previous_value) : (
                          <span style={styles.emptyValue}>No previous value recorded</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={styles.valueColumn}>
                      <div style={styles.sectionTitle}>New Value:</div>
                      <div style={styles.valueBox}>
                        {amendment.new_value ? formatValue(amendment.new_value) : (
                          <span style={styles.emptyValue}>No new value recorded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={styles.metaSection}>
                    <div style={styles.metaGrid}>
                      <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>Created by:</span> {amendment.created_by_name}
                        <div style={styles.metaDate}>{new Date(amendment.created_at).toLocaleString()}</div>
                      </div>
                      
                      {amendment.approved_by_name && (
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Approved by:</span> {amendment.approved_by_name}
                          <div style={styles.metaDate}>{new Date(amendment.approved_at).toLocaleString()}</div>
                        </div>
                      )}
                      
                      {amendment.signed_at && (
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Signed:</span>
                          <div style={styles.metaDate}>{new Date(amendment.signed_at).toLocaleString()}</div>
                        </div>
                      )}
                    </div>

                    {amendment.original_contract_file && (
                      <div style={styles.contractFileInfo}>
                        <span style={styles.metaLabel}>Original Contract:</span> {amendment.original_contract_file}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.modalActions}>
            <button
              onClick={onClose}
              style={styles.closeButton}
            >
              Close
            </button>
          </div>
        </div>
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
    maxWidth: '1000px',
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
    alignItems: 'flex-start',
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
  modalSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0'
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
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#374151'
  },
  emptyText: {
    fontSize: '16px'
  },
  amendmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  amendmentCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    border: '2px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  amendmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  amendmentTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  amendmentNumber: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  approveButton: {
    padding: '8px 16px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  amendmentDetails: {
    marginBottom: '15px'
  },
  detailRow: {
    display: 'flex',
    marginBottom: '4px',
    fontSize: '14px'
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#374151',
    minWidth: '120px'
  },
  detailValue: {
    color: '#6b7280'
  },
  reasonSection: {
    marginBottom: '15px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '6px'
  },
  reasonText: {
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  valuesSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px'
  },
  valueColumn: {
    display: 'flex',
    flexDirection: 'column'
  },
  valueBox: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    minHeight: '60px'
  },
  valueRow: {
    fontSize: '14px',
    marginBottom: '4px'
  },
  valueLabel: {
    fontWeight: 'bold',
    color: '#374151'
  },
  valueText: {
    color: '#6b7280'
  },
  emptyValue: {
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  metaSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '15px'
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '10px'
  },
  metaItem: {
    fontSize: '14px'
  },
  metaLabel: {
    fontWeight: 'bold',
    color: '#374151'
  },
  metaDate: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px'
  },
  contractFileInfo: {
    fontSize: '14px',
    color: '#6b7280'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '20px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f8f9fa'
  },
  closeButton: {
    padding: '12px 20px',
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
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

export default ContractAmendmentHistory;