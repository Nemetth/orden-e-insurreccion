/** Genera relation_key válido: [a-z][a-z0-9_]* */
export function slugifyRelationKey(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!s.length) return "relation";
  const cleaned = s.replace(/^[0-9]+/, "");
  const base = cleaned.length ? cleaned : s;
  return /^[a-z]/.test(base) ? base : `r_${base}`;
}
