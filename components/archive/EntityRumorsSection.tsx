"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";
import type { EntityRumorWithSource, RumorCredibility } from "@/types/api";

type Mode = "present" | "edit";

const CRED_OPTIONS: RumorCredibility[] = [
  "confirmado",
  "probable",
  "dudoso",
  "falso",
];

function credibilityBadge(c: string) {
  const base =
    "inline-flex shrink-0 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider";
  switch (c) {
    case "confirmado":
      return `${base} border-emerald-900/80 bg-emerald-950/80 text-emerald-100`;
    case "probable":
      return `${base} border-amber-700/50 bg-amber-950/50 text-amber-100`;
    case "falso":
      return `${base} border-red-900/70 bg-red-950/80 text-red-100`;
    default:
      return `${base} border-archive-border bg-archive-panel text-archive-muted`;
  }
}

function credibilityLabel(c: string) {
  switch (c) {
    case "confirmado":
      return "Confirmado";
    case "probable":
      return "Probable";
    case "falso":
      return "Falso";
    default:
      return "Dudoso";
  }
}

export function EntityRumorsSection({
  entityId,
  mode,
}: {
  entityId: string;
  mode: Mode;
}) {
  const entities = useArchiveStore((s) => s.entities);
  const [rumors, setRumors] = useState<EntityRumorWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const pushToast = useToastStore((s) => s.pushToast);

  const [content, setContent] = useState("");
  const [year, setYear] = useState("");
  const [cred, setCred] = useState<RumorCredibility>("dudoso");
  const [sourceId, setSourceId] = useState("");

  const sortedEntities = [...entities].sort((a, b) =>
    a.name.localeCompare(b.name, "es")
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await archiveApi.getEntityRumors(entityId);
      setRumors(list);
    } catch {
      setRumors([]);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitRumor(e: React.FormEvent) {
    e.preventDefault();
    const txt = content.trim();
    if (!txt) {
      pushToast("El rumor necesita texto", "error");
      return;
    }
    const y =
      year.trim() === "" ? null : Number.parseInt(year.trim(), 10);
    if (year.trim() !== "" && !Number.isFinite(y)) {
      pushToast("Año inválido", "error");
      return;
    }
    try {
      await archiveApi.postEntityRumor(entityId, {
        content: txt,
        year: y,
        credibility: cred,
        source_entity_id: sourceId || null,
      });
      setContent("");
      setYear("");
      setCred("dudoso");
      setSourceId("");
      await load();
      pushToast("Intel registrada", "success");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Error al crear rumor",
        "error"
      );
    }
  }

  async function removeRumor(id: string) {
    try {
      await archiveApi.deleteRumor(id);
      setRumors((r) => r.filter((x) => x.id !== id));
      pushToast("Rumor eliminado", "success");
    } catch {
      pushToast("Error al eliminar", "error");
    }
  }

  return (
    <section className="space-y-5">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-archive-muted">
        Inteligencia
      </h2>

      {mode === "edit" && (
        <form
          onSubmit={submitRumor}
          className="space-y-3 border border-archive-border/60 bg-archive-void/30 p-4"
        >
          <label className="block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
            Fuente (quien lo dice)
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="mt-1 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink"
            >
              <option value="">— Anónimo / sin fuente —</option>
              {sortedEntities.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.name} ({en.entity_type.name})
                </option>
              ))}
            </select>
          </label>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
            Contenido
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-archive-border bg-archive-panel px-3 py-2 font-mono text-sm text-archive-ink"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
              Año (opc.)
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="p. ej. 1848"
                className="mt-1 w-28 border border-archive-border bg-archive-panel px-2 py-1.5 font-mono text-sm text-archive-ink"
              />
            </label>
            <label className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
              Credibilidad
              <select
                value={cred}
                onChange={(e) => setCred(e.target.value as RumorCredibility)}
                className="mt-1 block border border-archive-border bg-archive-panel px-2 py-1.5 font-mono text-sm text-archive-ink"
              >
                {CRED_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {credibilityLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-archive-crimson px-4 py-2 font-mono text-xs text-archive-ink transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Registrar rumor
          </button>
        </form>
      )}

      {loading ? (
        <p className="font-mono text-xs text-archive-muted">
          Recuperando informes…
        </p>
      ) : (
        <ul className="space-y-4">
          {rumors.map((r) => (
            <li
              key={r.id}
              className="border border-archive-border/55 bg-archive-panel/40 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-archive-muted">
                    Fuente
                    <span className="mt-1 block font-playfair text-base normal-case tracking-normal text-archive-ink">
                      {r.source_entity?.name ?? "— Sin fuente identificada —"}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-archive-ink/95">
                    {r.content}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[10px] text-archive-muted">
                    {r.year != null && (
                      <span>
                        Año ref.{" "}
                        <span className="text-archive-gold">{r.year}</span>
                      </span>
                    )}
                    <span className={credibilityBadge(r.credibility)}>
                      {credibilityLabel(r.credibility)}
                    </span>
                  </div>
                </div>
                {mode === "edit" && (
                  <button
                    type="button"
                    title="Eliminar rumor"
                    onClick={() => void removeRumor(r.id)}
                    className="shrink-0 border border-archive-border p-2 text-archive-muted hover:border-archive-crimson/50 hover:text-archive-crimson"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          ))}
          {rumors.length === 0 && (
            <li className="border border-dashed border-archive-border/60 px-4 py-6 text-center font-mono text-sm text-archive-muted">
              Sin rumores registrados.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
