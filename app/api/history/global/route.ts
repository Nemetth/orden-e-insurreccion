import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/supabase/tables";
import { internalError, jsonOk } from "@/lib/api/http";
import type {
  EntityHistoryValueWithType,
  GlobalHistoryPayload,
  GlobalHistoryYearEntry,
} from "@/types/api";
import type { Database } from "@/types/database";

type YearRow = Database["public"]["Tables"]["entity_history_years"]["Row"];
type HistValRow = Database["public"]["Tables"]["entity_history_values"]["Row"];
type HistAttrRow = Database["public"]["Tables"]["history_attribute_types"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
type EntityTypeRow = Database["public"]["Tables"]["entity_types"]["Row"];

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: yearRows, error: yErr } = await table(
      supabase,
      "entity_history_years"
    )
      .select("*")
      .order("year", { ascending: true });

    if (yErr) return internalError(yErr.message, { code: yErr.code });

    const years = (yearRows ?? []) as YearRow[];
    if (years.length === 0) {
      return jsonOk<GlobalHistoryPayload>([]);
    }

    const yearIds = years.map((y) => y.id);
    const entityIds = Array.from(new Set(years.map((y) => y.entity_id)));

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

    const { data: entRows, error: eErr } = await table(supabase, "entities")
      .select("*")
      .in("id", entityIds);

    if (eErr) return internalError(eErr.message, { code: eErr.code });

    const entities = (entRows ?? []) as EntityRow[];
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    const typeIds = Array.from(new Set(entities.map((e) => e.entity_type_id)));

    let typeRows: EntityTypeRow[] = [];
    if (typeIds.length > 0) {
      const { data: tr, error: tErr } = await table(supabase, "entity_types")
        .select("*")
        .in("id", typeIds);

      if (tErr) return internalError(tErr.message, { code: tErr.code });
      typeRows = (tr ?? []) as EntityTypeRow[];
    }

    const typeMap = new Map(typeRows.map((t) => [t.id, t]));

    const payload: GlobalHistoryPayload = years
      .map((y): GlobalHistoryYearEntry | null => {
        const entity = entityMap.get(y.entity_id);
        if (!entity) return null;
        const entity_type = typeMap.get(entity.entity_type_id);
        if (!entity_type) return null;
        return {
          ...y,
          values: valuesByYear.get(y.id) ?? [],
          entity,
          entity_type,
        };
      })
      .filter((x): x is GlobalHistoryYearEntry => x !== null);

    return jsonOk(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return internalError(msg);
  }
}
