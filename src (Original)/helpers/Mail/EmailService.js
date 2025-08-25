// src/helpers/Mail/EmailService.js - Amazon SES Integration
import { supabase } from '../../supabaseClient';

class EmailService {
  constructor() {
    this.sesConfig = {
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      secure: false, // use STARTTLS
      auth: {
        user: 'AKIAVKYTSF5EZDYPH5S',
        pass: 'BOraZatLCsWFmONjKrZ+LpqowO3wwKBXxhSu3sQdA0+u'
      }
    };
    
    this.sendQueue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    this.rateLimitDelay = 200; // 200ms between emails (5 emails/second)
  }

  // Step 112: Domain verification workflow
  async verifyDomain(businessId, domain) {
    try {
      // Generate verification token
      const verificationToken = `tavari-verify-${Math.random().toString(36).substring(2, 15)}`;
      
      // Store domain for verification
      const { data, error } = await supabase
        .from('mail_domains')
        .upsert({
          business_id: businessId,
          domain: domain,
          verified: false,
          verification_token: verificationToken,
          spf_record: `v=spf1 include:amazonses.com ~all`,
          dmarc_record: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        verificationToken,
        dnsRecords: {
          txt: `${verificationToken}`,
          spf: `v=spf1 include:amazonses.com ~all`,
          dmarc: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`
        }
      };
    } catch (error) {
      console.error('Domain verification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Step 114: Queue campaign for sending
  async queueCampaign(campaignId, businessId) {
    try {
      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('mail_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('business_id', businessId)
        .single();

      if (campaignError) throw campaignError;

      // Get mail settings
      const { data: settings, error: settingsError } = await supabase
        .from('mail_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (settingsError) throw settingsError;

      // Get subscribed contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('mail_contacts')
        .select('*')
        .eq('business_id', businessId)
        .eq('subscribed', true);

      if (contactsError) throw contactsError;

      // Filter out unsubscribed emails
      const validContacts = [];
      for (const contact of contacts) {
        const { data: unsubscribed } = await supabase
          .rpc('is_email_unsubscribed', { 
            p_business_id: businessId, 
            p_email: contact.email 
          });
        
        if (!unsubscribed) {
          validContacts.push(contact);
        }
      }

      // Create send records
      const sendRecords = validContacts.map(contact => ({
        campaign_id: campaignId,
        contact_id: contact.id,
        email_address: contact.email,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      }));

      // Insert send records
      const { error: insertError } = await supabase
        .from('mail_campaign_sends')
        .insert(sendRecords);

      if (insertError) throw insertError;

      // Update campaign status and recipient count
      await supabase
        .from('mail_campaigns')
        .update({
          status: 'sending',
          total_recipients: validContacts.length,
          sent_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      // Start processing queue
      this.processSendQueue(campaignId, campaign, settings);

      return {
        success: true,
        recipientCount: validContacts.length,
        message: `Campaign queued for ${validContacts.length} recipients`
      };

    } catch (error) {
      console.error('Queue campaign error:', error);
      return { success: false, error: error.message };
    }
  }

  // Step 115: Process send queue with rate limiting
  async processSendQueue(campaignId, campaign, settings) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      // Get pending sends
      const { data: pendingSends, error } = await supabase
        .from('mail_campaign_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50); // Process in batches of 50

      if (error) throw error;

      let successCount = 0;
      let failureCount = 0;

      for (const send of pendingSends) {
        try {
          // Generate personalized content
          const personalizedHTML = this.personalizeContent(
            campaign.content_html, 
            send.contact_id,
            send.email_address
          );

          // Generate unsubscribe link
          const unsubscribeLink = await this.generateUnsubscribeLink(
            campaignId, 
            send.contact_id,
            settings.business_id
          );

          // Replace unsubscribe placeholder
          const finalHTML = personalizedHTML.replace(
            '{UnsubscribeLink}', 
            unsubscribeLink
          );

          // Send email via SES
          const sendResult = await this.sendViaSES({
            to: send.email_address,
            from: `${settings.from_name} <${settings.from_email}>`,
            subject: campaign.subject_line,
            html: finalHTML,
            replyTo: settings.reply_to || settings.from_email
          });

          if (sendResult.success) {
            // Update send status
            await supabase
              .from('mail_campaign_sends')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString()
              })
              .eq('id', send.id);

            successCount++;
          } else {
            throw new Error(sendResult.error);
          }

        } catch (error) {
          console.error(`Send error for ${send.email_address}:`, error);
          
          // Update retry count and status
          const newRetryCount = send.retry_count + 1;
          const newStatus = newRetryCount >= this.maxRetries ? 'failed' : 'pending';
          
          await supabase
            .from('mail_campaign_sends')
            .update({
              retry_count: newRetryCount,
              status: newStatus,
              error_message: error.message
            })
            .eq('id', send.id);

          failureCount++;
        }

        // Rate limiting delay
        await this.delay(this.rateLimitDelay);
      }

      // Update campaign statistics
      await this.updateCampaignStats(campaignId);

      // Log send results
      console.log(`Batch processed: ${successCount} sent, ${failureCount} failed`);

      // Check if more sends are pending
      const { data: remainingPending } = await supabase
        .from('mail_campaign_sends')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .limit(1);

      if (remainingPending && remainingPending.length > 0) {
        // Continue processing after delay
        setTimeout(() => {
          this.isProcessing = false;
          this.processSendQueue(campaignId, campaign, settings);
        }, 1000);
      } else {
        // Campaign complete
        await supabase
          .from('mail_campaigns')
          .update({ status: 'sent' })
          .eq('id', campaignId);
        
        this.isProcessing = false;
      }

    } catch (error) {
      console.error('Process queue error:', error);
      this.isProcessing = false;
    }
  }

  // Step 116: Send via Amazon SES SMTP
  async sendViaSES({ to, from, subject, html, replyTo }) {
    try {
      // This would typically use nodemailer or AWS SDK
      // For now, we'll simulate the SES API call
      
      const emailData = {
        Source: from,
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8'
            }
          }
        },
        ReplyToAddresses: replyTo ? [replyTo] : undefined
      };

      // Simulate API call delay
      await this.delay(100);

      // Log the send attempt
      console.log(`Sending email to ${to} with subject: ${subject}`);

      // For production, replace this with actual SES SDK call:
      // const result = await sesClient.sendEmail(emailData).promise();
      
      return { 
        success: true, 
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` 
      };

    } catch (error) {
      console.error('SES send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Step 117: Handle bounces and complaints
  async handleBounce(bounceData) {
    try {
      const { data, error } = await supabase
        .from('mail_bounces')
        .insert({
          business_id: bounceData.business_id,
          contact_id: bounceData.contact_id,
          campaign_id: bounceData.campaign_id,
          email_address: bounceData.email_address,
          bounce_type: bounceData.bounce_type, // 'hard' or 'soft'
          bounce_reason: bounceData.bounce_reason,
          bounced_at: new Date().toISOString(),
          auto_removed: bounceData.bounce_type === 'hard'
        });

      if (error) throw error;

      // Auto-remove hard bounces
      if (bounceData.bounce_type === 'hard') {
        await supabase
          .from('mail_contacts')
          .update({ subscribed: false })
          .eq('id', bounceData.contact_id);
      }

    } catch (error) {
      console.error('Bounce handling error:', error);
    }
  }

  // Step 118: Generate unsubscribe link
  async generateUnsubscribeLink(campaignId, contactId, businessId) {
    const token = Buffer.from(JSON.stringify({
      campaign: campaignId,
      contact: contactId,
      business: businessId,
      timestamp: Date.now()
    })).toString('base64');

    return `${window.location.origin}/unsubscribe?token=${token}`;
  }

  // Step 119: Personalize content
  personalizeContent(html, contactId, email) {
    // For now, just replace email placeholder
    // In the future, fetch contact details and replace {FirstName}, etc.
    return html.replace('{Email}', email)
               .replace('{UpdatePreferencesLink}', `${window.location.origin}/preferences?email=${email}`);
  }

  // Step 120: Update campaign statistics
  async updateCampaignStats(campaignId) {
    try {
      const { data: stats } = await supabase
        .from('mail_campaign_sends')
        .select('status')
        .eq('campaign_id', campaignId);

      const sentCount = stats.filter(s => s.status === 'sent').length;
      
      await supabase
        .from('mail_campaigns')
        .update({ emails_sent: sentCount })
        .eq('id', campaignId);

    } catch (error) {
      console.error('Stats update error:', error);
    }
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Step 121: Emergency stop functionality
  async stopCampaign(campaignId) {
    try {
      // Update all pending sends to cancelled
      await supabase
        .from('mail_campaign_sends')
        .update({ status: 'cancelled' })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

      // Update campaign status
      await supabase
        .from('mail_campaigns')
        .update({ status: 'stopped' })
        .eq('id', campaignId);

      return { success: true, message: 'Campaign stopped successfully' };
    } catch (error) {
      console.error('Stop campaign error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();