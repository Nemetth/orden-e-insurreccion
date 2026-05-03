"use client";

import { useMemo, useState } from "react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";

type Props = {
  defaultSourceId?: string;
};

export function CreateRelationshipModal({ defaultSourceId }: Props) {
  const entities = useArchiveStore((s) => s.entities);
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);

  const options = useMemo(
    () =>
      [...entities].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [entities]
  );

  const [sourceId, setSourceId] = useState(
    defaultSourceId ?? options[0]?.id ?? ""
  );
  const [targetId, setTargetId] = useState(() => {
    const first = options.find((e) => e.id !== (defaultSourceId ?? options[0]?.id));
    return first?.id ?? "";
  });
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceId || !targetId || !label.trim() || sourceId === targetId) {
      setError("Origen, destino y etiqueta válidos; origen ≠ destino.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await archiveApi.createRelationship({
        source_entity_id: sourceId,
        target_entity_id: targetId,
        label: label.trim(),
      });
      await refreshAll();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear vínculo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl">
        <h2 className="font-playfair text-xl text-archive-gold">
          Nueva relación
        </h2>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Origen
            </span>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
            >
              {options.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.entity_type.name})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Destino
            </span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
            >
              {options.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.entity_type.name})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Etiqueta del vínculo
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
              placeholder="aliado de, ubicado en…"
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
              disabled={
                saving ||
                !label.trim() ||
                !sourceId ||
                !targetId ||
                sourceId === targetId
              }
              className="bg-archive-crimson px-4 py-2 font-mono text-sm text-archive-ink hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Creando…" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
