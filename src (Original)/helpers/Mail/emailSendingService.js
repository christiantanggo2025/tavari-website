// helpers/Mail/emailSendingService.js - Fixed version without AWS SDK imports
import { supabase } from '../../supabaseClient';

class EmailSendingService {
  constructor() {
    this.sesConfig = {
      region: import.meta.env?.VITE_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: import.meta.env?.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env?.VITE_AWS_SECRET_ACCESS_KEY
      }
    };
    
    this.sendRateLimits = {
      default: 14, // emails per second (SES default)
      maxBurst: 100 // max burst capacity
    };
    
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second base delay
      maxDelay: 30000 // 30 seconds max delay
    };

    // Step 138: Test environment configuration
    this.testMode = import.meta.env?.VITE_MAIL_TEST_MODE === 'true' || !this.sesConfig.credentials.accessKeyId;

    this.sesClient = null;
    
    // Step 134: Quota tracking
    this.quotaCache = {
      lastChecked: null,
      sendQuota: null,
      sent24Hour: null,
      sendRate: null
    };
    
    // Auto-initialize on construction
    this.initializeSES().catch(console.error);
  }

  // Step 111: Real AWS SES initialization (simulation for now)
  async initializeSES() {
    try {
      console.log('Initializing AWS SES configuration...');
      
      // For now, we'll simulate SES initialization without actual AWS SDK
      if (this.sesConfig.credentials.accessKeyId && this.sesConfig.credentials.secretAccessKey && !this.testMode) {
        // TODO: Initialize actual AWS SES when SDK is added
        this.sesClient = {
          // Placeholder for future SES client
          send: async (command) => {
            return await this.simulateSESSend({
              to: 'test@example.com',
              from: 'noreply@example.com',
              subject: 'Test',
              html: '<p>Test</p>'
            });
          }
        };
        
        console.log('AWS SES simulated successfully');
        
        return {
          success: true,
          region: this.sesConfig.region,
          configured: true,
          mode: 'simulated',
          sendingQuota: { Max24HourSend: 1000, SentLast24Hours: 0, MaxSendRate: 14 }
        };
      } else {
        console.log('Running in test mode - emails will be simulated');
        return {
          success: true,
          region: this.sesConfig.region,
          configured: false,
          mode: 'test'
        };
      }
    } catch (error) {
      console.error('Error initializing SES:', error);
      // Fall back to test mode if SES fails
      this.sesClient = null;
      this.testMode = true;
      return {
        success: true,
        region: this.sesConfig.region,
        configured: false,
        mode: 'test',
        error: error.message
      };
    }
  }

  // Step 134: Enhanced quota management (simulated for now)
  async checkSESQuota(forceRefresh = false) {
    try {
      const now = new Date();
      
      // Cache quota checks for 5 minutes
      if (!forceRefresh && this.quotaCache.lastChecked && 
          (now - this.quotaCache.lastChecked) < 5 * 60 * 1000) {
        return this.quotaCache;
      }

      if (!this.sesClient || this.testMode) {
        // Return mock quota for test mode
        return {
          sendQuota: 1000,
          sent24Hour: 50,
          sendRate: 14,
          quotaUsagePercent: 5,
          remainingQuota: 950,
          canSend: true,
          mode: 'test'
        };
      }

      // TODO: Implement real SES quota checking when AWS SDK is added
      const quota = {
        sendQuota: 1000,
        sent24Hour: 50,
        sendRate: 14,
        quotaUsagePercent: 5,
        remainingQuota: 950,
        canSend: true,
        sendStatistics: [],
        lastChecked: now,
        mode: 'simulated'
      };

      this.quotaCache = quota;

      // Step 134: Alert when approaching quota limits
      if (quota.quotaUsagePercent > 80) {
        await this.logQuotaAlert('quota_warning', {
          usagePercent: quota.quotaUsagePercent,
          remaining: quota.remainingQuota,
          total: quota.sendQuota
        });
      }

      return quota;
    } catch (error) {
      console.error('Error checking SES quota:', error);
      return {
        error: error.message,
        canSend: false,
        mode: 'error'
      };
    }
  }

  // Step 135: IP reputation monitoring (simulated for now)
  async checkIPReputation() {
    try {
      if (!this.sesClient || this.testMode) {
        return {
          reputation: 'high',
          score: 95,
          issues: [],
          recommendations: [],
          mode: 'test'
        };
      }

      // TODO: Implement real reputation checking when AWS SDK is added
      let reputationData = {
        reputation: 'good',
        score: 90,
        issues: [],
        recommendations: [],
        bounceRate: 2.5,
        complaintRate: 0.05,
        totalSends: 1000,
        mode: 'simulated'
      };

      return reputationData;

    } catch (error) {
      console.error('Error checking IP reputation:', error);
      return {
        reputation: 'error',
        score: 0,
        issues: [error.message],
        recommendations: ['Check AWS SES configuration'],
        mode: 'error'
      };
    }
  }

  // Step 136: Domain authentication enforcement
  async validateDomainAuthentication(businessId, fromEmail) {
    try {
      const domain = fromEmail.split('@')[1];
      
      if (!domain) {
        throw new Error('Invalid from email address');
      }

      const { data: domainRecord, error } = await supabase
        .from('mail_domains')
        .select('*')
        .eq('business_id', businessId)
        .eq('domain', domain)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!domainRecord) {
        return {
          authenticated: false,
          domain: domain,
          error: 'Domain not configured for this business',
          canSend: this.testMode, // Allow in test mode
          recommendations: ['Add domain to Mail Settings', 'Complete DNS verification']
        };
      }

      if (!domainRecord.verified) {
        return {
          authenticated: false,
          domain: domain,
          error: 'Domain not verified',
          canSend: this.testMode, // Allow in test mode
          recommendations: ['Complete DNS record setup', 'Wait for verification']
        };
      }

      return {
        authenticated: true,
        domain: domain,
        canSend: true,
        verifiedAt: domainRecord.verified_at,
        dkimEnabled: domainRecord.dkim_tokens && domainRecord.dkim_tokens.length > 0
      };

    } catch (error) {
      console.error('Error validating domain authentication:', error);
      return {
        authenticated: false,
        error: error.message,
        canSend: this.testMode,
        recommendations: ['Check domain configuration']
      };
    }
  }

  // Step 137: Enhanced compliance checks
  async validateCampaignCompliance(campaign, businessId) {
    try {
      const issues = [];
      const warnings = [];
      const recommendations = [];

      // Basic campaign validation
      if (!campaign.name?.trim()) {
        issues.push('Campaign name is required');
      }

      if (!campaign.subject_line?.trim()) {
        issues.push('Subject line is required');
      }

      if (!campaign.content_json || campaign.content_json.length === 0) {
        issues.push('Campaign must have content blocks');
      }

      // CASL Compliance checks
      const hasUnsubscribe = campaign.content_json?.some(block =>
        (block.type === 'text' && typeof block.content === 'string' && 
         block.content.includes('{UnsubscribeLink}')) ||
        (block.type === 'button' && block.content?.url && 
         block.content.url.includes('unsubscribe'))
      );

      if (!hasUnsubscribe) {
        issues.push('CASL Compliance: Campaign must include an unsubscribe link');
      }

      // Check business address requirement
      const { data: settings, error: settingsError } = await supabase
        .from('mail_settings')
        .select('business_address, from_email')
        .eq('business_id', businessId)
        .single();

      if (settingsError || !settings) {
        issues.push('Business settings not configured');
      } else {
        if (!settings.business_address || settings.business_address.includes('Business Address Required')) {
          issues.push('CASL Compliance: Valid business address is required');
        }

        // Step 136: Check domain authentication
        if (settings.from_email) {
          const domainAuth = await this.validateDomainAuthentication(businessId, settings.from_email);
          if (!domainAuth.authenticated && !this.testMode) {
            issues.push(`Domain authentication required for ${domainAuth.domain}`);
            recommendations.push(...(domainAuth.recommendations || []));
          }
        }
      }

      // Content optimization checks (Step 139)
      const contentIssues = await this.analyzeContentOptimization(campaign);
      warnings.push(...contentIssues.warnings);
      recommendations.push(...contentIssues.recommendations);

      // Step 134: Check quota before sending
      const quota = await this.checkSESQuota();
      if (!quota.canSend) {
        issues.push('SES sending quota exceeded or approaching limit');
      }

      // Step 135: Check reputation
      const reputation = await this.checkIPReputation();
      if (reputation.reputation === 'poor') {
        warnings.push('Poor IP reputation detected - emails may have low deliverability');
        recommendations.push(...(reputation.recommendations || []));
      }

      return {
        canSend: issues.length === 0 && (!this.testMode || quota.canSend),
        issues,
        warnings,
        recommendations,
        quota: quota,
        reputation: reputation,
        complianceScore: this.calculateComplianceScore(issues, warnings)
      };

    } catch (error) {
      console.error('Error validating campaign compliance:', error);
      return {
        canSend: false,
        issues: ['Compliance validation failed: ' + error.message],
        warnings: [],
        recommendations: ['Check campaign configuration'],
        complianceScore: 0
      };
    }
  }

  // Step 139: Content optimization analysis
  async analyzeContentOptimization(campaign) {
    const warnings = [];
    const recommendations = [];

    try {
      if (!campaign.content_html) {
        warnings.push('No HTML content to analyze');
        return { warnings, recommendations };
      }

      const content = campaign.content_html;

      // Check email size
      const contentSize = new Blob([content]).size;
      if (contentSize > 102400) { // 100KB
        warnings.push(`Email size is ${Math.round(contentSize/1024)}KB - consider optimizing`);
        recommendations.push('Compress images and reduce content size');
      }

      // Check for missing alt text in images
      const imgTags = content.match(/<img[^>]*>/gi) || [];
      const missingAlt = imgTags.filter(img => !img.includes('alt='));
      if (missingAlt.length > 0) {
        warnings.push(`${missingAlt.length} images missing alt text`);
        recommendations.push('Add alt text to all images for accessibility');
      }

      // Check for inline styles vs table-based layouts
      if (content.includes('display: flex') || content.includes('display: grid')) {
        warnings.push('Modern CSS may not render correctly in all email clients');
        recommendations.push('Use table-based layouts for better email client support');
      }

      // Check subject line length
      if (campaign.subject_line && campaign.subject_line.length > 50) {
        warnings.push('Subject line may be truncated on mobile devices');
        recommendations.push('Keep subject lines under 50 characters');
      }

      // Check for spam trigger words
      const spamWords = ['free', 'guarantee', 'urgent', 'act now', 'limited time'];
      const foundSpamWords = spamWords.filter(word => 
        campaign.subject_line?.toLowerCase().includes(word) ||
        content.toLowerCase().includes(word)
      );
      
      if (foundSpamWords.length > 0) {
        warnings.push(`Potential spam triggers found: ${foundSpamWords.join(', ')}`);
        recommendations.push('Consider alternative wording to improve deliverability');
      }

    } catch (error) {
      console.error('Error analyzing content optimization:', error);
      warnings.push('Content analysis failed');
    }

    return { warnings, recommendations };
  }

  // Step 137: Calculate compliance score
  calculateComplianceScore(issues, warnings) {
    let score = 100;
    score -= issues.length * 20; // Each issue reduces score by 20
    score -= warnings.length * 5; // Each warning reduces score by 5
    return Math.max(0, score);
  }

  // Step 134: Log quota alerts
  async logQuotaAlert(alertType, data) {
    try {
      await supabase.rpc('log_mail_action', {
        p_action: alertType,
        p_business_id: null, // System-level alert
        p_user_id: null,
        p_details: {
          ...data,
          timestamp: new Date().toISOString(),
          region: this.sesConfig.region
        }
      });
    } catch (error) {
      console.error('Error logging quota alert:', error);
    }
  }

  // Step 115: Enhanced domain verification workflow (simulated for now)
  async addDomainForVerification(businessId, domain) {
    try {
      const { data: existingDomain } = await supabase
        .from('mail_domains')
        .select('*')
        .eq('business_id', businessId)
        .eq('domain', domain)
        .single();

      if (existingDomain) {
        throw new Error('Domain already exists for this business');
      }

      const verificationToken = this.generateVerificationToken();
      const dnsRecords = this.generateDNSRecords(domain, verificationToken);

      // TODO: Add domain to SES when AWS SDK is available
      let sesIdentityArn = null;
      if (this.sesClient && !this.testMode) {
        try {
          // Simulated SES domain addition
          sesIdentityArn = `simulated-arn-${Date.now()}`;
          console.log('Domain simulated in SES:', domain, sesIdentityArn);
        } catch (error) {
          console.error('Error adding domain to SES:', error);
          // Continue with local storage even if SES fails
        }
      }

      const { data, error } = await supabase
        .from('mail_domains')
        .insert({
          business_id: businessId,
          domain: domain,
          verification_token: verificationToken,
          spf_record: dnsRecords.spf,
          dmarc_record: dnsRecords.dmarc,
          dkim_tokens: dnsRecords.dkim,
          ses_verification_status: 'pending',
          ses_identity_arn: sesIdentityArn,
          last_checked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        domain: data,
        dnsRecords: dnsRecords,
        instructions: this.getDNSInstructions(domain, dnsRecords)
      };
    } catch (error) {
      console.error('Error adding domain:', error);
      throw error;
    }
  }

  // Step 115: Enhanced domain verification checking (simulated for now)
  async checkDomainVerification(businessId, domainId) {
    try {
      const { data: domain, error } = await supabase
        .from('mail_domains')
        .select('*')
        .eq('id', domainId)
        .eq('business_id', businessId)
        .single();

      if (error) throw error;

      let verificationResult;
      
      if (this.sesClient && !this.testMode) {
        try {
          // TODO: Real SES verification check when AWS SDK is available
          verificationResult = await this.simulateVerificationCheck(domain);
        } catch (error) {
          console.error('Error checking SES verification:', error);
          // Fall back to simulation
          verificationResult = await this.simulateVerificationCheck(domain);
        }
      } else {
        verificationResult = await this.simulateVerificationCheck(domain);
      }

      // Update verification status if changed
      if (verificationResult.verified !== domain.verified || 
          verificationResult.status !== domain.ses_verification_status) {
        
        const { error: updateError } = await supabase
          .from('mail_domains')
          .update({
            verified: verificationResult.verified,
            ses_verification_status: verificationResult.status,
            verified_at: verificationResult.verified ? new Date().toISOString() : null,
            last_checked_at: new Date().toISOString(),
            verification_errors: verificationResult.errors || null
          })
          .eq('id', domainId);

        if (updateError) throw updateError;
      }

      return verificationResult;
    } catch (error) {
      console.error('Error checking domain verification:', error);
      throw error;
    }
  }

  // Enhanced single email sending with simulated SES
  async sendSingleEmail(queueItem) {
    try {
      const { campaign, contact } = queueItem;
      
      if (!campaign || !contact) {
        throw new Error('Missing campaign or contact data');
      }

      // Get from address
      const fromAddress = await this.getFromAddress(campaign.business_id);
      
      const emailParams = {
        to: contact.email,
        from: fromAddress,
        subject: campaign.subject_line,
        html: queueItem.personalized_content || campaign.content_html
      };

      let sesResult;
      
      if (this.sesClient && !this.testMode) {
        try {
          // TODO: Real SES sending when AWS SDK is available
          sesResult = await this.simulateSESSend(emailParams);
          
          console.log(`Email simulated to ${emailParams.to}:`, sesResult.MessageId);
        } catch (error) {
          console.error('SES send error, falling back to simulation:', error);
          sesResult = await this.simulateSESSend(emailParams);
        }
      } else {
        sesResult = await this.simulateSESSend(emailParams);
      }

      return {
        success: true,
        messageId: sesResult.MessageId,
        timestamp: new Date().toISOString(),
        campaign_id: queueItem.campaign_id,
        contact_id: queueItem.contact_id,
        email_address: contact.email
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        campaign_id: queueItem.campaign_id,
        contact_id: queueItem.contact_id,
        email_address: queueItem.email_address
      };
    }
  }

  // [Rest of the methods remain the same - continuing with existing implementations]
  
  // Step 119: Enhanced bounce notification processing
  async processBounceNotification(notification) {
    try {
      const bounce = notification.bounce || notification.complaint;
      const mail = notification.mail;
      const notificationType = notification.eventType || notification.notificationType;

      if (!bounce || !mail) {
        throw new Error('Invalid notification format');
      }

      const recipients = bounce.bouncedRecipients || bounce.complainedRecipients || [];

      for (const recipient of recipients) {
        // Find the original send record
        const { data: sendRecord } = await supabase
          .from('mail_campaign_sends')
          .select(`
            *,
            campaign:mail_campaigns(business_id, id, name)
          `)
          .eq('ses_message_id', mail.messageId)
          .eq('email_address', recipient.emailAddress)
          .single();

        if (sendRecord && sendRecord.campaign) {
          const bounceType = this.determineBounceType(notificationType, bounce.bounceType);
          const bounceSubtype = bounce.bounceSubType || bounce.complaintFeedbackType;

          // Record the bounce/complaint
          await supabase.from('mail_bounces').insert({
            business_id: sendRecord.campaign.business_id,
            contact_id: sendRecord.contact_id,
            campaign_id: sendRecord.campaign_id,
            campaign_send_id: sendRecord.id,
            email_address: recipient.emailAddress,
            bounce_type: bounceType,
            bounce_subtype: bounceSubtype,
            bounce_reason: recipient.diagnosticCode || bounce.bounceSubType || 'Bounce reported by ISP',
            ses_notification_id: notification.notificationId,
            ses_message_id: mail.messageId,
            raw_notification: notification,
            auto_removed: bounceType === 'hard' || bounceType === 'complaint'
          });

          // Update campaign send status
          await supabase
            .from('mail_campaign_sends')
            .update({ 
              status: bounceType === 'complaint' ? 'complained' : 'bounced',
              error_message: recipient.diagnosticCode || 'Email bounced'
            })
            .eq('id', sendRecord.id);

          // Handle hard bounces and complaints - auto-unsubscribe
          if (bounceType === 'hard' || bounceType === 'complaint') {
            await this.autoUnsubscribeContact(
              sendRecord.campaign.business_id, 
              recipient.emailAddress,
              bounceType === 'complaint' ? 'complaint' : 'hard_bounce'
            );
          }
        }
      }

      return { 
        success: true, 
        processed: recipients.length,
        notificationType: notificationType
      };
    } catch (error) {
      console.error('Error processing bounce notification:', error);
      throw error;
    }
  }

  // Enhanced queue processing with comprehensive validation (existing + Step 137)
  async queueCampaignForSending(campaignId, contactIds = null) {
    try {
      const { data: campaign, error: campaignError } = await supabase
        .from('mail_campaigns')
        .select('*, business_id')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Step 137: Comprehensive compliance validation before queuing
      const compliance = await this.validateCampaignCompliance(campaign, campaign.business_id);
      
      if (!compliance.canSend) {
        throw new Error(`Campaign compliance failed: ${compliance.issues.join(', ')}`);
      }

      let query = supabase
        .from('mail_contacts')
        .select('id, email, first_name, last_name, subscribed')
        .eq('business_id', campaign.business_id)
        .eq('subscribed', true);

      if (contactIds && contactIds.length > 0) {
        query = query.in('id', contactIds);
      }

      const { data: contacts, error: contactsError } = await query;
      if (contactsError) throw contactsError;

      // Filter out suppressed emails
      const validContacts = [];
      for (const contact of contacts) {
        const suppressed = await this.isEmailSuppressed(campaign.business_id, contact.email);
        if (!suppressed) {
          validContacts.push(contact);
        }
      }

      // Create queue items with personalized content
      const queueItems = validContacts.map(contact => ({
        campaign_id: campaignId,
        contact_id: contact.id,
        email_address: contact.email,
        status: 'queued',
        priority: 5,
        scheduled_for: new Date().toISOString(),
        personalized_content: this.personalizeEmailContent(campaign.content_html, contact, campaign.business_id)
      }));

      const { data: queuedItems, error: queueError } = await supabase
        .from('mail_sending_queue')
        .insert(queueItems)
        .select();

      if (queueError) throw queueError;

      // Update campaign status
      await supabase
        .from('mail_campaigns')
        .update({
          status: 'sending',
          total_recipients: validContacts.length,
          sent_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      return {
        campaign_id: campaignId,
        business_id: campaign.business_id,
        queued: queuedItems.length,
        suppressed: contacts.length - validContacts.length,
        total_contacts: contacts.length,
        valid_contacts: validContacts.length,
        queueItems: queuedItems,
        compliance: compliance
      };
    } catch (error) {
      console.error('Error queueing campaign:', error);
      throw error;
    }
  }

  // Enhanced queue processing with rate limiting
  async processSendingQueue(batchSize = 10) {
    try {
      const { data: queueItems, error } = await supabase
        .from('mail_sending_queue')
        .select(`
          *,
          campaign:mail_campaigns(name, subject_line, business_id),
          contact:mail_contacts(first_name, last_name, email)
        `)
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString())
        .limit(batchSize)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!queueItems || queueItems.length === 0) {
        return { 
          processed: 0, 
          sent: 0, 
          failed: 0,
          campaigns_affected: [],
          errors: []
        };
      }

      let sent = 0;
      let failed = 0;
      const campaignsAffected = new Set();
      const errors = [];

      // Process each queue item with rate limiting
      for (let i = 0; i < queueItems.length; i++) {
        const item = queueItems[i];

        try {
          // Update status to processing
          await supabase
            .from('mail_sending_queue')
            .update({ 
              status: 'processing', 
              processed_at: new Date().toISOString() 
            })
            .eq('id', item.id);

          // Send the email
          const sendResult = await this.sendSingleEmail(item);
          
          if (sendResult.success) {
            await this.recordSuccessfulSend(item, sendResult);
            sent++;
            campaignsAffected.add(item.campaign_id);
          } else {
            await this.handleSendFailure(item, sendResult.error);
            failed++;
            errors.push({
              campaign_id: item.campaign_id,
              contact_email: item.email_address,
              error: sendResult.error
            });
          }

          // Rate limiting - wait between sends
          if (i < queueItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, (1000 / this.sendRateLimits.default) * 1000));
          }

        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          await this.handleSendFailure(item, error.message);
          failed++;
          errors.push({
            campaign_id: item.campaign_id,
            contact_email: item.email_address,
            error: error.message
          });
        }
      }

      return { 
        processed: queueItems.length, 
        sent, 
        failed,
        campaigns_affected: Array.from(campaignsAffected),
        errors,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing sending queue:', error);
      throw error;
    }
  }

  // Helper Methods
  
  determineBounceType(eventType, bounceType) {
    if (eventType === 'complaint') return 'complaint';
    if (bounceType === 'Permanent') return 'hard';
    if (bounceType === 'Temporary') return 'soft';
    return 'undetermined';
  }

  async autoUnsubscribeContact(businessId, emailAddress, reason) {
    try {
      // Update contact subscription status
      const { error: contactError } = await supabase
        .from('mail_contacts')
        .update({ 
          subscribed: false,
          unsubscribed_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .eq('email', emailAddress);

      if (contactError) {
        console.error('Error updating contact subscription:', contactError);
      }

      // Log the consent action
      const contact = await supabase
        .from('mail_contacts')
        .select('id')
        .eq('business_id', businessId)
        .eq('email', emailAddress)
        .single();

      if (contact.data) {
        await supabase.rpc('log_consent_action', {
          p_business_id: businessId,
          p_contact_id: contact.data.id,
          p_email_address: emailAddress,
          p_action: 'auto_unsubscribe',
          p_consent_source: reason
        });
      }

    } catch (error) {
      console.error('Error auto-unsubscribing contact:', error);
    }
  }

  async isEmailSuppressed(businessId, email) {
    try {
      const { data, error } = await supabase
        .rpc('is_email_suppressed', {
          p_business_id: businessId,
          p_email: email
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking email suppression:', error);
      return false;
    }
  }

  personalizeEmailContent(htmlContent, contact, businessId) {
    if (!htmlContent) return '';
    
    return htmlContent
      .replace(/\{FirstName\}/g, contact.first_name || '')
      .replace(/\{LastName\}/g, contact.last_name || '')
      .replace(/\{Email\}/g, contact.email || '')
      .replace(/\{UnsubscribeLink\}/g, `${import.meta.env?.VITE_BASE_URL || window.location.origin}/unsubscribe?token=${this.generateUnsubscribeToken(contact.id, businessId)}`)
      .replace(/\{UpdatePreferencesLink\}/g, `${import.meta.env?.VITE_BASE_URL || window.location.origin}/preferences?token=${this.generateUnsubscribeToken(contact.id, businessId)}`);
  }

  async getFromAddress(businessId) {
    try {
      const { data: settings } = await supabase
        .from('mail_settings')
        .select('from_email, from_name')
        .eq('business_id', businessId)
        .single();

      return settings ? `${settings.from_name} <${settings.from_email}>` : 'noreply@example.com';
    } catch (error) {
      return 'noreply@example.com';
    }
  }

  generateVerificationToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  generateUnsubscribeToken(contactId, businessId) {
    return Buffer.from(`${contactId}:${businessId}:${Date.now()}`).toString('base64');
  }

  generateDNSRecords(domain, verificationToken) {
    return {
      spf: `"v=spf1 include:amazonses.com ~all"`,
      dmarc: `"v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}; fo=1"`,
      dkim: [
        `${verificationToken}._domainkey.${domain}`,
        `${verificationToken}2._domainkey.${domain}`,
        `${verificationToken}3._domainkey.${domain}`
      ]
    };
  }

  getDNSInstructions(domain, records) {
    return {
      spf: {
        type: 'TXT',
        name: domain,
        value: records.spf,
        description: 'Add this SPF record to authorize Amazon SES to send emails for your domain'
      },
      dmarc: {
        type: 'TXT',
        name: `_dmarc.${domain}`,
        value: records.dmarc,
        description: 'Add this DMARC record to improve email deliverability and security'
      },
      dkim: records.dkim.map((token, index) => ({
        type: 'CNAME',
        name: token,
        value: `${token}.dkim.amazonses.com`,
        description: `DKIM record ${index + 1} for email authentication`
      }))
    };
  }

  // Simulation methods for development (fallback when SES not configured)
  async simulateVerificationCheck(domain) {
    const isVerified = Math.random() > 0.3;
    
    return {
      verified: isVerified,
      status: isVerified ? 'success' : 'pending',
      dkimStatus: isVerified ? 'verified' : 'pending',
      spfStatus: isVerified ? 'verified' : 'pending',
      dmarcStatus: isVerified ? 'verified' : 'pending',
      errors: isVerified ? null : 'DNS records not yet propagated (simulation)'
    };
  }

  async simulateSESSend(emailData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.02) { // 98% success rate
          resolve({
            MessageId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ResponseMetadata: {
              RequestId: Math.random().toString(36).substr(2, 9)
            }
          });
          console.log(`Simulated email sent to ${emailData.to}`);
        } else {
          reject(new Error('Simulated send failure'));
        }
      }, 100);
    });
  }

  // Enhanced record successful send with queue cleanup
  async recordSuccessfulSend(queueItem, sendResult) {
    try {
      // Record in campaign sends table
      await supabase.from('mail_campaign_sends').insert({
        campaign_id: queueItem.campaign_id,
        contact_id: queueItem.contact_id,
        email_address: queueItem.email_address,
        status: 'sent',
        sent_at: sendResult.timestamp,
        ses_message_id: sendResult.messageId
      });

      // Update queue item status
      await supabase
        .from('mail_sending_queue')
        .update({ 
          status: 'sent', 
          processed_at: new Date().toISOString(),
          ses_message_id: sendResult.messageId
        })
        .eq('id', queueItem.id);

      // Increment campaign sent count
      await supabase.rpc('increment_campaign_sent_count', {
        campaign_id: queueItem.campaign_id
      });

      return {
        success: true,
        campaign_id: queueItem.campaign_id,
        contact_id: queueItem.contact_id,
        sent_at: sendResult.timestamp
      };
    } catch (error) {
      console.error('Error recording successful send:', error);
      throw error;
    }
  }

  // Enhanced failure handling with queue management
  async handleSendFailure(queueItem, errorMessage) {
    try {
      const retryCount = (queueItem.retry_count || 0) + 1;
      
      if (retryCount <= this.retryConfig.maxRetries) {
        // Calculate retry delay with exponential backoff
        const delayMs = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, retryCount - 1),
          this.retryConfig.maxDelay
        );
        
        const retryAt = new Date(Date.now() + delayMs);
        
        // Update queue item for retry
        await supabase
          .from('mail_sending_queue')
          .update({
            status: 'queued',
            retry_count: retryCount,
            error_message: errorMessage,
            scheduled_for: retryAt.toISOString()
          })
          .eq('id', queueItem.id);
      } else {
        // Mark as permanently failed
        await supabase
          .from('mail_sending_queue')
          .update({
            status: 'failed',
            error_message: errorMessage,
            processed_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);

        // Record failed send
        await supabase.from('mail_campaign_sends').insert({
          campaign_id: queueItem.campaign_id,
          contact_id: queueItem.contact_id,
          email_address: queueItem.email_address,
          status: 'failed',
          error_message: errorMessage,
          retry_count: retryCount
        });
      }
    } catch (error) {
      console.error('Error handling send failure:', error);
    }
  }

  // Get campaign sending statistics
  async getCampaignSendingStats(campaignId) {
    try {
      const { data: queueStats } = await supabase
        .from('mail_sending_queue')
        .select('status')
        .eq('campaign_id', campaignId);

      const { data: sendStats } = await supabase
        .from('mail_campaign_sends')
        .select('status')
        .eq('campaign_id', campaignId);

      return {
        queued: queueStats?.filter(q => q.status === 'queued').length || 0,
        processing: queueStats?.filter(q => q.status === 'processing').length || 0,
        sent: sendStats?.filter(s => s.status === 'sent').length || 0,
        failed: sendStats?.filter(s => s.status === 'failed').length || 0,
        bounced: sendStats?.filter(s => s.status === 'bounced').length || 0,
        complained: sendStats?.filter(s => s.status === 'complained').length || 0,
        total_queued: queueStats?.length || 0,
        total_processed: sendStats?.length || 0
      };
    } catch (error) {
      console.error('Error getting campaign sending stats:', error);
      return {
        queued: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        bounced: 0,
        complained: 0,
        total_queued: 0,
        total_processed: 0
      };
    }
  }
}

export default new EmailSendingService();