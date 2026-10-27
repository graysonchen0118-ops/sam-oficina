"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Autorizacion, Contacto, EstadoTarea, EventoTarea, Factura, Inmueble, Instruccion, Mensaje, Operacion, Origen, ReglaOrigen, Suministro, Tarea, TipoAccion, TipoInmueble, Canal } from "./types";
import { crearContactos, crearInmuebles } from "./mock/estudio";
import { crearFacturas, rutaArchivo } from "./mock/facturas";
import { crearOperaciones, nuevaRef, tareasDeFacturas, tareasManuales } from "./mock/tareas";
import { ULTIMO_WHATSAPP_HORAS, crearAutorizaciones, crearInstrucciones, crearMensajes } from "./mock/control";
import { ACCIONES, CARRILES, ORIGENES, REGLAS_BASE, SERVICIOS, VERSION_INSTRUCCIONES, carrilPorOrigen, servicioPara } from "./ruta";
import { entender } from "./intencion";
import { espera, eur, minus, pulso, uid } from "./format";
import { ahora, iniciarReloj, iso } from "./reloj";
import { FOTOS } from "./photos";

export interface Toast {
  id: string;
  texto: string;
  tono: "ok" | "error" | "info";
}

export interface Parada {
  activa: boolean;
  desde?: string;
  hechasAntes: number;
}

export const ACTIVAS: EstadoTarea[] = ["pendiente", "en curso", "esperando aprobación", "esperando respuesta"];
export const VENTANA_MS = 24 * 3600e3;

interface Ctx {
  listo: boolean;
  tick: number;
  inmuebles: Inmueble[];
  contactos: Contacto[];
  facturas: Factura[];
  tareas: Tarea[];
  operaciones: Operacion[];
  autorizaciones: Autorizacion[];
  instrucciones: Instruccion[];
  mensajes: Mensaje[];
  reglas: ReglaOrigen[];
  ultimoWhatsapp: string;
  escribiendo: boolean;
  parada: Parada;
  toasts: Toast[];
  toast: (texto: string, tono?: Toast["tono"]) => void;
  aprobar: (tareaId: string) => Promise<void>;
  rechazar: (tareaId: string) => Promise<void>;
  corregirInmueble: (facturaId: string, inmuebleId: string) => Promise<void>;
  pausar: (tareaId: string) => Promise<void>;
  reanudarTarea: (tareaId: string) => Promise<void>;
  cancelar: (tareaId: string) => Promise<void>;
  eliminarTarea: (tareaId: string) => Promise<void>;
  crearTarea: (d: { titulo: string; descripcion: string; proyecto: string; accion: TipoAccion; canal: Canal; origen: Origen; destinatarios?: string[] }) => Promise<string>;
  editarTarea: (tareaId: string, d: { titulo: string; descripcion: string; proyecto: string }) => Promise<void>;
  enviarMensaje: (texto: string, canal: Canal, adjunto: Origen | null, nombreAdjunto?: string) => Promise<void>;
  llegaFactura: () => Promise<void>;
  resolverAviso: (facturaId: string) => Promise<void>;
  detener: (canal: Canal) => Promise<void>;
  reanudar: (autorizacionesIds: string[]) => Promise<void>;
  conceder: (autId: string) => Promise<void>;
  revocar: (autId: string) => Promise<void>;
  guardarInstruccion: (texto: string, tema: string) => Promise<void>;
  editarInstruccion: (id: string, texto: string) => Promise<void>;
  revocarInstruccion: (id: string) => Promise<void>;
  reactivarInstruccion: (id: string) => Promise<void>;
  cambiarRegla: (origen: Origen, carril: ReglaOrigen["carril"]) => Promise<void>;
  guardarSuministro: (inmuebleId: string, s: Suministro) => Promise<void>;
  crearInmueble: (d: { nombre: string; direccion: string; ciudad: string; tipo: TipoInmueble; cupsLuz?: string; proveedorLuz?: string }) => Promise<void>;
  eliminarInmueble: (id: string) => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore fuera del proveedor");
  return c;
}

const latencia = () => espera(420 + Math.random() * 380);

