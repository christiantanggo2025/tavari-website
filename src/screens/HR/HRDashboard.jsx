import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const HRDashboard = () => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null);
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
        setError('You do not have permission to access the HR module.');
        setLoading(false);
        return;
      }

      // Load dashboard statistics
      await loadDashboardStats(businessUsers.business_id);
      
    } catch (error) {
      console.error('Error checking user and business:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (businessId) => {
    try {
      // Calculate stats directly from users table
      const { data: employees, error } = await supabase
        .from('users')
        .select(`
          id,
          employment_status,
          status,
          hire_date,
          start_date,
          business_users!inner(business_id)
        `)
        .eq('business_users.business_id', businessId);

      if (error) {
        console.error('Error loading employees for stats:', error);
        setDashboardStats({
          total_employees: 0,
          employees_on_probation: 0,
          pending_onboarding: 0,
          overdue_policies: 0,
          expiring_contracts: 0,
          expiring_documents: 0
        });
        return;
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

      // Calculate statistics
      const totalEmployees = employees.filter(emp => {
        const status = emp.employment_status || emp.status || 'active';
        return status === 'active';
      }).length;

      const employeesOnProbation = employees.filter(emp => {
        const status = emp.employment_status || emp.status || 'active';
        const hireDate = emp.hire_date || emp.start_date;
        if (status !== 'active' || !hireDate) return false;
        const hire = new Date(hireDate);
        return hire > ninetyDaysAgo;
      }).length;

      const pendingOnboarding = employees.filter(emp => {
        const status = emp.employment_status || emp.status || 'active';
        const hireDate = emp.hire_date || emp.start_date;
        if (status !== 'active' || !hireDate) return false;
        const hire = new Date(hireDate);
        return hire > thirtyDaysAgo;
      }).length;

      setDashboardStats({
        total_employees: totalEmployees,
        employees_on_probation: employeesOnProbation,
        pending_onboarding: pendingOnboarding,
        overdue_policies: 0, // Placeholder until policy system is built
        expiring_contracts: 0, // Placeholder until contract system is built
        expiring_documents: 0 // Placeholder until document system is built
      });

    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      setDashboardStats({
        total_employees: 0,
        employees_on_probation: 0,
        pending_onboarding: 0,
        overdue_policies: 0,
        expiring_contracts: 0,
        expiring_documents: 0
      });
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard/home');
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
            Loading HR Dashboard...
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
            Return to Dashboard
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
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          HR & Compliance Dashboard
        </h1>
        <p style={{ 
          color: '#6b7280', 
          fontSize: '16px',
          margin: 0
        }}>
          {business?.name} • {userRole}
        </p>
      </div>

      {/* Stats Grid */}
      {dashboardStats && (
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
              Total Employees
            </h3>
            <p style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#14B8A6',
              margin: 0
            }}>
              {dashboardStats.total_employees}
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
              On Probation
            </h3>
            <p style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#f59e0b',
              margin: 0
            }}>
              {dashboardStats.employees_on_probation}
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
              New Hires (30 days)
            </h3>
            <p style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#3b82f6',
              margin: 0
            }}>
              {dashboardStats.pending_onboarding}
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
              Policy Items
            </h3>
            <p style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#ef4444',
              margin: 0
            }}>
              {dashboardStats.overdue_policies}
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
              Contract Items
            </h3>
            <p style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#eab308',
              margin: 0
            }}>
              {dashboardStats.expiring_contracts}
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
              Document Items
            </h3>
            <p style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#8b5cf6',
              margin: 0
            }}>
              {dashboardStats.expiring_documents}
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions - 3x Grid Layout (Tavari Standard) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        <button 
          onClick={() => handleNavigation('/dashboard/hr/employees')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            Employee Profiles
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Manage employee information
          </p>
        </button>
        
        <button 
          onClick={() => handleNavigation('/dashboard/hr/onboarding')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            Onboarding Center
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Track new hire progress
          </p>
        </button>

        <button 
          onClick={() => handleNavigation('/dashboard/hr/milestones')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            Milestone Tracking
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Track onboarding milestones and celebrate achievements
          </p>
        </button>

        <button 
          onClick={() => handleNavigation('/dashboard/hr/orientation')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            Orientation Calendar
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Schedule and track orientations
          </p>
        </button>
        
        <button 
          onClick={() => handleNavigation('/dashboard/hr/contracts')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            Contracts
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Manage employment contracts
          </p>
        </button>
        
        <button 
          onClick={() => handleNavigation('/dashboard/hr/policies')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            Policy Center
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Policies & acknowledgments
          </p>
        </button>

        <button 
          onClick={() => handleNavigation('/dashboard/hr/writeups')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            Disciplinary Actions
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Manage writeups & warnings
          </p>
        </button>

        <button 
          onClick={() => handleNavigation('/dashboard/hr/document-expiry')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            Document Expiry Tracker
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Monitor certifications and wage premiums
          </p>
        </button>

        <button 
          onClick={() => handleNavigation('/dashboard/hr/settings')}
          style={{
            backgroundColor: 'white',
            border: '2px solid #14B8A6',
            padding: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            outline: 'none',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0fdfa';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px 0 rgba(20, 184, 166, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <h4 style={{ 
            fontWeight: '600', 
            color: '#374151',
            margin: '0 0 8px 0',
            fontSize: '18px'
          }}>
            HR Settings
          </h4>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Configure HR preferences
          </p>
        </button>
      </div>
    </div>
  );
};

export default HRDashboard;