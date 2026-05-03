"use client";

import { useMemo, useState } from "react";
import {
  FolderArchive,
  Layers,
  Link2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useArchiveStore } from "@/store/archive-store";

import { EntityTypeGlyph } from "./entity-type-icons";

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
    <aside className="flex h-screen w-[300px] flex-shrink-0 flex-col border-r border-archive-border bg-archive-panel">
      <div className="border-b border-archive-border px-4 py-4">
        <div className="flex items-center gap-2">
          <FolderArchive className="h-4 w-4 text-archive-gold" aria-hidden />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-archive-muted">
            Índice del archivo
          </p>
        </div>
        <p className="mt-2 font-playfair text-lg leading-tight text-archive-ink">
          Clasificación operativa
        </p>
      </div>

      <div className="border-b border-archive-border px-3 py-4">
        <div className="mb-3 flex items-center gap-2 border-b border-archive-border/80 pb-2">
          <Sparkles className="h-3.5 w-3.5 text-archive-muted" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-archive-muted">
            Acciones
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => openModal({ kind: "createType" })}
            className="flex w-full items-center justify-center gap-2 border border-archive-gold/40 bg-archive-void py-2.5 font-mono text-xs uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/10"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Nuevo tipo
          </button>
          <button
            type="button"
            onClick={() => openModal({ kind: "createRelationship" })}
            className="flex w-full items-center justify-center gap-2 border border-archive-border py-2.5 font-mono text-xs uppercase tracking-wider text-archive-muted transition hover:border-archive-gold hover:text-archive-gold"
          >
            <Link2 className="h-4 w-4 shrink-0" aria-hidden />
            Nueva relación
          </button>
        </div>
      </div>

      <nav className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-archive-border/80 px-3 py-2">
          <Layers className="h-3.5 w-3.5 text-archive-muted" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-archive-muted">
            Tipos y entidades
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <p className="px-2 font-mono text-xs text-archive-muted">
              Cargando…
            </p>
          )}
          {!loading && types.length === 0 && (
            <div className="rounded border border-dashed border-archive-border/80 px-3 py-6 text-center">
              <p className="font-playfair text-sm text-archive-ink">
                Archivo vacío
              </p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-archive-muted">
                No hay tipos registrados. Creá el primero para poblar el mapa y
                el dossier.
              </p>
            </div>
          )}
          {types.map((t) => {
            const list = byType.get(t.id) ?? [];
            const isOpen = expanded[t.id] ?? true;
            const iconName = (t as { icon?: string }).icon ?? "Box";
            return (
              <div
                key={t.id}
                className="mb-3 overflow-hidden rounded border border-archive-border/80 bg-archive-void/40"
              >
                <div className="flex items-stretch gap-0">
                  <button
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2.5 text-left transition hover:bg-archive-gold/5"
                  >
                    <span
                      className="h-3 w-3 flex-shrink-0 rounded-sm border border-archive-border"
                      style={{ backgroundColor: t.color }}
                    />
                    <EntityTypeGlyph
                      name={iconName}
                      className="shrink-0 text-archive-muted"
                      size={16}
                    />
                    <span className="min-w-0 flex-1 truncate font-playfair text-sm font-medium text-archive-ink">
                      {t.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-archive-muted">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center border-l border-archive-border/60 bg-archive-panel/50 px-1">
                    <button
                      type="button"
                      title="Editar tipo"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal({ kind: "editType", typeId: t.id });
                      }}
                      className="rounded p-1.5 text-archive-muted transition hover:bg-archive-gold/10 hover:text-archive-gold"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Eliminar tipo"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal({
                          kind: "confirmDelete",
                          target: {
                            kind: "type",
                            id: t.id,
                            title: t.name,
                          },
                        });
                      }}
                      className="rounded p-1.5 text-archive-muted transition hover:bg-archive-crimson/15 hover:text-archive-crimson"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-archive-border/60 bg-archive-void/40 px-2 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          kind: "createEntity",
                          defaultTypeId: t.id,
                        })
                      }
                      className="mb-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-archive-gold/35 py-1.5 font-mono text-[10px] uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/10"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Entidad en este tipo
                    </button>
                    <ul className="space-y-0.5">
                      {list.map((e) => (
                        <li key={e.id}>
                          <div className="flex items-stretch gap-0 rounded transition hover:bg-archive-gold/5">
                            <button
                              type="button"
                              onClick={() => {
                                selectEntity(e.id);
                                setMode("dossier");
                              }}
                              className="min-w-0 flex-1 truncate py-1.5 pl-1 text-left font-mono text-xs text-archive-ink transition hover:text-archive-gold"
                            >
                              <span className="text-archive-border">▸</span>{" "}
                              {e.name}
                            </button>
                            <div className="flex shrink-0 items-center">
                              <button
                                type="button"
                                title="Editar entidad"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  openModal({
                                    kind: "editEntity",
                                    entityId: e.id,
                                  });
                                }}
                                className="rounded p-1 text-archive-muted transition hover:text-archive-gold"
                              >
                                <Pencil className="h-3 w-3" aria-hidden />
                              </button>
                              <button
                                type="button"
                                title="Eliminar entidad"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  openModal({
                                    kind: "confirmDelete",
                                    target: {
                                      kind: "entity",
                                      id: e.id,
                                      title: e.name,
                                    },
                                  });
                                }}
                                className="rounded p-1 text-archive-muted transition hover:text-archive-crimson"
                              >
                                <Trash2 className="h-3 w-3" aria-hidden />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                      {list.length === 0 && (
                        <li className="rounded border border-archive-border/40 px-2 py-3 text-center font-mono text-[10px] leading-relaxed text-archive-muted">
                          Ninguna entidad bajo este tipo. Usá el botón de arriba
                          o el grafo para registrar nodos.
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
