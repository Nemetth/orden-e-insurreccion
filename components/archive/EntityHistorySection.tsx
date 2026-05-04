"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import type {
  EntityHistoryPayload,
  EntityHistoryValueWithType,
} from "@/types/api";
import type { Database, HistoryAttributeValueType } from "@/types/database";

type HistoryAttrRow =
  Database["public"]["Tables"]["history_attribute_types"]["Row"];

/** `input type="date"` exige YYYY-MM-DD; Postgres puede devolver ISO con hora. */
function normalizeHistoryDateInput(v: string | null | undefined): string {
  if (!v?.trim()) return "";
  const s = v.trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

const HISTORY_VALUE_TYPES: { value: HistoryAttributeValueType; label: string }[] =
  [
    { value: "text", label: "Texto" },
    { value: "long_text", label: "Texto largo" },
    { value: "number", label: "Número" },
    { value: "boolean", label: "Sí / No" },
    { value: "date", label: "Fecha" },
  ];

function historyValueEmpty(
  vt: HistoryAttributeValueType,
  row: EntityHistoryValueWithType
): boolean {
  switch (vt) {
    case "boolean":
      return row.value_boolean !== true && row.value_boolean !== false;
    case "number":
      return row.value_number == null || String(row.value_number).trim() === "";
    case "date":
      return !normalizeHistoryDateInput(row.value_date);
    default:
      return !(row.value_text?.trim());
  }
}

function formatHistoryPresent(
  _vt: HistoryAttributeValueType,
  row: EntityHistoryValueWithType
): ReactNode {
  const vt = row.history_attribute_type?.value_type;
  if (!vt) {
    return (
      <span className="italic text-archive-muted">Sin definición de campo</span>
    );
  }
  const empty = historyValueEmpty(vt, row);
  if (vt === "boolean") {
    if (row.value_boolean === true) return <span className="text-archive-ink">Sí</span>;
    if (row.value_boolean === false) return <span className="text-archive-ink">No</span>;
    return <span className="italic text-archive-muted">Sin indicar</span>;
  }
  if (vt === "long_text") {
    const t = row.value_text ?? "";
    return empty ? (
      <span className="italic text-archive-muted">Sin texto</span>
    ) : (
      <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-archive-ink/95">
        {t}
      </p>
    );
  }
  if (vt === "number") {
    return empty ? (
      <span className="italic text-archive-muted">Sin dato</span>
    ) : (
      <span className="font-mono text-sm text-archive-ink/95">
        {String(row.value_number)}
      </span>
    );
  }
  if (vt === "date") {
    const d = normalizeHistoryDateInput(row.value_date);
    return empty ? (
      <span className="italic text-archive-muted">Sin fecha</span>
    ) : (
      <span className="font-mono text-sm text-archive-ink/95">{d}</span>
    );
  }
  const t = row.value_text ?? "";
  return empty ? (
    <span className="italic text-archive-muted">Sin dato</span>
  ) : (
    <span className="font-mono text-sm text-archive-ink/95">{t}</span>
  );
}

function displayHistoryEditorString(
  vt: HistoryAttributeValueType,
  row: EntityHistoryValueWithType
): string {
  const resolved = row.history_attribute_type?.value_type ?? vt;
  switch (resolved) {
    case "boolean":
      return row.value_boolean === true
        ? "true"
        : row.value_boolean === false
          ? "false"
          : "";
    case "number":
      return row.value_number != null ? String(row.value_number) : "";
    case "date":
      return normalizeHistoryDateInput(row.value_date);
    default:
      return row.value_text ?? "";
  }
}

type Props = {
  entityId: string;
  entityTypeId: string;
  mode: "present" | "edit";
};

export function EntityHistorySection({ entityId, entityTypeId, mode }: Props) {
  const setError = useArchiveStore((s) => s.setError);

  const [history, setHistory] = useState<EntityHistoryPayload | null>(null);
  const [attrTypes, setAttrTypes] = useState<HistoryAttrRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await archiveApi.getEntityHistory(entityId);
      setHistory(h);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar años históricos"
      );
      setHistory({ years: [] });
    }

    try {
      const attrs = await archiveApi.getHistoryAttributes(entityTypeId);
      setAttrTypes(attrs);
    } catch {
      setAttrTypes([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityTypeId, setError]);

  useEffect(() => {
    void load();
  }, [load]);

  const years = history?.years ?? [];
  const newYearInputRef = useRef<HTMLInputElement>(null);

  const mergeValue = useCallback(
    (yearId: string, updated: EntityHistoryValueWithType) => {
      setHistory((h) => {
        if (!h) return h;
        return {
          years: h.years.map((y) => {
            if (y.id !== yearId) return y;
            const next = y.values.map((v) => (v.id === updated.id ? updated : v));
            next.sort(
              (a, b) =>
                a.history_attribute_type.label.localeCompare(
                  b.history_attribute_type.label
                ) ||
                a.history_attribute_type.key.localeCompare(
                  b.history_attribute_type.key
                )
            );
            return { ...y, values: next };
          }),
        };
      });
    },
    []
  );

  const addValueToYear = useCallback(
    (yearId: string, row: EntityHistoryValueWithType) => {
      setHistory((h) => {
        if (!h) return h;
        return {
          years: h.years.map((y) => {
            if (y.id !== yearId) return y;
            const next = [...y.values, row];
            next.sort(
              (a, b) =>
                a.history_attribute_type.label.localeCompare(
                  b.history_attribute_type.label
                ) ||
                a.history_attribute_type.key.localeCompare(
                  b.history_attribute_type.key
                )
            );
            return { ...y, values: next };
          }),
        };
      });
    },
    []
  );

  const removeValueFromYear = useCallback((yearId: string, valueId: string) => {
    setHistory((h) => {
      if (!h) return h;
      return {
        years: h.years.map((y) =>
          y.id !== yearId
            ? y
            : { ...y, values: y.values.filter((v) => v.id !== valueId) }
        ),
      };
    });
  }, []);

  const removeYear = useCallback((yearId: string) => {
    setHistory((h) => {
      if (!h) return h;
      return { years: h.years.filter((y) => y.id !== yearId) };
    });
  }, []);

  async function handleAddYear(rawYear: string) {
    const n = Number(rawYear);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      setError("Año inválido");
      return;
    }
    setError(null);
    try {
      const created = await archiveApi.postHistoryYear(entityId, { year: n });
      setHistory((h) => {
        const base = h ?? { years: [] };
        const nextYears = [...base.years, { ...created, values: [] as EntityHistoryValueWithType[] }];
        nextYears.sort((a, b) => a.year - b.year);
        return { years: nextYears };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el año");
    }
  }

  async function handleDeleteYear(yearId: string, yearLabel: number) {
    if (
      !window.confirm(
        `¿Eliminar el año ${yearLabel} y todos sus datos históricos asociados?`
      )
    ) {
      return;
    }
    setError(null);
    try {
      await archiveApi.deleteHistoryYear(yearId);
      removeYear(yearId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el año");
    }
  }

  async function handleInstantiate(yearId: string, attrTypeId: string) {
    setError(null);
    try {
      const row = await archiveApi.postHistoryYearValue(yearId, {
        history_attribute_type_id: attrTypeId,
      });
      addValueToYear(yearId, row);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el campo");
    }
  }

  async function handleDeleteValue(yearId: string, valueId: string, label: string) {
    if (!window.confirm(`¿Quitar «${label}» de este año?`)) return;
    setError(null);
    try {
      await archiveApi.deleteHistoryValue(valueId);
      removeValueFromYear(yearId, valueId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el valor");
    }
  }

  const isPresent = mode === "present";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-archive-border/40 pb-4">
        <div>
          {isPresent ? (
            <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-archive-muted">
              Historia
            </h2>
          ) : (
            <h3 className="font-playfair text-xl font-semibold tracking-tight text-archive-gold">
              Historia
            </h3>
          )}
          <p
            className={
              isPresent
                ? "mt-1 max-w-xl font-mono text-[11px] leading-relaxed text-archive-muted/90"
                : "mt-1 max-w-xl font-mono text-[11px] leading-relaxed text-archive-muted"
            }
          >
            Línea de tiempo clasificada por año. Los campos históricos se declaran
            por tipo; cada entidad elige en qué años instanciarlos.
          </p>
        </div>
      </div>

      {loading && (
        <p className="font-mono text-xs text-archive-muted">Cargando archivo temporal…</p>
      )}

      {!loading && isPresent && years.length === 0 && (
        <div className="rounded border border-archive-border/45 bg-archive-void/20 px-4 py-4 font-mono text-xs leading-relaxed text-archive-muted">
          Sin años en el archivo temporal.
          {attrTypes.length === 0
            ? " Declará campos históricos al tipo en modo edición para empezar."
            : " Entrá en edición para registrar años y activar campos por año."}
        </div>
      )}

      {!loading && years.length > 0 && (
        <div className="relative">
          <div
            className="pointer-events-none absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-archive-gold/25 via-archive-border/60 to-archive-border/20"
            aria-hidden
          />

          <ul className="space-y-0">
            {years.map((y) => (
              <li key={y.id} className="relative pl-9 pb-10 last:pb-0">
                <div
                  className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center border border-archive-gold/40 bg-archive-panel shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                  aria-hidden
                >
                  <span className="block h-2 w-2 rotate-45 bg-archive-gold/70" />
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-archive-gold">
                    Año ref.{" "}
                    <span className="text-lg tracking-tight text-archive-ink">
                      {y.year}
                    </span>
                  </div>
                  {!isPresent && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteYear(y.id, y.year)}
                      className="inline-flex items-center gap-1 border border-archive-border/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-archive-muted transition hover:border-archive-crimson/50 hover:text-archive-crimson"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Anular año
                    </button>
                  )}
                </div>

                <div className="mt-3 border border-archive-border/45 bg-archive-void/20">
                  {y.values.length === 0 && isPresent && (
                    <p className="px-3 py-4 font-mono text-xs text-archive-muted">
                      Sin entradas registradas para este año.
                    </p>
                  )}

                  {y.values.length > 0 && isPresent && (
                    <ul className="divide-y divide-archive-border/40">
                      {y.values.map((v) => (
                        <li key={v.id} className="px-3 py-3">
                          <div className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
                            {v.history_attribute_type.label}
                          </div>
                          <div className="mt-1.5 border-l border-archive-gold/25 pl-3">
                            {formatHistoryPresent(
                              v.history_attribute_type.value_type,
                              v
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!isPresent && (
                    <div className="space-y-4 p-3">
                      {y.values.map((v) => (
                        <div
                          key={v.id}
                          className="border-l-2 border-archive-crimson/45 pl-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
                              {v.history_attribute_type.label}
                              <span className="ml-2 text-archive-border/80">
                                ({v.history_attribute_type.key})
                              </span>
                            </span>
                            <button
                              type="button"
                              title="Quitar de este año"
                              onClick={() =>
                                void handleDeleteValue(
                                  y.id,
                                  v.id,
                                  v.history_attribute_type.label
                                )
                              }
                              className="shrink-0 border border-archive-border/70 p-1 text-archive-muted transition hover:border-archive-crimson/50 hover:text-archive-crimson"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                          <HistoryValueEditor
                            row={v}
                            onPatched={(updated) => mergeValue(y.id, updated)}
                            setError={setError}
                          />
                        </div>
                      ))}

                      {attrTypes.length > 0 && (
                        <div className="border-t border-archive-border/35 pt-3">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
                            Disponibles sin instanciar
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {attrTypes
                              .filter(
                                (a) =>
                                  !y.values.some(
                                    (v) => v.history_attribute_type_id === a.id
                                  )
                              )
                              .map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => void handleInstantiate(y.id, a.id)}
                                  className="inline-flex items-center gap-1.5 border border-dashed border-archive-gold/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/10"
                                >
                                  <Plus className="h-3 w-3" aria-hidden />
                                  {a.label}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isPresent && !loading && (
        <div className="space-y-4 border border-archive-border/50 bg-archive-void/20 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
              Nuevo año
              <input
                ref={newYearInputRef}
                type="number"
                placeholder="p. ej. 1936"
                className="mt-1 block w-36 border border-archive-border bg-archive-panel px-2 py-1.5 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const el = e.target as HTMLInputElement;
                    void handleAddYear(el.value);
                    el.value = "";
                  }
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const raw = newYearInputRef.current?.value ?? "";
                void handleAddYear(raw);
                if (newYearInputRef.current) newYearInputRef.current.value = "";
              }}
              className="inline-flex items-center gap-1 border border-archive-gold/45 bg-archive-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/15"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Registrar año
            </button>
          </div>

          <CreateHistoryAttributeForm
            typeId={entityTypeId}
            onCreated={(row) => {
              setAttrTypes((prev) =>
                [...prev, row].sort((a, b) => a.label.localeCompare(b.label))
              );
            }}
            setError={setError}
          />
        </div>
      )}
    </section>
  );
}

function HistoryValueEditor({
  row,
  onPatched,
  setError,
}: {
  row: EntityHistoryValueWithType;
  onPatched: (v: EntityHistoryValueWithType) => void;
  setError: (msg: string | null) => void;
}) {
  const vtOpt = row.history_attribute_type?.value_type;

  const saveNow = useCallback(
    async (patch: {
      value_text?: string | null;
      value_number?: number | string | null;
      value_boolean?: boolean | null;
      value_date?: string | null;
    }) => {
      setError(null);
      try {
        const updated = await archiveApi.patchHistoryValue(row.id, patch);
        onPatched(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    },
    [row.id, onPatched, setError]
  );

  const debouncedSave = useDebouncedCallback(
    (patch: Parameters<typeof saveNow>[0]) => {
      void saveNow(patch);
    },
    550
  );

  const initial =
    vtOpt != null ? displayHistoryEditorString(vtOpt, row) : "";
  const [local, setLocal] = useState(initial);

  useEffect(() => {
    if (vtOpt == null) return;
    setLocal(displayHistoryEditorString(vtOpt, row));
  }, [vtOpt, row]);

  if (vtOpt == null) {
    return (
      <p className="mt-2 font-mono text-xs text-archive-muted">
        Dato sin definición de campo (re-sync).
      </p>
    );
  }

  const vt = vtOpt;

  if (vt === "boolean") {
    return (
      <div className="mt-2">
        <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-sm">
          <input
            type="checkbox"
            checked={row.value_boolean === true}
            onChange={(e) => {
              void saveNow({ value_boolean: e.target.checked });
            }}
            className="h-4 w-4 accent-archive-crimson"
          />
          <span className="text-archive-muted">activado</span>
        </label>
      </div>
    );
  }

  if (vt === "long_text") {
    return (
      <textarea
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          debouncedSave({ value_text: v === "" ? null : v });
        }}
        rows={4}
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none transition hover:border-archive-muted focus:border-archive-crimson"
      />
    );
  }

  if (vt === "date") {
    return (
      <input
        type="date"
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          debouncedSave({ value_date: v === "" ? null : v });
        }}
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none transition hover:border-archive-muted focus:border-archive-crimson"
      />
    );
  }

  if (vt === "number") {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          debouncedSave({ value_number: v.trim() === "" ? null : v });
        }}
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none transition hover:border-archive-muted focus:border-archive-crimson"
      />
    );
  }

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        debouncedSave({ value_text: v === "" ? null : v });
      }}
      className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none transition hover:border-archive-muted focus:border-archive-crimson"
    />
  );
}

function CreateHistoryAttributeForm({
  typeId,
  onCreated,
  setError,
}: {
  typeId: string;
  onCreated: (row: HistoryAttrRow) => void;
  setError: (msg: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [valueType, setValueType] =
    useState<HistoryAttributeValueType>("text");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const k = key.trim().toLowerCase().replace(/\s+/g, "_");
    if (!k || !label.trim()) {
      setError("Clave y etiqueta son obligatorias.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const row = await archiveApi.postHistoryAttribute(typeId, {
        key: k,
        label: label.trim(),
        value_type: valueType,
      });
      onCreated(row);
      setKey("");
      setLabel("");
      setValueType("text");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear campo");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-dashed border-archive-gold/45 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/10"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Nuevo campo histórico (tipo)
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 border border-archive-border/60 bg-archive-panel/40 p-3"
    >
      <p className="font-mono text-[10px] leading-relaxed text-archive-muted">
        Queda disponible para{" "}
        <span className="text-archive-ink">todas las entidades</span> de este
        tipo; en cada año se instancia con «+».
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
          Clave
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1 w-full border border-archive-border bg-archive-void px-2 py-1.5 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
          />
        </label>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
          Etiqueta
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full border border-archive-border bg-archive-void px-2 py-1.5 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
          />
        </label>
      </div>
      <label className="block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
        Tipo de valor
        <select
          value={valueType}
          onChange={(e) =>
            setValueType(e.target.value as HistoryAttributeValueType)
          }
          className="mt-1 w-full border border-archive-border bg-archive-void px-2 py-1.5 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
        >
          {HISTORY_VALUE_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="border border-archive-gold/50 bg-archive-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/15 disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Crear definición"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-archive-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-archive-muted transition hover:text-archive-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
