"use client";

import { X } from "lucide-react";

import { useToastStore } from "@/store/toast-store";

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[60] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 border px-4 py-3 font-mono text-xs shadow-lg backdrop-blur-sm ${
            t.tone === "error"
              ? "border-archive-crimson/50 bg-archive-crimson/20 text-archive-ink"
              : "border-archive-border bg-archive-panel/95 text-archive-ink"
          }`}
        >
          <p className="flex-1 leading-relaxed">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded border border-transparent p-0.5 text-archive-muted transition hover:border-archive-border hover:text-archive-ink"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
