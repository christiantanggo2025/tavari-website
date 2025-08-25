// helpers/Mail/emailSendingServiceFallback.js - Temporary fallback for Edge Function
import { supabase } from '../../supabaseClient';

// Temporary patch for the sendSingleEmail method
const originalSendSingleEmail = window.emailSendingService?.sendSingleEmail;

export const patchEmailSendingService = (emailSendingService) => {
  // Override the sendSingleEmail method with a fallback
  emailSendingService.sendSingleEmail = async function(queueItem) {
    try {
      const { campaign, contact } = queueItem;
      
      if (!campaign || !contact) {
        throw new Error('Missing campaign or contact data');
      }

      console.log('📧 Fallback: Simulating email send to:', contact.email);

      // Get business settings for compliance
      const { data: settings, error: settingsError } = await supabase
        .from('mail_settings')
        .select('from_name, from_email, business_address')
        .eq('business_id', campaign.business_id || queueItem.business_id)
        .single();

      if (settingsError) {
        console.warn('Could not load settings, using defaults:', settingsError);
      }

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate success/failure (95% success rate)
      const success = Math.random() > 0.05;

      if (!success) {
        throw new Error('Simulated send failure for testing');
      }

      const result = {
        success: true,
        messageId: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        campaign_id: queueItem.campaign_id,
        contact_id: queueItem.contact_id,
        email_address: contact.email,
        simulation: true
      };

      console.log('✅ Fallback: Email simulated successfully', result);
      return result;

    } catch (error) {
      console.error('❌ Fallback: Email send failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        campaign_id: queueItem.campaign_id,
        contact_id: queueItem.contact_id,
        email_address: queueItem.email_address,
        simulation: true
      };
    }
  };

  console.log('🔧 Email sending service patched with fallback method');
  return emailSendingService;
};