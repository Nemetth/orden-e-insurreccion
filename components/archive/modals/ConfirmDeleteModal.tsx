"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import type { ConfirmDeleteTarget } from "@/store/archive-store";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";

type Props = {
  target: ConfirmDeleteTarget;
};

export function ConfirmDeleteModal({ target }: Props) {
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);
  const selectedEntityId = useArchiveStore((s) => s.selectedEntityId);
  const selectEntity = useArchiveStore((s) => s.selectEntity);
  const setMode = useArchiveStore((s) => s.setMode);
  const pushToast = useToastStore((s) => s.pushToast);

  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      if (target.kind === "type") {
        await archiveApi.deleteType(target.id);
        pushToast("Tipo eliminado del archivo", "success");
      } else if (target.kind === "entity") {
        await archiveApi.deleteEntity(target.id);
        if (selectedEntityId === target.id) {
          selectEntity(null);
          setMode("graph");
        }
        pushToast("Entidad eliminada", "success");
      } else {
        await archiveApi.deleteRelationship(target.id);
        pushToast("Relación eliminada", "success");
      }
      await refreshAll();
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
      pushToast(
        e instanceof Error ? e.message : "No se pudo eliminar",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  const title =
    target.kind === "type"
      ? "Eliminar tipo de entidad"
      : target.kind === "entity"
        ? "Eliminar entidad"
        : "Eliminar relación";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div
        className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-archive-crimson" aria-hidden />
          <div>
            <h2 className="font-playfair text-xl text-archive-gold">{title}</h2>
            <p className="mt-3 font-mono text-sm leading-relaxed text-archive-muted">
              ¿Seguro que querés borrar{" "}
              <span className="text-archive-ink">«{target.title}»</span>? Esta
              acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            disabled={busy}
            className="border border-archive-border px-4 py-2 font-mono text-sm text-archive-muted transition hover:border-archive-muted hover:text-archive-ink disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="bg-archive-crimson px-4 py-2 font-mono text-sm text-archive-ink transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
