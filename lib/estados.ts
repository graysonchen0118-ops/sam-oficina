import type { EstadoFactura, EstadoTarea } from "./types";

type Tono = "ok" | "aviso" | "error" | "info" | "neutro" | "acento" | "apoyo";

export const TONO_ESTADO: Record<EstadoTarea, Tono> = {
  pendiente: "neutro",
  "en curso": "info",
  "esperando aprobación": "acento",
  "esperando respuesta": "apoyo",
  "en revisión": "aviso",
  detenida: "aviso",
  hecha: "ok",
  cancelada: "neutro",
  fallida: "error",
};

export const TONO_FACTURA: Record<EstadoFactura, Tono> = {
  "esperando aprobación": "acento",
  archivada: "ok",
  "en revisión": "aviso",
  duplicada: "neutro",
  "aviso sin factura": "error",
};
