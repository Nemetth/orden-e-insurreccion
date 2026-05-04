"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link2,
  ListPlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";
import type { EntityWithTypeAndValues, RelationshipWithEntities } from "@/types/api";
import type { AttributeValueType } from "@/types/database";

import { displayValue, patchForAttributeInput } from "./value-patch";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { EntityHistorySection } from "./EntityHistorySection";
import { EntityDocumentsSection } from "./EntityDocumentsSection";
import { EntityRumorsSection } from "./EntityRumorsSection";

type PanelMode = "present" | "edit";

function attributeIsEmpty(
  valueType: AttributeValueType,
  row: Omit<EntityWithTypeAndValues["values"][number], "attribute">
): boolean {
  switch (valueType) {
    case "boolean":
      return row.value_boolean !== true && row.value_boolean !== false;
    case "number":
      return row.value_numeric == null || String(row.value_numeric).trim() === "";
    case "date":
      return !row.value_timestamptz;
    case "json":
      return row.value_json == null;
    case "entity_ref":
      return !row.ref_entity_id?.trim();
    default:
      return !(row.value_text?.trim());
  }
}

export function DossierPanel() {
  const entities = useArchiveStore((s) => s.entities);
  const relationships = useArchiveStore((s) => s.relationships);
  const selectedId = useArchiveStore((s) => s.selectedEntityId);
  const openModal = useArchiveStore((s) => s.openModal);
  const upsertEntity = useArchiveStore((s) => s.upsertEntity);
  const selectEntity = useArchiveStore((s) => s.selectEntity);
  const setError = useArchiveStore((s) => s.setError);
  const pushToast = useToastStore((s) => s.pushToast);
  const refreshRelationships = useArchiveStore((s) => s.refreshRelationships);

  const entity = useMemo(
    () => entities.find((e) => e.id === selectedId) ?? null,
    [entities, selectedId]
  );

  const [panelMode, setPanelMode] = useState<PanelMode>("present");

  const [nameEdit, setNameEdit] = useState("");

  useEffect(() => {
    setPanelMode("present");
  }, [entity?.id]);

  useEffect(() => {
    if (!entity) {
      setNameEdit("");
      return;
    }
    setNameEdit(entity.name);
  }, [entity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveName = useDebouncedCallback(async (name: string) => {
    if (!entity || !name.trim()) return;
    const trimmed = name.trim();
    if (trimmed === entity.name) return;
    try {
      const updated = await archiveApi.patchEntity(entity.id, {
        name: trimmed,
      });
      upsertEntity(updated);
      pushToast("Nombre sincronizado con el archivo", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar nombre");
    }
  }, 500);

  const saveAttrPatch = useCallback(
    async (
      attributeId: string,
      valueType: AttributeValueType,
      raw: string,
      opts?: { checked?: boolean }
    ) => {
      if (!entity) return;
      const patch = patchForAttributeInput(
        attributeId,
        valueType,
        raw,
        opts
      );
      try {
        const updated = await archiveApi.patchEntity(entity.id, {
          values: [patch],
        });
        upsertEntity(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar valor");
      }
    },
    [entity, upsertEntity, setError]
  );

  const debouncedAttrSave = useDebouncedCallback(
    (
      attributeId: string,
      valueType: AttributeValueType,
      raw: string,
      opts?: { checked?: boolean }
    ) => {
      void saveAttrPatch(attributeId, valueType, raw, opts);
    },
    550
  );

  const handleAttrCommit = useCallback(
    (
      attributeId: string,
      valueType: AttributeValueType,
      raw: string,
      opts?: { checked?: boolean }
    ) => {
      if (valueType === "boolean") {
        void saveAttrPatch(attributeId, valueType, raw, opts);
      } else {
        debouncedAttrSave(attributeId, valueType, raw, opts);
      }
    },
    [saveAttrPatch, debouncedAttrSave]
  );

  const incoming = useMemo(
    () =>
      entity
        ? relationships.filter((r) => r.target_entity_id === entity.id)
        : [],
    [relationships, entity]
  );

  const outgoing = useMemo(
    () =>
      entity
        ? relationships.filter((r) => r.source_entity_id === entity.id)
        : [],
    [relationships, entity]
  );

  function requestDeleteEntity() {
    if (!entity) return;
    openModal({
      kind: "confirmDelete",
      target: {
        kind: "entity",
        id: entity.id,
        title: entity.name,
      },
    });
  }

  if (!selectedId || !entity) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <div className="max-w-md rounded border border-dashed border-archive-border/80 px-8 py-10 text-center">
          <p className="font-playfair text-lg text-archive-ink">
            Sin entidad seleccionada
          </p>
          <p className="mt-3 font-mono text-sm leading-relaxed text-archive-muted">
            Elegí un nodo en el mapa táctico o en el índice lateral para ver su
            dossier clasificado, relaciones y atributos dinámicos.
          </p>
        </div>
      </div>
    );
  }

  const isPresent = panelMode === "present";

  return (
    <div className="h-full overflow-y-auto px-6 py-8 md:px-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="border-b border-archive-border/90 pb-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              {isPresent ? (
                <>
                  <h1 className="font-playfair text-4xl font-semibold leading-[1.15] tracking-tight text-archive-gold md:text-5xl">
                    {entity.name}
                  </h1>
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-archive-muted">
                    <span className="text-archive-ink/90">
                      {entity.entity_type.name}
                    </span>
                    <span className="mx-2 text-archive-border">·</span>
                    ref.{" "}
                    <span className="text-archive-muted">{entity.id.slice(0, 8)}</span>
                    …
                  </p>
                </>
              ) : (
                <>
                  <input
                    value={nameEdit}
                    onChange={(e) => {
                      setNameEdit(e.target.value);
                      saveName(e.target.value);
                    }}
                    className="w-full bg-transparent font-playfair text-3xl font-semibold tracking-tight text-archive-gold outline-none placeholder:text-archive-muted transition hover:text-archive-gold focus:ring-0 md:text-4xl"
                    aria-label="Nombre de la entidad"
                  />
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-archive-muted">
                    <span className="text-archive-ink">
                      {entity.entity_type.name}
                    </span>
                    <span className="mx-2 text-archive-border">·</span>
                    ref. {entity.id.slice(0, 8)}…
                  </p>
                </>
              )}
            </div>
            <div className="flex shrink-0 justify-end sm:pt-1">
              {isPresent ? (
                <button
                  type="button"
                  onClick={() => setPanelMode("edit")}
                  className="inline-flex items-center gap-2 border border-archive-gold/45 bg-archive-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-archive-gold transition hover:border-archive-gold hover:bg-archive-gold/15"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPanelMode("present")}
                  className="inline-flex items-center gap-2 border border-archive-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-archive-muted transition hover:border-archive-muted hover:text-archive-ink"
                >
                  <X className="h-4 w-4" aria-hidden />
                  Listo
                </button>
              )}
            </div>
          </div>
        </header>

        {isPresent ? (
          <>
            <section className="space-y-6">
              <div>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-archive-muted">
                  Registro de atributos
                </h2>
                <div className="mt-4 space-y-0 divide-y divide-archive-border/50 border border-archive-border/60 bg-archive-void/30">
                  {entity.values.length === 0 && (
                    <p className="px-4 py-8 text-center font-mono text-sm leading-relaxed text-archive-muted">
                      Este tipo no declara atributos todavía. Entrá en{" "}
                      <span className="text-archive-gold">Editar</span> para
                      añadir campos al tipo.
                    </p>
                  )}
                  {entity.values.map(({ attribute, ...row }) => (
                    <AttributePresentBlock
                      key={row.id}
                      attribute={attribute}
                      row={row}
                    />
                  ))}
                </div>
              </div>
            </section>

            <EntityHistorySection
              entityId={entity.id}
              entityTypeId={entity.entity_type_id}
              mode="present"
            />

            <EntityDocumentsSection entityId={entity.id} mode="present" />
            <EntityRumorsSection entityId={entity.id} mode="present" />

            <section className="grid gap-10 md:grid-cols-2">
              <div>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-archive-muted">
                  Relaciones · salida
                </h2>
                <div className="mt-4 space-y-4">
                  {outgoing.map((r) => (
                    <div key={r.id} className="max-w-md space-y-2">
                      <RelationPill
                        entityName={r.target_entity.name}
                        relationLabel={r.label ?? r.relation_key}
                        direction="out"
                        onNavigate={() => selectEntity(r.target_entity_id)}
                      />
                      <TensionReadBar level={r.tension_level} />
                      <p className="font-mono text-[10px] text-archive-muted">
                        {formatRelationPeriod(r)}
                      </p>
                    </div>
                  ))}
                  {outgoing.length === 0 && (
                    <p className="font-mono text-xs leading-relaxed text-archive-muted">
                      Sin vínculos registrados en salida.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-archive-muted">
                  Relaciones · entrada
                </h2>
                <div className="mt-4 space-y-4">
                  {incoming.map((r) => (
                    <div key={r.id} className="max-w-md space-y-2">
                      <RelationPill
                        entityName={r.source_entity.name}
                        relationLabel={r.label ?? r.relation_key}
                        direction="in"
                        onNavigate={() => selectEntity(r.source_entity_id)}
                      />
                      <TensionReadBar level={r.tension_level} />
                      <p className="font-mono text-[10px] text-archive-muted">
                        {formatRelationPeriod(r)}
                      </p>
                    </div>
                  ))}
                  {incoming.length === 0 && (
                    <p className="font-mono text-xs leading-relaxed text-archive-muted">
                      Ninguna referencia entrante.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section>
              <h3 className="font-playfair text-xl font-semibold tracking-tight text-archive-gold">
                Atributos
              </h3>
              <p className="mt-1 font-mono text-[11px] text-archive-muted">
                Campos declarados para el tipo; los valores se guardan al
                editar.
              </p>
              <div className="mt-5 space-y-5">
                {entity.values.length === 0 && (
                  <div className="rounded border border-archive-border/60 bg-archive-void/30 px-4 py-6 text-center font-mono text-sm text-archive-muted">
                    Este tipo aún no tiene atributos. Añadí campos desde el
                    botón de abajo para estructurar el dossier.
                  </div>
                )}
                {entity.values.map(({ attribute, ...row }) => (
                  <div
                    key={row.id}
                    className="border-l-2 border-archive-crimson/60 pl-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <label className="min-w-0 flex-1 font-mono text-xs uppercase tracking-wider text-archive-muted">
                        {attribute.label}
                        <span className="ml-2 text-archive-border">
                          ({attribute.key})
                        </span>
                      </label>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openModal({
                              kind: "editAttribute",
                              typeId: entity.entity_type_id,
                              attributeId: attribute.id,
                            })
                          }
                          className="inline-flex border border-archive-border/80 p-1.5 text-archive-muted transition hover:border-archive-gold/50 hover:text-archive-gold"
                          title="Editar definición del atributo"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          <span className="sr-only">
                            Editar definición del atributo
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openModal({
                              kind: "confirmDelete",
                              target: {
                                kind: "attribute",
                                typeId: entity.entity_type_id,
                                id: attribute.id,
                                title: attribute.label,
                              },
                            })
                          }
                          className="inline-flex border border-archive-border/80 p-1.5 text-archive-muted transition hover:border-archive-crimson/60 hover:text-archive-crimson"
                          title="Eliminar atributo del tipo"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          <span className="sr-only">
                            Eliminar atributo del tipo
                          </span>
                        </button>
                      </div>
                    </div>
                    <AttributeEditor
                      attribute={attribute}
                      row={row}
                      onCommit={(raw, opts) =>
                        handleAttrCommit(
                          attribute.id,
                          attribute.value_type,
                          raw,
                          opts
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  openModal({
                    kind: "addAttribute",
                    typeId: entity.entity_type_id,
                  })
                }
                className="mt-6 inline-flex items-center gap-2 border border-dashed border-archive-gold/50 px-4 py-2 font-mono text-xs uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/10"
              >
                <ListPlus className="h-4 w-4" aria-hidden />
                Atributo al tipo
              </button>
            </section>

            <EntityHistorySection
              entityId={entity.id}
              entityTypeId={entity.entity_type_id}
              mode="edit"
            />

            <EntityDocumentsSection entityId={entity.id} mode="edit" />
            <EntityRumorsSection entityId={entity.id} mode="edit" />

            <section className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="font-playfair text-xl font-semibold tracking-tight text-archive-gold">
                  Relaciones · salida
                </h3>
                <ul className="mt-4 space-y-4 font-mono text-sm">
                  {outgoing.map((r) => (
                    <li
                      key={r.id}
                      className="rounded border border-archive-border/50 bg-archive-void/25 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link2
                          className="h-3.5 w-3.5 shrink-0 text-archive-muted"
                          aria-hidden
                        />
                        <button
                          type="button"
                          onClick={() => {
                            selectEntity(r.target_entity_id);
                          }}
                          className="min-w-0 flex-1 truncate text-left text-archive-ink underline decoration-archive-border decoration-dotted underline-offset-4 transition hover:decoration-archive-gold"
                        >
                          → {r.target_entity.name}
                        </button>
                        <span className="text-archive-muted">
                          ({r.label ?? r.relation_key})
                        </span>
                        <button
                          type="button"
                          title="Editar relación"
                          onClick={() =>
                            openModal({
                              kind: "editRelationship",
                              relationshipId: r.id,
                            })
                          }
                          className="rounded p-1 text-archive-muted transition hover:text-archive-gold"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          title="Eliminar relación"
                          onClick={() =>
                            openModal({
                              kind: "confirmDelete",
                              target: {
                                kind: "relationship",
                                id: r.id,
                                title: r.label ?? r.relation_key,
                              },
                            })
                          }
                          className="rounded p-1 text-archive-muted transition hover:text-archive-crimson"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                      <RelationDossierEditRow
                        rel={r}
                        refreshRelationships={refreshRelationships}
                        setError={setError}
                      />
                    </li>
                  ))}
                  {outgoing.length === 0 && (
                    <li className="rounded border border-archive-border/50 px-3 py-4 font-mono text-xs leading-relaxed text-archive-muted">
                      No hay aristas de salida. Registrá un vínculo desde el pie
                      de página o el índice global.
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="font-playfair text-xl font-semibold tracking-tight text-archive-gold">
                  Relaciones · entrada
                </h3>
                <ul className="mt-4 space-y-4 font-mono text-sm">
                  {incoming.map((r) => (
                    <li
                      key={r.id}
                      className="rounded border border-archive-border/50 bg-archive-void/25 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link2
                          className="h-3.5 w-3.5 shrink-0 text-archive-muted"
                          aria-hidden
                        />
                        <button
                          type="button"
                          onClick={() => {
                            selectEntity(r.source_entity_id);
                          }}
                          className="min-w-0 flex-1 truncate text-left text-archive-ink underline decoration-archive-border decoration-dotted underline-offset-4 transition hover:decoration-archive-gold"
                        >
                          ← {r.source_entity.name}
                        </button>
                        <span className="text-archive-muted">
                          ({r.label ?? r.relation_key})
                        </span>
                        <button
                          type="button"
                          title="Editar relación"
                          onClick={() =>
                            openModal({
                              kind: "editRelationship",
                              relationshipId: r.id,
                            })
                          }
                          className="rounded p-1 text-archive-muted transition hover:text-archive-gold"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          title="Eliminar relación"
                          onClick={() =>
                            openModal({
                              kind: "confirmDelete",
                              target: {
                                kind: "relationship",
                                id: r.id,
                                title: r.label ?? r.relation_key,
                              },
                            })
                          }
                          className="rounded p-1 text-archive-muted transition hover:text-archive-crimson"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                      <RelationDossierEditRow
                        rel={r}
                        refreshRelationships={refreshRelationships}
                        setError={setError}
                      />
                    </li>
                  ))}
                  {incoming.length === 0 && (
                    <li className="rounded border border-archive-border/50 px-3 py-4 font-mono text-xs leading-relaxed text-archive-muted">
                      Ningún otro nodo apunta aquí todavía.
                    </li>
                  )}
                </ul>
              </div>
            </section>

            <footer className="flex flex-wrap gap-3 border-t border-archive-border pt-8">
              <button
                type="button"
                onClick={() =>
                  openModal({
                    kind: "createRelationship",
                    defaultSourceId: entity.id,
                  })
                }
                className="inline-flex items-center gap-2 bg-archive-crimson px-5 py-2.5 font-mono text-sm text-archive-ink transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Nueva relación desde esta entidad
              </button>
              <button
                type="button"
                onClick={requestDeleteEntity}
                className="inline-flex items-center gap-2 border border-archive-crimson px-5 py-2.5 font-mono text-sm text-archive-crimson transition hover:bg-archive-crimson/15"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Eliminar entidad
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function formatRelationPeriod(r: RelationshipWithEntities): string {
  if (r.year_start == null && r.year_end == null) {
    return "Vínculo permanente (sin fechas)";
  }
  if (r.year_start != null && r.year_end != null) {
    return `Activo ${r.year_start} — ${r.year_end}`;
  }
  if (r.year_start != null) {
    return `Desde ${r.year_start}`;
  }
  return `Hasta ${r.year_end}`;
}

function TensionReadBar({ level }: { level: number }) {
  const L = Math.max(0, Math.min(100, level));
  return (
    <div className="mt-1 w-full max-w-xs">
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-archive-muted">
        <span>Tensión</span>
        <span className="text-archive-ink/80">{L}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-archive-border/40">
        <div
          className="h-full rounded-sm"
          style={{
            width: `${L}%`,
            background:
              "linear-gradient(90deg, rgb(45 107 74), rgb(201 162 39) 50%, rgb(155 44 44))",
            opacity: 0.92,
          }}
        />
      </div>
    </div>
  );
}

function RelationDossierEditRow({
  rel,
  refreshRelationships,
  setError,
}: {
  rel: RelationshipWithEntities;
  refreshRelationships: () => Promise<void>;
  setError: (msg: string | null) => void;
}) {
  const [tension, setTension] = useState(rel.tension_level);
  const [notes, setNotes] = useState(rel.tension_notes ?? "");
  const [ys, setYs] = useState(
    rel.year_start != null ? String(rel.year_start) : ""
  );
  const [ye, setYe] = useState(
    rel.year_end != null ? String(rel.year_end) : ""
  );

  useEffect(() => {
    setTension(rel.tension_level);
    setNotes(rel.tension_notes ?? "");
    setYs(rel.year_start != null ? String(rel.year_start) : "");
    setYe(rel.year_end != null ? String(rel.year_end) : "");
  }, [
    rel.id,
    rel.tension_level,
    rel.tension_notes,
    rel.year_start,
    rel.year_end,
  ]);

  const saveRel = useDebouncedCallback(
    async (body: {
      tension_level?: number;
      tension_notes?: string | null;
      year_start?: number | null;
      year_end?: number | null;
    }) => {
      try {
        await archiveApi.patchRelationship(rel.id, body);
        await refreshRelationships();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar relación");
      }
    },
    500
  );

  return (
    <div className="mt-3 space-y-3 border-t border-archive-border/40 pt-3">
      <p className="font-mono text-[10px] text-archive-muted">
        {formatRelationPeriod(rel)}
      </p>
      <TensionReadBar level={tension} />
      <label className="block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
        Ajustar tensión
        <input
          type="range"
          min={0}
          max={100}
          value={tension}
          onChange={(e) => {
            const v = Number(e.target.value);
            setTension(v);
            saveRel({ tension_level: v });
          }}
          className="mt-1 w-full max-w-xs accent-archive-gold"
        />
      </label>
      <label className="block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
        Notas de tensión
        <textarea
          value={notes}
          rows={2}
          onChange={(e) => {
            const v = e.target.value;
            setNotes(v);
            saveRel({ tension_notes: v });
          }}
          className="mt-1 w-full border border-archive-border bg-archive-panel px-2 py-1.5 text-xs text-archive-ink"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
          Año inicio (vacío = permanente)
          <input
            type="number"
            value={ys}
            onChange={(e) => {
              const raw = e.target.value;
              setYs(raw);
              const trimmed = raw.trim();
              const yv =
                trimmed === "" ? null : Number.parseInt(trimmed, 10);
              if (trimmed !== "" && !Number.isFinite(yv)) return;
              saveRel({ year_start: yv });
            }}
            className="mt-1 block w-28 border border-archive-border bg-archive-panel px-2 py-1 text-xs text-archive-ink"
          />
        </label>
        <label className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
          Año fin
          <input
            type="number"
            value={ye}
            onChange={(e) => {
              const raw = e.target.value;
              setYe(raw);
              const trimmed = raw.trim();
              const yv =
                trimmed === "" ? null : Number.parseInt(trimmed, 10);
              if (trimmed !== "" && !Number.isFinite(yv)) return;
              saveRel({ year_end: yv });
            }}
            className="mt-1 block w-28 border border-archive-border bg-archive-panel px-2 py-1 text-xs text-archive-ink"
          />
        </label>
      </div>
    </div>
  );
}

function RelationPill({
  entityName,
  relationLabel,
  direction,
  onNavigate,
}: {
  entityName: string;
  relationLabel: string;
  direction: "in" | "out";
  onNavigate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="group inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-archive-border/70 bg-archive-void/60 py-1.5 pl-3 pr-2 text-left transition hover:border-archive-gold/45 hover:bg-archive-gold/[0.07]"
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
        {direction === "out" ? "→" : "←"}
      </span>
      <span className="min-w-0 truncate font-playfair text-sm text-archive-ink group-hover:text-archive-gold">
        {entityName}
      </span>
      <span className="shrink-0 rounded-full border border-archive-crimson/35 bg-archive-crimson/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-archive-gold">
        {relationLabel}
      </span>
    </button>
  );
}

function AttributePresentBlock({
  attribute,
  row,
}: {
  attribute: EntityWithTypeAndValues["values"][number]["attribute"];
  row: Omit<EntityWithTypeAndValues["values"][number], "attribute">;
}) {
  const vt = attribute.value_type;
  const empty = attributeIsEmpty(vt, row);

  let valueContent: ReactNode;

  if (vt === "boolean") {
    valueContent =
      row.value_boolean === true ? (
        <span className="text-archive-ink">Sí</span>
      ) : row.value_boolean === false ? (
        <span className="text-archive-ink">No</span>
      ) : (
        <span className="italic text-archive-muted">Sin indicar</span>
      );
  } else if (vt === "long_text") {
    const raw = displayValue(vt, row);
    valueContent = empty ? (
      <span className="italic text-archive-muted">Sin texto registrado</span>
    ) : (
      <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-archive-ink/95">
        {raw}
      </p>
    );
  } else if (vt === "json") {
    const raw = displayValue(vt, row);
    valueContent = empty ? (
      <span className="italic text-archive-muted">Sin datos estructurados</span>
    ) : (
      <pre className="overflow-x-auto whitespace-pre-wrap border-l border-archive-border/50 pl-3 font-mono text-[11px] leading-relaxed text-archive-ink/90">
        {raw}
      </pre>
    );
  } else {
    const raw = displayValue(vt, row);
    valueContent = empty ? (
      <span className="italic text-archive-muted">Sin dato</span>
    ) : (
      <p className="break-words font-mono text-sm leading-relaxed text-archive-ink/95">
        {raw}
      </p>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-archive-muted">
        {attribute.label}
      </div>
      <div className="mt-2 border-l-2 border-archive-gold/35 pl-4">
        {valueContent}
      </div>
      <div className="mt-2 font-mono text-[10px] text-archive-border/90">
        {attribute.key}
      </div>
    </div>
  );
}

function AttributeEditor({
  attribute,
  row,
  onCommit,
}: {
  attribute: EntityWithTypeAndValues["values"][number]["attribute"];
  row: Omit<EntityWithTypeAndValues["values"][number], "attribute">;
  onCommit: (raw: string, opts?: { checked?: boolean }) => void;
}) {
  const initial = displayValue(attribute.value_type, row);
  const [local, setLocal] = useState(initial);

  useEffect(() => {
    setLocal(displayValue(attribute.value_type, row));
  }, [attribute.value_type, row, attribute.id]);

  const vt = attribute.value_type;

  if (vt === "boolean") {
    return (
      <div className="mt-2">
        <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-sm">
          <input
            type="checkbox"
            checked={row.value_boolean === true}
            onChange={(e) => {
              onCommit("", { checked: e.target.checked });
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
          onCommit(v);
        }}
        rows={4}
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none transition hover:border-archive-muted focus:border-archive-crimson"
      />
    );
  }

  if (vt === "json") {
    return (
      <textarea
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          onCommit(v);
        }}
        rows={6}
        spellCheck={false}
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-xs text-archive-ink outline-none transition hover:border-archive-muted focus:border-archive-crimson"
      />
    );
  }

  if (vt === "date") {
    return (
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          onCommit(v);
        }}
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none transition hover:border-archive-muted focus:border-archive-crimson"
      />
    );
  }

  const inputType =
    vt === "number" ? "number" : vt === "entity_ref" ? "text" : "text";

  return (
    <input
      type={inputType}
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        onCommit(v);
      }}
      placeholder={vt === "entity_ref" ? "UUID de entidad referenciada" : ""}
      className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none transition hover:border-archive-muted focus:border-archive-crimson"
    />
  );
}
