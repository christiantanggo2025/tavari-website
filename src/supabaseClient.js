import { createClient } from '@supabase/supabase-js';

// Read environment variables injected by Vite (and Vercel at build time)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY; // optional admin key

// 🔍 Debug log – helps confirm whether Vercel is passing the keys
console.log('🔎 ENV CHECK →', {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '✅ (anon key present)' : '❌ (anon key missing)',
  VITE_SUPABASE_SERVICE_KEY: supabaseServiceKey ? '✅ (service key present)' : '⚠️ (no service key)'
});

// Validate required values
if (!supabaseUrl) throw new Error('supabaseUrl is required');
if (!supabaseAnonKey) throw new Error('supabaseKey is required');

// Create main Supabase client for public usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Optionally create an admin client if you’ve added SERVICE_KEY to Vercel
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;
