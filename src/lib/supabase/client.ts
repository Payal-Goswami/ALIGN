import { createClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client — Supabase Auth (free tier), used for
 * sign-in/sign-out. Row-level security on every table should key off
 * auth.uid() joined through user_profiles.id in production deployments.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase env vars are not configured — see .env.example');
  }
  return createClient(url, anonKey);
}
