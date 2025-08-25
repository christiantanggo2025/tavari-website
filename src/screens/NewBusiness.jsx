import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import { useBusinessContext } from '../contexts/BusinessContext';

const NewBusiness = () => {
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { setSelectedBusinessId } = useBusinessContext();

  const handleCreateBusiness = async () => {
    setError('');
    if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }

    const { data, error: insertError } = await supabase
      .from('businesses')
      .insert([{ name: businessName, created_by: profile.id }])
      .select()
      .single();

    if (insertError || !data?.id) {
      setError('Failed to create business.');
      return;
    }

    const { error: roleError } = await supabase.from('user_roles').insert([
      {
        user_id: profile.id,
        business_id: data.id,
        role: 'owner',
        active: true,
        custom_permissions: {},
      }
    ]);

    if (roleError) {
      setError('Failed to assign owner role.');
      return;
    }
	
	setSelectedBusinessId(data.id);
	
	localStorage.setItem('currentBusinessId', data.id);

    navigate('/dashboard');
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Open New Business</h2>
      <input
        type="text"
        placeholder="Business Name"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        style={{ padding: 10, width: '300px' }}
      />
      <br />
      <button onClick={handleCreateBusiness} style={{ marginTop: 12, padding: 10 }}>
        Create Business
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default NewBusiness;
