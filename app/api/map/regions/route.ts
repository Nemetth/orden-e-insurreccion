import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  internalError,
  jsonCreated,
  jsonOk,
  readJsonBody,
} from "@/lib/api/http";
import type { MapRegionRow } from "@/types/api";
import type { Database, Json } from "@/types/database";

type RegionRow = Database["public"]["Tables"]["map_regions"]["Row"];

function isGeoJsonObject(v: unknown): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

type PostBody = {
  name?: string;
  color?: string;
  geojson?: unknown;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: rows, error } = await table(supabase, "map_regions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return internalError(error.message, { code: error.code });
    }

    return jsonOk<MapRegionRow[]>((rows ?? []) as RegionRow[]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<PostBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest("name es obligatorio");

    if (!isGeoJsonObject(body.geojson)) {
      return badRequest("geojson debe ser un objeto JSON");
    }

    const color =
      typeof body.color === "string" && body.color.trim()
        ? body.color.trim()
        : "#8b1a1a";

    const supabase = await createClient();

    const insert: Database["public"]["Tables"]["map_regions"]["Insert"] = {
      name,
      color,
      geojson: body.geojson as Json,
    };

    const { data: row, error } = await table(supabase, "map_regions")
      .insert(insert as never)
      .select("*")
      .single();

    if (error) {
      return internalError(error.message, { code: error.code });
    }

    return jsonCreated<MapRegionRow>(row as RegionRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
