/** Normaliza hex (#RGB / #RRGGBB) a minúsculas para comparar colores entre tipos. */
export function normalizeHexColor(input: string): string {
  const s = input.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  return s;
}

export function colorsConflict(a: string, b: string): boolean {
  return normalizeHexColor(a) === normalizeHexColor(b);
}
