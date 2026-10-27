import type { Canal, Carril, EstadoTarea, EventoTarea, Inmueble, Operacion, Origen, ServicioId, Tarea, TipoAccion } from "../types";
import type { FacturaSemilla } from "./facturas";
import { eur, mulberry32 } from "../format";
import { SERVICIOS, VERSION_INSTRUCCIONES } from "../ruta";

const H = 3600e3;
const isoDe = (ms: number) => new Date(ms).toISOString();

let num = 1040;
export const nuevaRef = () => `SAM-${++num}`;

export function tareasDeFacturas(t: number, facturas: FacturaSemilla[], inmuebles: Inmueble[]): Tarea[] {
  const porId = new Map(inmuebles.map((i) => [i.id, i]));
  return [...facturas]
    .sort((a, b) => a.recibida.localeCompare(b.recibida))
    .map((f) => {
      const inm = f.inmuebleId ? porId.get(f.inmuebleId) : undefined;
      const t0 = new Date(f.recibida).getTime();
      const h: EventoTarea[] = [];
      const ev = (dh: number, quien: EventoTarea["quien"], texto: string) => h.push({ t: isoDe(Math.min(t - 60e3, t0 + dh * H)), quien, texto });
      if (f.estado === "aviso sin factura") {
        ev(0, "Sam", `Correo de ${f.proveedor}: "Su factura ya está disponible". No trae PDF adjunto.`);
        ev(0.01, "Código", "Sin documento que archivar. Sam no entra en áreas de cliente.");
        ev(0.02, "Sam", "Queda en la lista de avisos sin factura para que usted la descargue o cambie el envío a PDF.");
      } else {
        ev(0, "Sam", `Factura recibida de ${f.proveedor}, ${f.paginas} ${f.paginas === 1 ? "página" : "páginas"}.`);
        ev(0.01, "Código", "Origen: factura de proveedor. Carril UE fijado antes de abrir el documento.");
        ev(0.03, "Sam", `Leída en la UE: ${eur(f.importe)}, emitida para "${f.direccionTexto}".`);
        if (f.estado === "duplicada") ev(0.04, "Código", f.motivo ?? "Duplicada.");
        else if (f.estado === "en revisión" && !f.aprobacionTarea) ev(0.04, "Código", f.motivo ?? "A revisión.");
        else {
          if (f.propuestoInicial) ev(0.04, "Código", `Sin CUPS ni contrato claro: emparejada por dirección con ${porId.get(f.propuestoInicial)?.codigo}.`);
          else ev(0.04, "Código", `Emparejada con ${inm?.codigo} por ${f.emparejado === "cups" ? `CUPS ${f.cups}` : "número de contrato"}.`);
          ev(0.05, "Código", "Comprobado: no estaba archivada antes.");
          if (f.porAutorizacion) {
            ev(0.06, "Código", 'Autorización vigente "Archivar facturas de luz y gas". Permiso comprobado justo antes de actuar.');
            ev(0.07, "Sam", "Archivada sin preguntar, dentro de los límites. Enlace enviado a usted.");
          } else {
            ev(0.06, "Sam", "Propuesta de archivo enviada a usted para su aprobación.");
            if (f.aprobacionTarea === "tal cual") {
              ev(2.4, "Usted", "Aprobada tal cual.");
              ev(2.41, "Código", "Permiso comprobado de nuevo justo antes de archivar.");
              ev(2.42, "Sam", "Archivada y enlace enviado.");
            } else if (f.aprobacionTarea === "corregida") {
              ev(3.1, "Usted", `Corregida: el inmueble es ${inm?.codigo}, no ${porId.get(f.propuestoInicial ?? "")?.codigo}.`);
              ev(3.11, "Sam", "Corrección guardada para los próximos casos. Archivada y enlace enviado.");
            } else if (f.aprobacionTarea === "rechazada") {
              ev(5.2, "Usted", "Rechazada: es una factura rectificativa.");
              ev(5.21, "Sam", "No se archiva. Queda en revisión.");
            }
          }
        }
      }
      const estado: EstadoTarea =
        f.estado === "archivada"
          ? "hecha"
          : f.estado === "esperando aprobación"
            ? "esperando aprobación"
            : f.estado === "duplicada"
              ? "cancelada"
              : f.estado === "aviso sin factura"
                ? "pendiente"
                : "en revisión";
      const ref = nuevaRef();
      f.tareaId = "t-" + ref;
      return {
        id: f.tareaId,
        ref,
        titulo: `Archivar factura de ${f.tipo === "Teléfono e internet" ? "teléfono e internet" : f.tipo.toLowerCase()} · ${inm?.nombre ?? "sin inmueble"}`,
        descripcion: f.motivo ?? `${f.proveedor}, ${f.periodo}, ${eur(f.importe)}.`,
        proyecto: "Inmuebles",
        accion: "archivar-factura" as TipoAccion,
        canal: "correo" as Canal,
        origen: "factura-proveedor" as Origen,
        carril: "ue" as Carril,
        servicio: "lectura-ue" as ServicioId,
        estado,
        creada: f.recibida,
        actualizada: h[h.length - 1].t,
        destinatarios: [],
        aprobacion: f.aprobacionTarea,
        autorizacionId: f.porAutorizacion ? "aut-luz-gas" : undefined,
        facturaId: f.id,
        historial: h,
      } satisfies Tarea;
    });
}

