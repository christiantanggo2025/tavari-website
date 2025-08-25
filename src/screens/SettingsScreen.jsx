import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

const SettingsScreen = () => {
  const navigate = useNavigate();
  const { selectedBusinessId } = useBusinessContext();

  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // basic, hours, holidays

  // Default operating hours structure
  const defaultHours = {
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '12:00', close: '16:00', closed: true }
  };

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const timezones = [
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
    { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
    { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
    { value: 'America/St_Johns', label: 'Newfoundland Time (St. Johns)' },
    { value: 'America/Halifax', label: 'Atlantic Time (Halifax)' }
  ];

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

      // Ensure operating_hours has proper structure
      if (!data.operating_hours || typeof data.operating_hours !== 'object') {
        data.operating_hours = defaultHours;
      }

      // Ensure holiday_hours is an array
      if (!Array.isArray(data.holiday_hours)) {
        data.holiday_hours = [];
      }

      setBusinessData(data);
      setLoading(false);
    };

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

    if (businessData.business_email && !businessData.business_email.includes('@')) {
      setError('Please enter a valid business email.');
      return;
    }

    setSaving(true);
    
    // FIXED: Remove updated_at from the update since it doesn't exist in the table
    const { error } = await supabase
      .from('businesses')
      .update({
        name: businessData.name.trim(),
        business_address: businessData.business_address?.trim() || '',
        business_city: businessData.business_city?.trim() || '',
        business_state: businessData.business_state?.trim() || 'ON',
        business_postal: businessData.business_postal?.trim() || '',
        business_phone: businessData.business_phone?.trim() || '',
        business_email: businessData.business_email?.trim() || '',
        business_website: businessData.business_website?.trim() || '',
        tax_number: businessData.tax_number?.trim() || '',
        operating_hours: businessData.operating_hours || defaultHours,
        holiday_hours: businessData.holiday_hours || [],
        timezone: businessData.timezone || 'America/Toronto'
      })
      .eq('id', selectedBusinessId);

    if (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes.');
      setError(`Failed to save: ${error.message}`);
    } else {
      toast.success('Business settings saved successfully!');
      setError('');
    }

    setSaving(false);
  };

  const handleChange = (e) => {
    setBusinessData({ ...businessData, [e.target.name]: e.target.value });
  };

  const handleHoursChange = (day, field, value) => {
    const newHours = {
      ...businessData.operating_hours,
      [day]: {
        ...businessData.operating_hours[day],
        [field]: value
      }
    };
    setBusinessData({ ...businessData, operating_hours: newHours });
  };

  const handleDayClosedToggle = (day) => {
    const newHours = {
      ...businessData.operating_hours,
      [day]: {
        ...businessData.operating_hours[day],
        closed: !businessData.operating_hours[day].closed
      }
    };
    setBusinessData({ ...businessData, operating_hours: newHours });
  };

  const addHoliday = () => {
    const newHoliday = {
      id: Date.now(),
      date: '',
      name: '',
      closed: true,
      hours: { open: '10:00', close: '14:00' }
    };
    
    const updatedHolidays = [...(businessData.holiday_hours || []), newHoliday];
    setBusinessData({ ...businessData, holiday_hours: updatedHolidays });
  };

  const updateHoliday = (holidayId, field, value) => {
    const updatedHolidays = businessData.holiday_hours.map(holiday => 
      holiday.id === holidayId 
        ? { ...holiday, [field]: value }
        : holiday
    );
    setBusinessData({ ...businessData, holiday_hours: updatedHolidays });
  };

  const updateHolidayHours = (holidayId, timeField, value) => {
    const updatedHolidays = businessData.holiday_hours.map(holiday => 
      holiday.id === holidayId 
        ? { ...holiday, hours: { ...holiday.hours, [timeField]: value } }
        : holiday
    );
    setBusinessData({ ...businessData, holiday_hours: updatedHolidays });
  };

  const removeHoliday = (holidayId) => {
    const updatedHolidays = businessData.holiday_hours.filter(holiday => holiday.id !== holidayId);
    setBusinessData({ ...businessData, holiday_hours: updatedHolidays });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading business settings...</div>
      </div>
    );
  }

  if (error && !businessData) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Business Settings</h2>
        <p>Update your business information for receipts, reports, and customer communications</p>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        <button 
          style={{...styles.tab, ...(activeTab === 'basic' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('basic')}
        >
          Basic Information
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'hours' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('hours')}
        >
          Operating Hours
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'holidays' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('holidays')}
        >
          Holiday Hours
        </button>
      </div>

      <div style={styles.content}>
        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Basic Information</h3>
              
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Business Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={businessData?.name || ''}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter your business name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Business Email</label>
                  <input
                    type="email"
                    name="business_email"
                    value={businessData?.business_email || ''}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="info@yourbusiness.com"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Business Phone</label>
                  <input
                    type="tel"
                    name="business_phone"
                    value={businessData?.business_phone || ''}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="(519) 555-0123"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Website</label>
                  <input
                    type="url"
                    name="business_website"
                    value={businessData?.business_website || ''}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="www.yourbusiness.com"
                  />
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Business Address</h3>
              
              <div style={styles.formGrid}>
                <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                  <label style={styles.label}>Street Address</label>
                  <input
                    type="text"
                    name="business_address"
                    value={businessData?.business_address || ''}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="123 Main Street"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>City</label>
                  <input
                    type="text"
                    name="business_city"
                    value={businessData?.business_city || ''}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Your City"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Province/State</label>
                  <select
                    name="business_state"
                    value={businessData?.business_state || 'ON'}
                    onChange={handleChange}
                    style={styles.select}
                  >
                    <option value="ON">Ontario</option>
                    <option value="BC">British Columbia</option>
                    <option value="AB">Alberta</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="MB">Manitoba</option>
                    <option value="QC">Quebec</option>
                    <option value="NB">New Brunswick</option>
                    <option value="NS">Nova Scotia</option>
                    <option value="PE">Prince Edward Island</option>
                    <option value="NL">Newfoundland and Labrador</option>
                    <option value="YT">Yukon</option>
                    <option value="NT">Northwest Territories</option>
                    <option value="NU">Nunavut</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Postal Code</label>
                  <input
                    type="text"
                    name="business_postal"
                    value={businessData?.business_postal || ''}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="N1A 1A1"
                  />
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Tax Information</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Tax Number (HST/GST)</label>
                <input
                  type="text"
                  name="tax_number"
                  value={businessData?.tax_number || ''}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="HST# 123456789RT0001"
                />
                <div style={styles.helpText}>
                  This will appear on receipts and invoices for tax compliance
                </div>
              </div>
            </div>
          </>
        )}

        {/* Operating Hours Tab */}
        {activeTab === 'hours' && businessData && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Regular Operating Hours</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Timezone</label>
              <select
                name="timezone"
                value={businessData.timezone || 'America/Toronto'}
                onChange={handleChange}
                style={styles.select}
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.hoursGrid}>
              {daysOfWeek.map(({ key, label }) => {
                const dayHours = businessData.operating_hours?.[key] || defaultHours[key];
                
                return (
                  <div key={key} style={styles.dayRow}>
                    <div style={styles.dayLabel}>{label}</div>
                    
                    <div style={styles.hoursControls}>
                      <div style={styles.closedToggle}>
                        <input
                          type="checkbox"
                          id={`closed-${key}`}
                          checked={dayHours.closed}
                          onChange={() => handleDayClosedToggle(key)}
                          style={styles.checkbox}
                        />
                        <label htmlFor={`closed-${key}`} style={styles.closedLabel}>
                          Closed
                        </label>
                      </div>
                      
                      {!dayHours.closed && (
                        <div style={styles.timeControls}>
                          <div style={styles.timeInputGroup}>
                            <label style={styles.timeLabel}>Open:</label>
                            <input
                              type="time"
                              value={dayHours.open}
                              onChange={(e) => handleHoursChange(key, 'open', e.target.value)}
                              style={styles.timeInput}
                            />
                          </div>
                          
                          <div style={styles.timeInputGroup}>
                            <label style={styles.timeLabel}>Close:</label>
                            <input
                              type="time"
                              value={dayHours.close}
                              onChange={(e) => handleHoursChange(key, 'close', e.target.value)}
                              style={styles.timeInput}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Holiday Hours Tab */}
        {activeTab === 'holidays' && businessData && (
          <div style={styles.section}>
            <div style={styles.holidayHeader}>
              <h3 style={styles.sectionTitle}>Holiday & Special Hours</h3>
              <button onClick={addHoliday} style={styles.addButton}>
                + Add Holiday
              </button>
            </div>
            
            {businessData.holiday_hours?.length === 0 && (
              <div style={styles.emptyState}>
                <p>No holiday hours configured.</p>
                <p>Click "Add Holiday" to set special hours for holidays or events.</p>
              </div>
            )}

            {businessData.holiday_hours?.map((holiday) => (
              <div key={holiday.id} style={styles.holidayRow}>
                <div style={styles.holidayGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date</label>
                    <input
                      type="date"
                      value={holiday.date}
                      onChange={(e) => updateHoliday(holiday.id, 'date', e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Holiday Name</label>
                    <input
                      type="text"
                      value={holiday.name}
                      onChange={(e) => updateHoliday(holiday.id, 'name', e.target.value)}
                      style={styles.input}
                      placeholder="Christmas Day, New Year's Eve, etc."
                    />
                  </div>
                </div>
                
                <div style={styles.holidayControls}>
                  <div style={styles.closedToggle}>
                    <input
                      type="checkbox"
                      id={`holiday-closed-${holiday.id}`}
                      checked={holiday.closed}
                      onChange={(e) => updateHoliday(holiday.id, 'closed', e.target.checked)}
                      style={styles.checkbox}
                    />
                    <label htmlFor={`holiday-closed-${holiday.id}`} style={styles.closedLabel}>
                      Closed All Day
                    </label>
                  </div>
                  
                  {!holiday.closed && (
                    <div style={styles.holidayTimes}>
                      <div style={styles.timeInputGroup}>
                        <label style={styles.timeLabel}>Open:</label>
                        <input
                          type="time"
                          value={holiday.hours?.open || '10:00'}
                          onChange={(e) => updateHolidayHours(holiday.id, 'open', e.target.value)}
                          style={styles.timeInput}
                        />
                      </div>
                      
                      <div style={styles.timeInputGroup}>
                        <label style={styles.timeLabel}>Close:</label>
                        <input
                          type="time"
                          value={holiday.hours?.close || '14:00'}
                          onChange={(e) => updateHolidayHours(holiday.id, 'close', e.target.value)}
                          style={styles.timeInput}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => removeHoliday(holiday.id)}
                  style={styles.removeButton}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {error && businessData && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}
      </div>

      <div style={styles.actions}>
        <button 
          onClick={() => navigate('/dashboard/audit-logs')} 
          style={styles.secondaryButton}
        >
          View Audit Logs
        </button>
        
        <button 
          onClick={handleSave} 
          disabled={saving || !businessData} 
          style={styles.primaryButton}
        >
          {saving ? 'Saving Changes...' : 'Save Business Settings'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    paddingTop: '100px',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '20px',
    textAlign: 'center'
  },
  tabNav: {
    display: 'flex',
    gap: '2px',
    marginBottom: '30px',
    backgroundColor: '#e5e7eb',
    borderRadius: '8px',
    padding: '4px'
  },
  tab: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  activeTab: {
    backgroundColor: 'white',
    color: '#008080',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '20px'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '25px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    borderBottom: '2px solid #008080',
    paddingBottom: '8px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    transition: 'border-color 0.2s ease'
  },
  select: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  helpText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
    fontStyle: 'italic'
  },
  hoursGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  dayRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  dayLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#374151',
    minWidth: '120px'
  },
  hoursControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '25px',
    flex: 1
  },
  closedToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '80px'
  },
  // FIXED: Enhanced checkbox styles for better visibility
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    accentColor: '#008080',
    transform: 'scale(1.2)', // Make checkbox bigger
    margin: '0' // Remove default margins
  },
  closedLabel: {
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: '500'
  },
  timeControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  timeInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  timeLabel: {
    fontSize: '14px',
    color: '#374151',
    minWidth: '40px',
    fontWeight: '500'
  },
  timeInput: {
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },
  holidayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6b7280'
  },
  holidayRow: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    marginBottom: '15px'
  },
  holidayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px'
  },
  holidayControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '15px'
  },
  holidayTimes: {
    display: 'flex',
    gap: '15px'
  },
  removeButton: {
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #fecaca'
  },
  actions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'space-between'
  },
  secondaryButton: {
    flex: 1,
    padding: '15px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  primaryButton: {
    flex: 2,
    padding: '15px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#dc2626',
    fontSize: '16px'
  }
};

export default SettingsScreen;