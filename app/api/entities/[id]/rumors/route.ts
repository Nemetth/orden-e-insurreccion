import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  internalError,
  jsonCreated,
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

async function attachSources(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: RumorRow[]
): Promise<EntityRumorWithSource[]> {
  const srcIds = Array.from(
    new Set(
      rows
        .map((r) => r.source_entity_id)
        .filter((x): x is string => !!x)
    )
  );
  if (srcIds.length === 0) {
    return rows.map((r) => ({ ...r, source_entity: null }));
  }

  const { data: ents, error: entErr } = await table(supabase, "entities")
    .select("*")
    .in("id", srcIds);

  if (entErr || !ents) {
    throw new Error(entErr?.message ?? "No se pudieron cargar fuentes");
  }

  const entRows = ents as EntityRow[];
  const typeIds = Array.from(new Set(entRows.map((e) => e.entity_type_id)));
  const { data: types, error: typeErr } = await table(supabase, "entity_types")
    .select("*")
    .in("id", typeIds);

  if (typeErr || !types) {
    throw new Error(typeErr?.message ?? "Tipos no encontrados");
  }

  const typeMap = new Map((types as EntityTypeRow[]).map((t) => [t.id, t]));
  const entMap = new Map<string, EntityRow & { entity_type: EntityTypeRow }>();

  for (const e of entRows) {
    const et = typeMap.get(e.entity_type_id);
    if (!et) throw new Error(`Tipo ausente para entidad ${e.id}`);
    entMap.set(e.id, { ...e, entity_type: et });
  }

  return rows.map((r) => ({
    ...r,
    source_entity: r.source_entity_id
      ? entMap.get(r.source_entity_id) ?? null
      : null,
  }));
}

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: entityId } = context.params;
    const supabase = await createClient();

    const { data: ent, error: e0 } = await table(supabase, "entities")
      .select("id")
      .eq("id", entityId)
      .maybeSingle();

    if (e0) return internalError(e0.message, { code: e0.code });
    if (!ent) return notFound("Entidad no encontrada");

    const { data: rows, error } = await table(supabase, "entity_rumors")
      .select("*")
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    if (error) return internalError(error.message, { code: error.code });

    const list = (rows ?? []) as RumorRow[];
    const payload = await attachSources(supabase, list);
    return jsonOk(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

type PostBody = {
  content?: string;
  source_entity_id?: string | null;
  year?: number | null;
  credibility?: string;
};

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: entityId } = context.params;
    const body = await readJsonBody<PostBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return badRequest("content es obligatorio");

    const credibility =
      typeof body.credibility === "string" && CRED.has(body.credibility)
        ? body.credibility
        : "dudoso";

    const supabase = await createClient();

    const { data: ent, error: e0 } = await table(supabase, "entities")
      .select("id")
      .eq("id", entityId)
      .maybeSingle();

    if (e0) return internalError(e0.message, { code: e0.code });
    if (!ent) return badRequest("entity_id no existe");

    let sourceId: string | null = null;
    if (body.source_entity_id !== undefined && body.source_entity_id !== null) {
      const sid = String(body.source_entity_id).trim();
      if (sid) {
        const { data: src, error: sErr } = await table(supabase, "entities")
          .select("id")
          .eq("id", sid)
          .maybeSingle();
        if (sErr) return internalError(sErr.message, { code: sErr.code });
        if (!src) return badRequest("source_entity_id no existe");
        sourceId = sid;
      }
    }

    const year =
      body.year === undefined || body.year === null
        ? null
        : typeof body.year === "number" && Number.isFinite(body.year)
          ? Math.trunc(body.year)
          : null;

    const insert: Database["public"]["Tables"]["entity_rumors"]["Insert"] = {
      entity_id: entityId,
      source_entity_id: sourceId,
      content,
      year,
      credibility,
    };

    const { data: row, error } = await table(supabase, "entity_rumors")
      .insert(insert as never)
      .select("*")
      .single();

    if (error) return internalError(error.message, { code: error.code });

    const [withSrc] = await attachSources(supabase, [row as RumorRow]);
    return jsonCreated(withSrc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
