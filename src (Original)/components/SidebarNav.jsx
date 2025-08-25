// components/SidebarNav.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiUsers, FiUser, FiBarChart2, FiMusic, FiMail, FiChevronDown, FiChevronRight } from 'react-icons/fi';

const SidebarNav = ({ onNavigate }) => {
  const [employeesExpanded, setEmployeesExpanded] = useState(false);
  const [posExpanded, setPOSExpanded] = useState(false);
  const [musicExpanded, setMusicExpanded] = useState(false);
  const [mailExpanded, setMailExpanded] = useState(false);
  const navigate = useNavigate();

  // Fallback: use internal navigate if parent doesn't pass onNavigate
  const go = (path) => (onNavigate ? onNavigate(path) : navigate(path));

  return (
    <div style={styles.sidebar}>
      {/* Home */}
      <div style={styles.button} onClick={() => go('/dashboard/home')}>
        <span style={styles.icon}><FiHome /></span>
        <span>Home</span>
      </div>

      {/* Employees Expandable */}
      <div style={styles.button} onClick={() => setEmployeesExpanded(!employeesExpanded)}>
        <span style={styles.icon}><FiUsers /></span>
        <span style={{ flex: 1 }}>Employees</span>
        <span>{employeesExpanded ? <FiChevronDown /> : <FiChevronRight />}</span>
      </div>

      {employeesExpanded && (
        <div style={styles.subButton} onClick={() => go('/dashboard/employees')}>
          <span style={styles.subIcon}>•</span>
          <span>All Employees</span>
        </div>
      )}

      {/* Customers */}
      <div style={styles.button} onClick={() => go('/dashboard/customers')}>
        <span style={styles.icon}><FiUser /></span>
        <span>Customers</span>
      </div>
      
      {/* Tavari POS */}
      <div style={styles.button} onClick={() => setPOSExpanded(!posExpanded)}>
        <span style={styles.icon}><FiBarChart2 /></span>
        <span style={{ flex: 1 }}>Tavari POS</span>
        <span>{posExpanded ? <FiChevronDown /> : <FiChevronRight />}</span>
      </div>

      {posExpanded && (
        <>
          <div style={styles.subButton} onClick={() => go('/dashboard/pos/register')}>
            <span style={styles.subIcon}>•</span>
            <span>Register</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/pos/inventory')}>
            <span style={styles.subIcon}>•</span>
            <span>Inventory</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/pos/categories')}>
            <span style={styles.subIcon}>•</span>
            <span>Categories</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/pos/modifiers')}>
            <span style={styles.subIcon}>•</span>
            <span>Modifiers / Variants</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/pos/discounts')}>
            <span style={styles.subIcon}>•</span>
            <span>Discounts</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/pos/receipts')}>
            <span style={styles.subIcon}>•</span>
            <span>Receipts</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/pos/settings')}>
            <span style={styles.subIcon}>•</span>
            <span>Settings</span>
          </div>
        </>
      )}
	  
	  {/* Tavari Music */}
      <div style={styles.button} onClick={() => setMusicExpanded(!musicExpanded)}>
        <span style={styles.icon}><FiMusic /></span>
        <span style={{ flex: 1 }}>Tavari Music</span>
        <span>{musicExpanded ? <FiChevronDown /> : <FiChevronRight />}</span>
      </div>

      {musicExpanded && (
        <>
          <div style={styles.subButton} onClick={() => go('/dashboard/music/dashboard')}>
            <span style={styles.subIcon}>•</span>
            <span>Music Dashboard</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/music/upload')}>
            <span style={styles.subIcon}>•</span>
            <span>Upload Music</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/music/library')}>
            <span style={styles.subIcon}>•</span>
            <span>Music Library</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/music/playlists')}>
            <span style={styles.subIcon}>•</span>
            <span>Playlists</span>
          </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/music/schedules')}>
            <span style={styles.subIcon}>•</span>
            <span>Schedules</span>
          </div>
		  <div style={styles.subButton} onClick={() => go('/dashboard/music/ads/dashboard')}>
		    <span style={styles.subIcon}>•</span>
		    <span>Ad Manager</span>
		  </div>
          <div style={styles.subButton} onClick={() => go('/dashboard/music/settings')}>
            <span style={styles.subIcon}>•</span>
            <span>Music Settings</span>
          </div>
        </>
      )}

      {/* Tavari Mail */}
      <div style={styles.button} onClick={() => setMailExpanded(!mailExpanded)}>
        <span style={styles.icon}><FiMail /></span>
        <span style={{ flex: 1 }}>Tavari Mail</span>
        <span>{mailExpanded ? <FiChevronDown /> : <FiChevronRight />}</span>
      </div>

      {mailExpanded && (
        <>
          <div style={styles.subButton} onClick={() => go('mail/dashboard')}>
            <span style={styles.subIcon}>•</span>
            <span>Mail Dashboard</span>
          </div>
          <div style={styles.subButton} onClick={() => go('mail/campaigns')}>
            <span style={styles.subIcon}>•</span>
            <span>Campaigns</span>
          </div>
          <div style={styles.subButton} onClick={() => go('mail/contacts')}>
            <span style={styles.subIcon}>•</span>
            <span>Contacts</span>
          </div>
          <div style={styles.subButton} onClick={() => go('mail/builder')}>
            <span style={styles.subIcon}>•</span>
            <span>Campaign Builder</span>
          </div>
          <div style={styles.subButton} onClick={() => go('mail/templates')}>
            <span style={styles.subIcon}>•</span>
            <span>Templates</span>
          </div>
          <div style={styles.subButton} onClick={() => go('mail/compliance')}>
            <span style={styles.subIcon}>•</span>
            <span>Compliance Center</span>
          </div>
          <div style={styles.subButton} onClick={() => go('mail/billing')}>
            <span style={styles.subIcon}>•</span>
            <span>Billing & Usage</span>
          </div>
          <div style={styles.subButton} onClick={() => go('mail/settings')}>
            <span style={styles.subIcon}>•</span>
            <span>Mail Settings</span>
          </div>
        </>
      )}

      {/* Reports */}
      <div style={styles.button} onClick={() => go('/dashboard/reports')}>
        <span style={styles.icon}><FiBarChart2 /></span>
        <span>Reports</span>
      </div>
    </div>
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