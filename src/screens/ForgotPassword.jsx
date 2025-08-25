import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../supabaseClient';
import toast from 'react-hot-toast';

const supabaseService = supabaseAdmin;

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [authId, setAuthId] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleVerify = async () => {
    setErrorMsg('');

    // Step 1: Check public.users for email and pin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, pin')
      .eq('email', email)
      .eq('pin', pin)
      .maybeSingle();

    if (userError || !user) {
      setErrorMsg('User not found or invalid information.');
      return;
    }

    // Step 2: Get auth.users.id using listUsers()
    const { data: authUsers, error: listError } = await supabaseService.auth.admin.listUsers();

    if (listError || !authUsers || !authUsers.users) {
      setErrorMsg('Unable to verify auth user.');
      return;
    }

    const match = authUsers.users.find((u) => u.email === email);
    if (!match) {
      setErrorMsg('Auth user not found.');
      return;
    }

    setAuthId(match.id);
    setStep(2);
  };

  const handleResetPassword = async () => {
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
      password: newPassword,
    });

    if (error) {
      console.error('Password reset failed:', error.message);
      setErrorMsg('Failed to reset password. Try again.');
      return;
    }

    toast.success('Password reset! You can now log in.');
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <h2>Forgot Password</h2>

      {step === 1 && (
        <>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            style={styles.input}
            type="text"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button style={styles.button} onClick={handleVerify}>
            Verify
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <input
            style={styles.input}
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button style={styles.button} onClick={handleResetPassword}>
            Reset Password
          </button>
        </>
      )}

      {errorMsg && <p style={styles.error}>{errorMsg}</p>}
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '100px',
  },
  input: {
    display: 'block',
    margin: '10px auto',
    padding: '10px',
    width: '250px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
};

export default ForgotPassword;
