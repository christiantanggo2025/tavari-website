
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Locked = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      backgroundColor: '#fff3f3',
      color: '#a94442',
      border: '1px solid #ebccd1',
      borderRadius: '8px',
      maxWidth: '500px',
      margin: '100px auto',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2>🔒 Account Locked</h2>
      <p>Your account is currently inactive, outside your access window, or has been suspended by an admin.</p>
      <p>If you believe this is an error, please contact your manager or system administrator.</p>
      <button 
        onClick={() => navigate('/')} 
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#d9534f',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Return to Login
      </button>
    </div>
  );
};

export default Locked;
