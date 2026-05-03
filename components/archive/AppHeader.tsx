"use client";

import { useArchiveStore } from "@/store/archive-store";
import type { ViewMode } from "@/store/archive-store";

export function AppHeader() {
  const mode = useArchiveStore((s) => s.mode);
  const setMode = useArchiveStore((s) => s.setMode);

  function Tab({
    value,
    children,
  }: {
    value: ViewMode;
    children: React.ReactNode;
  }) {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        className={`border px-5 py-2 font-mono text-xs uppercase tracking-[0.12em] transition ${
          active
            ? "border-archive-gold bg-archive-gold/15 text-archive-gold"
            : "border-archive-border text-archive-muted hover:border-archive-muted hover:text-archive-ink"
        }`}
      >
        {children}
      </button>
    );
  }

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-archive-border bg-archive-panel/90 px-6 backdrop-blur-sm">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-playfair text-xl font-semibold tracking-tight text-archive-gold">
          Orden e Insurrección
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-archive-muted">
          Archivo vivo · clasificado
        </p>
      </div>
      <div className="flex gap-2">
        <Tab value="graph">Mapa</Tab>
        <Tab value="dossier">Dossier</Tab>
      </div>
    </header>
  );
}
