import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { historyValueUpdateForType } from "@/lib/api/history-value-update";
import {
  badRequest,
  internalError,
  jsonOk,
  notFound,
  readJsonBody,
} from "@/lib/api/http";
import type { HistoryValuePatchBody } from "@/lib/api/history-value-update";
import type { EntityHistoryValueWithType } from "@/types/api";
import type { Database } from "@/types/database";

type HistValRow = Database["public"]["Tables"]["entity_history_values"]["Row"];
type HistAttrRow = Database["public"]["Tables"]["history_attribute_types"]["Row"];

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

export async function PATCH(
  request: Request,
  context: { params: { valueId: string } }
) {
  try {
    const { valueId } = context.params;
    const body = await readJsonBody<HistoryValuePatchBody>(request);
    if (!body) return badRequest("Cuerpo JSON inválido");

    const supabase = await createClient();

    const { data: valRow, error: vErr } = await table(
      supabase,
      "entity_history_values"
    )
      .select("*")
      .eq("id", valueId)
      .maybeSingle();

    if (vErr) return internalError(vErr.message, { code: vErr.code });
    if (!valRow) return notFound("Valor histórico no encontrado");

    const vr = valRow as HistValRow;

    const { data: hat, error: hErr } = await table(
      supabase,
      "history_attribute_types"
    )
      .select("*")
      .eq("id", vr.history_attribute_type_id)
      .maybeSingle();

    if (hErr || !hat) return notFound("Definición de atributo no encontrada");

    const hatRow = hat as HistAttrRow;

    const update = historyValueUpdateForType(hatRow.value_type, body);
    if (!update) {
      return badRequest(
        "Enviá el campo de valor acorde al tipo (value_text, value_number, value_boolean o value_date)"
      );
    }

    const { error: upErr } = await table(supabase, "entity_history_values")
      .update(update as never)
      .eq("id", valueId);

    if (upErr) return internalError(upErr.message, { code: upErr.code });

    const payload = await loadValuePayload(supabase, valueId);
    if (!payload) {
      return internalError("No se pudo cargar el valor actualizado");
    }

    return jsonOk(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { valueId: string } }
) {
  try {
    const { valueId } = context.params;
    const supabase = await createClient();

    const { data: existing, error: loadErr } = await table(
      supabase,
      "entity_history_values"
    )
      .select("id")
      .eq("id", valueId)
      .maybeSingle();

    if (loadErr) return internalError(loadErr.message, { code: loadErr.code });
    if (!existing) return notFound("Valor histórico no encontrado");

    const { error: delErr } = await table(supabase, "entity_history_values")
      .delete()
      .eq("id", valueId);

    if (delErr) return internalError(delErr.message, { code: delErr.code });

    return jsonOk({ id: valueId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
