import type { Autorizacion, Instruccion, Mensaje } from "../types";

const H = 3600e3;
const D = 24 * H;
const isoDe = (ms: number) => new Date(ms).toISOString();

export function crearAutorizaciones(t: number, usadasLuzGas: number): Autorizacion[] {
  return [
    {
      id: "aut-luz-gas",
      accion: "archivar-factura",
      alcance: ["Luz", "Gas"],
      nombre: "Archivar facturas de luz y gas",
      interpretacion: "Archivar sin preguntar las facturas de luz y gas de los inmuebles de Madrid, solo de comercializadoras ya registradas, hasta 20 al mes.",
      limites: ["Inmuebles de Madrid", "Comercializadoras ya registradas", "Hasta 20 al mes"],
      maxMes: 20,
      usadasMes: usadasLuzGas,
      estado: "activa",
      desde: isoDe(t - 9 * D),
    },
    {
      id: "aut-agua",
      accion: "archivar-factura",
      alcance: ["Agua"],
      nombre: "Archivar facturas de agua",
      interpretacion: "Archivar sin preguntar las facturas de agua de todos los inmuebles.",
      limites: ["Todos los inmuebles"],
      usadasMes: 0,
      estado: "en aprobación",
      desde: isoDe(t - 40 * D),
    },
    {
      id: "aut-tel",
      accion: "archivar-factura",
      alcance: ["Teléfono e internet"],
      nombre: "Archivar facturas de teléfono e internet",
      interpretacion: "Archivar sin preguntar las facturas de teléfono e internet que lleguen con PDF.",
      limites: ["Solo con PDF adjunto"],
      usadasMes: 0,
      estado: "en aprobación",
      desde: isoDe(t - 40 * D),
    },
    {
      id: "aut-comunidad",
      accion: "archivar-factura",
      alcance: ["Comunidad", "Impuestos", "Seguros"],
      nombre: "Archivar recibos de comunidad, impuestos y seguros",
      interpretacion: "Archivar sin preguntar los recibos de comunidad, impuestos y seguros de un solo inmueble.",
      limites: ["Un solo inmueble por recibo"],
      usadasMes: 0,
      estado: "en aprobación",
      desde: isoDe(t - 40 * D),
    },
    {
      id: "aut-borradores",
      accion: "borrador-tercero",
      nombre: "Enviar borradores a terceros",
      interpretacion: "Enviar los correos a proveedores y astilleros que Sam redacte, sin pasar por usted.",
      limites: ["Con usted en copia", "Nunca compromisos ni pagos"],
      usadasMes: 0,
      estado: "en aprobación",
      desde: isoDe(t - 40 * D),
    },
  ];
}

export function crearInstrucciones(t: number): Instruccion[] {
  return [
    {
      id: "ins-1",
      tema: "Avisos",
      texto: "Avísame por WhatsApp solo de lo urgente. Lo demás, en el resumen de las 18:00.",
      estado: "activa",
      creada: isoDe(t - 12 * D),
      versiones: [
        { t: isoDe(t - 30 * D), texto: "Avísame de todo por WhatsApp.", nota: "Sustituida por la versión actual" },
        { t: isoDe(t - 12 * D), texto: "Avísame por WhatsApp solo de lo urgente. Lo demás, en el resumen de las 18:00.", nota: "Confirmada por usted" },
      ],
    },
    { id: "ins-2", tema: "Resúmenes", texto: "Los resúmenes, en cinco líneas como máximo.", estado: "activa", creada: isoDe(t - 20 * D), versiones: [{ t: isoDe(t - 20 * D), texto: "Los resúmenes, en cinco líneas como máximo.", nota: "Confirmada por usted" }] },
    { id: "ins-3", tema: "Idioma con terceros", texto: "A los astilleros, en inglés, salvo que escriban en español.", estado: "activa", creada: isoDe(t - 18 * D), versiones: [{ t: isoDe(t - 18 * D), texto: "A los astilleros, en inglés, salvo que escriban en español.", nota: "Confirmada por usted" }] },
    { id: "ins-4", tema: "Importes", texto: "Si una factura pasa de 300 €, dímelo aparte.", estado: "activa", creada: isoDe(t - 8 * D), versiones: [{ t: isoDe(t - 8 * D), texto: "Si una factura pasa de 300 €, dímelo aparte.", nota: "Confirmada por usted" }] },
    { id: "ins-5", tema: "Pendientes", texto: "Los lunes a las 9:00, la lista de pendientes de la semana.", estado: "activa", creada: isoDe(t - 25 * D), versiones: [{ t: isoDe(t - 25 * D), texto: "Los lunes a las 9:00, la lista de pendientes de la semana.", nota: "Confirmada por usted" }] },
    { id: "ins-6", tema: "Tono", texto: "Trátame de tú en los mensajes.", estado: "en espera", creada: isoDe(t - 35 * D), versiones: [{ t: isoDe(t - 35 * D), texto: "Trátame de tú en los mensajes.", nota: "En espera: usted pidió volver al usted" }] },
  ];
}

/** última vez que usted escribió por WhatsApp: hace más de 24 horas, la ventana está cerrada */
export const ULTIMO_WHATSAPP_HORAS = 41;

export function crearMensajes(t: number, refs: { resumen: string; ferry: string; luzPalma?: string }): Mensaje[] {
  const m: Mensaje[] = [
    { id: "m-1", de: "usted", canal: "whatsapp", t: isoDe(t - 52 * H), texto: "Qué ferris hay el viernes por la tarde de Barcelona a Palma" },
    { id: "m-2", de: "sam", canal: "whatsapp", t: isoDe(t - 52 * H + 70e3), texto: "Hay tres salidas con vehículo el viernes por la tarde. Le dejo los enlaces a la naviera.", tarjeta: { tareaId: refs.ferry, carril: "general", servicio: "busqueda", origen: "publico", necesitaAprobacion: false } },
    { id: "m-3", de: "usted", canal: "whatsapp", t: isoDe(t - ULTIMO_WHATSAPP_HORAS * H), texto: "Gracias. El lunes revisamos lo de Palma." },
    { id: "m-4", de: "usted", canal: "correo", t: isoDe(t - 20 * H), texto: "Resume el informe del canal de ensayos en cinco líneas.", adjunto: "Informe_ensayos_Altair.pdf" },
    { id: "m-5", de: "sam", canal: "correo", t: isoDe(t - 20 * H + 3 * 60e3), texto: "Hecho. Resistencia dentro de lo previsto hasta 12 nudos, la estabilidad pide revisar el lastre en la condición de llegada. El resto, en el informe.", tarjeta: { tareaId: refs.resumen, carril: "ue", servicio: "gpt-ue", origen: "adjunto-tercero", necesitaAprobacion: false } },
  ];
  if (refs.luzPalma)
    m.push({ id: "m-6", de: "sam", canal: "whatsapp", t: isoDe(t - 3 * H), texto: "Factura de luz de Paseo Marítimo 37 lista para archivar. ¿La archivo?", tarjeta: { tareaId: refs.luzPalma, carril: "ue", servicio: "lectura-ue", origen: "factura-proveedor", necesitaAprobacion: true, plantilla: true } });
  return m;
}
