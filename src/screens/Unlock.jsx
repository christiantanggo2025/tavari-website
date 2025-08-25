// src/screens/Unlock.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import bcrypt from 'bcryptjs';

const Unlock = () => {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  const handleUnlock = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isAfter3am = currentHour > 3 || (currentHour === 3 && currentMinute > 0);
    const today = now.toISOString().split('T')[0];
    const lastForcedLogout = localStorage.getItem('lastForcedLogout');

    // Force logout once per day after 3am
    if (isAfter3am && lastForcedLogout !== today) {
      localStorage.setItem('lastForcedLogout', today);
      await supabase.auth.signOut();
      navigate('/login');
      return;
    }

    const failedAttempts = parseInt(localStorage.getItem('pinFailedAttempts') || '0', 10);
    let storedPin = profile?.pin;

    if (!storedPin && profile?.id) {
      const { data: userRow } = await supabase
        .from('users')
        .select('pin')
        .eq('id', profile.id)
        .maybeSingle();

      storedPin = userRow?.pin;
    }

    const pinMatches = await bcrypt.compare(pinInput, storedPin || '');

    if (pinMatches) {
      setError('');
      localStorage.removeItem('pinFailedAttempts');
      navigate('/dashboard');
	  await supabase.from('audit_logs').insert([
  	    {
 	      user_id: profile?.id,
  	      event_type: 'pin_login',
  	      details: JSON.stringify({
   	      method: 'unlock_screen',
   	      time: new Date().toISOString(),
   	    }),
  	  },
  	  {
  	    user_id: profile?.id,
   	     event_type: 'pin_unlock',
   	     details: JSON.stringify({
    	   method: 'unlock_screen',
    	   time: new Date().toISOString(),
   	     }),
  	   }
	 ]);

    } else {
      const newFailedCount = failedAttempts + 1;
      localStorage.setItem('pinFailedAttempts', newFailedCount);
	  
	  await supabase.from('audit_logs').insert({
 	    user_id: profile?.id,
 	    event_type: 'failed_pin_login',
 	    details: JSON.stringify({
  	      attempt: newFailedCount,
  	      time: new Date().toISOString(),
 	    }),
	  });
	  
	  // Check how many failed attempts in last 10 minutes
	  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

	  const { data: recentFailures, error: failureFetchError } = await supabase
 	   .from('audit_logs')
 	   .select('id')
 	   .eq('user_id', profile?.id)
 	   .eq('event_type', 'failed_pin_login')
 	   .gte('timestamp', tenMinutesAgo);

	  if (!failureFetchError && recentFailures.length >= 3) {
	    await supabase.from('audit_logs').insert({
	      user_id: profile?.id,
	      event_type: 'suspicious_activity',
	      details: JSON.stringify({
	        type: 'PIN brute force attempt',
	        attempts: recentFailures.length,
	        window: '10min',
 	        triggeredAt: new Date().toISOString(),
  	      }),
 	    });
	  }

      if (newFailedCount >= 3) {
        localStorage.removeItem('pinFailedAttempts');
        await supabase.auth.signOut();
        navigate('/login');
      } else {
	    
        setError(`Incorrect PIN. Attempt ${newFailedCount} of 3.`);
      }
    }
  };

  return (
    <div style={styles.container}>
      <h2>Session Locked</h2>
      <p>Please enter your 4-digit PIN to continue.</p>

      <input
        type="password"
        maxLength={4}
        style={styles.input}
        value={pinInput}
        onChange={(e) => setPinInput(e.target.value)}
      />

      <button onClick={handleUnlock} style={styles.button}>
        Unlock
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '100px',
  },
  input: {
    fontSize: '24px',
    padding: '10px',
    textAlign: 'center',
    width: '150px',
    margin: '10px auto',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default Unlock;
