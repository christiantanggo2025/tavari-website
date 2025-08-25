// src/layouts/DashboardLayout.jsx
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import SidebarNav from '../components/SidebarNav';

const DashboardLayout = () => {
  const navigate = useNavigate();

  return (
    <>
      <HeaderBar onLogoClick={() => navigate('/dashboard/home')} />
      <div style={{ display: 'flex' }}>
        <SidebarNav onNavigate={(path) => navigate(path)} />
        <div style={{ flex: 1, padding: '20px' }}>
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
