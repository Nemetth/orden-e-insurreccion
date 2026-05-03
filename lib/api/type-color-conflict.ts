import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { colorsConflict } from "@/lib/api/color-normalize";
import type { Database } from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];

/** Devuelve true si otro tipo ya usa ese color (comparación hex normalizada). */
export async function entityTypeColorTaken(
  supabase: Supabase,
  color: string,
  excludeTypeId?: string
): Promise<boolean> {
  const { data, error } = await table(supabase, "entity_types").select("id,color");

  if (error || !data) return false;

  const rows = data as Pick<EntityTypeRow, "id" | "color">[];
  return rows.some(
    (r) =>
      (!excludeTypeId || r.id !== excludeTypeId) && colorsConflict(r.color, color)
  );
}
