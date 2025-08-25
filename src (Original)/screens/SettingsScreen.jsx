import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import HeaderBar from '../components/HeaderBar.jsx';
import SidebarNav from '../components/SidebarNav.jsx';

const SettingsScreen = () => {
  const navigate = useNavigate();
  const { selectedBusinessId } = useBusinessContext();

  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', selectedBusinessId)
        .single();

      if (error || !data) {
        setError('Unable to load business settings.');
        setLoading(false);
        return;
      }

      setBusinessData(data);
      setLoading(false);
    };
	
	console.log('Selected Business ID:', selectedBusinessId); // TEMP DEBUG

    if (selectedBusinessId && typeof selectedBusinessId === 'string') {
      fetchBusiness();
    } else {
      console.warn('Invalid selectedBusinessId in context:', selectedBusinessId);
    }
  }, [selectedBusinessId]);

  const handleSave = async () => {
    if (!businessData.name.trim()) {
      setError('Business name cannot be empty.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('businesses')
      .update({ name: businessData.name })
      .eq('id', selectedBusinessId);

    if (error) {
      toast.error('Failed to save changes.');
    } else {
      toast.success('Settings saved.');
    }

    setSaving(false);
  };

  const handleChange = (e) => {
    setBusinessData({ ...businessData, [e.target.name]: e.target.value });
  };

  if (loading) return <div style={{ padding: 20, paddingTop: 80 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <SidebarNav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <HeaderBar />
        <div style={{ padding: 20, paddingTop: 80 }}>
          <h2>Business Settings</h2>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Business Name</label>
            <input
              type="text"
              name="name"
              value={businessData.name || ''}
              onChange={handleChange}
              style={{ padding: 8, width: '100%', maxWidth: 400 }}
            />
          </div>

          <button onClick={handleSave} disabled={saving} style={{ marginRight: 12, padding: 10 }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          <button onClick={() => navigate('/dashboard/audit-logs')} style={{ padding: 10 }}>
            View Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
