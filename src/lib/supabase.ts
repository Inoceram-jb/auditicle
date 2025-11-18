import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side client for API routes
export function createServerClient() {
  const serverSupabaseUrl = process.env.VITE_SUPABASE_URL || supabaseUrl;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!serverSupabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY or VITE_SUPABASE_URL environment variable');
  }

  return createClient<Database>(serverSupabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
