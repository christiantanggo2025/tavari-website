// screens/Mail/CampaignSender.jsx - Complete with Steps 134-140 Integration
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import emailSendingService from '../../helpers/Mail/emailSendingService';
import systemTests from '../../helpers/Mail/systemTests'; // Step 140: Integration
import {
  FiSend, FiUsers, FiMail, FiCheckCircle, FiAlertTriangle, FiX, FiRefreshCw,
  FiClock, FiBarChart2, FiSettings, FiPlay, FiPause, FiStop, FiEye, FiDollarSign,
  FiShield, FiActivity, FiGlobe, FiZap, FiTarget
} from 'react-icons/fi';

const CampaignSender = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { business } = useBusiness();
  
  const [campaign, setCampaign] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState('all');
  const [customContactIds, setCustomContactIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(null);
  const [testEmails, setTestEmails] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [sendingStats, setSendingStats] = useState({
    queued: 0,
    sent: 0,
    failed: 0,
    bounced: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sendingPaused, setSendingPaused] = useState(false);

  // Step 60-70: Billing integration state
  const [billingInfo, setBillingInfo] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Steps 134-140: Enhanced monitoring and validation state
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [reputationInfo, setReputationInfo] = useState(null);
  const [complianceValidation, setComplianceValidation] = useState(null);
  const [domainAuthentication, setDomainAuthentication] = useState(null);
  const [contentOptimization, setContentOptimization] = useState(null);
  const [systemStatus, setSystemStatus] = useState('checking');
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);

  // Step 140: System testing integration state
  const [systemTesting, setSystemTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showTestResults, setShowTestResults] = useState(false);

  const businessId = business?.id;

  useEffect(() => {
    if (campaignId && businessId) {
      loadCampaign();
      loadContacts();
      loadBillingInfo();
      performSystemChecks();
    }
  }, [campaignId, businessId]);

  useEffect(() => {
    let interval;
    if (isMonitoring) {
      interval = setInterval(() => {
        updateSendingProgress();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, campaignId]);

  // Step 140: Health check integration - every 5 minutes
  useEffect(() => {
    const healthInterval = setInterval(async () => {
      try {
        const health = await systemTests.quickHealthCheck(businessId);
        if (!health.healthy) {
          console.warn('System health check failed:', health.details);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(healthInterval);
  }, [businessId]);

  // Step 60-70: Calculate estimated cost when recipient count changes
  useEffect(() => {
    calculateEstimatedCost();
  }, [selectedContacts, customContactIds, contacts, billingInfo]);

  // Steps 134-140: Perform comprehensive system checks
  const performSystemChecks = async () => {
    try {
      setSystemStatus('checking');
      
      // Parallel loading of system status information
      const [quota, reputation, settings] = await Promise.all([
        emailSendingService.checkSESQuota(false),
        emailSendingService.checkIPReputation(),
        supabase
          .from('mail_settings')
          .select('from_email')
          .eq('business_id', businessId)
          .single()
      ]);

      setQuotaInfo(quota);
      setReputationInfo(reputation);

      // Check domain authentication if from_email is configured
      if (settings.data?.from_email) {
        const domainAuth = await emailSendingService.validateDomainAuthentication(
          businessId, 
          settings.data.from_email
        );
        setDomainAuthentication(domainAuth);
      }

      setSystemStatus('ready');
    } catch (error) {
      console.error('Error performing system checks:', error);
      setSystemStatus('error');
    }
  };

  // Step 140: Run comprehensive system tests
  const runSystemTests = async () => {
    try {
      setSystemTesting(true);
      setSystemStatus('testing');
      
      console.log('🧪 Starting comprehensive system tests...');
      const results = await systemTests.runAllTests(businessId);
      
      setTestResults(results);
      setShowTestResults(true);
      
      if (results.overallPassed) {
        setSystemStatus('ready');
        console.log('✅ All system tests passed!');
      } else {
        setSystemStatus('error');
        console.error('❌ System tests failed:', results.stats.errors);
      }
      
      return results;
    } catch (error) {
      console.error('💥 System tests crashed:', error);
      setSystemStatus('error');
      setTestResults({
        summary: { overallStatus: 'CRASHED', error: error.message },
        overallPassed: false,
        stats: { passed: 0, failed: 1, errors: [error.message] }
      });
    } finally {
      setSystemTesting(false);
    }
  };

  // Step 140: Run performance benchmark
  const runPerformanceTest = async () => {
    try {
      setSystemTesting(true);
      console.log('🚀 Starting performance benchmark...');
      
      const perfResults = await systemTests.performanceBenchmark(businessId, 50);
      console.log('Performance test results:', perfResults);
      
      if (perfResults.success && perfResults.benchmark.acceptable) {
        alert(`Performance test passed! 
        
Throughput: ${perfResults.metrics.throughput.toFixed(2)} emails/sec
Queue Time: ${perfResults.metrics.queueTime}ms
Process Time: ${perfResults.metrics.processTime}ms
Total Time: ${perfResults.metrics.totalTime}ms

Benchmark: ${perfResults.benchmark.excellent ? 'Excellent' : 'Acceptable'}`);
      } else {
        alert(`Performance test failed or below acceptable thresholds:
        
Error: ${perfResults.error || 'Performance below 1 email/sec'}
Throughput: ${perfResults.metrics?.throughput?.toFixed(2) || 'N/A'} emails/sec`);
      }
    } catch (error) {
      console.error('Performance test failed:', error);
      alert('Performance test failed: ' + error.message);
    } finally {
      setSystemTesting(false);
    }
  };

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('mail_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('business_id', businessId)
        .single();

      if (error) throw error;
      setCampaign(data);
      
      if (data.status === 'sending') {
        setIsMonitoring(true);
        updateSendingProgress();
      }

      // Step 137: Perform compliance validation
      if (data) {
        try {
          const compliance = await emailSendingService.validateCampaignCompliance(data, businessId);
          setComplianceValidation(compliance);
          setValidationErrors(compliance.issues || []);
        } catch (error) {
          console.error('Error validating compliance:', error);
        }
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      navigate('/dashboard/mail/campaigns');
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mail_contacts')
        .select('id, first_name, last_name, email, subscribed, tags')
        .eq('business_id', businessId)
        .eq('subscribed', true)
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 60-70: Load billing information
  const loadBillingInfo = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_current_billing_period', { p_business_id: businessId });

      if (error) throw error;
      setBillingInfo(data[0] || null);
    } catch (error) {
      console.error('Error loading billing info:', error);
    }
  };

  // Step 60-70: Calculate estimated cost
  const calculateEstimatedCost = () => {
    const recipientCount = getRecipientCount();
    
    if (billingInfo && recipientCount > 0) {
      const remainingIncluded = Math.max(0, billingInfo.included_emails - billingInfo.emails_used);
      const overageEmails = Math.max(0, recipientCount - remainingIncluded);
      const cost = overageEmails * 0.0025; // $0.0025 per email overage
      setEstimatedCost(cost);
    } else {
      setEstimatedCost(recipientCount * 0.0025);
    }
  };

  const updateSendingProgress = async () => {
    try {
      const { data: queueStats, error: queueError } = await supabase
        .from('mail_sending_queue')
        .select('status')
        .eq('campaign_id', campaignId);

      if (queueError) throw queueError;

      const { data: sendStats, error: sendError } = await supabase
        .from('mail_campaign_sends')
        .select('status')
        .eq('campaign_id', campaignId);

      if (sendError) throw sendError;

      const stats = {
        queued: queueStats?.filter(q => q.status === 'queued').length || 0,
        processing: queueStats?.filter(q => q.status === 'processing').length || 0,
        sent: sendStats?.filter(s => s.status === 'sent').length || 0,
        failed: sendStats?.filter(s => s.status === 'failed').length || 0,
        bounced: sendStats?.filter(s => s.status === 'bounced').length || 0
      };

      setSendingStats(stats);

      const total = campaign?.total_recipients || 0;
      const completed = stats.sent + stats.failed + stats.bounced;
      
      setSendingProgress({
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        remaining: stats.queued + stats.processing
      });

      // Step 60-70: Check if sending is complete and record usage
      if (completed >= total && total > 0) {
        await recordFinalUsage(stats.sent);
        setIsMonitoring(false);
        setSending(false);
        
        await supabase
          .from('mail_campaigns')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            emails_sent: stats.sent
          })
          .eq('id', campaignId);
      }
    } catch (error) {
      console.error('Error updating sending progress:', error);
    }
  };

  // Step 60-70: Record final usage after campaign completion
  const recordFinalUsage = async (emailsSent) => {
    try {
      await supabase
        .rpc('record_email_usage', {
          p_business_id: businessId,
          p_campaign_id: campaignId,
          p_emails_sent: emailsSent
        });

      console.log(`Recorded usage: ${emailsSent} emails sent for campaign ${campaignId}`);
    } catch (error) {
      console.error('Error recording email usage:', error);
    }
  };

  const validateCampaignForSending = () => {
    const errors = [];

    if (!campaign) {
      errors.push('Campaign not found');
      return errors;
    }

    if (!campaign.name?.trim()) {
      errors.push('Campaign name is required');
    }

    if (!campaign.subject_line?.trim()) {
      errors.push('Subject line is required');
    }

    if (!campaign.content_json || campaign.content_json.length === 0) {
      errors.push('Campaign must have content blocks');
    }

    const hasUnsubscribe = campaign.content_json?.some(block =>
      (block.type === 'text' && typeof block.content === 'string' && 
       block.content.includes('{UnsubscribeLink}')) ||
      (block.type === 'button' && block.content?.url && 
       block.content.url.includes('unsubscribe'))
    );

    if (!hasUnsubscribe) {
      errors.push('Campaign must include an unsubscribe link for CASL compliance');
    }

    const recipientCount = getRecipientCount();
    if (recipientCount === 0) {
      errors.push('No recipients selected');
    }

    // Steps 134-140: Enhanced validation checks
    if (quotaInfo && !quotaInfo.canSend) {
      errors.push('SES sending quota exceeded - cannot send emails');
    }

    if (domainAuthentication && !domainAuthentication.authenticated && !emailSendingService.testMode) {
      errors.push(`Domain authentication required for ${domainAuthentication.domain}`);
    }

    if (reputationInfo && reputationInfo.reputation === 'poor') {
      errors.push('Poor IP reputation detected - sending may be limited');
    }

    setValidationErrors(errors);
    return errors;
  };

  const handleSendTest = async () => {
    if (!testEmails.trim()) {
      alert('Please enter at least one email address for testing.');
      return;
    }

    const emails = testEmails.split(',').map(email => email.trim()).filter(email => email);
    const invalidEmails = emails.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    
    if (invalidEmails.length > 0) {
      alert(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    setSendingTest(true);
    try {
      const testContacts = emails.map(email => ({
        id: `test-${Date.now()}-${Math.random()}`,
        email: email,
        first_name: 'Test',
        last_name: 'Recipient'
      }));

      for (const testContact of testContacts) {
        const queueItem = {
          campaign_id: campaignId,
          contact_id: testContact.id,
          email_address: testContact.email,
          campaign: campaign,
          contact: testContact
        };

        await emailSendingService.sendSingleEmail(queueItem);
      }

      alert(`Test emails sent successfully to ${emails.length} recipient(s)!`);
      setTestEmails('');
    } catch (error) {
      console.error('Error sending test emails:', error);
      alert('Failed to send test emails. Please try again.');
    } finally {
      setSendingTest(false);
    }
  };

  // Step 60-70: Updated handleStartSending with enhanced validation
  const handleStartSending = async () => {
    const errors = validateCampaignForSending();
    if (errors.length > 0) {
      return;
    }

    const recipientCount = getRecipientCount();
    let confirmMessage = `Send "${campaign.name}" to ${recipientCount} contact(s)?\n\nEstimated cost: $${estimatedCost.toFixed(4)}`;
    
    // Add warnings if any
    if (complianceValidation && complianceValidation.warnings.length > 0) {
      confirmMessage += `\n\nWarnings:\n${complianceValidation.warnings.slice(0, 3).join('\n')}`;
    }
    
    confirmMessage += '\n\nThis action cannot be undone.';
    
    if (!window.confirm(confirmMessage)) return;

    setSending(true);
    setIsMonitoring(true);
    
    try {
      // Step 60-70: Update campaign with final target count and estimated cost
      await supabase
        .from('mail_campaigns')
        .update({
          total_recipients: recipientCount,
          estimated_cost: estimatedCost
        })
        .eq('id', campaignId);

      let contactIdsToSend = null;
      if (selectedContacts === 'custom') {
        contactIdsToSend = customContactIds;
      }

      const result = await emailSendingService.queueCampaignForSending(campaignId, contactIdsToSend);
      
      console.log('Campaign queued:', result);
      
      processQueue();
      
    } catch (error) {
      console.error('Error starting campaign send:', error);
      alert('Failed to start sending campaign. Please try again.');
      setSending(false);
      setIsMonitoring(false);
    }
  };

  const processQueue = async () => {
    try {
      while (isMonitoring && !sendingPaused) {
        const result = await emailSendingService.processSendingQueue(10);
        
        if (result.processed === 0) {
          break;
        }

        await updateSendingProgress();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  };

  const handleStopSending = async () => {
    if (!window.confirm('Are you sure you want to stop sending this campaign? Unsent emails will remain in the queue.')) {
      return;
    }

    try {
      await supabase
        .from('mail_sending_queue')
        .update({ status: 'cancelled' })
        .eq('campaign_id', campaignId)
        .eq('status', 'queued');

      setIsMonitoring(false);
      setSending(false);
      setSendingPaused(false);

      await supabase
        .from('mail_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      alert('Campaign sending stopped. You can resume later if needed.');
    } catch (error) {
      console.error('Error stopping campaign:', error);
      alert('Failed to stop campaign sending.');
    }
  };

  const handlePauseSending = () => {
    setSendingPaused(!sendingPaused);
  };

  const getRecipientCount = () => {
    if (selectedContacts === 'all') {
      return contacts.length;
    } else if (selectedContacts === 'custom') {
      return customContactIds.length;
    }
    return 0;
  };

  const handleContactToggle = (contactId) => {
    if (customContactIds.includes(contactId)) {
      setCustomContactIds(customContactIds.filter(id => id !== contactId));
    } else {
      setCustomContactIds([...customContactIds, contactId]);
    }
  };

  const handleSelectAll = () => {
    setCustomContactIds(contacts.map(c => c.id));
  };

  const handleDeselectAll = () => {
    setCustomContactIds([]);
  };

  // Steps 134-140: Refresh system checks
  const refreshSystemChecks = async () => {
    setSystemStatus('checking');
    await performSystemChecks();
  };

  // Steps 134-140: Get system status color
  const getSystemStatusColor = () => {
    if (systemStatus === 'checking' || systemStatus === 'testing') return '#ff9800';
    if (systemStatus === 'error') return '#f44336';
    
    // Check overall health
    let issues = 0;
    if (quotaInfo && !quotaInfo.canSend) issues++;
    if (reputationInfo && reputationInfo.reputation === 'poor') issues++;
    if (domainAuthentication && !domainAuthentication.authenticated && !emailSendingService.testMode) issues++;
    if (validationErrors.length > 0) issues++;
    
    if (issues === 0) return '#4caf50'; // Green
    if (issues <= 2) return '#ff9800'; // Orange  
    return '#f44336'; // Red
  };

  // Steps 134-140: Get reputation badge color
  const getReputationColor = (reputation) => {
    switch (reputation) {
      case 'good': 
      case 'high': return '#4caf50';
      case 'moderate': 
      case 'medium': return '#ff9800';
      case 'poor': 
      case 'low': return '#f44336';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Campaign not found</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Send Campaign: {campaign.name}</h1>
          <p style={styles.subtitle}>Configure and send your email campaign</p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.secondaryButton}
            onClick={() => navigate(`/dashboard/mail/builder/${campaignId}`)}
          >
            <FiEye style={styles.buttonIcon} />
            Preview
          </button>
          {campaign.status === 'sending' && (
            <>
              <button
                style={styles.secondaryButton}
                onClick={handlePauseSending}
              >
                {sendingPaused ? <FiPlay /> : <FiPause />}
                {sendingPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                style={styles.dangerButton}
                onClick={handleStopSending}
              >
                <FiStop style={styles.buttonIcon} />
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Steps 134-140: Enhanced System Status Panel */}
      <div style={styles.systemStatusPanel}>
        <div style={styles.systemStatusHeader}>
          <div style={styles.systemStatusTitle}>
            <FiActivity style={{...styles.systemStatusIcon, color: getSystemStatusColor()}} />
            <span>System Status</span>
            <span style={{...styles.statusBadge, backgroundColor: getSystemStatusColor()}}>
              {systemStatus === 'checking' ? 'Checking...' : 
               systemStatus === 'testing' ? 'Testing...' :
               systemStatus === 'error' ? 'Issues' : 'Ready'}
            </span>
          </div>
          <div style={styles.systemStatusActions}>
            <button 
              style={styles.refreshButton}
              onClick={refreshSystemChecks}
              disabled={systemStatus === 'checking' || systemTesting}
            >
              <FiRefreshCw style={styles.buttonIcon} />
              Refresh
            </button>
            {/* Step 140: System Test Button */}
            <button 
              style={styles.testButton}
              onClick={runSystemTests}
              disabled={systemTesting || sending}
            >
              <FiZap style={styles.buttonIcon} />
              {systemTesting ? 'Testing...' : 'Run System Tests'}
            </button>
            {/* Step 140: Performance Test Button */}
            <button 
              style={styles.performanceButton}
              onClick={runPerformanceTest}
              disabled={systemTesting || sending}
            >
              <FiBarChart2 style={styles.buttonIcon} />
              Performance Test
            </button>
            <button 
              style={styles.toggleButton}
              onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
            >
              {showAdvancedInfo ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>
        
        <div style={styles.systemStatusGrid}>
          {/* Quota Status */}
          <div style={styles.statusCard}>
            <div style={styles.statusCardHeader}>
              <FiBarChart2 style={styles.statusCardIcon} />
              <span>SES Quota</span>
            </div>
            <div style={styles.statusCardContent}>
              {quotaInfo ? (
                <>
                  <div style={styles.statusValue}>
                    {quotaInfo.sent24Hour || 0} / {quotaInfo.sendQuota || 'N/A'}
                  </div>
                  <div style={styles.statusLabel}>
                    {quotaInfo.quotaUsagePercent ? `${quotaInfo.quotaUsagePercent.toFixed(1)}% used` : 'Test mode'}
                  </div>
                </>
              ) : (
                <div style={styles.statusValue}>Checking...</div>
              )}
            </div>
          </div>

          {/* Reputation Status */}
          <div style={styles.statusCard}>
            <div style={styles.statusCardHeader}>
              <FiShield style={styles.statusCardIcon} />
              <span>IP Reputation</span>
            </div>
            <div style={styles.statusCardContent}>
              {reputationInfo ? (
                <>
                  <div style={{...styles.statusValue, color: getReputationColor(reputationInfo.reputation)}}>
                    {reputationInfo.reputation || 'Unknown'}
                  </div>
                  <div style={styles.statusLabel}>
                    Score: {reputationInfo.score || 'N/A'}
                  </div>
                </>
              ) : (
                <div style={styles.statusValue}>Checking...</div>
              )}
            </div>
          </div>

          {/* Domain Authentication */}
          <div style={styles.statusCard}>
            <div style={styles.statusCardHeader}>
              <FiGlobe style={styles.statusCardIcon} />
              <span>Domain Auth</span>
            </div>
            <div style={styles.statusCardContent}>
              {domainAuthentication ? (
                <>
                  <div style={{...styles.statusValue, color: domainAuthentication.authenticated ? '#4caf50' : '#f44336'}}>
                    {domainAuthentication.authenticated ? 'Verified' : 'Pending'}
                  </div>
                  <div style={styles.statusLabel}>
                    {domainAuthentication.domain}
                  </div>
                </>
              ) : (
                <div style={styles.statusValue}>Not configured</div>
              )}
            </div>
          </div>

          {/* Compliance Score */}
          <div style={styles.statusCard}>
            <div style={styles.statusCardHeader}>
              <FiTarget style={styles.statusCardIcon} />
              <span>Compliance</span>
            </div>
            <div style={styles.statusCardContent}>
              {complianceValidation ? (
                <>
                  <div style={{...styles.statusValue, color: complianceValidation.complianceScore >= 80 ? '#4caf50' : complianceValidation.complianceScore >= 60 ? '#ff9800' : '#f44336'}}>
                    {complianceValidation.complianceScore}%
                  </div>
                  <div style={styles.statusLabel}>
                    {complianceValidation.issues.length} issues
                  </div>
                </>
              ) : (
                <div style={styles.statusValue}>Checking...</div>
              )}
            </div>
          </div>
        </div>

        {/* Step 140: Test Results Panel */}
        {showTestResults && testResults && (
          <div style={styles.testResultsPanel}>
            <div style={styles.testResultsHeader}>
              <h4 style={styles.testResultsTitle}>
                System Test Results 
                <span style={{...styles.testResultBadge, backgroundColor: testResults.overallPassed ? '#4caf50' : '#f44336'}}>
                  {testResults.summary.overallStatus}
                </span>
              </h4>
              <button 
                style={styles.closeTestResults}
                onClick={() => setShowTestResults(false)}
              >
                <FiX />
              </button>
            </div>
            <div style={styles.testResultsContent}>
              <div style={styles.testResultsStats}>
                <div style={styles.testStat}>
                  <span style={styles.testStatNumber}>{testResults.stats.passed}</span>
                  <span style={styles.testStatLabel}>Passed</span>
                </div>
                <div style={styles.testStat}>
                  <span style={{...styles.testStatNumber, color: '#f44336'}}>{testResults.stats.failed}</span>
                  <span style={styles.testStatLabel}>Failed</span>
                </div>
                <div style={styles.testStat}>
                  <span style={{...styles.testStatNumber, color: '#ff9800'}}>{testResults.stats.warnings}</span>
                  <span style={styles.testStatLabel}>Warnings</span>
                </div>
                <div style={styles.testStat}>
                  <span style={styles.testStatNumber}>{testResults.summary.successRate}%</span>
                  <span style={styles.testStatLabel}>Success Rate</span>
                </div>
              </div>
              {testResults.stats.errors.length > 0 && (
                <div style={styles.testErrors}>
                  <h5 style={styles.testErrorsTitle}>Errors:</h5>
                  <ul style={styles.testErrorsList}>
                    {testResults.stats.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Information Panel */}
        {showAdvancedInfo && (
          <div style={styles.advancedInfoPanel}>
            {/* Quota Details */}
            {quotaInfo && quotaInfo.mode === 'live' && (
              <div style={styles.advancedSection}>
                <h4 style={styles.advancedTitle}>SES Quota Details</h4>
                <div style={styles.advancedGrid}>
                  <div>Remaining: {quotaInfo.remainingQuota || 0}</div>
                  <div>Send Rate: {quotaInfo.sendRate || 0}/sec</div>
                  <div>Mode: {quotaInfo.mode}</div>
                </div>
              </div>
            )}

            {/* Reputation Details */}
            {reputationInfo && reputationInfo.issues && reputationInfo.issues.length > 0 && (
              <div style={styles.advancedSection}>
                <h4 style={styles.advancedTitle}>Reputation Issues</h4>
                <ul style={styles.issuesList}>
                  {reputationInfo.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compliance Warnings */}
            {complianceValidation && complianceValidation.warnings && complianceValidation.warnings.length > 0 && (
              <div style={styles.advancedSection}>
                <h4 style={styles.advancedTitle}>Content Optimization Warnings</h4>
                <ul style={styles.issuesList}>
                  {complianceValidation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {complianceValidation && complianceValidation.recommendations && complianceValidation.recommendations.length > 0 && (
              <div style={styles.advancedSection}>
                <h4 style={styles.advancedTitle}>Recommendations</h4>
                <ul style={styles.recommendationsList}>
                  {complianceValidation.recommendations.slice(0, 5).map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 60-70: Billing Information */}
      {billingInfo && (
        <div style={styles.billingSection}>
          <div style={styles.billingHeader}>
            <FiDollarSign style={styles.billingIcon} />
            <span style={styles.billingTitle}>Billing Information</span>
          </div>
          <div style={styles.billingDetails}>
            <div style={styles.billingItem}>
              <span>Current period usage: {billingInfo.emails_used} / {billingInfo.included_emails}</span>
            </div>
            <div style={styles.billingItem}>
              <span>Target recipients: {getRecipientCount()}</span>
            </div>
            <div style={styles.billingItem}>
              <span>Estimated cost: ${estimatedCost.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div style={styles.validationErrors}>
          <div style={styles.errorsHeader}>
            <FiAlertTriangle style={styles.errorIcon} />
            <span>Please fix these issues before sending:</span>
          </div>
          <ul style={styles.errorsList}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sending Progress */}
      {(sending || campaign.status === 'sending') && sendingProgress && (
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <h3 style={styles.progressTitle}>
              <FiSend style={styles.progressIcon} />
              Sending Progress
            </h3>
            <div style={styles.progressStats}>
              <span style={styles.progressText}>
                {sendingProgress.completed} of {sendingProgress.total} ({sendingProgress.percentage}%)
              </span>
            </div>
          </div>
          
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${sendingProgress.percentage}%`
              }}
            />
          </div>

          <div style={styles.sendingStatsGrid}>
            <div style={styles.statCard}>
              <FiClock style={styles.statIcon} />
              <div style={styles.statNumber}>{sendingStats.queued}</div>
              <div style={styles.statLabel}>Queued</div>
            </div>
            <div style={styles.statCard}>
              <FiCheckCircle style={styles.statIcon} />
              <div style={styles.statNumber}>{sendingStats.sent}</div>
              <div style={styles.statLabel}>Sent</div>
            </div>
            <div style={styles.statCard}>
              <FiAlertTriangle style={styles.statIcon} />
              <div style={styles.statNumber}>{sendingStats.failed}</div>
              <div style={styles.statLabel}>Failed</div>
            </div>
            <div style={styles.statCard}>
              <FiRefreshCw style={styles.statIcon} />
              <div style={styles.statNumber}>{sendingStats.bounced}</div>
              <div style={styles.statLabel}>Bounced</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Email Section */}
      <div style={styles.testSection}>
        <h3 style={styles.sectionTitle}>
          <FiMail style={styles.sectionIcon} />
          Send Test Email
        </h3>
        <div style={styles.testControls}>
          <input
            type="text"
            style={styles.testInput}
            value={testEmails}
            onChange={(e) => setTestEmails(e.target.value)}
            placeholder="Enter test email addresses (comma-separated)"
            disabled={sending}
          />
          <button
            style={styles.testButton}
            onClick={handleSendTest}
            disabled={sendingTest || !testEmails.trim() || sending}
          >
            {sendingTest ? 'Sending...' : 'Send Test'}
          </button>
        </div>
        <div style={styles.testHint}>
          Send a test email to verify your campaign looks correct before sending to all contacts.
        </div>
      </div>

      {/* Recipient Selection */}
      <div style={styles.recipientSection}>
        <h3 style={styles.sectionTitle}>
          <FiUsers style={styles.sectionIcon} />
          Select Recipients
        </h3>

        <div style={styles.recipientOptions}>
          <label style={styles.recipientOption}>
            <input
              type="radio"
              name="recipients"
              value="all"
              checked={selectedContacts === 'all'}
              onChange={(e) => setSelectedContacts(e.target.value)}
              disabled={sending}
            />
            <div style={styles.optionContent}>
              <div style={styles.optionTitle}>All Subscribed Contacts</div>
              <div style={styles.optionDescription}>
                Send to all {contacts.length} subscribed contacts
              </div>
            </div>
          </label>

          <label style={styles.recipientOption}>
            <input
              type="radio"
              name="recipients"
              value="custom"
              checked={selectedContacts === 'custom'}
              onChange={(e) => setSelectedContacts(e.target.value)}
              disabled={sending}
            />
            <div style={styles.optionContent}>
              <div style={styles.optionTitle}>Custom Selection</div>
              <div style={styles.optionDescription}>
                Choose specific contacts ({customContactIds.length} selected)
              </div>
            </div>
          </label>
        </div>

        {/* Custom Contact Selection */}
        {selectedContacts === 'custom' && (
          <div style={styles.customSelection}>
            <div style={styles.bulkActions}>
              <button
                style={styles.bulkButton}
                onClick={handleSelectAll}
                disabled={sending}
              >
                Select All
              </button>
              <button
                style={styles.bulkButton}
                onClick={handleDeselectAll}
                disabled={sending}
              >
                Deselect All
              </button>
            </div>

            <div style={styles.contactsList}>
              {contacts.length === 0 ? (
                <div style={styles.noContacts}>
                  No subscribed contacts found.
                </div>
              ) : (
                contacts.map(contact => (
                  <label key={contact.id} style={styles.contactItem}>
                    <input
                      type="checkbox"
                      checked={customContactIds.includes(contact.id)}
                      onChange={() => handleContactToggle(contact.id)}
                      disabled={sending}
                    />
                    <div style={styles.contactInfo}>
                      <div style={styles.contactName}>
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div style={styles.contactEmail}>
                        {contact.email}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Send Summary */}
      <div style={styles.sendSummary}>
        <div style={styles.summaryStats}>
          <div style={styles.statItem}>
            <FiUsers style={styles.statIcon} />
            <span style={styles.statLabel}>Recipients:</span>
            <span style={styles.statValue}>{getRecipientCount()}</span>
          </div>
          <div style={styles.statItem}>
            <FiDollarSign style={styles.statIcon} />
            <span style={styles.statLabel}>Estimated Cost:</span>
            <span style={styles.statValue}>
              ${estimatedCost.toFixed(4)}
            </span>
          </div>
        </div>

        {getRecipientCount() > 0 && !sending && campaign.status !== 'sending' && (
          <div style={styles.sendWarning}>
            <FiAlertTriangle style={styles.warningIcon} />
            <span>This action cannot be undone. The campaign will be sent immediately.</span>
          </div>
        )}
      </div>

      {/* Send Button */}
      {campaign.status !== 'sending' && (
        <div style={styles.sendActions}>
          <button
            style={styles.sendButton}
            onClick={handleStartSending}
            disabled={getRecipientCount() === 0 || sending || validationErrors.length > 0}
          >
            <FiSend style={styles.buttonIcon} />
            Send to {getRecipientCount()} Contact{getRecipientCount() !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    minHeight: '100vh',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#f44336',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dangerButton: {
    backgroundColor: '#f44336',
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
    fontSize: '14px',
  },
  
  // Steps 134-140: Enhanced system status styles
  systemStatusPanel: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  systemStatusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  systemStatusTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  systemStatusIcon: {
    fontSize: '20px',
  },
  statusBadge: {
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  systemStatusActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  refreshButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  testButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  performanceButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  toggleButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  systemStatusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
  },
  statusCard: {
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  statusCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
  },
  statusCardIcon: {
    fontSize: '16px',
    color: 'teal',
  },
  statusCardContent: {
    textAlign: 'center',
  },
  statusValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
  },
  statusLabel: {
    fontSize: '12px',
    color: '#666',
  },
  
  // Step 140: Test Results Panel styles
  testResultsPanel: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    border: '2px solid #2196f3',
  },
  testResultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  testResultsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: 0,
  },
  testResultBadge: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  closeTestResults: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#666',
    padding: '4px',
  },
  testResultsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  testResultsStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
  },
  testStat: {
    textAlign: 'center',
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
  },
  testStatNumber: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: '4px',
  },
  testStatLabel: {
    fontSize: '12px',
    color: '#666',
  },
  testErrors: {
    backgroundColor: '#ffebee',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #f44336',
  },
  testErrorsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#c62828',
    margin: '0 0 8px 0',
  },
  testErrorsList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '12px',
    color: '#c62828',
  },
  
  advancedInfoPanel: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
  },
  advancedSection: {
    marginBottom: '15px',
  },
  advancedTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  advancedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    fontSize: '12px',
    color: '#666',
  },
  issuesList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '12px',
    color: '#f44336',
  },
  recommendationsList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '12px',
    color: '#666',
  },
  
  // Existing billing section styles
  billingSection: {
    backgroundColor: '#e8f4f8',
    border: '1px solid #b3d9e6',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
  },
  billingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  billingIcon: {
    color: 'teal',
    fontSize: '16px',
  },
  billingTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  billingDetails: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  billingItem: {
    fontSize: '14px',
    color: '#555',
  },
  validationErrors: {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
  },
  errorsHeader: {
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
    margin: '0',
    paddingLeft: '20px',
    color: '#c62828',
  },
  progressSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    marginBottom: '20px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  progressTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
  },
  progressIcon: {
    color: 'teal',
  },
  progressStats: {
    fontSize: '14px',
    color: '#666',
  },
  progressText: {
    fontWeight: 'bold',
  },
  progressBar: {
    width: '100%',
    height: '20px',
    backgroundColor: '#f0f0f0',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'teal',
    borderRadius: '10px',
    transition: 'width 0.3s ease',
  },
  sendingStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
  },
  statCard: {
    textAlign: 'center',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
  },
  statIcon: {
    fontSize: '20px',
    color: 'teal',
    marginBottom: '8px',
  },
  statNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  testSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionIcon: {
    color: 'teal',
  },
  testControls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
  },
  testInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
  },
  testHint: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic',
  },
  recipientSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    marginBottom: '20px',
  },
  recipientOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px',
  },
  recipientOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '2px',
  },
  optionDescription: {
    fontSize: '12px',
    color: '#666',
  },
  customSelection: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
  },
  bulkActions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  bulkButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  contactsList: {
    maxHeight: '250px',
    overflow: 'auto',
    border: '1px solid #f0f0f0',
    borderRadius: '6px',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '2px',
  },
  contactEmail: {
    fontSize: '12px',
    color: '#666',
  },
  noContacts: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontStyle: 'italic',
  },
  sendSummary: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    marginBottom: '20px',
  },
  summaryStats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '10px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  sendWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#e17055',
    fontWeight: 'bold',
  },
  warningIcon: {
    fontSize: '14px',
  },
  sendActions: {
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '15px 30px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
  },
};

export default CampaignSender;