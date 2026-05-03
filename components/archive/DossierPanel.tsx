"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import type { EntityWithTypeAndValues } from "@/types/api";
import type { AttributeValueType } from "@/types/database";

import { displayValue, patchForAttributeInput } from "./value-patch";
import { useDebouncedCallback } from "@/hooks/use-debounce";

export function DossierPanel() {
  const entities = useArchiveStore((s) => s.entities);
  const relationships = useArchiveStore((s) => s.relationships);
  const selectedId = useArchiveStore((s) => s.selectedEntityId);
  const openModal = useArchiveStore((s) => s.openModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const upsertEntity = useArchiveStore((s) => s.upsertEntity);
  const selectEntity = useArchiveStore((s) => s.selectEntity);
  const setMode = useArchiveStore((s) => s.setMode);
  const setError = useArchiveStore((s) => s.setError);

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
    try {
      const updated = await archiveApi.patchEntity(entity.id, {
        name: name.trim(),
      });
      upsertEntity(updated);
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

  async function handleDelete() {
    if (!entity || !confirm(`¿Eliminar «${entity.name}» del archivo?`)) return;
    setError(null);
    try {
      await archiveApi.deleteEntity(entity.id);
      await refreshAll();
      selectEntity(null);
      setMode("graph");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  if (!selectedId || !entity) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="max-w-md text-center font-mono text-sm text-archive-muted">
          Seleccioná una entidad en el grafo o en el índice lateral para abrir su
          dossier clasificado.
        </p>
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
            className="w-full bg-transparent font-playfair text-3xl font-semibold tracking-tight text-archive-gold outline-none placeholder:text-archive-muted focus:ring-0"
          />
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-archive-muted">
            {entity.entity_type.name} · ref. {entity.id.slice(0, 8)}…
          </p>
        </header>

        <section>
          <h3 className="font-playfair text-lg text-archive-gold">Atributos</h3>
          <div className="mt-4 space-y-5">
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
            className="mt-6 border border-dashed border-archive-gold/50 px-4 py-2 font-mono text-xs uppercase tracking-wider text-archive-gold hover:bg-archive-gold/10"
          >
            + Atributo al tipo (propaga a todas las entidades del tipo)
          </button>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-playfair text-lg text-archive-gold">
              Relaciones · salida
            </h3>
            <ul className="mt-3 space-y-2 font-mono text-sm">
              {outgoing.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      selectEntity(r.target_entity_id);
                    }}
                    className="text-left text-archive-ink underline decoration-archive-border decoration-dotted underline-offset-4 hover:decoration-archive-gold"
                  >
                    → {r.target_entity.name}
                  </button>
                  <span className="ml-2 text-archive-muted">
                    ({r.label ?? r.relation_key})
                  </span>
                </li>
              ))}
              {outgoing.length === 0 && (
                <li className="text-archive-muted">Ninguna registrada.</li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-playfair text-lg text-archive-gold">
              Relaciones · entrada
            </h3>
            <ul className="mt-3 space-y-2 font-mono text-sm">
              {incoming.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      selectEntity(r.source_entity_id);
                    }}
                    className="text-left text-archive-ink underline decoration-archive-border decoration-dotted underline-offset-4 hover:decoration-archive-gold"
                  >
                    ← {r.source_entity.name}
                  </button>
                  <span className="ml-2 text-archive-muted">
                    ({r.label ?? r.relation_key})
                  </span>
                </li>
              ))}
              {incoming.length === 0 && (
                <li className="text-archive-muted">Ninguna registrada.</li>
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
            className="bg-archive-crimson px-5 py-2 font-mono text-sm text-archive-ink"
          >
            Nueva relación desde esta entidad
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="border border-archive-crimson px-5 py-2 font-mono text-sm text-archive-crimson hover:bg-archive-crimson/15"
          >
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
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
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
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-xs text-archive-ink outline-none focus:border-archive-crimson"
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
        className="mt-2 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
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
