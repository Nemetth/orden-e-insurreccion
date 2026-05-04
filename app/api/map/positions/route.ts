import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  internalError,
  jsonCreated,
  jsonOk,
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

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: posRows, error: pErr } = await table(
      supabase,
      "entity_map_positions"
    ).select("*");

    if (pErr) {
      return internalError(pErr.message, { code: pErr.code });
    }

    const positions = (posRows ?? []) as PosRow[];
    if (positions.length === 0) {
      return jsonOk<EntityMapPositionWithEntity[]>([]);
    }

    const entIds = positions.map((p) => p.entity_id);
    const { data: ents, error: eErr } = await table(supabase, "entities")
      .select("*")
      .in("id", entIds);

    if (eErr || !ents) {
      return internalError(eErr?.message ?? "No se pudieron cargar entidades");
    }

    const entList = ents as EntityRow[];
    const typeIds = Array.from(new Set(entList.map((e) => e.entity_type_id)));
    const { data: types, error: tErr } = await table(supabase, "entity_types")
      .select("*")
      .in("id", typeIds);

    if (tErr || !types) {
      return internalError(tErr?.message ?? "Tipos no encontrados");
    }

    const typeMap = new Map((types as EntityTypeRow[]).map((t) => [t.id, t]));
    const entMap = new Map<string, EntityRow & { entity_type: EntityTypeRow }>();

    for (const e of entList) {
      const et = typeMap.get(e.entity_type_id);
      if (!et) {
        return internalError(`Tipo ausente para entidad ${e.id}`);
      }
      entMap.set(e.id, { ...e, entity_type: et });
    }

    const out: EntityMapPositionWithEntity[] = [];
    for (const p of positions) {
      const entity = entMap.get(p.entity_id);
      if (!entity) continue;
      out.push({ ...p, entity });
    }

    return jsonOk(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

type PostBody = {
  entity_id?: string;
  lat?: number;
  lng?: number;
};

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<PostBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const entityId =
      typeof body.entity_id === "string" ? body.entity_id.trim() : "";
    if (!entityId) return badRequest("entity_id es obligatorio");

    const lat = body.lat;
    const lng = body.lng;
    if (typeof lat !== "number" || !Number.isFinite(lat)) {
      return badRequest("lat inválido");
    }
    if (typeof lng !== "number" || !Number.isFinite(lng)) {
      return badRequest("lng inválido");
    }

    const supabase = await createClient();

    const { data: ent, error: entErr } = await table(supabase, "entities")
      .select("id")
      .eq("id", entityId)
      .maybeSingle();

    if (entErr) return internalError(entErr.message, { code: entErr.code });
    if (!ent) return badRequest("entity_id no existe");

    const insert: Database["public"]["Tables"]["entity_map_positions"]["Insert"] =
      {
        entity_id: entityId,
        lat,
        lng,
      };

    const { data: row, error } = await table(supabase, "entity_map_positions")
      .upsert(insert as never, { onConflict: "entity_id" })
      .select("*")
      .single();

    if (error) {
      return internalError(error.message, { code: error.code });
    }

    const payload = await loadPositionPayload(
      supabase,
      (row as PosRow).id
    );
    if (!payload) {
      return internalError("No se pudo cargar la posición");
    }

    return jsonCreated(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
