import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import useAccessProtection from '../hooks/useAccessProtection';

export default function RoleManager() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  const [permissions, setPermissions] = useState({});
  const [profile, setProfile] = useState(null);

  const availableRoles = ['customer', 'employee', 'keyholder', 'manager', 'admin', 'owner'];
  const permissionList = ['canAccessReports', 'canEditSchedule', 'canSeePayroll'];

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    const currentUser = await supabase.auth.getUser();
    const userId = currentUser?.data?.user?.id;
	
	// Step 0: Get the user's full profile
	const { data: profileData, error: profileError } = await supabase
 	 .from('users')
 	 .select('*')
 	 .eq('id', userId)
 	 .single();

	if (profileError) {
 	 console.error('Could not fetch profile for access check:', profileError);
 	 return;
	}
	setProfile(profileData);

	// Enforce access window
	const now = new Date();
	const start = profileData.start_date ? new Date(profileData.start_date) : null;
	const end = profileData.end_date ? new Date(profileData.end_date) : null;
	const isExpired = end && now > end;
	const isPremature = start && now < start;
	const isInactive = profileData.status !== 'active';

	if (isInactive || isExpired || isPremature) {
 	 alert('Your account is inactive or outside the allowed access window.');
 	 window.location.href = '/locked';
 	 return;
	}

    // Step 1: Get the user's active role
    const { data: currentRoleData, error: roleError } = await supabase
      .from('user_roles')
      .select('business_id')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (roleError || !currentRoleData?.business_id) {
      console.error('Could not fetch user role or business_id', roleError);
      return;
    }

    const currentBusinessId = currentRoleData.business_id;

    // Step 2: Get all active roles for that business only
    const { data, error } = await supabase
      .from('user_roles')
      .select('id, user_id, role, active, custom_permissions, users(email)')
      .eq('active', true)
      .eq('business_id', currentBusinessId);

    if (error) {
      console.error('Load error:', error);
      return;
    }

    setUsers(data);
    if (data?.length > 0) {
      console.log('USER ROLE (first):', data[0]);
    }

    const roleMap = {};
    const permMap = {};

    data.forEach((u) => {
      roleMap[u.id] = u.role;
      permMap[u.id] = u.custom_permissions || {};
    });

    setRoles(roleMap);
    setPermissions(permMap);

    // Log audit event once only — not again
    if (userId) {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        event_type: 'user_profile_access',
        details: {
          accessed_from: 'role_manager',
          accessed_count: data.length,
          business_id: currentBusinessId,
        },
      });
    }
  };

  const handleRoleChange = (id, newRole) => {
    setRoles((prev) => ({ ...prev, [id]: newRole }));
  };

  const togglePermission = (id, permission) => {
    setPermissions((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [permission]: !prev[id]?.[permission],
      },
    }));
  };

  const saveChanges = async (id) => {
    let safePermissions = permissions[id];
    if (typeof safePermissions !== 'object' || safePermissions === null) {
      safePermissions = {};
    }

    const updates = {
      role: roles[id],
      custom_permissions: safePermissions,
    };

    const { error } = await supabase.from('user_roles').update(updates).eq('id', id);

    if (error) {
      alert(`Failed to update: ${error.message}`);
    } else {
      alert('Updated successfully');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Role Manager</h2>
      {users.map((u) => (
        <div key={u.id} style={{ marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 10 }}>
          <strong>{u.users?.email}</strong>
          <br />
          <select value={roles[u.id]} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
            {availableRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div style={{ marginTop: 8 }}>
            {permissionList.map((perm) => (
              <label key={perm} style={{ marginRight: 12 }}>
                <input
                  type="checkbox"
                  checked={permissions[u.id]?.[perm] || false}
                  onChange={() => togglePermission(u.id, perm)}
                />
                {perm}
              </label>
            ))}
          </div>
          <button onClick={() => saveChanges(u.id)} style={{ marginTop: 8 }}>
            Save
          </button>
        </div>
      ))}
    </div>
  );
}
