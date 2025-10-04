import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { hashValue } from '../helpers/crypto';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    setErrorMsg('');

    const passwordPolicyRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
    if (!passwordPolicyRegex.test(password)) {
      setErrorMsg('Password must be at least 10 characters and include 1 uppercase and 1 special character.');
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      setErrorMsg(signupError.message);
      return;
    }

    const user = data?.user;
    const hashed = await hashValue(password);
    const hashedPin = await hashValue(String(pin || '').trim());

    if (!user) {
      setErrorMsg('Signup failed — no user returned.');
      return;
    }

    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      full_name: fullName,
      email,
      phone,
      hashed_password: hashed,
      pin: hashedPin,
      status: 'active',
      roles: ['owner'],
    });

    if (insertError) {
      setErrorMsg('Signup succeeded but user DB insert failed.');
      return;
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .insert([{ name: fullName + "'s Business", created_by: user.id }])
      .select()
      .single();

    if (businessError || !businessData?.id) {
      setErrorMsg('Signup failed during business creation.');
      return;
    }

    const businessId = businessData.id;
    
    await supabase.from('business_users').insert({
      user_id: user.id,
      business_id: businessId,
      role: 'owner',
    });
    
    localStorage.setItem('selectedBusinessId', businessId);

    await supabase.from('user_roles').insert({
      user_id: user.id,
      business_id: businessId,
      role: 'owner',
      active: true,
      custom_permissions: {},
    });

    // CREATE DEFAULT KITCHEN STATION FOR NEW BUSINESS
    await supabase.from('pos_stations').insert({
      business_id: businessId,
      name: 'Kitchen',
      description: 'Main kitchen station',
      printer_ids: [],
      is_active: true,
      sort_order: 1,
      has_screen: true,
      screen_enabled: true,
      screen_settings: {
        auto_bump_minutes: 30,
        display_mode: 'standard'
      },
      printer_settings: {
        paper_width: 80,
        auto_cut: true
      }
    });

    // CREATE DEFAULT POS SETTINGS
    await supabase.from('pos_settings').insert({
      business_id: businessId,
      tabs_enabled: true,
      default_tab_limit: 500.00,
      max_tab_limit: 1000.00,
      tab_limit_requires_manager: true,
      tab_warning_threshold: 0.8,
      tip_enabled: true,
      default_tip_percent: 0.15
    });

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'user_created',
      details: {
        method: 'self_register',
        email: email,
        timestamp: new Date().toISOString(),
      },
    });

    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <h2>Register</h2>
      <input
        style={styles.input}
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <input
        style={styles.input}
        type="text"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        style={styles.input}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        style={styles.input}
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        style={styles.input}
        type="password"
        placeholder="4-Digit PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        maxLength={4}
        pattern="\d*"
        required
      />
      {errorMsg && <p style={styles.error}>{errorMsg}</p>}
      <button style={styles.button} onClick={handleRegister}>Register</button>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '80px',
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
    marginTop: '10px',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
};

export default Register;