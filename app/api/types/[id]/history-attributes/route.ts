import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import {
  badRequest,
  conflict,
  internalError,
  jsonCreated,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { HistoryAttributeValueType, Database } from "@/types/database";

type HistAttrRow = Database["public"]["Tables"]["history_attribute_types"]["Row"];

type PostBody = {
  key?: string;
  label?: string;
  value_type?: string;
};

const VALUE_TYPES: HistoryAttributeValueType[] = [
  "text",
  "long_text",
  "number",
  "boolean",
  "date",
];

function isHistoryValueType(v: string): v is HistoryAttributeValueType {
  return (VALUE_TYPES as string[]).includes(v);
}

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: typeId } = context.params;
    const supabase = await createClient();

    const { data: typeRow, error: tErr } = await table(supabase, "entity_types")
      .select("id")
      .eq("id", typeId)
      .maybeSingle();

    if (tErr) return internalError(tErr.message, { code: tErr.code });
    if (!typeRow) return notFound("Tipo de entidad no encontrado");

    const { data: rows, error } = await table(supabase, "history_attribute_types")
      .select("*")
      .eq("entity_type_id", typeId)
      .order("label", { ascending: true });

    if (error) return internalError(error.message, { code: error.code });

    return jsonOk<HistAttrRow[]>((rows ?? []) as HistAttrRow[]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id: typeId } = context.params;
    const body = await readJsonBody<PostBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const key = typeof body.key === "string" ? body.key.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const vtRaw = body.value_type;

    if (!key) return badRequest("key es obligatorio");
    if (!label) return badRequest("label es obligatorio");
    if (typeof vtRaw !== "string" || !isHistoryValueType(vtRaw)) {
      return badRequest("value_type inválido", { allowed: VALUE_TYPES });
    }

    const supabase = await createClient();

    const { data: typeRow, error: tErr } = await table(supabase, "entity_types")
      .select("id")
      .eq("id", typeId)
      .maybeSingle();

    if (tErr) return internalError(tErr.message, { code: tErr.code });
    if (!typeRow) return notFound("Tipo de entidad no encontrado");

    const insert: Database["public"]["Tables"]["history_attribute_types"]["Insert"] =
      {
        entity_type_id: typeId,
        key,
        label,
        value_type: vtRaw,
      };

    const { data: row, error: insErr } = await table(
      supabase,
      "history_attribute_types"
    )
      .insert(insert as never)
      .select("*")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        return conflict("Ya existe un atributo histórico con esa key en este tipo");
      }
      return internalError(insErr.message, { code: insErr.code });
    }

    return jsonCreated<HistAttrRow>(row as HistAttrRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
