import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessContext } from '../contexts/BusinessContext';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [users, setUsers] = useState([]);
  const { selectedBusinessId } = useBusinessContext();

  useEffect(() => {
    loadUsers();
    loadLogs();
  }, [selectedBusinessId]);

  const loadUsers = async () => {
    if (!selectedBusinessId) return;

    const { data } = await supabase
      .from('user_roles')
      .select('user_id, users(email)')
      .eq('business_id', selectedBusinessId)
      .eq('active', true);

    if (data) {
      const mapped = data.map(entry => ({
        id: entry.user_id,
        email: entry.users?.email || ''
      }));
      setUsers(mapped);
    }
  };

  const loadLogs = async () => {
    if (!selectedBusinessId) return;

    const currentUser = await supabase.auth.getUser();
    const userId = currentUser?.data?.user?.id;

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('business_id', selectedBusinessId)
      .order('timestamp', { ascending: false })
      .limit(200);

    if (eventTypeFilter) {
      query = query.eq('event_type', eventTypeFilter);
    }
    if (userFilter) {
      query = query.eq('user_id', userFilter);
    }
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    if (endDate) {
      query = query.lte('timestamp', endDate + 'T23:59:59');
    }

    const { data, error } = await query;
    if (!error) setLogs(data);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Audit Logs</h2>

      <div style={{ marginBottom: 16 }}>
        <label>Event Type: </label>
        <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}>
          <option value="">All</option>
          <option value="login">login</option>
          <option value="failed_login">failed_login</option>
          <option value="logout">logout</option>
          <option value="user_created">user_created</option>
          <option value="pin_change">pin_change</option>
          <option value="user_profile_access">user_profile_access</option>
          <option value="suspicious_activity">suspicious_activity</option>
        </select>

        <label style={{ marginLeft: 16 }}>User: </label>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)}>
          <option value="">All</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.email}</option>
          ))}
        </select>

        <label style={{ marginLeft: 16 }}>Start Date: </label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />

        <label style={{ marginLeft: 16 }}>End Date: </label>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />

        <button onClick={loadLogs} style={{ marginLeft: 16 }}>Refresh</button>
      </div>

      <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Event Type</th>
            <th>User ID</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => {
            const isSuspicious = log.event_type === 'suspicious_activity';
            return (
              <tr
                key={log.id}
                style={{
                  backgroundColor: isSuspicious ? '#ffe5e5' : 'white',
                  fontWeight: isSuspicious ? 'bold' : 'normal',
                }}
              >
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>
                  {log.event_type}
                  {isSuspicious && <span style={{ color: 'red', marginLeft: 6 }}>🚨</span>}
                </td>
                <td>{log.user_id}</td>
                <td>
                  <pre style={{ whiteSpace: 'pre-wrap', maxWidth: 400 }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogViewer;
