// helpers/posAudit.js
import { supabase } from '../supabaseClient';

export async function logAction({ action, context, metadata = {} }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const business_id = localStorage.getItem('currentBusinessId') || null;

    const payload = {
      business_id,
      action,
      actor_id: user?.id || null,  // Changed from user_id to actor_id
      actor_name: user?.email || null,  // Added actor_name
      context,
      metadata,
      timestamp: new Date().toISOString(),  // Changed from created_at to timestamp
      success: true  // Added success field
    };

    // pos_audit_logs table: business_id (uuid), action (varchar), actor_id (uuid), 
    // actor_name (varchar), context (varchar), metadata (jsonb), timestamp (timestamptz), success (boolean)
    const { error } = await supabase.from('pos_audit_logs').insert(payload);
    if (error) {
      // Soft-fail — do not disrupt POS flow
      console.warn('[posAudit] insert failed:', error.message);
    }
  } catch (e) {
    console.warn('[posAudit] logAction error:', e?.message || e);
  }
}