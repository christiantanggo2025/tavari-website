import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const TaskEditModal = ({ isOpen, onClose, task, onTaskUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editForm, setEditForm] = useState({
    due_date: '',
    priority: 'medium',
    notes: '',
    requires_manager_approval: false
  });

  useEffect(() => {
    if (isOpen && task) {
      setEditForm({
        due_date: task.due_date || '',
        priority: task.priority || 'medium',
        notes: task.notes || '',
        requires_manager_approval: task.requires_manager_approval || false
      });
      setError(null);
    }
  }, [isOpen, task]);

  const handleUpdateTask = async () => {
    if (!task?.id) {
      setError('Task information is missing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .rpc('update_onboarding_task_assignment', {
          p_completion_id: task.id,
          p_due_date: editForm.due_date || null,
          p_priority: editForm.priority,
          p_notes: editForm.notes || null,
          p_requires_manager_approval: editForm.requires_manager_approval
        });

      if (error) {
        console.error('Error updating task:', error);
        setError('Failed to update task');
        return;
      }

      if (!data) {
        setError('Failed to update task');
        return;
      }

      // Close modal and notify parent
      onClose();
      if (onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return { backgroundColor: '#fee2e2', color: '#dc2626' };
      case 'high':
        return { backgroundColor: '#fed7aa', color: '#ea580c' };
      case 'medium':
        return { backgroundColor: '#fef3c7', color: '#d97706' };
      case 'low':
        return { backgroundColor: '#dcfce7', color: '#16a34a' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  if (!isOpen || !task) return null;

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
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
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
            Edit Task Assignment
          </h2>
          <button
            onClick={handleClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              borderRadius: '4px'
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
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              color: '#dc2626'
            }}>
              {error}
            </div>
          )}

          {/* Task Information */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              {task.task_title}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 8px 0'
            }}>
              Assigned to: {task.employee_profiles?.first_name} {task.employee_profiles?.last_name}
            </p>
            {task.task_description && (
              <p style={{
                fontSize: '14px',
                color: '#374151',
                margin: '0 0 8px 0'
              }}>
                {task.task_description}
              </p>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                ...getPriorityColor(task.priority),
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                Current Priority: {task.priority}
              </span>
              {task.completed && (
                <span style={{
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Completed
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Due Date */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Due Date
              </label>
              <input
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm({...editForm, due_date: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
              {task.due_date && (
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  Current due date: {new Date(task.due_date).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Priority Level
              </label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  ...getPriorityColor(editForm.priority),
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  New Priority: {editForm.priority}
                </span>
              </div>
            </div>

            {/* Manager Approval Requirement */}
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Requires manager approval when completed?
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditForm({...editForm, requires_manager_approval: true})}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    border: '2px solid #14B8A6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: editForm.requires_manager_approval ? '#14B8A6' : 'white',
                    color: editForm.requires_manager_approval ? 'white' : '#14B8A6',
                    outline: 'none'
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({...editForm, requires_manager_approval: false})}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    border: '2px solid #6b7280',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: !editForm.requires_manager_approval ? '#6b7280' : 'white',
                    color: !editForm.requires_manager_approval ? 'white' : '#6b7280',
                    outline: 'none'
                  }}
                >
                  No
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Notes (Optional)
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'vertical'
                }}
                placeholder="Add notes about this task assignment or changes..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateTask}
            disabled={loading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              outline: 'none'
            }}
          >
            {loading ? 'Updating...' : 'Update Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskEditModal;