// components/SidebarNav.jsx - Updated with auto-collapse functionality
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiUsers, FiUser, FiBarChart2, FiMusic, FiMail, FiChevronDown, FiChevronRight, FiClipboard, FiPieChart } from 'react-icons/fi';
import { TavariStyles } from '../utils/TavariStyles';
import { usePOSAuth } from '../hooks/usePOSAuth';
import PageLockModal from './PageLockModal';

const SidebarNav = ({ onNavigate }) => {
  // Single state to track which category is expanded (only one at a time)
  const [expandedCategory, setExpandedCategory] = useState(null);
  const navigate = useNavigate();

  // PIN protection state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [pinModalTitle, setPinModalTitle] = useState('');

  // Get user role for access control
  const { userRole, isManager, isOwner } = usePOSAuth({
    requiredRoles: null, // Allow any authenticated user to see sidebar
    requireBusiness: true,
    componentName: 'SidebarNav'
  });

  // Check if user can access employee management (manager, admin, owner only)
  const canAccessEmployees = userRole === 'manager' || userRole === 'admin' || userRole === 'owner' || isManager || isOwner;

  // List of pages that require PIN protection
  const protectedPages = [
    '/dashboard/employees',
    '/dashboard/pos/inventory',
    '/dashboard/pos/categories',
    '/dashboard/pos/modifiers',
    '/dashboard/pos/stations',
    '/dashboard/pos/discounts',
    '/dashboard/pos/settings',
    '/dashboard/pos/loyalty-settings',
    '/dashboard/music/dashboard',
    '/dashboard/music/upload',
    '/dashboard/music/library',
    '/dashboard/music/playlists',
    '/dashboard/music/schedules',
    '/dashboard/music/ads/dashboard',
    '/dashboard/music/settings',
    '/dashboard/mail/dashboard',
    '/dashboard/mail/campaigns',
    '/dashboard/mail/contacts',
    '/dashboard/mail/builder',
    '/dashboard/mail/templates',
    '/dashboard/mail/compliance',
    '/dashboard/mail/billing',
    '/dashboard/mail/settings',
    '/dashboard/hr/dashboard',
    '/dashboard/hr/payroll',
    '/dashboard/hr/employees',
    '/dashboard/hr/contracts',
    '/dashboard/hr/onboarding',
    '/dashboard/hr/writeups',
    '/dashboard/hr/policies',
    '/dashboard/hr/settings',
    '/dashboard/reports',
    '/dashboard/reports/automation',
    '/dashboard/audit-logs'
  ];

  // Get page title for PIN modal
  const getPageTitle = (path) => {
    const titles = {
      '/dashboard/employees': 'Employee Directory Access',
      '/dashboard/pos/inventory': 'POS Inventory Access',
      '/dashboard/pos/categories': 'Category Management Access',
      '/dashboard/pos/modifiers': 'Modifiers Management Access',
      '/dashboard/pos/stations': 'Station Management Access',
      '/dashboard/pos/discounts': 'Discount Management Access',
      '/dashboard/pos/settings': 'POS Settings Access',
      '/dashboard/pos/loyalty-settings': 'Loyalty Settings Access',
      '/dashboard/music/dashboard': 'Music Dashboard Access',
      '/dashboard/music/upload': 'Music Upload Access',
      '/dashboard/music/library': 'Music Library Access',
      '/dashboard/music/playlists': 'Playlists Access',
      '/dashboard/music/schedules': 'Schedule Management Access',
      '/dashboard/music/ads/dashboard': 'Ad Manager Access',
      '/dashboard/music/settings': 'Music Settings Access',
      '/dashboard/mail/dashboard': 'Mail Dashboard Access',
      '/dashboard/mail/campaigns': 'Campaign Management Access',
      '/dashboard/mail/contacts': 'Contact Management Access',
      '/dashboard/mail/builder': 'Campaign Builder Access',
      '/dashboard/mail/templates': 'Template Management Access',
      '/dashboard/mail/compliance': 'Compliance Center Access',
      '/dashboard/mail/billing': 'Billing & Usage Access',
      '/dashboard/mail/settings': 'Mail Settings Access',
      '/dashboard/hr/dashboard': 'HR Dashboard Access',
      '/dashboard/hr/payroll': 'Payroll Management Access',
      '/dashboard/hr/employees': 'Employee Profiles Access',
      '/dashboard/hr/contracts': 'Contract Management Access',
      '/dashboard/hr/onboarding': 'Onboarding Center Access',
      '/dashboard/hr/writeups': 'Disciplinary Actions Access',
      '/dashboard/hr/policies': 'Policy Center Access',
      '/dashboard/hr/settings': 'HR Settings Access',
      '/dashboard/reports': 'Reports Dashboard Access',
      '/dashboard/reports/automation': 'Report Automation Access',
      '/dashboard/audit-logs': 'Audit Log Viewer Access'
    };
    return titles[path] || 'Protected Page Access';
  };

  // Handle category expansion with auto-collapse
  const handleCategoryToggle = (categoryName) => {
    if (expandedCategory === categoryName) {
      // If clicking on already expanded category, collapse it
      setExpandedCategory(null);
    } else {
      // If clicking on a different category, expand it (auto-collapses others)
      setExpandedCategory(categoryName);
    }
  };

  // Handle navigation with PIN protection
  const handleNavigation = (path) => {
    if (protectedPages.includes(path)) {
      // Show PIN modal for protected pages
      setPendingNavigation(path);
      setPinModalTitle(getPageTitle(path));
      setShowPinModal(true);
    } else {
      // Direct navigation for non-protected pages
      go(path);
    }
  };

  // Handle PIN unlock
  const handlePinUnlock = () => {
    setShowPinModal(false);
    if (pendingNavigation) {
      go(pendingNavigation);
      setPendingNavigation(null);
      setPinModalTitle('');
    }
  };

  // Handle PIN modal cancel/close
  const handlePinCancel = () => {
    setShowPinModal(false);
    setPendingNavigation(null);
    setPinModalTitle('');
    // Always redirect to dashboard on cancel to prevent users from getting stuck
    go('/dashboard/home');
  };

  // Fallback: use internal navigate if parent doesn't pass onNavigate
  const go = (path) => (onNavigate ? onNavigate(path) : navigate(path));

  return (
    <>
      {/* PIN Protection Modal */}
      <PageLockModal
        isOpen={showPinModal}
        onUnlock={handlePinUnlock}
        onCancel={handlePinCancel}
        title={pinModalTitle}
        subtitle="Enter your manager PIN to access this feature"
        maxAttempts={3}
        redirectPath="/dashboard/home"
        pageName={pinModalTitle}
      />

      <div style={styles.sidebar}>
        {/* Home */}
        <div style={styles.button} onClick={() => go('/dashboard/home')}>
          <span style={styles.icon}><FiHome /></span>
          <span>Home</span>
        </div>

        {/* Employees Expandable - Only show for manager, admin, owner */}
        {canAccessEmployees && (
          <>
            <div style={styles.button} onClick={() => handleCategoryToggle('employees')}>
              <span style={styles.icon}><FiUsers /></span>
              <span style={{ flex: 1 }}>Employees</span>
              <span>{expandedCategory === 'employees' ? <FiChevronDown /> : <FiChevronRight />}</span>
            </div>

            {expandedCategory === 'employees' && (
              <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/employees')}>
                <span style={styles.subIcon}>•</span>
                <span>All Employees</span>
              </div>
            )}
          </>
        )}

        {/* Customers - Fixed route */}
        <div style={styles.button} onClick={() => go('/dashboard/pos/customers')}>
          <span style={styles.icon}><FiUser /></span>
          <span>Customers</span>
        </div>
        
        {/* Tavari POS */}
        <div style={styles.button} onClick={() => handleCategoryToggle('pos')}>
          <span style={styles.icon}><FiBarChart2 /></span>
          <span style={{ flex: 1 }}>Tavari POS</span>
          <span>{expandedCategory === 'pos' ? <FiChevronDown /> : <FiChevronRight />}</span>
        </div>

        {expandedCategory === 'pos' && (
          <>
            <div style={styles.subButton} onClick={() => go('/dashboard/pos/register')}>
              <span style={styles.subIcon}>•</span>
              <span>Register</span>
            </div>
            <div style={styles.subButton} onClick={() => go('/dashboard/pos/daily-deposit')}>
              <span style={styles.subIcon}>•</span>
              <span>Daily Deposit</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/pos/inventory')}>
              <span style={styles.subIcon}>•</span>
              <span>Inventory</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/pos/categories')}>
              <span style={styles.subIcon}>•</span>
              <span>Categories</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/pos/modifiers')}>
              <span style={styles.subIcon}>•</span>
              <span>Modifiers / Variants</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/pos/stations')}>
              <span style={styles.subIcon}>•</span>
              <span>Station Management</span>
            </div>
            <div style={styles.subButton} onClick={() => go('/dashboard/pos/kitchen-display')}>
              <span style={styles.subIcon}>•</span>
              <span>Kitchen Display</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/pos/discounts')}>
              <span style={styles.subIcon}>•</span>
              <span>Discounts</span>
            </div>
            <div style={styles.subButton} onClick={() => go('/dashboard/pos/receipts')}>
              <span style={styles.subIcon}>•</span>
              <span>Receipts</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/pos/settings')}>
              <span style={styles.subIcon}>•</span>
              <span>Settings</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/pos/loyalty-settings')}>
              <span style={styles.subIcon}>•</span>
              <span>Loyalty Settings</span>
            </div>
          </>
        )}
        
        {/* Tavari Music */}
        <div style={styles.button} onClick={() => handleCategoryToggle('music')}>
          <span style={styles.icon}><FiMusic /></span>
          <span style={{ flex: 1 }}>Tavari Music</span>
          <span>{expandedCategory === 'music' ? <FiChevronDown /> : <FiChevronRight />}</span>
        </div>

        {expandedCategory === 'music' && (
          <>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/music/dashboard')}>
              <span style={styles.subIcon}>•</span>
              <span>Music Dashboard</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/music/upload')}>
              <span style={styles.subIcon}>•</span>
              <span>Upload Music</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/music/library')}>
              <span style={styles.subIcon}>•</span>
              <span>Music Library</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/music/playlists')}>
              <span style={styles.subIcon}>•</span>
              <span>Playlists</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/music/schedules')}>
              <span style={styles.subIcon}>•</span>
              <span>Schedules</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/music/ads/dashboard')}>
              <span style={styles.subIcon}>•</span>
              <span>Ad Manager</span>
            </div>
			<div style={styles.subButton} onClick={() => handleNavigation('/dashboard/music/system-monitor')}>
 			 <span style={styles.subIcon}>•</span>
 			 <span>System Monitor</span>
			</div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/music/settings')}>
              <span style={styles.subIcon}>•</span>
              <span>Music Settings</span>
            </div>
          </>
        )}

        {/* Tavari Mail */}
        <div style={styles.button} onClick={() => handleCategoryToggle('mail')}>
          <span style={styles.icon}><FiMail /></span>
          <span style={{ flex: 1 }}>Tavari Mail</span>
          <span>{expandedCategory === 'mail' ? <FiChevronDown /> : <FiChevronRight />}</span>
        </div>

        {expandedCategory === 'mail' && (
          <>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/mail/dashboard')}>
              <span style={styles.subIcon}>•</span>
              <span>Mail Dashboard</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/mail/campaigns')}>
              <span style={styles.subIcon}>•</span>
              <span>Campaigns</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/mail/contacts')}>
              <span style={styles.subIcon}>•</span>
              <span>Contacts</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/mail/builder')}>
              <span style={styles.subIcon}>•</span>
              <span>Campaign Builder</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/mail/templates')}>
              <span style={styles.subIcon}>•</span>
              <span>Templates</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/mail/compliance')}>
              <span style={styles.subIcon}>•</span>
              <span>Compliance Center</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/mail/billing')}>
              <span style={styles.subIcon}>•</span>
              <span>Billing & Usage</span>
            </div>
            <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/mail/settings')}>
              <span style={styles.subIcon}>•</span>
              <span>Mail Settings</span>
            </div>
          </>
        )}

        {/* Tavari HR - Only show for manager, admin, owner */}
        {canAccessEmployees && (
          <>
            <div style={styles.button} onClick={() => handleCategoryToggle('hr')}>
              <span style={styles.icon}><FiClipboard /></span>
              <span style={{ flex: 1 }}>Tavari HR</span>
              <span>{expandedCategory === 'hr' ? <FiChevronDown /> : <FiChevronRight />}</span>
            </div>

            {expandedCategory === 'hr' && (
              <>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/hr/dashboard')}>
                  <span style={styles.subIcon}>•</span>
                  <span>HR Dashboard</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/hr/payroll')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Payroll Dashboard</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/hr/employees')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Employee Profiles</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/hr/contracts')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Contracts</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/hr/onboarding')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Onboarding Center</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/hr/writeups')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Disciplinary Actions</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/hr/policies')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Policy Center</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/hr/settings')}>
                  <span style={styles.subIcon}>•</span>
                  <span>HR Settings</span>
                </div>
              </>
            )}
          </>
        )}

        {/* Reports & Analytics - Only show for manager, admin, owner */}
        {canAccessEmployees && (
          <>
            <div style={styles.button} onClick={() => handleCategoryToggle('reports')}>
              <span style={styles.icon}><FiPieChart /></span>
              <span style={{ flex: 1 }}>Reports & Analytics</span>
              <span>{expandedCategory === 'reports' ? <FiChevronDown /> : <FiChevronRight />}</span>
            </div>

            {expandedCategory === 'reports' && (
              <>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/reports')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Reports Dashboard</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/reports/automation')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Report Automation Settings</span>
                </div>
                <div style={styles.subButton} onClick={() => handleNavigation('/dashboard/audit-logs')}>
                  <span style={styles.subIcon}>•</span>
                  <span>Audit Log Viewer</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

const styles = {
  sidebar: {
    width: '180px',
    backgroundColor: '#f8f8f8',
    paddingTop: '60px',
    borderRight: '1px solid #ddd',
    minHeight: '100vh',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 1,
  },
  button: {
    padding: '12px 16px',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '1px solid #ccc',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  subButton: {
    padding: '10px 28px',
    fontSize: '14px',
    fontWeight: 'normal',
    color: '#444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #ddd',
  },
  icon: {
    fontSize: '18px',
    width: '20px',
    textAlign: 'center',
  },
  subIcon: {
    fontSize: '12px',
    width: '20px',
    textAlign: 'center',
  },
};

export default SidebarNav;