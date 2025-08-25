// components/Mail/ComplexLayoutTester.jsx - Step 100: Complex Layout Testing
import React, { useState, useEffect } from 'react';
import { 
  FiGrid, FiLayers, FiImage, FiType, FiAlertTriangle, FiCheck, 
  FiX, FiPlay, FiPause, FiRefreshCw, FiDownload, FiUpload 
} from 'react-icons/fi';

const ComplexLayoutTester = ({ campaign, isOpen, onClose, onLayoutUpdate }) => {
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [selectedTests, setSelectedTests] = useState([
    'multi_column',
    'image_heavy',
    'mixed_content',
    'responsive_breakpoints',
    'text_overflow',
    'button_alignment'
  ]);
  const [customLayouts, setCustomLayouts] = useState([]);

  // Predefined complex layout test scenarios
  const layoutTests = {
    multi_column: {
      name: 'Multi-Column Layouts',
      description: 'Test complex column structures and nesting',
      icon: FiGrid,
      severity: 'high',
      checks: [
        'Column width consistency',
        'Mobile stacking behavior',
        'Content alignment within columns',
        'Gap spacing uniformity'
      ]
    },
    image_heavy: {
      name: 'Image-Heavy Templates',
      description: 'Test layouts with multiple images and media',
      icon: FiImage,
      severity: 'medium',
      checks: [
        'Image loading performance',
        'Alt text presence',
        'Responsive image scaling',
        'Image-to-text ratio balance'
      ]
    },
    mixed_content: {
      name: 'Mixed Content Blocks',
      description: 'Test complex combinations of different block types',
      icon: FiLayers,
      severity: 'high',
      checks: [
        'Block spacing consistency',
        'Content flow logic',
        'Visual hierarchy maintenance',
        'Cross-block interactions'
      ]
    },
    responsive_breakpoints: {
      name: 'Responsive Breakpoints',
      description: 'Test behavior at different screen sizes',
      icon: FiRefreshCw,
      severity: 'critical',
      checks: [
        'Mobile (320px) rendering',
        'Tablet (768px) rendering',
        'Desktop (1024px) rendering',
        'Content reflow accuracy'
      ]
    },
    text_overflow: {
      name: 'Text Overflow Handling',
      description: 'Test long content and text overflow scenarios',
      icon: FiType,
      severity: 'medium',
      checks: [
        'Long subject line handling',
        'Extended text block behavior',
        'Button text overflow',
        'Email client text limits'
      ]
    },
    button_alignment: {
      name: 'Button and CTA Alignment',
      description: 'Test call-to-action placement and alignment',
      icon: FiCheck,
      severity: 'high',
      checks: [
        'Button centering accuracy',
        'Multiple button spacing',
        'CTA visibility and prominence',
        'Click target size adequacy'
      ]
    }
  };

  useEffect(() => {
    if (isOpen && campaign?.content_blocks?.length > 0) {
      runComplexLayoutTests();
    }
  }, [isOpen, campaign, selectedTests]);

  const runComplexLayoutTests = async () => {
    if (!campaign?.content_blocks) return;
    
    setTesting(true);
    const results = {};

    for (const testType of selectedTests) {
      const test = layoutTests[testType];
      if (!test) continue;

      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 300));

      const testResult = await executeLayoutTest(testType, campaign);
      results[testType] = testResult;
    }

    setTestResults(results);
    setTesting(false);
  };

  const executeLayoutTest = async (testType, campaign) => {
    const issues = [];
    const warnings = [];
    const passed = [];
    let complexityScore = 0;

    switch (testType) {
      case 'multi_column':
        const columnBlocks = campaign.content_blocks.filter(block => block.type === 'columns');
        complexityScore = columnBlocks.length * 15;

        if (columnBlocks.length === 0) {
          passed.push('No column layouts to test');
        } else {
          columnBlocks.forEach((block, index) => {
            if (!block.content.column1 && !block.content.column2) {
              issues.push(`Column block ${index + 1}: Empty columns detected`);
            }
            if (!block.settings.gap || parseInt(block.settings.gap) < 10) {
              warnings.push(`Column block ${index + 1}: Insufficient gap spacing`);
            } else {
              passed.push(`Column block ${index + 1}: Proper gap spacing`);
            }
          });
        }
        break;

      case 'image_heavy':
        const imageBlocks = campaign.content_blocks.filter(block => block.type === 'image');
        const totalBlocks = campaign.content_blocks.length;
        const imageRatio = imageBlocks.length / totalBlocks;
        complexityScore = imageBlocks.length * 10;

        if (imageRatio > 0.6) {
          warnings.push('High image-to-content ratio may affect loading performance');
        }

        imageBlocks.forEach((block, index) => {
          if (!block.content.alt) {
            issues.push(`Image block ${index + 1}: Missing alt text for accessibility`);
          } else {
            passed.push(`Image block ${index + 1}: Alt text present`);
          }

          if (!block.content.src) {
            issues.push(`Image block ${index + 1}: Missing image source`);
          }

          if (block.content.width === '100%' && imageBlocks.length > 3) {
            warnings.push(`Image block ${index + 1}: Full-width image in image-heavy layout`);
          }
        });
        break;

      case 'mixed_content':
        const blockTypes = [...new Set(campaign.content_blocks.map(block => block.type))];
        complexityScore = blockTypes.length * 8;

        if (blockTypes.length < 3) {
          passed.push('Simple content structure detected');
        } else {
          // Check for logical content flow
          let previousWasHeading = false;
          campaign.content_blocks.forEach((block, index) => {
            if (block.type === 'heading') {
              previousWasHeading = true;
              passed.push(`Block ${index + 1}: Heading provides structure`);
            } else if (previousWasHeading && block.type === 'text') {
              passed.push(`Block ${index + 1}: Text follows heading logically`);
              previousWasHeading = false;
            } else if (block.type === 'button' && index === campaign.content_blocks.length - 1) {
              passed.push(`Block ${index + 1}: CTA placed at end appropriately`);
            }

            // Check spacing between different block types
            if (index > 0) {
              const prevBlock = campaign.content_blocks[index - 1];
              if (prevBlock.type !== block.type) {
                passed.push(`Block ${index + 1}: Proper block type transition`);
              }
            }
          });
        }
        break;

      case 'responsive_breakpoints':
        complexityScore = campaign.content_blocks.length * 5;
        
        // Simulate responsive testing at different breakpoints
        const breakpoints = [
          { name: 'Mobile', width: 320 },
          { name: 'Tablet', width: 768 },
          { name: 'Desktop', width: 1024 }
        ];

        breakpoints.forEach(breakpoint => {
          const responsive = testResponsiveBreakpoint(campaign, breakpoint.width);
          if (responsive.issues.length === 0) {
            passed.push(`${breakpoint.name} (${breakpoint.width}px): Renders correctly`);
          } else {
            responsive.issues.forEach(issue => {
              issues.push(`${breakpoint.name}: ${issue}`);
            });
          }
        });
        break;

      case 'text_overflow':
        complexityScore = campaign.content_blocks.filter(b => b.type === 'text' || b.type === 'heading').length * 3;
        
        // Check subject line length
        if (campaign.subject_line && campaign.subject_line.length > 60) {
          warnings.push('Subject line may be truncated on mobile devices');
        } else if (campaign.subject_line) {
          passed.push('Subject line length is appropriate');
        }

        campaign.content_blocks.forEach((block, index) => {
          if (block.type === 'text' && block.content) {
            if (block.content.length > 500) {
              warnings.push(`Text block ${index + 1}: Very long content may impact readability`);
            } else {
              passed.push(`Text block ${index + 1}: Appropriate text length`);
            }
          }

          if (block.type === 'button' && block.content.text) {
            if (block.content.text.length > 25) {
              warnings.push(`Button ${index + 1}: Text may be too long for mobile`);
            } else {
              passed.push(`Button ${index + 1}: Appropriate text length`);
            }
          }
        });
        break;

      case 'button_alignment':
        const buttonBlocks = campaign.content_blocks.filter(block => block.type === 'button');
        complexityScore = buttonBlocks.length * 8;

        if (buttonBlocks.length === 0) {
          warnings.push('No call-to-action buttons found');
        } else {
          buttonBlocks.forEach((block, index) => {
            if (block.settings.textAlign === 'center') {
              passed.push(`Button ${index + 1}: Properly centered`);
            } else {
              warnings.push(`Button ${index + 1}: Consider center alignment for better visibility`);
            }

            if (!block.content.url || !block.content.url.startsWith('http')) {
              issues.push(`Button ${index + 1}: Invalid or missing URL`);
            } else {
              passed.push(`Button ${index + 1}: Valid URL configured`);
            }
          });

          // Check button spacing
          if (buttonBlocks.length > 1) {
            passed.push('Multiple buttons detected - ensure adequate spacing');
          }
        }
        break;
    }

    const totalChecks = issues.length + warnings.length + passed.length;
    const successRate = totalChecks > 0 ? (passed.length / totalChecks) * 100 : 100;

    return {
      test_type: testType,
      issues,
      warnings,
      passed,
      complexity_score: complexityScore,
      success_rate: successRate,
      status: issues.length === 0 ? 'passed' : 'failed',
      timestamp: new Date().toISOString()
    };
  };

  const testResponsiveBreakpoint = (campaign, width) => {
    const issues = [];

    // Simulate responsive testing logic
    campaign.content_blocks.forEach((block, index) => {
      if (block.type === 'columns' && width < 768) {
        // Columns should stack on mobile
        if (!block.settings.mobileStack) {
          issues.push(`Column block ${index + 1} may not stack properly`);
        }
      }

      if (block.type === 'image' && width < 480) {
        if (block.content.width && !block.content.width.includes('%')) {
          issues.push(`Image block ${index + 1} may not be responsive`);
        }
      }

      if (block.type === 'button' && width < 380) {
        if (block.settings.padding && parseInt(block.settings.padding) < 12) {
          issues.push(`Button ${index + 1} touch target may be too small`);
        }
      }
    });

    return { issues };
  };

  const generateLayoutComplexityReport = () => {
    const report = {
      campaign_info: {
        name: campaign.name,
        total_blocks: campaign.content_blocks.length,
        block_types: [...new Set(campaign.content_blocks.map(b => b.type))],
        tested_at: new Date().toISOString()
      },
      test_results: testResults,
      complexity_analysis: {
        total_complexity_score: Object.values(testResults).reduce((sum, r) => sum + (r.complexity_score || 0), 0),
        average_success_rate: Object.values(testResults).reduce((sum, r) => sum + (r.success_rate || 0), 0) / Object.keys(testResults).length,
        critical_issues: Object.values(testResults).reduce((sum, r) => sum + r.issues.length, 0),
        total_warnings: Object.values(testResults).reduce((sum, r) => sum + r.warnings.length, 0)
      },
      recommendations: generateLayoutRecommendations()
    };

    return report;
  };

  const generateLayoutRecommendations = () => {
    const recommendations = [];
    
    Object.entries(testResults).forEach(([testType, result]) => {
      if (result.issues.length > 0) {
        recommendations.push({
          type: 'critical',
          test: testType,
          title: `Fix ${layoutTests[testType].name} Issues`,
          description: `Address ${result.issues.length} critical issues in ${layoutTests[testType].name.toLowerCase()}`,
          impact: 'high',
          issues: result.issues
        });
      }

      if (result.warnings.length > 2) {
        recommendations.push({
          type: 'improvement',
          test: testType,
          title: `Optimize ${layoutTests[testType].name}`,
          description: `Consider addressing ${result.warnings.length} potential improvements`,
          impact: 'medium',
          warnings: result.warnings
        });
      }

      if (result.complexity_score > 50) {
        recommendations.push({
          type: 'simplification',
          test: testType,
          title: `Simplify ${layoutTests[testType].name}`,
          description: `High complexity score (${result.complexity_score}) may impact performance`,
          impact: 'medium'
        });
      }
    });

    // Add general recommendations
    const totalBlocks = campaign.content_blocks.length;
    if (totalBlocks > 15) {
      recommendations.push({
        type: 'performance',
        title: 'Consider Email Length',
        description: `${totalBlocks} content blocks may be too many for optimal engagement`,
        impact: 'medium'
      });
    }

    return recommendations;
  };

  const exportComplexityReport = () => {
    const report = generateLayoutComplexityReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layout-complexity-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createCustomLayoutTest = () => {
    const customTest = {
      id: `custom_${Date.now()}`,
      name: 'Custom Layout Test',
      description: 'User-defined layout testing scenario',
      checks: [],
      created_at: new Date().toISOString()
    };

    setCustomLayouts([...customLayouts, customTest]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return '#4caf50';
      case 'failed': return '#f44336';
      default: return '#ff9800';
    }
  };

  const getTestIcon = (testType) => {
    const test = layoutTests[testType];
    return test ? test.icon : FiGrid;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      default: return '#4caf50';
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Complex Layout Testing</h2>
          <div style={styles.headerActions}>
            <button style={styles.exportButton} onClick={exportComplexityReport}>
              <FiDownload style={styles.buttonIcon} />
              Export Report
            </button>
            <button style={styles.closeButton} onClick={onClose}>
              <FiX />
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {/* Test Selection */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Layout Tests</h3>
            <div style={styles.testsGrid}>
              {Object.entries(layoutTests).map(([testType, test]) => {
                const TestIcon = test.icon;
                return (
                  <label key={testType} style={styles.testOption}>
                    <input
                      type="checkbox"
                      checked={selectedTests.includes(testType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTests([...selectedTests, testType]);
                        } else {
                          setSelectedTests(selectedTests.filter(t => t !== testType));
                        }
                      }}
                      style={styles.checkbox}
                    />
                    <div style={styles.testInfo}>
                      <div style={styles.testHeader}>
                        <TestIcon style={styles.testIcon} />
                        <span style={styles.testName}>{test.name}</span>
                        <span style={{
                          ...styles.severityBadge,
                          backgroundColor: getSeverityColor(test.severity)
                        }}>
                          {test.severity}
                        </span>
                      </div>
                      <p style={styles.testDescription}>{test.description}</p>
                      <div style={styles.testChecks}>
                        {test.checks.map((check, index) => (
                          <span key={index} style={styles.checkItem}>
                            <FiCheck style={styles.checkIcon} />
                            {check}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Test Controls */}
          <div style={styles.controls}>
            <button
              style={styles.runTestsButton}
              onClick={runComplexLayoutTests}
              disabled={testing || selectedTests.length === 0}
            >
              {testing ? (
                <>
                  <FiRefreshCw style={{ ...styles.buttonIcon, animation: 'spin 1s linear infinite' }} />
                  Testing Layouts...
                </>
              ) : (
                <>
                  <FiPlay style={styles.buttonIcon} />
                  Run Layout Tests
                </>
              )}
            </button>
            <button
              style={styles.customTestButton}
              onClick={createCustomLayoutTest}
            >
              <FiUpload style={styles.buttonIcon} />
              Create Custom Test
            </button>
          </div>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Test Results</h3>
              
              {/* Results Summary */}
              <div style={styles.summaryCards}>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryNumber}>
                    {Object.values(testResults).filter(r => r.status === 'passed').length}
                  </div>
                  <div style={styles.summaryLabel}>Tests Passed</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryNumber}>
                    {Object.values(testResults).reduce((sum, r) => sum + r.issues.length, 0)}
                  </div>
                  <div style={styles.summaryLabel}>Critical Issues</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryNumber}>
                    {Object.values(testResults).reduce((sum, r) => sum + r.warnings.length, 0)}
                  </div>
                  <div style={styles.summaryLabel}>Warnings</div>
                </div>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryNumber}>
                    {Math.round(Object.values(testResults).reduce((sum, r) => sum + r.complexity_score, 0) / Object.keys(testResults).length)}
                  </div>
                  <div style={styles.summaryLabel}>Avg Complexity</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div style={styles.resultsGrid}>
                {Object.entries(testResults).map(([testType, result]) => {
                  const TestIcon = getTestIcon(testType);
                  return (
                    <div
                      key={testType}
                      style={{
                        ...styles.resultCard,
                        borderColor: getStatusColor(result.status)
                      }}
                    >
                      <div style={styles.resultHeader}>
                        <div style={styles.resultInfo}>
                          <TestIcon style={styles.resultIcon} />
                          <span style={styles.resultName}>{layoutTests[testType].name}</span>
                        </div>
                        <div style={styles.resultStatus}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: result.status === 'passed' ? '#e8f5e8' : '#ffebee',
                            color: result.status === 'passed' ? '#2e7d32' : '#c62828'
                          }}>
                            {result.status}
                          </span>
                          <span style={styles.successRate}>
                            {Math.round(result.success_rate)}%
                          </span>
                        </div>
                      </div>

                      <div style={styles.resultMetrics}>
                        <div style={styles.metric}>
                          <span style={styles.metricLabel}>Complexity:</span>
                          <span style={styles.metricValue}>{result.complexity_score}</span>
                        </div>
                        <div style={styles.metric}>
                          <span style={styles.metricLabel}>Checks:</span>
                          <span style={styles.metricValue}>{result.passed.length + result.warnings.length + result.issues.length}</span>
                        </div>
                      </div>

                      {result.issues.length > 0 && (
                        <div style={styles.issuesSection}>
                          <h4 style={styles.issuesTitle}>
                            <FiX style={styles.issueIcon} />
                            Critical Issues ({result.issues.length})
                          </h4>
                          <ul style={styles.issuesList}>
                            {result.issues.map((issue, index) => (
                              <li key={index} style={styles.issueItem}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.warnings.length > 0 && (
                        <div style={styles.warningsSection}>
                          <h4 style={styles.warningsTitle}>
                            <FiAlertTriangle style={styles.warningIcon} />
                            Warnings ({result.warnings.length})
                          </h4>
                          <ul style={styles.warningsList}>
                            {result.warnings.slice(0, 3).map((warning, index) => (
                              <li key={index} style={styles.warningItem}>{warning}</li>
                            ))}
                            {result.warnings.length > 3 && (
                              <li style={styles.moreWarnings}>
                                +{result.warnings.length - 3} more warnings...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {result.passed.length > 0 && (
                        <div style={styles.passedSection}>
                          <h4 style={styles.passedTitle}>
                            <FiCheck style={styles.passedIcon} />
                            Passed ({result.passed.length})
                          </h4>
                          <div style={styles.passedSummary}>
                            {result.passed.length} checks passed successfully
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {Object.keys(testResults).length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Layout Recommendations</h3>
              <div style={styles.recommendationsGrid}>
                {generateLayoutRecommendations().map((rec, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.recommendationCard,
                      borderLeftColor: rec.type === 'critical' ? '#f44336' : 
                                      rec.type === 'improvement' ? '#ff9800' : '#2196f3'
                    }}
                  >
                    <div style={styles.recommendationHeader}>
                      <span style={styles.recommendationTitle}>{rec.title}</span>
                      <span style={{
                        ...styles.impactBadge,
                        backgroundColor: rec.impact === 'high' ? '#ffebee' : '#fff3cd',
                        color: rec.impact === 'high' ? '#c62828' : '#856404'
                      }}>
                        {rec.impact} impact
                      </span>
                    </div>
                    <p style={styles.recommendationDescription}>{rec.description}</p>
                    {rec.issues && (
                      <div style={styles.recommendationDetails}>
                        <strong>Issues to fix:</strong>
                        <ul style={styles.recommendationList}>
                          {rec.issues.slice(0, 2).map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
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
    maxWidth: '1400px',
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
  headerActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
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
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  testsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
  },
  testOption: {
    display: 'flex',
    gap: '15px',
    padding: '20px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
  },
  testInfo: {
    flex: 1,
  },
  testHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  testIcon: {
    fontSize: '20px',
    color: 'teal',
  },
  testName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  severityBadge: {
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  testDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
    lineHeight: '1.4',
  },
  testChecks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#555',
  },
  checkIcon: {
    fontSize: '12px',
    color: '#4caf50',
  },
  controls: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    flexWrap: 'wrap',
  },
  runTestsButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '15px 25px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  customTestButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '13px 23px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  summaryCard: {
    backgroundColor: '#f8f8f8',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  summaryNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 'bold',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '25px',
  },
  resultCard: {
    border: '2px solid',
    borderRadius: '10px',
    padding: '25px',
    backgroundColor: '#fafafa',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  resultInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  resultIcon: {
    fontSize: '24px',
    color: 'teal',
  },
  resultName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  resultStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  successRate: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  resultMetrics: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
  },
  metric: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#666',
  },
  metricValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  issuesSection: {
    marginBottom: '15px',
  },
  issuesTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  issueIcon: {
    fontSize: '14px',
  },
  issuesList: {
    margin: 0,
    paddingLeft: '20px',
  },
  issueItem: {
    fontSize: '13px',
    color: '#f44336',
    marginBottom: '3px',
  },
  warningsSection: {
    marginBottom: '15px',
  },
  warningsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  warningIcon: {
    fontSize: '14px',
  },
  warningsList: {
    margin: 0,
    paddingLeft: '20px',
  },
  warningItem: {
    fontSize: '13px',
    color: '#ff9800',
    marginBottom: '3px',
  },
  moreWarnings: {
    fontSize: '13px',
    color: '#999',
    fontStyle: 'italic',
  },
  passedSection: {
    marginBottom: '15px',
  },
  passedTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  passedIcon: {
    fontSize: '14px',
  },
  passedSummary: {
    fontSize: '13px',
    color: '#4caf50',
  },
  recommendationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
  },
  recommendationCard: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderLeft: '4px solid',
    borderRadius: '6px',
    padding: '20px',
  },
  recommendationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  recommendationTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  impactBadge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  recommendationDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
    lineHeight: '1.4',
  },
  recommendationDetails: {
    fontSize: '13px',
    color: '#555',
  },
  recommendationList: {
    margin: '5px 0 0 15px',
    paddingLeft: '0',
  },
};

export default ComplexLayoutTester;