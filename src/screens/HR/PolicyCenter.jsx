import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const PolicyCenter = () => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [policyAcknowledgments, setPolicyAcknowledgments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [error, setError] = useState(null);
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
        setError('You do not have permission to access the Policy Center.');
        setLoading(false);
        return;
      }

      // Load employees and policy data
      await loadEmployees(businessUsers.business_id);
      await loadPolicyAcknowledgments(businessUsers.business_id);
      
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

  const loadPolicyAcknowledgments = async (businessId) => {
    try {
      // Create mock policy acknowledgment data
      const policyTypes = [
        'Employee Handbook',
        'Code of Conduct',
        'Safety & Health Policy',
        'Anti-Harassment Policy',
        'Social Media Policy',
        'Confidentiality Agreement',
        'IT & Data Security Policy',
        'Workplace Violence Prevention',
        'Drug & Alcohol Policy',
        'Equal Opportunity Policy'
      ];

      const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
      
      // Create 2-4 policy assignments per active employee
      const mockPolicies = activeEmployees.flatMap(emp => {
        const numPolicies = Math.floor(Math.random() * 3) + 2; // 2-4 policies
        const selectedPolicies = [...policyTypes].sort(() => 0.5 - Math.random()).slice(0, numPolicies);
        
        return selectedPolicies.map((policyName, index) => {
          const assignedDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
          const dueDate = new Date(assignedDate.getTime() + (Math.random() * 30 + 7) * 24 * 60 * 60 * 1000);
          const acknowledged = Math.random() > 0.4;
          const acknowledgedDate = acknowledged ? new Date(assignedDate.getTime() + Math.random() * (dueDate - assignedDate)) : null;
          
          return {
            id: `policy-${emp.id}-${index}`,
            employee_id: emp.id,
            policy_name: policyName,
            policy_version: `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 5)}`,
            policy_content: `This policy outlines the standards and expectations for ${policyName.toLowerCase()} at ${business?.name || 'our organization'}. All employees must read, understand, and acknowledge compliance with these guidelines.`,
            assigned_date: assignedDate.toISOString(),
            due_date: dueDate.toISOString(),
            acknowledged: acknowledged,
            acknowledged_date: acknowledgedDate?.toISOString() || null,
            requires_renewal: Math.random() > 0.6,
            renewal_frequency_months: [12, 24, 36][Math.floor(Math.random() * 3)],
            next_renewal_date: acknowledged && Math.random() > 0.5 ? new Date(acknowledgedDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString() : null,
            notes: Math.random() > 0.7 ? 'Additional training may be required based on role responsibilities.' : null,
            created_at: assignedDate.toISOString(),
            employee_profiles: {
              id: emp.id,
              first_name: emp.first_name,
              last_name: emp.last_name,
              employee_number: emp.employee_number,
              employment_status: emp.employment_status
            },
            assigned_by_user: {
              first_name: 'HR',
              last_name: 'Manager'
            }
          };
        });
      });

      setPolicyAcknowledgments(mockPolicies.sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date)));
    } catch (error) {
      console.error('Error loading policy acknowledgments:', error);
    }
  };

  const filteredPolicies = policyAcknowledgments.filter(policy => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'acknowledged' && policy.acknowledged) ||
      (statusFilter === 'pending' && !policy.acknowledged) ||
      (statusFilter === 'overdue' && isPolicyOverdue(policy)) ||
      (statusFilter === 'due_soon' && isPolicyDueSoon(policy));
    
    const matchesEmployee = employeeFilter === 'all' || policy.employee_id === employeeFilter;
    return matchesStatus && matchesEmployee;
  });

  const getStatusBadgeStyle = (policy) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block'
    };

    if (policy.acknowledged) {
      return { ...baseStyle, backgroundColor: '#dcfce7', color: '#16a34a' };
    }
    if (isPolicyOverdue(policy)) {
      return { ...baseStyle, backgroundColor: '#fee2e2', color: '#dc2626' };
    }
    if (isPolicyDueSoon(policy)) {
      return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
    }
    return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
  };

  const getStatusText = (policy) => {
    if (policy.acknowledged) {
      return 'Acknowledged';
    }
    if (isPolicyOverdue(policy)) {
      return 'Overdue';
    }
    if (isPolicyDueSoon(policy)) {
      return 'Due Soon';
    }
    return 'Pending';
  };

  const isPolicyOverdue = (policy) => {
    return !policy.acknowledged && policy.due_date && new Date(policy.due_date) < new Date();
  };

  const isPolicyDueSoon = (policy) => {
    return !policy.acknowledged && policy.due_date && 
           new Date(policy.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
           new Date(policy.due_date) >= new Date();
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const overduePolicies = policyAcknowledgments.filter(isPolicyOverdue);
  const policiesDueSoon = policyAcknowledgments.filter(isPolicyDueSoon);

  const handleBackToDashboard = () => {
    navigate('/dashboard/hr');
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
            Loading Policy Center...
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
      {/* Add keyframes for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
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
              Policy Center
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '16px',
              margin: 0
            }}>
              {business?.name} • {filteredPolicies.length} policy assignment{filteredPolicies.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button 
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
            Create Policy
          </button>
        </div>
      </div>

      {/* Alert Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '16px',
        marginBottom: '30px'
      }}>
        {/* Overdue Policies Alert */}
        {overduePolicies.length > 0 && (
          <div style={{
            backgroundColor: '#fef2f2',
            borderLeft: '4px solid #ef4444',
            padding: '16px'
          }}>
            <div style={{ display: 'flex' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  color: '#ef4444'
                }}>
                  ❌
                </div>
              </div>
              <div style={{ marginLeft: '12px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#991b1b',
                  margin: '0 0 8px 0'
                }}>
                  {overduePolicies.length} Overdue Policy Acknowledgment{overduePolicies.length !== 1 ? 's' : ''}
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: '#b91c1c'
                }}>
                  {overduePolicies.slice(0, 3).map(policy => (
                    <div key={policy.id} style={{ marginBottom: '4px' }}>
                      • {policy.employee_profiles.first_name} {policy.employee_profiles.last_name} - {policy.policy_name} ({Math.abs(getDaysUntilDue(policy.due_date))} days overdue)
                    </div>
                  ))}
                  {overduePolicies.length > 3 && (
                    <div>And {overduePolicies.length - 3} more...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Due Soon Alert */}
        {policiesDueSoon.length > 0 && (
          <div style={{
            backgroundColor: '#fffbeb',
            borderLeft: '4px solid #f59e0b',
            padding: '16px'
          }}>
            <div style={{ display: 'flex' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  color: '#f59e0b'
                }}>
                  ⚠️
                </div>
              </div>
              <div style={{ marginLeft: '12px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#92400e',
                  margin: '0 0 8px 0'
                }}>
                  {policiesDueSoon.length} Policy Acknowledgment{policiesDueSoon.length !== 1 ? 's' : ''} Due Soon
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: '#a16207'
                }}>
                  {policiesDueSoon.slice(0, 3).map(policy => (
                    <div key={policy.id} style={{ marginBottom: '4px' }}>
                      • {policy.employee_profiles.first_name} {policy.employee_profiles.last_name} - {policy.policy_name} (due in {getDaysUntilDue(policy.due_date)} days)
                    </div>
                  ))}
                  {policiesDueSoon.length > 3 && (
                    <div>And {policiesDueSoon.length - 3} more...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <label style={{ 
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Employee
            </label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="all">All Employees</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name || `${employee.first_name} ${employee.last_name}`} (#{employee.employee_number})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ 
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Acknowledgment</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon</option>
            </select>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end'
          }}>
            <button 
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                outline: 'none',
                width: '100%'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Assign Policy
            </button>
          </div>
        </div>
      </div>

      {/* Policy List */}
      {filteredPolicies.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '48px',
          textAlign: 'center'
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
            {policyAcknowledgments.length === 0 
              ? 'No policy assignments found. Start by creating and assigning your first policy.' 
              : 'No policy assignments match your filter criteria.'}
          </p>
          {policyAcknowledgments.length === 0 && (
            <button 
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
              Create First Policy
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredPolicies.map(policy => (
            <div 
              key={policy.id} 
              style={{
                backgroundColor: isPolicyOverdue(policy) ? '#fef2f2' :
                                isPolicyDueSoon(policy) ? '#fffbeb' : 'white',
                padding: '24px',
                borderRadius: '12px',
                border: isPolicyOverdue(policy) ? '1px solid #fecaca' :
                        isPolicyDueSoon(policy) ? '1px solid #fed7aa' : '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!isPolicyOverdue(policy) && !isPolicyDueSoon(policy)) {
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                }
              }}
              onMouseOut={(e) => {
                if (!isPolicyOverdue(policy) && !isPolicyDueSoon(policy)) {
                  e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>
                      {policy.policy_name}
                    </h3>
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      v{policy.policy_version}
                    </span>
                    <span style={getStatusBadgeStyle(policy)}>
                      {getStatusText(policy)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '0 0 4px 0'
                  }}>
                    Assigned to: {policy.employee_profiles?.first_name} {policy.employee_profiles?.last_name} (#{policy.employee_profiles?.employee_number})
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#9ca3af',
                    margin: 0
                  }}>
                    Assigned by {policy.assigned_by_user?.first_name} {policy.assigned_by_user?.last_name} on {new Date(policy.assigned_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    margin: '0 0 4px 0'
                  }}>
                    Assigned Date
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {new Date(policy.assigned_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    margin: '0 0 4px 0'
                  }}>
                    Due Date
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: isPolicyOverdue(policy) ? '#dc2626' :
                           isPolicyDueSoon(policy) ? '#d97706' : '#6b7280',
                    fontWeight: isPolicyOverdue(policy) || isPolicyDueSoon(policy) ? '500' : 'normal',
                    margin: 0
                  }}>
                    {policy.due_date ? new Date(policy.due_date).toLocaleDateString() : 'No deadline'}
                    {policy.due_date && !policy.acknowledged && (
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>
                        ({getDaysUntilDue(policy.due_date) > 0 
                          ? `${getDaysUntilDue(policy.due_date)} days left`
                          : `${Math.abs(getDaysUntilDue(policy.due_date))} days overdue`
                        })
                      </div>
                    )}
                  </p>
                </div>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    margin: '0 0 4px 0'
                  }}>
                    Acknowledged
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: policy.acknowledged ? '#16a34a' : '#dc2626',
                    margin: 0
                  }}>
                    {policy.acknowledged 
                      ? `Yes - ${new Date(policy.acknowledged_date).toLocaleDateString()}`
                      : 'Not yet'
                    }
                  </p>
                </div>
              </div>

              {policy.requires_renewal && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '6px',
                  borderLeft: '4px solid #3b82f6'
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#1e40af',
                    margin: 0
                  }}>
                    <strong>Renewal Required:</strong> Every {policy.renewal_frequency_months} months
                    {policy.next_renewal_date && (
                      <span> • Next renewal: {new Date(policy.next_renewal_date).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
              )}

              {policy.notes && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px'
                }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    margin: '0 0 4px 0'
                  }}>
                    Notes:
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {policy.notes}
                  </p>
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <button style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  outline: 'none'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                  View Policy
                </button>
                <button style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  backgroundColor: '#14B8A6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  outline: 'none'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
                >
                  Edit Assignment
                </button>
                {!policy.acknowledged && (
                  <button style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                  >
                    Send Reminder
                  </button>
                )}
                {policy.acknowledged && (
                  <button style={{
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
                    Re-assign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PolicyCenter;