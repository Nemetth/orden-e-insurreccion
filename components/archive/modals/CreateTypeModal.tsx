"use client";

import { useState } from "react";

import { slugFromLabel } from "@/lib/slugify";
import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";

import { TYPE_COLOR_PALETTE } from "../constants";

export function CreateTypeModal() {
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);

  const [label, setLabel] = useState("");
  const [color, setColor] = useState<string>(TYPE_COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await archiveApi.createType({
        label: label.trim(),
        color,
        slug: slugFromLabel(label),
      });
      await refreshAll();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear tipo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div
        className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="modal-type-title"
      >
        <h2
          id="modal-type-title"
          className="font-playfair text-xl text-archive-gold"
        >
          Nuevo tipo de entidad
        </h2>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Etiqueta
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
              placeholder="Personaje, Lugar…"
              autoFocus
            />
          </label>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Color del tipo
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TYPE_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded border-2 transition ${
                    color === c
                      ? "border-archive-gold ring-1 ring-archive-gold"
                      : "border-archive-border"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
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
              disabled={saving || !label.trim()}
              className="bg-archive-crimson px-4 py-2 font-mono text-sm text-archive-ink hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Guardando…" : "Crear tipo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
