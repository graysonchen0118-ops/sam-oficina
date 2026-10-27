import type { Emparejado, EstadoFactura, Factura, Inmueble, Suministro, TipoSuministro } from "../types";
import { eur, mesAnio, mulberry32 } from "../format";

// La dirección llega escrita de una forma distinta en cada factura. El CUPS, no.
const VARIANTES: Record<string, string[]> = {
  "inm-01": ["C/ Velázquez 112 4ºA, 28006 Madrid", "CL VELAZQUEZ 112 PISO 4 PTA A", "Calle Velázquez, 112 - 4 A", "VELAZQUEZ, 112 4A MADRID"],
  "inm-02": ["C/ Fernán González 18, 2ºD", "CL FERNAN GONZALEZ 18 PISO 2 PTA D", "Fernán González, 18 - 2 D, Madrid"],
  "inm-03": ["C/ Ponzano 61 1ºB", "CL PONZANO 61 PISO 1 PTA B 28003", "Calle Ponzano, 61, 1 B"],
  "inm-04": ["Pº Marítimo 37 5ºC, Palma", "PS MARITIMO 37 PISO 5 PTA C", "Passeig Marítim, 37 - 5 C"],
  "inm-05": ["C/ Joan Miró 9 bajo, Palma", "CR JOAN MIRO 9 BJ", "Joan Miró, 9, local"],
  "inm-06": ["Av. del Puerto 210 2ºA, Valencia", "AV PUERTO 210 PISO 2 PTA A", "Avinguda del Port, 210 - 2 A"],
  "inm-07": ["C/ Campezo 14 nave 3", "CL CAMPEZO 14 NV 3 MADRID", "Polígono Las Mercedes, Campezo 14"],
  "inm-08": ["C/ Ayala 74 plaza 12", "CL AYALA 74 GARAJE PL 12", "Ayala, 74, plaza de garaje 12"],
};

const RANGO: Record<TipoSuministro, [number, number]> = {
  Luz: [46, 168],
  Gas: [31, 124],
  Agua: [24, 72],
  "Teléfono e internet": [39.9, 59.9],
  Comunidad: [118, 262],
  Impuestos: [412.37, 412.37],
  Seguros: [186, 540],
};

const PREFIJO: Record<string, string> = {
  "Energía Meseta": "EM",
  "Volta Comercializadora": "VC",
  "Gasnor Hogar": "GN",
  "Lumen Balear": "LB",
  "Corriente Clara": "CC",
  "Aguas Canal Norte": "ACN",
  "Aguas de la Bahía": "AB",
  "Aguas Huerta Sur": "AHS",
  "Fibra Plus": "FP",
  "Onda Hogar": "OH",
  "Seguros Ancla": "SA",
};

export const CARPETA: Record<TipoSuministro, string> = {
  Luz: "Luz",
  Gas: "Gas",
  Agua: "Agua",
  "Teléfono e internet": "Teléfono-Internet",
  Comunidad: "Comunidad",
  Impuestos: "Impuestos",
  Seguros: "Seguros",
};

export function rutaArchivo(inm: Inmueble, f: Pick<Factura, "tipo" | "emision" | "proveedor" | "importe">) {
  const d = f.emision.slice(0, 10);
  return `Inmuebles / ${inm.nombre} / ${CARPETA[f.tipo]} / ${d.slice(0, 4)} / ${d} - ${f.proveedor} - ${f.tipo} - ${eur(f.importe)}.pdf`;
}

const DIA = 86400e3;

interface Plan {
  inm: string;
  tipo: TipoSuministro;
  meses: number[];
}

const PLANES: Plan[] = [
  ...["inm-01", "inm-02", "inm-03", "inm-04", "inm-05", "inm-06", "inm-07"].map((inm) => ({ inm, tipo: "Luz" as const, meses: [0, 1, 2] })),
  ...["inm-01", "inm-03", "inm-06"].map((inm) => ({ inm, tipo: "Gas" as const, meses: [0, 2] })),
  ...["inm-01", "inm-02", "inm-03", "inm-04", "inm-05", "inm-06", "inm-07"].map((inm) => ({ inm, tipo: "Agua" as const, meses: [1] })),
  ...["inm-01", "inm-03", "inm-05"].map((inm) => ({ inm, tipo: "Teléfono e internet" as const, meses: [0, 1] })),
  ...["inm-01", "inm-02", "inm-04", "inm-08"].map((inm) => ({ inm, tipo: "Comunidad" as const, meses: [0] })),
  { inm: "inm-08", tipo: "Impuestos", meses: [1] },
  { inm: "inm-07", tipo: "Seguros", meses: [3] },
  { inm: "inm-08", tipo: "Seguros", meses: [2] },
];

const MADRID = new Set(["inm-01", "inm-02", "inm-03", "inm-07"]);

export interface FacturaSemilla extends Factura {
  /** cómo terminó la propuesta de archivo, para la tarea */
  aprobacionTarea?: "tal cual" | "corregida" | "rechazada";
  porAutorizacion?: boolean;
  propuestoInicial?: string;
}

