import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServerClient():
  | SupabaseClient
  | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey =
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  // Trim whitespace to avoid connection errors
  const url = supabaseUrl.trim();
  const key = supabaseServiceRoleKey.trim();

  return createClient(url, key);
}
