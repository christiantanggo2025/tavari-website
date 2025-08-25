// helpers/posAudit.js
import { supabase } from '../supabaseClient';

export async function logAction({ action, context, metadata = {} }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const business_id = localStorage.getItem('currentBusinessId') || null;

    const payload = {
      action,
      context,
      metadata,
      user_id: user?.id || null,
      business_id,
      created_at: new Date().toISOString(),
    };

    // pos_audit_logs table: action (text), context (text), metadata (jsonb), user_id (uuid), business_id (uuid), created_at (timestamptz)
    const { error } = await supabase.from('pos_audit_logs').insert(payload);
    if (error) {
      // Soft-fail — do not disrupt POS flow
      console.warn('[posAudit] insert failed:', error.message);
    }
  } catch (e) {
    console.warn('[posAudit] logAction error:', e?.message || e);
  }
}
