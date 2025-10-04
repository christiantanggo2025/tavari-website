import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const WriteupManagement = () => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Component state
  const [writeups, setWriteups] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAndBusiness();
  }, []);

  const checkUserAndBusiness = async () => {
    try {
      // Check if user is authenticated - EXACT same as HRDashboard
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Authentication error:', userError);
        navigate('/login');
        return;
      }

      setUser(user);

      // Get user's business association and role - EXACT same as HRDashboard
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
      
      // Check if user has HR permissions - EXACT same as HRDashboard
      const hasHRAccess = ['owner', 'admin', 'manager'].includes(businessUsers.role.toLowerCase());
      
      if (!hasHRAccess) {
        setError('You do not have permission to access the HR module.');
        setLoading(false);
        return;
      }

      // Load employees and writeups data
      await loadEmployees(businessUsers.business_id);
      await loadWriteups(businessUsers.business_id);
      
    } catch (error) {
      console.error('Error checking user and business:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async (businessId) => {
    try {
      // Load employees from enhanced users table - SAME pattern as HRDashboard
      const { data: employees, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          employee_number,
          department,
          position,
          employment_status,
          status,
          business_users!inner(business_id)
        `)
        .eq('business_users.business_id', businessId);

      if (error) {
        console.error('Error loading employees:', error);
        return;
      }

      // Filter to active employees only
      const activeEmployees = (employees || []).filter(emp => {
        const status = emp.employment_status || emp.status || 'active';
        return status === 'active';
      });

      setEmployees(activeEmployees);

    } catch (error) {
      console.error('Error loading employees:', error);
      setError('Failed to load employee list');
    }
  };

  const loadWriteups = async (businessId) => {
    try {
      setDataLoading(true);
      
      // For now, writeups will be stored as part of user data or separate table
      // This is a placeholder until we determine how writeups are stored
      // Since hr_writeups table was deleted, we need to determine the new structure
      
      console.log('Loading writeups for business:', businessId);
      
      // Placeholder - will be replaced with actual writeup storage solution
      setWriteups([]);
      
    } catch (error) {
      console.error('Error loading writeups:', error);
      setError('Failed to load writeup data');
    } finally {
      setDataLoading(false);
    }
  };

  // Permission checks
  const canViewWriteups = () => {
    return ['owner', 'admin', 'manager'].includes(userRole?.toLowerCase());
  };

  const canCreateWriteups = () => {
    return ['owner', 'admin', 'manager'].includes(userRole?.toLowerCase());
  };

  const canEditWriteups = () => {
    return ['owner', 'admin'].includes(userRole?.toLowerCase());
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard/hr');
  };

  // Loading state - EXACT same style as HRDashboard
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
            Loading Writeup Management...
          </p>
        </div>
      </div>
    );
  }

  // Error state - EXACT same style as HRDashboard
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

      {/* Header - SAME style as HRDashboard */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          Writeup Management
        </h1>
        <p style={{ 
          color: '#6b7280', 
          fontSize: '16px',
          margin: 0
        }}>
          Manage disciplinary actions and employee writeups
        </p>
      </div>

      {/* Controls */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '6px'
          }}>
            Filter by Employee
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #14B8A6',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
          >
            <option value="">All Employees</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.last_name}, {employee.first_name} 
                {employee.employee_number && ` (#${employee.employee_number})`}
              </option>
            ))}
          </select>
        </div>
        
        {canCreateWriteups() && (
          <button
            onClick={() => {/* Handle create writeup */}}
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
              outline: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
          >
            + New Writeup
          </button>
        )}
      </div>

      {/* Stats - SAME grid style as HRDashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827', 
            margin: '0 0 8px 0'
          }}>
            Total Writeups
          </h3>
          <p style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#14B8A6',
            margin: 0
          }}>
            {writeups.length}
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827', 
            margin: '0 0 8px 0'
          }}>
            Pending Acknowledgment
          </h3>
          <p style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#f59e0b',
            margin: 0
          }}>
            {writeups.filter(w => !w.employee_acknowledged).length}
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827', 
            margin: '0 0 8px 0'
          }}>
            Last 30 Days
          </h3>
          <p style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#3b82f6',
            margin: 0
          }}>
            {writeups.filter(w => w.created_at >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).length}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {dataLoading ? (
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center' 
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid #14B8A6',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 8px auto'
            }}></div>
            <p style={{ margin: 0, color: '#6b7280' }}>Loading writeups...</p>
          </div>
        ) : writeups.length === 0 ? (
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            color: '#6b7280' 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#111827', 
              margin: '0 0 8px 0' 
            }}>
              No Writeups Found
            </h3>
            <p style={{ 
              fontSize: '16px', 
              margin: '0 0 24px 0' 
            }}>
              {selectedEmployee ? 'No writeups for selected employee' : 'No writeups have been created yet'}
            </p>
            {!selectedEmployee && canCreateWriteups() && (
              <button
                onClick={() => {/* Handle create writeup */}}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#14B8A6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
              >
                Create First Writeup
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Writeups table will go here when writeup storage is implemented */}
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              Writeup table will be implemented once writeup storage structure is determined
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WriteupManagement;