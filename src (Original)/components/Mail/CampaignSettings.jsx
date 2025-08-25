// components/Mail/CampaignSettings.jsx - Production Ready Version
import React from 'react';
import { styles } from '../../styles/Mail/CampaignBuilder.styles';
import { FiAlertTriangle, FiUsers, FiCheckCircle } from 'react-icons/fi';

const CampaignSettings = ({ campaign, onInputChange, segments = [], contactCount = 0 }) => {
  // Validation functions
  const validateCampaignName = (name) => {
    if (!name.trim()) return { valid: false, message: "Campaign name is required" };
    if (name.length < 3) return { valid: false, message: "Campaign name must be at least 3 characters" };
    if (name.length > 100) return { valid: false, message: "Campaign name must be less than 100 characters" };
    return { valid: true, message: "" };
  };

  const validateSubjectLine = (subject) => {
    if (!subject.trim()) return { valid: false, message: "Subject line is required" };
    if (subject.length > 78) return { valid: false, message: "Subject line should be under 78 characters for best deliverability" };
    return { valid: true, message: "" };
  };

  const validatePreheader = (preheader) => {
    if (preheader && preheader.length > 140) {
      return { valid: false, message: "Preheader text should be under 140 characters" };
    }
    return { valid: true, message: "" };
  };

  // Get validation results
  const nameValidation = validateCampaignName(campaign.name || '');
  const subjectValidation = validateSubjectLine(campaign.subject_line || '');
  const preheaderValidation = validatePreheader(campaign.preheader_text || '');

  // Segment selection logic
  const getSegmentInfo = () => {
    if (!campaign.target_segment) {
      return {
        type: 'all',
        message: `Send to all subscribed contacts (${contactCount} contacts)`,
        icon: FiUsers,
        color: '#2196f3'
      };
    }

    const selectedSegment = segments.find(seg => seg.id === campaign.target_segment);
    if (!selectedSegment) {
      return {
        type: 'error',
        message: 'Selected segment no longer exists - will send to all contacts',
        icon: FiAlertTriangle,
        color: '#f44336'
      };
    }

    if (selectedSegment.contact_count === 0) {
      return {
        type: 'warning',
        message: `"${selectedSegment.name}" segment has no contacts - campaign will not send`,
        icon: FiAlertTriangle,
        color: '#ff9800'
      };
    }

    return {
      type: 'success',
      message: `Send to "${selectedSegment.name}" segment (${selectedSegment.contact_count} contacts)`,
      icon: FiCheckCircle,
      color: '#4caf50'
    };
  };

  const segmentInfo = getSegmentInfo();

  return (
    <div style={styles.campaignSettings}>
      <h2 style={styles.sectionTitle}>Campaign Settings</h2>
      
      {/* Campaign Name */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Campaign Name *</label>
        <input
          type="text"
          style={{
            ...styles.input,
            borderColor: nameValidation.valid ? '#ddd' : '#f44336'
          }}
          value={campaign.name || ''}
          onChange={(e) => onInputChange('name', e.target.value)}
          placeholder="e.g., Summer Special Offer"
          maxLength={100}
        />
        {!nameValidation.valid && (
          <div style={styles.validationError}>
            <FiAlertTriangle style={styles.errorIcon} />
            {nameValidation.message}
          </div>
        )}
        <div style={styles.characterCount}>
          {(campaign.name || '').length}/100 characters
        </div>
      </div>

      {/* Subject Line */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Subject Line *</label>
        <input
          type="text"
          style={{
            ...styles.input,
            borderColor: subjectValidation.valid ? '#ddd' : '#f44336'
          }}
          value={campaign.subject_line || ''}
          onChange={(e) => onInputChange('subject_line', e.target.value)}
          placeholder="e.g., 🌞 Summer Fun Awaits!"
          maxLength={100}
        />
        {!subjectValidation.valid && (
          <div style={styles.validationError}>
            <FiAlertTriangle style={styles.errorIcon} />
            {subjectValidation.message}
          </div>
        )}
        <div style={styles.characterCount}>
          {(campaign.subject_line || '').length}/78 characters (recommended)
        </div>
      </div>

      {/* Preheader Text */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Preheader Text</label>
        <input
          type="text"
          style={{
            ...styles.input,
            borderColor: preheaderValidation.valid ? '#ddd' : '#f44336'
          }}
          value={campaign.preheader_text || ''}
          onChange={(e) => onInputChange('preheader_text', e.target.value)}
          placeholder="Optional preview text that appears after subject line"
          maxLength={140}
        />
        {!preheaderValidation.valid && (
          <div style={styles.validationError}>
            <FiAlertTriangle style={styles.errorIcon} />
            {preheaderValidation.message}
          </div>
        )}
        <div style={styles.characterCount}>
          {(campaign.preheader_text || '').length}/140 characters
        </div>
        <div style={styles.helpText}>
          This text appears after the subject line in most email clients
        </div>
      </div>

      {/* Segment Selection */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Send To</label>
        <select
          style={styles.select}
          value={campaign.target_segment || 'all'}
          onChange={(e) => onInputChange('target_segment', e.target.value === 'all' ? null : e.target.value)}
        >
          <option value="all">All Subscribed Contacts</option>
          {segments.map(segment => (
            <option key={segment.id} value={segment.id}>
              {segment.name} ({segment.contact_count} contacts)
            </option>
          ))}
        </select>
        
        {/* Segment Info Display */}
        <div style={{
          ...styles.segmentInfo,
          backgroundColor: segmentInfo.type === 'error' ? '#ffebee' :
                          segmentInfo.type === 'warning' ? '#fff3cd' :
                          segmentInfo.type === 'success' ? '#e8f5e8' : '#f0f8ff',
          borderColor: segmentInfo.color
        }}>
          <segmentInfo.icon style={{ ...styles.segmentIcon, color: segmentInfo.color }} />
          <span style={{ color: segmentInfo.color }}>{segmentInfo.message}</span>
        </div>
      </div>

      {/* Campaign Summary */}
      <div style={styles.campaignSummary}>
        <h4 style={styles.summaryTitle}>Campaign Summary</h4>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Recipients:</span>
            <span style={styles.summaryValue}>
              {campaign.target_segment ? 
                (segments.find(s => s.id === campaign.target_segment)?.contact_count || 0) : 
                contactCount
              }
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Estimated Cost:</span>
            <span style={styles.summaryValue}>
              ${((campaign.target_segment ? 
                (segments.find(s => s.id === campaign.target_segment)?.contact_count || 0) : 
                contactCount) * 0.0025).toFixed(4)}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Status:</span>
            <span style={styles.summaryValue}>
              {nameValidation.valid && subjectValidation.valid && preheaderValidation.valid ? 
                'Ready to Build' : 'Needs Attention'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Additional styles for enhanced functionality
const additionalStyles = {
  validationError: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    fontSize: '12px',
    color: '#f44336',
  },
  errorIcon: {
    fontSize: '14px',
  },
  characterCount: {
    fontSize: '11px',
    color: '#666',
    marginTop: '2px',
    textAlign: 'right',
  },
  helpText: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  segmentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '13px',
  },
  segmentIcon: {
    fontSize: '16px',
  },
  campaignSummary: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  summaryLabel: {
    fontSize: '11px',
    color: '#666',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: 'bold',
  },
};

// Merge with existing styles
Object.assign(styles, additionalStyles);

export default CampaignSettings;