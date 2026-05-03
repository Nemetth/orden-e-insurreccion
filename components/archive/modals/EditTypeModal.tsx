"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { archiveApi } from "@/lib/api/archive-client";
import { colorsConflict } from "@/lib/api/color-normalize";
import type { EntityTypeIconName } from "@/lib/entity-type-icon-names";
import { isValidEntityTypeIcon } from "@/lib/entity-type-icon-names";
import { useArchiveStore } from "@/store/archive-store";
import { useToastStore } from "@/store/toast-store";

import { TYPE_COLOR_PALETTE } from "../constants";
import { IconPicker } from "../IconPicker";

type Props = {
  typeId: string;
};

export function EditTypeModal({ typeId }: Props) {
  const types = useArchiveStore((s) => s.types);
  const closeModal = useArchiveStore((s) => s.closeModal);
  const refreshAll = useArchiveStore((s) => s.refreshAll);
  const setError = useArchiveStore((s) => s.setError);
  const pushToast = useToastStore((s) => s.pushToast);

  const t = useMemo(() => types.find((x) => x.id === typeId), [types, typeId]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#64748b");
  const [icon, setIcon] = useState<EntityTypeIconName | string>("Box");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!t) return;
    setName(t.name);
    setSlug(t.slug);
    setColor(t.color);
    const ic = (t as { icon?: string }).icon;
    setIcon(ic && isValidEntityTypeIcon(ic) ? ic : "Box");
  }, [t]);

  function validate(): boolean {
    setFieldError(null);
    if (!name.trim()) {
      setFieldError("El nombre es obligatorio.");
      return false;
    }
    if (!slug.trim()) {
      setFieldError("El slug es obligatorio.");
      return false;
    }
    const dupColor = types.some(
      (x) => x.id !== typeId && colorsConflict(x.color, color)
    );
    if (dupColor) {
      setFieldError("Otro tipo ya usa ese color.");
      return false;
    }
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      await archiveApi.patchType(typeId, {
        name: name.trim(),
        slug: slug.trim(),
        color,
        icon: typeof icon === "string" ? icon : "Box",
      });
      await refreshAll();
      pushToast("Tipo actualizado", "success");
      closeModal();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar el tipo";
      setFieldError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const iconName =
    typeof icon === "string" && isValidEntityTypeIcon(icon) ? icon : "Box";

  const canSave =
    !!name.trim() &&
    !!slug.trim() &&
    !!color &&
    isValidEntityTypeIcon(iconName);

  if (!t) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
        <div className="border border-archive-border bg-archive-panel p-6 font-mono text-sm text-archive-muted">
          Tipo no encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div
        className="w-full max-w-lg border border-archive-border bg-archive-panel p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="edit-type-title"
      >
        <div className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-archive-gold" aria-hidden />
          <h2
            id="edit-type-title"
            className="font-playfair text-xl text-archive-gold"
          >
            Editar tipo
          </h2>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {fieldError && (
            <p className="border border-archive-crimson/40 bg-archive-crimson/10 px-3 py-2 font-mono text-xs text-archive-ink">
              {fieldError}
            </p>
          )}
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Nombre visible
            </span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError(null);
              }}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Slug (URL / máquina)
            </span>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setFieldError(null);
              }}
              className="mt-1 w-full border border-archive-border bg-archive-void px-3 py-2 font-mono text-sm text-archive-ink outline-none focus:border-archive-crimson"
            />
          </label>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Color del tipo
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TYPE_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    setColor(c);
                    setFieldError(null);
                  }}
                  className={`h-9 w-9 rounded border-2 transition ${
                    color === c
                      ? "border-archive-gold ring-1 ring-archive-gold"
                      : "border-archive-border hover:border-archive-muted"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-archive-muted">
              Ícono
            </span>
            <div className="mt-2 max-h-36 overflow-y-auto pr-1">
              <IconPicker
                value={icon}
                onChange={(n) => {
                  setIcon(n);
                  setFieldError(null);
                }}
                disabled={saving}
              />
            </div>
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
              disabled={saving || !canSave}
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
