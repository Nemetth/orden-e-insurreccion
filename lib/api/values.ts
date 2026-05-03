/** Payload normalizado para upsert de entity_values según value_type del atributo. */
export type EntityValuePayload = {
  value_text?: string | null;
  value_numeric?: number | null;
  value_boolean?: boolean | null;
  value_timestamptz?: string | null;
  value_json?: unknown | null;
  ref_entity_id?: string | null;
};

/** Filas nuevas con todas las columnas de valor en null. */
export function emptyColumnsForType(): EntityValuePayload {
  return {
    value_text: null,
    value_numeric: null,
    value_boolean: null,
    value_timestamptz: null,
    value_json: null,
    ref_entity_id: null,
  };
}
