"use client";

import { useMemo, useState } from "react";

import { useArchiveStore } from "@/store/archive-store";

export function AppSidebar() {
  const types = useArchiveStore((s) => s.types);
  const entities = useArchiveStore((s) => s.entities);
  const loading = useArchiveStore((s) => s.loading);
  const selectEntity = useArchiveStore((s) => s.selectEntity);
  const setMode = useArchiveStore((s) => s.setMode);
  const openModal = useArchiveStore((s) => s.openModal);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const byType = useMemo(() => {
    const m = new Map<string, typeof entities>();
    for (const t of types) m.set(t.id, []);
    for (const e of entities) {
      const list = m.get(e.entity_type_id);
      if (list) list.push(e);
    }
    return m;
  }, [types, entities]);

  function toggleType(id: string) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <aside className="flex h-screen w-[280px] flex-shrink-0 flex-col border-r border-archive-border bg-archive-panel">
      <div className="border-b border-archive-border p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-archive-muted">
          Índice del archivo
        </p>
      </div>

      <div className="flex flex-col gap-2 border-b border-archive-border p-3">
        <button
          type="button"
          onClick={() => openModal({ kind: "createType" })}
          className="w-full border border-archive-gold/40 bg-archive-void py-2 font-mono text-xs uppercase tracking-wider text-archive-gold hover:bg-archive-gold/10"
        >
          + Nuevo tipo
        </button>
        <button
          type="button"
          onClick={() => openModal({ kind: "createRelationship" })}
          className="w-full border border-archive-border py-2 font-mono text-xs uppercase tracking-wider text-archive-muted hover:border-archive-gold hover:text-archive-gold"
        >
          Nueva relación (global)
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="px-2 font-mono text-xs text-archive-muted">Cargando…</p>
        )}
        {!loading && types.length === 0 && (
          <p className="px-2 font-mono text-xs leading-relaxed text-archive-muted">
            No hay tipos. Creá el primero para comenzar el dossier.
          </p>
        )}
        {types.map((t) => {
          const list = byType.get(t.id) ?? [];
          const isOpen = expanded[t.id] ?? true;
          return (
            <div key={t.id} className="mb-2 border border-archive-border/80">
              <button
                type="button"
                onClick={() => toggleType(t.id)}
                className="flex w-full items-center gap-2 px-2 py-2 text-left"
              >
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-sm border border-archive-border"
                  style={{ backgroundColor: t.color }}
                />
                <span className="flex-1 font-playfair text-sm text-archive-ink">
                  {t.name}
                </span>
                <span className="font-mono text-[10px] text-archive-muted">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-archive-border/60 bg-archive-void/50 px-2 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      openModal({
                        kind: "createEntity",
                        defaultTypeId: t.id,
                      })
                    }
                    className="mb-2 w-full py-1.5 font-mono text-[10px] uppercase tracking-wider text-archive-gold hover:underline"
                  >
                    + Entidad en este tipo
                  </button>
                  <ul className="space-y-1">
                    {list.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => {
                            selectEntity(e.id);
                            setMode("dossier");
                          }}
                          className="w-full truncate py-1 text-left font-mono text-xs text-archive-ink hover:text-archive-gold"
                        >
                          ▸ {e.name}
                        </button>
                      </li>
                    ))}
                    {list.length === 0 && (
                      <li className="font-mono text-[10px] text-archive-muted">
                        Sin entidades.
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
