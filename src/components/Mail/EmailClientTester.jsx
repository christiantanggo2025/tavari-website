// components/Mail/EmailClientTester.jsx - Step 97: Email Client Testing
import React, { useState, useEffect } from 'react';
import { 
  FiMonitor, FiSmartphone, FiMail, FiCheck, FiX, FiAlertTriangle, 
  FiRefreshCw, FiEye, FiSettings, FiDownload, FiUpload 
} from 'react-icons/fi';

const EmailClientTester = ({ campaign, business, isOpen, onClose }) => {
  const [selectedClients, setSelectedClients] = useState(['gmail', 'outlook', 'apple']);
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [activeClient, setActiveClient] = useState('gmail');

  // Email clients with their specific CSS and rendering rules
  const emailClients = {
    gmail: {
      name: 'Gmail',
      icon: FiMail,
      css: {
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        lineHeight: '1.4',
        // Gmail strips CSS from head, only inline styles work
        webkitTextSizeAdjust: 'none',
        msTextSizeAdjust: 'none'
      },
      limitations: [
        'Strips CSS from <head> section',
        'Limited support for CSS3',
        'No support for @media queries in <head>',
        'Converts some CSS to inline styles'
      ],
      compatibility: 'good'
    },
    outlook: {
      name: 'Outlook 2016+',
      icon: FiMonitor,
      css: {
        fontFamily: 'Calibri, Arial, sans-serif',
        maxWidth: '600px',
        lineHeight: '1.2',
        // Outlook uses Word rendering engine
        msoLineHeightRule: 'exactly'
      },
      limitations: [
        'Uses Microsoft Word rendering engine',
        'Poor support for CSS positioning',
        'Limited background image support',
        'Inconsistent padding/margin rendering'
      ],
      compatibility: 'fair'
    },
    apple: {
      name: 'Apple Mail',
      icon: FiSmartphone,
      css: {
        fontFamily: '-apple-system, BlinkMacSystemFont, Arial, sans-serif',
        maxWidth: '600px',
        lineHeight: '1.5',
        // Apple Mail has excellent CSS support
        webkitTextSizeAdjust: '100%'
      },
      limitations: [
        'Excellent CSS support',
        'Good responsive design support',
        'Supports most modern CSS features'
      ],
      compatibility: 'excellent'
    },
    yahoo: {
      name: 'Yahoo Mail',
      icon: FiMail,
      css: {
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        lineHeight: '1.4'
      },
      limitations: [
        'Strips some CSS properties',
        'Limited media query support',
        'Inconsistent rendering on mobile'
      ],
      compatibility: 'fair'
    },
    thunderbird: {
      name: 'Thunderbird',
      icon: FiMonitor,
      css: {
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        lineHeight: '1.4'
      },
      limitations: [
        'Good CSS support',
        'Limited JavaScript support',
        'Consistent rendering across platforms'
      ],
      compatibility: 'good'
    }
  };

  useEffect(() => {
    if (isOpen && campaign?.content_blocks?.length > 0) {
      runCompatibilityTests();
    }
  }, [isOpen, campaign, selectedClients]);

  const runCompatibilityTests = async () => {
    if (!campaign?.content_blocks) return;
    
    setTesting(true);
    const results = {};

    // Simulate testing each selected client
    for (const clientId of selectedClients) {
      const client = emailClients[clientId];
      if (!client) continue;

      // Simulate test delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const clientResult = await testEmailClient(clientId, campaign);
      results[clientId] = clientResult;
    }

    setTestResults(results);
    setTesting(false);
  };

  const testEmailClient = async (clientId, campaign) => {
    const client = emailClients[clientId];
    const issues = [];
    const warnings = [];
    let compatibilityScore = 100;

    // Test each content block for client-specific issues
    campaign.content_blocks.forEach((block, index) => {
      switch (block.type) {
        case 'image':
          if (clientId === 'outlook' && block.content.src) {
            if (!block.content.alt) {
              issues.push(`Block ${index + 1}: Image missing alt text (required for Outlook)`);
              compatibilityScore -= 10;
            }
            if (block.settings.borderRadius && parseInt(block.settings.borderRadius) > 0) {
              warnings.push(`Block ${index + 1}: Rounded corners may not display in Outlook`);
              compatibilityScore -= 5;
            }
          }
          break;

        case 'button':
          if (clientId === 'outlook') {
            if (block.settings.borderRadius && parseInt(block.settings.borderRadius) > 6) {
              warnings.push(`Block ${index + 1}: Button border radius may not display correctly in Outlook`);
              compatibilityScore -= 5;
            }
          }
          if (!block.content.url || !block.content.url.startsWith('http')) {
            issues.push(`Block ${index + 1}: Button missing valid URL`);
            compatibilityScore -= 15;
          }
          break;

        case 'columns':
          if (clientId === 'gmail' && previewMode === 'mobile') {
            warnings.push(`Block ${index + 1}: Column layout may not stack properly in Gmail mobile`);
            compatibilityScore -= 5;
          }
          break;

        case 'social':
          if (block.content.platforms) {
            const enabledPlatforms = block.content.platforms.filter(p => p.enabled && p.url);
            if (enabledPlatforms.length === 0) {
              warnings.push(`Block ${index + 1}: No social media links configured`);
              compatibilityScore -= 5;
            }
          }
          break;
      }
    });

    // Client-specific validation
    if (clientId === 'outlook') {
      const hasBackgroundImages = campaign.content_blocks.some(block => 
        block.settings?.backgroundColor && block.settings.backgroundColor !== 'transparent'
      );
      if (hasBackgroundImages) {
        warnings.push('Background colors may display inconsistently in Outlook');
        compatibilityScore -= 5;
      }
    }

    // Check for unsubscribe link
    const hasUnsubscribe = campaign.content_blocks.some(block =>
      (block.type === 'text' && block.content?.includes('{UnsubscribeLink}')) ||
      (block.type === 'button' && block.content?.url?.includes('unsubscribe'))
    );

    if (!hasUnsubscribe) {
      issues.push('Missing required unsubscribe link');
      compatibilityScore -= 20;
    }

    return {
      clientId,
      issues,
      warnings,
      compatibilityScore: Math.max(0, compatibilityScore),
      status: issues.length === 0 ? 'passed' : 'failed',
      timestamp: new Date().toISOString()
    };
  };

  const generateClientPreviewHTML = (clientId) => {
    const client = emailClients[clientId];
    if (!client || !campaign?.content_blocks) return '';

    // Generate HTML with client-specific CSS
    const blockHTML = campaign.content_blocks.map(block => {
      switch (block.type) {
        case 'text':
          return `<p style="font-family: ${client.css.fontFamily}; font-size: ${block.settings.fontSize}; color: ${block.settings.color}; text-align: ${block.settings.textAlign}; line-height: ${client.css.lineHeight}; margin: 15px 0;">${block.content}</p>`;

        case 'heading':
          return `<${block.settings.level} style="font-family: ${client.css.fontFamily}; font-size: ${block.settings.fontSize}; color: ${block.settings.color}; text-align: ${block.settings.textAlign}; font-weight: ${block.settings.fontWeight}; margin: 20px 0 10px 0;">${block.content}</${block.settings.level}>`;

        case 'button':
          const borderRadius = clientId === 'outlook' ? '0px' : block.settings.borderRadius;
          return `<div style="text-align: ${block.settings.textAlign}; margin: 20px 0;"><a href="${block.content.url}" style="background-color: ${block.settings.backgroundColor}; color: ${block.settings.color}; padding: ${block.settings.padding}; border-radius: ${borderRadius}; text-decoration: none; display: inline-block; font-family: ${client.css.fontFamily};">${block.content.text}</a></div>`;

        case 'image':
          const imageHtml = `<img src="${block.content.src}" alt="${block.content.alt}" style="max-width: ${block.content.width}; width: ${block.content.width}; height: auto; display: block;" />`;
          return `<div style="text-align: ${block.content.alignment}; margin: 15px 0;">${imageHtml}</div>`;

        case 'divider':
          return `<hr style="border: none; border-top: 1px ${block.content.style} ${block.content.color}; width: ${block.content.width}; margin: 20px auto;" />`;

        case 'spacer':
          return `<div style="height: ${block.content.height}; font-size: 1px; line-height: 1px;">&nbsp;</div>`;

        default:
          return '';
      }
    }).join('');

    return `
      <div style="font-family: ${client.css.fontFamily}; max-width: ${client.css.maxWidth}; margin: 0 auto; background-color: white; line-height: ${client.css.lineHeight};">
        ${blockHTML}
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; font-family: ${client.css.fontFamily};">
          <p style="margin: 5px 0;">You received this email because you subscribed to our mailing list.</p>
          <p style="margin: 5px 0;">
            <a href="#" style="color: #999; text-decoration: underline;">Unsubscribe</a> | 
            <a href="#" style="color: #999; text-decoration: underline;">Update Preferences</a>
          </p>
        </div>
      </div>
    `;
  };

  const exportTestReport = () => {
    const report = {
      campaign: {
        name: campaign.name,
        subject_line: campaign.subject_line,
        tested_at: new Date().toISOString()
      },
      test_results: testResults,
      summary: {
        clients_tested: selectedClients.length,
        passed: Object.values(testResults).filter(r => r.status === 'passed').length,
        failed: Object.values(testResults).filter(r => r.status === 'failed').length,
        average_compatibility: Object.values(testResults).reduce((sum, r) => sum + r.compatibilityScore, 0) / Object.values(testResults).length
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-client-test-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCompatibilityColor = (score) => {
    if (score >= 90) return '#4caf50';
    if (score >= 70) return '#ff9800';
    return '#f44336';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <FiCheck style={{ color: '#4caf50' }} />;
      case 'failed': return <FiX style={{ color: '#f44336' }} />;
      default: return <FiRefreshCw style={{ color: '#666' }} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Email Client Testing</h2>
          <button style={styles.closeButton} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div style={styles.content}>
          {/* Client Selection */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Select Email Clients to Test</h3>
            <div style={styles.clientGrid}>
              {Object.entries(emailClients).map(([clientId, client]) => (
                <label key={clientId} style={styles.clientOption}>
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(clientId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClients([...selectedClients, clientId]);
                      } else {
                        setSelectedClients(selectedClients.filter(id => id !== clientId));
                      }
                    }}
                    style={styles.checkbox}
                  />
                  <div style={styles.clientInfo}>
                    <client.icon style={styles.clientIcon} />
                    <span style={styles.clientName}>{client.name}</span>
                    <span style={{
                      ...styles.compatibilityBadge,
                      backgroundColor: client.compatibility === 'excellent' ? '#e8f5e8' : 
                                    client.compatibility === 'good' ? '#fff3cd' : '#ffebee',
                      color: client.compatibility === 'excellent' ? '#2e7d32' : 
                            client.compatibility === 'good' ? '#856404' : '#c62828'
                    }}>
                      {client.compatibility}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Test Controls */}
          <div style={styles.controls}>
            <div style={styles.previewToggle}>
              <button
                style={{
                  ...styles.toggleButton,
                  ...(previewMode === 'desktop' ? styles.activeToggle : {})
                }}
                onClick={() => setPreviewMode('desktop')}
              >
                <FiMonitor />
                Desktop
              </button>
              <button
                style={{
                  ...styles.toggleButton,
                  ...(previewMode === 'mobile' ? styles.activeToggle : {})
                }}
                onClick={() => setPreviewMode('mobile')}
              >
                <FiSmartphone />
                Mobile
              </button>
            </div>
            <button
              style={styles.testButton}
              onClick={runCompatibilityTests}
              disabled={testing || selectedClients.length === 0}
            >
              <FiRefreshCw style={{ ...styles.buttonIcon, ...(testing ? { animation: 'spin 1s linear infinite' } : {}) }} />
              {testing ? 'Testing...' : 'Run Tests'}
            </button>
          </div>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div style={styles.section}>
              <div style={styles.resultsHeader}>
                <h3 style={styles.sectionTitle}>Test Results</h3>
                <button style={styles.exportButton} onClick={exportTestReport}>
                  <FiDownload style={styles.buttonIcon} />
                  Export Report
                </button>
              </div>
              
              <div style={styles.resultsGrid}>
                {Object.entries(testResults).map(([clientId, result]) => {
                  const client = emailClients[clientId];
                  return (
                    <div
                      key={clientId}
                      style={{
                        ...styles.resultCard,
                        borderColor: result.status === 'passed' ? '#4caf50' : '#f44336'
                      }}
                    >
                      <div style={styles.resultHeader}>
                        <div style={styles.resultClient}>
                          <client.icon style={styles.resultIcon} />
                          <span style={styles.resultName}>{client.name}</span>
                        </div>
                        <div style={styles.resultStatus}>
                          {getStatusIcon(result.status)}
                          <span style={{
                            color: getCompatibilityColor(result.compatibilityScore),
                            fontWeight: 'bold'
                          }}>
                            {result.compatibilityScore}%
                          </span>
                        </div>
                      </div>

                      {result.issues.length > 0 && (
                        <div style={styles.issuesList}>
                          <h4 style={styles.issuesTitle}>Issues:</h4>
                          {result.issues.map((issue, index) => (
                            <div key={index} style={styles.issue}>
                              <FiX style={styles.issueIcon} />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {result.warnings.length > 0 && (
                        <div style={styles.warningsList}>
                          <h4 style={styles.warningsTitle}>Warnings:</h4>
                          {result.warnings.map((warning, index) => (
                            <div key={index} style={styles.warning}>
                              <FiAlertTriangle style={styles.warningIcon} />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        style={styles.previewButton}
                        onClick={() => setActiveClient(clientId)}
                      >
                        <FiEye style={styles.buttonIcon} />
                        Preview
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Client Preview */}
          {activeClient && emailClients[activeClient] && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                Preview in {emailClients[activeClient].name} ({previewMode})
              </h3>
              <div style={styles.previewContainer}>
                <div style={{
                  ...styles.emailPreview,
                  ...(previewMode === 'mobile' ? styles.mobilePreview : styles.desktopPreview)
                }}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateClientPreviewHTML(activeClient)
                    }}
                  />
                </div>
              </div>

              {/* Client Limitations */}
              <div style={styles.limitationsSection}>
                <h4 style={styles.limitationsTitle}>
                  {emailClients[activeClient].name} Limitations:
                </h4>
                <ul style={styles.limitationsList}>
                  {emailClients[activeClient].limitations.map((limitation, index) => (
                    <li key={index} style={styles.limitation}>
                      {limitation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '95%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
    borderRadius: '12px 12px 0 0',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '5px',
  },
  content: {
    padding: '30px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
  },
  clientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  clientOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '15px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  checkbox: {
    width: '18px',
    height: '18px',
  },
  clientInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  clientIcon: {
    fontSize: '20px',
    color: 'teal',
  },
  clientName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  compatibilityBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  previewToggle: {
    display: 'flex',
    gap: '2px',
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
    padding: '2px',
  },
  toggleButton: {
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  activeToggle: {
    backgroundColor: 'white',
    color: '#333',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  testButton: {
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
  buttonIcon: {
    fontSize: '16px',
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  exportButton: {
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
    gap: '6px',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  resultCard: {
    border: '2px solid',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#fafafa',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  resultClient: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resultIcon: {
    fontSize: '20px',
    color: 'teal',
  },
  resultName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  resultStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  issuesList: {
    marginBottom: '15px',
  },
  issuesTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: '8px',
  },
  issue: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    marginBottom: '5px',
    fontSize: '13px',
    color: '#f44336',
  },
  issueIcon: {
    fontSize: '14px',
    marginTop: '1px',
  },
  warningsList: {
    marginBottom: '15px',
  },
  warningsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: '8px',
  },
  warning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    marginBottom: '5px',
    fontSize: '13px',
    color: '#ff9800',
  },
  warningIcon: {
    fontSize: '14px',
    marginTop: '1px',
  },
  previewButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    justifyContent: 'center',
  },
  previewContainer: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
  },
  emailPreview: {
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  desktopPreview: {
    width: '600px',
    maxWidth: '100%',
  },
  mobilePreview: {
    width: '320px',
    maxWidth: '100%',
  },
  limitationsSection: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '6px',
  },
  limitationsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    marginBottom: '10px',
  },
  limitationsList: {
    margin: 0,
    paddingLeft: '20px',
  },
  limitation: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '5px',
  },
};

export default EmailClientTester;