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
import type { EntityHistoryValueWithType } from "@/types/api";
import type { Database } from "@/types/database";

type HistValRow = Database["public"]["Tables"]["entity_history_values"]["Row"];
type HistAttrRow = Database["public"]["Tables"]["history_attribute_types"]["Row"];
type YearRow = Database["public"]["Tables"]["entity_history_years"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];

type PostBody = { history_attribute_type_id?: string };

async function loadValuePayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  valueId: string
): Promise<EntityHistoryValueWithType | null> {
  const { data: v, error: vErr } = await table(supabase, "entity_history_values")
    .select("*")
    .eq("id", valueId)
    .maybeSingle();

  if (vErr || !v) return null;

  const vr = v as HistValRow;

  const { data: hat, error: hErr } = await table(
    supabase,
    "history_attribute_types"
  )
    .select("*")
    .eq("id", vr.history_attribute_type_id)
    .maybeSingle();

  if (hErr || !hat) return null;

  return {
    ...vr,
    history_attribute_type: hat as HistAttrRow,
  };
}

export async function POST(
  request: Request,
  context: { params: { yearId: string } }
) {
  try {
    const { yearId } = context.params;
    const body = await readJsonBody<PostBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const attrId =
      typeof body.history_attribute_type_id === "string"
        ? body.history_attribute_type_id.trim()
        : "";

    if (!attrId) return badRequest("history_attribute_type_id es obligatorio");

    const supabase = await createClient();

    const { data: yearRow, error: yErr } = await table(
      supabase,
      "entity_history_years"
    )
      .select("*")
      .eq("id", yearId)
      .maybeSingle();

    if (yErr) return internalError(yErr.message, { code: yErr.code });
    if (!yearRow) return notFound("Año histórico no encontrado");

    const yr = yearRow as YearRow;

    const { data: ent, error: eErr } = await table(supabase, "entities")
      .select("*")
      .eq("id", yr.entity_id)
      .maybeSingle();

    if (eErr || !ent) return notFound("Entidad no encontrada");

    const entRow = ent as EntityRow;

    const { data: hat, error: hErr } = await table(
      supabase,
      "history_attribute_types"
    )
      .select("*")
      .eq("id", attrId)
      .maybeSingle();

    if (hErr) return internalError(hErr.message, { code: hErr.code });
    if (!hat) return notFound("Tipo de atributo histórico no encontrado");

    const hatRow = hat as HistAttrRow;

    if (hatRow.entity_type_id !== entRow.entity_type_id) {
      return badRequest(
        "El atributo histórico no pertenece al tipo de esta entidad"
      );
    }

    const { data: existing, error: exErr } = await table(
      supabase,
      "entity_history_values"
    )
      .select("id")
      .eq("history_year_id", yearId)
      .eq("history_attribute_type_id", attrId)
      .maybeSingle();

    if (exErr) return internalError(exErr.message, { code: exErr.code });

    if (existing) {
      const payload = await loadValuePayload(
        supabase,
        (existing as { id: string }).id
      );
      if (!payload) {
        return internalError("No se pudo cargar el valor existente");
      }
      return jsonOk(payload);
    }

    const insert: Database["public"]["Tables"]["entity_history_values"]["Insert"] =
      {
        history_year_id: yearId,
        history_attribute_type_id: attrId,
        value_text: null,
        value_number: null,
        value_boolean: null,
        value_date: null,
      };

    const { data: inserted, error: insErr } = await table(
      supabase,
      "entity_history_values"
    )
      .insert(insert as never)
      .select("*")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        const { data: again } = await table(supabase, "entity_history_values")
          .select("id")
          .eq("history_year_id", yearId)
          .eq("history_attribute_type_id", attrId)
          .maybeSingle();
        if (again) {
          const payload = await loadValuePayload(
            supabase,
            (again as { id: string }).id
          );
          if (payload) return jsonOk(payload);
        }
      }
      return internalError(insErr.message, { code: insErr.code });
    }

    const payload = await loadValuePayload(
      supabase,
      (inserted as HistValRow).id
    );
    if (!payload) {
      return internalError("No se pudo cargar el valor creado");
    }

    return jsonCreated(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
