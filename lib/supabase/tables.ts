import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/** Evita ambigüedad de tipos con literales como `"entities"` / `"attributes`. */
export function table<N extends keyof Database["public"]["Tables"]>(
  client: SupabaseClient<Database>,
  name: N
) {
  return client.from(name);
}
