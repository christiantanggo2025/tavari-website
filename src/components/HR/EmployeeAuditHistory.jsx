// components/HR/EmployeeAuditHistory.jsx
import React, { useState, useEffect } from 'react';
import { Eye, Clock, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const EmployeeAuditHistory = ({ 
  employee, 
  userContext, 
  isOpen, 
  onClose 
}) => {
  const [auditHistory, setAuditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const itemsPerPage = 20;

  useEffect(() => {
    if (isOpen && employee?.id && userContext?.businessId) {
      loadAuditHistory();
    }
  }, [isOpen, employee?.id, userContext?.businessId, currentPage]);

  const loadAuditHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (currentPage - 1) * itemsPerPage;

      const { data, error: auditError } = await supabase.rpc(
        'get_employee_audit_history',
        {
          p_business_id: userContext.businessId,
          p_user_id: employee.id,
          p_limit: itemsPerPage,
          p_offset: offset
        }
      );

      if (auditError) {
        throw auditError;
      }

      if (currentPage === 1) {
        setAuditHistory(data || []);
      } else {
        setAuditHistory(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === itemsPerPage);
    } catch (error) {
      console.error('Error loading audit history:', error);
      setError('Failed to load audit history');
      setAuditHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const formatValue = (fieldName, value) => {
    if (!value || value === 'null') return 'Not set';
    
    switch (fieldName.toLowerCase()) {
      case 'wage':
        return `$${parseFloat(value).toFixed(2)}/hr`;
      case 'hire_date':
      case 'termination_date':
      case 'date_of_birth':
        return new Date(value).toLocaleDateString();
      case 'manager_id':
        return value === 'null' ? 'No manager' : `Manager ID: ${value}`;
      case 'employment_status':
        return value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ');
      default:
        return value;
    }
  };

  const getChangeIcon = (fieldName) => {
    switch (fieldName.toLowerCase()) {
      case 'wage':
        return '💰';
      case 'position':
        return '👔';
      case 'department':
        return '🏢';
      case 'employment_status':
        return '📊';
      case 'manager_id':
        return '👥';
      case 'hire_date':
        return '📅';
      case 'termination_date':
        return '🔚';
      case 'first_name':
      case 'last_name':
        return '👤';
      case 'email':
        return '📧';
      case 'phone':
        return '📞';
      default:
        return '📝';
    }
  };

  const getChangeTypeColor = (fieldName) => {
    switch (fieldName.toLowerCase()) {
      case 'wage':
        return '#059669'; // Green
      case 'employment_status':
        return '#3b82f6'; // Blue
      case 'termination_date':
        return '#dc2626'; // Red
      case 'position':
      case 'department':
        return '#7c3aed'; // Purple
      case 'hire_date':
        return '#059669'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };

  // Permission check - simplified
  const canViewAuditHistory = ['owner', 'manager', 'admin'].includes(userContext?.role);

  if (!isOpen) return null;

  if (!canViewAuditHistory) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modalSmall}>
          <h3 style={styles.errorTitle}>Access Denied</h3>
          <p style={styles.errorText}>
            You do not have permission to view audit history.
          </p>
          <button onClick={onClose} style={styles.closeButton}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (loading && auditHistory.length === 0) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <span style={styles.loadingText}>Loading audit history...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Employee Change History</h2>
            <p style={styles.subtitle}>
              {employee.first_name} {employee.last_name} 
              {employee.employee_number && ` (#${employee.employee_number})`}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeIcon}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {error && (
            <div style={styles.errorBanner}>
              {error}
            </div>
          )}

          {auditHistory.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <Clock size={48} />
              </div>
              <h3 style={styles.emptyTitle}>No Change History</h3>
              <p style={styles.emptyText}>
                No changes have been recorded for this employee yet.
              </p>
            </div>
          ) : (
            <div style={styles.historyList}>
              {auditHistory.map((record) => (
                <div key={record.id} style={styles.historyItem}>
                  <div style={styles.changeIcon}>
                    <span style={styles.iconText}>
                      {getChangeIcon(record.field_display_name)}
                    </span>
                  </div>
                  
                  <div style={styles.changeContent}>
                    <div style={styles.changeHeader}>
                      <h4 style={{
                        ...styles.changeTitle,
                        color: getChangeTypeColor(record.field_display_name)
                      }}>
                        {record.field_display_name} Changed
                      </h4>
                      <div style={styles.changeTime}>
                        {new Date(record.created_at).toLocaleDateString()} at{' '}
                        {new Date(record.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    
                    <div style={styles.changeDetails}>
                      <div style={styles.valueRow}>
                        <div style={styles.valueContainer}>
                          <span style={styles.valueLabel}>From</span>
                          <div style={styles.oldValue}>
                            {formatValue(record.field_display_name, record.old_value)}
                          </div>
                        </div>
                        <div style={styles.arrow}>→</div>
                        <div style={styles.valueContainer}>
                          <span style={styles.valueLabel}>To</span>
                          <div style={styles.newValue}>
                            {formatValue(record.field_display_name, record.new_value)}
                          </div>
                        </div>
                      </div>

                      {record.change_reason && (
                        <div style={styles.reasonContainer}>
                          <span style={styles.reasonLabel}>Reason</span>
                          <p style={styles.reasonText}>{record.change_reason}</p>
                        </div>
                      )}

                      <div style={styles.changedBy}>
                        Changed by: {record.changed_by_name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div style={styles.loadMoreContainer}>
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    style={{
                      ...styles.loadMoreButton,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? (
                      <>
                        <div style={styles.smallSpinner}></div>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.footerButton}>
            Close
          </button>
        </div>
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
    zIndex: 50,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  modalSmall: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 16px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0'
  },
  closeIcon: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
    color: '#d1d5db'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0'
  },
  emptyText: {
    fontSize: '14px',
    margin: 0
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  changeIcon: {
    flexShrink: 0,
    width: '40px',
    height: '40px',
    backgroundColor: '#f9fafb',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px'
  },
  iconText: {
    fontSize: '18px'
  },
  changeContent: {
    flex: 1,
    minWidth: 0
  },
  changeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px'
  },
  changeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0
  },
  changeTime: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'right',
    flexShrink: 0
  },
  changeDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  valueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  valueContainer: {
    flex: 1,
    minWidth: '150px'
  },
  valueLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '4px'
  },
  oldValue: {
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#111827'
  },
  newValue: {
    padding: '8px 12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#111827'
  },
  arrow: {
    fontSize: '18px',
    color: '#6b7280',
    flexShrink: 0
  },
  reasonContainer: {
    marginTop: '8px'
  },
  reasonLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '4px'
  },
  reasonText: {
    fontSize: '14px',
    color: '#374151',
    fontStyle: 'italic',
    margin: 0
  },
  changedBy: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '8px'
  },
  loadMoreContainer: {
    textAlign: 'center',
    paddingTop: '16px'
  },
  loadMoreButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  footerButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px'
  },
  loadingText: {
    marginLeft: '12px',
    color: '#6b7280'
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #f3f4f6',
    borderTop: '2px solid #14B8A6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #f3f4f6',
    borderTop: '2px solid #14B8A6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorTitle: {
    color: '#dc2626',
    margin: '0 0 16px 0'
  },
  errorText: {
    color: '#6b7280',
    margin: '0 0 20px 0'
  },
  closeButton: {
    padding: '8px 16px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};

// Add CSS animation if not already added
if (!document.head.querySelector('style[data-component="EmployeeAuditHistory"]')) {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.setAttribute('data-component', 'EmployeeAuditHistory');
  styleSheet.innerText = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default EmployeeAuditHistory;