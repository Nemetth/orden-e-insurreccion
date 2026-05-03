"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import type { EntityWithTypeAndValues } from "@/types/api";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";

type Props = {
  entityId: string;
};

function sameNameInType(
  entities: EntityWithTypeAndValues[],
  entityTypeId: string,
  name: string,
  excludeId: string
): boolean {
  const n = name.trim().toLowerCase();
  return entities.some(
    (e) =>
      e.id !== excludeId &&
      e.entity_type_id === entityTypeId &&
      e.name.trim().toLowerCase() === n
  );
}

export function EditEntityModal({ entityId }: Props) {
  const entities = useArchiveStore((s) => s.entities);
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);
  const upsertEntity = useArchiveStore((s) => s.upsertEntity);
  const pushToast = useToastStore((s) => s.pushToast);

  const entity = useMemo(
    () => entities.find((e) => e.id === entityId),
    [entities, entityId]
  );

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (entity) setName(entity.name);
  }, [entity]);

  if (!entity) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
        <div className="border border-archive-border bg-archive-panel p-6 font-mono text-sm text-archive-muted">
          Entidad no encontrada.
        </div>
      </div>
    );
  }

  const ent = entity;

  function validate(): boolean {
    if (!entity) return false;
    setFieldError(null);
    if (!name.trim()) {
      setFieldError("El nombre es obligatorio.");
      return false;
    }
    if (
      sameNameInType(
        entities,
        ent.entity_type_id,
        name,
        ent.id
      )
    ) {
      setFieldError("Ya hay otra entidad con ese nombre en este tipo.");
      return false;
    }
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await archiveApi.patchEntity(ent.id, {
        name: name.trim(),
      });
      upsertEntity(updated);
      await refreshAll();
      pushToast("Entidad actualizada", "success");
      closeModal();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar la entidad";
      setFieldError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    !!name.trim() &&
    !sameNameInType(
      entities,
      ent.entity_type_id,
      name,
      ent.id
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div
        className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="edit-entity-title"
      >
        <div className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-archive-gold" aria-hidden />
          <h2
            id="edit-entity-title"
            className="font-playfair text-xl text-archive-gold"
          >
            Editar entidad
          </h2>
        </div>
        <p className="mt-2 font-mono text-xs text-archive-muted">
          Tipo:{" "}
          <span className="text-archive-ink">{ent.entity_type.name}</span> ·
          El color del nodo lo define el tipo de entidad.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {fieldError && (
            <p className="border border-archive-crimson/40 bg-archive-crimson/10 px-3 py-2 font-mono text-xs text-archive-ink">
              {fieldError}
            </p>
          )}
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Nombre
            </span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError(null);
              }}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="border border-archive-border px-4 py-2 font-mono text-sm text-archive-muted transition hover:border-archive-muted hover:text-archive-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !canSave}
              className="bg-archive-crimson px-4 py-2 font-mono text-sm text-archive-ink transition hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
