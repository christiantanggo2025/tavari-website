// components/HR/EmployeeWageHistory.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { hasHRPermission, HR_PERMISSIONS, canViewEmployeeWage } from '../../utils/hrPermissions';
import { handleHRError, useHRError } from '../../utils/hrErrorHandling';

const EmployeeWageHistory = ({ 
  employee, 
  userContext, 
  isOpen, 
  onClose, 
  onWageChanged 
}) => {
  const [wageHistory, setWageHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddWage, setShowAddWage] = useState(false);
  const [newWage, setNewWage] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { handleError } = useHRError(userContext);

  // Initialize
  useEffect(() => {
    if (isOpen && employee) {
      loadWageHistory();
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setNewWage('');
      setReason('');
      setNotes('');
      setErrors({});
      setShowAddWage(false);
    }
  }, [isOpen, employee]);

  // Load wage change history from audit logs
  const loadWageHistory = async () => {
    try {
      setLoading(true);

      // Query audit logs for wage changes
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select(`
          id,
          event_type,
          details,
          timestamp,
          user_id,
          users(first_name, last_name, full_name)
        `)
        .eq('business_id', userContext.businessId)
        .eq('details->>employee_id', employee.id)
        .eq('event_type', 'wage_change')
        .order('timestamp', { ascending: false });

      if (auditError) throw auditError;

      // Also get the current wage as the most recent entry if no history exists
      let history = auditData?.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        changedBy: log.users 
          ? `${log.users.first_name} ${log.users.last_name}` || log.users.full_name
          : 'System',
        ...log.details
      })) || [];

      // Add current wage as latest entry if we have wage history
      if (employee.wage && history.length === 0) {
        history.unshift({
          id: 'current',
          timestamp: employee.updated_at || employee.created_at,
          changedBy: 'Initial Setup',
          previous_wage: null,
          new_wage: parseFloat(employee.wage),
          effective_date: employee.hire_date || employee.start_date || employee.created_at?.split('T')[0],
          reason: 'Initial wage setup',
          is_current: true
        });
      }

      // Calculate wage statistics
      const wageStats = calculateWageStats(history);
      
      setWageHistory({ records: history, stats: wageStats });

    } catch (error) {
      handleError(error, {
        operation: 'load_wage_history',
        employeeId: employee.id
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate wage statistics
  const calculateWageStats = (records) => {
    if (records.length === 0) return null;

    const wages = records
      .filter(r => r.new_wage !== null && r.new_wage !== undefined)
      .map(r => parseFloat(r.new_wage));

    if (wages.length === 0) return null;

    const currentWage = wages[0]; // Most recent wage
    const firstWage = wages[wages.length - 1]; // Earliest wage
    const totalIncrease = currentWage - firstWage;
    const percentIncrease = firstWage > 0 ? ((totalIncrease / firstWage) * 100) : 0;
    
    // Calculate raises (positive changes only)
    const raises = records.filter(r => 
      r.previous_wage !== null && 
      r.new_wage > r.previous_wage
    );
    
    const avgRaiseAmount = raises.length > 0 
      ? raises.reduce((sum, r) => sum + (r.new_wage - r.previous_wage), 0) / raises.length
      : 0;

    // Time between raises
    const raiseDates = raises.map(r => new Date(r.effective_date || r.timestamp));
    let avgMonthsBetweenRaises = 0;
    
    if (raiseDates.length > 1) {
      const intervals = [];
      for (let i = 0; i < raiseDates.length - 1; i++) {
        const months = (raiseDates[i] - raiseDates[i + 1]) / (1000 * 60 * 60 * 24 * 30.44);
        intervals.push(months);
      }
      avgMonthsBetweenRaises = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    return {
      currentWage,
      firstWage,
      totalIncrease,
      percentIncrease,
      numberOfRaises: raises.length,
      avgRaiseAmount,
      avgMonthsBetweenRaises,
      highestWage: Math.max(...wages),
      lowestWage: Math.min(...wages)
    };
  };

  // Validate wage form
  const validateWageForm = () => {
    const newErrors = {};

    if (!newWage || isNaN(newWage) || parseFloat(newWage) <= 0) {
      newErrors.newWage = 'Please enter a valid wage amount';
    }

    if (!effectiveDate) {
      newErrors.effectiveDate = 'Effective date is required';
    } else {
      const effectiveDateTime = new Date(effectiveDate);
      const today = new Date();
      
      if (effectiveDateTime > new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)) {
        newErrors.effectiveDate = 'Effective date cannot be more than 1 year in the future';
      }
    }

    if (!reason.trim()) {
      newErrors.reason = 'Reason for wage change is required';
    }

    // Business validation
    const currentWageValue = parseFloat(employee.wage || 0);
    const newWageValue = parseFloat(newWage || 0);
    
    if (newWageValue === currentWageValue) {
      newErrors.newWage = 'New wage must be different from current wage';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add new wage change
  const handleAddWageChange = async (e) => {
    e.preventDefault();

    if (!validateWageForm()) {
      return;
    }

    try {
      setSaving(true);

      const previousWage = parseFloat(employee.wage || 0);
      const newWageValue = parseFloat(newWage);
      const changeAmount = newWageValue - previousWage;
      const changePercent = previousWage > 0 ? (changeAmount / previousWage) * 100 : 0;

      // Update employee wage
      const { data: updatedEmployee, error: updateError } = await supabase
        .from('users')
        .update({ 
          wage: newWageValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create audit log entry
      const auditEntry = {
        event_type: 'wage_change',
        business_id: userContext.businessId,
        user_id: userContext.user.id,
        details: {
          employee_id: employee.id,
          employee_name: `${employee.first_name} ${employee.last_name}` || employee.full_name,
          previous_wage: previousWage,
          new_wage: newWageValue,
          change_amount: changeAmount,
          change_percent: changePercent,
          effective_date: effectiveDate,
          reason: reason,
          notes: notes || null,
          changed_by_id: userContext.user.id,
          changed_by_name: `${userContext.user.first_name} ${userContext.user.last_name}` || userContext.user.full_name || userContext.user.email
        }
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert(auditEntry);

      if (auditError) {
        console.error('Failed to create audit log:', auditError);
      }

      // Refresh wage history
      await loadWageHistory();

      // Call parent callback
      if (onWageChanged) {
        onWageChanged(updatedEmployee, {
          previousWage,
          newWage: newWageValue,
          changeAmount,
          changePercent,
          reason,
          effectiveDate
        });
      }

      // Reset form
      setShowAddWage(false);
      setNewWage('');
      setReason('');
      setNotes('');
      setErrors({});

    } catch (error) {
      handleError(error, {
        operation: 'add_wage_change',
        employeeId: employee.id,
        newWage
      });
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'Not set';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Format percentage
  const formatPercent = (percent) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  // Get change type styling
  const getChangeStyle = (change) => {
    if (change > 0) {
      return { color: '#16a34a', backgroundColor: '#dcfce7' };
    } else if (change < 0) {
      return { color: '#dc2626', backgroundColor: '#fee2e2' };
    }
    return { color: '#6b7280', backgroundColor: '#f3f4f6' };
  };

  // Permission checks
  const canView = canViewEmployeeWage(userContext, employee?.id);
  const canEdit = hasHRPermission(userContext, HR_PERMISSIONS.EDIT_WAGES);

  if (!isOpen) return null;

  if (!canView) {
    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#dc2626', margin: '0 0 16px 0' }}>Access Denied</h3>
          <p style={{ color: '#6b7280', margin: '0 0 20px 0' }}>
            You do not have permission to view wage information.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { records = [], stats } = wageHistory;

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Wage History: {employee.first_name} {employee.last_name}
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {/* Current Wage & Stats */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <div style={{
                backgroundColor: '#f0fdfa',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #14B8A6'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0F766E',
                  margin: '0 0 8px 0'
                }}>
                  Current Wage
                </h3>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#111827',
                  margin: 0
                }}>
                  {formatCurrency(stats.currentWage)}/hr
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 8px 0'
                }}>
                  Total Increase
                </h3>
                <p style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: stats.totalIncrease >= 0 ? '#16a34a' : '#dc2626',
                  margin: 0
                }}>
                  {formatCurrency(stats.totalIncrease)} ({formatPercent(stats.percentIncrease)})
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 8px 0'
                }}>
                  Number of Raises
                </h3>
                <p style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#111827',
                  margin: 0
                }}>
                  {stats.numberOfRaises}
                </p>
              </div>

              {stats.avgRaiseAmount > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 8px 0'
                  }}>
                    Avg. Raise Amount
                  </h3>
                  <p style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#16a34a',
                    margin: 0
                  }}>
                    {formatCurrency(stats.avgRaiseAmount)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Add New Wage Change */}
          {canEdit && (
            <div style={{ marginBottom: '32px' }}>
              {!showAddWage ? (
                <button
                  onClick={() => setShowAddWage(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#14B8A6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
                >
                  Add Wage Change
                </button>
              ) : (
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    margin: '0 0 16px 0'
                  }}>
                    Add Wage Change
                  </h3>

                  <form onSubmit={handleAddWageChange}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '6px'
                        }}>
                          New Hourly Wage ($) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newWage}
                          onChange={(e) => setNewWage(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: `1px solid ${errors.newWage ? '#dc2626' : '#d1d5db'}`,
                            borderRadius: '6px',
                            fontSize: '16px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                          disabled={saving}
                        />
                        {errors.newWage && (
                          <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0 0' }}>
                            {errors.newWage}
                          </p>
                        )}
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '6px'
                        }}>
                          Effective Date *
                        </label>
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: `1px solid ${errors.effectiveDate ? '#dc2626' : '#d1d5db'}`,
                            borderRadius: '6px',
                            fontSize: '16px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                          disabled={saving}
                        />
                        {errors.effectiveDate && (
                          <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0 0' }}>
                            {errors.effectiveDate}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        Reason for Change *
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Annual raise, promotion, performance review, etc."
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: `1px solid ${errors.reason ? '#dc2626' : '#d1d5db'}`,
                          borderRadius: '6px',
                          fontSize: '16px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                        disabled={saving}
                      />
                      {errors.reason && (
                        <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0 0' }}>
                          {errors.reason}
                        </p>
                      )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional details about this wage change"
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '16px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'vertical'
                        }}
                        disabled={saving}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="submit"
                        style={{
                          padding: '12px 24px',
                          backgroundColor: saving ? '#9ca3af' : '#14B8A6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        disabled={saving}
                      >
                        {saving && (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid white',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                        )}
                        {saving ? 'Adding...' : 'Add Wage Change'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAddWage(false);
                          setErrors({});
                        }}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: 'white',
                          border: '1px solid #d1d5db',
                          color: '#374151',
                          borderRadius: '6px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Wage History */}
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 16px 0'
            }}>
              Wage Change History
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #14B8A6',
                  borderTop: '3px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 8px auto'
                }}></div>
                <p style={{ color: '#6b7280', margin: 0 }}>Loading wage history...</p>
              </div>
            ) : records.length === 0 ? (
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '40px',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ color: '#6b7280', margin: 0 }}>
                  No wage changes recorded yet.
                </p>
              </div>
            ) : (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                {records.map((record, index) => {
                  const changeAmount = record.previous_wage 
                    ? record.new_wage - record.previous_wage 
                    : null;
                  const changePercent = record.previous_wage && record.previous_wage > 0
                    ? ((record.new_wage - record.previous_wage) / record.previous_wage) * 100
                    : null;
                  const changeStyle = changeAmount ? getChangeStyle(changeAmount) : {};

                  return (
                    <div
                      key={record.id}
                      style={{
                        padding: '20px',
                        borderBottom: index < records.length - 1 ? '1px solid #f3f4f6' : 'none',
                        backgroundColor: record.is_current ? '#f0fdfa' : 'white'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px'
                          }}>
                            <span style={{
                              fontSize: '18px',
                              fontWeight: '600',
                              color: '#111827'
                            }}>
                              {formatCurrency(record.new_wage)}/hr
                            </span>
                            
                            {changeAmount !== null && (
                              <span style={{
                                ...changeStyle,
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                {changeAmount >= 0 ? '+' : ''}{formatCurrency(changeAmount)}
                                {changePercent !== null && ` (${formatPercent(changePercent)})`}
                              </span>
                            )}

                            {record.is_current && (
                              <span style={{
                                backgroundColor: '#14B8A6',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                Current
                              </span>
                            )}
                          </div>
                          
                          <div style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            marginBottom: '4px'
                          }}>
                            {record.reason && (
                              <span style={{ fontWeight: '500' }}>
                                {record.reason}
                              </span>
                            )}
                          </div>
                          
                          {record.notes && (
                            <div style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              fontStyle: 'italic'
                            }}>
                              {record.notes}
                            </div>
                          )}
                        </div>
                        
                        <div style={{
                          textAlign: 'right',
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          <div>
                            Effective: {new Date(record.effective_date || record.timestamp).toLocaleDateString()}
                          </div>
                          <div>
                            Changed by: {record.changedBy}
                          </div>
                          {record.timestamp !== record.effective_date && (
                            <div>
                              Recorded: {new Date(record.timestamp).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
};

export default EmployeeWageHistory;