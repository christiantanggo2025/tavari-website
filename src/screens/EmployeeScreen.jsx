// src/screens/EmployeeScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import useAccessProtection from '../hooks/useAccessProtection';
import { useBusinessContext } from '../contexts/BusinessContext';
import SessionManager from '../components/SessionManager';

const EmployeeScreen = () => {
  const navigate = useNavigate();
  const { profile, roleInfo } = useUserProfile();
  useAccessProtection(profile);
  const { selectedBusinessId } = useBusinessContext();

  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedBusinessId) return;

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          business_id,
          users (
            id,
            full_name,
            email,
            phone
          ),
          businesses (
            name
          )
        `)
        .eq('business_id', selectedBusinessId)
        .eq('active', true);

      if (error) {
        console.error('Error loading employees:', error.message);
        return;
      }

      const enriched = (data || []).map((entry) => ({
        id: entry.users?.id,
        full_name: entry.users?.full_name,
        email: entry.users?.email,
        phone: entry.users?.phone,
        business_name: entry.businesses?.name,
        role: entry.role,
      }));

      setEmployees(enriched);
    };

    fetchEmployees();
  }, [selectedBusinessId]); // ✅ use selectedBusinessId, not roleInfo

  const filtered = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SessionManager>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <button style={styles.addButton} onClick={() => navigate('/dashboard/add-user')}>
            Add Employee
          </button>
        </div>

        <div style={styles.gridHeader}>
          <span>Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Role</span>
          <span>Location</span>
        </div>

        {filtered.map((emp) => (
          <div
            key={emp.id}
            style={styles.gridRow}
            onClick={() => navigate(`/dashboard/employee/${emp.id}`)}
          >
            <span style={styles.link}>{emp.full_name}</span>
            <span>{emp.email}</span>
            <span>{emp.phone}</span>
            <span>{emp.role}</span>
            <span>{emp.business_name}</span>
          </div>
        ))}
      </div>
    </SessionManager>
  );
};

const styles = {
  container: {
    padding: '80px 20px 20px 20px', // top padding avoids header overlap
  },
  headerRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  searchInput: {
    flex: 3,
    padding: '10px',
    fontSize: '16px',
  },
  addButton: {
    flex: 1,
    padding: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#008080',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  gridHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr',
    fontWeight: 'bold',
    borderBottom: '1px solid #ccc',
    paddingBottom: '8px',
    marginBottom: '10px',
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr',
    padding: '10px 0',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
  },
  link: {
    color: '#008080',
    textDecoration: 'underline',
  },
};

export default EmployeeScreen;
