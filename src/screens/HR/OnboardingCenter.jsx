import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import TaskAssignmentModal from '../../components/HR/TaskAssignmentModal';
import TaskEditModal from '../../components/HR/TaskEditModal';
import TaskCompletionModal from '../../components/HR/TaskCompletionModal';
import VerificationApprovalModal from '../../components/HR/VerificationApprovalModal';

const OnboardingCenter = () => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [onboardingSummary, setOnboardingSummary] = useState([]);
  const [onboardingTasks, setOnboardingTasks] = useState([]);
  const [pendingVerificationTasks, setPendingVerificationTasks] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState('all');
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskCompletionModal, setTaskCompletionModal] = useState({
    isOpen: false, task: null, assignmentId: null
  });
  const [verificationModal, setVerificationModal] = useState({
    isOpen: false, completionId: null, details: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAndBusiness();
  }, []);

  const checkUserAndBusiness = async () => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Authentication error:', userError);
        navigate('/login');
        return;
      }

      setUser(user);

      // Get user's business association and role
      const { data: businessUsers, error: businessError } = await supabase
        .from('business_users')
        .select(`
          business_id, 
          role,
          businesses(id, name)
        `)
        .eq('user_id', user.id)
        .single();

      if (businessError || !businessUsers) {
        console.error('Error loading business:', businessError);
        setError('Unable to load business information. Please contact support.');
        setLoading(false);
        return;
      }

      setBusiness(businessUsers.businesses);
      setUserRole(businessUsers.role);
      
      // Check if user has HR permissions
      const hasHRAccess = ['owner', 'admin', 'manager'].includes(businessUsers.role.toLowerCase());
      
      if (!hasHRAccess) {
        setError('You do not have permission to access the Onboarding Center.');
        setLoading(false);
        return;
      }

      // Load employees and onboarding data
      await loadEmployees(businessUsers.business_id);
      await loadOnboardingSummary(businessUsers.business_id);
      await loadOnboardingTasks(businessUsers.business_id);
      await loadPendingVerifications(businessUsers.business_id);
      
    } catch (error) {
      console.error('Error checking user and business:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async (businessId) => {
    try {
      const { data: businessUsers, error: businessError } = await supabase
        .from('business_users')
        .select(`
          user_id,
          role,
          users!inner(
            id,
            full_name,
            email,
            phone,
            employee_number,
            first_name,
            last_name,
            hire_date,
            employment_status,
            department,
            position
          )
        `)
        .eq('business_id', businessId);

      if (businessError) {
        console.error('Error loading employees:', businessError);
        return;
      }

      const employeeList = businessUsers?.map(bu => ({
        ...bu.users,
        business_role: bu.role
      })) || [];

      setEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadOnboardingSummary = async (businessId) => {
    try {
      // Call the real database function
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_onboarding_summary', { p_business_id: businessId });

      if (summaryError) {
        console.error('Error loading onboarding summary:', summaryError);
        setOnboardingSummary([]);
        return;
      }

      // Transform data to match component expectations
      const transformedSummary = summaryData?.map(item => ({
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        employee_number: item.employee_number,
        hire_date: item.hire_date,
        total_tasks: item.total_tasks,
        completed_tasks: item.completed_tasks,
        overdue_tasks: item.overdue_tasks,
        completion_percentage: item.completion_percentage,
        assignment_id: item.assignment_id
      })) || [];

      setOnboardingSummary(transformedSummary);
    } catch (error) {
      console.error('Error loading onboarding summary:', error);
      setOnboardingSummary([]);
    }
  };

  const loadPendingVerifications = async (businessId) => {
    try {
      const hasManagerAccess = ['owner', 'admin', 'manager'].includes(userRole?.toLowerCase());
      if (!hasManagerAccess || !user) return;

      const { data: verificationData, error } = await supabase
        .rpc('get_tasks_requiring_verification', {
          p_business_id: businessId,
          p_manager_id: user.id
        });
      
      if (error) {
        console.error('Error loading pending verifications:', error);
        return;
      }
      
      setPendingVerificationTasks(verificationData || []);
    } catch (error) {
      console.error('Error loading pending verifications:', error);
    }
  };

  const sortEmployeeSummary = (summaryData) => {
    if (!summaryData || summaryData.length === 0) return summaryData;

    let sorted = [...summaryData];
    
    switch (sortOption) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.hire_date) - new Date(b.hire_date));
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.hire_date) - new Date(a.hire_date));
        break;
      case 'priority':
        // Sort by most urgent tasks (overdue tasks first, then by total tasks)
        sorted.sort((a, b) => {
          if (b.overdue_tasks !== a.overdue_tasks) {
            return b.overdue_tasks - a.overdue_tasks;
          }
          return (b.total_tasks - b.completed_tasks) - (a.total_tasks - a.completed_tasks);
        });
        break;
      case 'outstanding':
        // Sort by highest amount of outstanding tasks
        sorted.sort((a, b) => {
          const aOutstanding = a.total_tasks - a.completed_tasks;
          const bOutstanding = b.total_tasks - b.completed_tasks;
          return bOutstanding - aOutstanding;
        });
        break;
      default:
        break;
    }
    
    return sorted;
  };

  const loadOnboardingTasks = async (businessId) => {
    try {
      // Call the real database function with correct parameters
      const { data: tasksData, error: tasksError } = await supabase
        .rpc('get_onboarding_tasks', { 
          p_business_id: businessId,
          p_employee_id: selectedEmployee || null
        });

      if (tasksError) {
        console.error('Error loading onboarding tasks:', tasksError);
        setOnboardingTasks([]);
        return;
      }

      // Transform data to match component expectations
      const transformedTasks = tasksData?.map(task => ({
        id: task.id,
        assignment_id: task.assignment_id || task.id, // Use id if assignment_id not available
        task_id: task.id,
        employee_id: task.employee_id,
        task_title: task.task_title,
        task_description: task.task_description,
        task_type: task.task_type,
        priority: task.priority,
        due_date: task.due_date,
        completed: task.completed,
        completed_by: task.completed_by,
        completed_date: task.completed_date,
        completed_at: task.completed_date,
        requires_manager_approval: task.requires_manager_approval,
        requires_photo: false, // Default values for Step 72 fields
        requires_signature: false,
        approved_by: task.approved_by,
        approval_date: task.approval_date,
        sort_order: task.sort_order,
        notes: task.notes,
        status: task.completed ? 
          (task.approved_by ? 'approved' : 
            (task.requires_manager_approval ? 'requires_verification' : 'completed')) : 
          'pending',
        completion_id: task.id,
        verification_method: 'none',
        employee_profiles: {
          id: task.employee_id,
          first_name: task.first_name,
          last_name: task.last_name,
          employee_number: task.employee_number,
          employment_status: task.employment_status,
          hire_date: task.hire_date
        }
      })) || [];

      setOnboardingTasks(transformedTasks);
      
      // Also reload pending verifications
      if (business?.id && user) await loadPendingVerifications(business.id);
    } catch (error) {
      console.error('Error loading onboarding tasks:', error);
      setOnboardingTasks([]);
    }
  };

  const handleCompleteTaskWithVerification = async (task) => {
    // Check if task requires verification
    if (task.requires_photo || task.requires_signature || task.requires_manager_approval) {
      setTaskCompletionModal({
        isOpen: true,
        task: task,
        assignmentId: task.assignment_id
      });
    } else {
      // Use existing completion logic for simple tasks
      await toggleTaskCompletion(task.id, task.completed);
    }
  };

  const handleTaskCompletionWithVerification = async (completionData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('complete_onboarding_task_with_verification', {
          p_assignment_id: taskCompletionModal.assignmentId,
          p_task_id: taskCompletionModal.task.task_id || taskCompletionModal.task.id,
          p_completed_by: user.id,
          p_verification_method: completionData.verification_method,
          p_verification_photo_url: completionData.verification_photo_url,
          p_verification_signature_data: completionData.verification_signature_data,
          p_verification_notes: completionData.verification_notes
        });

      if (error) throw error;
      
      if (data.success) {
        // Reload data
        await loadOnboardingTasks(business.id);
        await loadOnboardingSummary(business.id);
        await loadPendingVerifications(business.id);
        
        setTaskCompletionModal({ isOpen: false, task: null, assignmentId: null });
        
        // Show appropriate success message
        if (data.requires_approval) {
          alert('Task completed! Awaiting manager approval.');
        } else {
          alert('Task completed successfully!');
        }
      } else {
        throw new Error(data.error || 'Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationReview = async (completionId) => {
    try {
      const { data, error } = await supabase
        .rpc('get_completion_verification_details', {
          p_completion_id: completionId,
          p_user_id: user.id
        });

      if (error) throw error;
      
      if (data.success) {
        setVerificationModal({
          isOpen: true,
          completionId: completionId,
          details: data
        });
      }
    } catch (error) {
      console.error('Error loading verification details:', error);
      alert('Failed to load verification details');
    }
  };

  const handleApproveVerification = async (approvalData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('approve_onboarding_task_completion', {
          p_completion_id: verificationModal.completionId,
          p_approved_by: user.id,
          p_approved: approvalData.approved,
          p_rejection_reason: approvalData.rejection_reason,
          p_approval_notes: approvalData.approval_notes
        });

      if (error) throw error;

      if (data.success) {
        // Reload data
        await loadOnboardingTasks(business.id);
        await loadOnboardingSummary(business.id);
        await loadPendingVerifications(business.id);
        
        setVerificationModal({ isOpen: false, completionId: null, details: null });
        
        if (approvalData.approved) {
          alert('Task approved successfully!');
        } else {
          alert('Task rejected. Employee will be notified.');
        }
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    try {
      if (!currentStatus) {
        // Complete the task using the database function
        const { data, error } = await supabase
          .rpc('complete_onboarding_task', {
            p_completion_id: taskId,
            p_completed_by: user.id,
            p_notes: null
          });

        if (error) {
          console.error('Error completing task:', error);
          return;
        }

        if (!data) {
          console.error('Failed to complete task');
          return;
        }
      } else {
        // Reopen the task by updating completion status
        const { error } = await supabase
          .from('onboarding_completions')
          .update({
            completed: false,
            completed_date: null,
            completed_by: null,
            approved_by: null,
            approval_date: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);

        if (error) {
          console.error('Error reopening task:', error);
          return;
        }
      }

      // Reload tasks and summary to reflect changes
      await loadOnboardingTasks(business.id);
      await loadOnboardingSummary(business.id);
      
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const approveTask = async (taskId) => {
    try {
      const { data, error } = await supabase
        .rpc('approve_onboarding_task', {
          p_completion_id: taskId,
          p_approved_by: user.id
        });

      if (error) {
        console.error('Error approving task:', error);
        return;
      }

      if (!data) {
        console.error('Failed to approve task');
        return;
      }

      // Reload tasks to reflect approval
      await loadOnboardingTasks(business.id);
      
    } catch (error) {
      console.error('Error approving task:', error);
    }
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleTaskAssigned = () => {
    // Reload data when new task is assigned
    loadOnboardingSummary(business.id);
    loadOnboardingTasks(business.id);
  };

  const handleTaskUpdated = () => {
    // Reload data when task is updated
    loadOnboardingSummary(business.id);
    loadOnboardingTasks(business.id);
  };

  // Reload tasks when selected employee changes
  useEffect(() => {
    if (business?.id) {
      loadOnboardingTasks(business.id);
    }
  }, [selectedEmployee, business?.id]);

  const filteredTasks = onboardingTasks.filter(task => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = `${task.employee_profiles?.first_name} ${task.employee_profiles?.last_name}`.toLowerCase().includes(query);
      const matchesTask = task.task_title.toLowerCase().includes(query);
      const matchesDate = task.due_date && task.due_date.includes(searchQuery);
      
      if (!matchesName && !matchesTask && !matchesDate) {
        return false;
      }
    }

    // Employee filter
    if (selectedEmployee && task.employee_id !== selectedEmployee) {
      return false;
    }
    
    // Status filter
    switch (taskFilter) {
      case 'pending':
        return !task.completed;
      case 'completed':
        return task.completed;
      case 'overdue':
        return !task.completed && task.due_date && new Date(task.due_date) < new Date();
      case 'approval_needed':
        return task.completed && task.requires_manager_approval && !task.approved_by;
      case 'verification':
        return task.status === 'requires_verification';
      default:
        return true;
    }
  });

  const sortedEmployeeSummary = sortEmployeeSummary(onboardingSummary);

  const getTaskPriorityStyle = (priority) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block'
    };
    
    switch (priority) {
      case 'urgent':
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#dc2626' };
      case 'high':
        return { ...baseStyle, backgroundColor: '#fed7aa', color: '#ea580c' };
      case 'medium':
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
      case 'low':
        return { ...baseStyle, backgroundColor: '#dcfce7', color: '#16a34a' };
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'documentation':
        return '📄';
      case 'training':
        return '📚';
      case 'equipment':
        return '💻';
      case 'meeting':
        return '🤝';
      default:
        return '✅';
    }
  };

  const getVerificationIcons = (task) => {
    const icons = [];
    if (task.requires_photo) icons.push('📷');
    if (task.requires_signature) icons.push('✍️');
    if (task.requires_manager_approval) icons.push('🔍');
    return icons.join(' ');
  };

  const getTaskStatusBadge = (task) => {
    switch (task.status) {
      case 'completed':
        return <span style={{ padding: '2px 6px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#dcfce7', color: '#16a34a' }}>Completed</span>;
      case 'requires_verification':
        return <span style={{ padding: '2px 6px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#fef3c7', color: '#d97706' }}>Pending Approval</span>;
      case 'approved':
        return <span style={{ padding: '2px 6px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#dcfce7', color: '#16a34a' }}>Approved</span>;
      case 'rejected':
        return <span style={{ padding: '2px 6px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#dc2626' }}>Rejected</span>;
      default:
        return <span style={{ padding: '2px 6px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6b7280' }}>Pending</span>;
    }
  };

  const isTaskOverdue = (dueDate, completed) => {
    return !completed && dueDate && new Date(dueDate) < new Date();
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard/hr');
  };

  const renderVerificationDashboard = () => {
    const hasManagerAccess = ['owner', 'admin', 'manager'].includes(userRole?.toLowerCase());
    
    if (!hasManagerAccess || pendingVerificationTasks.length === 0) return null;

    return (
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fed7aa',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#d97706',
              margin: '0 0 4px 0'
            }}>
              🔍 Tasks Requiring Verification
            </h3>
            <p style={{
              color: '#92400e',
              fontSize: '14px',
              margin: 0
            }}>
              {pendingVerificationTasks.length} task{pendingVerificationTasks.length !== 1 ? 's' : ''} need{pendingVerificationTasks.length === 1 ? 's' : ''} your approval
            </p>
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '12px'
        }}>
          {pendingVerificationTasks.slice(0, 4).map((task) => (
            <div key={task.completion_id} style={{
              backgroundColor: 'white',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontWeight: '600',
                  color: '#111827',
                  fontSize: '14px',
                  margin: '0 0 4px 0'
                }}>
                  {task.task_title}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0 0 4px 0'
                }}>
                  {task.employee_name} • Completed {new Date(task.completed_at).toLocaleDateString()}
                </p>
                {task.verification_method !== 'none' && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af'
                  }}>
                    {task.verification_method}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleVerificationReview(task.completion_id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#d97706',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                Review
              </button>
            </div>
          ))}
        </div>
        
        {pendingVerificationTasks.length > 4 && (
          <p style={{
            textAlign: 'center',
            color: '#92400e',
            fontSize: '12px',
            marginTop: '12px',
            margin: '12px 0 0 0'
          }}>
            And {pendingVerificationTasks.length - 4} more tasks requiring verification...
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        paddingTop: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #14B8A6',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 8px auto'
          }}></div>
          <p style={{ 
            margin: 0, 
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Loading Onboarding Center...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        paddingTop: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px'
      }}>
        <div style={{ 
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#111827', 
            margin: '0 0 8px 0'
          }}>
            Access Denied
          </h2>
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '20px',
            fontSize: '16px',
            lineHeight: '1.5',
            margin: '0 0 20px 0'
          }}>
            {error}
          </p>
          <button 
            onClick={handleBackToDashboard}
            style={{
              padding: '12px 24px',
              backgroundColor: '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
          >
            Return to HR Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '60px',
      paddingLeft: '20px',
      paddingRight: '20px',
      paddingBottom: '20px'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={{ marginBottom: '30px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              Onboarding Center
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '16px',
              margin: 0
            }}>
              {business?.name}
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button 
              onClick={() => setShowAssignModal(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#14B8A6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                outline: 'none'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
            >
              Assign Task
            </button>
            <button 
              onClick={() => alert('Template management will be available once the component is properly created in your project structure')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: '#14B8A6',
                border: '2px solid #14B8A6',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#14B8A6';
                e.target.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.color = '#14B8A6';
              }}
            >
              Manage Templates
            </button>
          </div>
        </div>
      </div>

      {renderVerificationDashboard()}

      {onboardingSummary.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Employee Onboarding Progress
            </h2>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {[
                { key: 'newest', label: 'Newest Hires First' },
                { key: 'oldest', label: 'Oldest Hires First' },
                { key: 'priority', label: 'Priority Outstanding' },
                { key: 'outstanding', label: 'Most Outstanding' }
              ].map(sort => (
                <button
                  key={sort.key}
                  onClick={() => setSortOption(sort.key)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: sortOption === sort.key ? '2px solid #14B8A6' : '1px solid #d1d5db',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: sortOption === sort.key ? '#14B8A6' : 'white',
                    color: sortOption === sort.key ? 'white' : '#374151',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (sortOption !== sort.key) {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (sortOption !== sort.key) {
                      e.target.style.backgroundColor = 'white';
                    }
                  }}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {sortedEmployeeSummary.map((employee, index) => (
              <div 
                key={`${employee.employee_id}-${employee.assignment_id}-${index}`}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: selectedEmployee === employee.employee_id ? '2px solid #14B8A6' : '2px solid #e5e7eb',
                  backgroundColor: selectedEmployee === employee.employee_id ? '#f0fdfa' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedEmployee(
                  selectedEmployee === employee.employee_id ? null : employee.employee_id
                )}
                onMouseOver={(e) => {
                  if (selectedEmployee !== employee.employee_id) {
                    e.target.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedEmployee !== employee.employee_id) {
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
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    margin: 0
                  }}>
                    {employee.employee_name}
                  </h3>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    backgroundColor: employee.completion_percentage >= 100 ? '#dcfce7' :
                                   employee.completion_percentage >= 75 ? '#dbeafe' :
                                   employee.completion_percentage >= 50 ? '#fef3c7' : '#fee2e2',
                    color: employee.completion_percentage >= 100 ? '#16a34a' :
                           employee.completion_percentage >= 75 ? '#2563eb' :
                           employee.completion_percentage >= 50 ? '#d97706' : '#dc2626'
                  }}>
                    {employee.completion_percentage}% Complete
                  </span>
                </div>
                
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: employee.completion_percentage >= 100 ? '#16a34a' :
                                   employee.completion_percentage >= 75 ? '#2563eb' :
                                   employee.completion_percentage >= 50 ? '#d97706' : '#dc2626',
                    width: `${employee.completion_percentage}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <span>{employee.completed_tasks}/{employee.total_tasks} tasks</span>
                  {employee.overdue_tasks > 0 && (
                    <span style={{
                      color: '#dc2626',
                      fontWeight: '500'
                    }}>
                      {employee.overdue_tasks} overdue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px'
        }}>
          {[
            { key: 'all', label: `All Tasks (${onboardingTasks.length})` },
            { key: 'pending', label: `Pending (${onboardingTasks.filter(t => !t.completed).length})` },
            { key: 'completed', label: `Completed (${onboardingTasks.filter(t => t.completed).length})` },
            { key: 'overdue', label: `Overdue (${onboardingTasks.filter(t => isTaskOverdue(t.due_date, t.completed)).length})` },
            { key: 'approval_needed', label: `Needs Approval (${onboardingTasks.filter(t => t.completed && t.requires_manager_approval && !t.approved_by).length})` },
            { key: 'verification', label: `Needs Verification (${onboardingTasks.filter(t => t.status === 'requires_verification').length})` }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setTaskFilter(filter.key)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: taskFilter === filter.key ? '#14B8A6' : '#f3f4f6',
                color: taskFilter === filter.key ? 'white' : '#374151',
                outline: 'none'
              }}
              onMouseOver={(e) => {
                if (taskFilter !== filter.key) {
                  e.target.style.backgroundColor = '#e5e7eb';
                }
              }}
              onMouseOut={(e) => {
                if (taskFilter !== filter.key) {
                  e.target.style.backgroundColor = '#f3f4f6';
                }
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
        
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by employee name, task, or date (YYYY-MM-DD)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              fontSize: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#14B8A6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          <div style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6b7280',
            fontSize: '18px'
          }}>
            🔍
          </div>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '48px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{ 
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            📋
          </div>
          <p style={{
            color: '#6b7280',
            fontSize: '18px',
            margin: '0 0 24px 0'
          }}>
            {selectedEmployee ? 'No tasks found for selected employee.' : searchQuery ? 'No tasks match your search criteria.' : 'No onboarding tasks found.'}
          </p>
          <button 
            onClick={() => setShowAssignModal(true)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
          >
            Assign First Task
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTasks.map(task => (
            <div 
              key={task.id} 
              style={{
                backgroundColor: isTaskOverdue(task.due_date, task.completed) ? '#fef3f2' :
                                task.completed && task.requires_manager_approval && !task.approved_by ? '#fffbeb' :
                                task.status === 'requires_verification' ? '#fffbeb' : 'white',
                padding: '24px',
                borderRadius: '12px',
                border: isTaskOverdue(task.due_date, task.completed) ? '1px solid #fecaca' :
                        task.completed && task.requires_manager_approval && !task.approved_by ? '1px solid #fed7aa' :
                        task.status === 'requires_verification' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }}
              onMouseOut={(e) => {
                e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  flex: 1
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px'
                  }}>
                    <span style={{ fontSize: '18px' }}>{getTaskTypeIcon(task.task_type)}</span>
                    {getVerificationIcons(task) && (
                      <span style={{ fontSize: '14px', marginLeft: '4px' }}>{getVerificationIcons(task)}</span>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                      flexWrap: 'wrap'
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: task.completed ? '#6b7280' : '#111827',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        margin: 0
                      }}>
                        {task.task_title}
                      </h3>
                      <span style={getTaskPriorityStyle(task.priority)}>
                        {task.priority}
                      </span>
                      {task.status && getTaskStatusBadge(task)}
                    </div>
                    
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: '0 0 8px 0'
                    }}>
                      For: {task.employee_profiles?.first_name} {task.employee_profiles?.last_name}
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
                      flexWrap: 'wrap',
                      gap: '16px',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      {task.due_date && (
                        <span style={{
                          color: isTaskOverdue(task.due_date, task.completed) ? '#dc2626' : '#6b7280',
                          fontWeight: isTaskOverdue(task.due_date, task.completed) ? '500' : 'normal'
                        }}>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {task.completed && (
                        <span style={{ color: '#16a34a' }}>
                          Completed {new Date(task.completed_date || task.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    {task.requires_manager_approval && (
                      <div style={{ marginTop: '8px' }}>
                        {task.approved_by ? (
                          <span style={{
                            fontSize: '14px',
                            color: '#16a34a'
                          }}>
                            Approved on {new Date(task.approval_date).toLocaleDateString()}
                          </span>
                        ) : task.completed ? (
                          <span style={{
                            fontSize: '14px',
                            color: '#d97706',
                            fontWeight: '500'
                          }}>
                            Pending manager approval
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '14px',
                            color: '#6b7280'
                          }}>
                            Requires manager approval when completed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {task.notes && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  <strong>Notes:</strong> {task.notes}
                </div>
              )}
              
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '16px',
                flexWrap: 'wrap'
              }}>
                {!task.completed && task.status !== 'rejected' ? (
                  <button 
                    onClick={() => handleCompleteTaskWithVerification(task)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      color: '#14B8A6',
                      border: '2px solid #14B8A6',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#14B8A6';
                      e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.color = '#14B8A6';
                    }}
                  >
                    Mark Complete
                  </button>
                ) : task.status === 'rejected' ? (
                  <button 
                    onClick={() => handleCompleteTaskWithVerification(task)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                  >
                    Redo Task
                  </button>
                ) : (
                  <button 
                    onClick={() => toggleTaskCompletion(task.id, task.completed)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                  >
                    Mark Incomplete
                  </button>
                )}
                
                <button 
                  onClick={() => handleEditTask(task)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: '#14B8A6',
                    border: '2px solid #14B8A6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#14B8A6';
                    e.target.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.color = '#14B8A6';
                  }}
                >
                  Edit Task
                </button>
                
                {task.status === 'requires_verification' && ['owner', 'admin', 'manager'].includes(userRole?.toLowerCase()) && (
                  <button 
                    onClick={() => handleVerificationReview(task.completion_id)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#d97706',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#b45309'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#d97706'}
                  >
                    Review Verification
                  </button>
                )}
                
                {task.completed && task.requires_manager_approval && !task.approved_by && task.status !== 'requires_verification' && (
                  <button 
                    onClick={() => approveTask(task.id)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#15803d'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#16a34a'}
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskAssignmentModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        business={business}
        onTaskAssigned={handleTaskAssigned}
      />

      <TaskEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
      />

      <TaskCompletionModal
        isOpen={taskCompletionModal.isOpen}
        onClose={() => setTaskCompletionModal({ isOpen: false, task: null, assignmentId: null })}
        task={taskCompletionModal.task}
        onComplete={handleTaskCompletionWithVerification}
        loading={loading}
      />

      <VerificationApprovalModal
        isOpen={verificationModal.isOpen}
        onClose={() => setVerificationModal({ isOpen: false, completionId: null, details: null })}
        completionDetails={verificationModal.details}
        onApprove={handleApproveVerification}
        onReject={handleApproveVerification}
        loading={loading}
      />
    </div>
  );
};

export default OnboardingCenter;