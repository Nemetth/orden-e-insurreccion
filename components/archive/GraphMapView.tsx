"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useArchiveStore } from "@/store/archive-store";
import type {
  EntityWithTypeAndValues,
  RelationshipWithEntities,
} from "@/types/api";

import { GraphCanvas } from "./GraphCanvas";

function yearBoundsFromRelationships(
  rels: RelationshipWithEntities[]
): { min: number; max: number } {
  const cy = new Date().getFullYear();
  let min = cy;
  let max = cy;
  for (const r of rels) {
    if (r.year_start != null) {
      min = Math.min(min, r.year_start);
      max = Math.max(max, r.year_start);
    }
    if (r.year_end != null) {
      min = Math.min(min, r.year_end);
      max = Math.max(max, r.year_end);
    }
  }
  if (min > max) return { min: cy, max: cy };
  return { min, max };
}

type Props = {
  entities: EntityWithTypeAndValues[];
  relationships: RelationshipWithEntities[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
};

export function GraphMapView({
  entities,
  relationships,
  selectedEntityId,
  onSelectEntity,
}: Props) {
  const setError = useArchiveStore((s) => s.setError);

  const [temporalOn, setTemporalOn] = useState(false);
  const { min: yMin, max: yMax } = useMemo(
    () => yearBoundsFromRelationships(relationships),
    [relationships]
  );

  const [graphYear, setGraphYear] = useState(yMax);
  const [filtered, setFiltered] = useState<RelationshipWithEntities[] | null>(
    null
  );
  const [loadingYear, setLoadingYear] = useState(false);

  useEffect(() => {
    setGraphYear((y) => {
      if (y < yMin) return yMin;
      if (y > yMax) return yMax;
      return y;
    });
  }, [yMin, yMax]);

  const loadYear = useCallback(
    async (y: number) => {
      setLoadingYear(true);
      try {
        const data = await archiveApi.getRelationshipsAtYear(y);
        setFiltered(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al filtrar por año");
        setFiltered(null);
      } finally {
        setLoadingYear(false);
      }
    },
    [setError]
  );

  useEffect(() => {
    if (!temporalOn) {
      setFiltered(null);
      return;
    }
    void loadYear(graphYear);
  }, [temporalOn, graphYear, loadYear]);

  const graphRels = temporalOn && filtered ? filtered : relationships;

  return (
    <div className="absolute inset-0 min-h-0">
      <GraphCanvas
        entities={entities}
        relationships={graphRels}
        selectedEntityId={selectedEntityId}
        onSelectEntity={onSelectEntity}
      />

      {temporalOn && (
        <div
          className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 text-center"
          aria-hidden
        >
          <p className="font-playfair text-6xl font-semibold tabular-nums tracking-tight text-archive-gold/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] md:text-7xl">
            {graphYear}
          </p>
          {loadingYear && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-archive-muted">
              Sincronizando aristas…
            </p>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-archive-border/80 bg-archive-panel/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setTemporalOn((v) => !v)}
            className="inline-flex shrink-0 items-center justify-center gap-2 border border-archive-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-archive-muted transition hover:border-archive-gold/50 hover:text-archive-gold"
          >
            {temporalOn ? (
              <>
                <EyeOff className="h-4 w-4" aria-hidden />
                Vista completa
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" aria-hidden />
                Grafo temporal
              </>
            )}
          </button>

          {temporalOn && (
            <div className="min-w-0 flex-1 px-1">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
                Año activo · {yMin} — {yMax}
              </label>
              <input
                type="range"
                min={yMin}
                max={yMax}
                step={1}
                value={graphYear}
                onChange={(e) => setGraphYear(Number(e.target.value))}
                className="mt-2 w-full accent-archive-gold"
                aria-valuemin={yMin}
                aria-valuemax={yMax}
                aria-valuenow={graphYear}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
