// src/screens/Music/MusicAdManager.jsx
import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiUpload, FiPlay, FiPause, FiSettings, FiBarChart, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useBusiness } from '../../contexts/BusinessContext';
import useAccessProtection from '../../hooks/useAccessProtection';
import SessionManager from '../../components/SessionManager';
import { supabase } from '../../supabaseClient';

const MusicAdManager = () => {
  const { profile } = useUserProfile();
  const { business } = useBusiness();
  useAccessProtection(profile);

  const [ads, setAds] = useState([]);
  const [adSettings, setAdSettings] = useState({
    frequency: 5, // every X songs
    enabled: true,
    volume_adjustment: 0.8 // 80% of music volume
  });
  const [adStats, setAdStats] = useState({
    totalPlays: 0,
    todayPlays: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [uploadingAd, setUploadingAd] = useState(false);

  // Load ads and settings
  useEffect(() => {
    if (business?.id) {
      loadAds();
      loadAdSettings();
      loadAdStats();
    }
  }, [business?.id]);

  const loadAds = async () => {
    try {
      const { data, error } = await supabase
        .from('music_ads')
        .select('*')
        .or(`target_business_types.cs.{${business?.type || 'general'}},target_business_types.cs.{general}`)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error loading ads:', error);
    }
  };

  const loadAdSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('music_settings')
        .select('ad_frequency, ad_enabled, ad_volume_adjustment')
        .eq('business_id', business.id)
        .single();

      if (data) {
        setAdSettings({
          frequency: data.ad_frequency || 5,
          enabled: data.ad_enabled !== false,
          volume_adjustment: data.ad_volume_adjustment || 0.8
        });
      }
    } catch (error) {
      console.error('Error loading ad settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Total plays
      const { count: totalCount } = await supabase
        .from('music_ad_plays')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id);

      // Today's plays
      const { count: todayCount } = await supabase
        .from('music_ad_plays')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('played_at', `${today}T00:00:00.000Z`);

      // Calculate revenue (example: $0.01 per play)
      const revenue = (totalCount || 0) * 0.01;

      setAdStats({
        totalPlays: totalCount || 0,
        todayPlays: todayCount || 0,
        revenue: revenue
      });
    } catch (error) {
      console.error('Error loading ad stats:', error);
    }
  };

  const updateAdSettings = async (newSettings) => {
    try {
      const { error } = await supabase
        .from('music_settings')
        .upsert({
          business_id: business.id,
          ad_frequency: newSettings.frequency,
          ad_enabled: newSettings.enabled,
          ad_volume_adjustment: newSettings.volume_adjustment,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'business_id'
        });

      if (error) throw error;

      setAdSettings(newSettings);
    } catch (error) {
      console.error('Error updating ad settings:', error);
      alert('Failed to update ad settings');
    }
  };

  const uploadLocalAd = async (file, adInfo) => {
    if (!business?.id) {
      alert('Please select a business first');
      return;
    }

    setUploadingAd(true);
    try {
      // Create unique filename
      const fileName = `local-ads/${business.id}/${Date.now()}_${file.name}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('music-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get file duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      
      const duration = await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(Math.round(audio.duration));
        });
        audio.addEventListener('error', () => {
          resolve(30); // Default 30 seconds
        });
      });

      // Insert into local ads table
      const { error: dbError } = await supabase
        .from('music_local_ads')
        .insert({
          business_id: business.id,
          title: adInfo.title,
          file_path: uploadData.path,
          duration: duration,
          active: true,
          play_frequency: adInfo.frequency || 10,
          uploaded_by: profile.id
        });

      if (dbError) throw dbError;

      alert('Local ad uploaded successfully!');
      loadAds(); // Refresh the list
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload ad: ' + error.message);
    } finally {
      setUploadingAd(false);
    }
  };

  const handleLocalAdUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.mp3,audio/mp3,audio/mpeg';
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const title = prompt('Enter ad title:', file.name.replace('.mp3', ''));
      const frequency = parseInt(prompt('Play every X songs (default: 10):', '10')) || 10;

      if (title) {
        uploadLocalAd(file, { title, frequency });
      }
    };

    fileInput.click();
  };

  const simulateAdPlay = async (adId) => {
    try {
      // Log the ad play
      const { error } = await supabase
        .from('music_ad_plays')
        .insert({
          ad_id: adId,
          business_id: business.id,
          played_at: new Date().toISOString()
        });

      if (error) throw error;

      // Refresh stats
      loadAdStats();
      alert('Ad play logged! (This would normally play the audio)');
    } catch (error) {
      console.error('Error logging ad play:', error);
    }
  };

  if (loading) {
    return (
      <SessionManager>
        <div style={styles.container}>
          <div style={styles.loading}>Loading ad manager...</div>
        </div>
      </SessionManager>
    );
  }

  return (
    <SessionManager>
      <div style={styles.container}>
        <div style={styles.header}>
          <FiDollarSign size={32} style={styles.headerIcon} />
          <h1 style={styles.title}>Ad Manager</h1>
          <p style={styles.subtitle}>
            Manage advertisements and revenue for {business?.name || 'your business'}
          </p>
        </div>

        {/* Ad Revenue Stats */}
        <div style={styles.statsSection}>
          <div style={styles.statCard}>
            <FiBarChart size={24} style={styles.statIcon} />
            <div>
              <h3 style={styles.statNumber}>{adStats.totalPlays}</h3>
              <p style={styles.statLabel}>Total Ad Plays</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <FiPlay size={24} style={styles.statIcon} />
            <div>
              <h3 style={styles.statNumber}>{adStats.todayPlays}</h3>
              <p style={styles.statLabel}>Today's Plays</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <FiDollarSign size={24} style={styles.statIcon} />
            <div>
              <h3 style={styles.statNumber}>${adStats.revenue.toFixed(2)}</h3>
              <p style={styles.statLabel}>Total Revenue</p>
            </div>
          </div>
        </div>

        {/* Ad Settings */}
        <div style={styles.settingsSection}>
          <h2 style={styles.sectionTitle}>Ad Settings</h2>
          <div style={styles.settingsGrid}>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Enable Ads</label>
              <div 
                style={styles.toggle} 
                onClick={() => updateAdSettings({...adSettings, enabled: !adSettings.enabled})}
              >
                {adSettings.enabled ? (
                  <FiToggleRight size={24} color="#28a745" />
                ) : (
                  <FiToggleLeft size={24} color="#6c757d" />
                )}
              </div>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Play every</label>
              <select
                style={styles.settingSelect}
                value={adSettings.frequency}
                onChange={(e) => updateAdSettings({...adSettings, frequency: parseInt(e.target.value)})}
              >
                <option value={3}>3 songs</option>
                <option value={5}>5 songs</option>
                <option value={7}>7 songs</option>
                <option value={10}>10 songs</option>
                <option value={15}>15 songs</option>
              </select>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Ad Volume</label>
              <select
                style={styles.settingSelect}
                value={adSettings.volume_adjustment}
                onChange={(e) => updateAdSettings({...adSettings, volume_adjustment: parseFloat(e.target.value)})}
              >
                <option value={0.6}>60%</option>
                <option value={0.7}>70%</option>
                <option value={0.8}>80%</option>
                <option value={0.9}>90%</option>
                <option value={1.0}>100%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Local Ad Upload */}
        <div style={styles.uploadSection}>
          <h2 style={styles.sectionTitle}>Upload Local Ad</h2>
          <p style={styles.uploadDescription}>
            Upload your own advertisements to play alongside network ads
          </p>
          <button
            style={styles.uploadButton}
            onClick={handleLocalAdUpload}
            disabled={uploadingAd}
          >
            <FiUpload size={20} />
            {uploadingAd ? 'Uploading...' : 'Upload Local Ad'}
          </button>
        </div>

        {/* Available Ads */}
        <div style={styles.adsSection}>
          <h2 style={styles.sectionTitle}>Available Ads ({ads.length})</h2>
          {ads.length === 0 ? (
            <div style={styles.emptyState}>
              <FiDollarSign size={48} style={styles.emptyIcon} />
              <h3>No ads available</h3>
              <p>Network ads will appear here when available for your business type</p>
            </div>
          ) : (
            <div style={styles.adsList}>
              {ads.map(ad => (
                <div key={ad.id} style={styles.adItem}>
                  <div style={styles.adInfo}>
                    <h3 style={styles.adTitle}>{ad.title}</h3>
                    <p style={styles.adMeta}>
                      Duration: {ad.duration}s • 
                      Target: {ad.target_business_types?.join(', ') || 'All businesses'}
                    </p>
                  </div>
                  <div style={styles.adActions}>
                    <button
                      style={styles.testButton}
                      onClick={() => simulateAdPlay(ad.id)}
                    >
                      <FiPlay size={16} />
                      Test Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integration Info */}
        <div style={styles.infoSection}>
          <h3 style={styles.infoTitle}>How It Works</h3>
          <ul style={styles.infoList}>
            <li>Ads play automatically between songs based on your frequency setting</li>
            <li>Network ads are targeted to your business type</li>
            <li>You earn revenue for each ad play</li>
            <li>Local ads give you control over your own messaging</li>
            <li>All ad plays are tracked for reporting and revenue calculation</li>
          </ul>
        </div>
      </div>
    </SessionManager>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '18px',
    color: '#666',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e9ecef',
  },
  headerIcon: {
    color: '#28a745',
    marginBottom: '10px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  },
  statsSection: {
    display: 'flex',
    gap: '20px',
    marginBottom: '40px',
    flexWrap: 'wrap',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '2px solid #28a745',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flex: '1',
    minWidth: '200px',
  },
  statIcon: {
    color: '#28a745',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 5px 0',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  settingsSection: {
    backgroundColor: '#f8f9fa',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  settingItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  settingLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  settingSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  toggle: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  uploadSection: {
    textAlign: 'center',
    padding: '30px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
    marginBottom: '40px',
  },
  uploadDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  uploadButton: {
    backgroundColor: '#20c997',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
  },
  adsSection: {
    marginBottom: '40px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
  },
  emptyIcon: {
    color: '#ccc',
    marginBottom: '20px',
  },
  adsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  adItem: {
    backgroundColor: '#fff',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  adInfo: {
    flex: '1',
    minWidth: '200px',
  },
  adTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  },
  adMeta: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  adActions: {
    display: 'flex',
    gap: '10px',
  },
  testButton: {
    backgroundColor: '#17a2b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  infoSection: {
    backgroundColor: '#e3f7fc',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #17a2b8',
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 15px 0',
  },
  infoList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#666',
    lineHeight: '1.6',
  },
};

export default MusicAdManager;