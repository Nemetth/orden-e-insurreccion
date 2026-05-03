/** Slug para API de tipos: no vacío, sin espacios raros. */
export function slugFromLabel(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s.length > 0 ? s : "tipo";
}
