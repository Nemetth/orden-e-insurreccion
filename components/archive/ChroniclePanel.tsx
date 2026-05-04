"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import type { GlobalHistoryPayload, GlobalHistoryYearEntry } from "@/types/api";
import type { HistoryAttributeValueType } from "@/types/database";

function formatHistoryValuePlain(
  vt: HistoryAttributeValueType,
  row: GlobalHistoryYearEntry["values"][number]
): string {
  switch (vt) {
    case "boolean":
      if (row.value_boolean === true) return "Sí";
      if (row.value_boolean === false) return "No";
      return "—";
    case "number":
      if (
        row.value_number == null ||
        String(row.value_number).trim() === ""
      ) {
        return "—";
      }
      return String(row.value_number);
    case "date":
      return row.value_date?.trim() || "—";
    default: {
      const t = row.value_text?.trim() ?? "";
      if (!t) return "—";
      return t.length > 200 ? `${t.slice(0, 197)}…` : t;
    }
  }
}

export function ChroniclePanel() {
  const types = useArchiveStore((s) => s.types);
  const refreshEntities = useArchiveStore((s) => s.refreshEntities);
  const selectEntity = useArchiveStore((s) => s.selectEntity);
  const setMode = useArchiveStore((s) => s.setMode);
  const setError = useArchiveStore((s) => s.setError);

  const [rows, setRows] = useState<GlobalHistoryPayload>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** Tipos excluidos del listado (vacío = todos visibles). */
  const [excludedTypeIds, setExcludedTypeIds] = useState<Set<string>>(
    () => new Set()
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data] = await Promise.all([
        archiveApi.getGlobalHistory(),
        refreshEntities(),
      ]);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar la crónica");
    } finally {
      setLoading(false);
    }
  }, [refreshEntities, setError]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedTypes = useMemo(
    () => [...types].sort((a, b) => a.name.localeCompare(b.name)),
    [types]
  );

  const byYear = useMemo(() => {
    const m = new Map<number, GlobalHistoryYearEntry[]>();
    for (const row of rows) {
      if (excludedTypeIds.has(row.entity_type.id)) continue;
      const list = m.get(row.year) ?? [];
      list.push(row);
      m.set(row.year, list);
    }
    Array.from(m.values()).forEach((list) => {
      list.sort((a, b) => a.entity.name.localeCompare(b.entity.name));
    });
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [rows, excludedTypeIds]);

  function toggleTypeFilter(typeId: string) {
    setExcludedTypeIds((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  }

  function openDossier(entityId: string) {
    selectEntity(entityId);
    setMode("dossier");
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm text-archive-muted">
        Reconstruyendo línea temporal…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-archive-void">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 min-h-0">
          <div className="min-w-0 flex-1 overflow-y-auto px-4 py-8 md:px-10">
            {byYear.length === 0 ? (
              <div className="mx-auto max-w-md pt-16 text-center font-mono text-sm text-archive-muted">
                No hay años de historia registrados, o todos los tipos están
                ocultos por el filtro.
              </div>
            ) : (
              <div className="relative mx-auto max-w-4xl pb-24">
                <div
                  className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-archive-gold/50 via-archive-border to-archive-border"
                  aria-hidden
                />

                <ul className="relative space-y-16 md:space-y-24">
                  {byYear.map(([year, entries]) => (
                    <li key={year} className="relative">
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-archive-gold bg-archive-panel shadow-[0_0_24px_rgba(201,162,39,0.12)]">
                          <span className="font-playfair text-lg font-semibold tabular-nums text-archive-gold md:text-xl">
                            {year}
                          </span>
                        </div>
                      </div>

                      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                        {entries.map((entry, i) => {
                          const isLeft = i % 2 === 0;
                          const align = isLeft
                            ? "md:col-start-1 md:justify-self-end md:pr-4 md:text-right"
                            : "md:col-start-2 md:justify-self-start md:pl-4 md:text-left";
                          const color =
                            entry.entity_type.color?.trim() || "#c9a227";

                          return (
                            <div
                              key={entry.id}
                              className={`flex w-full max-w-md flex-col ${align}`}
                            >
                              <button
                                type="button"
                                onClick={() => openDossier(entry.entity.id)}
                                className={`group w-full rounded border border-archive-border bg-archive-panel/80 p-3 text-left shadow-sm transition hover:border-archive-gold/60 hover:bg-archive-gold/5 ${
                                  isLeft ? "md:text-right" : "md:text-left"
                                }`}
                              >
                                <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                                  <span className="font-mono text-sm font-medium text-archive-ink group-hover:text-archive-gold">
                                    {entry.entity.name}
                                  </span>
                                  <span
                                    className="font-mono text-[10px] uppercase tracking-[0.14em]"
                                    style={{ color }}
                                  >
                                    {entry.entity_type.name}
                                  </span>
                                </div>
                                {entry.values.length === 0 ? (
                                  <p className="mt-2 font-mono text-xs text-archive-muted">
                                    Sin atributos históricos en este año.
                                  </p>
                                ) : (
                                  <ul className="mt-3 space-y-2 border-t border-archive-border/60 pt-3">
                                    {entry.values.map((v) => (
                                      <li
                                        key={v.id}
                                        className="font-mono text-[11px] leading-snug text-archive-ink/90"
                                      >
                                        <span className="text-archive-muted">
                                          {v.history_attribute_type.label}
                                          {": "}
                                        </span>
                                        <span className="text-archive-ink">
                                          {formatHistoryValuePlain(
                                            v.history_attribute_type.value_type,
                                            v
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside
            className={`flex h-full flex-shrink-0 flex-col border-l border-archive-border bg-archive-panel/95 transition-[width] duration-200 ease-out ${
              filtersOpen ? "w-56" : "w-11"
            }`}
          >
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex h-11 w-full shrink-0 items-center justify-center gap-1 border-b border-archive-border text-archive-gold transition hover:bg-archive-gold/10"
              title={filtersOpen ? "Ocultar filtros" : "Filtros por tipo"}
            >
              <Filter className="h-4 w-4 shrink-0" aria-hidden />
              {filtersOpen ? (
                <ChevronRight className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronLeft className="h-4 w-4" aria-hidden />
              )}
            </button>
            {filtersOpen && (
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-archive-muted">
                  Tipo de entidad
                </p>
                <ul className="space-y-2">
                  {sortedTypes.map((t) => {
                    const visible = !excludedTypeIds.has(t.id);
                    const c = t.color?.trim() || "#c9a227";
                    return (
                      <li key={t.id}>
                        <label className="flex cursor-pointer items-start gap-2 font-mono text-xs text-archive-ink">
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={() => toggleTypeFilter(t.id)}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-archive-border bg-archive-void text-archive-gold focus:ring-archive-gold/40"
                          />
                          <span
                            className="min-w-0 flex-1 leading-tight"
                            style={{ borderLeftWidth: 3, borderLeftColor: c, paddingLeft: 8 }}
                          >
                            {t.name}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
