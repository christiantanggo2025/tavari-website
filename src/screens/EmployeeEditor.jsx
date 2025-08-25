import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '/src/supabaseClient.js';
import { useUserProfile } from '../hooks/useUserProfile';
import SessionManager from '../components/SessionManager';
import bcrypt from 'bcryptjs';
import { useBusinessContext } from '../contexts/BusinessContext';

const EmployeeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { selectedBusinessId } = useBusinessContext();
  const availableRoles = ['customer', 'employee', 'keyholder', 'manager', 'admin', 'owner'];

  const [employee, setEmployee] = useState(null);
  const [editing, setEditing] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmFinal, setConfirmFinal] = useState(false);
  const [pinPrompt, setPinPrompt] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinEditMode, setPinEditMode] = useState(false);
  const [passwordEditMode, setPasswordEditMode] = useState(false);
  const [authId, setAuthId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fetchEmployee = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('business_id', selectedBusinessId)
        .maybeSingle();

      if (!error) setEmployee(data);
    };

    fetchEmployee();
  }, [id, business?.id]);

  const handleChange = (field, value) => {
    setEmployee({ ...employee, [field]: value });
    setEditing({ ...editing, [field]: true });
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('users')
      .update(employee)
      .eq('id', id)
      .eq('business_id', selectedBusinessId);

    if (!error) setEditing({});
  };

  const handleTerminate = async () => {
    await supabase
      .from('users')
      .update({ status: 'terminated' })
      .eq('id', id)
      .eq('business_id', selectedBusinessId);
    alert('User marked as terminated.');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    if (!confirmFinal) return setConfirmFinal(true);
    if (!pinPrompt || pinPrompt.length < 4) return alert('Enter your PIN to confirm');

    const { data: currentUser } = await supabase
      .from('users')
      .select('pin')
      .eq('id', profile?.id)
      .maybeSingle();

    const match = await bcrypt.compare(pinPrompt, currentUser?.pin || '');
    if (!match) return alert('Incorrect PIN');

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('business_id', selectedBusinessId);

    if (!error) {
      alert('User permanently deleted.');
      navigate('/dashboard/employees');
    }
  };

  const handlePinChange = async () => {
    if (!pinPrompt || !newPin) return alert('Enter both current and new PIN');

    const { data: currentUser } = await supabase
      .from('users')
      .select('pin')
      .eq('id', profile?.id)
      .maybeSingle();

    const match = await bcrypt.compare(pinPrompt, currentUser?.pin || '');
    if (!match) return alert('Incorrect current PIN');

    const hashed = await bcrypt.hash(newPin, 10);

    const { error } = await supabase
      .from('users')
      .update({ pin: hashed })
      .eq('id', id)
      .eq('business_id', selectedBusinessId);

    if (error) {
      alert('Failed to update PIN');
    } else {
      alert('PIN updated successfully');
      setNewPin('');
      setPinPrompt('');
      setPinEditMode(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) return alert('Both password fields are required');
    if (newPassword !== confirmPassword) return alert('Passwords do not match');
    if (newPassword.length < 6) return alert('Password must be at least 6 characters');

    const { data: currentUser } = await supabase
      .from('users')
      .select('pin')
      .eq('id', profile?.id)
      .maybeSingle();

    const match = await bcrypt.compare(pinPrompt, currentUser?.pin || '');
    if (!match) return alert('Incorrect PIN');

    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError || !authUsers?.users) return alert('Unable to load auth users');

    const matchAuth = authUsers.users.find((u) => u.email === employee.email);
    if (!matchAuth) return alert('Auth user not found for this employee');

    const { error } = await supabaseAdmin.auth.admin.updateUserById(matchAuth.id, {
      password: newPassword,
    });

    if (error) {
      console.error('Password update error:', error.message);
      return alert('Failed to update password');
    }

    alert('Password updated successfully');
    setPasswordEditMode(false);
    setNewPassword('');
    setConfirmPassword('');
    setPinPrompt('');
  };

  if (!employee) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <SessionManager>
      <div style={styles.container}>
        <h2>Employee Editor</h2>

        {renderRow('Name', 'full_name', employee.full_name)}
        {renderRow('Business Location', 'business_location', employee.business_location)}
        <div style={styles.row}>
          <div style={styles.left}>Access Level (Role)</div>
          <div style={styles.right}>
            <select
              value={employee.role}
              onChange={(e) => handleChange('role', e.target.value)}
              style={styles.input}
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        {renderRow('Phone Number', 'phone', employee.phone)}
        {renderRow('Email', 'email', employee.email)}
        {renderRow('Start Date', 'start_date', employee.start_date)}
        {renderRow('Employment Role', 'job_title', employee.job_title)}
        {renderRow('Wage', 'wage', employee.wage)}

        <div style={styles.row}>
          <div style={styles.left}>PIN (edit requires your PIN)</div>
          <div style={styles.right}>
            {!pinEditMode ? (
              <button onClick={() => setPinEditMode(true)}>Edit</button>
            ) : (
              <div style={{ textAlign: 'right' }}>
                <input
                  type="password"
                  placeholder="Current PIN"
                  value={pinPrompt}
                  onChange={(e) => setPinPrompt(e.target.value)}
                  style={{ ...styles.input, marginBottom: 8 }}
                />
                <input
                  type="text"
                  placeholder="New 4-digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  style={styles.input}
                />
                <button onClick={handlePinChange} style={{ marginTop: 8 }}>Submit</button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.left}>Password (edit requires your PIN)</div>
          <div style={styles.right}>
            {!passwordEditMode ? (
              <button onClick={() => setPasswordEditMode(true)}>Edit</button>
            ) : (
              <div style={{ textAlign: 'right' }}>
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ ...styles.input, marginBottom: 8 }}
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                />
                <input
                  type="password"
                  placeholder="Your PIN to confirm"
                  value={pinPrompt}
                  onChange={(e) => setPinPrompt(e.target.value)}
                  style={{ ...styles.input, marginTop: 8 }}
                />
                <button onClick={handlePasswordChange} style={{ marginTop: 8 }}>Submit</button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.terminate} onClick={handleTerminate}>
            Terminate
          </button>
          <button style={styles.delete} onClick={handleDelete}>
            {confirmFinal ? 'Confirm & Delete' : confirmDelete ? 'Confirm Again' : 'Delete User'}
          </button>
        </div>

        {confirmFinal && (
          <div style={styles.pinPrompt}>
            <input
              type="password"
              placeholder="Enter your PIN to confirm"
              value={pinPrompt}
              onChange={(e) => setPinPrompt(e.target.value)}
            />
          </div>
        )}

        {Object.keys(editing).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button onClick={handleSave} style={styles.saveButton}>
              Save Changes
            </button>
          </div>
        )}
      </div>
    </SessionManager>
  );

  function renderRow(label, key, value) {
    return (
      <div style={styles.row}>
        <div style={styles.left}>{label}</div>
        <div style={styles.right}>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            style={styles.input}
          />
        </div>
      </div>
    );
  }
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  left: {
    fontWeight: 'bold',
    flex: 1,
  },
  right: {
    flex: 2,
    textAlign: 'right',
  },
  input: {
    padding: '8px',
    width: '100%',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
  terminate: {
    backgroundColor: '#ffa500',
    padding: '10px 16px',
    border: 'none',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  delete: {
    backgroundColor: '#d9534f',
    padding: '10px 16px',
    border: 'none',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  pinPrompt: {
    marginTop: '10px',
  },
  saveButton: {
    padding: '10px 16px',
    backgroundColor: '#008080',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default EmployeeEditor;