interface Manual {
  titulo: string;
  descripcion: string;
  proyecto: string;
  accion: TipoAccion;
  canal: Canal;
  origen: Origen;
  carril: Carril;
  servicio: ServicioId;
  estado: EstadoTarea;
  horas: number;
  destinatarios?: string[];
  aprobacion?: Tarea["aprobacion"];
  pasos: [number, EventoTarea["quien"], string][];
}

const MANUALES: Manual[] = [
  { titulo: "Resumen del informe del canal de ensayos", descripcion: "Cinco líneas sobre resistencia al avance y estabilidad, para leer en el móvil.", proyecto: "Altair 38 m · velero", accion: "resumir", canal: "correo", origen: "adjunto-tercero", carril: "ue", servicio: "gpt-ue", estado: "hecha", horas: 20, pasos: [[0, "Usted", "Resume el informe del canal de ensayos en cinco líneas."], [0.01, "Código", "Origen: adjunto de un tercero. Carril UE."], [0.05, "Sam", "Resumen enviado. Servicio usado: GPT en la UE."]] },
  { titulo: "Traducir al inglés la especificación de interiores", descripcion: "Para el atelier de interiores, conservando las medidas y la numeración.", proyecto: "Nereida 52 m · motor", accion: "traducir", canal: "correo", origen: "sharepoint", carril: "ue", servicio: "gpt-ue", estado: "hecha", horas: 44, pasos: [[0, "Usted", "Traduce al inglés la especificación de interiores de Nereida."], [0.01, "Código", "Origen: archivo SharePoint. Carril UE."], [0.2, "Sam", "Traducción lista, 14 páginas. Guardada junto al original."]] },
  { titulo: "Borrador al astillero: fechas de la prueba de mar", descripcion: "Proponer dos ventanas a mediados de noviembre y pedir confirmación de grúa.", proyecto: "Altair 38 m · velero", accion: "borrador-tercero", canal: "whatsapp", origen: "sharepoint", carril: "ue", servicio: "gpt-ue", estado: "esperando aprobación", horas: 3, destinatarios: ["Lucía Ferrer"], pasos: [[0, "Usted", "Prepara un correo a Lucía con dos fechas para la prueba de mar."], [0.01, "Código", "Lleva datos del proyecto: carril UE."], [0.03, "Sam", "Borrador listo. No sale nada hasta que usted lo apruebe."]] },
  { titulo: "Horario del ferry Barcelona a Palma del viernes", descripcion: "Salidas de tarde con vehículo.", proyecto: "Administración", accion: "buscar", canal: "whatsapp", origen: "publico", carril: "general", servicio: "busqueda", estado: "hecha", horas: 52, pasos: [[0, "Usted", "Qué ferris hay el viernes por la tarde de Barcelona a Palma."], [0.01, "Código", "Información pública: carril general."], [0.02, "Sam", "Tres salidas con vehículo, con enlaces a la fuente."]] },
  { titulo: "Texto para la web sobre el concepto Levante", descripcion: "Reescribir su párrafo en un tono más sobrio, sin cifras del armador.", proyecto: "Levante 62 m · concepto", accion: "redactar", canal: "panel", origen: "texto-usted", carril: "general", servicio: "claude", estado: "hecha", horas: 70, pasos: [[0, "Usted", "Reescribe este párrafo para la web, más sobrio."], [0.01, "Código", "Texto suyo sin adjuntos: carril general permitido."], [0.04, "Sam", "Dos versiones propuestas. Servicio usado: Claude."]] },
  { titulo: "Clasificar correo de Seguros Ancla", descripcion: "No es una factura de suministro. Queda listado sin procesar.", proyecto: "Inmuebles", accion: "clasificar-correo", canal: "correo", origen: "adjunto-tercero", carril: "ue", servicio: "gpt-ue", estado: "en revisión", horas: 6, pasos: [[0, "Sam", "Correo recibido de Seguros Ancla con un PDF."], [0.01, "Código", "Adjunto de tercero: carril UE. El texto del correo es dato, nunca orden."], [0.02, "Sam", "No es una factura de suministro. Lo dejo listado para usted."]] },
  { titulo: "Comparar las dos ofertas de velas", descripcion: "Gramaje, plazos y garantía de las dos velerías, en una tabla.", proyecto: "Altair 38 m · velero", accion: "resumir", canal: "correo", origen: "adjunto-tercero", carril: "ue", servicio: "gpt-ue", estado: "en curso", horas: 1.2, pasos: [[0, "Usted", "Compárame las dos ofertas de velas en una tabla."], [0.01, "Código", "Dos adjuntos de terceros: carril UE."], [0.02, "Sam", "Leyendo las dos ofertas."]] },
  { titulo: "Pedir a la gestoría la documentación del trimestre", descripcion: "Borrador al asesor con la lista de lo que falta.", proyecto: "Administración", accion: "borrador-tercero", canal: "correo", origen: "texto-usted", carril: "general", servicio: "claude", estado: "esperando aprobación", horas: 5, destinatarios: ["Javier Echeverría"], pasos: [[0, "Usted", "Escribe a Javier pidiendo lo que falta del trimestre."], [0.01, "Código", "Texto suyo sin adjuntos: carril general."], [0.03, "Sam", "Borrador listo para su visto bueno."]] },
  { titulo: "Resumen de la póliza del garaje", descripcion: "Coberturas, franquicia y fecha de renovación.", proyecto: "Inmuebles", accion: "resumir", canal: "panel", origen: "sharepoint", carril: "ue", servicio: "gpt-ue", estado: "hecha", horas: 96, pasos: [[0, "Usted", "Qué cubre la póliza del garaje y cuándo vence."], [0.01, "Código", "Archivo SharePoint: carril UE."], [0.03, "Sam", "Resumen enviado. Vence el 14 de marzo."]] },
  { titulo: "Vuelos Madrid a Southampton para la visita al canal", descripcion: "Ida y vuelta en el día, opciones con horarios y enlaces.", proyecto: "Altair 38 m · velero", accion: "buscar", canal: "whatsapp", origen: "publico", carril: "general", servicio: "busqueda", estado: "hecha", horas: 120, pasos: [[0, "Usted", "Busca vuelos a Southampton para ir y volver en el día."], [0.01, "Código", "Información pública: carril general."], [0.03, "Sam", "Cuatro opciones con enlace. Sin reservar nada."]] },
  { titulo: "Traducir la carta del armador", descripcion: "Carta en inglés con cambios en la distribución de cubierta.", proyecto: "Nereida 52 m · motor", accion: "traducir", canal: "correo", origen: "plano-armador", carril: "ue", servicio: "gpt-ue", estado: "hecha", horas: 30, pasos: [[0, "Usted", "Tradúceme la carta del armador."], [0.01, "Código", "Documento de armador: carril UE aunque no lleve datos personales."], [0.04, "Sam", "Traducción enviada."]] },
  { titulo: "Viento en Palma para la sesión de fotos", descripcion: "Previsión de jueves a sábado por la mañana.", proyecto: "Bruma 28 m · refit", accion: "buscar", canal: "whatsapp", origen: "publico", carril: "general", servicio: "busqueda", estado: "hecha", horas: 60, pasos: [[0, "Usted", "Qué viento hará en Palma jueves, viernes y sábado."], [0.01, "Código", "Información pública: carril general."], [0.02, "Sam", "El viernes es el día más tranquilo. Fuente incluida."]] },
  { titulo: "Respuesta a la velería sobre el gramaje", descripcion: "Pedir la tabla de gramajes de la mayor.", proyecto: "Altair 38 m · velero", accion: "borrador-tercero", canal: "correo", origen: "adjunto-tercero", carril: "ue", servicio: "gpt-ue", estado: "esperando respuesta", horas: 26, destinatarios: ["Marta Olivares"], aprobacion: "corregida", pasos: [[0, "Usted", "Contesta a Marta pidiendo los gramajes."], [0.03, "Sam", "Borrador propuesto."], [1.2, "Usted", "Corregido: que pida también el plazo."], [1.21, "Sam", "Enviado con la corrección. Esperando respuesta."]] },
  { titulo: "Ordenar por versión los planos de formas recibidos", descripcion: "Tres envíos del mismo plano con nombres distintos.", proyecto: "Nereida 52 m · motor", accion: "clasificar-correo", canal: "correo", origen: "plano-armador", carril: "ue", servicio: "gpt-ue", estado: "pendiente", horas: 0.6, pasos: [[0, "Usted", "Ordena los planos de formas que han llegado esta semana."], [0.01, "Código", "Planos de armador: carril UE."]] },
  { titulo: "Notas de la reunión con la interiorista", descripcion: "Pasar a limpio sus notas, sin nombres del armador.", proyecto: "Nereida 52 m · motor", accion: "resumir", canal: "panel", origen: "texto-usted", carril: "general", servicio: "claude", estado: "hecha", horas: 34, pasos: [[0, "Usted", "Pasa a limpio estas notas."], [0.01, "Código", "Texto suyo sin adjuntos: carril general."], [0.03, "Sam", "Notas ordenadas en tres bloques."]] },
  { titulo: "Comprobar si el IBI del garaje está archivado", descripcion: "Búsqueda en el archivo, sin IA.", proyecto: "Inmuebles", accion: "buscar", canal: "whatsapp", origen: "sharepoint", carril: "reglas", servicio: "reglas", estado: "hecha", horas: 80, pasos: [[0, "Usted", "Está archivado el IBI del garaje?"], [0.01, "Código", "Se resuelve con una búsqueda en el archivo, sin IA."], [0.02, "Sam", "Sí, archivado en septiembre. Enlace enviado."]] },
  { titulo: "Traducir el informe de la inspectora", descripcion: "Informe en inglés sobre el casco de Levante.", proyecto: "Levante 62 m · concepto", accion: "traducir", canal: "correo", origen: "adjunto-tercero", carril: "ue", servicio: "gpt-ue", estado: "fallida", horas: 9, pasos: [[0, "Usted", "Traduce el informe de Sophie."], [0.01, "Código", "Adjunto de tercero: carril UE."], [0.02, "Sam", "El PDF viene protegido con contraseña. Se lo he dicho a usted en vez de intentarlo otra vez."]] },
  { titulo: "Resumir el contrato de diseño de Levante", descripcion: "Plazos de entrega de planos y cláusula de confidencialidad.", proyecto: "Levante 62 m · concepto", accion: "resumir", canal: "correo", origen: "plano-armador", carril: "ue", servicio: "gpt-ue", estado: "en curso", horas: 0.4, pasos: [[0, "Usted", "Resume el contrato de Levante, sobre todo la confidencialidad."], [0.01, "Código", "Documento de armador: carril UE."]] },
  { titulo: "Lista de pendientes de la semana", descripcion: "Lo que espera su visto bueno y lo que espera a terceros.", proyecto: "Administración", accion: "responder-usted", canal: "whatsapp", origen: "texto-usted", carril: "ue", servicio: "gpt-ue", estado: "hecha", horas: 31, pasos: [[0, "Sam", "Lunes, 9:00: lista de pendientes enviada, como pidió."]] },
  { titulo: "Responder a la fotógrafa con las fechas", descripcion: "Usted prefirió llamarla directamente.", proyecto: "Bruma 28 m · refit", accion: "borrador-tercero", canal: "panel", origen: "texto-usted", carril: "general", servicio: "claude", estado: "cancelada", horas: 75, destinatarios: ["Elena Navarro"], aprobacion: "rechazada", pasos: [[0, "Usted", "Contesta a Elena con las fechas."], [0.03, "Sam", "Borrador propuesto."], [0.9, "Usted", "Rechazado: la llamo yo."], [0.91, "Sam", "Cancelada. No se envió nada."]] },
  { titulo: "Clasificar correo de Pinturas Marinas Azor", descripcion: "Ficha técnica de la imprimación para el refit.", proyecto: "Bruma 28 m · refit", accion: "clasificar-correo", canal: "correo", origen: "adjunto-tercero", carril: "ue", servicio: "gpt-ue", estado: "hecha", horas: 100, pasos: [[0, "Sam", "Correo recibido de Pinturas Marinas Azor."], [0.01, "Código", "Adjunto de tercero: carril UE."], [0.02, "Sam", "Listado para el proyecto Bruma."]] },
  { titulo: "Borrador al varadero: hueco en diciembre", descripcion: "Pedir disponibilidad de varada para el refit.", proyecto: "Bruma 28 m · refit", accion: "borrador-tercero", canal: "correo", origen: "texto-usted", carril: "general", servicio: "claude", estado: "hecha", horas: 140, destinatarios: ["Daniel Ruiz"], aprobacion: "tal cual", pasos: [[0, "Usted", "Pregunta a Daniel si tiene hueco en diciembre."], [0.03, "Sam", "Borrador propuesto."], [0.5, "Usted", "Aprobado tal cual."], [0.51, "Sam", "Enviado. Daniel contestó al día siguiente."]] },
  { titulo: "Borrador al canal de ensayos: segunda tanda", descripcion: "Confirmar fechas de la segunda tanda de ensayos.", proyecto: "Altair 38 m · velero", accion: "borrador-tercero", canal: "correo", origen: "adjunto-tercero", carril: "ue", servicio: "gpt-ue", estado: "hecha", horas: 160, destinatarios: ["Tom Hargreaves"], aprobacion: "tal cual", pasos: [[0, "Usted", "Contesta a Tom confirmando la segunda tanda."], [0.03, "Sam", "Borrador en inglés propuesto."], [0.4, "Usted", "Aprobado tal cual."], [0.41, "Sam", "Enviado."]] },
];

