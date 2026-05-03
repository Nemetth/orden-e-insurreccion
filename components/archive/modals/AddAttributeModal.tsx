"use client";

import { useState } from "react";
import { ListPlus } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import type { AttributeValueType } from "@/types/database";
import { useArchiveStore } from "@/store/archive-store";

const VALUE_TYPES: { value: AttributeValueType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "long_text", label: "Texto largo" },
  { value: "number", label: "Número" },
  { value: "boolean", label: "Sí / No" },
  { value: "date", label: "Fecha" },
];

type Props = {
  typeId: string;
};

export function AddAttributeModal({ typeId }: Props) {
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [valueType, setValueType] = useState<AttributeValueType>("text");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const k = key.trim().toLowerCase().replace(/\s+/g, "_");
    setFieldError(null);
    if (!k || !label.trim()) {
      setFieldError("Clave y etiqueta visibles son obligatorias.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await archiveApi.addAttribute(typeId, {
        key: k,
        label: label.trim(),
        value_type: valueType,
      });
      await refreshAll();
      closeModal();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al agregar atributo";
      setFieldError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!key.trim() && !!label.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <ListPlus className="h-5 w-5 text-archive-gold" aria-hidden />
          <h2 className="font-playfair text-xl text-archive-gold">
            Atributo para el tipo
          </h2>
        </div>
        <p className="mt-2 font-mono text-xs text-archive-muted">
          Se propagará un valor vacío a todas las entidades existentes de este
          tipo.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {fieldError && (
            <p className="border border-archive-crimson/40 bg-archive-crimson/10 px-3 py-2 font-mono text-xs text-archive-ink">
              {fieldError}
            </p>
          )}
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Clave (máquina)
            </span>
            <input
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setFieldError(null);
              }}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
              placeholder="codigo_interno"
            />
          </label>
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
              placeholder="Código interno"
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Tipo de valor
            </span>
            <select
              value={valueType}
              onChange={(e) =>
                setValueType(e.target.value as AttributeValueType)
              }
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
            >
              {VALUE_TYPES.map((vt) => (
                <option key={vt.value} value={vt.value}>
                  {vt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="border border-archive-border px-4 py-2 font-mono text-sm text-archive-muted hover:text-archive-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="bg-archive-crimson px-4 py-2 font-mono text-sm text-archive-ink transition hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Añadiendo…" : "Añadir atributo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
