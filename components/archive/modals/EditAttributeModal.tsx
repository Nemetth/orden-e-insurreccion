"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import type { AttributeValueType } from "@/types/database";
import { useArchiveStore } from "@/store/archive-store";

const VALUE_TYPES: { value: AttributeValueType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "long_text", label: "Texto largo" },
  { value: "number", label: "Número" },
  { value: "boolean", label: "Sí / No" },
  { value: "date", label: "Fecha" },
  { value: "json", label: "JSON" },
  { value: "entity_ref", label: "Referencia a entidad" },
];

type Props = {
  typeId: string;
  attributeId: string;
};

export function EditAttributeModal({ typeId, attributeId }: Props) {
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);
  const types = useArchiveStore((s) => s.types);

  const attr = types
    .find((t) => t.id === typeId)
    ?.attributes.find((a) => a.id === attributeId);

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [valueType, setValueType] = useState<AttributeValueType>("text");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const seededRef = useRef(false);
  useEffect(() => {
    seededRef.current = false;
  }, [attributeId, typeId]);

  useEffect(() => {
    if (!attr || seededRef.current) return;
    setKey(attr.key);
    setLabel(attr.label);
    setValueType(attr.value_type);
    setFieldError(null);
    seededRef.current = true;
  }, [attr, attributeId, typeId]);

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
      await archiveApi.patchAttribute(typeId, attributeId, {
        key: k,
        label: label.trim(),
        value_type: valueType,
      });
      await refreshAll();
      closeModal();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al actualizar atributo";
      setFieldError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!key.trim() && !!label.trim();

  if (!attr) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
        <div className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl">
          <h2 className="font-playfair text-xl text-archive-gold">
            Atributo no encontrado
          </h2>
          <p className="mt-3 font-mono text-sm text-archive-muted">
            No está en la caché del archivo. Recargá e intentá de nuevo.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="border border-archive-border px-4 py-2 font-mono text-sm text-archive-muted hover:text-archive-ink"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="bg-archive-crimson px-4 py-2 font-mono text-sm text-archive-ink transition hover:opacity-90"
            >
              Recargar archivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md border border-archive-border bg-archive-panel p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-archive-gold" aria-hidden />
          <h2 className="font-playfair text-xl text-archive-gold">
            Editar atributo del tipo
          </h2>
        </div>
        <p className="mt-2 font-mono text-xs text-archive-muted">
          Cambiar el tipo de valor borra los datos guardados de ese campo en
          todas las entidades del tipo.
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
          {valueType !== attr.value_type && (
            <p className="border border-archive-gold/30 bg-archive-gold/5 px-3 py-2 font-mono text-xs text-archive-muted">
              Al guardar con un tipo distinto, los valores actuales de este
              campo se vacían en todas las fichas.
            </p>
          )}
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
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
