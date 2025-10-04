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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!selectedBusinessId) return;
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          business_users!inner(business_id, role)
        `)
        .eq('id', id)
        .eq('business_users.business_id', selectedBusinessId)
        .single();

      if (!error && data) {
        setEmployee(data);
      }
    };

    fetchEmployee();
  }, [id, selectedBusinessId]); // Fixed: use selectedBusinessId instead of business?.id

  const handleChange = (field, value) => {
    setEmployee({ ...employee, [field]: value });
    setEditing({ ...editing, [field]: true });
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('users')
      .update(employee)
      .eq('id', id);

    if (!error) {
      setEditing({});
      alert('Employee updated successfully');
    } else {
      alert('Failed to update employee');
    }
  };

  const handleTerminate = async () => {
    const { error } = await supabase
      .from('users')
      .update({ 
        employment_status: 'terminated',
        status: 'terminated',
        termination_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', id);

    if (!error) {
      alert('Employee marked as terminated.');
      setEmployee({
        ...employee, 
        employment_status: 'terminated',
        status: 'terminated'
      });
    } else {
      alert('Failed to terminate employee');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    if (!confirmFinal) return setConfirmFinal(true);
    if (!pinPrompt || pinPrompt.length < 4) return alert('Enter your PIN to confirm');

    const { data: currentUser } = await supabase
      .from('users')
      .select('pin')
      .eq('id', profile?.id)
      .single();

    if (!currentUser?.pin) return alert('Current user PIN not found');

    const match = await bcrypt.compare(pinPrompt, currentUser.pin);
    if (!match) return alert('Incorrect PIN');

    // Delete from business_users first, then users
    const { error: businessUserError } = await supabase
      .from('business_users')
      .delete()
      .eq('user_id', id);

    if (businessUserError) {
      alert('Failed to remove business association');
      return;
    }

    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (!userError) {
      alert('Employee permanently deleted.');
      navigate('/dashboard/employees');
    } else {
      alert('Failed to delete employee');
    }
  };

  const handlePinChange = async () => {
    if (!pinPrompt || !newPin) return alert('Enter both current and new PIN');
    if (newPin.length !== 4) return alert('PIN must be exactly 4 digits');

    const { data: currentUser } = await supabase
      .from('users')
      .select('pin')
      .eq('id', profile?.id)
      .single();

    if (!currentUser?.pin) return alert('Current user PIN not found');

    const match = await bcrypt.compare(pinPrompt, currentUser.pin);
    if (!match) return alert('Incorrect current PIN');

    const hashed = await bcrypt.hash(newPin, 10);

    const { error } = await supabase
      .from('users')
      .update({ pin: hashed })
      .eq('id', id);

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
    if (!pinPrompt) return alert('Enter your PIN to confirm');

    const { data: currentUser } = await supabase
      .from('users')
      .select('pin')
      .eq('id', profile?.id)
      .single();

    if (!currentUser?.pin) return alert('Current user PIN not found');

    const match = await bcrypt.compare(pinPrompt, currentUser.pin);
    if (!match) return alert('Incorrect PIN');

    // ✅ SAFER admin password reset block
    if (!supabaseAdmin) {
      alert('Admin privileges are not configured for this environment.');
      return;
    }

    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError || !authUsers?.users) {
      alert('Unable to load authentication users.');
      console.error('List users error:', listError);
      return;
    }

    const matchAuth = authUsers.users.find((u) => u.email === employee.email);

    if (!matchAuth) {
      alert('Auth user not found for this employee.');
      return;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(matchAuth.id, {
      password: newPassword,
    });

    if (error) {
      alert('Password update failed.');
      console.error('Update error:', error);
      return;
    }

    alert('Password successfully reset.');
    setPasswordEditMode(false);
    setNewPassword('');
    setConfirmPassword('');
    setPinPrompt('');
  };

  const getEmployeeName = () => {
    if (employee?.first_name && employee?.last_name) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    return employee?.full_name || 'Unknown Employee';
  };

  const getEmployeeRole = () => {
    return employee?.business_users?.[0]?.role || 'employee';
  };

  if (!employee) {
    return (
      <SessionManager>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          paddingTop: '60px',
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingBottom: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #14B8A6',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 8px auto'
            }}></div>
            <p style={{ 
              margin: 0, 
              color: '#6b7280',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Loading employee details...
            </p>
          </div>
        </div>
      </SessionManager>
    );
  }

  const renderRow = (label, key, value, type = 'text') => {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '20px'
      }}>
        <div style={{
          fontWeight: '600',
          color: '#374151',
          minWidth: '200px',
          fontSize: '16px'
        }}>
          {label}
        </div>
        <div style={{ flex: 1 }}>
          <input
            type={type}
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#14B8A6';
              e.target.style.boxShadow = '0 0 0 3px rgba(20, 184, 166, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <SessionManager>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        paddingTop: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px'
      }}>
        {/* Add keyframes for spinner animation */}
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>

        <div style={{
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              Employee Editor
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '16px',
              margin: 0
            }}>
              Editing: {getEmployeeName()} • Role: {getEmployeeRole()}
            </p>
          </div>

          {/* Employee Information Card */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            marginBottom: '30px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 30px 0'
            }}>
              Basic Information
            </h2>

            {renderRow('Full Name', 'full_name', employee.full_name)}
            {renderRow('First Name', 'first_name', employee.first_name)}
            {renderRow('Last Name', 'last_name', employee.last_name)}
            {renderRow('Email Address', 'email', employee.email, 'email')}
            {renderRow('Phone Number', 'phone', employee.phone, 'tel')}
            {renderRow('Employee Number', 'employee_number', employee.employee_number)}
            {renderRow('Position/Title', 'position', employee.position)}
            {renderRow('Department', 'department', employee.department)}
            {renderRow('Hire Date', 'hire_date', employee.hire_date, 'date')}
            {renderRow('Wage (per hour)', 'wage', employee.wage, 'number')}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '20px'
            }}>
              <div style={{
                fontWeight: '600',
                color: '#374151',
                minWidth: '200px',
                fontSize: '16px'
              }}>
                Employment Status
              </div>
              <div style={{ flex: 1 }}>
                <select
                  value={employee.employment_status || employee.status || 'active'}
                  onChange={(e) => handleChange('employment_status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="terminated">Terminated</option>
                  <option value="on_leave">On Leave</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security Settings Card */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            marginBottom: '30px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 30px 0'
            }}>
              Security Settings
            </h2>

            {/* PIN Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '30px',
              gap: '20px'
            }}>
              <div style={{
                fontWeight: '600',
                color: '#374151',
                minWidth: '200px',
                fontSize: '16px'
              }}>
                PIN (requires your PIN)
              </div>
              <div style={{ flex: 1 }}>
                {!pinEditMode ? (
                  <button 
                    onClick={() => setPinEditMode(true)}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: 'white',
                      border: '2px solid #14B8A6',
                      color: '#374151',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#f0fdfa';
                      e.target.style.color = '#0F766E';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.color = '#374151';
                    }}
                  >
                    Edit PIN
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="password"
                      placeholder="Your current PIN"
                      value={pinPrompt}
                      onChange={(e) => setPinPrompt(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="New 4-digit PIN"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      maxLength={4}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={handlePinChange}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#14B8A6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
                      >
                        Update PIN
                      </button>
                      <button 
                        onClick={() => {
                          setPinEditMode(false);
                          setPinPrompt('');
                          setNewPin('');
                        }}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Password Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '20px'
            }}>
              <div style={{
                fontWeight: '600',
                color: '#374151',
                minWidth: '200px',
                fontSize: '16px'
              }}>
                Password (requires your PIN)
              </div>
              <div style={{ flex: 1 }}>
                {!passwordEditMode ? (
                  <button 
                    onClick={() => setPasswordEditMode(true)}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: 'white',
                      border: '2px solid #14B8A6',
                      color: '#374151',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#f0fdfa';
                      e.target.style.color = '#0F766E';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.color = '#374151';
                    }}
                  >
                    Change Password
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <input
                      type="password"
                      placeholder="Your PIN to confirm"
                      value={pinPrompt}
                      onChange={(e) => setPinPrompt(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={handlePasswordChange}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#14B8A6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
                      >
                        Update Password
                      </button>
                      <button 
                        onClick={() => {
                          setPasswordEditMode(false);
                          setNewPassword('');
                          setConfirmPassword('');
                          setPinPrompt('');
                        }}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '30px',
            flexWrap: 'wrap'
          }}>
            {Object.keys(editing).length > 0 && (
              <button 
                onClick={handleSave}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#14B8A6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  outline: 'none'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#0F766E'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#14B8A6'}
              >
                Save Changes
              </button>
            )}
            
            <button 
              onClick={handleTerminate}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                outline: 'none'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#d97706'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f59e0b'}
            >
              Mark as Terminated
            </button>
            
            <button 
              onClick={handleDelete}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                outline: 'none'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              {confirmFinal ? 'Confirm & Delete' : confirmDelete ? 'Confirm Again' : 'Delete Employee'}
            </button>
          </div>

          {confirmFinal && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '30px'
            }}>
              <h3 style={{
                color: '#991b1b',
                fontSize: '18px',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                Final Confirmation Required
              </h3>
              <p style={{
                color: '#7f1d1d',
                margin: '0 0 16px 0'
              }}>
                This action cannot be undone. Please enter your PIN to permanently delete this employee.
              </p>
              <input
                type="password"
                placeholder="Enter your PIN to confirm"
                value={pinPrompt}
                onChange={(e) => setPinPrompt(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: '200px'
                }}
              />
            </div>
          )}

          {/* Back Button */}
          <button 
            onClick={() => navigate('/dashboard/employees')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              border: '2px solid #14B8A6',
              color: '#374151',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f0fdfa';
              e.target.style.color = '#0F766E';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#374151';
            }}
          >
            ← Back to Employee List
          </button>
        </div>
      </div>
    </SessionManager>
  );
};

export default EmployeeEditor;