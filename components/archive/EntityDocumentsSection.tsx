"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, FolderOpen, Plus, Trash2 } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { useToastStore } from "@/store/toast-store";
import type { EntityDocument } from "@/types/api";

type Mode = "present" | "edit";

export function EntityDocumentsSection({
  entityId,
  mode,
}: {
  entityId: string;
  mode: Mode;
}) {
  const [docs, setDocs] = useState<EntityDocument[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pushToast = useToastStore((s) => s.pushToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await archiveApi.getEntityDocuments(entityId);
      setDocs(list);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const debouncedSave = useDebouncedCallback(
    async (id: string, patch: { title?: string; content?: string | null; classification?: string }) => {
      try {
        const updated = await archiveApi.patchDocument(id, patch);
        setDocs((d) => d.map((x) => (x.id === id ? updated : x)));
        pushToast("Documento sincronizado", "success");
      } catch {
        pushToast("Error al guardar documento", "error");
      }
    },
    600
  );

  async function handleAdd() {
    try {
      const created = await archiveApi.postEntityDocument(entityId, {
        title: "Documento nuevo",
        content: "",
        classification: "CLASIFICADO",
      });
      setDocs((d) => [created, ...d]);
      setOpenId(created.id);
      pushToast("Documento creado", "success");
    } catch {
      pushToast("No se pudo crear el documento", "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await archiveApi.deleteDocument(id);
      setDocs((d) => d.filter((x) => x.id !== id));
      if (openId === id) setOpenId(null);
      pushToast("Documento eliminado", "success");
    } catch {
      pushToast("Error al eliminar", "error");
    }
  }

  const opened = docs.find((d) => d.id === openId) ?? null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-archive-muted">
          Archivos
        </h2>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 border border-dashed border-archive-gold/45 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-archive-gold transition hover:bg-archive-gold/10"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nuevo documento
          </button>
        )}
      </div>

      {loading ? (
        <p className="font-mono text-xs text-archive-muted">Indexando archivos…</p>
      ) : mode === "present" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4">
            {docs.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setOpenId((cur) => (cur === d.id ? null : d.id))}
                className={`group flex w-44 flex-col items-stretch border bg-archive-void/50 p-4 text-left transition ${
                  openId === d.id
                    ? "border-archive-gold/70 shadow-[0_0_0_1px_rgba(201,162,39,0.2)]"
                    : "border-archive-border/70 hover:border-archive-gold/40"
                }`}
              >
                <FolderOpen className="h-8 w-8 text-archive-gold/80" aria-hidden />
                <span className="mt-3 line-clamp-2 font-playfair text-sm text-archive-ink">
                  {d.title}
                </span>
                <span className="mt-2 inline-flex w-fit border border-archive-crimson/35 bg-archive-crimson/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-archive-gold">
                  {d.classification}
                </span>
              </button>
            ))}
            {docs.length === 0 && (
              <p className="font-mono text-xs text-archive-muted">
                No hay documentos clasificados para esta entidad.
              </p>
            )}
          </div>

          {opened && (
            <article className="relative border border-archive-border/80 bg-[#101018] px-8 py-10 shadow-inner md:px-14 md:py-12">
              <header className="mb-8 flex flex-col items-center border-b border-archive-border/40 pb-6 text-center">
                <div className="rotate-[-8deg] border-4 border-double border-archive-crimson/55 px-6 py-2 font-mono text-[11px] uppercase tracking-[0.35em] text-archive-crimson">
                  {opened.classification}
                </div>
                <h3 className="mt-8 max-w-xl font-playfair text-2xl font-semibold tracking-tight text-archive-ink md:text-3xl">
                  {opened.title}
                </h3>
              </header>
              <div className="mx-auto max-w-prose border-l border-archive-gold/25 pl-6 md:pl-10">
                <div className="font-playfair text-base leading-[1.85] tracking-[0.01em] text-archive-ink/95 md:text-lg">
                  {opened.content?.trim() ? (
                    <p className="whitespace-pre-wrap">{opened.content}</p>
                  ) : (
                    <p className="italic text-archive-muted">Folio en blanco.</p>
                  )}
                </div>
              </div>
              <FileText
                className="pointer-events-none absolute right-6 top-6 h-16 w-16 text-archive-border/25"
                aria-hidden
              />
            </article>
          )}
        </div>
      ) : (
        <ul className="space-y-6">
          {docs.map((d) => (
            <DocumentEditRow
              key={d.id}
              doc={d}
              debouncedSave={debouncedSave}
              onDelete={() => void handleDelete(d.id)}
            />
          ))}
          {docs.length === 0 && (
            <li className="border border-dashed border-archive-border/60 px-4 py-8 text-center font-mono text-sm text-archive-muted">
              Sin documentos. Usá &ldquo;Nuevo documento&rdquo; para comenzar.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function DocumentEditRow({
  doc,
  debouncedSave,
  onDelete,
}: {
  doc: EntityDocument;
  debouncedSave: (
    id: string,
    patch: { title?: string; content?: string | null; classification?: string }
  ) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [classification, setClassification] = useState(doc.classification);
  const [content, setContent] = useState(doc.content ?? "");

  useEffect(() => {
    setTitle(doc.title);
    setClassification(doc.classification);
    setContent(doc.content ?? "");
  }, [doc.id, doc.title, doc.classification, doc.content]);

  return (
    <li className="border border-archive-border/60 bg-archive-void/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label className="min-w-0 flex-1 font-mono text-[10px] uppercase tracking-wider text-archive-muted">
          Título
          <input
            value={title}
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v);
              debouncedSave(doc.id, { title: v });
            }}
            className="mt-1 w-full border border-archive-border bg-archive-panel px-3 py-2 font-playfair text-lg text-archive-ink"
          />
        </label>
        <button
          type="button"
          title="Eliminar"
          onClick={onDelete}
          className="shrink-0 border border-archive-border p-2 text-archive-muted hover:border-archive-crimson/50 hover:text-archive-crimson"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <label className="mt-3 block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
        Clasificación
        <input
          value={classification}
          onChange={(e) => {
            const v = e.target.value;
            setClassification(v);
            debouncedSave(doc.id, { classification: v });
          }}
          className="mt-1 w-full max-w-xs border border-archive-border bg-archive-panel px-3 py-1.5 font-mono text-sm text-archive-ink"
        />
      </label>
      <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-archive-muted">
        Contenido
        <textarea
          value={content}
          onChange={(e) => {
            const v = e.target.value;
            setContent(v);
            debouncedSave(doc.id, { content: v });
          }}
          rows={10}
          className="mt-1 w-full border border-archive-border bg-archive-panel px-3 py-2 font-playfair text-sm leading-relaxed text-archive-ink md:text-base"
        />
      </label>
    </li>
  );
}
