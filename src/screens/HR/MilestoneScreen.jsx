import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const MilestoneScreen = () => {
  const navigate = useNavigate();
  
  // Authentication state - EXACTLY like TabScreen
  const [authUser, setAuthUser] = useState(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Authentication and business context setup - EXACTLY like TabScreen
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('MilestoneScreen: Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('MilestoneScreen: Session check result:', { session: !!session, error });

        if (error || !session?.user) {
          console.error('MilestoneScreen: No valid session, redirecting to login');
          navigate('/login');
          return;
        }

        setAuthUser(session.user);
        console.log('MilestoneScreen: Authenticated as:', session.user.email);

        const currentBusinessId = localStorage.getItem('currentBusinessId');
        console.log('MilestoneScreen: Business ID from localStorage:', currentBusinessId);

        if (!currentBusinessId) {
          setAuthError('No business selected');
          return;
        }

        setSelectedBusinessId(currentBusinessId);

        // Verify user has access to this business
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('business_id', currentBusinessId)
          .eq('active', true)
          .single();

        if (roleError || !userRole) {
          console.error('MilestoneScreen: User not authorized for this business:', roleError);
          setAuthError('Not authorized for this business');
          return;
        }

        console.log('MilestoneScreen: User role verified:', userRole.role);
        setAuthLoading(false);

      } catch (err) {
        console.error('MilestoneScreen: Authentication error:', err);
        setAuthError(err.message);
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, [navigate]);

  useEffect(() => {
    if (selectedBusinessId) {
      fetchEmployeesWithOnboarding();
    }
  }, [selectedBusinessId]);

  const fetchEmployeesWithOnboarding = async () => {
    if (!selectedBusinessId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_employees_with_onboarding_assignments', {
          p_business_id: selectedBusinessId
        });

      if (error) {
        console.error('Error fetching employees:', error);
        setEmployees([]);
      } else {
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Error in fetchEmployeesWithOnboarding:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Loading and error states - EXACTLY like TabScreen
  if (authLoading) {
    return (
      <div style={{...styles.container, justifyContent: 'center', alignItems: 'center'}}>
        <h3>Loading Milestone Tracking...</h3>
        <p>Authenticating user and loading business data...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{...styles.container, justifyContent: 'center', alignItems: 'center'}}>
        <h3>Authentication Error</h3>
        <p>{authError}</p>
        <button 
          style={styles.createButton}
          onClick={() => navigate('/login')}
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: '#374151', 
          margin: '0 0 10px 0' 
        }}>
          Onboarding Milestone Tracking
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6B7280', 
          margin: '0' 
        }}>
          Track employee onboarding progress and celebrate achievements
        </p>
      </div>

      {/* Primary Actions - Full Width Buttons */}
      <div style={{ marginBottom: '30px' }}>
        <button
          style={{
            width: '100%',
            padding: '16px 24px',
            backgroundColor: '#14B8A6',
            color: 'white',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            marginBottom: '15px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#0F9D8F';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px rgba(20, 184, 166, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#14B8A6';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          🎉 View Recent Celebrations
        </button>
      </div>

      {/* Employee Cards - 3x Grid Layout */}
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#6B7280' 
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}>
            Loading employees...
          </div>
        </div>
      ) : employees.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#6B7280' 
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}>
            No employees with onboarding assignments found
          </div>
          <p>Assign onboarding tasks to employees to track their progress here.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#374151',
              margin: '0'
            }}>
              Employees in Onboarding ({employees.length})
            </h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {employees.map((employee) => (
              <button
                key={employee.user_id}
                style={{
                  backgroundColor: 'white',
                  border: '2px solid #14B8A6',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#F0FDFA';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(20, 184, 166, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  {employee.full_name}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  marginBottom: '12px'
                }}>
                  {employee.total_tasks} tasks • {employee.completion_percentage}% complete
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${employee.completion_percentage}%`,
                    height: '100%',
                    backgroundColor: '#14B8A6',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Summary Stats */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#374151',
          marginBottom: '15px'
        }}>
          Milestone Summary
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#14B8A6' }}>
              {employees.length}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              Total Employees
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#14B8A6' }}>
              {employees.reduce((sum, emp) => sum + (emp.total_tasks || 0), 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              Total Tasks
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#14B8A6' }}>
              {employees.length > 0 ? Math.round(employees.reduce((sum, emp) => sum + (emp.completion_percentage || 0), 0) / employees.length) : 0}%
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              Average Progress
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles matching TabScreen pattern
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    paddingTop: '100px',
    boxSizing: 'border-box'
  },
  createButton: {
    padding: '12px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  }
};

export default MilestoneScreen;