import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { emptyColumnsForType } from "@/lib/api/values";
import {
  badRequest,
  internalError,
  jsonCreated,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { EntityWithTypeAndValues } from "@/types/api";
import type { Database } from "@/types/database";

type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];
type EntityValueRow = Database["public"]["Tables"]["entity_values"]["Row"];
type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];

type PostEntityBody = {
  entity_type_id?: string;
  name?: string;
  slug?: string | null;
  summary?: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: entities, error: entError } = await table(supabase, "entities")
      .select("*")
      .order("created_at", { ascending: false });

    if (entError) {
      return internalError(entError.message, { code: entError.code });
    }

    const list = (entities ?? []) as EntityRow[];
    if (list.length === 0) {
      return jsonOk<EntityWithTypeAndValues[]>([]);
    }

    const typeIds = Array.from(new Set(list.map((e) => e.entity_type_id)));

    const { data: types, error: typesError } = await table(supabase, "entity_types")
      .select("*")
      .in("id", typeIds);

    if (typesError) {
      return internalError(typesError.message, { code: typesError.code });
    }

    const typeMap = new Map<string, EntityTypeRow>();
    for (const t of (types ?? []) as EntityTypeRow[]) typeMap.set(t.id, t);

    const entityIds = list.map((e) => e.id);

    let valueRows: EntityValueRow[] = [];
    if (entityIds.length > 0) {
      const { data: ev, error: valError } = await table(supabase, "entity_values")
        .select("*")
        .in("entity_id", entityIds);

      if (valError) {
        return internalError(valError.message, { code: valError.code });
      }
      valueRows = (ev ?? []) as EntityValueRow[];
    }

    const attrIds = Array.from(new Set(valueRows.map((v) => v.attribute_id)));

    let attrRows: AttributeRow[] = [];
    if (attrIds.length > 0) {
      const { data: ar, error: aErr } = await table(supabase, "attributes")
        .select("*")
        .in("id", attrIds);

      if (aErr) {
        return internalError(aErr.message, { code: aErr.code });
      }
      attrRows = (ar ?? []) as AttributeRow[];
    }

    const attrMap = new Map<string, AttributeRow>();
    for (const a of attrRows) attrMap.set(a.id, a);

    const valuesByEntity = new Map<
      string,
      Array<EntityValueRow & { attribute: AttributeRow }>
    >();

    for (const ev of valueRows) {
      const attr = attrMap.get(ev.attribute_id);
      if (!attr) continue;
      const row = { ...ev, attribute: attr };
      const bucket = valuesByEntity.get(ev.entity_id) ?? [];
      bucket.push(row);
      valuesByEntity.set(ev.entity_id, bucket);
    }

    const data: EntityWithTypeAndValues[] = list.map((ent) => {
      const entityType = typeMap.get(ent.entity_type_id);
      if (!entityType) {
        throw new Error(`Tipo faltante para entidad ${ent.id}`);
      }
      const rawValues = valuesByEntity.get(ent.id) ?? [];
      rawValues.sort(
        (a, b) =>
          a.attribute.sort_order - b.attribute.sort_order ||
          a.attribute.key.localeCompare(b.attribute.key)
      );
      return {
        ...ent,
        entity_type: entityType,
        values: rawValues,
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
    const body = await readJsonBody<PostEntityBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const entityTypeId =
      typeof body.entity_type_id === "string" ? body.entity_type_id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!entityTypeId) return badRequest("entity_type_id es obligatorio");
    if (!name) return badRequest("name es obligatorio");

    const slug =
      body.slug === undefined || body.slug === null
        ? null
        : String(body.slug).trim() || null;
    const summary =
      body.summary === undefined || body.summary === null
        ? null
        : String(body.summary).trim() || null;

    const supabase = await createClient();

    const { data: typeExists, error: typeErr } = await table(
      supabase,
      "entity_types"
    )
      .select("id")
      .eq("id", entityTypeId)
      .maybeSingle();

    if (typeErr) {
      return internalError(typeErr.message, { code: typeErr.code });
    }
    if (!typeExists) return notFound("Tipo de entidad no encontrado");

    const { data: attrs, error: attrErr } = await table(supabase, "attributes")
      .select("*")
      .eq("entity_type_id", entityTypeId);

    if (attrErr) {
      return internalError(attrErr.message, { code: attrErr.code });
    }

    const insertPayload: Database["public"]["Tables"]["entities"]["Insert"] = {
      entity_type_id: entityTypeId,
      name,
      slug,
      summary,
    };

    const { data: entity, error: insertErr } = await table(supabase, "entities")
      .insert(insertPayload as never)
      .select("*")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return internalError("Slug duplicado para este tipo", { code: insertErr.code });
      }
      return internalError(insertErr.message, { code: insertErr.code });
    }

    const entRow = entity as EntityRow;
    const attrListFull = (attrs ?? []) as AttributeRow[];

    const valueInserts = attrListFull.map((a) => ({
      entity_id: entRow.id,
      attribute_id: a.id,
      ...emptyColumnsForType(),
    }));

    if (valueInserts.length > 0) {
      const { error: valInsertErr } = await table(supabase, "entity_values").insert(
        valueInserts as never
      );

      if (valInsertErr) {
        return internalError(valInsertErr.message, { code: valInsertErr.code });
      }
    }

    const { data: entityType } = await table(supabase, "entity_types")
      .select("*")
      .eq("id", entityTypeId)
      .single();

    if (!entityType) {
      return internalError("No se pudo cargar el tipo luego de crear la entidad");
    }

    const { data: valueRows } = await table(supabase, "entity_values")
      .select("*")
      .eq("entity_id", entRow.id);

    const attrList = attrListFull;
    const attrById = new Map(attrList.map((a) => [a.id, a]));

    const values: EntityWithTypeAndValues["values"] = (
      (valueRows ?? []) as EntityValueRow[]
    ).map((ev) => {
        const attribute = attrById.get(ev.attribute_id);
        if (!attribute) {
          throw new Error(`Atributo faltante ${ev.attribute_id}`);
        }
        return { ...ev, attribute };
      });

    values.sort(
      (a, b) =>
        a.attribute.sort_order - b.attribute.sort_order ||
        a.attribute.key.localeCompare(b.attribute.key)
    );

    const payload: EntityWithTypeAndValues = {
      ...entRow,
      entity_type: entityType as EntityTypeRow,
      values,
    };

    return jsonCreated(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
