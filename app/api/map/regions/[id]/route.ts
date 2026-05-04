import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { MapRegionRow } from "@/types/api";
import type { Database } from "@/types/database";

type RegionRow = Database["public"]["Tables"]["map_regions"]["Row"];

type PatchBody = {
  name?: string;
  color?: string;
};

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await readJsonBody<PatchBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(
      supabase,
      "map_regions"
    )
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Región no encontrada");

    const update: Database["public"]["Tables"]["map_regions"]["Update"] = {};

    if (body.name !== undefined) {
      const n = String(body.name).trim();
      if (!n) return badRequest("name no puede estar vacío");
      update.name = n;
    }
    if (body.color !== undefined) {
      const c = String(body.color).trim();
      if (!c) return badRequest("color no puede estar vacío");
      update.color = c;
    }

    if (Object.keys(update).length === 0) {
      return jsonOk<MapRegionRow>(existing as RegionRow);
    }

    const { error: upErr } = await table(supabase, "map_regions")
      .update(update as never)
      .eq("id", id);

    if (upErr) return internalError(upErr.message, { code: upErr.code });

    const { data: row, error: rErr } = await table(supabase, "map_regions")
      .select("*")
      .eq("id", id)
      .single();

    if (rErr || !row) return internalError(rErr?.message ?? "No se pudo recargar");

    return jsonOk<MapRegionRow>(row as RegionRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(
      supabase,
      "map_regions"
    )
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Región no encontrada");

    const { error: delErr } = await table(supabase, "map_regions")
      .delete()
      .eq("id", id);

    if (delErr) return internalError(delErr.message, { code: delErr.code });

    return jsonOk({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
