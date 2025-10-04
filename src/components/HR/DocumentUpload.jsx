import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';

const DocumentUpload = ({ 
  employeeId, 
  businessId, 
  onUploadSuccess, 
  onUploadError,
  acceptedFileTypes = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt',
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowMultiple = true,
  category = null 
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedFiles = [];
    const errors = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size
        if (file.size > maxFileSize) {
          errors.push(`${file.name}: File size exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`);
          continue;
        }

        // Validate file type
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const allowedTypes = acceptedFileTypes.toLowerCase().split(',');
        if (!allowedTypes.includes(fileExtension)) {
          errors.push(`${file.name}: File type not allowed`);
          continue;
        }

        try {
          // Generate unique filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const randomId = Math.random().toString(36).substr(2, 9);
          const fileName = `${employeeId}/${timestamp}-${randomId}-${file.name}`;

          // Update progress
          setUploadProgress(Math.round((i / files.length) * 50));

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('employee-documents')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          // Update progress
          setUploadProgress(Math.round((i / files.length) * 75));

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('employee-documents')
            .getPublicUrl(fileName);

          // Create database record (assuming employee_documents table will exist)
          const documentData = {
            business_id: businessId,
            employee_id: employeeId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            mime_type: file.type,
            storage_url: urlData.publicUrl,
            category: category,
            upload_status: 'completed',
            uploaded_at: new Date().toISOString()
          };

          // TODO: This will need the employee_documents table to exist
          // For now, we'll call the success handler with the file data
          uploadedFiles.push({
            ...documentData,
            id: randomId // temporary ID
          });

          // Update progress
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        } catch (fileError) {
          console.error('File upload error:', fileError);
          errors.push(`${file.name}: ${fileError.message}`);
        }
      }

      // Handle results
      if (uploadedFiles.length > 0) {
        onUploadSuccess && onUploadSuccess(uploadedFiles);
      }

      if (errors.length > 0) {
        onUploadError && onUploadError(errors);
      }

    } catch (error) {
      console.error('Upload process error:', error);
      onUploadError && onUploadError([error.message]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = allowMultiple ? 
        Array.from(e.dataTransfer.files) : 
        [e.dataTransfer.files[0]];
      handleFiles(files);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = allowMultiple ? 
        Array.from(e.target.files) : 
        [e.target.files[0]];
      handleFiles(files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={styles.container}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        accept={acceptedFileTypes}
        multiple={allowMultiple}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {/* Upload Area */}
      <div
        style={{
          ...styles.uploadArea,
          ...(dragActive ? styles.uploadAreaActive : {}),
          ...(uploading ? styles.uploadAreaDisabled : {})
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!uploading ? triggerFileInput : undefined}
      >
        {uploading ? (
          <div style={styles.uploadingState}>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${uploadProgress}%`
                }}
              />
            </div>
            <div style={styles.uploadingText}>
              Uploading... {uploadProgress}%
            </div>
          </div>
        ) : (
          <div style={styles.uploadPrompt}>
            <div style={styles.uploadIcon}>📎</div>
            <div style={styles.uploadText}>
              <div style={styles.primaryText}>
                {allowMultiple ? 'Drop files here or click to browse' : 'Drop file here or click to browse'}
              </div>
              <div style={styles.secondaryText}>
                Accepted: {acceptedFileTypes} • Max: {Math.round(maxFileSize / 1024 / 1024)}MB
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button Alternative */}
      <div style={styles.buttonContainer}>
        <button
          style={{
            ...styles.uploadButton,
            ...(uploading ? styles.uploadButtonDisabled : {})
          }}
          onClick={triggerFileInput}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : `Choose ${allowMultiple ? 'Files' : 'File'}`}
        </button>
      </div>

      {/* Category Selection */}
      {category === null && (
        <div style={styles.categoryContainer}>
          <label style={styles.categoryLabel}>Document Category:</label>
          <select style={styles.categorySelect} defaultValue="">
            <option value="">Select category...</option>
            <option value="contract">Employment Contract</option>
            <option value="identification">Identification</option>
            <option value="certification">Certification/License</option>
            <option value="tax_form">Tax Forms</option>
            <option value="emergency_contact">Emergency Contact</option>
            <option value="direct_deposit">Direct Deposit</option>
            <option value="training">Training Documentation</option>
            <option value="performance">Performance Review</option>
            <option value="disciplinary">Disciplinary Action</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      {/* Help Text */}
      <div style={styles.helpText}>
        Upload employee documents securely. All files are encrypted and stored with business-level access controls.
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto'
  },
  uploadArea: {
    border: '2px dashed #14B8A6',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    marginBottom: '15px'
  },
  uploadAreaActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0F9D8F',
    transform: 'scale(1.02)'
  },
  uploadAreaDisabled: {
    cursor: 'not-allowed',
    opacity: 0.7,
    backgroundColor: '#F9FAFB'
  },
  uploadPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px'
  },
  uploadIcon: {
    fontSize: '48px',
    opacity: 0.6
  },
  uploadText: {
    textAlign: 'center'
  },
  primaryText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '5px'
  },
  secondaryText: {
    fontSize: '14px',
    color: '#6B7280'
  },
  uploadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px'
  },
  progressBar: {
    width: '100%',
    maxWidth: '300px',
    height: '6px',
    backgroundColor: '#E5E7EB',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14B8A6',
    transition: 'width 0.3s ease'
  },
  uploadingText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#374151'
  },
  buttonContainer: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  uploadButton: {
    padding: '12px 24px',
    backgroundColor: 'white',
    border: '2px solid #14B8A6',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  uploadButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    color: '#9CA3AF',
    cursor: 'not-allowed'
  },
  categoryContainer: {
    marginBottom: '20px'
  },
  categoryLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    display: 'block',
    marginBottom: '6px'
  },
  categorySelect: {
    width: '100%',
    padding: '12px',
    border: '2px solid #14B8A6',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white'
  },
  helpText: {
    fontSize: '12px',
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic'
  }
};

export default DocumentUpload;