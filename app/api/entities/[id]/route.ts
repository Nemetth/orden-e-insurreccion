import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { entityNameTaken } from "@/lib/api/entity-name";
import {
  badRequest,
  conflict,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { EntityWithTypeAndValues } from "@/types/api";
import type { Database, Json } from "@/types/database";

type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];
type EntityValueRow = Database["public"]["Tables"]["entity_values"]["Row"];
type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];

type ValuePatchItem = {
  attribute_id: string;
  value_text?: string | null;
  value_numeric?: number | string | null;
  value_boolean?: boolean | null;
  value_timestamptz?: string | null;
  value_json?: Json | null;
  ref_entity_id?: string | null;
};

type PatchEntityBody = {
  name?: string;
  slug?: string | null;
  summary?: string | null;
  meta?: Json;
  values?: ValuePatchItem[];
};

function mergeValueColumns(
  patch: ValuePatchItem
): Database["public"]["Tables"]["entity_values"]["Update"] {
  const out: Database["public"]["Tables"]["entity_values"]["Update"] = {};
  const keys = [
    "value_text",
    "value_numeric",
    "value_boolean",
    "value_timestamptz",
    "value_json",
    "ref_entity_id",
  ] as const;

  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      const v = patch[k];
      if (k === "value_numeric" && typeof v === "number") {
        out[k] = String(v);
      } else {
        out[k] = v as never;
      }
    }
  }
  return out;
}

async function loadEntityPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string
): Promise<EntityWithTypeAndValues | null> {
  const { data: entity, error: e1 } = await table(supabase, "entities")
    .select("*")
    .eq("id", entityId)
    .maybeSingle();

  if (e1 || !entity) return null;

  const ent = entity as EntityRow;

  const { data: entityType, error: e2 } = await table(supabase, "entity_types")
    .select("*")
    .eq("id", ent.entity_type_id)
    .maybeSingle();

  if (e2 || !entityType) return null;

  const et = entityType as EntityTypeRow;

  const { data: valueRows, error: e3 } = await table(supabase, "entity_values")
    .select("*")
    .eq("entity_id", entityId);

  if (e3) return null;

  const vals = (valueRows ?? []) as EntityValueRow[];

  const attrIds = Array.from(new Set(vals.map((v) => v.attribute_id)));
  let attrRows: AttributeRow[] = [];

  if (attrIds.length > 0) {
    const { data: ar, error: e4 } = await table(supabase, "attributes")
      .select("*")
      .in("id", attrIds);

    if (e4) return null;
    attrRows = ar ?? [];
  }

  const attrMap = new Map(attrRows.map((a) => [a.id, a]));

  const values: EntityWithTypeAndValues["values"] = vals
    .map((ev) => {
      const attribute = attrMap.get(ev.attribute_id);
      if (!attribute) return null;
      return { ...ev, attribute };
    })
    .filter(Boolean) as EntityWithTypeAndValues["values"];

  values.sort(
    (a, b) =>
      a.attribute.sort_order - b.attribute.sort_order ||
      a.attribute.key.localeCompare(b.attribute.key)
  );

  return {
    ...ent,
    entity_type: et,
    values,
  };
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await readJsonBody<PatchEntityBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const supabase = await createClient();

    const { data: entity, error: loadErr } = await table(supabase, "entities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!entity) return notFound("Entidad no encontrada");

    const entRow = entity as EntityRow;

    const entityUpdate: Database["public"]["Tables"]["entities"]["Update"] = {};

    if (body.name !== undefined) {
      const n = typeof body.name === "string" ? body.name.trim() : "";
      if (!n) return badRequest("name no puede estar vacío");
      const taken = await entityNameTaken(
        supabase,
        entRow.entity_type_id,
        n,
        id
      );
      if (taken) {
        return conflict("Ya existe una entidad con ese nombre en este tipo");
      }
      entityUpdate.name = n;
    }
    if (body.slug !== undefined) {
      entityUpdate.slug =
        body.slug === null ? null : String(body.slug).trim() || null;
    }
    if (body.summary !== undefined) {
      entityUpdate.summary =
        body.summary === null ? null : String(body.summary).trim() || null;
    }
    if (body.meta !== undefined) {
      entityUpdate.meta = body.meta as EntityRow["meta"];
    }

    if (Object.keys(entityUpdate).length > 0) {
      const { error: upErr } = await table(supabase, "entities")
        .update(entityUpdate as never)
        .eq("id", id);

      if (upErr) {
        if (upErr.code === "23505") {
          return badRequest("Slug duplicado para este tipo");
        }
        return internalError(upErr.message, { code: upErr.code });
      }
    }

    if (body.values && body.values.length > 0) {
      const { data: attrs, error: aErr } = await table(supabase, "attributes")
        .select("id")
        .eq("entity_type_id", entRow.entity_type_id);

      if (aErr) {
        return internalError(aErr.message, { code: aErr.code });
      }

      const allowed = new Set(
        ((attrs ?? []) as { id: string }[]).map((a) => a.id)
      );

      for (const patch of body.values) {
        if (!patch.attribute_id || typeof patch.attribute_id !== "string") {
          return badRequest("Cada valor debe incluir attribute_id");
        }
        if (!allowed.has(patch.attribute_id)) {
          return badRequest("attribute_id no pertenece al tipo de esta entidad", {
            attribute_id: patch.attribute_id,
          });
        }

        const { data: existing, error: exErr } = await table(
          supabase,
          "entity_values"
        )
          .select("*")
          .eq("entity_id", id)
          .eq("attribute_id", patch.attribute_id)
          .maybeSingle();

        if (exErr) {
          return internalError(exErr.message, { code: exErr.code });
        }
        if (!existing) {
          return badRequest(
            "No existe fila de valor para ese atributo; creá la entidad después del atributo o re-sync.",
            { attribute_id: patch.attribute_id }
          );
        }

        const existingRow = existing as EntityValueRow;

        const columns = mergeValueColumns(patch);
        if (Object.keys(columns).length === 0) continue;

        const { error: updErr } = await table(supabase, "entity_values")
          .update(columns as never)
          .eq("id", existingRow.id);

        if (updErr) {
          return internalError(updErr.message, { code: updErr.code });
        }
      }
    }

    const payload = await loadEntityPayload(supabase, id);
    if (!payload) {
      return internalError("No se pudo cargar la entidad actualizada");
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

    const { data: existing, error: loadErr } = await table(supabase, "entities")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!existing) return notFound("Entidad no encontrada");

    const { error: delErr } = await table(supabase, "entities")
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
