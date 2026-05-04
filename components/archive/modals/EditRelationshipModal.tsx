"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2 } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";

type Props = {
  relationshipId: string;
};

export function EditRelationshipModal({ relationshipId }: Props) {
  const relationships = useArchiveStore((s) => s.relationships);
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);
  const pushToast = useToastStore((s) => s.pushToast);

  const rel = useMemo(
    () => relationships.find((r) => r.id === relationshipId),
    [relationships, relationshipId]
  );

  const [label, setLabel] = useState("");
  const [relationKey, setRelationKey] = useState("");
  const [tensionLevel, setTensionLevel] = useState(50);
  const [tensionNotes, setTensionNotes] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (rel) {
      setLabel(rel.label ?? "");
      setRelationKey(rel.relation_key ?? "");
      setTensionLevel(rel.tension_level ?? 50);
      setTensionNotes(rel.tension_notes ?? "");
      setYearStart(
        rel.year_start != null ? String(rel.year_start) : ""
      );
      setYearEnd(rel.year_end != null ? String(rel.year_end) : "");
    }
  }, [rel]);

  if (!rel) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
        <div className="border border-archive-border bg-archive-panel p-6 font-mono text-sm text-archive-muted">
          Relación no encontrada.
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    const lb = label.trim();
    const rk = relationKey.trim();
    if (!lb) {
      setFieldError("La etiqueta es obligatoria.");
      return;
    }
    if (!rk) {
      setFieldError("La clave semántica es obligatoria.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ys = yearStart.trim();
      const ye = yearEnd.trim();
      const ysv = ys === "" ? null : Number.parseInt(ys, 10);
      const yev = ye === "" ? null : Number.parseInt(ye, 10);
      if (ys !== "" && !Number.isFinite(ysv)) {
        setFieldError("Año de inicio inválido.");
        setSaving(false);
        return;
      }
      if (ye !== "" && !Number.isFinite(yev)) {
        setFieldError("Año de fin inválido.");
        setSaving(false);
        return;
      }

      await archiveApi.patchRelationship(relationshipId, {
        label: lb,
        relation_key: rk,
        tension_level: tensionLevel,
        tension_notes: tensionNotes.trim() || null,
        year_start: ysv,
        year_end: yev,
      });
      await refreshAll();
      pushToast("Relación actualizada", "success");
      closeModal();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar la relación";
      setFieldError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!label.trim() && !!relationKey.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div
        className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="edit-rel-title"
      >
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-archive-gold" aria-hidden />
          <h2
            id="edit-rel-title"
            className="font-playfair text-xl text-archive-gold"
          >
            Editar relación
          </h2>
        </div>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-archive-muted">
          {rel.source_entity.name} → {rel.target_entity.name}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {fieldError && (
            <p className="border border-archive-crimson/40 bg-archive-crimson/10 px-3 py-2 font-mono text-xs text-archive-ink">
              {fieldError}
            </p>
          )}
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Etiqueta visible
            </span>
            <input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setFieldError(null);
              }}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Clave semántica (relation_key)
            </span>
            <input
              value={relationKey}
              onChange={(e) => {
                setRelationKey(e.target.value);
                setFieldError(null);
              }}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
              spellCheck={false}
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Tensión ({tensionLevel})
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={tensionLevel}
              onChange={(e) => {
                setTensionLevel(Number(e.target.value));
                setFieldError(null);
              }}
              className="mt-2 w-full accent-archive-gold"
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Notas de tensión
            </span>
            <textarea
              value={tensionNotes}
              onChange={(e) => {
                setTensionNotes(e.target.value);
                setFieldError(null);
              }}
              rows={2}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-xs text-archive-ink outline-none focus:border-archive-crimson"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
                Año inicio (opc.)
              </span>
              <input
                type="number"
                value={yearStart}
                onChange={(e) => {
                  setYearStart(e.target.value);
                  setFieldError(null);
                }}
                className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
              />
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
                Año fin (opc.)
              </span>
              <input
                type="number"
                value={yearEnd}
                onChange={(e) => {
                  setYearEnd(e.target.value);
                  setFieldError(null);
                }}
                className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
              />
            </label>
          </div>
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
