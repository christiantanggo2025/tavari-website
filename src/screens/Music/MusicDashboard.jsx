// src/screens/Music/MusicDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMusic, FiUpload, FiList, FiSettings, FiLock } from 'react-icons/fi';
import AudioPlayer from '../../components/Music/AudioPlayer';
import SystemMonitor from '../../components/Music/SystemMonitor';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useBusiness } from '../../contexts/BusinessContext';
import useAccessProtection from '../../hooks/useAccessProtection';
import SessionManager from '../../components/SessionManager';
import { supabase } from '../../supabaseClient';
import bcrypt from 'bcryptjs';

const MusicDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { business } = useBusiness();
  useAccessProtection(profile);

  const [isLocked, setIsLocked] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!profile?.id || !business?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('business_id', business.id)
          .eq('active', true)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          return;
        }

        if (data) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
      }
    };

    fetchUserRole();
  }, [profile?.id, business?.id]);

  // Check if user has music access permissions
  const hasAccess = () => {
    if (!userRole) return false;
    const role = userRole.toLowerCase();
    return ['manager', 'admin', 'owner'].includes(role);
  };

  // Handle PIN unlock (similar to Unlock.jsx)
  const handleUnlock = async () => {
    if (!pinInput || pinInput.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    // Get stored PIN from user profile
    let storedPin = profile?.pin;

    if (!storedPin && profile?.id) {
      const { data: userRow } = await supabase
        .from('users')
        .select('pin')
        .eq('id', profile.id)
        .maybeSingle();

      storedPin = userRow?.pin;
    }

    if (!storedPin) {
      setError('No PIN configured for your account');
      return;
    }

    try {
      const pinMatches = await bcrypt.compare(pinInput, storedPin);

      if (pinMatches) {
        setIsLocked(false);
        setError('');
        setFailedAttempts(0);
        setPinInput('');

        // Log successful unlock
        try {
          await supabase.from('audit_logs').insert([{
            user_id: profile?.id,
            business_id: business?.id,          // ✅ include tenant
            action: 'music_dashboard_unlock',
            details: {
              method: 'pin_unlock',
              time: new Date().toISOString(),
            },
          }]);
        } catch (logError) {
          console.error('Error logging successful unlock:', logError);
        }

      } else {
        const newFailedCount = failedAttempts + 1;
        setFailedAttempts(newFailedCount);
        setPinInput('');

        // Log failed attempt
        try {
          await supabase.from('audit_logs').insert([{
            user_id: profile?.id,
            business_id: business?.id,          // ✅ include tenant
            action: 'failed_music_pin',
            details: {
              attempt: newFailedCount,
              time: new Date().toISOString(),
            },
          }]);
        } catch (logError) {
          console.error('Error logging failed attempt:', logError);
        }

        // Check for suspicious activity (3+ attempts in 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: recentFailures } = await supabase
          .from('audit_logs')
          .select('id')
          .eq('user_id', profile?.id)
          .eq('action', 'failed_music_pin')
          .gte('created_at', tenMinutesAgo);  // ✅ most schemas use created_at

        if (recentFailures && recentFailures.length >= 3) {
          try {
            await supabase.from('audit_logs').insert([{
              user_id: profile?.id,
              business_id: business?.id,        // ✅ include tenant
              action: 'suspicious_activity',
              details: {
                type: 'Music dashboard PIN brute force attempt',
                attempts: recentFailures.length,
                window: '10min',
                triggeredAt: new Date().toISOString(),
              },
            }]);
          } catch (logError) {
            console.error('Error logging suspicious activity:', logError);
          }
        }

        if (newFailedCount >= 3) {
          setError('Too many failed attempts. Contact an administrator.');
        } else {
          setError(`Incorrect PIN. Attempt ${newFailedCount} of 3.`);
        }
      }
    } catch (error) {
      console.error('Error comparing PIN:', error);
      setError('Error validating PIN. Please try again.');
    }
  };

  // Don't render if user doesn't have access
  if (!hasAccess()) {
    return (
      <SessionManager>
        <div style={styles.container}>
          <div style={styles.noAccess}>
            <FiLock size={48} style={styles.lockIcon} />
            <h2 style={styles.noAccessTitle}>Access Denied</h2>
            <p style={styles.noAccessText}>
              You do not have permission to access the Music Dashboard.
            </p>
            <p style={styles.roleText}>
              Current role: {userRole || 'Unknown'}
            </p>
            <p style={styles.accessInfo}>
              Required roles: Manager, Admin, or Owner
            </p>
          </div>
        </div>
      </SessionManager>
    );
  }

  return (
    <SessionManager>
      <div style={styles.container}>
        {/* PIN Entry Modal */}
        {isLocked && (
          <div style={styles.lockOverlay}>
            <div style={styles.lockModal}>
              <FiLock size={48} style={styles.modalLockIcon} />
              <h2 style={styles.lockTitle}>Music Dashboard Locked</h2>
              <p style={styles.lockSubtitle}>
                Please enter your 4-digit PIN to continue.
              </p>
              
              <input
                type="password"
                maxLength={4}
                style={styles.pinInput}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleUnlock();
                  }
                }}
                placeholder="••••"
                autoFocus
              />

              <button 
                onClick={handleUnlock} 
                style={styles.unlockButton}
                disabled={failedAttempts >= 3}
              >
                {failedAttempts >= 3 ? 'Locked' : 'Unlock'}
              </button>

              {error && <p style={styles.errorText}>{error}</p>}
              
              <div style={styles.attemptsText}>
                Attempts: {failedAttempts}/3
              </div>
            </div>
          </div>
        )}

        <div style={styles.header}>
          <FiMusic size={32} style={styles.headerIcon} />
          <h1 style={styles.title}>Tavari Music Dashboard</h1>
          <p style={styles.subtitle}>
            {business?.name ? `Managing music for ${business.name}` : 'Music Management System'}
          </p>
        </div>
		
        {/* Quick Actions Section */}
        <div style={styles.actionsSection}>
          <div style={styles.actionsGrid}>
            <div 
              style={styles.actionCard}
              onClick={() => navigate('/dashboard/music/upload')}
            >
              <FiUpload size={32} style={styles.actionIcon} />
              <h3 style={styles.actionTitle}>Upload Music</h3>
              <p style={styles.actionDescription}>
                Add new songs to your music library
              </p>
            </div>
            
            <div 
              style={styles.actionCard}
              onClick={() => navigate('/dashboard/music/library')}
            >
              <FiMusic size={32} style={styles.actionIcon} />
              <h3 style={styles.actionTitle}>Music Library</h3>
              <p style={styles.actionDescription}>
                View and manage your song collection
              </p>
            </div>
            
            <div 
              style={styles.actionCard}
              onClick={() => navigate('/dashboard/music/playlists')}
            >
              <FiList size={32} style={styles.actionIcon} />
              <h3 style={styles.actionTitle}>Playlists</h3>
              <p style={styles.actionDescription}>
                Create and manage custom playlists
              </p>
            </div>
            
            <div 
              style={styles.actionCard}
              onClick={() => navigate('/dashboard/music/settings')}
            >
              <FiSettings size={32} style={styles.actionIcon} />
              <h3 style={styles.actionTitle}>Music Settings</h3>
              <p style={styles.actionDescription}>
                Configure volume, shuffle, and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Full Width Music Player */}
        <div style={styles.playerSection}>
          <h3 style={styles.playerTitle}>Music Player</h3>
          <div style={styles.fullWidthPlayer}>
            <AudioPlayer />
          </div>
        </div>
		
        {/* System Monitor */}
        <div style={styles.monitorSection}>
          <SystemMonitor />
        </div>
      </div>
    </SessionManager>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  noAccess: {
    textAlign: 'center',
    padding: '60px 40px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '2px solid #e9ecef',
    margin: '40px auto',
    maxWidth: '500px',
  },
  lockIcon: {
    color: '#6c757d',
    marginBottom: '20px',
  },
  noAccessTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 15px 0',
  },
  noAccessText: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 10px 0',
    lineHeight: '1.5',
  },
  roleText: {
    fontSize: '14px',
    color: '#999',
    margin: '10px 0',
  },
  accessInfo: {
    fontSize: '14px',
    color: '#20c997',
    fontWeight: '500',
    margin: '15px 0 0 0',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e9ecef',
  },
  headerIcon: {
    color: '#20c997',
    marginBottom: '10px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  },
  actionsSection: {
    marginBottom: '40px',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '2px solid #e9ecef',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionIcon: {
    color: '#20c997',
    marginBottom: '15px',
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  actionDescription: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
    lineHeight: '1.4',
  },
  playerSection: {
    marginBottom: '40px',
  },
  playerTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
    textAlign: 'center',
  },
  fullWidthPlayer: {
    width: '100%',
  },
  monitorSection: {
    marginBottom: '40px',
  },
  
  // Lock overlay styles
  lockOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  lockModal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  modalLockIcon: {
    color: '#20c997',
    marginBottom: '20px',
  },
  lockTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  lockSubtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 30px 0',
  },
  pinInput: {
    fontSize: '24px',
    padding: '15px',
    textAlign: 'center',
    width: '120px',
    margin: '0 auto 20px auto',
    display: 'block',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontFamily: 'monospace',
    letterSpacing: '8px',
  },
  unlockButton: {
    padding: '12px 30px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#20c997',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '15px',
    transition: 'background-color 0.2s',
  },
  errorText: {
    color: '#dc3545',
    fontSize: '14px',
    margin: '10px 0',
    fontWeight: '500',
  },
  attemptsText: {
    fontSize: '12px',
    color: '#999',
    margin: '10px 0 0 0',
  },
  
  // Responsive breakpoints
  '@media (max-width: 768px)': {
    actionsGrid: {
      gridTemplateColumns: '1fr',
      gap: '15px',
    },
  },
};

export default MusicDashboard;