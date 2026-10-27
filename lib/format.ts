export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** minúsculas, sin tildes ni signos, para buscar */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ZONA = "Europe/Madrid";
const dfCorta = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: ZONA });
const dfLarga = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA });
const dfHora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const dfDia = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONA });
const dfH = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONA });
const dfMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: ZONA });

const limpio = (s: string) => s.replace(/ | /g, " ").replace(/\s+/g, " ");

export const fechaCorta = (iso: string) => limpio(dfCorta.format(new Date(iso))).replace(/\./g, "");
export const fechaLarga = (iso: string) => dfLarga.format(new Date(iso));
export const hora = (iso: string) => limpio(dfHora.format(new Date(iso)));
export const dia = (ms: number) => dfDia.format(new Date(ms));
export const mesAnio = (iso: string) => dfMes.format(new Date(iso));

/** hora decimal en Madrid, 13.5 = 13:30 */
export function horaMadrid(ms: number) {
  const [h, m] = dfH.format(new Date(ms)).split(":").map(Number);
  return (h % 24) + m / 60;
}

export function haceCuanto(iso: string, ahora: number) {
  const s = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (s < 45) return "ahora mismo";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "hace 1 hora" : `hace ${h} horas`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export function cuandoFue(iso: string, ahora: number) {
  return dia(new Date(iso).getTime()) === dia(ahora) ? hora(iso) : `${fechaCorta(iso)}, ${hora(iso)}`;
}

export const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }) + " €";
export const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const uid = (p: string) => p + "-" + Math.random().toString(36).slice(2, 8);
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-ES")} ${n === 1 ? uno : varios}`;

/** avisa a las escenas 3D de que algo pasó */
export function pulso(tipo: string, detalle?: unknown) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sam:" + tipo, { detail: detalle }));
}
export const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
