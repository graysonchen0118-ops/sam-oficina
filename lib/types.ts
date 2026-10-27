// Modelos con la forma que devolvería la API real de Sam.

export type Carril = "ue" | "general" | "reglas";
export type Canal = "correo" | "whatsapp" | "panel";

/** de dónde viene lo que Sam va a procesar: el código decide el carril con esto, sin abrir nada */
export type Origen = "texto-usted" | "adjunto-tercero" | "factura-proveedor" | "sharepoint" | "plano-armador" | "publico";

export type ServicioId = "gpt-ue" | "lectura-ue" | "claude" | "busqueda" | "reglas";

export interface Servicio {
  id: ServicioId;
  nombre: string;
  carril: Carril;
  donde: string;
  para: string;
}

export interface ReglaOrigen {
  origen: Origen;
  nombre: string;
  descripcion: string;
  carril: Carril;
  fija: boolean;
  ejemplo: string;
}

export type TipoAccion =
  | "archivar-factura"
  | "responder-usted"
  | "resumir"
  | "traducir"
  | "redactar"
  | "borrador-tercero"
  | "buscar"
  | "clasificar-correo"
  | "instruccion";

export type EstadoTarea =
  | "pendiente"
  | "en curso"
  | "esperando aprobación"
  | "esperando respuesta"
  | "en revisión"
  | "detenida"
  | "hecha"
  | "cancelada"
  | "fallida";

export interface EventoTarea {
  t: string;
  quien: "Sam" | "Usted" | "Código" | "Tercero";
  texto: string;
}

export interface Tarea {
  id: string;
  ref: string;
  titulo: string;
  descripcion: string;
  proyecto: string;
  accion: TipoAccion;
  canal: Canal;
  origen: Origen;
  carril: Carril;
  servicio: ServicioId;
  estado: EstadoTarea;
  /** estado previo a la parada de emergencia, para devolverla igual */
  antes?: EstadoTarea;
  creada: string;
  actualizada: string;
  destinatarios: string[];
  aprobacion?: "tal cual" | "corregida" | "rechazada";
  autorizacionId?: string;
  facturaId?: string;
  historial: EventoTarea[];
}

export interface Operacion {
  id: string;
  t: string;
  tareaRef: string;
  servicio: ServicioId;
  carril: Carril;
  origen: Origen;
  version: string;
  decision: string;
  resultado: "propuesta válida" | "a revisión" | "rechazada por el código" | "servicio de respaldo";
}

export type TipoSuministro = "Luz" | "Gas" | "Agua" | "Teléfono e internet" | "Comunidad" | "Impuestos" | "Seguros";

export interface Suministro {
  id: string;
  tipo: TipoSuministro;
  proveedor: string;
  /** solo luz y gas: no cambia aunque se cambie de comercializadora */
  cups?: string;
  contrato: string;
  pdfAdjunto: boolean;
}

export type TipoInmueble = "Vivienda" | "Local" | "Nave" | "Garaje" | "Oficina";

export interface Inmueble {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  tipo: TipoInmueble;
  foto: string;
  suministros: Suministro[];
}

export type EstadoFactura = "esperando aprobación" | "archivada" | "en revisión" | "duplicada" | "aviso sin factura";
export type Emparejado = "cups" | "contrato" | "dirección" | "manual";

export interface Factura {
  id: string;
  numero: string;
  proveedor: string;
  tipo: TipoSuministro;
  emision: string;
  periodo: string;
  importe: number;
  paginas: number;
  /** la dirección tal y como viene escrita en la factura */
  direccionTexto: string;
  cups?: string;
  contrato?: string;
  inmuebleId?: string;
  emparejado?: Emparejado;
  estado: EstadoFactura;
  motivo?: string;
  ruta?: string;
  recibida: string;
  tareaId?: string;
}

export type EstadoAutorizacion = "activa" | "en aprobación" | "suspendida";

export interface Autorizacion {
  id: string;
  accion: TipoAccion;
  /** solo para archivar: qué tipos de suministro cubre */
  alcance?: TipoSuministro[];
  nombre: string;
  interpretacion: string;
  limites: string[];
  maxMes?: number;
  usadasMes: number;
  estado: EstadoAutorizacion;
  /** estado previo a la parada */
  antes?: EstadoAutorizacion;
  desde: string;
}

export interface VersionInstruccion {
  t: string;
  texto: string;
  nota: string;
}

export interface Instruccion {
  id: string;
  tema: string;
  texto: string;
  estado: "activa" | "en espera" | "revocada";
  creada: string;
  versiones: VersionInstruccion[];
}

export interface Contacto {
  id: string;
  nombre: string;
  empresa: string;
  rol: string;
  foto: string;
  idioma: "es" | "en";
}

export interface Tarjeta {
  tareaId: string;
  carril: Carril;
  servicio: ServicioId;
  origen: Origen;
  necesitaAprobacion: boolean;
  plantilla?: boolean;
}

export interface Mensaje {
  id: string;
  de: "usted" | "sam";
  canal: Canal;
  t: string;
  texto: string;
  tarjeta?: Tarjeta;
  adjunto?: string;
}
