// CampaignBuilder.jsx - Updated with SES integration
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import CampaignSender from '../../components/Mail/CampaignSender';

import {
  FiSave, FiSend, FiEye, FiSmartphone, FiMonitor, FiFileText, FiDollarSign,
  FiClock, FiSettings, FiBarChart2, FiActivity, FiLayers, FiTarget, FiArrowLeft
} from 'react-icons/fi';

const CampaignBuilder = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const { business } = useBusiness();
  const isEditing = !!campaignId;

  // Basic state
  const [campaign, setCampaign] = useState({
    name: '',
    subject_line: '',
    preheader_text: '',
    content_blocks: [],
    status: 'draft'
  });

  const [previewMode, setPreviewMode] = useState('desktop');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [showSendModal, setShowSendModal] = useState(false);
  const [savedCampaignData, setSavedCampaignData] = useState(null);

  const businessId = business?.id;

  useEffect(() => {
    if (isEditing && campaignId && businessId) {
      loadCampaign();
    }
  }, [campaignId, businessId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('mail_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('business_id', businessId)
        .single();

      if (error) throw error;

      setCampaign({
        name: data.name || '',
        subject_line: data.subject_line || '',
        preheader_text: data.preheader_text || '',
        content_blocks: data.content_json || [],
        status: data.status || 'draft'
      });

      setSavedCampaignData(data);
    } catch (error) {
      console.error('Error loading campaign:', error);
      setMessage('Error loading campaign');
    }
  };

  const handleInputChange = (field, value) => {
    setCampaign(prev => ({
      ...prev,
      [field]: value
    }));
    setMessage('');
  };

  const validateCampaign = () => {
    const errors = [];

    if (!campaign.name.trim()) {
      errors.push('Campaign name is required');
    }

    if (!campaign.subject_line.trim()) {
      errors.push('Subject line is required');
    }

    if (campaign.content_blocks.length === 0) {
      errors.push('Campaign must have at least one content block');
    }

    return errors;
  };

  const generateEmailHTML = () => {
    const blockHTML = campaign.content_blocks.map(block => {
      switch (block.type) {
        case 'text':
          return `<p style="font-size: ${block.settings?.fontSize || '16px'}; color: ${block.settings?.color || '#333'}; text-align: ${block.settings?.textAlign || 'left'}; line-height: ${block.settings?.lineHeight || '1.6'};">${block.content}</p>`;

        case 'heading':
          return `<${block.settings?.level || 'h2'} style="font-size: ${block.settings?.fontSize || '24px'}; color: ${block.settings?.color || '#333'}; text-align: ${block.settings?.textAlign || 'left'}; font-weight: ${block.settings?.fontWeight || 'bold'};">${block.content}</${block.settings?.level || 'h2'}>`;

        default:
          return '';
      }
    }).join('');

    return `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f8f8f8;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
            ${blockHTML}
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
              <p>You received this email because you subscribed to our mailing list.</p>
              <p><a href="{UnsubscribeLink}" style="color: #999;">Unsubscribe</a> | <a href="{UpdatePreferencesLink}" style="color: #999;">Update Preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleSave = async () => {
    if (!businessId) {
      setMessage('No business selected');
      return;
    }

    setSaving(true);
    try {
      setMessage('');

      const campaignData = {
        business_id: businessId,
        name: campaign.name.trim(),
        subject_line: campaign.subject_line.trim(),
        preheader_text: campaign.preheader_text.trim(),
        content_json: campaign.content_blocks,
        content_html: generateEmailHTML(),
        status: campaign.status,
        updated_at: new Date().toISOString()
      };

      let result;
      if (isEditing) {
        result = await supabase
          .from('mail_campaigns')
          .update(campaignData)
          .eq('id', campaignId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('mail_campaigns')
          .insert(campaignData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setMessage('Campaign saved successfully');
      setSavedCampaignData(result.data);

      if (!isEditing && result.data) {
        navigate(`/dashboard/mail/builder/${result.data.id}`);
      }

    } catch (error) {
      console.error('Error saving campaign:', error);
      setMessage('Error saving campaign: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    const errors = validateCampaign();
    if (errors.length > 0) {
      setMessage('Please fix these issues before sending:\n' + errors.join('\n'));
      return;
    }

    // Check if campaign is saved
    if (!savedCampaignData || 
        savedCampaignData.name !== campaign.name || 
        savedCampaignData.subject_line !== campaign.subject_line ||
        JSON.stringify(savedCampaignData.content_json) !== JSON.stringify(campaign.content_blocks)) {
      
      setMessage('Please save your campaign before sending');
      return;
    }

    // Show send modal
    setShowSendModal(true);
  };

  const handleCampaignSent = () => {
    setMessage('Campaign sent successfully!');
    // Optionally redirect to campaigns list
    setTimeout(() => {
      navigate('/dashboard/mail/campaigns');
    }, 2000);
  };

  // Add a basic text block
  const addTextBlock = () => {
    setCampaign(prev => ({
      ...prev,
      content_blocks: [...prev.content_blocks, {
        id: Date.now().toString(),
        type: 'text',
        content: 'Enter your text content here...',
        settings: {
          fontSize: '16px',
          color: '#333',
          textAlign: 'left',
          lineHeight: '1.6'
        }
      }]
    }));
  };

  // Add a basic heading block
  const addHeadingBlock = () => {
    setCampaign(prev => ({
      ...prev,
      content_blocks: [...prev.content_blocks, {
        id: Date.now().toString(),
        type: 'heading',
        content: 'Your Heading Here',
        settings: {
          level: 'h2',
          fontSize: '24px',
          color: '#333',
          textAlign: 'left',
          fontWeight: 'bold'
        }
      }]
    }));
  };

  // Remove a block
  const removeBlock = (blockId) => {
    setCampaign(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.filter(block => block.id !== blockId)
    }));
  };

  // Update block content
  const updateBlockContent = (blockId, newContent) => {
    setCampaign(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.map(block =>
        block.id === blockId ? { ...block, content: newContent } : block
      )
    }));
  };

  const isCampaignReadyToSend = () => {
    const errors = validateCampaign();
    const isSaved = savedCampaignData && 
                   savedCampaignData.name === campaign.name && 
                   savedCampaignData.subject_line === campaign.subject_line &&
                   JSON.stringify(savedCampaignData.content_json) === JSON.stringify(campaign.content_blocks);
    
    return errors.length === 0 && isSaved;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <button
            style={styles.backButton}
            onClick={() => navigate('/dashboard/mail/campaigns')}
          >
            <FiArrowLeft />
            Back to Campaigns
          </button>
          <h1 style={styles.title}>
            {isEditing ? 'Edit Campaign' : 'Create Campaign'}
          </h1>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.secondaryButton}
            onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}
          >
            {previewMode === 'desktop' ? <FiSmartphone /> : <FiMonitor />}
            {previewMode === 'desktop' ? 'Mobile' : 'Desktop'} Preview
          </button>
          <button
            style={styles.secondaryButton}
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            style={{
              ...styles.primaryButton,
              opacity: isCampaignReadyToSend() ? 1 : 0.5,
              cursor: isCampaignReadyToSend() ? 'pointer' : 'not-allowed'
            }}
            onClick={handleSend}
            disabled={!isCampaignReadyToSend()}
          >
            <FiSend />
            Send Campaign
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.includes('Error') || message.includes('fix') ? '#ffebee' : '#e8f5e8',
          color: message.includes('Error') || message.includes('fix') ? '#c62828' : '#2e7d32'
        }}>
          {message.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div style={isMobile ? styles.contentMobile : styles.content}>
        {/* Editor Panel */}
        <div style={styles.editorPanel}>
          {/* Campaign Settings */}
          <div style={styles.settingsSection}>
            <h3 style={styles.sectionTitle}>Campaign Settings</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Campaign Name</label>
              <input
                type="text"
                style={styles.input}
                value={campaign.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Subject Line</label>
              <input
                type="text"
                style={styles.input}
                value={campaign.subject_line}
                onChange={(e) => handleInputChange('subject_line', e.target.value)}
                placeholder="Enter subject line"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Preheader Text (Optional)</label>
              <input
                type="text"
                style={styles.input}
                value={campaign.preheader_text}
                onChange={(e) => handleInputChange('preheader_text', e.target.value)}
                placeholder="Preview text that appears in inbox"
              />
            </div>
          </div>

          {/* Block Library */}
          <div style={styles.blockLibrarySection}>
            <h3 style={styles.sectionTitle}>Add Content Blocks</h3>
            <div style={styles.blockButtons}>
              <button style={styles.blockButton} onClick={addTextBlock}>
                <FiFileText />
                Add Text
              </button>
              <button style={styles.blockButton} onClick={addHeadingBlock}>
                <FiTarget />
                Add Heading
              </button>
            </div>
          </div>

          {/* Content Editor */}
          <div style={styles.contentSection}>
            <h3 style={styles.sectionTitle}>Email Content</h3>
            {campaign.content_blocks.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No content blocks yet. Add some content using the buttons above.</p>
              </div>
            ) : (
              <div style={styles.blocksList}>
                {campaign.content_blocks.map((block, index) => (
                  <div key={block.id} style={styles.contentBlock}>
                    <div style={styles.blockHeader}>
                      <span style={styles.blockType}>{block.type.toUpperCase()}</span>
                      <button
                        style={styles.removeButton}
                        onClick={() => removeBlock(block.id)}
                      >
                        ×
                      </button>
                    </div>
                    <textarea
                      style={styles.blockTextarea}
                      value={block.content}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      placeholder={`Enter ${block.type} content...`}
                      rows={block.type === 'heading' ? 2 : 4}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div style={styles.previewPanel}>
          <h3 style={styles.sectionTitle}>Email Preview</h3>
          <div style={styles.previewContainer}>
            <div style={previewMode === 'mobile' ? styles.mobilePreview : styles.desktopPreview}>
              <div style={styles.emailContent}>
                <div style={styles.emailHeader}>
                  <strong>Subject: </strong>{campaign.subject_line || 'Your Subject Line'}
                  {campaign.preheader_text && (
                    <div style={styles.preheaderText}>
                      {campaign.preheader_text}
                    </div>
                  )}
                </div>
                <div style={styles.emailBody}>
                  {campaign.content_blocks.length === 0 ? (
                    <p style={styles.placeholderText}>Add content blocks to see preview</p>
                  ) : (
                    campaign.content_blocks.map((block) => (
                      <div key={block.id} style={styles.previewBlock}>
                        {block.type === 'heading' ? (
                          <h2 style={styles.previewHeading}>{block.content}</h2>
                        ) : (
                          <p style={styles.previewText}>{block.content}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div style={styles.emailFooter}>
                  <p style={styles.footerText}>
                    You received this email because you subscribed to our mailing list.
                  </p>
                  <p style={styles.footerText}>
                    <a href="#" style={styles.footerLink}>Unsubscribe</a> | 
                    <a href="#" style={styles.footerLink}>Update Preferences</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Campaign Modal */}
      <CampaignSender
        campaign={savedCampaignData}
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSent={handleCampaignSent}
      />
    </div>
  );
};

// Styles object (unchanged from original)
const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  titleSection: {
    flex: 1,
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'teal',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  message: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: 'bold',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
  },
  contentMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  editorPanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  previewPanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '10px',
  },
  settingsSection: {
    marginBottom: '30px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  blockLibrarySection: {
    marginBottom: '30px',
  },
  blockButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  blockButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  contentSection: {
    marginBottom: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
  },
  blocksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  contentBlock: {
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#fafafa',
  },
  blockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  blockType: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'teal',
    backgroundColor: '#e0f2f1',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  blockTextarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  previewContainer: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
  },
  desktopPreview: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  mobilePreview: {
    maxWidth: '320px',
    margin: '0 auto',
  },
  emailContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  emailHeader: {
    borderBottom: '1px solid #eee',
    paddingBottom: '15px',
    marginBottom: '20px',
  },
  preheaderText: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
  },
  emailBody: {
    marginBottom: '30px',
  },
  placeholderText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '40px',
  },
  previewBlock: {
    marginBottom: '15px',
  },
  previewHeading: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  previewText: {
    fontSize: '16px',
    color: '#333',
    lineHeight: '1.6',
    margin: '0 0 10px 0',
  },
  emailFooter: {
    borderTop: '1px solid #eee',
    paddingTop: '15px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#999',
    margin: '5px 0',
  },
  footerLink: {
    color: '#666',
    textDecoration: 'none',
    margin: '0 5px',
  },
};

export default CampaignBuilder;