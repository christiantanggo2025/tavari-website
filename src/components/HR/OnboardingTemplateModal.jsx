import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const OnboardingTemplateModal = ({ isOpen, onClose, business, onTemplateCreated }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateTasks, setTemplateTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create', 'edit'
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    description: '',
    department: '',
    position: ''
  });

  useEffect(() => {
    if (isOpen && business?.id) {
      loadTemplates();
    }
  }, [isOpen, business?.id]);

  const loadTemplates = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_onboarding_templates', { p_business_id: business.id });

      if (error) {
        console.error('Error loading templates:', error);
        setError('Failed to load templates');
        return;
      }

      setTemplates(data || []);
      
      // If no templates exist, create default ones
      if (!data || data.length === 0) {
        await createDefaultTemplates();
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const { data, error } = await supabase
        .rpc('create_default_onboarding_templates', { p_business_id: business.id });

      if (error) {
        console.error('Error creating default templates:', error);
        return;
      }

      // Reload templates after creating defaults
      await loadTemplates();
    } catch (err) {
      console.error('Error creating default templates:', err);
    }
  };

  const loadTemplateTasks = async (templateId) => {
    try {
      const { data, error } = await supabase
        .rpc('get_template_tasks', { p_template_id: templateId });

      if (error) {
        console.error('Error loading template tasks:', error);
        return;
      }

      setTemplateTasks(data || []);
    } catch (err) {
      console.error('Error loading template tasks:', err);
    }
  };

  const handleTemplateSelect = async (template) => {
    setSelectedTemplate(template);
    await loadTemplateTasks(template.id);
    setActiveTab('edit');
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.template_name.trim()) {
      setError('Template name is required');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('onboarding_templates')
        .insert([{
          business_id: business.id,
          template_name: newTemplate.template_name,
          description: newTemplate.description,
          department: newTemplate.department || null,
          position: newTemplate.position || null,
          is_default: false,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        setError('Failed to create template');
        return;
      }

      // Reset form and reload templates
      setNewTemplate({ template_name: '', description: '', department: '', position: '' });
      await loadTemplates();
      setActiveTab('list');
      
      if (onTemplateCreated) {
        onTemplateCreated();
      }
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const assignTemplateToEmployee = async (templateId, employeeName) => {
    // This would be called from the main OnboardingCenter component
    // For now, just show a success message
    alert(`Template assigned to ${employeeName}`);
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
        maxWidth: '900px',
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
            Onboarding Templates
          </h2>
          <button
            onClick={onClose}
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
          borderBottom: '1px solid #e5e7eb',
          padding: '0 24px'
        }}>
          {[
            { key: 'list', label: 'Templates', count: templates.length },
            { key: 'create', label: 'Create New' },
            ...(selectedTemplate ? [{ key: 'edit', label: `Edit: ${selectedTemplate.template_name}` }] : [])
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '16px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                color: activeTab === tab.key ? '#14B8A6' : '#6b7280',
                borderBottom: activeTab === tab.key ? '2px solid #14B8A6' : '2px solid transparent',
                outline: 'none'
              }}
            >
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
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

          {/* Template List Tab */}
          {activeTab === 'list' && !loading && (
            <div>
              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                {templates.map(template => (
                  <div
                    key={template.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.borderColor = '#14B8A6'}
                    onMouseOut={(e) => e.target.style.borderColor = '#e5e7eb'}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{
                        fontSize: '18px',
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
                      </h3>
                      <span style={{
                        fontSize: '14px',
                        color: '#6b7280'
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
                      fontSize: '14px',
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
            </div>
          )}

          {/* Create Template Tab */}
          {activeTab === 'create' && (
            <div style={{ maxWidth: '600px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Template Name *
                </label>
                <input
                  type="text"
                  value={newTemplate.template_name}
                  onChange={(e) => setNewTemplate({...newTemplate, template_name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  placeholder="e.g., Kitchen Staff Onboarding"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Description
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
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
                  placeholder="Brief description of this onboarding template"
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTemplate.department}
                    onChange={(e) => setNewTemplate({...newTemplate, department: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                    placeholder="e.g., Kitchen, Front of House"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Position (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTemplate.position}
                    onChange={(e) => setNewTemplate({...newTemplate, position: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                    placeholder="e.g., Manager, Server, Cook"
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setActiveTab('list')}
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
                  onClick={handleCreateTemplate}
                  disabled={loading || !newTemplate.template_name.trim()}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: '#14B8A6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading || !newTemplate.template_name.trim() ? 0.5 : 1,
                    outline: 'none'
                  }}
                >
                  Create Template
                </button>
              </div>
            </div>
          )}

          {/* Edit Template Tab */}
          {activeTab === 'edit' && selectedTemplate && (
            <div>
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
                  {selectedTemplate.template_name}
                </h3>
                {selectedTemplate.description && (
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {selectedTemplate.description}
                  </p>
                )}
              </div>

              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 16px 0'
              }}>
                Tasks ({templateTasks.length})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {templateTasks.map(task => (
                  <div
                    key={task.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <h5 style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#111827',
                        margin: 0
                      }}>
                        {task.task_title}
                      </h5>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          backgroundColor: task.priority === 'urgent' ? '#fee2e2' :
                                         task.priority === 'high' ? '#fed7aa' :
                                         task.priority === 'medium' ? '#fef3c7' : '#dcfce7',
                          color: task.priority === 'urgent' ? '#dc2626' :
                                 task.priority === 'high' ? '#ea580c' :
                                 task.priority === 'medium' ? '#d97706' : '#16a34a'
                        }}>
                          {task.priority}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          Due: Day {task.due_days_after_hire}
                        </span>
                      </div>
                    </div>
                    
                    {task.task_description && (
                      <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '0 0 8px 0'
                      }}>
                        {task.task_description}
                      </p>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      <span>Type: {task.task_type}</span>
                      {task.requires_manager_approval && (
                        <span style={{ color: '#d97706' }}>Requires Approval</span>
                      )}
                      {task.requires_photo_proof && (
                        <span style={{ color: '#2563eb' }}>Photo Required</span>
                      )}
                    </div>
                  </div>
                ))}
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
            onClick={onClose}
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTemplateModal;