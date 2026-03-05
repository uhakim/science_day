import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getEnv } from "@/lib/env";

let client: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin() {
  if (client) {
    return client;
  }

  const { supabaseUrl, supabaseServiceRoleKey } = getEnv();
  client = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
