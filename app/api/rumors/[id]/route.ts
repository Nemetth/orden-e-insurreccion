import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { EntityRumorWithSource } from "@/types/api";
import type { Database } from "@/types/database";

type RumorRow = Database["public"]["Tables"]["entity_rumors"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];

const CRED = new Set(["confirmado", "probable", "dudoso", "falso"]);

async function loadRumorPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<EntityRumorWithSource | null> {
  const { data: row, error } = await table(supabase, "entity_rumors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return null;
  const r = row as RumorRow;

  if (!r.source_entity_id) {
    return { ...r, source_entity: null };
  }

  const { data: ent, error: eErr } = await table(supabase, "entities")
    .select("*")
    .eq("id", r.source_entity_id)
    .maybeSingle();

  if (eErr || !ent) return { ...r, source_entity: null };

  const e = ent as EntityRow;
  const { data: typ, error: tErr } = await table(supabase, "entity_types")
    .select("*")
    .eq("id", e.entity_type_id)
    .maybeSingle();

  if (tErr || !typ) return { ...r, source_entity: null };

  return {
    ...r,
    source_entity: { ...e, entity_type: typ as EntityTypeRow },
  };
}

type PatchBody = {
  content?: string;
  source_entity_id?: string | null;
  year?: number | null;
  credibility?: string;
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
      "entity_rumors"
    )
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Rumor no encontrado");

    const update: Database["public"]["Tables"]["entity_rumors"]["Update"] = {};

    if (body.content !== undefined) {
      const c = String(body.content).trim();
      if (!c) return badRequest("content no puede estar vacío");
      update.content = c;
    }

    if (body.source_entity_id !== undefined) {
      if (body.source_entity_id === null) {
        update.source_entity_id = null;
      } else {
        const sid = String(body.source_entity_id).trim();
        if (!sid) {
          update.source_entity_id = null;
        } else {
          const { data: src, error: sErr } = await table(supabase, "entities")
            .select("id")
            .eq("id", sid)
            .maybeSingle();
          if (sErr) return internalError(sErr.message, { code: sErr.code });
          if (!src) return badRequest("source_entity_id no existe");
          update.source_entity_id = sid;
        }
      }
    }

    if (body.year !== undefined) {
      update.year =
        body.year === null
          ? null
          : typeof body.year === "number" && Number.isFinite(body.year)
            ? Math.trunc(body.year)
            : null;
    }

    if (body.credibility !== undefined) {
      const cr = String(body.credibility);
      if (!CRED.has(cr)) return badRequest("credibility inválido");
      update.credibility = cr;
    }

    if (Object.keys(update).length === 0) {
      const p = await loadRumorPayload(supabase, id);
      if (!p) return internalError("No se pudo cargar el rumor");
      return jsonOk(p);
    }

    const { error: upErr } = await table(supabase, "entity_rumors")
      .update(update as never)
      .eq("id", id);

    if (upErr) return internalError(upErr.message, { code: upErr.code });

    const payload = await loadRumorPayload(supabase, id);
    if (!payload) return internalError("No se pudo cargar el rumor actualizado");

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
      "entity_rumors"
    )
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Rumor no encontrado");

    const { error: delErr } = await table(supabase, "entity_rumors")
      .delete()
      .eq("id", id);

    if (delErr) return internalError(delErr.message, { code: delErr.code });

    return jsonOk({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
