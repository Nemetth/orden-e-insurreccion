"use client";

import type { EntityTypeIconName } from "@/lib/entity-type-icon-names";

import {
  ENTITY_TYPE_ICON_OPTIONS,
  EntityTypeGlyph,
} from "./entity-type-icons";

type Props = {
  value: EntityTypeIconName | string;
  onChange: (name: EntityTypeIconName) => void;
  disabled?: boolean;
};

export function IconPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ENTITY_TYPE_ICON_OPTIONS.map((name) => {
        const active = value === name;
        return (
          <button
            key={name}
            type="button"
            disabled={disabled}
            title={name}
            onClick={() => onChange(name)}
            className={`rounded border p-1.5 transition ${
              active
                ? "border-archive-gold bg-archive-gold/15 text-archive-gold"
                : "border-archive-border text-archive-muted hover:border-archive-muted hover:text-archive-ink"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <EntityTypeGlyph name={name} size={18} />
          </button>
        );
      })}
    </div>
  );
}