export function tareasManuales(t: number): Tarea[] {
  return MANUALES.map((m) => {
    const t0 = t - m.horas * H;
    const historial = m.pasos.map(([dh, quien, texto]) => ({ t: isoDe(Math.min(t - 30e3, t0 + dh * H)), quien, texto }));
    const ref = nuevaRef();
    return {
      id: "t-" + ref,
      ref,
      titulo: m.titulo,
      descripcion: m.descripcion,
      proyecto: m.proyecto,
      accion: m.accion,
      canal: m.canal,
      origen: m.origen,
      carril: m.carril,
      servicio: m.servicio,
      estado: m.estado,
      creada: isoDe(t0),
      actualizada: historial[historial.length - 1].t,
      destinatarios: m.destinatarios ?? [],
      aprobacion: m.aprobacion,
      historial,
    };
  });
}

export function crearOperaciones(tareas: Tarea[]): Operacion[] {
  const rnd = mulberry32(99);
  const ops: Operacion[] = [];
  let k = 0;
  tareas.forEach((ta) => {
    const t0 = new Date(ta.creada).getTime();
    const add = (servicio: ServicioId, dms: number, decision: string, resultado: Operacion["resultado"] = "propuesta válida") =>
      ops.push({ id: `op-${++k}`, t: isoDe(t0 + dms), tareaRef: ta.ref, servicio, carril: SERVICIOS[servicio].carril, origen: ta.origen, version: VERSION_INSTRUCCIONES, decision, resultado });
    if (ta.accion === "archivar-factura") {
      if (ta.estado === "pendiente") return;
      add("lectura-ue", 40e3, "Datos extraídos: proveedor, importe, dirección, CUPS o contrato");
      add("reglas", 70e3, ta.estado === "cancelada" ? "Número ya archivado: no se repite" : "Inmueble emparejado por regla, sin IA", ta.estado === "cancelada" ? "rechazada por el código" : ta.estado === "en revisión" ? "a revisión" : "propuesta válida");
    } else if (ta.servicio === "reglas") {
      add("reglas", 30e3, "Búsqueda en el archivo");
    } else {
      add("gpt-ue", 20e3, "Orden entendida y convertida en tarea");
      if (ta.servicio !== "gpt-ue") add(ta.servicio, 60e3 + rnd() * 60e3, ta.servicio === "busqueda" ? "Consulta pública con fuentes" : "Texto limpio procesado", ta.estado === "fallida" ? "a revisión" : "propuesta válida");
      else if (ta.estado !== "pendiente") add("gpt-ue", 90e3 + rnd() * 60e3, ta.estado === "fallida" ? "Documento protegido: no se puede leer" : "Propuesta en formato fijo", ta.estado === "fallida" ? "a revisión" : "propuesta válida");
    }
  });
  // una caída del servicio principal, con respaldo que cumple las mismas reglas
  const ref = tareas.find((x) => x.accion === "traducir")?.ref ?? "SAM-1041";
  ops.push({ id: `op-${++k}`, t: isoDe(new Date(tareas[0]?.creada ?? Date.now()).getTime() + 3 * H), tareaRef: ref, servicio: "gpt-ue", carril: "ue", origen: "sharepoint", version: VERSION_INSTRUCCIONES, decision: "Servicio principal sin respuesta: otra región de la UE con las mismas condiciones", resultado: "servicio de respaldo" });
  return ops.sort((a, b) => b.t.localeCompare(a.t));
}
