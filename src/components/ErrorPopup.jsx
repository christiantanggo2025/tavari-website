import React from 'react';

const ErrorPopup = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <p style={styles.message}>{message}</p>
        <button onClick={onClose} style={styles.button}>OK</button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  popup: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
    maxWidth: '300px',
    textAlign: 'center',
  },
  message: {
    marginBottom: '16px',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#d9534f',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  }
};

export default ErrorPopup;
