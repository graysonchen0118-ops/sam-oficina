import type { Contacto, Inmueble, Origen, TipoAccion } from "./types";
import { norm } from "./format";

export interface Intencion {
  accion: TipoAccion | "parada";
  titulo: string;
  proyecto: string;
  origen: Origen;
  destinatario?: string;
  inmuebleId?: string;
  instruccion?: string;
}

const PROYECTOS: [RegExp, string][] = [
  [/altair/, "Altair 38 m · velero"],
  [/nereida/, "Nereida 52 m · motor"],
  [/bruma/, "Bruma 28 m · refit"],
  [/levante/, "Levante 62 m · concepto"],
];

const CLAVES: Record<string, string[]> = {
  "inm-01": ["velazquez"],
  "inm-02": ["fernan gonzalez", "fernan"],
  "inm-03": ["ponzano"],
  "inm-04": ["maritimo", "paseo maritimo"],
  "inm-05": ["joan miro", "miro", "local de palma"],
  "inm-06": ["puerto", "valencia"],
  "inm-07": ["campezo", "nave"],
  "inm-08": ["ayala", "garaje"],
};

const corto = (s: string, n = 64) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** Sam entiende la orden. Aquí, con reglas sencillas; en el sistema real, la IA del carril UE. */
export function entender(texto: string, adjunto: Origen | null, inmuebles: Inmueble[], contactos: Contacto[]): Intencion {
  const n = norm(texto);
  // la parada es una palabra fija: se ejecuta sin pasar por ninguna IA
  if (/^(para|stop|para todo|detente)$/.test(n)) return { accion: "parada", titulo: "Parada de emergencia", proyecto: "Administración", origen: "texto-usted" };

  const proyecto = PROYECTOS.find(([r]) => r.test(n))?.[1] ?? (/(factura|inmueble|piso|garaje|local|nave|comunidad|luz|gas|agua)/.test(n) ? "Inmuebles" : "Administración");
  const inm = inmuebles.find((i) => (CLAVES[i.id] ?? [norm(i.nombre.split(",")[0])]).some((c) => n.includes(c)));
  const contacto = contactos.find((c) => n.includes(norm(c.nombre.split(" ")[0])) || n.includes(norm(c.empresa.split(" ").slice(-1)[0])));
  // si la orden nombra un documento guardado, Sam tendrá que sacarlo del archivo: el origen es ese documento, no el texto
  const deArmador = PROYECTOS.some(([r]) => r.test(n)) || /(armador|plano)/.test(n);
  const docGuardado = /(contrato|poliza|plano|informe|escritura|presupuesto|oferta|especificacion|carta|documento|pdf)/.test(n) ? (deArmador ? "plano-armador" : "sharepoint") : null;
  const base = (accion: TipoAccion, titulo: string, origen: Origen): Intencion => ({
    accion,
    titulo: corto(titulo),
    proyecto,
    origen: adjunto ?? (accion === "archivar-factura" || accion === "buscar" ? origen : (docGuardado as Origen | null) ?? origen),
    inmuebleId: inm?.id,
    destinatario: contacto?.nombre,
  });

  if (/(a partir de ahora|desde ahora|en adelante|de ahora en adelante|siempre que)/.test(n)) {
    const limpio = texto.replace(/^\s*(sam,?\s*)/i, "").trim();
    return { ...base("instruccion", "Guardar instrucción permanente", "texto-usted"), instruccion: limpio.charAt(0).toUpperCase() + limpio.slice(1) };
  }
  if (/archiv/.test(n)) return base("archivar-factura", `Archivar ${/factura/.test(n) ? "factura" : "documento"}${inm ? " · " + inm.nombre : ""}`, "factura-proveedor");
  if (/\b(escribe|escribele|contesta|responde a|correo a|borrador|pidele|pregunta a)\b/.test(n)) return base("borrador-tercero", `Borrador${contacto ? " para " + contacto.nombre : " para un tercero"}: ${texto}`, "texto-usted");
  if (/(tradu)/.test(n)) return base("traducir", `Traducir: ${texto}`, "texto-usted");
  if (/(resum|resumen|que dice|qué dice)/.test(n)) return base("resumir", `Resumir: ${texto}`, "texto-usted");
  if (/(vuelo|ferry|ferri|tiempo|viento|horario|tren|hotel|lluvia|prevision)/.test(n)) return base("buscar", `Buscar: ${texto}`, "publico");
  if (/(reescrib|redact|texto para|mejora este)/.test(n)) return base("redactar", `Redactar: ${texto}`, "texto-usted");
  return base("responder-usted", `Consulta: ${texto}`, "texto-usted");
}
