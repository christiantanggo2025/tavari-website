// components/Mail/ImageUpload.jsx
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { FiUpload, FiX, FiImage, FiLoader } from 'react-icons/fi';

const ImageUpload = ({ onImageSelect, currentImage = null, businessId }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadImage = async (file) => {
    try {
      setUploading(true);

      // Validate file
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5MB.');
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('email-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('email-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Call parent callback with image URL
      if (onImageSelect) {
        onImageSelect(imageUrl, file.name);
      }

      console.log('Image uploaded successfully:', imageUrl);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      uploadImage(files[0]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const removeImage = () => {
    if (onImageSelect) {
      onImageSelect('', '');
    }
  };

  return (
    <div style={styles.container}>
      {currentImage ? (
        <div style={styles.imagePreview}>
          <img 
            src={currentImage} 
            alt="Selected" 
            style={styles.previewImage}
          />
          <div style={styles.imageOverlay}>
            <button 
              style={styles.removeButton}
              onClick={removeImage}
              title="Remove image"
            >
              <FiX />
            </button>
          </div>
        </div>
      ) : (
        <div 
          style={{
            ...styles.uploadArea,
            ...(dragOver ? styles.dragOver : {}),
            ...(uploading ? styles.uploading : {})
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={styles.fileInput}
            id="image-upload"
            disabled={uploading}
          />
          
          <label htmlFor="image-upload" style={styles.uploadLabel}>
            {uploading ? (
              <>
                <FiLoader style={styles.spinningIcon} />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <FiImage style={styles.uploadIcon} />
                <span style={styles.uploadText}>
                  Click to upload or drag & drop
                </span>
                <span style={styles.uploadSubtext}>
                  PNG, JPG, GIF up to 5MB
                </span>
              </>
            )}
          </label>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },
  uploadArea: {
    border: '2px dashed #ddd',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#fafafa',
  },
  dragOver: {
    borderColor: 'teal',
    backgroundColor: '#f0fdfa',
  },
  uploading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  fileInput: {
    display: 'none',
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  uploadIcon: {
    fontSize: '32px',
    color: 'teal',
  },
  spinningIcon: {
    fontSize: '32px',
    color: 'teal',
    animation: 'spin 1s linear infinite',
  },
  uploadText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  uploadSubtext: {
    fontSize: '12px',
    color: '#666',
  },
  imagePreview: {
    position: 'relative',
    display: 'inline-block',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #ddd',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    display: 'block',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: '5px',
  },
  removeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '12px',
  },
};

// Add spinner animation
if (!document.querySelector('#image-upload-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'image-upload-styles';
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ImageUpload;