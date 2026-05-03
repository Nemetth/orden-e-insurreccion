"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, ListPlus, Pencil, Plus, Trash2 } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";
import type { EntityWithTypeAndValues } from "@/types/api";
import type { AttributeValueType } from "@/types/database";

import { displayValue, patchForAttributeInput } from "./value-patch";
import { useDebouncedCallback } from "@/hooks/use-debounce";

export function DossierPanel() {
  const entities = useArchiveStore((s) => s.entities);
  const relationships = useArchiveStore((s) => s.relationships);
  const selectedId = useArchiveStore((s) => s.selectedEntityId);
  const openModal = useArchiveStore((s) => s.openModal);
  const upsertEntity = useArchiveStore((s) => s.upsertEntity);
  const selectEntity = useArchiveStore((s) => s.selectEntity);
  const setError = useArchiveStore((s) => s.setError);
  const pushToast = useToastStore((s) => s.pushToast);

  const entity = useMemo(
    () => entities.find((e) => e.id === selectedId) ?? null,
    [entities, selectedId]
  );

  const [nameEdit, setNameEdit] = useState("");

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

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="border-b border-archive-border pb-6">
          <input
            value={nameEdit}
            onChange={(e) => {
              setNameEdit(e.target.value);
              saveName(e.target.value);
            }}
            className="w-full bg-transparent font-playfair text-3xl font-semibold tracking-tight text-archive-gold outline-none placeholder:text-archive-muted transition hover:text-archive-gold focus:ring-0"
            aria-label="Nombre de la entidad"
          />
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-archive-muted">
            <span className="text-archive-ink">{entity.entity_type.name}</span>
            <span className="mx-2 text-archive-border">·</span>
            ref. {entity.id.slice(0, 8)}…
          </p>
        </header>

        <section>
          <h3 className="font-playfair text-xl font-semibold tracking-tight text-archive-gold">
            Atributos
          </h3>
          <p className="mt-1 font-mono text-[11px] text-archive-muted">
            Campos declarados para el tipo; los valores se guardan al editar.
          </p>
          <div className="mt-5 space-y-5">
            {entity.values.length === 0 && (
              <div className="rounded border border-archive-border/60 bg-archive-void/30 px-4 py-6 text-center font-mono text-sm text-archive-muted">
                Este tipo aún no tiene atributos. Añadí campos desde el botón de
                abajo para estructurar el dossier.
              </div>
            )}
            {entity.values.map(({ attribute, ...row }) => (
              <div
                key={row.id}
                className="border-l-2 border-archive-crimson/60 pl-4"
              >
                <label className="font-mono text-xs uppercase tracking-wider text-archive-muted">
                  {attribute.label}
                  <span className="ml-2 text-archive-border">
                    ({attribute.key})
                  </span>
                </label>
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
              openModal({ kind: "addAttribute", typeId: entity.entity_type_id })
            }
            className="mt-6 inline-flex items-center gap-2 border border-dashed border-archive-gold/50 px-4 py-2 font-mono text-xs uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/10"
          >
            <ListPlus className="h-4 w-4" aria-hidden />
            Atributo al tipo
          </button>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-playfair text-xl font-semibold tracking-tight text-archive-gold">
              Relaciones · salida
            </h3>
            <ul className="mt-4 space-y-2 font-mono text-sm">
              {outgoing.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded border border-transparent px-1 py-1 transition hover:border-archive-border/80 hover:bg-archive-void/40"
                >
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
                </li>
              ))}
              {outgoing.length === 0 && (
                <li className="rounded border border-archive-border/50 px-3 py-4 font-mono text-xs leading-relaxed text-archive-muted">
                  No hay aristas de salida. Registrá un vínculo desde el pie de
                  página o el índice global.
                </li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-playfair text-xl font-semibold tracking-tight text-archive-gold">
              Relaciones · entrada
            </h3>
            <ul className="mt-4 space-y-2 font-mono text-sm">
              {incoming.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded border border-transparent px-1 py-1 transition hover:border-archive-border/80 hover:bg-archive-void/40"
                >
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
      className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
    />
  );
}
