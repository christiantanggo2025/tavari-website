import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setErrorMsg('');

    // Check if user is locked out by ID instead of email-based JSON check
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    let lockedUserId = null;
    const { data: userLookup } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userLookup?.id) {
      lockedUserId = userLookup.id;

      const { data: recentFails } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('event_type', 'failed_login')
        .eq('user_id', lockedUserId)
        .gte('created_at', since);

      if (recentFails && recentFails.length >= 3) {
        setErrorMsg('Account is temporarily locked. Please try again in 10 minutes.');
        return;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    let userMatch = null;

    if (error) {
      console.warn("⛔ LOGIN ERROR:", error.message);

      const { data: userLookup, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      userMatch = userLookup;

      await supabase.from("audit_logs").insert({
        user_id: userMatch?.id || null,
        event_type: "failed_login",
        details: {
          email_attempted: email,
          reason: error.message,
          timestamp: new Date().toISOString(),
        },
      });

      setErrorMsg('Invalid credentials');
      return;
    }

    // Log successful login
    const user = data?.user;
    if (user?.id) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        event_type: "login",
        details: {
          method: "email password",
        },
      });
    }

    if (stayLoggedIn) {
      const now = new Date();
      const expires = new Date();
      expires.setHours(3, 0, 0, 0); // Set to 3:00 AM today

      if (expires < now) {
        expires.setDate(expires.getDate() + 1); // If past 3AM today, set for tomorrow
      }

      localStorage.setItem('expiresAt', expires.toISOString());
      localStorage.setItem('stayLoggedIn', 'true');
      console.log('🔐 Session set to expire at 3AM:', expires.toISOString());
    } else {
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('stayLoggedIn');
    }

    const {
      data: authData,
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError || !authData?.user?.id) {
      setErrorMsg('Unable to retrieve user after login.');
      return;
    }

    const userId = authData.user.id;

    const { data: roleList, error: roleError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true);

    if (roleError || !roleList || roleList.length === 0) {
      setErrorMsg('Login succeeded, but no active business roles found.');
      return;
    }

    // Store all businesses in localStorage
    localStorage.setItem('businessList', JSON.stringify(roleList));

    // Default to the first business in the list
    const currentBusiness = roleList[0];
    localStorage.setItem('currentBusinessId', currentBusiness.business_id);

    if (currentBusiness.role === 'owner' || currentBusiness.role === 'admin') {
      navigate('/dashboard/home');
    } else if (currentBusiness.role === 'manager') {
      navigate('/dashboard/home');
    } else {
      navigate('/locked');
    }
  };

  return (
    <div style={styles.container}>
      <h2>Login</h2>
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
      {errorMsg && <p style={styles.error}>{errorMsg}</p>}
      <div style={{ marginBottom: '10px' }}>
        <input
          type="checkbox"
          id="stayLoggedIn"
          checked={stayLoggedIn}
          onChange={() => setStayLoggedIn(!stayLoggedIn)}
        />
        <label htmlFor="stayLoggedIn" style={{ marginLeft: '8px' }}>
          Stay logged in until 3:00 AM
        </label>
      </div>

      <button style={styles.button} onClick={handleLogin}>Login</button>
      <p
        onClick={() => navigate("/forgot-password")}
        style={{
          color: "#007bff",
          cursor: "pointer",
          marginTop: "0.75rem",
          fontSize: "0.9rem",
          textAlign: "center",
          textDecoration: "underline",
        }}
      >
        Forgot your password?
      </p>

      <p>
        Don’t have an account?{' '}
        <span style={styles.link} onClick={() => navigate('/register')}>Register</span>
      </p>
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
  link: {
    color: '#008080',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
};

export default Login;
