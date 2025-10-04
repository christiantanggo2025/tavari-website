// src/screens/Dashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import { useBusiness } from "../contexts/BusinessContext";
import useAccessProtection from '../hooks/useAccessProtection';
import SessionManager from '../components/SessionManager';
import HelcimTerminalWorkflow from '../components/POS/HelcimTerminalWorkflow';
import HelcimBackendIntegration from '../components/POS/HelcimBackendIntegration';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, roleInfo, loading } = useUserProfile();
  const { business } = useBusiness();
  useAccessProtection(profile);

  React.useEffect(() => {
    const logProfileAccess = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('Session error:', sessionError.message);
        }

        const authUserId = session?.user?.id;
        if (!authUserId) {
          console.warn('No auth user found for logging.');
          return;
        }

        const { error } = await supabase.from('audit_logs').insert({
          user_id: authUserId,
          event_type: 'user_profile_access',
          timestamp: new Date().toISOString(),
          details: JSON.stringify({
            page: 'dashboard',
          }),
        });

        if (error) {
          console.error('Audit log insert failed:', error.message);
        } else {
          console.log('Logged /me access from Dashboard.');
        }
      } catch (err) {
        console.error('Unexpected error in audit logging:', err.message);
      }
    };

    setTimeout(() => {
      logProfileAccess();
    }, 500);
  }, []);

  const handleLogout = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const fallbackId = session?.user?.id;
    const userId = profile?.id || fallbackId;

    if (userId) {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: userId,
        event_type: 'logout',
        details: JSON.stringify({
          reason: 'user clicked logout',
        }),
      });

      if (error) {
        console.error('Audit log insert failed:', error.message);
      } else {
        console.log('Logout event logged successfully.');
      }
    } else {
      console.warn('Could not determine user ID for logout log.');
    }

    await supabase.auth.signOut();
    navigate('/login');
  };

  const handlePaymentComplete = (result) => {
    console.log('Helcim payment completed:', result);
    
    // You can add additional handling here such as:
    // - Update POS cart
    // - Save transaction to database
    // - Print receipt
    // - Show success message
    
    if (result.success) {
      alert(`Payment successful! Transaction ID: ${result.transactionId}`);
    } else {
      alert(`Payment failed: ${result.error}`);
    }
  };

  return (
    <SessionManager>
      <div style={styles.container}>
        <h2>Dashboard</h2>
          {profile && business?.id ? (
            <>
              <p><strong>Name:</strong> {profile.full_name}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Live Role:</strong> {roleInfo?.role || 'None'}</p>
              <p><strong>Business:</strong> {roleInfo?.business_name || 'Unknown'}</p>

            {roleInfo?.role === 'manager' && (
              <p style={{ color: 'green', fontWeight: 'bold' }}>Manager Access Enabled</p>
            )}
          </>
        ) : (
          <p>Loading user info...</p>
        )}
        
        <div style={styles.buttonContainer}>
          {(profile?.roles?.includes('owner') || profile?.roles?.includes('admin')) && (
            <>
              <div style={styles.kpiSection}>
                <div style={styles.kpiCard}>
                  <h3>Total Sales</h3>
                  <p>$12,345</p>
                </div>
                <div style={styles.kpiCard}>
                  <h3>Active Users</h3>
                  <p>87</p>
                </div>
                <div style={styles.kpiCard}>
                  <h3>Conversion Rate</h3>
                  <p>5.3%</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Helcim Terminal Integration Section */}
        {business?.id && (
          <div style={styles.helcimSection}>
            <HelcimTerminalWorkflow 
              businessId={business.id} 
              onPaymentComplete={handlePaymentComplete}
            />
            
            {/* Integration Guide - can be hidden after setup */}
            <div style={styles.integrationGuide}>
              <HelcimBackendIntegration />
            </div>
          </div>
        )}
      </div>
    </SessionManager>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '100px',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    marginTop: '20px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#FF4C4C',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  kpiSection: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '40px',
    flexWrap: 'wrap',
  },
  kpiCard: {
    backgroundColor: '#f0f0f0',
    padding: '20px',
    borderRadius: '8px',
    width: '200px',
    textAlign: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
  },
  helcimSection: {
    marginTop: '40px',
    maxWidth: '1200px',
    margin: '40px auto',
  },
  integrationGuide: {
    marginTop: '40px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    border: '2px solid #e5e7eb'
  }
};

export default Dashboard;