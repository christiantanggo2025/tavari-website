// components/HeaderBar.jsx
import React, { useState, useEffect } from 'react';
import { FiBell, FiSettings, FiUser, FiMenu } from 'react-icons/fi';
import './HeaderBar.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import { useBusiness } from '../contexts/BusinessContext';

const HeaderBar = ({ onLogoClick }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showMobileAccountDropdown, setShowMobileAccountDropdown] = useState(false);
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { business, setBusiness } = useBusiness();

  const selectedBiz = business?.id || '';
  const setSelectedBiz = setBusiness;

  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('businesses(id, name)')
        .eq('user_id', profile?.id)
        .eq('active', true);

      if (error) {
        console.error('Error fetching businesses:', error);
        return;
      }

      if (data) {
        const bizList = data.map((d) => d.businesses);
        setBusinesses(bizList);

        // Only set selected business if none is set yet in context
        if (!selectedBiz) {
          const savedBiz = localStorage.getItem('currentBusinessId');
          if (savedBiz && bizList.some(b => b.id === savedBiz)) {
            setSelectedBiz(savedBiz);
          } else if (bizList.length > 0) {
            const defaultBizId = bizList[0].id;
            setSelectedBiz(defaultBizId);
            localStorage.setItem('currentBusinessId', defaultBizId);
          }
        }
      }
    };

    if (profile?.id) fetchBusinesses();
    // We intentionally only run this when profile.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Sync localStorage when business changes
  useEffect(() => {
    if (selectedBiz) {
      localStorage.setItem('currentBusinessId', selectedBiz);
    }
  }, [selectedBiz]);

  const handleLogout = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const fallbackId = session?.user?.id;
    const userId = profile?.id || fallbackId;

    if (userId) {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        event_type: 'logout',
        details: JSON.stringify({
          reason: 'user clicked logout from header',
        }),
      });
    }

    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="header">
      <div className="logo" onClick={onLogoClick}>
        <img src="/logo.png" alt="Tavari Logo" className="logoImage" />
      </div>

      <div className="spacer" />

      <div className="desktopIcons">
        <select
          className="selector"
          value={selectedBiz}
          onChange={(e) => {
            if (e.target.value === 'new') {
              navigate('/dashboard/new-business');
            } else {
              const newBizId = e.target.value;
              setSelectedBiz(newBizId);
              // localStorage sync is handled in useEffect now
              window.location.reload(); // optional: force refresh if needed to reload filtered content
            }
          }}
        >
          {businesses.map((biz) => (
            <option key={biz.id} value={biz.id}>
              {biz.name}
            </option>
          ))}
          <option value="new">➕ Open New Business</option>
        </select>
        <FiBell className="icon" />
        <FiSettings className="icon" onClick={() => navigate('/dashboard/settings')} />
        <div className="icon account-icon" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
          <FiUser />
          {showAccountDropdown && (
            <div className="dropdown">
              <div className="dropdown-item" onClick={handleLogout}>Log Out</div>
            </div>
          )}
        </div>
      </div>

      <div className="hamburger" onClick={() => setShowMobileMenu(!showMobileMenu)}>
        <FiMenu size={24} />
      </div>

      {showMobileMenu && (
        <div className="mobileMenu">
          <div className="mobileMenuItem">
            <select className="selector" style={{ width: '100%' }} value={selectedBiz} onChange={(e) => setSelectedBiz(e.target.value)}>
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name}
                </option>
              ))}
              <option value="new">➕ Open New Business</option>
            </select>
          </div>
          <div className="mobileMenuItem">
            <FiBell className="icon" />
            <span className="label">Notifications</span>
          </div>
          <div className="mobileMenuItem" onClick={() => navigate('/dashboard/settings')}>
            <FiSettings className="icon" />
            <span className="label">Settings</span>
          </div>
          <div
            className="mobileMenuItem"
            onClick={() => setShowMobileAccountDropdown(!showMobileAccountDropdown)}
          >
            <FiUser className="icon" />
            <span className="label">Account</span>
          </div>
          {showMobileAccountDropdown && (
            <div className="mobileMenuItem indent">
              <span className="label" onClick={handleLogout}>Log Out</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderBar;
