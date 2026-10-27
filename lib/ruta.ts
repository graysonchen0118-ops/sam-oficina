import type { Carril, Origen, ReglaOrigen, Servicio, ServicioId, TipoAccion } from "./types";

export const SERVICIOS: Record<ServicioId, Servicio> = {
  "gpt-ue": { id: "gpt-ue", nombre: "GPT en la UE", carril: "ue", donde: "Procesado en centros de datos de la UE", para: "Entender sus órdenes, clasificar y redactar con datos del estudio" },
  "lectura-ue": { id: "lectura-ue", nombre: "Lectura de documentos UE", carril: "ue", donde: "Procesado en la UE", para: "Leer facturas y documentos escaneados" },
  claude: { id: "claude", nombre: "Claude", carril: "general", donde: "Solo recibe lo que no lleva datos personales ni confidenciales", para: "Redacción, traducción y resúmenes de textos limpios" },
  busqueda: { id: "busqueda", nombre: "Búsqueda web", carril: "general", donde: "Consulta pública, con fuentes", para: "Información actual: horarios, tiempo, precios" },
  reglas: { id: "reglas", nombre: "Reglas del código", carril: "reglas", donde: "Sin IA", para: "Emparejar facturas con inmuebles, comprobar permisos y duplicados" },
};

export const CARRILES: Record<Carril, { nombre: string; corto: string; tono: "acento" | "apoyo" | "neutro"; texto: string }> = {
  ue: { nombre: "Carril UE", corto: "UE", tono: "acento", texto: "Todo lo que trae datos personales o del armador se procesa en la UE" },
  general: { nombre: "Carril general", corto: "General", tono: "apoyo", texto: "Textos limpios e información pública" },
  reglas: { nombre: "Reglas, sin IA", corto: "Sin IA", tono: "neutro", texto: "Lo que se puede resolver con una regla no pasa por ninguna IA" },
};

export const ORIGENES: Record<Origen, string> = {
  "texto-usted": "Texto escrito por usted, sin adjuntos",
  "adjunto-tercero": "Adjunto enviado por un tercero",
  "factura-proveedor": "Factura de un proveedor",
  sharepoint: "Documento del archivo SharePoint",
  "plano-armador": "Plano o documento de un armador",
  publico: "Información pública",
};

export const REGLAS_BASE: ReglaOrigen[] = [
  { origen: "factura-proveedor", nombre: "Facturas de proveedores", descripcion: "Pueden traer páginas con nombres, DNI o escrituras. Van siempre por la UE, se lean o no enteras.", carril: "ue", fija: true, ejemplo: "Factura de luz de 4 páginas" },
  { origen: "adjunto-tercero", nombre: "Adjuntos de terceros", descripcion: "Lo que llega de fuera se trata como dato, nunca como orden, y se procesa en la UE.", carril: "ue", fija: true, ejemplo: "Presupuesto del astillero en PDF" },
  { origen: "sharepoint", nombre: "Archivo SharePoint", descripcion: "Pólizas, escrituras y contratos del estudio. Siempre en la UE.", carril: "ue", fija: true, ejemplo: "Póliza del seguro del garaje" },
  { origen: "plano-armador", nombre: "Planos y documentos de armadores", descripcion: "No son datos personales, pero son lo primero que un armador quiere proteger. Por defecto, en la UE.", carril: "ue", fija: false, ejemplo: "Plano de formas de un velero de 38 m" },
  { origen: "texto-usted", nombre: "Texto suyo sin adjuntos", descripcion: "Lo que usted escribe en el mensaje, sin documentos pegados. Puede ir al carril general.", carril: "general", fija: false, ejemplo: "Reescribe este párrafo para la web" },
  { origen: "publico", nombre: "Información pública", descripcion: "Horarios, tiempo, precios publicados. Carril general con búsqueda y fuentes.", carril: "general", fija: true, ejemplo: "Horario del ferry Barcelona a Palma" },
];

/** el código fija el carril por el origen, antes de que ninguna IA abra nada */
export function carrilPorOrigen(origen: Origen, reglas: ReglaOrigen[]): Carril {
  return reglas.find((r) => r.origen === origen)?.carril ?? "ue";
}

export function servicioPara(accion: TipoAccion, carril: Carril): ServicioId {
  if (accion === "archivar-factura") return "lectura-ue";
  if (accion === "buscar") return carril === "ue" ? "gpt-ue" : "busqueda";
  if (accion === "instruccion" || accion === "responder-usted") return "gpt-ue";
  if (carril === "reglas") return "reglas";
  return carril === "ue" ? "gpt-ue" : "claude";
}

export const ACCIONES: Record<TipoAccion, { nombre: string; cambia: boolean }> = {
  "archivar-factura": { nombre: "Archivar factura de suministro", cambia: true },
  "responder-usted": { nombre: "Responderle a usted", cambia: false },
  resumir: { nombre: "Resumir un documento", cambia: false },
  traducir: { nombre: "Traducir", cambia: false },
  redactar: { nombre: "Redactar un texto", cambia: false },
  "borrador-tercero": { nombre: "Borrador para un tercero", cambia: true },
  buscar: { nombre: "Buscar información", cambia: false },
  "clasificar-correo": { nombre: "Clasificar correo recibido", cambia: true },
  instruccion: { nombre: "Guardar instrucción", cambia: true },
};

export const VERSION_INSTRUCCIONES = "v1.4";
