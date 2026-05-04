import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { internalError, jsonOk } from "@/lib/api/http";
import type { Database } from "@/types/database";

type MapLocationRow = Database["public"]["Tables"]["map_locations"]["Row"];

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: rows, error } = await table(supabase, "map_locations")
      .select("*")
      .order("is_preset", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      return internalError(error.message, { code: error.code });
    }

    return jsonOk<MapLocationRow[]>((rows ?? []) as MapLocationRow[]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
