/** Nombres de componentes lucide-react permitidos para tipos de entidad (orden alfabético). */
export const ENTITY_TYPE_ICON_NAMES = [
  "Anchor",
  "BookOpen",
  "Box",
  "Building2",
  "Compass",
  "Crown",
  "Eye",
  "Flag",
  "Flame",
  "Gem",
  "Globe",
  "Link2",
  "MapPin",
  "Moon",
  "Network",
  "Scroll",
  "Shield",
  "Skull",
  "Sparkles",
  "Sun",
  "Sword",
  "TreePine",
  "User",
  "Users",
  "Warehouse",
] as const;

export type EntityTypeIconName = (typeof ENTITY_TYPE_ICON_NAMES)[number];

export function isValidEntityTypeIcon(name: string): name is EntityTypeIconName {
  return (ENTITY_TYPE_ICON_NAMES as readonly string[]).includes(name);
}
