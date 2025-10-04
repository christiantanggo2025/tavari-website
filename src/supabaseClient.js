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

// Always export supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ Always define supabaseAdmin (placeholder if no key)
export const supabaseAdmin =
  supabaseServiceKey && typeof supabaseServiceKey === 'string' && supabaseServiceKey.length > 10
    ? createClient(supabaseUrl, supabaseServiceKey)
    : {
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
