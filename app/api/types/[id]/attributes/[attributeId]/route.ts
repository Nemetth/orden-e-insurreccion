import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { emptyColumnsForType } from "@/lib/api/values";
import {
  badRequest,
  conflict,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { AttributeValueType, Database, Json } from "@/types/database";

type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];

const VALUE_TYPES: AttributeValueType[] = [
  "text",
  "long_text",
  "number",
  "boolean",
  "date",
  "json",
  "entity_ref",
];

function isValueType(v: string): v is AttributeValueType {
  return (VALUE_TYPES as string[]).includes(v);
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

type PatchAttributeBody = {
  key?: string;
  label?: string;
  value_type?: AttributeValueType;
  is_required?: boolean;
  sort_order?: number;
  meta?: Json;
};

export async function PATCH(
  request: Request,
  context: { params: { id: string; attributeId: string } }
) {
  try {
    const { id: entityTypeId, attributeId } = context.params;
    const body = await readJsonBody<PatchAttributeBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(supabase, "attributes")
      .select("*")
      .eq("id", attributeId)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!existing) return notFound("Atributo no encontrado");

    const row = existing as AttributeRow;
    if (row.entity_type_id !== entityTypeId) {
      return badRequest("Este atributo no pertenece al tipo indicado");
    }

    const update: Database["public"]["Tables"]["attributes"]["Update"] = {};

    if (body.key !== undefined) {
      const k = normalizeKey(body.key);
      if (!k) return badRequest("key no puede quedar vacío");
      update.key = k;
    }
    if (body.label !== undefined) {
      const lab = typeof body.label === "string" ? body.label.trim() : "";
      if (!lab) return badRequest("label no puede quedar vacío");
      update.label = lab;
    }
    if (body.value_type !== undefined) {
      if (typeof body.value_type !== "string" || !isValueType(body.value_type)) {
        return badRequest("value_type inválido", { allowed: VALUE_TYPES });
      }
      update.value_type = body.value_type;
    }
    if (body.is_required !== undefined) {
      update.is_required = Boolean(body.is_required);
    }
    if (body.sort_order !== undefined) {
      if (typeof body.sort_order !== "number" || !Number.isFinite(body.sort_order)) {
        return badRequest("sort_order inválido");
      }
      update.sort_order = body.sort_order;
    }
    if (body.meta !== undefined) {
      update.meta = body.meta;
    }

    if (Object.keys(update).length === 0) {
      return badRequest("Nada que actualizar");
    }

    const valueTypeChanged =
      body.value_type !== undefined && body.value_type !== row.value_type;

    const { data: updated, error: updErr } = await table(supabase, "attributes")
      .update(update as never)
      .eq("id", attributeId)
      .select("*")
      .single();

    if (updErr) {
      if (updErr.code === "23505") {
        return conflict("Ya existe un atributo con esa key en este tipo", {
          code: updErr.code,
        });
      }
      return internalError(updErr.message, { code: updErr.code });
    }

    if (valueTypeChanged) {
      const cleared = emptyColumnsForType();
      const { error: clearErr } = await table(supabase, "entity_values")
        .update(cleared as never)
        .eq("attribute_id", attributeId);

      if (clearErr) {
        return internalError(clearErr.message, { code: clearErr.code });
      }
    }

    return jsonOk(updated as AttributeRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string; attributeId: string } }
) {
  try {
    const { id: entityTypeId, attributeId } = context.params;
    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(supabase, "attributes")
      .select("id, entity_type_id")
      .eq("id", attributeId)
      .maybeSingle();

    if (loadErr) {
      return internalError(loadErr.message, { code: loadErr.code });
    }
    if (!existing) return notFound("Atributo no encontrado");

    const row = existing as Pick<AttributeRow, "id" | "entity_type_id">;
    if (row.entity_type_id !== entityTypeId) {
      return badRequest("Este atributo no pertenece al tipo indicado");
    }

    const { error: delErr } = await table(supabase, "attributes")
      .delete()
      .eq("id", attributeId);

    if (delErr) {
      return internalError(delErr.message, { code: delErr.code });
    }

    return jsonOk({ id: attributeId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
