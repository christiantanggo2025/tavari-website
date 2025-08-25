import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import useAccessProtection from '../hooks/useAccessProtection';
import SessionManager from '../components/SessionManager';

const AddUser = () => {
  useAccessProtection();
  const { profile } = useUserProfile();
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('business_id, businesses(name)')
        .eq('user_id', profile?.id)
        .eq('role', 'owner')
        .eq('active', true);

      if (data) {
        const mapped = data.map(r => ({
          id: r.business_id,
          name: r.businesses.name
        }));
        setBusinesses(mapped);

        const storedBusinessId = localStorage.getItem('currentBusinessId');
        if (storedBusinessId && mapped.find(b => b.id === storedBusinessId)) {
          setSelectedBusinessId(storedBusinessId);
        } else if (mapped.length === 1) {
          setSelectedBusinessId(mapped[0].id);
        }
      }
    };

    if (profile?.id) fetchBusinesses();
  }, [profile]);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    pin_code: '',
    role: 'employee',
    start_date: '',
    end_date: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    window.history.back();
  };

  const handleCreate = async () => {
    // Step 1: Create Auth User
    const { data: signUpResult, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password
    });

    if (signUpError) {
      alert('Error creating user: ' + signUpError.message);
      return;
    }

    const userId = signUpResult?.user?.id;
    if (!userId) {
      alert('User was not created');
      return;
    }

    // Step 2: Insert into 'users' table
    const { error: userInsertError } = await supabase.from('users').insert({
      id: userId,
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      hashed_password: formData.password, // Only for placeholder — don't use in production
      pin: formData.pin_code,
      roles: [formData.role],
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: 'active'
    });

    if (userInsertError) {
      alert('Error inserting user data: ' + userInsertError.message);
      return;
    }

    // Step 3: Insert into 'user_roles' table
    const { error: roleInsertError } = await supabase.from('user_roles').insert({
      user_id: userId,
      business_id: selectedBusinessId,
      role: formData.role,
      active: true
    });

    if (roleInsertError) {
      alert('Error assigning user role: ' + roleInsertError.message);
      return;
    }

    alert('User created successfully');
    window.history.back();
  };

  if (!selectedBusinessId) {
    return (
      <SessionManager>
        <div style={{ padding: '20px' }}>
          <p>Please select or create a business before adding users.</p>
        </div>
      </SessionManager>
    );
  }

  return (
    <SessionManager>
      <div style={{ padding: '20px', maxWidth: '400px' }}>
        <h2>Add New User</h2>
        <input
          type="text"
          placeholder="Full Name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
        /><br />
        <input
          type="email"
          placeholder="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        /><br />
        <input
          type="tel"
          placeholder="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        /><br />
        <input
          type="password"
          placeholder="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
        /><br />
        <input
          type="text"
          placeholder="4-digit PIN"
          name="pin_code"
          value={formData.pin_code}
          onChange={handleChange}
        /><br />
        <select value={selectedBusinessId} onChange={(e) => setSelectedBusinessId(e.target.value)}>
          <option value="">Select Business</option>
          {businesses.map((biz, i) => (
            <option key={i} value={biz.id}>{biz.name}</option>
          ))}
        </select><br />
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select><br />
        <label>Start Date: <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} /></label><br />
        <label>End Date: <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} /></label><br />
        <button onClick={handleCreate}>Create User</button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
    </SessionManager>
  );
};

export default AddUser;
