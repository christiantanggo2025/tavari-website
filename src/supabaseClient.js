import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

console.log('🔎 ENV CHECK →', {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '✅ (anon key present)' : '❌ (anon key missing)',
  VITE_SUPABASE_SERVICE_KEY: supabaseServiceKey ? '✅ (service key present)' : '⚠️ (no service key)'
});

if (!supabaseUrl) throw new Error('supabaseUrl is required');
if (!supabaseAnonKey) throw new Error('supabaseKey is required');

// ✅ CRITICAL: Configure session persistence for indefinite login
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage for persistent sessions across browser restarts
    storage: window.localStorage,
    
    // Keep sessions alive automatically - refresh tokens before they expire
    autoRefreshToken: true,
    
    // Persist sessions across browser restarts
    persistSession: true,
    
    // Detect session from URL for OAuth flows
    detectSessionInUrl: true,
    
    // CRITICAL: Prevent automatic logout - sessions persist indefinitely
    // Only the inactivity timer (5 min) will trigger PIN lock, not session expiry
    flowType: 'pkce'
  }
});

// Admin client setup
let supabaseAdmin;

if (supabaseServiceKey && typeof supabaseServiceKey === 'string' && supabaseServiceKey.length > 10) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  // Safe fallback that won't crash if called accidentally
  supabaseAdmin = {
    auth: {
      admin: {
        listUsers: async () => {
          console.warn('⚠️ supabaseAdmin.listUsers called without service key');
          return { data: null, error: { message: 'Service key not configured' } };
        },
        updateUserById: async () => {
          console.warn('⚠️ supabaseAdmin.updateUserById called without service key');
          return { error: { message: 'Service key not configured' } };
        },
      },
    },
  };
}

export { supabaseAdmin };