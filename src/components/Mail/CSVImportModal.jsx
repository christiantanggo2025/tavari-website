// components/Mail/CSVImportModal.jsx
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { FiX, FiUpload, FiDownload, FiAlertTriangle, FiCheck, FiFileText, FiUsers } from 'react-icons/fi';

const CSVImportModal = ({ isOpen, onClose, onImportComplete, businessId }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState('upload'); // upload, preview, importing, complete
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [validRows, setValidRows] = useState([]);
  const [importResults, setImportResults] = useState(null);

  const requiredFields = ['email'];
  const optionalFields = ['first_name', 'last_name', 'phone', 'tags', 'source'];
  const allFields = [...requiredFields, ...optionalFields];

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      alert('Please select a valid CSV file.');
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must contain at least a header row and one data row.');
        return;
      }

      // Parse headers
      const headerLine = lines[0];
      const parsedHeaders = parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
      
      // Parse data rows
      const dataRows = lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const row = {};
        parsedHeaders.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        row._originalIndex = index + 2; // +2 because we start from line 1 and skip header
        return row;
      });

      setHeaders(parsedHeaders);
      setCsvData(dataRows);
      
      // Auto-map obvious columns
      const autoMapping = {};
      parsedHeaders.forEach(header => {
        const cleanHeader = header.replace(/[^a-z]/g, '');
        if (cleanHeader.includes('email') || cleanHeader === 'email') {
          autoMapping.email = header;
        } else if (cleanHeader.includes('firstname') || cleanHeader === 'firstname') {
          autoMapping.first_name = header;
        } else if (cleanHeader.includes('lastname') || cleanHeader === 'lastname') {
          autoMapping.last_name = header;
        } else if (cleanHeader.includes('phone') || cleanHeader === 'phone') {
          autoMapping.phone = header;
        } else if (cleanHeader.includes('tag') || cleanHeader === 'tags') {
          autoMapping.tags = header;
        }
      });
      
      setMapping(autoMapping);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const validateData = () => {
    const newErrors = [];
    const newValidRows = [];
    
    // Check if email column is mapped
    if (!mapping.email) {
      alert('Email column mapping is required.');
      return false;
    }

    csvData.forEach((row, index) => {
      const rowErrors = [];
      const cleanRow = {};
      
      // Validate and clean mapped fields
      allFields.forEach(field => {
        if (mapping[field]) {
          let value = row[mapping[field]];
          
          if (field === 'email') {
            value = value?.trim().toLowerCase();
            if (!value) {
              rowErrors.push('Email is required');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              rowErrors.push('Invalid email format');
            }
            cleanRow[field] = value;
          } else if (field === 'phone') {
            // Clean and format phone
            const cleaned = value ? value.replace(/\D/g, '') : '';
            if (cleaned.length >= 10) {
              cleanRow[field] = cleaned.length === 10 ? 
                `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}` :
                `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7,11)}`;
            } else if (cleaned.length > 0) {
              cleanRow[field] = value; // Keep original if can't format
            }
          } else if (field === 'tags') {
            // Parse tags
            cleanRow[field] = value ? 
              value.split(/[,;|]/).map(tag => tag.trim()).filter(tag => tag) : 
              [];
          } else {
            // First name, last name, source
            cleanRow[field] = value ? value.trim() : '';
          }
        }
      });

      // Set defaults
      cleanRow.source = cleanRow.source || 'csv_import';
      cleanRow.business_id = businessId;
      cleanRow._originalIndex = row._originalIndex;

      if (rowErrors.length > 0) {
        newErrors.push({
          row: index + 1,
          line: row._originalIndex,
          errors: rowErrors,
          data: row
        });
      } else {
        newValidRows.push(cleanRow);
      }
    });

    setErrors(newErrors);
    setValidRows(newValidRows);
    return true;
  };

  const handleImport = async () => {
    if (!validateData()) return;
    
    if (validRows.length === 0) {
      alert('No valid rows to import.');
      return;
    }

    const confirmMessage = `Import ${validRows.length} valid contacts? ${errors.length > 0 ? `(${errors.length} rows will be skipped due to errors)` : ''}`;
    if (!window.confirm(confirmMessage)) return;

    setImporting(true);
    setStep('importing');

    try {
      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;
      const importErrors = [];

      // Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        
        for (const row of batch) {
          try {
            // Use deduplication function
            const { data: contactId, error } = await supabase.rpc('dedupe_mail_contact', {
              p_business_id: businessId,
              p_email: row.email,
              p_first_name: row.first_name || '',
              p_last_name: row.last_name || '',
              p_phone: row.phone || '',
              p_source: row.source
            });

            if (error) throw error;

            // Check if this was a new contact or existing
            const { data: existingContact, error: checkError } = await supabase
              .from('mail_contacts')
              .select('created_at')
              .eq('id', contactId)
              .single();

            if (checkError) throw checkError;

            const isNew = new Date(existingContact.created_at) > new Date(Date.now() - 1000); // Created within last second

            if (isNew) {
              // Update tags if provided
              if (row.tags && row.tags.length > 0) {
                await supabase
                  .from('mail_contacts')
                  .update({ tags: row.tags })
                  .eq('id', contactId);
              }
              successCount++;
            } else {
              duplicateCount++;
            }

          } catch (error) {
            console.error('Error importing row:', error);
            errorCount++;
            importErrors.push({
              line: row._originalIndex,
              email: row.email,
              error: error.message
            });
          }
        }

        // Add small delay between batches to avoid overwhelming the database
        if (i + batchSize < validRows.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        business_id: businessId,
        action: 'csv_import',
        details: { 
          total_rows: csvData.length,
          valid_rows: validRows.length,
          success_count: successCount,
          duplicate_count: duplicateCount,
          error_count: errorCount,
          filename: file.name
        },
        created_at: new Date().toISOString()
      });

      setImportResults({
        total: csvData.length,
        valid: validRows.length,
        success: successCount,
        duplicates: duplicateCount,
        errors: errorCount + errors.length,
        importErrors
      });

      setStep('complete');

      if (onImportComplete) {
        onImportComplete(successCount);
      }

    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please try again.');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      'email,first_name,last_name,phone,tags',
      'john@example.com,John,Doe,(555) 123-4567,customer',
      'jane@example.com,Jane,Smith,(555) 987-6543,"vip,birthday-party"',
      'mike@example.com,Mike,Johnson,555-555-5555,customer'
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setErrors([]);
    setValidRows([]);
    setImportResults(null);
    setStep('upload');
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Import Contacts from CSV</h2>
          <button style={styles.closeButton} onClick={onClose}>
            <FiX />
          </button>
        </div>

        {step === 'upload' && (
          <div style={styles.content}>
            <div style={styles.uploadSection}>
              <div style={styles.uploadArea}>
                <FiUpload style={styles.uploadIcon} />
                <h3 style={styles.uploadTitle}>Select CSV File</h3>
                <p style={styles.uploadText}>
                  Choose a CSV file containing your contacts. Required column: email
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={styles.fileInput}
                  id="csvFile"
                />
                <label htmlFor="csvFile" style={styles.fileLabel}>
                  Choose File
                </label>
              </div>

              <div style={styles.sampleSection}>
                <h4 style={styles.sampleTitle}>Sample CSV Format</h4>
                <div style={styles.sampleTable}>
                  <div style={styles.sampleHeader}>
                    <span>email</span>
                    <span>first_name</span>
                    <span>last_name</span>
                    <span>phone</span>
                    <span>tags</span>
                  </div>
                  <div style={styles.sampleRow}>
                    <span>john@example.com</span>
                    <span>John</span>
                    <span>Doe</span>
                    <span>(555) 123-4567</span>
                    <span>customer</span>
                  </div>
                </div>
                <button 
                  style={styles.sampleButton}
                  onClick={downloadSampleCSV}
                >
                  <FiDownload style={styles.buttonIcon} />
                  Download Sample CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div style={styles.content}>
            <div style={styles.previewSection}>
              <h3 style={styles.sectionTitle}>Map CSV Columns</h3>
              <p style={styles.sectionText}>
                Match your CSV columns to contact fields. Email is required.
              </p>

              <div style={styles.mappingGrid}>
                {allFields.map(field => (
                  <div key={field} style={styles.mappingRow}>
                    <label style={styles.mappingLabel}>
                      {field.replace('_', ' ').toUpperCase()}
                      {requiredFields.includes(field) && <span style={styles.required}>*</span>}
                    </label>
                    <select
                      style={styles.mappingSelect}
                      value={mapping[field] || ''}
                      onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={styles.previewStats}>
                <div style={styles.statItem}>
                  <FiFileText style={styles.statIcon} />
                  <span>{csvData.length} rows in CSV</span>
                </div>
              </div>

              {errors.length > 0 && (
                <div style={styles.errorsSection}>
                  <h4 style={styles.errorsTitle}>
                    <FiAlertTriangle style={styles.errorIcon} />
                    Validation Errors ({errors.length} rows)
                  </h4>
                  <div style={styles.errorsList}>
                    {errors.slice(0, 10).map((error, index) => (
                      <div key={index} style={styles.errorItem}>
                        <span style={styles.errorRow}>Row {error.row} (Line {error.line}):</span>
                        <span style={styles.errorDetails}>{error.errors.join(', ')}</span>
                      </div>
                    ))}
                    {errors.length > 10 && (
                      <div style={styles.errorMore}>
                        +{errors.length - 10} more errors...
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={styles.previewActions}>
                <button 
                  style={styles.backButton}
                  onClick={resetImport}
                >
                  Back to Upload
                </button>
                <button 
                  style={styles.validateButton}
                  onClick={validateData}
                >
                  Validate Data
                </button>
                <button 
                  style={styles.importButton}
                  onClick={handleImport}
                  disabled={!mapping.email || importing}
                >
                  <FiUsers style={styles.buttonIcon} />
                  Import {validRows.length} Contacts
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div style={styles.content}>
            <div style={styles.importingSection}>
              <div style={styles.spinner}></div>
              <h3 style={styles.importingTitle}>Importing Contacts...</h3>
              <p style={styles.importingText}>
                Processing {validRows.length} contacts. This may take a moment.
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && importResults && (
          <div style={styles.content}>
            <div style={styles.resultsSection}>
              <div style={styles.successIcon}>
                <FiCheck />
              </div>
              <h3 style={styles.resultsTitle}>Import Complete!</h3>
              
              <div style={styles.resultsGrid}>
                <div style={styles.resultCard}>
                  <div style={styles.resultNumber}>{importResults.success}</div>
                  <div style={styles.resultLabel}>New Contacts</div>
                </div>
                <div style={styles.resultCard}>
                  <div style={styles.resultNumber}>{importResults.duplicates}</div>
                  <div style={styles.resultLabel}>Duplicates Updated</div>
                </div>
                <div style={styles.resultCard}>
                  <div style={styles.resultNumber}>{importResults.errors}</div>
                  <div style={styles.resultLabel}>Errors Skipped</div>
                </div>
              </div>

              {importResults.importErrors.length > 0 && (
                <div style={styles.importErrorsSection}>
                  <h4 style={styles.importErrorsTitle}>Import Errors</h4>
                  <div style={styles.importErrorsList}>
                    {importResults.importErrors.slice(0, 5).map((error, index) => (
                      <div key={index} style={styles.importErrorItem}>
                        <span style={styles.importErrorLine}>Line {error.line}:</span>
                        <span style={styles.importErrorEmail}>{error.email}</span>
                        <span style={styles.importErrorMessage}>{error.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.resultsActions}>
                <button 
                  style={styles.doneButton}
                  onClick={onClose}
                >
                  Done
                </button>
                <button 
                  style={styles.importMoreButton}
                  onClick={resetImport}
                >
                  Import More Contacts
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #f0f0f0',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '5px',
  },
  content: {
    padding: '20px',
  },
  uploadSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
  },
  uploadArea: {
    border: '2px dashed #ddd',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
  },
  uploadIcon: {
    fontSize: '48px',
    color: 'teal',
    marginBottom: '15px',
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  uploadText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    backgroundColor: 'teal',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-block',
  },
  sampleSection: {
    padding: '20px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
  },
  sampleTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
  },
  sampleTable: {
    marginBottom: '15px',
  },
  sampleHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
    padding: '8px 0',
    borderBottom: '1px solid #ddd',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#666',
  },
  sampleRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
    padding: '8px 0',
    fontSize: '12px',
    color: '#333',
  },
  sampleButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonIcon: {
    fontSize: '14px',
  },
  previewSection: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  sectionText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  mappingGrid: {
    display: 'grid',
    gap: '15px',
    marginBottom: '20px',
  },
  mappingRow: {
    display: 'grid',
    gridTemplateColumns: '150px 1fr',
    gap: '15px',
    alignItems: 'center',
  },
  mappingLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  required: {
    color: '#f44336',
    marginLeft: '4px',
  },
  mappingSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
  },
  previewStats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '6px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  statIcon: {
    fontSize: '16px',
    color: 'teal',
  },
  errorsSection: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#ffebee',
    borderRadius: '6px',
    border: '1px solid #f44336',
  },
  errorsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: '10px',
  },
  errorIcon: {
    fontSize: '16px',
  },
  errorsList: {
    maxHeight: '200px',
    overflow: 'auto',
  },
  errorItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '8px',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '4px',
  },
  errorRow: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#c62828',
  },
  errorDetails: {
    fontSize: '12px',
    color: '#666',
  },
  errorMore: {
    fontSize: '12px',
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: '10px',
  },
  previewActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  backButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  validateButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  importButton: {
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
  importingSection: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f0f0f0',
    borderTop: '4px solid teal',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px auto',
  },
  importingTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  importingText: {
    fontSize: '14px',
    color: '#666',
  },
  resultsSection: {
    textAlign: 'center',
    padding: '20px',
  },
  successIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#4caf50',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    margin: '0 auto 20px auto',
  },
  resultsTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '20px',
  },
  resultCard: {
    padding: '20px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
    textAlign: 'center',
  },
  resultNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'teal',
    marginBottom: '5px',
  },
  resultLabel: {
    fontSize: '14px',
    color: '#666',
  },
  importErrorsSection: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#fff3e0',
    borderRadius: '6px',
    textAlign: 'left',
  },
  importErrorsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: '10px',
  },
  importErrorsList: {
    maxHeight: '150px',
    overflow: 'auto',
  },
  importErrorItem: {
    display: 'flex',
    gap: '10px',
    marginBottom: '5px',
    fontSize: '12px',
  },
  importErrorLine: {
    fontWeight: 'bold',
    color: '#f57c00',
    minWidth: '60px',
  },
  importErrorEmail: {
    color: '#333',
    minWidth: '150px',
  },
  importErrorMessage: {
    color: '#666',
    flex: 1,
  },
  resultsActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  doneButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  importMoreButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 22px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('#csv-import-styles')) {
  styleSheet.id = 'csv-import-styles';
  document.head.appendChild(styleSheet);
}

export default CSVImportModal;