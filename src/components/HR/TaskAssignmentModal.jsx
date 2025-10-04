import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const TaskAssignmentModal = ({ isOpen, onClose, business, onTaskAssigned }) => {
  // State declarations - all defined at the top
  const [activeTab, setActiveTab] = useState('individual');
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [taskForm, setTaskForm] = useState({
    task_title: '',
    task_description: '',
    task_type: 'documentation',
    priority: 'medium',
    due_date: '',
    requires_manager_approval: false,
    requires_photo_proof: false,
    requires_digital_signature: false
  });

  useEffect(() => {
    if (isOpen && business?.id) {
      loadEmployees();
      loadTemplates();
      // Set default due date to 7 days from now
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 7);
      setTaskForm(prev => ({
        ...prev,
        due_date: defaultDueDate.toISOString().split('T')[0]
      }));
    }
  }, [isOpen, business?.id]);

  const loadEmployees = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_employees_for_task_assignment', { p_business_id: business.id });

      if (error) {
        console.error('Error loading employees:', error);
        setError('Failed to load employees');
        return;
      }

      setEmployees(data || []);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!business?.id) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_onboarding_templates', { p_business_id: business.id });

      if (error) {
        console.error('Error loading templates:', error);
        return;
      }

      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const handleAssignTask = async () => {
    if (!selectedEmployee || !taskForm.task_title.trim()) {
      setError('Please select an employee and enter a task title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .rpc('assign_individual_onboarding_task', {
          p_business_id: business.id,
          p_employee_id: selectedEmployee,
          p_task_title: taskForm.task_title,
          p_task_description: taskForm.task_description || null,
          p_task_type: taskForm.task_type,
          p_priority: taskForm.priority,
          p_due_date: taskForm.due_date || null,
          p_requires_manager_approval: taskForm.requires_manager_approval,
          p_requires_photo_proof: taskForm.requires_photo_proof,
          p_requires_digital_signature: taskForm.requires_digital_signature
        });

      if (error) {
        console.error('Error assigning task:', error);
        setError('Failed to assign task');
        return;
      }

      if (!data) {
        setError('Failed to assign task');
        return;
      }

      // Reset form and close modal
      resetForm();
      onClose();
      
      if (onTaskAssigned) {
        onTaskAssigned();
      }
    } catch (err) {
      console.error('Error assigning task:', err);
      setError('Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTemplate = async () => {
    if (!selectedEmployee || !selectedTemplate) {
      setError('Please select an employee and a template');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .rpc('assign_onboarding_template', {
          p_business_id: business.id,
          p_employee_id: selectedEmployee,
          p_template_id: selectedTemplate,
          p_assigned_by: null // Will use auth.uid() in function
        });

      if (error) {
        console.error('Error assigning template:', error);
        setError('Failed to assign template');
        return;
      }

      if (!data) {
        setError('Failed to assign template');
        return;
      }

      // Reset form and close modal
      resetForm();
      onClose();
      
      if (onTaskAssigned) {
        onTaskAssigned();
      }
    } catch (err) {
      console.error('Error assigning template:', err);
      setError('Failed to assign template');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee('');
    setSelectedTemplate('');
    setTaskForm({
      task_title: '',
      task_description: '',
      task_type: 'documentation',
      priority: 'medium',
      due_date: '',
      requires_manager_approval: false,
      requires_photo_proof: false,
      requires_digital_signature: false
    });
    setActiveTab('individual');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

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
        maxWidth: '700px',
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
            Assign Tasks
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('individual')}
            style={{
              flex: 1,
              padding: '16px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              color: activeTab === 'individual' ? '#14B8A6' : '#6b7280',
              borderBottom: activeTab === 'individual' ? '2px solid #14B8A6' : '2px solid transparent',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Individual Task
          </button>
          <button
            onClick={() => setActiveTab('template')}
            style={{
              flex: 1,
              padding: '16px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              color: activeTab === 'template' ? '#14B8A6' : '#6b7280',
              borderBottom: activeTab === 'template' ? '2px solid #14B8A6' : '2px solid transparent',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Template Package ({templates.length})
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

          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #14B8A6',
                borderTop: '3px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          )}

          {/* Individual Task Tab Content */}
          {!loading && activeTab === 'individual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Employee Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Assign to Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
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
                  <option value="">Select an employee...</option>
                  {employees.map(employee => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.employee_name} {employee.department && `(${employee.department})`}
                      {employee.overdue_tasks > 0 && ` - ${employee.overdue_tasks} overdue`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskForm.task_title}
                  onChange={(e) => setTaskForm({...taskForm, task_title: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  placeholder="e.g., Complete Safety Training"
                />
              </div>

              {/* Task Description */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Description (Optional)
                </label>
                <textarea
                  value={taskForm.task_description}
                  onChange={(e) => setTaskForm({...taskForm, task_description: e.target.value})}
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
                  placeholder="Detailed instructions for the task..."
                />
              </div>

              {/* Task Type and Priority */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Task Type
                  </label>
                  <select
                    value={taskForm.task_type}
                    onChange={(e) => setTaskForm({...taskForm, task_type: e.target.value})}
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
                    <option value="documentation">Documentation</option>
                    <option value="training">Training</option>
                    <option value="equipment">Equipment</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
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
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

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
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Requirements Yes/No Buttons */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Task Requirements
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Manager Approval */}
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Requires manager approval when completed?
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setTaskForm({...taskForm, requires_manager_approval: true})}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          border: '2px solid #14B8A6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: taskForm.requires_manager_approval ? '#14B8A6' : 'white',
                          color: taskForm.requires_manager_approval ? 'white' : '#14B8A6',
                          outline: 'none'
                        }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskForm({...taskForm, requires_manager_approval: false})}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          border: '2px solid #6b7280',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: !taskForm.requires_manager_approval ? '#6b7280' : 'white',
                          color: !taskForm.requires_manager_approval ? 'white' : '#6b7280',
                          outline: 'none'
                        }}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Photo Proof */}
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Requires photo proof of completion?
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setTaskForm({...taskForm, requires_photo_proof: true})}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          border: '2px solid #14B8A6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: taskForm.requires_photo_proof ? '#14B8A6' : 'white',
                          color: taskForm.requires_photo_proof ? 'white' : '#14B8A6',
                          outline: 'none'
                        }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskForm({...taskForm, requires_photo_proof: false})}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          border: '2px solid #6b7280',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: !taskForm.requires_photo_proof ? '#6b7280' : 'white',
                          color: !taskForm.requires_photo_proof ? 'white' : '#6b7280',
                          outline: 'none'
                        }}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Digital Signature */}
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Requires digital signature?
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setTaskForm({...taskForm, requires_digital_signature: true})}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          border: '2px solid #14B8A6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: taskForm.requires_digital_signature ? '#14B8A6' : 'white',
                          color: taskForm.requires_digital_signature ? 'white' : '#14B8A6',
                          outline: 'none'
                        }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskForm({...taskForm, requires_digital_signature: false})}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          border: '2px solid #6b7280',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: !taskForm.requires_digital_signature ? '#6b7280' : 'white',
                          color: !taskForm.requires_digital_signature ? 'white' : '#6b7280',
                          outline: 'none'
                        }}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template Package Tab Content */}
          {!loading && activeTab === 'template' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Employee Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Assign to Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
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
                  <option value="">Select an employee...</option>
                  {employees.map(employee => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.employee_name} {employee.department && `(${employee.department})`}
                      {employee.overdue_tasks > 0 && ` - ${employee.overdue_tasks} overdue`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Select Template Package *
                </label>
                <div style={{
                  display: 'grid',
                  gap: '12px',
                  maxHeight: '300px',
                  overflow: 'auto',
                  padding: '8px'
                }}>
                  {templates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      style={{
                        padding: '16px',
                        border: selectedTemplate === template.id ? '2px solid #14B8A6' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedTemplate === template.id ? '#f0fdfa' : 'white',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        if (selectedTemplate !== template.id) {
                          e.target.style.borderColor = '#d1d5db';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedTemplate !== template.id) {
                          e.target.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#111827',
                          margin: 0
                        }}>
                          {template.template_name}
                          {template.is_default && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '12px',
                              padding: '2px 6px',
                              borderRadius: '12px',
                              backgroundColor: '#dbeafe',
                              color: '#2563eb'
                            }}>
                              Default
                            </span>
                          )}
                        </h4>
                        <span style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          fontWeight: '500'
                        }}>
                          {template.task_count} tasks
                        </span>
                      </div>
                      
                      {template.description && (
                        <p style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          margin: '0 0 8px 0'
                        }}>
                          {template.description}
                        </p>
                      )}
                      
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {template.department && (
                          <span>Department: {template.department}</span>
                        )}
                        {template.job_position && (
                          <span>Position: {template.job_position}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {templates.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#6b7280'
                  }}>
                    <p>No templates available. Create templates using "Manage Templates" first.</p>
                  </div>
                )}
              </div>
            </div>
          )}
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
            onClick={activeTab === 'individual' ? handleAssignTask : handleAssignTemplate}
            disabled={loading || !selectedEmployee || (activeTab === 'individual' ? !taskForm.task_title.trim() : !selectedTemplate)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !selectedEmployee || (activeTab === 'individual' ? !taskForm.task_title.trim() : !selectedTemplate) ? 'not-allowed' : 'pointer',
              opacity: loading || !selectedEmployee || (activeTab === 'individual' ? !taskForm.task_title.trim() : !selectedTemplate) ? 0.5 : 1,
              outline: 'none'
            }}
          >
            {loading ? 
              (activeTab === 'individual' ? 'Assigning Task...' : 'Assigning Template...') : 
              (activeTab === 'individual' ? 'Assign Task' : 'Assign Template')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignmentModal;