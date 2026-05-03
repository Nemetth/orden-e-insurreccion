"use client";

import { useState } from "react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";

type Props = {
  defaultTypeId?: string;
};

export function CreateEntityModal({ defaultTypeId }: Props) {
  const types = useArchiveStore((s) => s.types);
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);

  const [typeId, setTypeId] = useState(defaultTypeId ?? types[0]?.id ?? "");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await archiveApi.createEntity({
        entity_type_id: typeId,
        name: name.trim(),
      });
      await refreshAll();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear entidad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl">
        <h2 className="font-playfair text-xl text-archive-gold">
          Nueva entidad
        </h2>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Tipo
            </span>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Nombre
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
              placeholder="Nombre en el archivo"
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="border border-archive-border px-4 py-2 font-mono text-sm text-archive-muted hover:text-archive-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !typeId}
              className="bg-archive-crimson px-4 py-2 font-mono text-sm text-archive-ink hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Creando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
