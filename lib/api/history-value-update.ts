import type { Database, HistoryAttributeValueType } from "@/types/database";

type HistValUpdate = Database["public"]["Tables"]["entity_history_values"]["Update"];

export type HistoryValuePatchBody = {
  value_text?: string | null;
  value_number?: number | string | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
};

function clearedColumns(): Pick<
  HistValUpdate,
  "value_text" | "value_number" | "value_boolean" | "value_date"
> {
  return {
    value_text: null,
    value_number: null,
    value_boolean: null,
    value_date: null,
  };
}

/** Construye UPDATE acorde al tipo; exige el campo correspondiente en el body. */
export function historyValueUpdateForType(
  valueType: HistoryAttributeValueType,
  body: HistoryValuePatchBody
): HistValUpdate | null {
  const cleared = clearedColumns();

  switch (valueType) {
    case "text":
    case "long_text": {
      if (!Object.prototype.hasOwnProperty.call(body, "value_text")) return null;
      const v = body.value_text;
      return {
        ...cleared,
        value_text: v === undefined ? null : v === null ? null : String(v),
      };
    }
    case "number": {
      if (!Object.prototype.hasOwnProperty.call(body, "value_number")) return null;
      const raw = body.value_number;
      if (raw === null || raw === undefined || raw === "") {
        return { ...cleared, value_number: null };
      }
      const n = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (!Number.isFinite(n)) {
        return { ...cleared, value_number: null };
      }
      return { ...cleared, value_number: String(n) };
    }
    case "boolean": {
      if (!Object.prototype.hasOwnProperty.call(body, "value_boolean")) return null;
      const b = body.value_boolean;
      return {
        ...cleared,
        value_boolean: b === null ? null : Boolean(b),
      };
    }
    case "date": {
      if (!Object.prototype.hasOwnProperty.call(body, "value_date")) return null;
      const d = body.value_date;
      if (d === null || d === undefined || d === "") {
        return { ...cleared, value_date: null };
      }
      const s = String(d).trim();
      return { ...cleared, value_date: s };
    }
    default:
      return null;
  }
}