export function crearFacturas(t: number, inmuebles: Inmueble[]): FacturaSemilla[] {
  const rnd = mulberry32(714);
  const porId = new Map(inmuebles.map((i) => [i.id, i]));
  const out: FacturaSemilla[] = [];
  let k = 0;

  PLANES.forEach((plan) => {
    const inm = porId.get(plan.inm)!;
    const s = inm.suministros.find((x) => x.tipo === plan.tipo) as Suministro;
    plan.meses.forEach((m) => {
      k++;
      const [a, b] = RANGO[plan.tipo];
      const importe = Math.round((a + rnd() * (b - a)) * 100) / 100;
      const emisionMs = t - (m * 30 + 2 + Math.floor(rnd() * 9)) * DIA - Math.floor(rnd() * 8) * 3600e3;
      const recibidaMs = emisionMs + (1 + rnd() * 20) * 3600e3;
      const variantes = VARIANTES[plan.inm];
      const f: FacturaSemilla = {
        id: `fac-${k}`,
        numero: `${PREFIJO[s.proveedor] ?? "F"}${new Date(emisionMs).getUTCFullYear()}-${String(Math.floor(100000 + rnd() * 899999))}`,
        proveedor: s.proveedor,
        tipo: plan.tipo,
        emision: new Date(emisionMs).toISOString(),
        periodo: mesAnio(new Date(emisionMs - 12 * DIA).toISOString()),
        importe,
        paginas: plan.tipo === "Luz" ? 3 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 2),
        direccionTexto: variantes[Math.floor(rnd() * variantes.length)],
        cups: s.cups,
        contrato: s.contrato,
        inmuebleId: inm.id,
        emparejado: (s.cups ? "cups" : "contrato") as Emparejado,
        estado: "archivada" as EstadoFactura,
        recibida: new Date(recibidaMs).toISOString(),
      };
      const reciente = m === 0;

      if (plan.tipo === "Luz" || plan.tipo === "Gas") {
        if (reciente && MADRID.has(plan.inm) && plan.inm !== "inm-02") {
          f.porAutorizacion = true;
        } else if (reciente) {
          f.estado = "esperando aprobación";
        } else {
          f.aprobacionTarea = "tal cual";
        }
        if (plan.inm === "inm-02" && reciente) {
          // cambió de comercializadora: contrato nuevo, mismo CUPS
          f.proveedor = "Corriente Clara";
          f.numero = `CC${new Date(emisionMs).getUTCFullYear()}-${String(Math.floor(100000 + rnd() * 899999))}`;
          f.contrato = "907-" + String(Math.floor(1000000 + rnd() * 8999999));
          f.motivo = "Contrato nuevo por cambio de comercializadora. Emparejada por CUPS, que no cambia. La autorización solo cubre comercializadoras ya registradas.";
        }
        if (plan.inm === "inm-05" && m === 2) {
          f.aprobacionTarea = "rechazada";
          f.estado = "en revisión";
          f.motivo = "Usted rechazó el archivo: es una factura rectificativa que anula la anterior. Se queda para revisarla a mano.";
        }
      } else if (plan.tipo === "Agua") {
        f.emparejado = "contrato";
        f.aprobacionTarea = "tal cual";
        if (plan.inm === "inm-05") {
          f.emparejado = "manual";
          f.aprobacionTarea = "corregida";
          f.propuestoInicial = "inm-04";
          f.motivo = "Sin CUPS en el agua: la dirección se parecía a la de Paseo Marítimo y usted la corrigió a Joan Miró 9. La corrección queda guardada.";
        }
        if (plan.inm === "inm-07") {
          f.estado = "en revisión";
          f.aprobacionTarea = undefined;
          f.motivo = "Factura escaneada torcida: el importe no se lee con seguridad. Sam no adivina.";
        }
      } else if (plan.tipo === "Teléfono e internet") {
        f.emparejado = "contrato";
        if (reciente) {
          f.estado = "aviso sin factura";
          f.paginas = 0;
          f.motivo = `${s.proveedor} envió un aviso con enlace a su área de cliente, sin PDF adjunto. Sam no entra en cuentas, así que no hay nada que archivar.`;
        } else {
          f.aprobacionTarea = "tal cual";
          f.motivo = "PDF subido por usted desde el área de cliente.";
        }
      } else if (plan.tipo === "Comunidad") {
        f.emparejado = "contrato";
        if (plan.inm === "inm-01") f.estado = "esperando aprobación";
        else if (plan.inm === "inm-08") {
          f.estado = "en revisión";
          f.motivo = "El recibo menciona dos inmuebles, Garaje Ayala 74 y Velázquez 112. Un documento de varios inmuebles se queda para su revisión.";
        } else f.aprobacionTarea = "tal cual";
      } else {
        f.emparejado = "contrato";
        f.aprobacionTarea = "tal cual";
      }

      if (f.estado === "archivada") f.ruta = rutaArchivo(inm, f);
      out.push(f);
    });
  });

  // dos reenvíos de facturas que ya estaban archivadas
  const dup = (tipo: TipoSuministro, inm: string, horas: number) => {
    const o = out.find((x) => x.tipo === tipo && x.inmuebleId === inm && x.estado === "archivada" && !x.porAutorizacion);
    if (!o) return;
    k++;
    out.push({
      ...o,
      id: `fac-${k}`,
      estado: "duplicada",
      ruta: undefined,
      aprobacionTarea: undefined,
      recibida: new Date(new Date(o.recibida).getTime() + horas * 3600e3).toISOString(),
      motivo: `El proveedor la volvió a enviar. El número ${o.numero} ya está archivado, así que no se archiva dos veces.`,
    });
  };
  dup("Luz", "inm-01", 52);
  dup("Gas", "inm-03", 30);

  return out.sort((a, b) => b.recibida.localeCompare(a.recibida));
}
