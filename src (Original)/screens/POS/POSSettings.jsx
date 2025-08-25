// src/screens/POS/POSSettings.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';

const POSSettings = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [settings, setSettings] = useState({
    terminal_mode: 'manual',
    pin_required: false,
    tip_enabled: true,
    default_tip_percent: 0.15,
    tax_rate: 0,
    service_fee: 0,
    receipt_footer: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch settings on load
  useEffect(() => {
    if (businessId) fetchSettings();
  }, [businessId]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
      } else {
        // No row? Insert defaults
        await supabase.from('pos_settings').insert([{ business_id: businessId }]);
        const { data: newData } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('business_id', businessId)
          .single();
        setSettings(newData);
      }
    } catch (err) {
      setError('Error loading settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    try {
      const { error } = await supabase
        .from('pos_settings')
        .update({
          terminal_mode: settings.terminal_mode,
          pin_required: settings.pin_required,
          tip_enabled: settings.tip_enabled,
          default_tip_percent: settings.default_tip_percent,
          tax_rate: settings.tax_rate,
          service_fee: settings.service_fee,
          receipt_footer: settings.receipt_footer,
          updated_at: new Date()
        })
        .eq('business_id', businessId);

      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (err) {
      setError('Error saving settings: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading settings...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>POS Settings</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      <div style={{ marginBottom: 10 }}>
        <label>Terminal Mode: </label>
        <select
          value={settings.terminal_mode}
          onChange={(e) => setSettings({ ...settings, terminal_mode: e.target.value })}
        >
          <option value="manual">Manual</option>
          <option value="integrated">Integrated</option>
        </select>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={settings.pin_required}
            onChange={(e) => setSettings({ ...settings, pin_required: e.target.checked })}
          />
          Require PIN for register
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={settings.tip_enabled}
            onChange={(e) => setSettings({ ...settings, tip_enabled: e.target.checked })}
          />
          Enable Tips
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Default Tip %: </label>
        <input
          type="number"
          step="0.01"
          value={settings.default_tip_percent}
          onChange={(e) => setSettings({ ...settings, default_tip_percent: parseFloat(e.target.value) })}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Tax Rate %: </label>
        <input
          type="number"
          step="0.01"
          value={settings.tax_rate}
          onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Service Fee %: </label>
        <input
          type="number"
          step="0.01"
          value={settings.service_fee}
          onChange={(e) => setSettings({ ...settings, service_fee: parseFloat(e.target.value) })}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Receipt Footer:</label>
        <textarea
          value={settings.receipt_footer || ''}
          onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
          style={{ width: '100%', height: 60 }}
        />
      </div>

      <button onClick={handleSave}>Save Settings</button>
    </div>
  );
};

export default POSSettings;
