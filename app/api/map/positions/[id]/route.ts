import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { EntityMapPositionWithEntity } from "@/types/api";
import type { Database } from "@/types/database";

type PosRow = Database["public"]["Tables"]["entity_map_positions"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];

async function loadPositionPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  positionId: string
): Promise<EntityMapPositionWithEntity | null> {
  const { data: pos, error } = await table(supabase, "entity_map_positions")
    .select("*")
    .eq("id", positionId)
    .maybeSingle();

  if (error || !pos) return null;
  const p = pos as PosRow;

  const { data: ent, error: eErr } = await table(supabase, "entities")
    .select("*")
    .eq("id", p.entity_id)
    .maybeSingle();

  if (eErr || !ent) return null;
  const e = ent as EntityRow;

  const { data: typ, error: tErr } = await table(supabase, "entity_types")
    .select("*")
    .eq("id", e.entity_type_id)
    .maybeSingle();

  if (tErr || !typ) return null;

  return {
    ...p,
    entity: { ...e, entity_type: typ as EntityTypeRow },
  };
}

type PatchBody = {
  lat?: number;
  lng?: number;
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
      "entity_map_positions"
    )
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Posición no encontrada");

    const update: Database["public"]["Tables"]["entity_map_positions"]["Update"] =
      {};

    if (body.lat !== undefined) {
      if (typeof body.lat !== "number" || !Number.isFinite(body.lat)) {
        return badRequest("lat inválido");
      }
      update.lat = body.lat;
    }
    if (body.lng !== undefined) {
      if (typeof body.lng !== "number" || !Number.isFinite(body.lng)) {
        return badRequest("lng inválido");
      }
      update.lng = body.lng;
    }

    if (Object.keys(update).length === 0) {
      const p = await loadPositionPayload(supabase, id);
      if (!p) return internalError("No se pudo cargar");
      return jsonOk(p);
    }

    const { error: upErr } = await table(supabase, "entity_map_positions")
      .update(update as never)
      .eq("id", id);

    if (upErr) return internalError(upErr.message, { code: upErr.code });

    const payload = await loadPositionPayload(supabase, id);
    if (!payload) return internalError("No se pudo recargar");

    return jsonOk(payload);
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
      "entity_map_positions"
    )
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Posición no encontrada");

    const { error: delErr } = await table(supabase, "entity_map_positions")
      .delete()
      .eq("id", id);

    if (delErr) return internalError(delErr.message, { code: delErr.code });

    return jsonOk({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
