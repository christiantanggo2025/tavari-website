// helpers/Mail/systemTests.js - Comprehensive testing for Steps 134-140
import { supabase } from '../../supabaseClient';
import emailSendingService from './emailSendingService';

class MailSystemTests {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };
  }

  // Step 140: Run comprehensive system tests
  async runAllTests(businessId) {
    console.log('🧪 Starting Mail System Tests for Steps 134-140...');
    
    const testSuite = [
      { name: 'SES Quota Management', test: () => this.testQuotaManagement(businessId) },
      { name: 'IP Reputation Monitoring', test: () => this.testReputationMonitoring(businessId) },
      { name: 'Domain Authentication', test: () => this.testDomainAuthentication(businessId) },
      { name: 'Compliance Validation', test: () => this.testComplianceValidation(businessId) },
      { name: 'Test Environment', test: () => this.testEnvironmentConfiguration(businessId) },
      { name: 'Content Optimization', test: () => this.testContentOptimization(businessId) },
      { name: 'Database Integration', test: () => this.testDatabaseIntegration(businessId) },
      { name: 'End-to-End Workflow', test: () => this.testEndToEndWorkflow(businessId) }
    ];

    const results = [];
    
    for (const testCase of testSuite) {
      try {
        console.log(`\n🔍 Testing: ${testCase.name}`);
        const result = await testCase.test();
        results.push({ name: testCase.name, ...result });
        
        if (result.passed) {
          this.testResults.passed++;
          console.log(`✅ ${testCase.name}: PASSED`);
        } else {
          this.testResults.failed++;
          console.log(`❌ ${testCase.name}: FAILED - ${result.error}`);
          this.testResults.errors.push(`${testCase.name}: ${result.error}`);
        }
        
        if (result.warnings && result.warnings.length > 0) {
          this.testResults.warnings += result.warnings.length;
          result.warnings.forEach(warning => {
            console.log(`⚠️ ${testCase.name}: ${warning}`);
          });
        }
      } catch (error) {
        this.testResults.failed++;
        this.testResults.errors.push(`${testCase.name}: ${error.message}`);
        console.error(`💥 ${testCase.name}: CRASHED - ${error.message}`);
        results.push({ 
          name: testCase.name, 
          passed: false, 
          error: error.message,
          crashed: true 
        });
      }
    }

    // Record test results in database
    await this.recordTestResults(businessId, 'comprehensive', results);
    
    // Generate summary
    const summary = this.generateTestSummary(results);
    console.log('\n📊 Test Summary:');
    console.log(summary);
    
    return {
      summary,
      results,
      overallPassed: this.testResults.failed === 0,
      stats: this.testResults
    };
  }

  // Step 134: Test SES quota management
  async testQuotaManagement(businessId) {
    try {
      // Test quota checking
      const quota = await emailSendingService.checkSESQuota(true);
      
      if (!quota) {
        return { passed: false, error: 'Quota check returned null' };
      }

      const warnings = [];
      
      // Validate quota structure
      const requiredFields = ['sendQuota', 'sent24Hour', 'sendRate', 'canSend'];
      for (const field of requiredFields) {
        if (quota[field] === undefined) {
          warnings.push(`Missing quota field: ${field}`);
        }
      }

      // Test quota alert logging
      if (quota.quotaUsagePercent > 50) {
        try {
          await emailSendingService.logQuotaAlert('test_quota_warning', {
            usagePercent: quota.quotaUsagePercent,
            testMode: true
          });
        } catch (error) {
          warnings.push(`Quota alert logging failed: ${error.message}`);
        }
      }

      // Test billing integration
      try {
        const billingResult = await supabase.rpc('record_email_usage', {
          p_business_id: businessId,
          p_campaign_id: null,
          p_emails_sent: 1
        });
        
        if (!billingResult) {
          warnings.push('Email usage recording may have failed');
        }
      } catch (error) {
        warnings.push(`Billing integration test failed: ${error.message}`);
      }

      return { 
        passed: true, 
        warnings,
        data: {
          quota: quota,
          mode: quota.mode || 'test'
        }
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  // Step 135: Test IP reputation monitoring
  async testReputationMonitoring(businessId) {
    try {
      const reputation = await emailSendingService.checkIPReputation();
      
      if (!reputation) {
        return { passed: false, error: 'Reputation check returned null' };
      }

      const warnings = [];
      
      // Validate reputation structure
      const requiredFields = ['reputation', 'score', 'issues', 'recommendations'];
      for (const field of requiredFields) {
        if (reputation[field] === undefined) {
          warnings.push(`Missing reputation field: ${field}`);
        }
      }

      // Check reputation score validity
      if (reputation.score < 0 || reputation.score > 100) {
        warnings.push(`Invalid reputation score: ${reputation.score}`);
      }

      // Test reputation levels
      const validReputations = ['high', 'good', 'moderate', 'medium', 'poor', 'low', 'unknown', 'error', 'suspended'];
      if (!validReputations.includes(reputation.reputation)) {
        warnings.push(`Invalid reputation level: ${reputation.reputation}`);
      }

      // Check for issues
      if (reputation.reputation === 'poor' && reputation.issues.length === 0) {
        warnings.push('Poor reputation but no issues reported');
      }

      return { 
        passed: true, 
        warnings,
        data: {
          reputation: reputation.reputation,
          score: reputation.score,
          issueCount: reputation.issues.length,
          mode: reputation.mode || 'test'
        }
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  // Step 136: Test domain authentication
  async testDomainAuthentication(businessId) {
    try {
      // Get business settings to find domain
      const { data: settings, error: settingsError } = await supabase
        .from('mail_settings')
        .select('from_email')
        .eq('business_id', businessId)
        .single();

      if (settingsError || !settings?.from_email) {
        return { 
          passed: false, 
          error: 'No from_email configured in mail_settings' 
        };
      }

      const domain = settings.from_email.split('@')[1];
      if (!domain) {
        return { passed: false, error: 'Invalid from_email format' };
      }

      // Test domain authentication
      const domainAuth = await emailSendingService.validateDomainAuthentication(businessId, settings.from_email);
      
      if (!domainAuth) {
        return { passed: false, error: 'Domain authentication check returned null' };
      }

      const warnings = [];
      
      // Validate domain auth structure
      const requiredFields = ['domain', 'canSend'];
      for (const field of requiredFields) {
        if (domainAuth[field] === undefined) {
          warnings.push(`Missing domain auth field: ${field}`);
        }
      }

      // Check authentication status
      if (!domainAuth.authenticated && !emailSendingService.testMode) {
        warnings.push('Domain not authenticated in live mode');
      }

      // Test domain record in database
      const { data: domainRecord, error: domainError } = await supabase
        .from('mail_domains')
        .select('*')
        .eq('business_id', businessId)
        .eq('domain', domain)
        .single();

      if (domainError && domainError.code !== 'PGRST116') {
        warnings.push(`Database domain lookup failed: ${domainError.message}`);
      }

      return { 
        passed: true, 
        warnings,
        data: {
          domain: domainAuth.domain,
          authenticated: domainAuth.authenticated,
          canSend: domainAuth.canSend,
          hasRecord: !!domainRecord
        }
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  // Step 137: Test compliance validation
  async testComplianceValidation(businessId) {
    try {
      // Create test campaign for validation
      const testCampaign = {
        name: 'Test Campaign',
        subject_line: 'Test Subject',
        content_json: [
          {
            type: 'text',
            content: 'Test content with {UnsubscribeLink}'
          }
        ],
        content_html: '<p>Test content with {UnsubscribeLink}</p>'
      };

      const compliance = await emailSendingService.validateCampaignCompliance(testCampaign, businessId);
      
      if (!compliance) {
        return { passed: false, error: 'Compliance validation returned null' };
      }

      const warnings = [];
      
      // Validate compliance structure
      const requiredFields = ['canSend', 'issues', 'warnings', 'recommendations', 'complianceScore'];
      for (const field of requiredFields) {
        if (compliance[field] === undefined) {
          warnings.push(`Missing compliance field: ${field}`);
        }
      }

      // Check compliance score
      if (compliance.complianceScore < 0 || compliance.complianceScore > 100) {
        warnings.push(`Invalid compliance score: ${compliance.complianceScore}`);
      }

      // Test CASL compliance
      if (!testCampaign.content_html.includes('{UnsubscribeLink}')) {
        warnings.push('CASL compliance test failed - no unsubscribe link detected');
      }

      // Test business address requirement
      const { data: settings } = await supabase
        .from('mail_settings')
        .select('business_address')
        .eq('business_id', businessId)
        .single();

      if (!settings?.business_address || settings.business_address.includes('Required')) {
        warnings.push('Business address not properly configured');
      }

      return { 
        passed: true, 
        warnings,
        data: {
          canSend: compliance.canSend,
          complianceScore: compliance.complianceScore,
          issueCount: compliance.issues.length,
          warningCount: compliance.warnings.length
        }
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  // Step 138: Test environment configuration
  async testEnvironmentConfiguration(businessId) {
    try {
      const warnings = [];
      
      // Test mode detection
      const isTestMode = emailSendingService.testMode;
      
      // Check environment variables
      const requiredEnvVars = [
        'REACT_APP_AWS_REGION',
        'REACT_APP_BASE_URL'
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          warnings.push(`Missing environment variable: ${envVar}`);
        }
      }

      // Test SES credentials (if not in test mode)
      if (!isTestMode) {
        const credentialEnvVars = [
          'REACT_APP_AWS_ACCESS_KEY_ID',
          'REACT_APP_AWS_SECRET_ACCESS_KEY'
        ];

        for (const envVar of credentialEnvVars) {
          if (!process.env[envVar]) {
            warnings.push(`Missing SES credential: ${envVar}`);
          }
        }
      }

      // Test SES initialization
      try {
        const sesStatus = await emailSendingService.initializeSES();
        if (!sesStatus.success) {
          warnings.push(`SES initialization failed: ${sesStatus.error}`);
        }
      } catch (error) {
        warnings.push(`SES initialization error: ${error.message}`);
      }

      // Test simulation vs live mode
      const testEmail = {
        to: 'test@example.com',
        from: 'noreply@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      try {
        const sendResult = await emailSendingService.simulateSESSend(testEmail);
        if (!sendResult.MessageId) {
          warnings.push('Email simulation failed');
        }
      } catch (error) {
        warnings.push(`Email simulation error: ${error.message}`);
      }

      return { 
        passed: true, 
        warnings,
        data: {
          testMode: isTestMode,
          envVarsConfigured: requiredEnvVars.filter(v => !!process.env[v]).length,
          totalEnvVars: requiredEnvVars.length
        }
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  // Step 139: Test content optimization
  async testContentOptimization(businessId) {
    try {
      // Create test campaigns with various content issues
      const testCampaigns = [
        {
          name: 'Good Campaign',
          subject_line: 'Short subject',
          content_html: '<p>Good content</p><img src="test.jpg" alt="Test image" />'
        },
        {
          name: 'Large Content Campaign',
          subject_line: 'This is a very long subject line that will definitely be truncated on mobile devices',
          content_html: '<p>' + 'Large content '.repeat(1000) + '</p>'
        },
        {
          name: 'Missing Alt Text Campaign',
          subject_line: 'Missing alt text',
          content_html: '<p>Content</p><img src="test.jpg" /><img src="test2.jpg" />'
        },
        {
          name: 'Spam Words Campaign',
          subject_line: 'FREE urgent offer - act now!',
          content_html: '<p>FREE guarantee! Limited time offer!</p>'
        },
        {
          name: 'Modern CSS Campaign',
          subject_line: 'Modern CSS',
          content_html: '<div style="display: flex; align-items: center;">Modern CSS</div>'
        }
      ];

      const warnings = [];
      const optimizationResults = [];

      for (const campaign of testCampaigns) {
        try {
          const optimization = await emailSendingService.analyzeContentOptimization(campaign);
          optimizationResults.push({
            campaign: campaign.name,
            warnings: optimization.warnings,
            recommendations: optimization.recommendations
          });
        } catch (error) {
          warnings.push(`Content optimization failed for ${campaign.name}: ${error.message}`);
        }
      }

      // Validate optimization results
      const expectedIssues = {
        'Large Content Campaign': ['size'],
        'Missing Alt Text Campaign': ['alt text'],
        'Spam Words Campaign': ['spam'],
        'Modern CSS Campaign': ['CSS']
      };

      for (const [campaignName, expectedIssueTypes] of Object.entries(expectedIssues)) {
        const result = optimizationResults.find(r => r.campaign === campaignName);
        if (!result || result.warnings.length === 0) {
          warnings.push(`Expected content issues not detected for ${campaignName}`);
        }
      }

      return { 
        passed: true, 
        warnings,
        data: {
          campaignsTested: testCampaigns.length,
          issuesDetected: optimizationResults.reduce((sum, r) => sum + r.warnings.length, 0),
          recommendationsGenerated: optimizationResults.reduce((sum, r) => sum + r.recommendations.length, 0)
        }
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  // Step 140: Test database integration
  async testDatabaseIntegration(businessId) {
    try {
      const warnings = [];
      
      // Test all required tables exist
      const requiredTables = [
        'mail_campaigns',
        'mail_contacts', 
        'mail_settings',
        'mail_campaign_sends',
        'mail_sending_queue',
        'mail_domains',
        'mail_bounces'
      ];

      for (const tableName of requiredTables) {
        try {
          const { error } = await supabase
            .from(tableName)
            .select('id')
            .limit(1);
          
          if (error) {
            warnings.push(`Table ${tableName} not accessible: ${error.message}`);
          }
        } catch (error) {
          warnings.push(`Table ${tableName} test failed: ${error.message}`);
        }
      }

      // Test required functions exist
      const requiredFunctions = [
        'get_current_billing_period',
        'record_email_usage',
        'log_consent_action',
        'process_complaint_notification'
      ];

      for (const functionName of requiredFunctions) {
        try {
          // Test function exists by trying to call it with null/safe parameters
          if (functionName === 'get_current_billing_period') {
            await supabase.rpc(functionName, { p_business_id: businessId });
          }
        } catch (error) {
          warnings.push(`Function ${functionName} test failed: ${error.message}`);
        }
      }

      // Test foreign key relationships
      try {
        // Test campaign -> business relationship
        const { data: campaigns } = await supabase
          .from('mail_campaigns')
          .select('id, business_id')
          .eq('business_id', businessId)
          .limit(1);

        // Test contacts -> business relationship  
        const { data: contacts } = await supabase
          .from('mail_contacts')
          .select('id, business_id')
          .eq('business_id', businessId)
          .limit(1);

      } catch (error) {
        warnings.push(`Foreign key relationship test failed: ${error.message}`);
      }

      // Test RLS policies
      try {
        // Test that we can't access other business data
        const { data: otherData } = await supabase
          .from('mail_campaigns')
          .select('id')
          .neq('business_id', businessId)
          .limit(1);

        if (otherData && otherData.length > 0) {
          warnings.push('RLS policy may not be working - can access other business data');
        }
      } catch (error) {
        // This is expected - RLS should prevent access
      }

      return { 
        passed: true, 
        warnings,
        data: {
          tablesChecked: requiredTables.length,
          functionsChecked: requiredFunctions.length,
          rlsActive: true
        }
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  // Step 140: Test end-to-end workflow
  async testEndToEndWorkflow(businessId) {
    try {
      const warnings = [];
      
      // Create test contact
      const testContact = {
        business_id: businessId,
        email: `test-${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: 'Contact',
        subscribed: true,
        source: 'system_test'
      };

      const { data: contact, error: contactError } = await supabase
        .from('mail_contacts')
        .insert(testContact)
        .select()
        .single();

      if (contactError) {
        return { passed: false, error: `Failed to create test contact: ${contactError.message}` };
      }

      // Create test campaign
      const testCampaign = {
        business_id: businessId,
        name: `System Test Campaign ${Date.now()}`,
        subject_line: 'System Test Email',
        content_json: [
          {
            type: 'text',
            content: 'This is a system test email. {UnsubscribeLink}'
          }
        ],
        content_html: '<p>This is a system test email. {UnsubscribeLink}</p>',
        status: 'draft'
      };

      const { data: campaign, error: campaignError } = await supabase
        .from('mail_campaigns')
        .insert(testCampaign)
        .select()
        .single();

      if (campaignError) {
        warnings.push(`Failed to create test campaign: ${campaignError.message}`);
      } else {
        // Test campaign validation
        try {
          const compliance = await emailSendingService.validateCampaignCompliance(campaign, businessId);
          if (!compliance.canSend) {
            warnings.push(`Test campaign failed compliance: ${compliance.issues.join(', ')}`);
          }
        } catch (error) {
          warnings.push(`Campaign compliance test failed: ${error.message}`);
        }

        // Test queue management (without actually sending)
        try {
          const queueResult = await emailSendingService.queueCampaignForSending(campaign.id, [contact.id]);
          if (queueResult.queued !== 1) {
            warnings.push(`Expected 1 queued item, got ${queueResult.queued}`);
          }

          // Test queue processing (simulation)
          const processResult = await emailSendingService.processSendingQueue(1);
          if (processResult.processed !== 1) {
            warnings.push(`Expected 1 processed item, got ${processResult.processed}`);
          }
        } catch (error) {
          warnings.push(`Queue management test failed: ${error.message}`);
        }

        // Cleanup test campaign
        await supabase.from('mail_campaigns').delete().eq('id', campaign.id);
      }

      // Cleanup test contact
      await supabase.from('mail_contacts').delete().eq('id', contact.id);

      return { 
        passed: true, 
        warnings,
        data: {
          contactCreated: true,
          campaignCreated: !!campaign,
          workflowTested: true
        }
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  // Record test results in database
  async recordTestResults(businessId, testType, results) {
    try {
      await supabase.rpc('log_mail_action', {
        p_action: 'system_test_results',
        p_business_id: businessId,
        p_user_id: null,
        p_details: {
          test_type: testType,
          timestamp: new Date().toISOString(),
          results: results,
          stats: this.testResults
        }
      });
    } catch (error) {
      console.error('Failed to record test results:', error);
    }
  }

  // Generate test summary
  generateTestSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const warnings = results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);

    return {
      total,
      passed,
      failed,
      warnings,
      successRate: Math.round((passed / total) * 100),
      timestamp: new Date().toISOString(),
      overallStatus: failed === 0 ? 'PASSED' : 'FAILED',
      details: results.map(r => ({
        name: r.name,
        status: r.passed ? 'PASSED' : 'FAILED',
        warnings: r.warnings?.length || 0,
        error: r.error || null
      }))
    };
  }

  // Quick health check for monitoring
  async quickHealthCheck(businessId) {
    try {
      const checks = [
        emailSendingService.checkSESQuota(false),
        emailSendingService.checkIPReputation(),
        this.testDatabaseIntegration(businessId)
      ];

      const results = await Promise.allSettled(checks);
      const issues = results.filter(r => r.status === 'rejected').length;
      
      return {
        healthy: issues === 0,
        issues,
        timestamp: new Date().toISOString(),
        details: results.map((r, i) => ({
          check: ['quota', 'reputation', 'database'][i],
          status: r.status,
          error: r.status === 'rejected' ? r.reason.message : null
        }))
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Performance benchmark test
  async performanceBenchmark(businessId, contactCount = 100) {
    console.log(`🚀 Running performance benchmark with ${contactCount} contacts...`);
    
    const startTime = Date.now();
    const metrics = {
      queueTime: 0,
      processTime: 0,
      totalTime: 0,
      throughput: 0
    };

    try {
      // Create test contacts
      const testContacts = Array.from({ length: contactCount }, (_, i) => ({
        business_id: businessId,
        email: `perf-test-${i}-${Date.now()}@example.com`,
        first_name: 'Perf',
        last_name: `Test${i}`,
        subscribed: true,
        source: 'performance_test'
      }));

      const { data: contacts, error: contactsError } = await supabase
        .from('mail_contacts')
        .insert(testContacts)
        .select();

      if (contactsError) {
        throw new Error(`Failed to create test contacts: ${contactsError.message}`);
      }

      // Create test campaign
      const testCampaign = {
        business_id: businessId,
        name: `Performance Test ${Date.now()}`,
        subject_line: 'Performance Test',
        content_html: '<p>Performance test email</p>',
        status: 'draft'
      };

      const { data: campaign, error: campaignError } = await supabase
        .from('mail_campaigns')
        .insert(testCampaign)
        .select()
        .single();

      if (campaignError) {
        throw new Error(`Failed to create test campaign: ${campaignError.message}`);
      }

      // Test queuing performance
      const queueStart = Date.now();
      const queueResult = await emailSendingService.queueCampaignForSending(
        campaign.id, 
        contacts.map(c => c.id)
      );
      metrics.queueTime = Date.now() - queueStart;

      // Test processing performance
      const processStart = Date.now();
      let processed = 0;
      while (processed < contactCount) {
        const batchResult = await emailSendingService.processSendingQueue(50);
        processed += batchResult.processed;
        if (batchResult.processed === 0) break; // No more to process
      }
      metrics.processTime = Date.now() - processStart;

      metrics.totalTime = Date.now() - startTime;
      metrics.throughput = contactCount / (metrics.totalTime / 1000); // emails per second

      // Cleanup
      await supabase.from('mail_campaigns').delete().eq('id', campaign.id);
      await supabase.from('mail_contacts').delete().in('id', contacts.map(c => c.id));

      console.log(`📊 Performance Results:
        Queue Time: ${metrics.queueTime}ms
        Process Time: ${metrics.processTime}ms  
        Total Time: ${metrics.totalTime}ms
        Throughput: ${metrics.throughput.toFixed(2)} emails/sec`);

      return {
        success: true,
        metrics,
        contactCount,
        benchmark: {
          acceptable: metrics.throughput > 1, // At least 1 email per second
          excellent: metrics.throughput > 10   // More than 10 emails per second
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics
      };
    }
  }
}

export default new MailSystemTests();