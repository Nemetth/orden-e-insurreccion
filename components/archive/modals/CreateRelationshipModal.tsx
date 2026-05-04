"use client";

import { useMemo, useState } from "react";
import { Link2 } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";

type Props = {
  defaultSourceId?: string;
};

export function CreateRelationshipModal({ defaultSourceId }: Props) {
  const entities = useArchiveStore((s) => s.entities);
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);
  const pushToast = useToastStore((s) => s.pushToast);

  const options = useMemo(
    () => [...entities].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [entities]
  );

  const [sourceId, setSourceId] = useState(
    defaultSourceId ?? options[0]?.id ?? ""
  );
  const [targetId, setTargetId] = useState(() => {
    const first = options.find(
      (e) => e.id !== (defaultSourceId ?? options[0]?.id)
    );
    return first?.id ?? "";
  });
  const [label, setLabel] = useState("");
  const [tensionLevel, setTensionLevel] = useState(50);
  const [tensionNotes, setTensionNotes] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const sameEnds = sourceId && targetId && sourceId === targetId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (!sourceId || !targetId || !label.trim()) {
      setFieldError("Completá origen, destino y etiqueta.");
      return;
    }
    if (sameEnds) {
      setFieldError("Origen y destino deben ser entidades distintas.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ys = yearStart.trim();
      const ye = yearEnd.trim();
      const ysv = ys === "" ? undefined : Number.parseInt(ys, 10);
      const yev = ye === "" ? undefined : Number.parseInt(ye, 10);
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

      await archiveApi.createRelationship({
        source_entity_id: sourceId,
        target_entity_id: targetId,
        label: label.trim(),
        tension_level: tensionLevel,
        tension_notes: tensionNotes.trim() || null,
        year_start: ys === "" ? null : ysv,
        year_end: ye === "" ? null : yev,
      });
      await refreshAll();
      pushToast("Relación registrada", "success");
      closeModal();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al crear vínculo";
      setFieldError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    !!sourceId &&
    !!targetId &&
    !!label.trim() &&
    !sameEnds;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-archive-gold" aria-hidden />
          <h2 className="font-playfair text-xl text-archive-gold">
            Nueva relación
          </h2>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {(fieldError || sameEnds) && (
            <p className="border border-archive-crimson/40 bg-archive-crimson/10 px-3 py-2 font-mono text-xs text-archive-ink">
              {fieldError ??
                "Origen y destino deben ser entidades distintas."}
            </p>
          )}
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Origen
            </span>
            <select
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value);
                setFieldError(null);
              }}
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
              onChange={(e) => {
                setTargetId(e.target.value);
                setFieldError(null);
              }}
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
              onChange={(e) => {
                setLabel(e.target.value);
                setFieldError(null);
              }}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
              placeholder="aliado de, ubicado en…"
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Tensión inicial ({tensionLevel})
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={tensionLevel}
              onChange={(e) => setTensionLevel(Number(e.target.value))}
              className="mt-2 w-full accent-archive-gold"
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Notas de tensión (opc.)
            </span>
            <textarea
              value={tensionNotes}
              onChange={(e) => setTensionNotes(e.target.value)}
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
                onChange={(e) => setYearStart(e.target.value)}
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
                onChange={(e) => setYearEnd(e.target.value)}
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
              disabled={saving || !canSubmit}
              className="bg-archive-crimson px-4 py-2 font-mono text-sm text-archive-ink transition hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Creando…" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
