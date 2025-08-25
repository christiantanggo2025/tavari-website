// src/screens/Music/MusicUpload.jsx
import React, { useState, useRef } from 'react';
import { FiUpload, FiMusic, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useBusiness } from '../../contexts/BusinessContext';
import useAccessProtection from '../../hooks/useAccessProtection';
import SessionManager from '../../components/SessionManager';
import { supabase } from '../../supabaseClient';

const MusicUpload = () => {
  const { profile } = useUserProfile();
  const { business } = useBusiness();
  useAccessProtection(profile);

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const mp3Files = fileArray.filter(file => 
      file.type === 'audio/mp3' || file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')
    );

    if (mp3Files.length !== fileArray.length) {
      alert('Only MP3 files are allowed. Some files were filtered out.');
    }

    const newUploads = mp3Files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name.replace('.mp3', ''),
      artist: '',
      includeInShuffle: true,
      status: 'pending', // pending, uploading, success, error
      progress: 0,
      error: null
    }));

    setUploadQueue(prev => [...prev, ...newUploads]);
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Handle file input click
  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files);
  };

  // Update track info
  const updateTrackInfo = (id, field, value) => {
    setUploadQueue(prev => prev.map(track => 
      track.id === id ? { ...track, [field]: value } : track
    ));
  };

  // Remove track from queue
  const removeTrack = (id) => {
    setUploadQueue(prev => prev.filter(track => track.id !== id));
  };

  // Upload files to Supabase
  const uploadFiles = async () => {
    if (!business?.id) {
      alert('Please select a business first');
      return;
    }

    setIsUploading(true);

    for (const track of uploadQueue) {
      if (track.status !== 'pending') continue;

      try {
        // Update status to uploading
        setUploadQueue(prev => prev.map(t => 
          t.id === track.id ? { ...t, status: 'uploading', progress: 0 } : t
        ));

        // Create unique filename with sanitized name
        const sanitizedFileName = track.file.name
          .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
          .replace(/\s+/g, '_') // Replace spaces with underscore
          .toLowerCase();
        
        const fileName = `${business.id}/${Date.now()}_${sanitizedFileName}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('music-files')
          .upload(fileName, track.file, {
            onUploadProgress: (progress) => {
              const percent = (progress.loaded / progress.total) * 100;
              setUploadQueue(prev => prev.map(t => 
                t.id === track.id ? { ...t, progress: percent } : t
              ));
            }
          });

        if (uploadError) throw uploadError;

        // Get file duration (basic estimation)
        const audio = new Audio();
        audio.src = URL.createObjectURL(track.file);
        
        const duration = await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            resolve(Math.round(audio.duration));
          });
          audio.addEventListener('error', () => {
            resolve(0); // Default if can't get duration
          });
        });

        // Insert into database
        const { error: dbError } = await supabase
          .from('music_tracks')
          .insert({
            title: track.name || track.file.name.replace('.mp3', ''),
            artist: track.artist || 'Unknown Artist',
            file_path: uploadData.path,
            duration: duration,
            include_in_shuffle: track.includeInShuffle,
            business_id: business.id,
            uploaded_by: profile.id
          });

        if (dbError) throw dbError;

        // Update status to success
        setUploadQueue(prev => prev.map(t => 
          t.id === track.id ? { ...t, status: 'success', progress: 100 } : t
        ));

      } catch (error) {
        console.error('Upload error:', error);
        setUploadQueue(prev => prev.map(t => 
          t.id === track.id ? { 
            ...t, 
            status: 'error', 
            error: error.message 
          } : t
        ));
      }
    }

    setIsUploading(false);
  };

  // Clear completed uploads
  const clearCompleted = () => {
    setUploadQueue(prev => prev.filter(track => 
      track.status !== 'success' && track.status !== 'error'
    ));
  };

  return (
    <SessionManager>
      <div style={styles.container}>
        <div style={styles.header}>
          <FiUpload size={32} style={styles.headerIcon} />
          <h1 style={styles.title}>Upload Music</h1>
          <p style={styles.subtitle}>
            Add MP3 files to your music library for {business?.name || 'your business'}
          </p>
        </div>

        {/* Upload Area */}
        <div
          style={{
            ...styles.uploadArea,
            ...(isDragOver ? styles.uploadAreaDragOver : {})
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <FiUpload size={48} style={styles.uploadIcon} />
          <h3 style={styles.uploadTitle}>
            {isDragOver ? 'Drop your MP3 files here' : 'Drag & drop MP3 files here'}
          </h3>
          <p style={styles.uploadDescription}>
            or click to browse and select files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".mp3,audio/mp3,audio/mpeg"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <div style={styles.queueSection}>
            <div style={styles.queueHeader}>
              <h2 style={styles.sectionTitle}>Upload Queue ({uploadQueue.length} files)</h2>
              <div style={styles.queueActions}>
                {uploadQueue.some(t => t.status === 'pending') && (
                  <button
                    style={styles.uploadButton}
                    onClick={uploadFiles}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload All'}
                  </button>
                )}
                {uploadQueue.some(t => t.status === 'success' || t.status === 'error') && (
                  <button
                    style={styles.clearButton}
                    onClick={clearCompleted}
                  >
                    Clear Completed
                  </button>
                )}
              </div>
            </div>

            <div style={styles.trackList}>
              {uploadQueue.map(track => (
                <div key={track.id} style={styles.trackItem}>
                  <div style={styles.trackInfo}>
                    <div style={styles.trackStatus}>
                      {track.status === 'pending' && <FiMusic size={20} color="#666" />}
                      {track.status === 'uploading' && <div style={styles.spinner} />}
                      {track.status === 'success' && <FiCheck size={20} color="#28a745" />}
                      {track.status === 'error' && <FiX size={20} color="#dc3545" />}
                    </div>
                    
                    <div style={styles.trackDetails}>
                      <input
                        style={styles.trackInput}
                        type="text"
                        placeholder="Song title"
                        value={track.name}
                        onChange={(e) => updateTrackInfo(track.id, 'name', e.target.value)}
                        disabled={track.status !== 'pending'}
                      />
                      <input
                        style={styles.trackInput}
                        type="text"
                        placeholder="Artist name"
                        value={track.artist}
                        onChange={(e) => updateTrackInfo(track.id, 'artist', e.target.value)}
                        disabled={track.status !== 'pending'}
                      />
                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={track.includeInShuffle}
                          onChange={(e) => updateTrackInfo(track.id, 'includeInShuffle', e.target.checked)}
                          disabled={track.status !== 'pending'}
                        />
                        Include in shuffle
                      </label>
                    </div>
                  </div>

                  <div style={styles.trackActions}>
                    {track.status === 'uploading' && (
                      <div style={styles.progressBar}>
                        <div 
                          style={{
                            ...styles.progressFill,
                            width: `${track.progress}%`
                          }}
                        />
                      </div>
                    )}
                    {track.status === 'error' && (
                      <div style={styles.errorMessage}>
                        <FiAlertCircle size={16} />
                        {track.error}
                      </div>
                    )}
                    {track.status === 'pending' && (
                      <button
                        style={styles.removeButton}
                        onClick={() => removeTrack(track.id)}
                      >
                        <FiX size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={styles.instructionsSection}>
          <h3 style={styles.instructionsTitle}>Upload Instructions</h3>
          <ul style={styles.instructionsList}>
            <li>Only MP3 files are supported</li>
            <li>Maximum file size: 50MB per file</li>
            <li>Fill in song title and artist for better organization</li>
            <li>Uncheck "Include in shuffle" for announcements or special tracks</li>
            <li>Files will be organized by business automatically</li>
          </ul>
        </div>
      </div>
    </SessionManager>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e9ecef',
  },
  headerIcon: {
    color: '#20c997',
    marginBottom: '10px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  },
  uploadArea: {
    border: '3px dashed #20c997',
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginBottom: '40px',
    backgroundColor: '#f8f9fa',
  },
  uploadAreaDragOver: {
    borderColor: '#17a2b8',
    backgroundColor: '#e3f7fc',
    transform: 'scale(1.02)',
  },
  uploadIcon: {
    color: '#20c997',
    marginBottom: '20px',
  },
  uploadTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  uploadDescription: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  },
  queueSection: {
    marginBottom: '40px',
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
  },
  queueActions: {
    display: 'flex',
    gap: '10px',
  },
  uploadButton: {
    backgroundColor: '#20c997',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  trackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  trackItem: {
    backgroundColor: '#fff',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  trackInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flex: '1',
    minWidth: '300px',
  },
  trackStatus: {
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #20c997',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  trackDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: '1',
  },
  trackInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#666',
  },
  trackActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  progressBar: {
    width: '100px',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#20c997',
    transition: 'width 0.3s ease',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#dc3545',
    fontSize: '12px',
    maxWidth: '150px',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsSection: {
    backgroundColor: '#f8f9fa',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
  },
  instructionsTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 15px 0',
  },
  instructionsList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#666',
    lineHeight: '1.6',
  },
};

// Add CSS for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default MusicUpload;