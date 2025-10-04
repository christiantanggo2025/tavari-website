// screens/TavariAdmin/TOSABusinessEditor.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiEdit, FiSave, FiX, FiDatabase, FiUsers, FiSettings, FiCreditCard } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import { SecurityWrapper } from '../../Security';
import { useTOSATavariAuth } from '../../hooks/useTOSATavariAuth';
import TOSAHeaderBar from '../../components/TavariAdminComp/TOSAHeaderBar';
import TOSASidebarNav from '../../components/TavariAdminComp/TOSASidebarNav';
import TOSABusinessSelector from '../../components/TavariAdminComp/TOSABusinessSelector';

const TOSABusinessEditor = () => {
  const { businessId: paramBusinessId } = useParams();
  const [selectedBusinessId, setSelectedBusinessId] = useState(paramBusinessId || null);
  const [activeTab, setActiveTab] = useState('general');
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const auth = useTOSATavariAuth({
    requiredPermissions: ['business_management'],
    componentName: 'TOSABusinessEditor'
  });

  useEffect(() => {
    if (selectedBusinessId) {
      // Extract the ID if an object was passed
      const businessId = typeof selectedBusinessId === 'object' && selectedBusinessId.id 
        ? selectedBusinessId.id 
        : selectedBusinessId;
        
      if (businessId && typeof businessId === 'string') {
        loadBusinessData(businessId);
      }
    }
  }, [selectedBusinessId]);

  const loadBusinessData = async (businessId) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Loading business data for ID:', businessId, 'Type:', typeof businessId);
      
      // Ensure we have a valid UUID string
      if (!businessId || typeof businessId !== 'string') {
        throw new Error('Invalid business ID provided');
      }

      // Load business data - only from businesses table since business_settings doesn't exist
      const { data, error: loadError } = await supabase
        .from('businesses')
        .select('*') // Get all fields from businesses table
        .eq('id', businessId)
        .single();

      if (loadError) {
        console.error('Supabase error:', loadError);
        throw loadError;
      }
      
      console.log('Loaded business data:', data);
      
      // Also try to load related user data for this business
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, employment_status, hire_date, position, department')
        .eq('business_id', businessId)
        .limit(10); // Limit to first 10 users for performance

      if (userError) {
        console.warn('Error loading users:', userError);
      } else {
        console.log('Loaded users:', userData);
      }

      // Combine the data
      const enrichedData = {
        ...data,
        users: userData || []
      };

      setBusinessData(enrichedData);

      await auth.logUserAction('business_data_loaded', { business_id: businessId });

    } catch (err) {
      console.error('Error in loadBusinessData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessData = async () => {
    if (!businessData) return;
    
    setSaving(true);
    try {
      const { error: saveError } = await supabase
        .from('businesses')
        .update({
          name: businessData.name,
          email: businessData.email,
          phone: businessData.phone,
          is_active: businessData.is_active,
          subscription_status: businessData.subscription_status
        })
        .eq('id', businessData.id);

      if (saveError) throw saveError;

      await auth.logUserAction('business_data_saved', { 
        business_id: businessData.id,
        changes: ['name', 'email', 'phone', 'is_active', 'subscription_status']
      });

      alert('Business data saved successfully!');

    } catch (err) {
      setError(err.message);
      console.error('Error saving business data:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General Info', icon: <FiEdit /> },
    { id: 'employees', label: 'Employees', icon: <FiUsers /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings /> },
    { id: 'subscription', label: 'Subscription', icon: <FiCreditCard /> },
    { id: 'database', label: 'Database', icon: <FiDatabase /> }
  ];

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: TavariStyles.colors.gray50,
      fontFamily: TavariStyles.typography.fontFamily
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '250px' // Account for fixed sidebar width
    },
    main: {
      flex: 1,
      padding: TavariStyles.spacing.xl,
      paddingTop: '120px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.xl
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['2xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800
    },
    saveButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      opacity: saving ? 0.6 : 1
    },
    tabContainer: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      boxShadow: TavariStyles.shadows.md,
      overflow: 'hidden'
    },
    tabHeader: {
      display: 'flex',
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    tab: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm,
      padding: TavariStyles.spacing.lg,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal,
      backgroundColor: TavariStyles.colors.gray50,
      border: 'none',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    activeTab: {
      backgroundColor: TavariStyles.colors.white,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`,
      color: TavariStyles.colors.primary
    },
    tabContent: {
      padding: TavariStyles.spacing.xl
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: TavariStyles.spacing.lg
    },
    formGroup: {
      marginBottom: TavariStyles.spacing.lg
    },
    label: {
      ...TavariStyles.components.form.label
    },
    input: {
      ...TavariStyles.components.form.input,
      width: '100%'
    },
    textarea: {
      ...TavariStyles.components.form.input,
      width: '100%',
      minHeight: '100px',
      resize: 'vertical'
    },
    select: {
      ...TavariStyles.components.form.select,
      width: '100%'
    },
    employeeList: {
      display: 'grid',
      gap: TavariStyles.spacing.md
    },
    employeeItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md
    },
    databaseStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.lg
    },
    statCard: {
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      textAlign: 'center'
    },
    statNumber: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary
    },
    statLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      marginTop: TavariStyles.spacing.xs
    }
  };

  if (auth.authLoading) {
    return <div>Loading TOSA Business Editor...</div>;
  }

  if (!auth.isAuthenticated) {
    return <div>Access denied. Tavari employees only.</div>;
  }

  const renderTabContent = () => {
    if (!businessData) {
      return <div>Select a business to edit...</div>;
    }

    switch (activeTab) {
      case 'general':
        return (
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Business Name</label>
              <input
                style={styles.input}
                type="text"
                value={businessData.name || ''}
                onChange={(e) => setBusinessData({...businessData, name: e.target.value})}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                value={businessData.email || ''}
                onChange={(e) => setBusinessData({...businessData, email: e.target.value})}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input
                style={styles.input}
                type="tel"
                value={businessData.phone || ''}
                onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                style={styles.select}
                value={businessData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setBusinessData({...businessData, is_active: e.target.value === 'active'})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        );

      case 'employees':
        return (
          <div style={styles.employeeList}>
            <h3>Employees ({businessData.users?.length || 0})</h3>
            {businessData.users && businessData.users.length > 0 ? (
              businessData.users.map((user, index) => (
                <div key={index} style={styles.employeeItem}>
                  <div>
                    <strong>{user.full_name || 'No name'}</strong>
                    <div style={{fontSize: '12px', color: '#666'}}>
                      {user.email} • {user.position || 'No position'} • {user.employment_status || 'Unknown status'}
                    </div>
                    {user.hire_date && (
                      <div style={{fontSize: '12px', color: '#999'}}>
                        Hired: {new Date(user.hire_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <button style={styles.saveButton}>View Details</button>
                </div>
              ))
            ) : (
              <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
                No employees found for this business
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Timezone</label>
              <input
                style={styles.input}
                type="text"
                value={businessData.timezone || ''}
                onChange={(e) => setBusinessData({...businessData, timezone: e.target.value})}
                placeholder="e.g., America/Toronto"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Operating Hours</label>
              <textarea
                style={styles.textarea}
                value={businessData.operating_hours || ''}
                onChange={(e) => setBusinessData({...businessData, operating_hours: e.target.value})}
                placeholder="e.g., Mon-Fri: 9AM-5PM"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Holiday Hours</label>
              <textarea
                style={styles.textarea}
                value={businessData.holiday_hours || ''}
                onChange={(e) => setBusinessData({...businessData, holiday_hours: e.target.value})}
                placeholder="Special holiday operating hours"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tax Number</label>
              <input
                style={styles.input}
                type="text"
                value={businessData.tax_number || ''}
                onChange={(e) => setBusinessData({...businessData, tax_number: e.target.value})}
                placeholder="Business tax identification number"
              />
            </div>
          </div>
        );

      case 'subscription':
        return (
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Business Status</label>
              <select
                style={styles.select}
                value={businessData.business_state || 'active'}
                onChange={(e) => setBusinessData({...businessData, business_state: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Created Date</label>
              <input
                style={styles.input}
                type="text"
                value={businessData.created_at ? new Date(businessData.created_at).toLocaleDateString() : 'Unknown'}
                disabled
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Created By</label>
              <input
                style={styles.input}
                type="text"
                value={businessData.created_by || 'Unknown'}
                disabled
              />
            </div>
          </div>
        );

      case 'database':
        return (
          <div style={styles.databaseStats}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{businessData.users?.length || 0}</div>
              <div style={styles.statLabel}>Users</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{businessData.created_at ? '1' : '0'}</div>
              <div style={styles.statLabel}>Business Record</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {businessData.created_at ? 
                  Math.floor((new Date() - new Date(businessData.created_at)) / (1000 * 60 * 60 * 24)) : 0
                }
              </div>
              <div style={styles.statLabel}>Days Active</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>Available</div>
              <div style={styles.statLabel}>Status</div>
            </div>
          </div>
        );

      default:
        return <div>Tab content not implemented</div>;
    }
  };

  return (
    <SecurityWrapper componentName="TOSABusinessEditor" sensitiveComponent={true}>
      <div style={styles.container}>
        <TOSASidebarNav />
        
        <div style={styles.content}>
          <TOSAHeaderBar />
          
          <main style={styles.main}>
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>Business Editor</h1>
                <TOSABusinessSelector onBusinessSelect={(business) => {
                // Extract the ID from the business object
                const businessId = business ? business.id : null;
                setSelectedBusinessId(businessId);
              }} />
              </div>
              
              {businessData && (
                <button
                  style={styles.saveButton}
                  onClick={saveBusinessData}
                  disabled={saving}
                >
                  <FiSave />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>

            {error && (
              <div style={{
                padding: TavariStyles.spacing.md,
                backgroundColor: TavariStyles.colors.errorBg,
                color: TavariStyles.colors.errorText,
                borderRadius: TavariStyles.borderRadius.md,
                marginBottom: TavariStyles.spacing.lg
              }}>
                {error}
              </div>
            )}

            {loading ? (
              <div>Loading business data...</div>
            ) : (
              <div style={styles.tabContainer}>
                <div style={styles.tabHeader}>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      style={{
                        ...styles.tab,
                        ...(activeTab === tab.id ? styles.activeTab : {})
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
                
                <div style={styles.tabContent}>
                  {renderTabContent()}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default TOSABusinessEditor;