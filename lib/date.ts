export function formatDateIT(iso: string): string {
  // iso: YYYY-MM-DD
  if (!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function parseITtoISO(it: string): string {
  // it: gg/mm/aaaa
  const [d,m,y] = it.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}