export class ErrorParada extends Error {
  constructor() {
    super("Sam está detenido. Reanúdelo desde Autonomía para volver a actuar.");
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [listo, setListo] = useState(false);
  const [tick, setTick] = useState(0);
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([]);
  const [instrucciones, setInstrucciones] = useState<Instruccion[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [reglas, setReglas] = useState<ReglaOrigen[]>(REGLAS_BASE);
  const [ultimoWhatsapp, setUltimoWhatsapp] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [parada, setParada] = useState<Parada>({ activa: false, hechasAntes: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ref = useRef({ tareas, facturas, inmuebles, contactos, reglas, parada, autorizaciones, ultimoWhatsapp, instrucciones });
  ref.current = { tareas, facturas, inmuebles, contactos, reglas, parada, autorizaciones, ultimoWhatsapp, instrucciones };

  useEffect(() => {
    let vivo = true;
    iniciarReloj();
    (async () => {
      await espera(650);
      if (!vivo) return;
      const t = ahora();
      const inms = crearInmuebles();
      const facs = crearFacturas(t, inms);
      const tf = tareasDeFacturas(t, facs, inms);
      const tm = tareasManuales(t);
      const todas = [...tf, ...tm].sort((a, b) => b.actualizada.localeCompare(a.actualizada));
      const usadas = facs.filter((f) => f.porAutorizacion).length;
      const resumen = tm.find((x) => x.titulo.startsWith("Resumen del informe"))?.id ?? "";
      const ferry = tm.find((x) => x.titulo.startsWith("Horario del ferry"))?.id ?? "";
      const luzPalma = facs.find((f) => f.inmuebleId === "inm-04" && f.tipo === "Luz" && f.estado === "esperando aprobación")?.tareaId;
      setInmuebles(inms);
      setContactos(crearContactos());
      setFacturas(facs.map(({ aprobacionTarea: _a, porAutorizacion: _p, propuestoInicial: _i, ...f }) => f));
      setTareas(todas);
      setOperaciones(crearOperaciones(todas));
      setAutorizaciones(crearAutorizaciones(t, usadas));
      setInstrucciones(crearInstrucciones(t));
      setMensajes(crearMensajes(t, { resumen, ferry, luzPalma }));
      setUltimoWhatsapp(new Date(t - ULTIMO_WHATSAPP_HORAS * 3600e3).toISOString());
      setTick(t);
      setListo(true);
    })();
    const iv = setInterval(() => setTick(ahora()), 5000);
    return () => {
      vivo = false;
      clearInterval(iv);
    };
  }, []);

  const toast = useCallback((texto: string, tono: Toast["tono"] = "ok") => {
    const id = uid("t");
    setToasts((ts) => [...ts.slice(-3), { id, texto, tono }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3600);
  }, []);

  const evento = (ta: Tarea, quien: EventoTarea["quien"], texto: string): Tarea => {
    const t = iso();
    return { ...ta, actualizada: t, historial: [...ta.historial, { t, quien, texto }] };
  };

  const operar = (ta: Pick<Tarea, "ref" | "origen">, servicio: Operacion["servicio"], decision: string, resultado: Operacion["resultado"] = "propuesta válida") => {
    setOperaciones((os) => [{ id: uid("op"), t: iso(), tareaRef: ta.ref, servicio, carril: SERVICIOS[servicio].carril, origen: ta.origen, version: VERSION_INSTRUCCIONES, decision, resultado }, ...os]);
  };

  const exigirMarcha = () => {
    if (ref.current.parada.activa) throw new ErrorParada();
  };

  const decirSam = (texto: string, canal: Canal, tarjeta?: Mensaje["tarjeta"]) => {
    setMensajes((ms) => [...ms, { id: uid("m"), de: "sam", canal, t: iso(), texto, tarjeta }]);
  };

  const ventanaAbierta = () => ahora() - new Date(ref.current.ultimoWhatsapp).getTime() < VENTANA_MS;

  const aprobar = useCallback(async (tareaId: string) => {
    exigirMarcha();
    await latencia();
    exigirMarcha();
    const ta = ref.current.tareas.find((x) => x.id === tareaId);
    if (!ta) return;
    if (ta.estado !== "esperando aprobación") throw new Error("Esta tarea ya no espera aprobación.");
    if (ta.accion === "instruccion") {
      const texto = ta.descripcion;
      setInstrucciones((is) => [{ id: uid("ins"), tema: "Nueva", texto, estado: "activa", creada: iso(), versiones: [{ t: iso(), texto, nota: "Confirmada por usted" }] }, ...is]);
      setTareas((ts) => ts.map((x) => (x.id === tareaId ? { ...evento(evento(x, "Usted", "Confirmada."), "Sam", "Instrucción guardada. Se aplica desde ahora."), estado: "hecha", aprobacion: "tal cual" } : x)));
      pulso("aprobado");
      toast("Instrucción guardada");
      return;
    }
    if (ta.facturaId) {
      const f = ref.current.facturas.find((x) => x.id === ta.facturaId);
      const inm = ref.current.inmuebles.find((i) => i.id === f?.inmuebleId);
      if (!f || !inm) throw new Error("La factura no tiene inmueble. Asígnelo antes de aprobar.");
      const ruta = rutaArchivo(inm, f);
      setFacturas((fs) => fs.map((x) => (x.id === f.id ? { ...x, estado: "archivada", ruta } : x)));
      setTareas((ts) => ts.map((x) => (x.id === tareaId ? { ...evento(evento(evento(x, "Usted", "Aprobada tal cual."), "Código", "Permiso comprobado de nuevo justo antes de archivar."), "Sam", "Archivada y enlace enviado."), estado: "hecha", aprobacion: "tal cual" } : x)));
      operar(ta, "reglas", "Archivo con permiso: carpeta del inmueble");
      pulso("aprobado");
      toast(`Archivada en ${inm.nombre}`);
      return;
    }
    const enviado = ta.accion === "borrador-tercero";
    setTareas((ts) => ts.map((x) => (x.id === tareaId ? { ...evento(evento(x, "Usted", "Aprobada tal cual."), "Sam", enviado ? `Enviado a ${x.destinatarios.join(", ") || "su destinatario"}, con usted en copia.` : "Hecho."), estado: enviado ? "esperando respuesta" : "hecha", aprobacion: "tal cual" } : x)));
    pulso("aprobado");
    toast(enviado ? "Enviado con usted en copia" : "Aprobada");
  }, [toast]);

  const rechazar = useCallback(async (tareaId: string) => {
    await latencia();
    const ta = ref.current.tareas.find((x) => x.id === tareaId);
    if (!ta) return;
    if (ta.facturaId) setFacturas((fs) => fs.map((x) => (x.id === ta.facturaId ? { ...x, estado: "en revisión", motivo: "Usted rechazó el archivo. Queda para revisarla a mano." } : x)));
    setTareas((ts) => ts.map((x) => (x.id === tareaId ? { ...evento(evento(x, "Usted", "Rechazada."), "Sam", ta.facturaId ? "No se archiva. Queda en revisión." : "Cancelada. No se envió nada."), estado: ta.facturaId ? "en revisión" : "cancelada", aprobacion: "rechazada" } : x)));
    pulso("rechazado");
    toast("Rechazada. No se hizo nada", "info");
  }, [toast]);

  const corregirInmueble = useCallback(async (facturaId: string, inmuebleId: string) => {
    exigirMarcha();
    await latencia();
    const f = ref.current.facturas.find((x) => x.id === facturaId);
    const inm = ref.current.inmuebles.find((i) => i.id === inmuebleId);
    if (!f || !inm) return;
    const ruta = rutaArchivo(inm, f);
    setFacturas((fs) => fs.map((x) => (x.id === facturaId ? { ...x, inmuebleId, emparejado: "manual", estado: "archivada", ruta, motivo: "Inmueble corregido por usted. La corrección queda guardada para las próximas." } : x)));
    if (f.tareaId) setTareas((ts) => ts.map((x) => (x.id === f.tareaId ? { ...evento(evento(x, "Usted", `Corregida: el inmueble es ${inm.codigo}.`), "Sam", "Corrección guardada. Archivada y enlace enviado."), estado: "hecha", aprobacion: "corregida", titulo: x.titulo.replace(/·.*$/, `· ${inm.nombre}`) } : x)));
    pulso("aprobado");
    toast(`Corregida y archivada en ${inm.nombre}`);
  }, [toast]);

  const cambiarEstado = async (tareaId: string, estado: EstadoTarea, quien: EventoTarea["quien"], texto: string) => {
    await latencia();
    setTareas((ts) => ts.map((x) => (x.id === tareaId ? { ...evento(x, quien, texto), estado } : x)));
  };

  const pausar = useCallback(async (id: string) => {
    await cambiarEstado(id, "detenida", "Usted", "Pausada. Sam no hace nada en esta tarea hasta que la reanude.");
    toast("Tarea pausada", "info");
  }, [toast]);

  const reanudarTarea = useCallback(async (id: string) => {
    exigirMarcha();
    const ta = ref.current.tareas.find((x) => x.id === id);
    await cambiarEstado(id, ta?.aprobacion === undefined && ta && ACCIONES[ta.accion].cambia ? "esperando aprobación" : "en curso", "Usted", "Reanudada.");
    toast("Tarea reanudada");
  }, [toast]);

  const cancelar = useCallback(async (id: string) => {
    await cambiarEstado(id, "cancelada", "Usted", "Cancelada. No se envió ni se archivó nada.");
    toast("Tarea cancelada", "info");
  }, [toast]);

  const eliminarTarea = useCallback(async (id: string) => {
    await latencia();
    setTareas((ts) => ts.filter((x) => x.id !== id));
    toast("Quitada del panel. El registro de auditoría se conserva", "info");
  }, [toast]);

  const crearTarea = useCallback<Ctx["crearTarea"]>(async (d) => {
    exigirMarcha();
    await latencia();
    const carril = carrilPorOrigen(d.origen, ref.current.reglas);
    const servicio = servicioPara(d.accion, carril);
    const ref_ = nuevaRef();
    const id = "t-" + ref_;
    const t = iso();
    const cambia = ACCIONES[d.accion].cambia;
    const ta: Tarea = {
      id,
      ref: ref_,
      titulo: d.titulo,
      descripcion: d.descripcion,
      proyecto: d.proyecto,
      accion: d.accion,
      canal: d.canal,
      origen: d.origen,
      carril,
      servicio,
      estado: "en curso",
      creada: t,
      actualizada: t,
      destinatarios: d.destinatarios ?? [],
      historial: [
        { t, quien: "Usted", texto: d.titulo },
        { t, quien: "Código", texto: `Origen: ${minus(ORIGENES[d.origen])}. ${CARRILES[carril].nombre} fijado antes de abrir nada.` },
      ],
    };
    setTareas((ts) => [ta, ...ts]);
    operar(ta, "gpt-ue", "Orden entendida y convertida en tarea");
    pulso("tarea", { carril });
    setTimeout(() => {
      setTareas((ts) =>
        ts.map((x) =>
          x.id === id && x.estado === "en curso"
            ? { ...evento(x, "Sam", cambia ? `Propuesta lista con ${SERVICIOS[servicio].nombre}. Espera su aprobación.` : `Hecho con ${SERVICIOS[servicio].nombre}.`), estado: cambia ? "esperando aprobación" : "hecha" }
            : x,
        ),
      );
      if (servicio !== "gpt-ue") operar(ta, servicio, "Propuesta en formato fijo");
    }, 2600);
    return id;
  }, []);

  const editarTarea = useCallback<Ctx["editarTarea"]>(async (id, d) => {
    await latencia();
    setTareas((ts) => ts.map((x) => (x.id === id ? { ...evento({ ...x, ...d }, "Usted", "Datos de la tarea editados.") } : x)));
    toast("Tarea actualizada");
  }, [toast]);

  const detener = useCallback(async (canal: Canal) => {
    // sin IA y sin más aprobaciones: se ejecuta en el acto
    const t = iso();
    const hechas = ref.current.tareas.filter((x) => x.estado === "hecha").length;
    setParada({ activa: true, desde: t, hechasAntes: hechas });
    setTareas((ts) => ts.map((x) => (ACTIVAS.includes(x.estado) ? { ...x, antes: x.estado, estado: "detenida", actualizada: t, historial: [...x.historial, { t, quien: "Código", texto: "Parada de emergencia: tarea congelada." }] } : x)));
    setAutorizaciones((as) => as.map((a) => (a.estado === "activa" ? { ...a, antes: a.estado, estado: "suspendida" } : a)));
    pulso("parada");
    const activas = ref.current.tareas.filter((x) => ACTIVAS.includes(x.estado)).length;
    decirSam(`Parado. ${activas} tareas congeladas y todas las autorizaciones suspendidas. Lo ya hecho sigue hecho: ${hechas} tareas terminadas antes de la parada, y los mensajes ya enviados no se pueden recuperar. Solo usted puede reanudarme.`, canal);
    toast("Sam está detenido", "error");
  }, [toast]);

  const reanudar = useCallback(async (ids: string[]) => {
    await latencia();
    setParada({ activa: false, hechasAntes: 0 });
    setTareas((ts) => ts.map((x) => (x.estado === "detenida" && x.antes ? { ...evento(x, "Usted", "Reanudada tras la parada."), estado: x.antes, antes: undefined } : x)));
    setAutorizaciones((as) => as.map((a) => (a.estado === "suspendida" ? { ...a, estado: ids.includes(a.id) ? "activa" : "en aprobación", antes: undefined } : a)));
    pulso("reanudar");
    decirSam(ids.length ? `En marcha otra vez. Reactivadas: ${ref.current.autorizaciones.filter((a) => ids.includes(a.id)).map((a) => a.nombre.toLowerCase()).join(", ")}.` : "En marcha otra vez. Todas las acciones vuelven a pedir su aprobación.", "panel");
    toast("Sam vuelve a estar en marcha");
  }, [toast]);

  const conceder = useCallback(async (id: string) => {
    exigirMarcha();
    await latencia();
    setAutorizaciones((as) => as.map((a) => (a.id === id ? { ...a, estado: "activa", desde: iso() } : a)));
    pulso("aprobado");
    toast("Autonomía concedida con esos límites");
  }, [toast]);

  const revocar = useCallback(async (id: string) => {
    await latencia();
    setAutorizaciones((as) => as.map((a) => (a.id === id ? { ...a, estado: "en aprobación" } : a)));
    pulso("rechazado");
    toast("Revocada. Vuelve a pedir su aprobación desde ya", "info");
  }, [toast]);

  const guardarInstruccion = useCallback(async (texto: string, tema: string) => {
    await latencia();
    const t = iso();
    setInstrucciones((is) => [
      { id: uid("ins"), tema, texto, estado: "activa", creada: t, versiones: [{ t, texto, nota: "Confirmada por usted" }] },
      ...is.map((i) => (i.tema === tema && i.estado === "activa" ? { ...i, estado: "en espera" as const, versiones: [...i.versiones, { t, texto: i.texto, nota: "En espera: hay una más nueva sobre lo mismo" }] } : i)),
    ]);
    toast("Instrucción guardada");
  }, [toast]);

  const editarInstruccion = useCallback(async (id: string, texto: string) => {
    await latencia();
    setInstrucciones((is) => is.map((i) => (i.id === id ? { ...i, texto, versiones: [...i.versiones, { t: iso(), texto, nota: "Corregida por usted" }] } : i)));
    toast("Instrucción corregida");
  }, [toast]);

  const revocarInstruccion = useCallback(async (id: string) => {
    await latencia();
    setInstrucciones((is) => is.map((i) => (i.id === id ? { ...i, estado: "revocada", versiones: [...i.versiones, { t: iso(), texto: i.texto, nota: "Revocada por usted" }] } : i)));
    toast("Instrucción revocada", "info");
  }, [toast]);

  const reactivarInstruccion = useCallback(async (id: string) => {
    await latencia();
    const tema = ref.current.instrucciones.find((i) => i.id === id)?.tema;
    setInstrucciones((is) =>
      is.map((i) => (i.id === id ? { ...i, estado: "activa", versiones: [...i.versiones, { t: iso(), texto: i.texto, nota: "Reactivada por usted" }] } : i.tema === tema && i.estado === "activa" ? { ...i, estado: "en espera" } : i)),
    );
    toast("Instrucción reactivada");
  }, [toast]);

  const cambiarRegla = useCallback(async (origen: Origen, carril: ReglaOrigen["carril"]) => {
    await latencia();
    setReglas((rs) => rs.map((r) => (r.origen === origen && !r.fija ? { ...r, carril } : r)));
    pulso("regla", { carril });
    toast(`Regla cambiada: ${minus(CARRILES[carril].nombre)}`);
  }, [toast]);

  const guardarSuministro = useCallback(async (inmuebleId: string, s: Suministro) => {
    await latencia();
    if (s.cups && !/^ES\d{4}\d{12}[A-Z]{2}(\d[A-Z])?$/.test(s.cups.replace(/\s/g, ""))) throw new Error("El CUPS no tiene el formato esperado: ES, 16 cifras y 2 letras.");
    setInmuebles((is) => is.map((i) => (i.id === inmuebleId ? { ...i, suministros: i.suministros.some((x) => x.id === s.id) ? i.suministros.map((x) => (x.id === s.id ? { ...s, cups: s.cups?.replace(/\s/g, "") || undefined } : x)) : [...i.suministros, { ...s, id: uid("sum") }] } : i)));
    toast("Suministro guardado");
  }, [toast]);

  const crearInmueble = useCallback<Ctx["crearInmueble"]>(async (d) => {
    await latencia();
    if (d.cupsLuz && !/^ES\d{16}[A-Z]{2}(\d[A-Z])?$/.test(d.cupsLuz.replace(/\s/g, ""))) throw new Error("El CUPS no tiene el formato esperado: ES, 16 cifras y 2 letras.");
    setInmuebles((is) => {
      const n = is.length + 1;
      return [
        ...is,
        {
          id: uid("inm"),
          codigo: `INM-${String(n).padStart(2, "0")}`,
          nombre: d.nombre,
          direccion: d.direccion,
          ciudad: d.ciudad,
          tipo: d.tipo,
          foto: FOTOS.inmuebles[(n - 1) % FOTOS.inmuebles.length],
          suministros: d.cupsLuz ? [{ id: uid("sum"), tipo: "Luz", proveedor: d.proveedorLuz || "Sin indicar", cups: d.cupsLuz.replace(/\s/g, ""), contrato: "Pendiente", pdfAdjunto: true }] : [],
        },
      ];
    });
    toast("Inmueble añadido a la lista");
  }, [toast]);

  const eliminarInmueble = useCallback(async (id: string) => {
    await latencia();
    if (ref.current.facturas.some((f) => f.inmuebleId === id && f.estado !== "archivada")) throw new Error("Tiene facturas pendientes. Resuélvalas antes de quitarlo.");
    setInmuebles((is) => is.filter((i) => i.id !== id));
    toast("Inmueble quitado de la lista", "info");
  }, [toast]);

  const resolverAviso = useCallback(async (facturaId: string) => {
    exigirMarcha();
    await espera(900);
    const f = ref.current.facturas.find((x) => x.id === facturaId);
    if (!f) return;
    setFacturas((fs) => fs.map((x) => (x.id === facturaId ? { ...x, estado: "esperando aprobación", paginas: 2, motivo: "PDF subido por usted desde el área de cliente." } : x)));
    if (f.tareaId) setTareas((ts) => ts.map((x) => (x.id === f.tareaId ? { ...evento(evento(x, "Usted", "PDF subido desde el área de cliente."), "Sam", "Leída en la UE. Propuesta de archivo lista."), estado: "esperando aprobación" } : x)));
    toast("PDF recibido. Ya puede aprobar el archivo");
  }, [toast]);

  const llegaFactura = useCallback(async () => {
    exigirMarcha();
    await espera(1100);
    const inm = ref.current.inmuebles.find((i) => i.id === "inm-06") ?? ref.current.inmuebles[0];
    const s = inm.suministros.find((x) => x.tipo === "Agua") ?? inm.suministros[0];
    const t = iso();
    const importe = 38.64;
    const ref_ = nuevaRef();
    const fid = uid("fac");
    const tid = "t-" + ref_;
    const f: Factura = { id: fid, numero: `AHS2026-${Math.floor(100000 + Math.random() * 899999)}`, proveedor: s.proveedor, tipo: s.tipo, emision: t, periodo: "Bimestre actual", importe, paginas: 2, direccionTexto: "AV PUERTO 210 PISO 2 PTA A", contrato: s.contrato, inmuebleId: inm.id, emparejado: "contrato", estado: "esperando aprobación", recibida: t, tareaId: tid };
    const ta: Tarea = {
      id: tid,
      ref: ref_,
      titulo: `Archivar factura de agua · ${inm.nombre}`,
      descripcion: `${s.proveedor}, ${eur(importe)}.`,
      proyecto: "Inmuebles",
      accion: "archivar-factura",
      canal: "correo",
      origen: "factura-proveedor",
      carril: "ue",
      servicio: "lectura-ue",
      estado: "esperando aprobación",
      creada: t,
      actualizada: t,
      destinatarios: [],
      facturaId: fid,
      historial: [
        { t, quien: "Sam", texto: `Factura recibida de ${s.proveedor}, 2 páginas.` },
        { t, quien: "Código", texto: "Origen: factura de proveedor. Carril UE fijado antes de abrir el documento." },
        { t, quien: "Código", texto: `Emparejada con ${inm.codigo} por número de contrato.` },
        { t, quien: "Sam", texto: "Propuesta de archivo enviada a usted para su aprobación." },
      ],
    };
    setFacturas((fs) => [f, ...fs]);
    setTareas((ts) => [ta, ...ts]);
    operar(ta, "lectura-ue", "Datos extraídos: proveedor, importe, dirección, contrato");
    const plantilla = !ventanaAbierta();
    decirSam(`Factura de agua de ${inm.nombre}, ${eur(importe)}, lista para archivar. ¿La archivo?`, "whatsapp", { tareaId: tid, carril: "ue", servicio: "lectura-ue", origen: "factura-proveedor", necesitaAprobacion: true, plantilla });
    pulso("factura");
    toast(plantilla ? "Aviso enviado por WhatsApp como plantilla: la ventana de 24 h está cerrada" : "Aviso enviado por WhatsApp dentro de la ventana de 24 h", "info");
  }, [toast]);

  const enviarMensaje = useCallback(async (texto: string, canal: Canal, adjunto: Origen | null, nombreAdjunto?: string) => {
    const limpio = texto.trim();
    if (!limpio) return;
    const t = iso();
    setMensajes((ms) => [...ms, { id: uid("m"), de: "usted", canal, t, texto: limpio, adjunto: nombreAdjunto }]);
    if (canal === "whatsapp") setUltimoWhatsapp(t);
    const it = entender(limpio, adjunto, ref.current.inmuebles, ref.current.contactos);
    if (it.accion === "parada") {
      await detener(canal);
      return;
    }
    if (ref.current.parada.activa) {
      await espera(500);
      decirSam("Estoy detenido. Solo usted puede reanudarme desde Autonomía, y hasta entonces no hago nada.", canal);
      return;
    }
    setEscribiendo(true);
    await espera(1100 + Math.random() * 700);
    const carril = carrilPorOrigen(it.origen, ref.current.reglas);
    const servicio = servicioPara(it.accion, carril);
    const cambia = ACCIONES[it.accion].cambia;
    const ref_ = nuevaRef();
    const id = "t-" + ref_;
    const inm = ref.current.inmuebles.find((i) => i.id === it.inmuebleId);
    const descripcion = it.accion === "instruccion" ? it.instruccion ?? limpio : limpio;
    const ta: Tarea = {
      id,
      ref: ref_,
      titulo: it.titulo,
      descripcion,
      proyecto: it.proyecto,
      accion: it.accion,
      canal,
      origen: it.origen,
      carril,
      servicio,
      estado: cambia ? "esperando aprobación" : "hecha",
      creada: t,
      actualizada: iso(),
      destinatarios: it.destinatario ? [it.destinatario] : [],
      historial: [
        { t, quien: "Usted", texto: limpio },
        { t, quien: "Código", texto: `Origen: ${minus(ORIGENES[it.origen])}. ${CARRILES[carril].nombre} fijado antes de abrir nada.` },
        { t: iso(), quien: "Sam", texto: cambia ? `Propuesta preparada con ${SERVICIOS[servicio].nombre}. Espera su aprobación.` : `Hecho con ${SERVICIOS[servicio].nombre}.` },
      ],
    };
    setTareas((ts) => [ta, ...ts]);
    operar(ta, "gpt-ue", "Orden entendida y convertida en tarea");
    if (servicio !== "gpt-ue") operar(ta, servicio, cambia ? "Propuesta en formato fijo" : servicio === "busqueda" ? "Consulta pública con fuentes" : "Texto limpio procesado");
    const respuesta = (() => {
      switch (it.accion) {
        case "instruccion":
          return `Lo he entendido así: "${descripcion}". ¿Lo guardo como instrucción permanente? Cambia cómo trabajo, pero no me da permiso para actuar.`;
        case "archivar-factura":
          return inm ? `Preparado. Cuando me dé el visto bueno lo archivo en la carpeta de ${inm.nombre}.` : "Preparado, pero no sé a qué inmueble va. Dígame cuál y lo archivo con su visto bueno.";
        case "borrador-tercero":
          return `Borrador listo${it.destinatario ? ` para ${it.destinatario}` : ""}. No sale nada hasta que usted lo apruebe, y irá con usted en copia.`;
        case "resumir":
          return "Hecho. Le dejo el resumen en cinco líneas, como me pidió que fueran siempre.";
        case "traducir":
          return "Traducción lista. Guardo el original al lado.";
        case "buscar":
          return carril === "general" ? "Aquí tiene lo que he encontrado, con las fuentes para que lo compruebe." : "Lo he buscado en el archivo, sin sacar nada fuera.";
        case "redactar":
          return "Le propongo dos versiones. Si una le sirve, me dice cuál.";
        default:
          return "Anotado. Si es para un proyecto concreto, dígame cuál y lo ordeno ahí.";
      }
    })();
    setEscribiendo(false);
    decirSam(respuesta, canal, { tareaId: id, carril, servicio, origen: it.origen, necesitaAprobacion: cambia, plantilla: false });
    pulso("tarea", { carril });
  }, [detener]);

  const valor = useMemo<Ctx>(
    () => ({
      listo,
      tick,
      inmuebles,
      contactos,
      facturas,
      tareas,
      operaciones,
      autorizaciones,
      instrucciones,
      mensajes,
      reglas,
      ultimoWhatsapp,
      escribiendo,
      parada,
      toasts,
      toast,
      aprobar,
      rechazar,
      corregirInmueble,
      pausar,
      reanudarTarea,
      cancelar,
      eliminarTarea,
      crearTarea,
      editarTarea,
      enviarMensaje,
      llegaFactura,
      resolverAviso,
      detener,
      reanudar,
      conceder,
      revocar,
      guardarInstruccion,
      editarInstruccion,
      revocarInstruccion,
      reactivarInstruccion,
      cambiarRegla,
      guardarSuministro,
      crearInmueble,
      eliminarInmueble,
    }),
    [listo, tick, inmuebles, contactos, facturas, tareas, operaciones, autorizaciones, instrucciones, mensajes, reglas, ultimoWhatsapp, escribiendo, parada, toasts, toast, aprobar, rechazar, corregirInmueble, pausar, reanudarTarea, cancelar, eliminarTarea, crearTarea, editarTarea, enviarMensaje, llegaFactura, resolverAviso, detener, reanudar, conceder, revocar, guardarInstruccion, editarInstruccion, revocarInstruccion, reactivarInstruccion, cambiarRegla, guardarSuministro, crearInmueble, eliminarInmueble],
  );

  return <StoreCtx.Provider value={valor}>{children}</StoreCtx.Provider>;
}

/** cuántas propuestas de cada autorización aprobó usted tal cual, corrigió o rechazó */
export function historialAprobaciones(a: Autorizacion, tareas: Tarea[], facturas: Factura[]) {
  const porId = new Map(facturas.map((f) => [f.id, f]));
  const delTipo = tareas.filter((t) => t.accion === a.accion && t.aprobacion && (!a.alcance || (t.facturaId && a.alcance.includes(porId.get(t.facturaId)?.tipo ?? "Luz"))));
  return {
    tal: delTipo.filter((t) => t.aprobacion === "tal cual").length,
    corregidas: delTipo.filter((t) => t.aprobacion === "corregida").length,
    rechazadas: delTipo.filter((t) => t.aprobacion === "rechazada").length,
  };
}
