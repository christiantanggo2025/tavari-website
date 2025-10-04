// components/TavariAdminComp/TOSAHeaderBar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiUser, FiLogOut, FiShield, FiSettings, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import TOSABusinessSelector from './TOSABusinessSelector';

const TOSAHeaderBar = () => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [systemStatus, setSystemStatus] = useState('healthy');

  useEffect(() => {
    loadEmployeeData();
    loadNotifications();
    checkSystemStatus();
  }, []);

  const loadEmployeeData = () => {
    try {
      const employeeData = localStorage.getItem('tosa_employee');
      if (employeeData) {
        setEmployee(JSON.parse(employeeData));
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  const loadNotifications = async () => {
    // Simulate loading notifications
    const mockNotifications = [
      {
        id: 1,
        type: 'security',
        title: 'Security Alert',
        message: 'Multiple failed login attempts detected',
        time: '5 minutes ago',
        unread: true
      },
      {
        id: 2,
        type: 'support',
        title: 'New Support Ticket',
        message: 'Payment processing issue reported',
        time: '1 hour ago',
        unread: true
      },
      {
        id: 3,
        type: 'system',
        title: 'System Update',
        message: 'Scheduled maintenance completed successfully',
        time: '3 hours ago',
        unread: false
      }
    ];
    setNotifications(mockNotifications);
  };

  const checkSystemStatus = async () => {
    try {
      // Check database connectivity
      const { data, error } = await supabase.from('businesses').select('id').limit(1);
      setSystemStatus(error ? 'warning' : 'healthy');
    } catch (error) {
      setSystemStatus('error');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('tosa_employee');
      navigate('/employeeportal');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, unread: false } : notif
      )
    );
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'healthy': return TavariStyles.colors.success;
      case 'warning': return TavariStyles.colors.warning;
      case 'error': return TavariStyles.colors.danger;
      default: return TavariStyles.colors.gray400;
    }
  };

  const styles = {
    header: {
      position: 'fixed',
      top: 0,
      left: '250px', // Account for sidebar
      right: 0,
      height: '80px',
      backgroundColor: TavariStyles.colors.white,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${TavariStyles.spacing.xl}`,
      zIndex: 20,
      boxShadow: TavariStyles.shadows.sm
    },

    leftSection: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.lg
    },

    rightSection: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.lg
    },

    systemStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      padding: `${TavariStyles.spacing.sm} ${TavariStyles.spacing.md}`,
      borderRadius: TavariStyles.borderRadius.md,
      backgroundColor: TavariStyles.colors.gray50,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },

    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: getStatusColor()
    },

    statusText: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },

    iconButton: {
      position: 'relative',
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.md,
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: TavariStyles.colors.gray600,
      transition: TavariStyles.transitions.normal,
      fontSize: '18px'
    },

    iconButtonHover: {
      backgroundColor: TavariStyles.colors.gray100,
      color: TavariStyles.colors.gray800
    },

    notificationBadge: {
      position: 'absolute',
      top: '2px',
      right: '2px',
      backgroundColor: TavariStyles.colors.danger,
      color: TavariStyles.colors.white,
      borderRadius: '50%',
      width: '18px',
      height: '18px',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: TavariStyles.typography.fontWeight.bold
    },

    dropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      boxShadow: TavariStyles.shadows.lg,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      minWidth: '300px',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 30
    },

    dropdownHeader: {
      padding: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800
    },

    notificationItem: {
      padding: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal
    },

    notificationItemHover: {
      backgroundColor: TavariStyles.colors.gray50
    },

    notificationTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },

    notificationMessage: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xs
    },

    notificationTime: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500
    },

    unreadIndicator: {
      width: '8px',
      height: '8px',
      backgroundColor: TavariStyles.colors.primary,
      borderRadius: '50%',
      display: 'inline-block',
      marginRight: TavariStyles.spacing.sm
    },

    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      padding: TavariStyles.spacing.sm,
      borderRadius: TavariStyles.borderRadius.md,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal
    },

    userAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: TavariStyles.colors.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: TavariStyles.colors.white,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },

    userName: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray800
    },

    userRole: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500
    },

    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      padding: TavariStyles.spacing.md,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal,
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700
    }
  };

  return (
    <div style={styles.header}>
      <div style={styles.leftSection}>
        {/* Business Selector */}
        <TOSABusinessSelector />
        
        {/* System Status */}
        <div style={styles.systemStatus}>
          <div style={styles.statusDot}></div>
          <span style={styles.statusText}>
            System {systemStatus === 'healthy' ? 'Healthy' : systemStatus === 'warning' ? 'Warning' : 'Error'}
          </span>
          <button
            style={styles.iconButton}
            onClick={checkSystemStatus}
            title="Refresh system status"
          >
            <FiRefreshCw size={14} />
          </button>
        </div>
      </div>

      <div style={styles.rightSection}>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            style={styles.iconButton}
            onClick={() => setShowNotifications(!showNotifications)}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.iconButtonHover)}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = TavariStyles.colors.gray600;
            }}
          >
            <FiBell />
            {unreadCount > 0 && (
              <span style={styles.notificationBadge}>{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                Notifications ({unreadCount} unread)
              </div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={styles.notificationItem}
                  onClick={() => markNotificationAsRead(notification.id)}
                  onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.notificationItemHover)}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={styles.notificationTitle}>
                    {notification.unread && <span style={styles.unreadIndicator}></span>}
                    {notification.title}
                  </div>
                  <div style={styles.notificationMessage}>{notification.message}</div>
                  <div style={styles.notificationTime}>{notification.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <div
            style={styles.userInfo}
            onClick={() => setShowUserMenu(!showUserMenu)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = TavariStyles.colors.gray50}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={styles.userAvatar}>
              {employee?.full_name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div>
              <div style={styles.userName}>
                {employee?.full_name || 'Tavari Employee'}
              </div>
              <div style={styles.userRole}>
                {employee?.role || 'Admin'}
              </div>
            </div>
          </div>

          {showUserMenu && (
            <div style={styles.dropdown}>
              <div
                style={styles.menuItem}
                onClick={() => setShowUserMenu(false)}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.notificationItemHover)}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FiUser />
                Profile Settings
              </div>
              <div
                style={styles.menuItem}
                onClick={() => setShowUserMenu(false)}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.notificationItemHover)}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FiSettings />
                Admin Settings
              </div>
              <div
                style={{ ...styles.menuItem, borderTop: `1px solid ${TavariStyles.colors.gray200}` }}
                onClick={handleLogout}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.notificationItemHover)}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FiLogOut />
                Logout
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside handlers */}
      {(showNotifications || showUserMenu) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10
          }}
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default TOSAHeaderBar;