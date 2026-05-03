import { slugifyRelationKey } from "@/lib/api/slug";
import {
  badRequest,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import type { RelationshipWithEntities } from "@/types/api";
import type { Database } from "@/types/database";

type RelationshipRow = Database["public"]["Tables"]["relationships"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];

type PatchRelationshipBody = {
  label?: string;
  relation_key?: string;
};

async function loadRelationshipPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  relId: string
): Promise<RelationshipWithEntities | null> {
  const { data: row, error } = await table(supabase, "relationships")
    .select("*")
    .eq("id", relId)
    .maybeSingle();

  if (error || !row) return null;

  const rel = row as RelationshipRow;

  const ids = [rel.source_entity_id, rel.target_entity_id];
  const { data: ents, error: entErr } = await table(supabase, "entities")
    .select("*")
    .in("id", ids);

  if (entErr || !ents || ents.length !== 2) return null;

  const entRows = ents as EntityRow[];
  const typeIds = Array.from(new Set(entRows.map((e) => e.entity_type_id)));

  const { data: types, error: typeErr } = await table(supabase, "entity_types")
    .select("*")
    .in("id", typeIds);

  if (typeErr || !types) return null;

  const typeMap = new Map((types as EntityTypeRow[]).map((t) => [t.id, t]));
  const byId = new Map(entRows.map((e) => [e.id, e] as const));

  const sEnt = byId.get(rel.source_entity_id);
  const tEnt = byId.get(rel.target_entity_id);
  if (!sEnt || !tEnt) return null;

  const sType = typeMap.get(sEnt.entity_type_id);
  const tType = typeMap.get(tEnt.entity_type_id);
  if (!sType || !tType) return null;

  return {
    ...rel,
    source_entity: { ...sEnt, entity_type: sType },
    target_entity: { ...tEnt, entity_type: tType },
  };
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await readJsonBody<PatchRelationshipBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(
      supabase,
      "relationships"
    )
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!existing) return notFound("Relación no encontrada");

    const update: Database["public"]["Tables"]["relationships"]["Update"] = {};

    let newLabel: string | undefined;
    if (body.label !== undefined) {
      const lb = String(body.label).trim();
      if (!lb) return badRequest("label no puede estar vacío");
      newLabel = lb;
      update.label = lb;
    }

    if (body.relation_key !== undefined) {
      const rk =
        typeof body.relation_key === "string"
          ? body.relation_key.trim()
          : "";
      if (!rk) return badRequest("relation_key no puede estar vacío");
      update.relation_key = rk;
    } else if (newLabel !== undefined) {
      update.relation_key = slugifyRelationKey(newLabel);
    }

    if (Object.keys(update).length === 0) {
      const payload = await loadRelationshipPayload(supabase, id);
      if (!payload) return internalError("No se pudo cargar la relación");
      return jsonOk(payload);
    }

    const { error: upErr } = await table(supabase, "relationships")
      .update(update as never)
      .eq("id", id);

    if (upErr) {
      return internalError(upErr.message, { code: upErr.code });
    }

    const payload = await loadRelationshipPayload(supabase, id);
    if (!payload) {
      return internalError("No se pudo cargar la relación actualizada");
    }

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
      "relationships"
    )
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!existing) return notFound("Relación no encontrada");

    const { error: delErr } = await table(supabase, "relationships")
      .delete()
      .eq("id", id);

    if (delErr) {
      return internalError(delErr.message, { code: delErr.code });
    }

    return jsonOk({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
