// components/Mail/SocialButtons.jsx
import React from 'react';
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin, FiYoutube, FiGlobe } from 'react-icons/fi';

const SocialButtons = ({ 
  platforms = [], 
  size = '32px', 
  spacing = '10px', 
  alignment = 'center',
  onPlatformChange,
  isEditor = false 
}) => {
  const socialIcons = {
    facebook: { icon: FiFacebook, color: '#1877F2', label: 'Facebook' },
    twitter: { icon: FiTwitter, color: '#1DA1F2', label: 'Twitter' },
    instagram: { icon: FiInstagram, color: '#E4405F', label: 'Instagram' },
    linkedin: { icon: FiLinkedin, color: '#0A66C2', label: 'LinkedIn' },
    youtube: { icon: FiYoutube, color: '#FF0000', label: 'YouTube' },
    website: { icon: FiGlobe, color: '#666666', label: 'Website' }
  };

  const enabledPlatforms = platforms.filter(platform => platform.enabled && platform.url);

  if (isEditor) {
    return (
      <div style={styles.editorContainer}>
        <div style={styles.platformsList}>
          {platforms.map((platform, index) => (
            <div key={platform.name} style={styles.platformItem}>
              <div style={styles.platformHeader}>
                <input
                  type="checkbox"
                  checked={platform.enabled}
                  onChange={(e) => {
                    const newPlatforms = [...platforms];
                    newPlatforms[index].enabled = e.target.checked;
                    onPlatformChange(newPlatforms);
                  }}
                  style={styles.checkbox}
                />
                <div style={styles.platformInfo}>
                  {React.createElement(socialIcons[platform.name]?.icon || FiGlobe, {
                    style: { 
                      fontSize: '16px', 
                      color: socialIcons[platform.name]?.color || '#666',
                      marginRight: '8px'
                    }
                  })}
                  <span style={styles.platformName}>
                    {socialIcons[platform.name]?.label || platform.name}
                  </span>
                </div>
              </div>
              {platform.enabled && (
                <input
                  type="url"
                  style={styles.urlInput}
                  placeholder={`https://${platform.name}.com/your-account`}
                  value={platform.url}
                  onChange={(e) => {
                    const newPlatforms = [...platforms];
                    newPlatforms[index].url = e.target.value;
                    onPlatformChange(newPlatforms);
                  }}
                />
              )}
            </div>
          ))}
        </div>
        
        {enabledPlatforms.length > 0 && (
          <div style={styles.previewSection}>
            <label style={styles.previewLabel}>Preview:</label>
            <div style={{ ...styles.previewContainer, textAlign: alignment }}>
              {enabledPlatforms.map(platform => {
                const IconComponent = socialIcons[platform.name]?.icon || FiGlobe;
                return (
                  <a 
                    key={platform.name}
                    href={platform.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...styles.socialButton,
                      fontSize: size,
                      color: socialIcons[platform.name]?.color || '#666',
                      margin: `0 ${parseInt(spacing)/2}px`
                    }}
                    title={`Visit our ${socialIcons[platform.name]?.label || platform.name}`}
                  >
                    <IconComponent />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render for email preview
  if (enabledPlatforms.length === 0) {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyText}>No social links configured</span>
      </div>
    );
  }

  return (
    <div style={{ textAlign: alignment, margin: '20px 0' }}>
      {enabledPlatforms.map(platform => {
        const IconComponent = socialIcons[platform.name]?.icon || FiGlobe;
        return (
          <a 
            key={platform.name}
            href={platform.url} 
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...styles.socialButton,
              fontSize: size,
              color: socialIcons[platform.name]?.color || '#666',
              margin: `0 ${parseInt(spacing)/2}px`
            }}
            title={`Visit our ${socialIcons[platform.name]?.label || platform.name}`}
          >
            <IconComponent />
          </a>
        );
      })}
    </div>
  );
};

const styles = {
  editorContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  platformsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  platformItem: {
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: '#fafafa',
  },
  platformHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  platformInfo: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  platformName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  urlInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  previewSection: {
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  previewLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    display: 'block',
  },
  previewContainer: {
    padding: '10px',
  },
  socialButton: {
    display: 'inline-block',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '20px',
    color: '#999',
    fontStyle: 'italic',
    border: '2px dashed #ddd',
    borderRadius: '8px',
    backgroundColor: '#f8f8f8',
  },
  emptyText: {
    fontSize: '14px',
  },
};

export default SocialButtons;