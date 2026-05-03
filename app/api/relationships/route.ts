import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { slugifyRelationKey } from "@/lib/api/slug";
import {
  badRequest,
  internalError,
  jsonCreated,
  jsonOk,
  readJsonBody,
} from "@/lib/api/http";
import type { RelationshipWithEntities } from "@/types/api";
import type { Database } from "@/types/database";

type RelationshipRow = Database["public"]["Tables"]["relationships"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];

type PostRelationshipBody = {
  source_entity_id?: string;
  target_entity_id?: string;
  label?: string;
  relation_key?: string;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: rels, error: relErr } = await table(supabase, "relationships")
      .select("*")
      .order("created_at", { ascending: false });

    if (relErr) {
      return internalError(relErr.message, { code: relErr.code });
    }

    const list = (rels ?? []) as RelationshipRow[];
    if (list.length === 0) {
      return jsonOk<RelationshipWithEntities[]>([]);
    }

    const ids = new Set<string>();
    for (const r of list) {
      ids.add(r.source_entity_id);
      ids.add(r.target_entity_id);
    }

    const { data: ents, error: entErr } = await table(supabase, "entities")
      .select("*")
      .in("id", Array.from(ids));

    if (entErr) {
      return internalError(entErr.message, { code: entErr.code });
    }

    const typeIds = Array.from(
      new Set(((ents ?? []) as EntityRow[]).map((e) => e.entity_type_id))
    );

    const { data: types, error: typeErr } = await table(supabase, "entity_types")
      .select("*")
      .in("id", typeIds);

    if (typeErr) {
      return internalError(typeErr.message, { code: typeErr.code });
    }

    const typeMap = new Map<string, EntityTypeRow>();
    for (const t of (types ?? []) as EntityTypeRow[]) typeMap.set(t.id, t);

    const entMap = new Map<
      string,
      EntityRow & { entity_type: EntityTypeRow }
    >();

    for (const e of (ents ?? []) as EntityRow[]) {
      const et = typeMap.get(e.entity_type_id);
      if (!et) {
        return internalError(`Tipo ausente para entidad ${e.id}`);
      }
      entMap.set(e.id, { ...e, entity_type: et });
    }

    const data: RelationshipWithEntities[] = list.map((r) => {
      const source_entity = entMap.get(r.source_entity_id);
      const target_entity = entMap.get(r.target_entity_id);
      if (!source_entity || !target_entity) {
        throw new Error("Entidad referenciada por relación no encontrada");
      }
      return {
        ...r,
        source_entity,
        target_entity,
      };
    });

    return jsonOk(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<PostRelationshipBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const source =
      typeof body.source_entity_id === "string"
        ? body.source_entity_id.trim()
        : "";
    const target =
      typeof body.target_entity_id === "string"
        ? body.target_entity_id.trim()
        : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";

    if (!source) return badRequest("source_entity_id es obligatorio");
    if (!target) return badRequest("target_entity_id es obligatorio");
    if (!label) return badRequest("label es obligatorio");

    const relationKeyRaw =
      typeof body.relation_key === "string" && body.relation_key.trim()
        ? body.relation_key.trim()
        : slugifyRelationKey(label);

    const supabase = await createClient();

    const { data: srcEnt, error: srcErr } = await table(supabase, "entities")
      .select("id")
      .eq("id", source)
      .maybeSingle();

    if (srcErr) {
      return internalError(srcErr.message, { code: srcErr.code });
    }
    if (!srcEnt) return badRequest("source_entity_id no existe");

    const { data: tgtEnt, error: tgtErr } = await table(supabase, "entities")
      .select("id")
      .eq("id", target)
      .maybeSingle();

    if (tgtErr) {
      return internalError(tgtErr.message, { code: tgtErr.code });
    }
    if (!tgtEnt) return badRequest("target_entity_id no existe");

    const insertRel: Database["public"]["Tables"]["relationships"]["Insert"] = {
      source_entity_id: source,
      target_entity_id: target,
      relation_key: relationKeyRaw,
      label,
    };

    const { data: row, error: insErr } = await table(supabase, "relationships")
      .insert(insertRel as never)
      .select("*")
      .single();

    if (insErr) {
      return internalError(insErr.message, { code: insErr.code });
    }

    const relRow = row as RelationshipRow;

    const ids = new Set([relRow.source_entity_id, relRow.target_entity_id]);
    const { data: ents, error: entErr } = await table(supabase, "entities")
      .select("*")
      .in("id", Array.from(ids));

    if (entErr || !ents || ents.length !== 2) {
      return internalError(entErr?.message ?? "No se pudieron cargar las entidades");
    }

    const entRows = ents as EntityRow[];

    const typeIds = Array.from(new Set(entRows.map((e) => e.entity_type_id)));
    const { data: types, error: typeErr } = await table(supabase, "entity_types")
      .select("*")
      .in("id", typeIds);

    if (typeErr || !types || types.length === 0) {
      return internalError(typeErr?.message ?? "Tipos no encontrados");
    }

    const typeMap = new Map(
      (types as EntityTypeRow[]).map((t) => [t.id, t] as const)
    );
    const byId = new Map(entRows.map((e) => [e.id, e] as const));

    const sEnt = byId.get(relRow.source_entity_id)!;
    const tEnt = byId.get(relRow.target_entity_id)!;
    const sType = typeMap.get(sEnt.entity_type_id)!;
    const tType = typeMap.get(tEnt.entity_type_id)!;

    const payload: RelationshipWithEntities = {
      ...relRow,
      source_entity: { ...sEnt, entity_type: sType },
      target_entity: { ...tEnt, entity_type: tType },
    };

    return jsonCreated(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
