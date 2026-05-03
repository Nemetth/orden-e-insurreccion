"use client";

import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Anchor,
  BookOpen,
  Box,
  Building2,
  Compass,
  Crown,
  Eye,
  Flag,
  Flame,
  Gem,
  Globe,
  Link2,
  MapPin,
  Moon,
  Network,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Sun,
  Sword,
  TreePine,
  User,
  Users,
  Warehouse,
} from "lucide-react";

import type { EntityTypeIconName } from "@/lib/entity-type-icon-names";
import {
  ENTITY_TYPE_ICON_NAMES,
  isValidEntityTypeIcon,
} from "@/lib/entity-type-icon-names";

const ENTITY_TYPE_ICON_MAP: Record<
  EntityTypeIconName,
  ComponentType<LucideProps>
> = {
  Anchor,
  BookOpen,
  Box,
  Building2,
  Compass,
  Crown,
  Eye,
  Flag,
  Flame,
  Gem,
  Globe,
  Link2,
  MapPin,
  Moon,
  Network,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Sun,
  Sword,
  TreePine,
  User,
  Users,
  Warehouse,
};

export type { EntityTypeIconName };

export const ENTITY_TYPE_ICON_OPTIONS: readonly EntityTypeIconName[] = [
  ...ENTITY_TYPE_ICON_NAMES,
].sort((a, b) => a.localeCompare(b)) as EntityTypeIconName[];

export { isValidEntityTypeIcon };

export function EntityTypeGlyph({
  name,
  className,
  size = 16,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Cmp = isValidEntityTypeIcon(name)
    ? ENTITY_TYPE_ICON_MAP[name]
    : ENTITY_TYPE_ICON_MAP.Box;
  const props: LucideProps = { className, size, "aria-hidden": true };
  return <Cmp {...props} />;
}
