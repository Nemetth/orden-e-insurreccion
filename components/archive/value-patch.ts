import type { AttributeValueType, Json } from "@/types/database";

export type ValuePatchInput = {
  attribute_id: string;
  value_text?: string | null;
  value_numeric?: number | string | null;
  value_boolean?: boolean | null;
  value_timestamptz?: string | null;
  value_json?: Json | null;
  ref_entity_id?: string | null;
};

export function patchForAttributeInput(
  attributeId: string,
  valueType: AttributeValueType,
  raw: string,
  opts?: { checked?: boolean }
): ValuePatchInput {
  const base: ValuePatchInput = { attribute_id: attributeId };

  switch (valueType) {
    case "text":
    case "long_text":
      return { ...base, value_text: raw === "" ? null : raw };
    case "number": {
      if (raw.trim() === "") return { ...base, value_numeric: null };
      const n = Number(raw);
      return {
        ...base,
        value_numeric: Number.isFinite(n) ? String(n) : null,
      };
    }
    case "boolean":
      return { ...base, value_boolean: opts?.checked ?? false };
    case "date": {
      if (!raw) return { ...base, value_timestamptz: null };
      const iso = new Date(raw).toISOString();
      return { ...base, value_timestamptz: iso };
    }
    case "json": {
      if (!raw.trim()) return { ...base, value_json: null };
      try {
        return { ...base, value_json: JSON.parse(raw) as Json };
      } catch {
        return { ...base, value_json: raw as unknown as Json };
      }
    }
    case "entity_ref":
      return {
        ...base,
        ref_entity_id: raw.trim() === "" ? null : raw.trim(),
      };
    default:
      return { ...base, value_text: raw || null };
  }
}

export function displayValue(
  valueType: AttributeValueType,
  row: {
    value_text: string | null;
    value_numeric: string | null;
    value_boolean: boolean | null;
    value_timestamptz: string | null;
    value_json: Json | null;
    ref_entity_id: string | null;
  }
): string {
  switch (valueType) {
    case "text":
    case "long_text":
      return row.value_text ?? "";
    case "number":
      return row.value_numeric != null ? String(row.value_numeric) : "";
    case "boolean":
      return row.value_boolean === true ? "true" : row.value_boolean === false ? "false" : "";
    case "date":
      if (!row.value_timestamptz) return "";
      try {
        const d = new Date(row.value_timestamptz);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return row.value_timestamptz;
      }
    case "json":
      return row.value_json != null ? JSON.stringify(row.value_json, null, 2) : "";
    case "entity_ref":
      return row.ref_entity_id ?? "";
    default:
      return row.value_text ?? "";
  }
}
