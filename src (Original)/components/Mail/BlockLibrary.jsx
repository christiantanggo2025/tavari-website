// components/Mail/BlockLibrary.jsx
import React from 'react';
import { styles } from '../../styles/Mail/CampaignBuilder.styles';
import {
  FiType, FiImage, FiLink, FiMinus, FiShare2, FiSettings, FiCopy
} from 'react-icons/fi';

const BlockLibrary = ({ onAddBlock }) => {
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

  return (
    <div style={styles.blockLibrary}>
      <h2 style={styles.sectionTitle}>Add Content Blocks</h2>
      <div style={styles.blockTypes}>
        {blockTypes.map(blockType => (
          <button
            key={blockType.type}
            style={styles.blockTypeButton}
            onClick={() => onAddBlock(blockType.type)}
            title={blockType.description}
          >
            <blockType.icon style={styles.blockTypeIcon} />
            <span style={styles.blockTypeLabel}>{blockType.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BlockLibrary;