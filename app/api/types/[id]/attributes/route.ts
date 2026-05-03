import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { emptyColumnsForType } from "@/lib/api/values";
import {
  badRequest,
  conflict,
  internalError,
  jsonCreated,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { AttributeValueType, Database, Json } from "@/types/database";

type AttributeRow = Database["public"]["Tables"]["attributes"]["Row"];

type PostAttributeBody = {
  key?: string;
  label?: string;
  value_type?: AttributeValueType;
  is_required?: boolean;
  sort_order?: number;
  meta?: Json;
};

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

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: entityTypeId } = context.params;

    const body = await readJsonBody<PostAttributeBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const key = typeof body.key === "string" ? body.key.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const valueTypeRaw = body.value_type;

    if (!key) return badRequest("key es obligatorio");
    if (!label) return badRequest("label es obligatorio");
    if (typeof valueTypeRaw !== "string" || !isValueType(valueTypeRaw)) {
      return badRequest("value_type inválido", { allowed: VALUE_TYPES });
    }

    const supabase = await createClient();

    const { data: typeRow, error: typeError } = await table(
      supabase,
      "entity_types"
    )
      .select("id")
      .eq("id", entityTypeId)
      .maybeSingle();

    if (typeError) {
      return internalError(typeError.message, { code: typeError.code });
    }
    if (!typeRow) return notFound("Tipo de entidad no encontrado");

    let sortOrder =
      typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
        ? body.sort_order
        : null;

    if (sortOrder === null) {
      const { data: maxRow } = await table(supabase, "attributes")
        .select("sort_order")
        .eq("entity_type_id", entityTypeId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      sortOrder =
        ((maxRow as Pick<AttributeRow, "sort_order"> | null)?.sort_order ??
          -1) + 1;
    }

    const insertAttr: Database["public"]["Tables"]["attributes"]["Insert"] = {
      entity_type_id: entityTypeId,
      key,
      label,
      value_type: valueTypeRaw,
      is_required: Boolean(body.is_required),
      sort_order: sortOrder,
      meta: body.meta ?? {},
    };

    const { data: attr, error: insertError } = await table(supabase, "attributes")
      .insert(insertAttr as never)
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return conflict("Ya existe un atributo con esa key en este tipo", {
          code: insertError.code,
        });
      }
      return internalError(insertError.message, { code: insertError.code });
    }

    const { data: entities, error: entError } = await table(supabase, "entities")
      .select("id")
      .eq("entity_type_id", entityTypeId);

    if (entError) {
      return internalError(entError.message, { code: entError.code });
    }

    const attrRow = attr as AttributeRow;

    const rows =
      ((entities ?? []) as { id: string }[]).map((e) => ({
        entity_id: e.id,
        attribute_id: attrRow.id,
        ...emptyColumnsForType(),
      }));

    if (rows.length > 0) {
      const { error: valuesError } = await table(supabase, "entity_values").insert(
        rows as never
      );
      if (valuesError) {
        return internalError(valuesError.message, { code: valuesError.code });
      }
    }

    return jsonCreated(attrRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
