import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { internalError, jsonOk, notFound } from "@/lib/api/http";
import type { EntityHistoryPayload, EntityHistoryValueWithType } from "@/types/api";
import type { Database } from "@/types/database";

type YearRow = Database["public"]["Tables"]["entity_history_years"]["Row"];
type HistValRow = Database["public"]["Tables"]["entity_history_values"]["Row"];
type HistAttrRow = Database["public"]["Tables"]["history_attribute_types"]["Row"];

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

    const { data: yearRows, error: yErr } = await table(
      supabase,
      "entity_history_years"
    )
      .select("*")
      .eq("entity_id", entityId)
      .order("year", { ascending: true });

    if (yErr) return internalError(yErr.message, { code: yErr.code });

    const years = (yearRows ?? []) as YearRow[];
    if (years.length === 0) {
      return jsonOk<EntityHistoryPayload>({ years: [] });
    }

    const yearIds = years.map((y) => y.id);

    const { data: valRows, error: vErr } = await table(
      supabase,
      "entity_history_values"
    )
      .select("*")
      .in("history_year_id", yearIds);

    if (vErr) return internalError(vErr.message, { code: vErr.code });

    const vals = (valRows ?? []) as HistValRow[];
    const attrIds = Array.from(
      new Set(vals.map((v) => v.history_attribute_type_id))
    );

    let attrRows: HistAttrRow[] = [];
    if (attrIds.length > 0) {
      const { data: ar, error: aErr } = await table(
        supabase,
        "history_attribute_types"
      )
        .select("*")
        .in("id", attrIds);

      if (aErr) return internalError(aErr.message, { code: aErr.code });
      attrRows = (ar ?? []) as HistAttrRow[];
    }

    const attrMap = new Map(attrRows.map((a) => [a.id, a]));

    const valuesByYear = new Map<string, EntityHistoryValueWithType[]>();
    for (const v of vals) {
      const hat = attrMap.get(v.history_attribute_type_id);
      if (!hat) continue;
      const row: EntityHistoryValueWithType = {
        ...v,
        history_attribute_type: hat,
      };
      const bucket = valuesByYear.get(v.history_year_id) ?? [];
      bucket.push(row);
      valuesByYear.set(v.history_year_id, bucket);
    }

    valuesByYear.forEach((list) => {
      list.sort(
        (a, b) =>
          a.history_attribute_type.label.localeCompare(
            b.history_attribute_type.label
          ) ||
          a.history_attribute_type.key.localeCompare(
            b.history_attribute_type.key
          )
      );
    });

    const payload: EntityHistoryPayload = {
      years: years.map((y) => ({
        ...y,
        values: valuesByYear.get(y.id) ?? [],
      })),
    };

    return jsonOk(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
