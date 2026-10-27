"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Mail, MessageCircle, Monitor, Paperclip, Send, ShieldAlert, X } from "lucide-react";
import { Badge, Skel } from "./ui";
import { VENTANA_MS, useStore } from "@/lib/store";
import { CARRILES, ORIGENES, SERVICIOS } from "@/lib/ruta";
import type { Canal, Mensaje, Origen } from "@/lib/types";
import { cuandoFue, hora, minus } from "@/lib/format";

const CANALES: { id: Canal; texto: string; icono: typeof Mail }[] = [
  { id: "panel", texto: "Panel", icono: Monitor },
  { id: "correo", texto: "Correo", icono: Mail },
  { id: "whatsapp", texto: "WhatsApp", icono: MessageCircle },
];

const ADJUNTOS: { origen: Origen; nombre: string }[] = [
  { origen: "factura-proveedor", nombre: "Factura_luz_Velazquez_oct.pdf" },
  { origen: "adjunto-tercero", nombre: "Presupuesto_astillero.pdf" },
  { origen: "plano-armador", nombre: "Plano_formas_Altair_rev4.pdf" },
  { origen: "sharepoint", nombre: "Poliza_garaje_Ayala.pdf" },
];

const SUGERENCIAS = [
  "Archiva la factura de luz de Ponzano",
  "Resume el contrato de Levante",
  "Escribe a Lucía con dos fechas para la prueba de mar",
  "Qué viento hará en Palma el viernes",
  "A partir de ahora, los resúmenes en tres líneas",
];

