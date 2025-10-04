import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const ContractFileUpload = ({ 
  contractId, 
  employeeId, 
  onUploadComplete, 
  existingFiles = [],
  allowMultiple = false,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['.pdf', '.doc', '.docx'],
  className = ""
}) => {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Get auth info from current session (inline like TabScreen)
  const [authUser, setAuthUser] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  React.useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthUser(session.user);
        setBusinessId(localStorage.getItem('currentBusinessId'));
      }
    };
    initAuth();
  }, []);

  // Validate file type and size
  const validateFile = (file) => {
    const errors = [];
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`);
    }
    
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      errors.push(`File type must be one of: ${acceptedTypes.join(', ')}`);
    }
    
    return errors;
  };

  // Generate secure file path
  const generateFilePath = (fileName, fileType = 'contract') => {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${businessId}/${fileType}s/${contractId || employeeId}/${timestamp}_${sanitizedFileName}`;
  };

  // Upload file to Supabase Storage
  const uploadFileToStorage = async (file) => {
    const filePath = generateFilePath(file.name);
    
    const { data, error } = await supabase.storage
      .from('hr-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return { path: filePath, data };
  };

  // Save file record to database
  const saveFileRecord = async (file, storagePath) => {
    const fileRecord = {
      business_id: businessId,
      employee_id: employeeId || null,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      uploaded_by: authUser.id,
      uploaded_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('contract_files')
      .insert(fileRecord)
      .select()
      .single();

    if (error) {
      throw new Error(`Database save failed: ${error.message}`);
    }

    return data;
  };

  // Handle file upload
  const handleFileUpload = async (files) => {
    if (!authUser || !businessId) {
      setUploadError('Authentication required');
      return;
    }

    setUploadError(null);
    const filesToUpload = Array.from(files);

    // Validate all files first
    for (const file of filesToUpload) {
      const validationErrors = validateFile(file);
      if (validationErrors.length > 0) {
        setUploadError(`${file.name}: ${validationErrors.join(', ')}`);
        return;
      }
    }

    // Check if multiple files allowed
    if (!allowMultiple && filesToUpload.length > 1) {
      setUploadError('Only one file can be uploaded at a time');
      return;
    }

    // Start upload process
    const uploadPromises = filesToUpload.map(async (file) => {
      const uploadId = Date.now() + Math.random();
      
      setUploadingFiles(prev => [...prev, { 
        id: uploadId, 
        name: file.name, 
        progress: 0, 
        status: 'uploading' 
      }]);

      try {
        // Simulate progress for user feedback
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 30 } : f
        ));

        // Upload to storage
        const { path } = await uploadFileToStorage(file);
        
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 70 } : f
        ));

        // Save file record
        const fileRecord = await saveFileRecord(file, path);
        
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 100, status: 'complete' } : f
        ));

        return fileRecord;
      } catch (error) {
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, status: 'error', error: error.message } : f
        ));
        throw error;
      }
    });

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      
      // Remove completed uploads from state after delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.status !== 'complete'));
      }, 2000);

      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Download file
  const downloadFile = async (file) => {
    try {
      const { data, error } = await supabase.storage
        .from('hr-documents')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setUploadError(`Failed to download file: ${error.message}`);
    }
  };

  // Delete file
  const deleteFile = async (file) => {
    if (!confirm(`Are you sure you want to delete ${file.file_name}?`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('hr-documents')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('contract_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      if (onUploadComplete) {
        onUploadComplete([]);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setUploadError(`Failed to delete file: ${error.message}`);
    }
  };

  return (
    <div className={className} style={styles.container}>
      {/* Upload Area */}
      <div
        style={{
          ...styles.uploadArea,
          ...(dragOver ? styles.uploadAreaDragOver : {})
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload size={48} style={styles.uploadIcon} />
        <div style={styles.uploadText}>
          <p style={styles.uploadTitle}>
            Drop files here or click to upload
          </p>
          <p style={styles.uploadSubtext}>
            Supported formats: {acceptedTypes.join(', ')}
          </p>
          <p style={styles.uploadLimit}>
            Maximum file size: {Math.round(maxFileSize / (1024 * 1024))}MB
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={styles.chooseButton}
        >
          Choose Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          style={styles.hiddenInput}
        />
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div style={styles.errorBanner}>
          <AlertCircle size={20} style={styles.errorIcon} />
          <p style={styles.errorText}>{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            style={styles.errorClose}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div style={styles.progressContainer}>
          {uploadingFiles.map((file) => (
            <div key={file.id} style={styles.progressItem}>
              <FileText size={20} style={styles.progressIcon} />
              <div style={styles.progressInfo}>
                <p style={styles.progressFileName}>{file.name}</p>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressBarFill,
                      width: `${file.progress}%`
                    }}
                  />
                </div>
              </div>
              <div style={styles.progressStatus}>
                {file.status === 'uploading' && (
                  <div style={styles.spinner} />
                )}
                {file.status === 'complete' && (
                  <CheckCircle size={20} style={styles.successIcon} />
                )}
                {file.status === 'error' && (
                  <AlertCircle size={20} style={styles.errorIcon} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div style={styles.filesContainer}>
          <h4 style={styles.filesTitle}>Uploaded Files</h4>
          {existingFiles.map((file) => (
            <div key={file.id} style={styles.fileItem}>
              <FileText size={20} style={styles.fileIcon} />
              <div style={styles.fileInfo}>
                <p style={styles.fileName}>{file.file_name}</p>
                <p style={styles.fileMeta}>
                  {new Date(file.uploaded_at).toLocaleDateString()} • 
                  {Math.round(file.file_size / 1024)} KB
                </p>
              </div>
              <div style={styles.fileActions}>
                <button
                  onClick={() => downloadFile(file)}
                  style={styles.actionButton}
                  title="Download"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => deleteFile(file)}
                  style={styles.deleteButton}
                  title="Delete"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  uploadArea: {
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '48px 24px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  uploadAreaDragOver: {
    borderColor: '#008080',
    backgroundColor: '#f0fdfa'
  },
  uploadIcon: {
    color: '#9ca3af',
    marginBottom: '16px'
  },
  uploadText: {
    marginBottom: '16px'
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  uploadSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 4px 0'
  },
  uploadLimit: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0
  },
  chooseButton: {
    padding: '8px 16px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  hiddenInput: {
    display: 'none'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fee2e2',
    borderRadius: '6px',
    position: 'relative'
  },
  errorIcon: {
    color: '#dc2626',
    flexShrink: 0
  },
  errorText: {
    fontSize: '14px',
    color: '#dc2626',
    flex: 1,
    margin: 0
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    padding: '4px'
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  progressItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  progressIcon: {
    color: '#6b7280',
    flexShrink: 0
  },
  progressInfo: {
    flex: 1,
    minWidth: 0
  },
  progressFileName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#008080',
    transition: 'width 0.3s ease'
  },
  progressStatus: {
    flexShrink: 0
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #008080',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  successIcon: {
    color: '#059669'
  },
  filesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '6px'
  },
  fileIcon: {
    color: '#6b7280',
    flexShrink: 0
  },
  fileInfo: {
    flex: 1,
    minWidth: 0
  },
  fileName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  fileMeta: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0
  },
  fileActions: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    backgroundColor: '#f3f4f6',
    color: '#008080',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default ContractFileUpload;