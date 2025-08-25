import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iagcamwcfuiopmwefohz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZ2NhbXdjZnVpb3Btd2Vmb2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NjY1MTksImV4cCI6MjA2OTE0MjUxOX0.qIw6wSI7O3Yl6Av-LVfDYL9TyKWNpeH0f2WIl221QW4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🔐 Admin client for secure operations (e.g. internal password reset)
export const supabaseAdmin = createClient(
  supabaseUrl,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);
