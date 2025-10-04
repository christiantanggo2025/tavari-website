// components/TavariAdminComp/TOSABusinessSelector.jsx
import React, { useState, useEffect } from 'react';
import { FiSearch, FiHome, FiChevronDown, FiX } from 'react-icons/fi';
import { supabase } from '../../supabaseClient';
import { TavariStyles } from '../../utils/TavariStyles';
import { useSecurityContext } from '../../Security';

const TOSABusinessSelector = ({ onBusinessSelect }) => {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const security = useSecurityContext({
    componentName: 'TOSABusinessSelector',
    sensitiveComponent: true
  });

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      // Load businesses with exact field names from your database
      const { data, error } = await supabase
        .from('businesses')
        .select('*') // Select all fields to see what's available
        .order('name');

      if (error) throw error;

      console.log('Loaded businesses:', data); // Debug log to see actual structure
      setBusinesses(data || []);

      await security.logSecurityEvent('tosa_businesses_loaded', {
        count: data?.length || 0
      });

    } catch (error) {
      console.error('Error loading businesses:', error);
      await security.logSecurityEvent('tosa_businesses_load_error', {
        error: error.message
      }, 'high');
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = businesses.filter(business => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (business.name && business.name.toLowerCase().includes(searchLower)) ||
      (business.business_email && business.business_email.toLowerCase().includes(searchLower)) ||
      (business.business_city && business.business_city.toLowerCase().includes(searchLower)) ||
      (business.business_state && business.business_state.toLowerCase().includes(searchLower))
    );
  });

  const handleBusinessSelect = async (business) => {
    setSelectedBusiness(business);
    setShowDropdown(false);
    setSearchTerm('');
    
    if (onBusinessSelect) {
      onBusinessSelect(business);
    }

    await security.logSecurityEvent('tosa_business_selected', {
      business_id: business.id,
      business_name: business.name
    });
  };

  const clearSelection = () => {
    setSelectedBusiness(null);
    if (onBusinessSelect) {
      onBusinessSelect(null);
    }
  };

  // Simple status determination - you may need to adjust this based on your data
  const getStatusColor = (business) => {
    // Since I can't see the exact status field, using created_at as a simple indicator
    // You can modify this once we see the actual business data structure
    if (business.created_at) {
      const createdDate = new Date(business.created_at);
      const now = new Date();
      const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < 7) return TavariStyles.colors.success; // New business
      return TavariStyles.colors.info; // Established business
    }
    return TavariStyles.colors.gray400;
  };

  const getStatusText = (business) => {
    if (business.created_at) {
      const createdDate = new Date(business.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 7) return 'New';
      if (daysDiff < 30) return 'Recent';
      return 'Established';
    }
    return 'Unknown';
  };

  const styles = {
    container: {
      position: 'relative',
      minWidth: '300px'
    },

    selector: {
      display: 'flex',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.white,
      border: `2px solid ${TavariStyles.colors.gray200}`,
      borderRadius: TavariStyles.borderRadius.lg,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal,
      gap: TavariStyles.spacing.sm
    },

    selectorFocused: {
      borderColor: TavariStyles.colors.primary,
      boxShadow: `0 0 0 3px ${TavariStyles.colors.primary}20`
    },

    selectorContent: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },

    businessIcon: {
      fontSize: '18px',
      color: TavariStyles.colors.primary
    },

    businessInfo: {
      flex: 1
    },

    businessName: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray800,
      marginBottom: '2px'
    },

    businessEmail: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500
    },

    placeholderText: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500
    },

    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      marginRight: TavariStyles.spacing.xs
    },

    clearButton: {
      padding: TavariStyles.spacing.xs,
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: TavariStyles.borderRadius.sm,
      cursor: 'pointer',
      color: TavariStyles.colors.gray400,
      transition: TavariStyles.transitions.normal
    },

    chevron: {
      fontSize: '16px',
      color: TavariStyles.colors.gray400,
      transition: TavariStyles.transitions.normal
    },

    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: TavariStyles.colors.white,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      borderRadius: TavariStyles.borderRadius.lg,
      boxShadow: TavariStyles.shadows.lg,
      zIndex: 100,
      maxHeight: '400px',
      overflowY: 'auto',
      marginTop: TavariStyles.spacing.xs
    },

    searchContainer: {
      padding: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },

    searchInput: {
      width: '100%',
      padding: TavariStyles.spacing.sm,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      borderRadius: TavariStyles.borderRadius.md,
      fontSize: TavariStyles.typography.fontSize.sm,
      outline: 'none',
      boxSizing: 'border-box'
    },

    businessItem: {
      display: 'flex',
      alignItems: 'center',
      padding: TavariStyles.spacing.md,
      cursor: 'pointer',
      transition: TavariStyles.transitions.normal,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`,
      gap: TavariStyles.spacing.sm
    },

    businessItemHover: {
      backgroundColor: TavariStyles.colors.gray50
    },

    businessItemInfo: {
      flex: 1
    },

    businessItemName: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray800,
      marginBottom: '2px'
    },

    businessItemDetails: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500
    },

    businessItemStatus: {
      display: 'flex',
      alignItems: 'center',
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },

    noResults: {
      padding: TavariStyles.spacing.xl,
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.sm
    },

    loadingText: {
      padding: TavariStyles.spacing.xl,
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.sm
    }
  };

  return (
    <div style={styles.container}>
      {/* Selector */}
      <div
        style={{
          ...styles.selector,
          ...(showDropdown ? styles.selectorFocused : {})
        }}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div style={styles.selectorContent}>
          <FiHome style={styles.businessIcon} />
          
          {selectedBusiness ? (
            <div style={styles.businessInfo}>
              <div style={styles.businessName}>{selectedBusiness.name}</div>
              <div style={styles.businessEmail}>
                {selectedBusiness.business_email || selectedBusiness.business_city || 'No details available'}
              </div>
            </div>
          ) : (
            <div style={styles.placeholderText}>
              Select a business to manage...
            </div>
          )}
        </div>

        {selectedBusiness && (
          <>
            <div style={styles.businessItemStatus}>
              <div
                style={{
                  ...styles.statusDot,
                  backgroundColor: getStatusColor(selectedBusiness)
                }}
              />
              {getStatusText(selectedBusiness)}
            </div>
            
            <button
              style={styles.clearButton}
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = TavariStyles.colors.gray600}
              onMouseLeave={(e) => e.currentTarget.style.color = TavariStyles.colors.gray400}
            >
              <FiX />
            </button>
          </>
        )}

        <FiChevronDown
          style={{
            ...styles.chevron,
            transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={styles.dropdown}>
          {/* Search */}
          <div style={styles.searchContainer}>
            <div style={{ position: 'relative' }}>
              <FiSearch
                style={{
                  position: 'absolute',
                  left: TavariStyles.spacing.sm,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: TavariStyles.colors.gray400,
                  fontSize: '14px'
                }}
              />
              <input
                style={{
                  ...styles.searchInput,
                  paddingLeft: TavariStyles.spacing['2xl']
                }}
                type="text"
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Business List */}
          {loading ? (
            <div style={styles.loadingText}>Loading businesses...</div>
          ) : filteredBusinesses.length === 0 ? (
            <div style={styles.noResults}>
              {searchTerm ? 'No businesses found matching your search.' : 'No businesses available.'}
            </div>
          ) : (
            filteredBusinesses.map((business) => (
              <div
                key={business.id}
                style={styles.businessItem}
                onClick={() => handleBusinessSelect(business)}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.businessItemHover)}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FiHome style={styles.businessIcon} />
                
                <div style={styles.businessItemInfo}>
                  <div style={styles.businessItemName}>{business.name}</div>
                  <div style={styles.businessItemDetails}>
                    {[
                      business.business_email,
                      business.business_city,
                      business.business_state,
                      business.created_at ? `Created ${new Date(business.created_at).toLocaleDateString()}` : null
                    ].filter(Boolean).join(' • ')}
                  </div>
                </div>

                <div style={styles.businessItemStatus}>
                  <div
                    style={{
                      ...styles.statusDot,
                      backgroundColor: getStatusColor(business)
                    }}
                  />
                  {getStatusText(business)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Click outside handler */}
      {showDropdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default TOSABusinessSelector;