export function Conversacion() {
  const { listo, mensajes, enviarMensaje, escribiendo, tareas, aprobar, rechazar, tick, ultimoWhatsapp, parada, toast } = useStore();
  const [canal, setCanal] = useState<Canal>("panel");
  const [texto, setTexto] = useState("");
  const [adjunto, setAdjunto] = useState<(typeof ADJUNTOS)[number] | null>(null);
  const [menuAdj, setMenuAdj] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const lista = useRef<HTMLDivElement | null>(null);

  const visibles = useMemo(() => mensajes.filter((m) => canal === "panel" || m.canal === canal || m.canal === "panel"), [mensajes, canal]);
  const ventanaRestante = VENTANA_MS - (tick - new Date(ultimoWhatsapp || 0).getTime());
  const ventana = ventanaRestante > 0;

  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visibles.length, escribiendo]);

  const enviar = async (t = texto) => {
    if (!t.trim()) return;
    const adj = adjunto;
    setTexto("");
    setAdjunto(null);
    await enviarMensaje(t, canal, adj?.origen ?? null, adj?.nombre);
  };

  const decidir = async (m: Mensaje, si: boolean) => {
    if (!m.tarjeta) return;
    setOcupado(m.id);
    try {
      if (si) await aprobar(m.tarjeta.tareaId);
      else await rechazar(m.tarjeta.tareaId);
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setOcupado(null);
  };

  return (
    <section className="card conv" aria-label="Conversación con Sam">
      <div className="card-head">
        <div>
          <h2>Hable con Sam</h2>
          <p>Una sola conversación. Sam decide qué IA trabaja; usted solo ve el resultado y lo que pide su visto bueno.</p>
        </div>
        <div className="tabs" role="tablist" aria-label="Canal">
          {CANALES.map((c) => {
            const Ic = c.icono;
            return (
              <button key={c.id} role="tab" aria-selected={canal === c.id} className={`tab ${canal === c.id ? "on" : ""}`} onClick={() => setCanal(c.id)}>
                <Ic size={15} />
                {c.texto}
              </button>
            );
          })}
        </div>
      </div>

      {canal === "whatsapp" && listo && (
        <div className={`ventana ${ventana ? "v-abierta" : "v-cerrada"}`}>
          <MessageCircle size={17} />
          {ventana ? (
            <span>
              <strong>Ventana abierta</strong> hasta las {hora(new Date(tick + ventanaRestante).toISOString())}: Sam puede escribirle libremente.
            </span>
          ) : (
            <span>
              <strong>Ventana de 24 horas cerrada</strong> desde hace {Math.round(-ventanaRestante / 3600e3)} h. Sam solo puede escribirle con plantillas aprobadas por Meta, que se pagan por mensaje. Escríbale algo y se vuelve a abrir.
            </span>
          )}
        </div>
      )}

      <div className="conv-lista" ref={lista}>
        {!listo &&
          [0, 1, 2].map((i) => (
            <div key={i} className={`burbuja-skel ${i % 2 ? "der" : ""}`}>
              <Skel alto={58} />
            </div>
          ))}
        {listo &&
          visibles.map((m, i) => {
            const ta = m.tarjeta ? tareas.find((t) => t.id === m.tarjeta?.tareaId) : undefined;
            const pendiente = ta?.estado === "esperando aprobación";
            return (
              <div key={m.id} className={`msg ${m.de === "usted" ? "msg-usted" : "msg-sam"}`} style={{ animationDelay: `${Math.min(i, 6) * 30}ms` }}>
                <div className="burbuja">
                  {m.adjunto && (
                    <span className="adj-chip">
                      <Paperclip size={13} /> {m.adjunto}
                    </span>
                  )}
                  <p>{m.texto}</p>
                  {m.tarjeta && (
                    <div className="tarjeta-ruta">
                      <div className="tr-fila">
                        <Badge tono={CARRILES[m.tarjeta.carril].tono}>{CARRILES[m.tarjeta.carril].nombre}</Badge>
                        <span className="tr-serv">{SERVICIOS[m.tarjeta.servicio].nombre}</span>
                        {ta && <span className="tr-ref mono">{ta.ref}</span>}
                      </div>
                      <small>Fijado por el origen, {minus(ORIGENES[m.tarjeta.origen])}, antes de abrir nada.</small>
                      {m.tarjeta.plantilla && (
                        <small className="tr-plantilla">
                          <ShieldAlert size={13} /> Enviado como plantilla aprobada por Meta: la ventana de 24 h estaba cerrada.
                        </small>
                      )}
                      {m.tarjeta.necesitaAprobacion && ta && (
                        <div className="tr-acciones">
                          {pendiente ? (
                            <>
                              <button className="btn btn-primario btn-sm" disabled={ocupado === m.id || parada.activa} onClick={() => decidir(m, true)}>
                                <Check size={15} /> <span>Aprobar</span>
                              </button>
                              <button className="btn btn-secundario btn-sm" disabled={ocupado === m.id} onClick={() => decidir(m, false)}>
                                <X size={15} /> <span>Rechazar</span>
                              </button>
                              <Link className="enlace" href={`/tareas?ref=${ta.ref}`}>
                                Ver tarea
                              </Link>
                            </>
                          ) : (
                            <Badge tono={ta.aprobacion === "rechazada" ? "error" : ta.estado === "detenida" ? "aviso" : "ok"}>{ta.aprobacion === "rechazada" ? "Rechazada" : ta.estado === "detenida" ? "Detenida" : ta.aprobacion ? `Aprobada ${ta.aprobacion === "corregida" ? "con corrección" : ""}`.trim() : "Hecha"}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="msg-meta">
                  {m.de === "sam" ? "Sam" : "Usted"} · {m.canal === "whatsapp" ? "WhatsApp" : m.canal === "correo" ? "correo" : "panel"} · {cuandoFue(m.t, tick)}
                </span>
              </div>
            );
          })}
        {escribiendo && (
          <div className="msg msg-sam">
            <div className="burbuja escribiendo" aria-label="Sam está escribiendo">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
      </div>

      <div className="sugerencias">
        {SUGERENCIAS.map((s) => (
          <button key={s} className="sug" onClick={() => enviar(s)} disabled={!listo || escribiendo}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="conv-form"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <div className="adj-wrap">
          <button type="button" className={`icon-btn ${adjunto ? "on" : ""}`} aria-label="Adjuntar documento" onClick={() => setMenuAdj((v) => !v)}>
            <Paperclip size={18} />
          </button>
          {menuAdj && (
            <div className="adj-menu" role="menu">
              {ADJUNTOS.map((a) => (
                <button
                  type="button"
                  role="menuitem"
                  key={a.nombre}
                  onClick={() => {
                    setAdjunto(a);
                    setMenuAdj(false);
                  }}
                >
                  <strong>{a.nombre}</strong>
                  <small>{ORIGENES[a.origen]}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="conv-input">
          {adjunto && (
            <span className="adj-chip quitar">
              <Paperclip size={13} /> {adjunto.nombre}
              <button type="button" aria-label="Quitar adjunto" onClick={() => setAdjunto(null)}>
                <X size={13} />
              </button>
            </span>
          )}
          <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={canal === "whatsapp" ? "Escriba como en WhatsApp. PARA detiene a Sam." : "Pídale algo a Sam"} aria-label="Mensaje para Sam" disabled={!listo} />
        </div>
        <button className="btn btn-primario" type="submit" disabled={!listo || !texto.trim() || escribiendo} aria-label="Enviar">
          <Send size={17} />
          <span className="solo-ancho">Enviar</span>
        </button>
      </form>
    </section>
  );
}
