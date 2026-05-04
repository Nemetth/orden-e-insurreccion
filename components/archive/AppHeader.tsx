"use client";

import type { ComponentType } from "react";
import { Globe2, History, Map, ScrollText } from "lucide-react";

import { useArchiveStore } from "@/store/archive-store";
import type { ViewMode } from "@/store/archive-store";

export function AppHeader() {
  const mode = useArchiveStore((s) => s.mode);
  const setMode = useArchiveStore((s) => s.setMode);

  function Tab({
    value,
    icon: Icon,
    children,
  }: {
    value: ViewMode;
    icon: ComponentType<{ className?: string }>;
    children: React.ReactNode;
  }) {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        className={`flex items-center gap-2 border px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] transition ${
          active
            ? "border-archive-gold bg-archive-gold/15 text-archive-gold"
            : "border-archive-border text-archive-muted hover:border-archive-muted hover:text-archive-ink"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
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
        <Tab value="graph" icon={Map}>
          Mapa
        </Tab>
        <Tab value="dossier" icon={ScrollText}>
          Dossier
        </Tab>
        <Tab value="chronicle" icon={History}>
          Crónica
        </Tab>
        <Tab value="territory" icon={Globe2}>
          Territorio
        </Tab>
      </div>
    </header>
  );
}
