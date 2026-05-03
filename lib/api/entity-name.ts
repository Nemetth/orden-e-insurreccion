import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Misma denominación para el mismo tipo (insensible a mayúsculas / espacios extremos). */
export async function entityNameTaken(
  supabase: Supabase,
  entityTypeId: string,
  name: string,
  excludeEntityId?: string
): Promise<boolean> {
  const n = name.trim().toLowerCase();
  if (!n) return false;

  let q = table(supabase, "entities")
    .select("id,name")
    .eq("entity_type_id", entityTypeId);

  if (excludeEntityId) {
    q = q.neq("id", excludeEntityId);
  }

  const { data, error } = await q;

  if (error || !data) return false;

  const rows = data as { id: string; name: string }[];
  return rows.some((r) => r.name.trim().toLowerCase() === n);
}
