"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect } from "react";

import { useArchiveStore } from "@/store/archive-store";

import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { ChroniclePanel } from "./ChroniclePanel";
import { DossierPanel } from "./DossierPanel";
import { ModalHost } from "./ModalHost";
import { ToastHost } from "./ToastHost";

/** D3 usa APIs de navegador; cargar solo en cliente evita 500 en SSR. */
const GraphMapView = dynamic(
  () => import("./GraphMapView").then((m) => m.GraphMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center font-mono text-sm text-archive-muted">
        Cargando mapa táctico…
      </div>
    ),
  }
);

const TerritoryMapPanel = dynamic(
  () => import("./TerritoryMapPanel").then((m) => m.TerritoryMapPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center font-mono text-sm text-archive-muted">
        Cargando territorio…
      </div>
    ),
  }
);

export function ArchiveApp() {
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const loading = useArchiveStore((s) => s.loading);
  const error = useArchiveStore((s) => s.error);
  const setError = useArchiveStore((s) => s.setError);
  const mode = useArchiveStore((s) => s.mode);
  const entities = useArchiveStore((s) => s.entities);
  const relationships = useArchiveStore((s) => s.relationships);
  const selectedEntityId = useArchiveStore((s) => s.selectedEntityId);
  const selectEntity = useArchiveStore((s) => s.selectEntity);
  const setMode = useArchiveStore((s) => s.setMode);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const onSelectEntity = useCallback(
    (id: string) => {
      selectEntity(id);
      setMode("dossier");
    },
    [selectEntity, setMode]
  );

  return (
    <div className="flex min-h-screen bg-archive-void text-archive-ink">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />

        {error && (
          <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-archive-crimson/40 bg-archive-crimson/10 px-6 py-2 font-mono text-xs text-archive-ink">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-archive-gold underline"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="relative min-h-0 flex-1">
          {loading && entities.length === 0 && relationships.length === 0 ? (
            <div className="flex h-full items-center justify-center font-mono text-sm text-archive-muted">
              Desclasificando índice…
            </div>
          ) : mode === "graph" ? (
            <GraphMapView
              entities={entities}
              relationships={relationships}
              selectedEntityId={selectedEntityId}
              onSelectEntity={onSelectEntity}
            />
          ) : mode === "territory" ? (
            <TerritoryMapPanel />
          ) : mode === "chronicle" ? (
            <ChroniclePanel />
          ) : (
            <DossierPanel />
          )}
        </div>
      </div>

      <ModalHost />
      <ToastHost />
    </div>
  );
}
