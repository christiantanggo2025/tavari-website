// CampaignBuilder.jsx - Full Featured Email Campaign Builder with Pause Protection
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import EmailPauseBanner, { blockEmailSendIfPaused } from '../../components/EmailPauseBanner';

import {
  FiSave, FiSend, FiEye, FiSmartphone, FiMonitor, FiFileText, FiDollarSign,
  FiClock, FiSettings, FiBarChart2, FiActivity, FiLayers, FiTarget, FiArrowLeft,
  FiType, FiImage, FiLink, FiMinus, FiShare2, FiCopy, FiMove, FiTrash2,
  FiAlignLeft, FiAlignCenter, FiAlignRight, FiUpload, FiPlus, FiChevronUp, FiChevronDown
} from 'react-icons/fi';

const CampaignBuilder = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const { business } = useBusiness();
  const isEditing = !!campaignId;

  // State management
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
  const [activeBlock, setActiveBlock] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  // FIXED: Updated validation - no manual unsubscribe check
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

    // REMOVED: Manual unsubscribe link check - system auto-injects compliant footers

    return errors;
  };

  // FIXED: Color conversion helper to prevent console errors
  const convertColorToHex = (color) => {
    const colorMap = {
      'teal': '#008080',
      'white': '#ffffff',
      'black': '#000000',
      'red': '#ff0000',
      'blue': '#0000ff',
      'green': '#008000',
      'yellow': '#ffff00',
      'orange': '#ffa500',
      'purple': '#800080',
      'pink': '#ffc0cb',
      'gray': '#808080',
      'grey': '#808080'
    };

    if (color.startsWith('#')) {
      return color;
    }
    
    return colorMap[color.toLowerCase()] || color;
  };

  // Block type definitions
  const blockTypes = [
    { type: 'text', icon: FiType, label: 'Text Block', description: 'Add formatted text content' },
    { type: 'heading', icon: FiType, label: 'Heading', description: 'Add a heading or title' },
    { type: 'button', icon: FiLink, label: 'Button', description: 'Add a call-to-action button' },
    { type: 'image', icon: FiImage, label: 'Image', description: 'Add an image' },
    { type: 'divider', icon: FiMinus, label: 'Divider', description: 'Add a visual separator' },
    { type: 'social', icon: FiShare2, label: 'Social Links', description: 'Add social media buttons' },
    { type: 'spacer', icon: FiSettings, label: 'Spacer', description: 'Add vertical spacing' },
    { type: 'columns', icon: FiCopy, label: 'Two Columns', description: 'Side-by-side content' }
  ];

  // Add block functions
  const addBlock = (blockType) => {
    const newBlock = createBlockTemplate(blockType);
    setCampaign(prev => ({
      ...prev,
      content_blocks: [...prev.content_blocks, newBlock]
    }));
  };

  const createBlockTemplate = (type) => {
    const baseBlock = {
      id: Date.now().toString(),
      type: type,
      settings: {}
    };

    switch (type) {
      case 'text':
        return {
          ...baseBlock,
          content: 'Enter your text content here...',
          settings: {
            fontSize: '16px',
            color: '#333333',
            textAlign: 'left',
            lineHeight: '1.6',
            linkUrl: ''
          }
        };

      case 'heading':
        return {
          ...baseBlock,
          content: 'Your Heading Here',
          settings: {
            level: 'h2',
            fontSize: '24px',
            color: '#333333',
            textAlign: 'left',
            fontWeight: 'bold',
            linkUrl: ''
          }
        };

      case 'button':
        return {
          ...baseBlock,
          content: {
            buttons: [
              { text: 'Click Here', url: 'https://' }
            ]
          },
          settings: {
            backgroundColor: '#008080',
            color: '#ffffff',
            textAlign: 'center',
            padding: '12px 24px',
            borderRadius: '6px',
            layout: 'single'
          }
        };

      case 'image':
        return {
          ...baseBlock,
          content: {
            src: '',
            alt: '',
            url: '',
            width: '100%',
            alignment: 'center'
          },
          settings: {
            borderRadius: '0px',
            margin: '20px 0'
          }
        };

      case 'divider':
        return {
          ...baseBlock,
          content: {
            style: 'solid',
            color: '#dddddd',
            width: '100%'
          },
          settings: {
            margin: '20px auto'
          }
        };

      case 'social':
        return {
          ...baseBlock,
          content: {
            platforms: [
              { name: 'facebook', enabled: false, url: '' },
              { name: 'twitter', enabled: false, url: '' },
              { name: 'instagram', enabled: false, url: '' },
              { name: 'linkedin', enabled: false, url: '' },
              { name: 'youtube', enabled: false, url: '' },
              { name: 'website', enabled: false, url: '' }
            ]
          },
          settings: {
            size: '32px',
            spacing: '10px',
            alignment: 'center'
          }
        };

      case 'spacer':
        return {
          ...baseBlock,
          content: {
            height: '20px'
          },
          settings: {
            backgroundColor: 'transparent'
          }
        };

      case 'columns':
        return {
          ...baseBlock,
          content: {
            column1: 'Left column content...',
            column2: 'Right column content...'
          },
          settings: {
            gap: '20px',
            mobileStack: true
          }
        };

      default:
        return baseBlock;
    }
  };

  // Block management functions
  const updateBlock = (blockId, updates) => {
    setCampaign(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    }));
  };

  const removeBlock = (blockId) => {
    setCampaign(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.filter(block => block.id !== blockId)
    }));
  };

  const duplicateBlock = (blockId) => {
    const blockToDupe = campaign.content_blocks.find(block => block.id === blockId);
    if (blockToDupe) {
      const duplicated = {
        ...blockToDupe,
        id: Date.now().toString()
      };
      const blockIndex = campaign.content_blocks.findIndex(block => block.id === blockId);
      const newBlocks = [...campaign.content_blocks];
      newBlocks.splice(blockIndex + 1, 0, duplicated);
      setCampaign(prev => ({ ...prev, content_blocks: newBlocks }));
    }
  };

  const moveBlock = (blockId, direction) => {
    const blocks = [...campaign.content_blocks];
    const currentIndex = blocks.findIndex(block => block.id === blockId);
    
    if (direction === 'up' && currentIndex > 0) {
      [blocks[currentIndex], blocks[currentIndex - 1]] = [blocks[currentIndex - 1], blocks[currentIndex]];
    } else if (direction === 'down' && currentIndex < blocks.length - 1) {
      [blocks[currentIndex], blocks[currentIndex + 1]] = [blocks[currentIndex + 1], blocks[currentIndex]];
    }

    setCampaign(prev => ({ ...prev, content_blocks: blocks }));
  };

  // Image upload function
  const uploadImage = async (file, blockId) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('email-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('email-images')
        .getPublicUrl(fileName);

      updateBlock(blockId, {
        content: {
          ...campaign.content_blocks.find(b => b.id === blockId).content,
          src: urlData.publicUrl,
          alt: file.name
        }
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // FIXED: Email HTML generation with proper color handling
  const generateEmailHTML = () => {
    const blockHTML = campaign.content_blocks.map(block => {
      switch (block.type) {
        case 'text':
          const textColor = convertColorToHex(block.settings.color);
          const textContent = block.settings.linkUrl ? 
            `<a href="${block.settings.linkUrl}" style="color: inherit; text-decoration: underline;">${block.content}</a>` : 
            block.content;
          return `
            <p style="font-size: ${block.settings.fontSize}; color: ${textColor}; text-align: ${block.settings.textAlign}; line-height: ${block.settings.lineHeight}; margin: 15px 0;">
              ${textContent}
            </p>
          `;

        case 'heading':
          const headingColor = convertColorToHex(block.settings.color);
          const headingContent = block.settings.linkUrl ? 
            `<a href="${block.settings.linkUrl}" style="color: inherit; text-decoration: none;">${block.content}</a>` : 
            block.content;
          return `
            <${block.settings.level} style="font-size: ${block.settings.fontSize}; color: ${headingColor}; text-align: ${block.settings.textAlign}; font-weight: ${block.settings.fontWeight}; margin: 20px 0 10px 0;">
              ${headingContent}
            </${block.settings.level}>
          `;

        case 'button':
          const buttonBgColor = convertColorToHex(block.settings.backgroundColor);
          const buttonTextColor = convertColorToHex(block.settings.color);
          const buttonElements = block.content.buttons.map(button => 
            `<a href="${button.url}" style="background-color: ${buttonBgColor}; color: ${buttonTextColor}; padding: ${block.settings.padding}; border-radius: ${block.settings.borderRadius}; text-decoration: none; display: inline-block; font-weight: bold; margin: 0 5px;">
              ${button.text}
            </a>`
          ).join('');
          return `
            <div style="text-align: ${block.settings.textAlign}; margin: 20px 0;">
              ${buttonElements}
            </div>
          `;

        case 'image':
          const imageHtml = `<img src="${block.content.src}" alt="${block.content.alt}" style="max-width: ${block.content.width}; width: ${block.content.width}; height: auto; border-radius: ${block.settings.borderRadius}; display: block;" />`;
          const imageContent = block.content.url ? `<a href="${block.content.url}">${imageHtml}</a>` : imageHtml;
          return `
            <div style="text-align: ${block.content.alignment}; margin: ${block.settings.margin};">
              ${imageContent}
            </div>
          `;

        case 'divider':
          const dividerColor = convertColorToHex(block.content.color);
          return `
            <hr style="border: none; border-top: 1px ${block.content.style} ${dividerColor}; width: ${block.content.width}; margin: ${block.settings.margin};" />
          `;

        case 'spacer':
          return `
            <div style="height: ${block.content.height}; background-color: ${block.settings.backgroundColor}; font-size: 1px; line-height: 1px;">&nbsp;</div>
          `;

        case 'social':
          const socialButtons = block.content.platforms
            .filter(platform => platform.enabled && platform.url)
            .map(platform => {
              const socialIcons = {
                facebook: '📘', twitter: '🦆', instagram: '📷',
                linkedin: '💼', youtube: '📺', website: '🌐'
              };
              return `
                <a href="${platform.url}" style="display: inline-block; margin: 0 ${parseInt(block.settings.spacing)/2}px; text-decoration: none; font-size: ${block.settings.size};" title="Visit our ${platform.name}">
                  ${socialIcons[platform.name] || '🔗'}
                </a>
              `;
            }).join('');
          return `
            <div style="text-align: ${block.settings.alignment}; margin: 20px 0;">
              ${socialButtons}
            </div>
          `;

        case 'columns':
          return `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="width: 50%; padding-right: ${parseInt(block.settings.gap)/2}px; vertical-align: top;">
                  ${block.content.column1 || 'Left column content...'}
                </td>
                <td style="width: 50%; padding-left: ${parseInt(block.settings.gap)/2}px; vertical-align: top;">
                  ${block.content.column2 || 'Right column content...'}
                </td>
              </tr>
            </table>
          `;

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
              <p style="margin: 0 0 10px 0;">You received this email because you subscribed to our mailing list.</p>
              <p style="margin: 0 0 10px 0;"><strong>${business?.name || 'Your Business Name'}</strong><br>Your Business Address - Required for CASL Compliance</p>
              <p style="margin: 0;"><a href="{UnsubscribeLink}" style="color: #999; text-decoration: underline;">Unsubscribe</a> | <a href="{UpdatePreferencesLink}" style="color: #999; text-decoration: underline;">Update Preferences</a></p>
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
    // Block sending if paused
    if (blockEmailSendIfPaused('Campaign sending')) return;

    const errors = validateCampaign();
    if (errors.length > 0) {
      setMessage('Please fix these issues before sending:\n• ' + errors.join('\n• '));
      return;
    }

    // Save the campaign first if it has changes
    await handleSave();
  
    // Navigate to the campaign sender
    if (isEditing && campaignId) {
      navigate(`/dashboard/mail/sender/${campaignId}`);
    } else {
      setMessage('Please save the campaign first');
    }
  };

  // Render block editor
  const renderBlockEditor = (block) => {
    switch (block.type) {
      case 'text':
        return (
          <div style={styles.blockEditorContent}>
            <textarea
              style={styles.blockTextarea}
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Enter your text content..."
              rows={4}
            />
            <div style={styles.controlsRow}>
              <div style={styles.alignmentButtons}>
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    style={{
                      ...styles.alignmentButton,
                      ...(block.settings.textAlign === align ? styles.activeAlignment : {})
                    }}
                    onClick={() => updateBlock(block.id, {
                      settings: { ...block.settings, textAlign: align }
                    })}
                  >
                    {align === 'left' && <FiAlignLeft />}
                    {align === 'center' && <FiAlignCenter />}
                    {align === 'right' && <FiAlignRight />}
                  </button>
                ))}
              </div>
              <input
                type="color"
                style={styles.colorPicker}
                value={convertColorToHex(block.settings.color)}
                onChange={(e) => updateBlock(block.id, {
                  settings: { ...block.settings, color: e.target.value }
                })}
                title="Text Color"
              />
            </div>
            <div style={styles.linkRow}>
              <input
                type="url"
                style={styles.linkInput}
                placeholder="Link URL (optional)"
                value={block.settings.linkUrl || ''}
                onChange={(e) => updateBlock(block.id, {
                  settings: { ...block.settings, linkUrl: e.target.value }
                })}
              />
              {block.settings.linkUrl && (
                <button
                  type="button"
                  style={styles.testLinkButton}
                  onClick={() => window.open(block.settings.linkUrl, '_blank', 'noopener,noreferrer')}
                >
                  <FiLink style={styles.buttonIcon} />
                  Test Link
                </button>
              )}
            </div>
          </div>
        );

      case 'heading':
        return (
          <div style={styles.blockEditorContent}>
            <input
              type="text"
              style={styles.headingInput}
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Enter heading text..."
            />
            <div style={styles.controlsRow}>
              <select
                style={styles.headingLevelSelect}
                value={block.settings.level}
                onChange={(e) => updateBlock(block.id, {
                  settings: { ...block.settings, level: e.target.value }
                })}
              >
                <option value="h1">H1 - Large</option>
                <option value="h2">H2 - Medium</option>
                <option value="h3">H3 - Small</option>
              </select>
              <div style={styles.alignmentButtons}>
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    style={{
                      ...styles.alignmentButton,
                      ...(block.settings.textAlign === align ? styles.activeAlignment : {})
                    }}
                    onClick={() => updateBlock(block.id, {
                      settings: { ...block.settings, textAlign: align }
                    })}
                  >
                    {align === 'left' && <FiAlignLeft />}
                    {align === 'center' && <FiAlignCenter />}
                    {align === 'right' && <FiAlignRight />}
                  </button>
                ))}
              </div>
              <input
                type="color"
                style={styles.colorPicker}
                value={convertColorToHex(block.settings.color)}
                onChange={(e) => updateBlock(block.id, {
                  settings: { ...block.settings, color: e.target.value }
                })}
                title="Text Color"
              />
            </div>
            <div style={styles.linkRow}>
              <input
                type="url"
                style={styles.linkInput}
                placeholder="Link URL (optional)"
                value={block.settings.linkUrl || ''}
                onChange={(e) => updateBlock(block.id, {
                  settings: { ...block.settings, linkUrl: e.target.value }
                })}
              />
              {block.settings.linkUrl && (
                <button
                  type="button"
                  style={styles.testLinkButton}
                  onClick={() => window.open(block.settings.linkUrl, '_blank', 'noopener,noreferrer')}
                >
                  <FiLink style={styles.buttonIcon} />
                  Test Link
                </button>
              )}
            </div>
          </div>
        );

      case 'button':
        return (
          <div style={styles.blockEditorContent}>
            {block.content.buttons.map((button, index) => (
              <div key={index} style={styles.buttonRow}>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Button text"
                  value={button.text}
                  onChange={(e) => {
                    const newButtons = [...block.content.buttons];
                    newButtons[index].text = e.target.value;
                    updateBlock(block.id, {
                      content: { ...block.content, buttons: newButtons }
                    });
                  }}
                />
                <input
                  type="url"
                  style={styles.input}
                  placeholder="Button URL (https://...)"
                  value={button.url}
                  onChange={(e) => {
                    const newButtons = [...block.content.buttons];
                    newButtons[index].url = e.target.value;
                    updateBlock(block.id, {
                      content: { ...block.content, buttons: newButtons }
                    });
                  }}
                />
                {block.content.buttons.length > 1 && (
                  <button
                    style={styles.removeButton}
                    onClick={() => {
                      const newButtons = block.content.buttons.filter((_, i) => i !== index);
                      updateBlock(block.id, {
                        content: { ...block.content, buttons: newButtons }
                      });
                    }}
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
            <div style={styles.controlsRow}>
              <div style={styles.alignmentButtons}>
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    style={{
                      ...styles.alignmentButton,
                      ...(block.settings.textAlign === align ? styles.activeAlignment : {})
                    }}
                    onClick={() => updateBlock(block.id, {
                      settings: { ...block.settings, textAlign: align }
                    })}
                  >
                    {align === 'left' && <FiAlignLeft />}
                    {align === 'center' && <FiAlignCenter />}
                    {align === 'right' && <FiAlignRight />}
                  </button>
                ))}
              </div>
              <input
                type="color"
                style={styles.colorPicker}
                value={convertColorToHex(block.settings.backgroundColor)}
                onChange={(e) => updateBlock(block.id, {
                  settings: { ...block.settings, backgroundColor: e.target.value }
                })}
                title="Background Color"
              />
              <input
                type="color"
                style={styles.colorPicker}
                value={convertColorToHex(block.settings.color)}
                onChange={(e) => updateBlock(block.id, {
                  settings: { ...block.settings, color: e.target.value }
                })}
                title="Text Color"
              />
            </div>
            {block.content.buttons.length < 2 && (
              <button
                style={styles.addButton}
                onClick={() => {
                  const newButtons = [...block.content.buttons, { text: 'Button Text', url: 'https://' }];
                  updateBlock(block.id, {
                    content: { ...block.content, buttons: newButtons }
                  });
                }}
              >
                <FiPlus /> Add Button
              </button>
            )}
          </div>
        );

      case 'image':
        return (
          <div style={styles.blockEditorContent}>
            <div style={styles.imageUploadArea}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) uploadImage(file, block.id);
                }}
                style={styles.fileInput}
                id={`image-${block.id}`}
                disabled={uploadingImage}
              />
              <label htmlFor={`image-${block.id}`} style={styles.imageUploadLabel}>
                {uploadingImage ? (
                  <>
                    <FiUpload style={styles.spinningIcon} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FiImage style={styles.uploadIcon} />
                    {block.content.src ? 'Change Image' : 'Upload Image'}
                  </>
                )}
              </label>
            </div>
            {block.content.src && (
              <div style={styles.imagePreview}>
                <img src={block.content.src} alt={block.content.alt} style={styles.previewImage} />
              </div>
            )}
            <input
              type="text"
              style={styles.input}
              placeholder="Alt text (for accessibility)"
              value={block.content.alt}
              onChange={(e) => updateBlock(block.id, {
                content: { ...block.content, alt: e.target.value }
              })}
            />
            <input
              type="url"
              style={styles.input}
              placeholder="Link URL (optional)"
              value={block.content.url || ''}
              onChange={(e) => updateBlock(block.id, {
                content: { ...block.content, url: e.target.value }
              })}
            />
            <div style={styles.alignmentButtons}>
              {['left', 'center', 'right'].map(align => (
                <button
                  key={align}
                  style={{
                    ...styles.alignmentButton,
                    ...(block.content.alignment === align ? styles.activeAlignment : {})
                  }}
                  onClick={() => updateBlock(block.id, {
                    content: { ...block.content, alignment: align }
                  })}
                >
                  {align === 'left' && <FiAlignLeft />}
                  {align === 'center' && <FiAlignCenter />}
                  {align === 'right' && <FiAlignRight />}
                </button>
              ))}
            </div>
          </div>
        );

      case 'divider':
        return (
          <div style={styles.blockEditorContent}>
            <div style={styles.controlsRow}>
              <select
                style={styles.select}
                value={block.content.style}
                onChange={(e) => updateBlock(block.id, {
                  content: { ...block.content, style: e.target.value }
                })}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
              <input
                type="color"
                style={styles.colorPicker}
                value={convertColorToHex(block.content.color)}
                onChange={(e) => updateBlock(block.id, {
                  content: { ...block.content, color: e.target.value }
                })}
                title="Divider Color"
              />
            </div>
          </div>
        );

      case 'social':
        return (
          <div style={styles.blockEditorContent}>
            <div style={styles.socialPlatformsGrid}>
              {block.content.platforms.map((platform, index) => (
                <div key={platform.name} style={styles.socialPlatformEditor}>
                  <div style={styles.socialPlatformHeader}>
                    <label style={styles.socialCheckboxLabel}>
                      <input
                        type="checkbox"
                        style={styles.socialCheckbox}
                        checked={platform.enabled}
                        onChange={(e) => {
                          const newPlatforms = [...block.content.platforms];
                          newPlatforms[index].enabled = e.target.checked;
                          updateBlock(block.id, {
                            content: { ...block.content, platforms: newPlatforms }
                          });
                        }}
                      />
                      <span style={styles.socialPlatformName}>
                        {platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}
                      </span>
                    </label>
                  </div>
                  <div style={styles.socialUrlRow}>
                    <input
                      type="url"
                      style={{
                        ...styles.socialUrlInput,
                        opacity: platform.enabled ? 1 : 0.5
                      }}
                      value={platform.url}
                      onChange={(e) => {
                        const newPlatforms = [...block.content.platforms];
                        newPlatforms[index].url = e.target.value;
                        updateBlock(block.id, {
                          content: { ...block.content, platforms: newPlatforms }
                        });
                      }}
                      placeholder={`Your ${platform.name} URL`}
                      disabled={!platform.enabled}
                    />
                    {platform.enabled && platform.url && (
                      <button
                        type="button"
                        style={styles.testSocialButton}
                        onClick={() => window.open(platform.url, '_blank', 'noopener,noreferrer')}
                        title="Test Link"
                      >
                        <FiLink />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.alignmentButtons}>
              <span style={styles.alignmentLabel}>Alignment:</span>
              {['left', 'center', 'right'].map(align => (
                <button
                  key={align}
                  style={{
                    ...styles.alignmentButton,
                    ...(block.settings.alignment === align ? styles.activeAlignment : {})
                  }}
                  onClick={() => updateBlock(block.id, {
                    settings: { ...block.settings, alignment: align }
                  })}
                >
                  {align === 'left' && <FiAlignLeft />}
                  {align === 'center' && <FiAlignCenter />}
                  {align === 'right' && <FiAlignRight />}
                </button>
              ))}
            </div>
          </div>
        );

      case 'columns':
        return (
          <div style={styles.blockEditorContent}>
            <div style={styles.columnsEditor}>
              <div style={styles.columnEditor}>
                <label style={styles.columnLabel}>Left Column</label>
                <textarea
                  style={styles.columnTextarea}
                  value={block.content.column1}
                  onChange={(e) => updateBlock(block.id, {
                    content: { ...block.content, column1: e.target.value }
                  })}
                  placeholder="Left column content..."
                  rows={4}
                />
              </div>
              <div style={styles.columnEditor}>
                <label style={styles.columnLabel}>Right Column</label>
                <textarea
                  style={styles.columnTextarea}
                  value={block.content.column2}
                  onChange={(e) => updateBlock(block.id, {
                    content: { ...block.content, column2: e.target.value }
                  })}
                  placeholder="Right column content..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div style={styles.blockEditorContent}>
            <p style={styles.placeholderText}>Editor for {block.type} block</p>
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {/* Email Pause Banner */}
      <EmailPauseBanner />

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
            style={styles.primaryButton}
            onClick={handleSend}
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
            <div style={styles.blockLibrary}>
              {blockTypes.map(blockType => (
                <button
                  key={blockType.type}
                  style={styles.blockTypeButton}
                  onClick={() => addBlock(blockType.type)}
                  title={blockType.description}
                >
                  <blockType.icon style={styles.blockTypeIcon} />
                  <span style={styles.blockTypeLabel}>{blockType.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          <div style={styles.contentSection}>
            <h3 style={styles.sectionTitle}>Email Content</h3>
            {campaign.content_blocks.length === 0 ? (
              <div style={styles.emptyState}>
                <FiPlus style={styles.emptyIcon} />
                <p>No content blocks yet.</p>
                <p>Add your first block from the options above to get started.</p>
              </div>
            ) : (
              <div style={styles.blocksList}>
                {campaign.content_blocks.map((block, index) => (
                  <div key={block.id} style={styles.contentBlock}>
                    <div style={styles.blockHeader}>
                      <div style={styles.blockTitle}>
                        <FiMove style={styles.dragHandle} />
                        <span style={styles.blockTypeName}>
                          {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block
                        </span>
                      </div>
                      <div style={styles.blockActions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => moveBlock(block.id, 'up')}
                          disabled={index === 0}
                          title="Move Up"
                        >
                          <FiChevronUp />
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => moveBlock(block.id, 'down')}
                          disabled={index === campaign.content_blocks.length - 1}
                          title="Move Down"
                        >
                          <FiChevronDown />
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => duplicateBlock(block.id)}
                          title="Duplicate"
                        >
                          <FiCopy />
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => removeBlock(block.id)}
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    <div style={styles.blockContent}>
                      {renderBlockEditor(block)}
                    </div>
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
                <div 
                  style={styles.emailBody}
                  dangerouslySetInnerHTML={{ 
                    __html: campaign.content_blocks.length > 0 
                      ? generateEmailHTML().match(/<div style="max-width: 600px[^>]*">([\s\S]*?)<div style="margin-top: 40px/)[1] || ''
                      : '<p style="color: #999; font-style: italic; text-align: center; padding: 40px;">Add content blocks to see preview</p>'
                  }}
                />
                <div style={styles.emailFooter}>
                  <p style={styles.footerText}>
                    You received this email because you subscribed to our mailing list.
                  </p>
                  <p style={styles.footerText}>
                    <strong>{business?.name || 'Your Business Name'}</strong><br />
                    Your Business Address - Required for CASL Compliance
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
    </div>
  );
};

// Comprehensive styles (FIXED: Using proper hex colors)
const styles = {
  container: {
    padding: '40px',
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
    color: '#008080',
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
    backgroundColor: '#008080',
    color: '#ffffff',
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
    backgroundColor: '#ffffff',
    color: '#008080',
    border: '2px solid #008080',
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
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  previewPanel: {
    backgroundColor: '#ffffff',
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
  blockLibrary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
  },
  blockTypeButton: {
    backgroundColor: '#ffffff',
    color: '#008080',
    border: '2px solid #008080',
    borderRadius: '8px',
    padding: '15px 10px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  blockTypeIcon: {
    fontSize: '20px',
  },
  blockTypeLabel: {
    fontSize: '11px',
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
  emptyIcon: {
    fontSize: '48px',
    color: '#ccc',
    marginBottom: '15px',
  },
  blocksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  contentBlock: {
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#fafafa',
  },
  blockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #e0e0e0',
  },
  blockTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  dragHandle: {
    color: '#999',
    cursor: 'move',
    fontSize: '16px',
  },
  blockTypeName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  blockActions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    backgroundColor: '#ffffff',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockContent: {
    padding: '10px 0',
  },
  blockEditorContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  blockTextarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  headingInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    boxSizing: 'border-box',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  headingLevelSelect: {
    padding: '8px 12px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  alignmentButtons: {
    display: 'flex',
    gap: '4px',
  },
  alignmentButton: {
    backgroundColor: '#ffffff',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  activeAlignment: {
    backgroundColor: '#008080',
    color: '#ffffff',
    borderColor: '#008080',
  },
  colorPicker: {
    width: '40px',
    height: '32px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#ffffff',
    color: '#008080',
    border: '2px solid #008080',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  imageUploadArea: {
    border: '2px dashed #ddd',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#fafafa',
  },
  fileInput: {
    display: 'none',
  },
  imageUploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: '#008080',
    fontWeight: 'bold',
  },
  uploadIcon: {
    fontSize: '32px',
  },
  spinningIcon: {
    fontSize: '32px',
    animation: 'spin 1s linear infinite',
  },
  imagePreview: {
    textAlign: 'center',
    marginBottom: '10px',
  },
  previewImage: {
    maxWidth: '200px',
    maxHeight: '150px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  select: {
    padding: '8px 12px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  linkRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  linkInput: {
    flex: 1,
    padding: '8px 12px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  testLinkButton: {
    backgroundColor: '#ffffff',
    color: '#008080',
    border: '2px solid #008080',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  },
  buttonIcon: {
    fontSize: '14px',
  },
  socialPlatformsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  socialPlatformEditor: {
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    padding: '12px',
  },
  socialPlatformHeader: {
    marginBottom: '8px',
  },
  socialCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  socialCheckbox: {
    width: '16px',
    height: '16px',
  },
  socialPlatformName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  socialUrlRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  socialUrlInput: {
    flex: 1,
    padding: '8px 12px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  testSocialButton: {
    backgroundColor: '#ffffff',
    color: '#008080',
    border: '2px solid #008080',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignmentLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
  },
  columnsEditor: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  columnEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  columnLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#666',
  },
  columnTextarea: {
    width: '100%',
    padding: '10px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  placeholderText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
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
    backgroundColor: '#ffffff',
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

// Add CSS animation
if (!document.querySelector('#campaign-builder-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'campaign-builder-styles';
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default CampaignBuilder;