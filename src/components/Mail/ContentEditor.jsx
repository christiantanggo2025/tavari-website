// components/Mail/ContentEditor.jsx
import React, { useState } from 'react';
import { styles } from '../../styles/Mail/CampaignBuilder.styles';
import ImageUpload from './ImageUpload';
import { 
  FiMove, FiEdit3, FiTrash2, FiCopy, FiType, FiImage, 
  FiLink, FiMinus, FiShare2, FiSettings, FiColumns, FiPlus
} from 'react-icons/fi';

const ContentEditor = ({ campaign, setCampaign, businessId }) => {
  const [activeBlock, setActiveBlock] = useState(null);

  const updateContentBlock = (blockId, updates) => {
    setCampaign(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.map(block =>
        block.id === blockId
          ? { ...block, ...updates }
          : block
      )
    }));
  };

  const removeContentBlock = (blockId) => {
    setCampaign(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.filter(block => block.id !== blockId)
    }));
  };

  const moveContentBlock = (blockId, direction) => {
    const blocks = [...campaign.content_blocks];
    const currentIndex = blocks.findIndex(block => block.id === blockId);
    
    if (direction === 'up' && currentIndex > 0) {
      [blocks[currentIndex], blocks[currentIndex - 1]] = [blocks[currentIndex - 1], blocks[currentIndex]];
    } else if (direction === 'down' && currentIndex < blocks.length - 1) {
      [blocks[currentIndex], blocks[currentIndex + 1]] = [blocks[currentIndex + 1], blocks[currentIndex]];
    }

    setCampaign(prev => ({
      ...prev,
      content_blocks: blocks
    }));
  };

  const renderBlockEditor = (block) => {
    switch (block.type) {
      case 'text':
        return (
          <div style={styles.blockContent}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Text Content</label>
              <textarea
                style={styles.textarea}
                value={block.content}
                onChange={(e) => updateContentBlock(block.id, {
                  content: e.target.value
                })}
                placeholder="Enter your text content here..."
                rows={4}
              />
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Font Size</label>
                <select
                  style={styles.select}
                  value={block.settings.fontSize}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, fontSize: e.target.value }
                  })}
                >
                  <option value="12px">Small (12px)</option>
                  <option value="14px">Normal (14px)</option>
                  <option value="16px">Medium (16px)</option>
                  <option value="18px">Large (18px)</option>
                  <option value="20px">Extra Large (20px)</option>
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Text Color</label>
                <input
                  type="color"
                  style={styles.colorInput}
                  value={block.settings.color}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, color: e.target.value }
                  })}
                />
              </div>
            </div>

            <div style={styles.alignmentButtons}>
              {['left', 'center', 'right'].map(align => (
                <button
                  key={align}
                  style={{
                    ...styles.alignmentButton,
                    ...(block.settings.textAlign === align ? styles.activeAlignment : {})
                  }}
                  onClick={() => updateContentBlock(block.id, {
                    settings: { ...block.settings, textAlign: align }
                  })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        );

      case 'heading':
        return (
          <div style={styles.blockContent}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Heading Text</label>
              <input
                type="text"
                style={styles.input}
                value={block.content}
                onChange={(e) => updateContentBlock(block.id, {
                  content: e.target.value
                })}
                placeholder="Your heading text..."
              />
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Heading Level</label>
                <select
                  style={styles.select}
                  value={block.settings.level}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, level: e.target.value }
                  })}
                >
                  <option value="h1">H1 - Main Title</option>
                  <option value="h2">H2 - Section Title</option>
                  <option value="h3">H3 - Subsection</option>
                  <option value="h4">H4 - Small Heading</option>
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Font Size</label>
                <select
                  style={styles.select}
                  value={block.settings.fontSize}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, fontSize: e.target.value }
                  })}
                >
                  <option value="20px">Small (20px)</option>
                  <option value="24px">Medium (24px)</option>
                  <option value="28px">Large (28px)</option>
                  <option value="32px">Extra Large (32px)</option>
                  <option value="36px">XXL (36px)</option>
                </select>
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Text Color</label>
                <input
                  type="color"
                  style={styles.colorInput}
                  value={block.settings.color}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, color: e.target.value }
                  })}
                />
              </div>
            </div>

            <div style={styles.alignmentButtons}>
              {['left', 'center', 'right'].map(align => (
                <button
                  key={align}
                  style={{
                    ...styles.alignmentButton,
                    ...(block.settings.textAlign === align ? styles.activeAlignment : {})
                  }}
                  onClick={() => updateContentBlock(block.id, {
                    settings: { ...block.settings, textAlign: align }
                  })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        );

      case 'button':
        return (
          <div style={styles.blockContent}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Button Text</label>
              <input
                type="text"
                style={styles.input}
                value={block.content.text}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, text: e.target.value }
                })}
                placeholder="Click Here"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Button URL</label>
              <input
                type="url"
                style={styles.input}
                value={block.content.url}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, url: e.target.value }
                })}
                placeholder="https://example.com"
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Background Color</label>
                <input
                  type="color"
                  style={styles.colorInput}
                  value={block.settings.backgroundColor}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, backgroundColor: e.target.value }
                  })}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Text Color</label>
                <input
                  type="color"
                  style={styles.colorInput}
                  value={block.settings.color}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, color: e.target.value }
                  })}
                />
              </div>
            </div>

            <div style={styles.alignmentButtons}>
              {['left', 'center', 'right'].map(align => (
                <button
                  key={align}
                  style={{
                    ...styles.alignmentButton,
                    ...(block.settings.textAlign === align ? styles.activeAlignment : {})
                  }}
                  onClick={() => updateContentBlock(block.id, {
                    settings: { ...block.settings, textAlign: align }
                  })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        );

      case 'image':
        return (
          <div style={styles.blockContent}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Upload Image</label>
              <ImageUpload
                currentImage={block.content.src}
                onImageSelect={(url, filename) => {
                  updateContentBlock(block.id, {
                    content: {
                      ...block.content,
                      src: url,
                      alt: filename || block.content.alt
                    }
                  });
                }}
                businessId={businessId}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Alt Text (for accessibility)</label>
              <input
                type="text"
                style={styles.input}
                value={block.content.alt}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, alt: e.target.value }
                })}
                placeholder="Describe this image..."
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Link URL (optional)</label>
              <input
                type="url"
                style={styles.input}
                value={block.content.url || ''}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, url: e.target.value }
                })}
                placeholder="https://example.com (optional)"
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Image Width</label>
                <select
                  style={styles.select}
                  value={block.content.width}
                  onChange={(e) => updateContentBlock(block.id, {
                    content: { ...block.content, width: e.target.value }
                  })}
                >
                  <option value="100%">Full Width</option>
                  <option value="75%">75% Width</option>
                  <option value="50%">Half Width</option>
                  <option value="25%">Quarter Width</option>
                  <option value="200px">Small (200px)</option>
                  <option value="400px">Medium (400px)</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Image Alignment</label>
              <select
                style={styles.select}
                value={block.content.alignment}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, alignment: e.target.value }
                })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div style={styles.blockContent}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Line Style</label>
                <select
                  style={styles.select}
                  value={block.content.style}
                  onChange={(e) => updateContentBlock(block.id, {
                    content: { ...block.content, style: e.target.value }
                  })}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Line Color</label>
                <input
                  type="color"
                  style={styles.colorInput}
                  value={block.content.color}
                  onChange={(e) => updateContentBlock(block.id, {
                    content: { ...block.content, color: e.target.value }
                  })}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Width</label>
              <select
                style={styles.select}
                value={block.content.width}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, width: e.target.value }
                })}
              >
                <option value="100%">Full Width</option>
                <option value="75%">75% Width</option>
                <option value="50%">Half Width</option>
                <option value="25%">Quarter Width</option>
              </select>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div style={styles.blockContent}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Height</label>
              <select
                style={styles.select}
                value={block.content.height}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, height: e.target.value }
                })}
              >
                <option value="10px">Small (10px)</option>
                <option value="20px">Medium (20px)</option>
                <option value="30px">Large (30px)</option>
                <option value="40px">Extra Large (40px)</option>
                <option value="60px">XXL (60px)</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Background Color</label>
              <input
                type="color"
                style={styles.colorInput}
                value={block.settings.backgroundColor}
                onChange={(e) => updateContentBlock(block.id, {
                  settings: { ...block.settings, backgroundColor: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case 'social':
        return (
          <div style={styles.blockContent}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Social Media Links</label>
              <div style={styles.socialPlatforms}>
                {block.content.platforms.map((platform, index) => (
                  <div key={platform.name} style={styles.socialPlatform}>
                    <label style={styles.socialLabel}>
                      <input
                        type="checkbox"
                        checked={platform.enabled}
                        onChange={(e) => {
                          const newPlatforms = [...block.content.platforms];
                          newPlatforms[index].enabled = e.target.checked;
                          updateContentBlock(block.id, {
                            content: { ...block.content, platforms: newPlatforms }
                          });
                        }}
                      />
                      {platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}
                    </label>
                    <input
                      type="url"
                      style={styles.socialInput}
                      value={platform.url}
                      onChange={(e) => {
                        const newPlatforms = [...block.content.platforms];
                        newPlatforms[index].url = e.target.value;
                        updateContentBlock(block.id, {
                          content: { ...block.content, platforms: newPlatforms }
                        });
                      }}
                      placeholder={`Your ${platform.name} URL`}
                      disabled={!platform.enabled}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Icon Size</label>
                <select
                  style={styles.select}
                  value={block.settings.size}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, size: e.target.value }
                  })}
                >
                  <option value="24px">Small (24px)</option>
                  <option value="32px">Medium (32px)</option>
                  <option value="40px">Large (40px)</option>
                  <option value="48px">Extra Large (48px)</option>
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Spacing</label>
                <select
                  style={styles.select}
                  value={block.settings.spacing}
                  onChange={(e) => updateContentBlock(block.id, {
                    settings: { ...block.settings, spacing: e.target.value }
                  })}
                >
                  <option value="5px">Tight (5px)</option>
                  <option value="10px">Normal (10px)</option>
                  <option value="15px">Loose (15px)</option>
                  <option value="20px">Very Loose (20px)</option>
                </select>
              </div>
            </div>

            <div style={styles.alignmentButtons}>
              {['left', 'center', 'right'].map(align => (
                <button
                  key={align}
                  style={{
                    ...styles.alignmentButton,
                    ...(block.settings.alignment === align ? styles.activeAlignment : {})
                  }}
                  onClick={() => updateContentBlock(block.id, {
                    settings: { ...block.settings, alignment: align }
                  })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        );

      case 'columns':
        return (
          <div style={styles.blockContent}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Left Column Content</label>
              <textarea
                style={styles.textarea}
                value={block.content.column1}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, column1: e.target.value }
                })}
                placeholder="Left column content..."
                rows={3}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Right Column Content</label>
              <textarea
                style={styles.textarea}
                value={block.content.column2}
                onChange={(e) => updateContentBlock(block.id, {
                  content: { ...block.content, column2: e.target.value }
                })}
                placeholder="Right column content..."
                rows={3}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Column Gap</label>
              <select
                style={styles.select}
                value={block.settings.gap}
                onChange={(e) => updateContentBlock(block.id, {
                  settings: { ...block.settings, gap: e.target.value }
                })}
              >
                <option value="10px">Narrow (10px)</option>
                <option value="20px">Normal (20px)</option>
                <option value="30px">Wide (30px)</option>
                <option value="40px">Extra Wide (40px)</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div style={styles.blockContent}>
            <p style={styles.placeholderText}>
              Editor for {block.type} block coming soon...
            </p>
          </div>
        );
    }
  };

  return (
    <div style={styles.contentEditor}>
      <h3 style={styles.sectionTitle}>Email Content</h3>
      
      {campaign.content_blocks.length === 0 ? (
        <div style={styles.emptyContent}>
          <FiPlus style={styles.emptyIcon} />
          <p style={styles.emptyText}>No content blocks yet.</p>
          <p style={styles.emptySubtext}>Add your first block from the options above to get started.</p>
        </div>
      ) : (
        <div style={styles.contentBlocks}>
          {campaign.content_blocks.map((block, index) => (
            <div key={block.id} style={styles.contentBlock}>
              {/* Block Header */}
              <div style={styles.blockHeader}>
                <div style={styles.blockTitle}>
                  <div style={styles.blockIcon}>
                    {block.type === 'text' && <FiType />}
                    {block.type === 'heading' && <FiType />}
                    {block.type === 'button' && <FiLink />}
                    {block.type === 'image' && <FiImage />}
                    {block.type === 'divider' && <FiMinus />}
                    {block.type === 'social' && <FiShare2 />}
                    {block.type === 'spacer' && <FiSettings />}
                    {block.type === 'columns' && <FiColumns />}
                  </div>
                  <span style={styles.blockTypeName}>
                    {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block
                  </span>
                </div>
                
                <div style={styles.blockActions}>
                  <button
                    style={styles.actionButton}
                    onClick={() => moveContentBlock(block.id, 'up')}
                    disabled={index === 0}
                    title="Move Up"
                  >
                    ↑
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={() => moveContentBlock(block.id, 'down')}
                    disabled={index === campaign.content_blocks.length - 1}
                    title="Move Down"
                  >
                    ↓
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={() => removeContentBlock(block.id)}
                    title="Delete Block"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              {/* Block Content Editor */}
              <div style={styles.blockEditor}>
                {renderBlockEditor(block)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentEditor;