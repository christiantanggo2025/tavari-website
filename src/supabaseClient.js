import { createClient } from '@supabase/supabase-js';

// ✅ Load environment variables (from Vite / Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// 🔍 Debug: log which keys are present at runtime
console.log('🔎 ENV CHECK →', {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '✅ (anon key present)' : '❌ (anon key missing)',
  VITE_SUPABASE_SERVICE_KEY: supabaseServiceKey ? '✅ (service key present)' : '⚠️ (no service key)'
});

// 🚨 Validate required values
if (!supabaseUrl) throw new Error('supabaseUrl is required');
if (!supabaseAnonKey) throw new Error('supabaseKey is required');

// ✅ Create main Supabase client (for public use)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ Always define supabaseAdmin to avoid ReferenceError
let supabaseAdmin;

if (supabaseServiceKey && typeof supabaseServiceKey === 'string' && supabaseServiceKey.length > 10) {
  // Real admin client
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
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

// ✅ Export it safely
export { supabaseAdmin };
