import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { hashValue, verifyHash } from '../helpers/crypto';
import useAccessProtection from '../hooks/useAccessProtection';

const ChangePin = () => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);

  React.useEffect(() => {
    const enforceAccess = async () => {
      const currentUser = await supabase.auth.getUser();
      const userId = currentUser?.data?.user?.id;

      if (!userId) return;

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Access check failed:', error);
        return;
      }

      setProfile(user);

      const now = new Date();
      const start = user.start_date ? new Date(user.start_date) : null;
      const end = user.end_date ? new Date(user.end_date) : null;

      const isExpired = end && now > end;
      const isPremature = start && now < start;
      const isInactive = user.status !== 'active';

      if (isInactive || isExpired || isPremature) {
        alert('Your account is inactive or outside the allowed access window.');
        window.location.href = '/locked';
      }
    };

    enforceAccess();
  }, []);

  const handleChangePin = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!/^\d{4}$/.test(newPin)) {
      setErrorMsg('PIN must be exactly 4 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('New PIN and confirmation do not match.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('users')
      .select('pin')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      setErrorMsg('Failed to fetch current PIN.');
      return;
    }

    const pinMatches = await verifyHash(currentPin, data.pin);
    if (!pinMatches) {
      setErrorMsg('Current PIN is incorrect.');
      return;
    }

    const hashedPin = await hashValue(newPin);

    const { error: updateError } = await supabase
      .from('users')
      .update({ pin: hashedPin })
      .eq('id', user.id);

    if (updateError) {
      setErrorMsg('Failed to update PIN.');
    } else {
      setSuccessMsg('PIN updated successfully.');

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'pin_change',
        details: {
          screen: 'ChangePin',
          method: 'manual',
          previousPinChecked: true,
          pinUpdated: true,
        },
      });

      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: 'auto' }}>
      <h2>Change PIN</h2>
      <input
        type="password"
        placeholder="Current PIN"
        value={currentPin}
        onChange={(e) => setCurrentPin(e.target.value)}
        style={{ width: '100%', padding: '8px', margin: '8px 0' }}
      />
      <input
        type="password"
        placeholder="New PIN (4 digits)"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value)}
        style={{ width: '100%', padding: '8px', margin: '8px 0' }}
      />
      <input
        type="password"
        placeholder="Confirm New PIN"
        value={confirmPin}
        onChange={(e) => setConfirmPin(e.target.value)}
        style={{ width: '100%', padding: '8px', margin: '8px 0' }}
      />
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}
      <button onClick={handleChangePin} style={{ padding: '10px 20px' }}>
        Update PIN
      </button>
    </div>
  );
};

export default ChangePin;
