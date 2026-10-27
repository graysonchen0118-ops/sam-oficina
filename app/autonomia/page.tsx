"use client";

import { useState } from "react";
import { Ban, CheckCircle2, History, Mail, MessageCircle, Monitor, OctagonX, Pencil, Play, Plus, RotateCcw, ShieldCheck, ShieldOff, Undo2 } from "lucide-react";
import { Aviso, Badge, Barra, Boton, Campo, Modal, Skel } from "@/components/ui";
import { Reanudar } from "@/components/Reanudar";
import { historialAprobaciones, useStore } from "@/lib/store";
import type { Autorizacion, Instruccion } from "@/lib/types";
import { cuandoFue, fechaCorta, hora } from "@/lib/format";

export default function Autonomia() {
  const { listo, autorizaciones, tareas, facturas, instrucciones, parada, detener, conceder, revocar, revocarInstruccion, reactivarInstruccion, tick, toast } = useStore();
  const [conf, setConf] = useState<Autorizacion | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [reanudar, setReanudar] = useState(false);
  const [nueva, setNueva] = useState(false);
  const [editar, setEditar] = useState<Instruccion | null>(null);
  const [verVersiones, setVerVersiones] = useState<string | null>(null);

  const accion = async (fn: () => Promise<void>, id: string) => {
    setOcupado(id);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setOcupado(null);
  };

  return (
    <>
      <header className="cab-pagina">
        <span className="eyebrow">Autonomía y control</span>
        <h1 className="tit-pagina">Sam propone, usted decide. Y la autonomía se da con datos, no a ojo</h1>
      </header>

      <section className={`card parada ${parada.activa ? "p-activa" : ""}`}>
        <div className="parada-txt">
          <span className="parada-ic">
            <OctagonX size={26} />
          </span>
          <div>
            <h2>{parada.activa ? `Sam está detenido desde las ${parada.desde ? hora(parada.desde) : ""}` : "Parada de emergencia"}</h2>
            <p className="muted">
              {parada.activa
                ? "Acciones nuevas bloqueadas, tareas congeladas y autorizaciones suspendidas. Lo ya hecho sigue hecho. Al reanudar, usted elige qué autorizaciones vuelven."
                : "Se ejecuta en el acto, sin pasar por ninguna IA y sin pedir otra confirmación. Bloquea lo nuevo, congela lo que está en marcha y suspende todas las autorizaciones."}
            </p>
            <div className="parada-canales">
              <span>
                <Monitor size={14} /> Este botón
              </span>
              <span>
                <Mail size={14} /> Un correo suyo verificado con PARA
              </span>
              <span>
                <MessageCircle size={14} /> PARA por WhatsApp
              </span>
            </div>
          </div>
        </div>
        {parada.activa ? (
          <Boton icono={<Play size={17} />} onClick={() => setReanudar(true)}>
            Reanudar a Sam
          </Boton>
        ) : (
          <button className="btn btn-parar grande" disabled={!listo} onClick={() => detener("panel")}>
            <OctagonX size={19} />
            <span>Parar a Sam ahora</span>
          </button>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Autorizaciones</h2>
            <p>Cada una dice exactamente qué puede hacer Sam solo y con qué límites. Al lado, su historial: cuántas propuestas de ese tipo aprobó usted tal cual.</p>
          </div>
        </div>
        {!listo ? (
          <div className="form-col">
            {[0, 1, 2].map((i) => (
              <Skel key={i} alto={120} />
            ))}
          </div>
        ) : (
          <ul className="auts">
            {autorizaciones.map((a, i) => {
              const h = historialAprobaciones(a, tareas, facturas);
              const total = h.tal + h.corregidas + h.rechazadas;
              return (
                <li key={a.id} className={`aut aut-${a.estado.replace(/\s/g, "-")}`} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="aut-izq">
                    <div className="aut-cab">
                      <strong>{a.nombre}</strong>
                      <Badge tono={a.estado === "activa" ? "ok" : a.estado === "suspendida" ? "aviso" : "neutro"} punto>
                        {a.estado === "en aprobación" ? "pide aprobación" : a.estado}
                      </Badge>
                    </div>
                    <p className="aut-int">&quot;{a.interpretacion}&quot;</p>
                    <div className="chips">
                      {a.limites.map((l) => (
                        <span key={l} className="chip">
                          {l}
                        </span>
                      ))}
                    </div>
                    {a.maxMes && a.estado === "activa" && (
                      <div className="aut-uso">
                        <small>
                          Usada {a.usadasMes} de {a.maxMes} veces este mes
                        </small>
                        <Barra valor={(a.usadasMes / a.maxMes) * 100} tono="acento" />
                      </div>
                    )}
                  </div>
                  <div className="aut-der">
                    <div className="record">
                      <small>Su historial con esta acción</small>
                      {total === 0 ? (
                        <span className="muted">Aún sin propuestas</span>
                      ) : (
                        <>
                          <div className="record-barra" aria-label={`${h.tal} tal cual, ${h.corregidas} corregidas, ${h.rechazadas} rechazadas`}>
                            <i className="rb-ok" style={{ flex: h.tal }} />
                            <i className="rb-av" style={{ flex: h.corregidas }} />
                            <i className="rb-no" style={{ flex: h.rechazadas }} />
                          </div>
                          <div className="record-n">
                            <span>
                              <b className="mono">{h.tal}</b> tal cual
                            </span>
                            <span>
                              <b className="mono">{h.corregidas}</b> corregidas
                            </span>
                            <span>
                              <b className="mono">{h.rechazadas}</b> rechazadas
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    {a.estado === "activa" ? (
                      <Boton tono="secundario" className="btn-sm" icono={<ShieldOff size={15} />} cargando={ocupado === a.id} onClick={() => accion(() => revocar(a.id), a.id)}>
                        Revocar
                      </Boton>
                    ) : a.estado === "en aprobación" ? (
                      <Boton className="btn-sm" icono={<ShieldCheck size={15} />} disabled={parada.activa} onClick={() => setConf(a)}>
                        Darle autonomía
                      </Boton>
                    ) : (
                      <small className="muted">Suspendida por la parada</small>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="excluidas">
          <Ban size={18} />
          <p>
            <strong>Pagos, compromisos contractuales y datos sensibles hacia fuera</strong> no existen como acción. No se pueden autorizar: si se lo pide, Sam se niega y le explica por qué.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Instrucciones permanentes</h2>
            <p>Cambian cómo trabaja Sam. Nunca le dan permiso para actuar: si una instrucción lo implica, Sam le pide una autorización.</p>
          </div>
          <Boton className="btn-sm" icono={<Plus size={15} />} onClick={() => setNueva(true)} disabled={!listo}>
            Nueva instrucción
          </Boton>
        </div>
        {!listo ? (
          <Skel alto={160} />
        ) : (
          <ul className="instr">
            {instrucciones.map((ins) => (
              <li key={ins.id} className={`ins ins-${ins.estado.replace(/\s/g, "-")}`}>
                <div className="ins-cab">
                  <span className="chip">{ins.tema}</span>
                  <Badge tono={ins.estado === "activa" ? "ok" : ins.estado === "en espera" ? "aviso" : "neutro"}>{ins.estado}</Badge>
                  <small className="muted">desde {fechaCorta(ins.creada)}</small>
                </div>
                <p>&quot;{ins.texto}&quot;</p>
                <div className="ins-acc">
                  <button className="enlace-suave" onClick={() => setVerVersiones(verVersiones === ins.id ? null : ins.id)}>
                    <History size={14} /> {ins.versiones.length} {ins.versiones.length === 1 ? "versión" : "versiones"}
                  </button>
                  {ins.estado === "activa" && (
                    <>
                      <button className="enlace-suave" onClick={() => setEditar(ins)}>
                        <Pencil size={14} /> Corregir
                      </button>
                      <button className="enlace-suave" disabled={ocupado === ins.id} onClick={() => accion(() => revocarInstruccion(ins.id), ins.id)}>
                        <Undo2 size={14} /> Revocar
                      </button>
                    </>
                  )}
                  {ins.estado !== "activa" && (
                    <button className="enlace-suave" disabled={ocupado === ins.id} onClick={() => accion(() => reactivarInstruccion(ins.id), ins.id)}>
                      <RotateCcw size={14} /> Reactivar
                    </button>
                  )}
                </div>
                {verVersiones === ins.id && (
                  <ol className="versiones">
                    {ins.versiones.map((v, i) => (
                      <li key={i}>
                        <small className="muted">{cuandoFue(v.t, tick)}</small>
                        <span>&quot;{v.texto}&quot;</span>
                        <em>{v.nota}</em>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConcederModal aut={conf} onCerrar={() => setConf(null)} onConfirmar={(id) => accion(() => conceder(id), id)} />
      <InstruccionModal abierto={nueva} instruccion={null} onCerrar={() => setNueva(false)} />
      <InstruccionModal abierto={!!editar} instruccion={editar} onCerrar={() => setEditar(null)} />
      <Reanudar abierto={reanudar} onCerrar={() => setReanudar(false)} />
    </>
  );
}

function ConcederModal({ aut, onCerrar, onConfirmar }: { aut: Autorizacion | null; onCerrar: () => void; onConfirmar: (id: string) => Promise<void> }) {
  const { tareas, facturas } = useStore();
  const [cargando, setCargando] = useState(false);
  const h = aut ? historialAprobaciones(aut, tareas, facturas) : { tal: 0, corregidas: 0, rechazadas: 0 };
  const total = h.tal + h.corregidas + h.rechazadas;
  return (
    <Modal
      abierto={!!aut}
      titulo="Darle autonomía a Sam"
      onCerrar={onCerrar}
      ancho={520}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>
            Mejor no
          </button>
          <Boton
            icono={<CheckCircle2 size={16} />}
            cargando={cargando}
            onClick={async () => {
              if (!aut) return;
              setCargando(true);
              await onConfirmar(aut.id);
              setCargando(false);
              onCerrar();
            }}
          >
            Confirmo, con esos límites
          </Boton>
        </>
      }
    >
      {aut && (
        <div className="form-col">
          <div className="sam-dice">
            <small>Sam lo ha entendido así</small>
            <p>&quot;{aut.interpretacion}&quot;</p>
          </div>
          <div className="chips">
            {aut.limites.map((l) => (
              <span key={l} className="chip">
                {l}
              </span>
            ))}
          </div>
          {total > 0 ? (
            <Aviso tono={h.rechazadas + h.corregidas > total * 0.2 ? "aviso" : "ok"}>
              De las últimas {total} propuestas de este tipo, usted aprobó {h.tal} tal cual, corrigió {h.corregidas} y rechazó {h.rechazadas}.
            </Aviso>
          ) : (
            <Aviso tono="aviso">Todavía no hay propuestas de este tipo. Conceder autonomía sin historial es decidir a ojo.</Aviso>
          )}
          <p className="muted">Puede revocarla cuando quiera, con efecto inmediato. Lo que esté en cola no se ejecuta si se revoca antes.</p>
        </div>
      )}
    </Modal>
  );
}

function InstruccionModal({ abierto, instruccion, onCerrar }: { abierto: boolean; instruccion: Instruccion | null; onCerrar: () => void }) {
  const { guardarInstruccion, editarInstruccion } = useStore();
  const [texto, setTexto] = useState("");
  const [tema, setTema] = useState("Avisos");
  const [paso, setPaso] = useState<"escribir" | "confirmar">("escribir");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true);
    setTexto(instruccion?.texto ?? "");
    setTema(instruccion?.tema ?? "Avisos");
    setPaso("escribir");
    setError("");
  }
  if (!abierto && abiertoAntes) setAbiertoAntes(false);

  const pidePermiso = /(paga|pagar|firma|firmar|acepta|aceptar|envia sin|manda sin|sin preguntar)/i.test(texto.normalize("NFD").replace(/[̀-ͯ]/g, ""));

  const seguir = async () => {
    if (texto.trim().length < 8) return setError("Escríbala como se la diría a una persona.");
    if (paso === "escribir") return setPaso("confirmar");
    setCargando(true);
    if (instruccion) await editarInstruccion(instruccion.id, texto.trim());
    else await guardarInstruccion(texto.trim(), tema);
    setCargando(false);
    onCerrar();
  };

  return (
    <Modal
      abierto={abierto}
      titulo={instruccion ? "Corregir instrucción" : "Nueva instrucción permanente"}
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={paso === "confirmar" ? () => setPaso("escribir") : onCerrar}>
            {paso === "confirmar" ? "Volver a escribirla" : "Cancelar"}
          </button>
          <Boton cargando={cargando} disabled={paso === "confirmar" && pidePermiso} onClick={seguir}>
            {paso === "escribir" ? "Ver cómo la entiende Sam" : "Confirmar y guardar"}
          </Boton>
        </>
      }
    >
      <div className="form-col">
        {error && <Aviso tono="error">{error}</Aviso>}
        {paso === "escribir" ? (
          <>
            <Campo etiqueta="La instrucción, con sus palabras">
              <textarea className="textarea" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="A partir de ahora, los resúmenes en tres líneas." autoFocus />
            </Campo>
            {!instruccion && (
              <Campo etiqueta="Tema" ayuda="Si ya hay una activa sobre el mismo tema, la anterior queda en espera, no se borra.">
                <select className="select" value={tema} onChange={(e) => setTema(e.target.value)}>
                  {["Avisos", "Resúmenes", "Idioma con terceros", "Importes", "Pendientes", "Tono", "Otro"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Campo>
            )}
          </>
        ) : (
          <>
            <div className="sam-dice">
              <small>Sam lo ha entendido así</small>
              <p>&quot;{texto.trim()}&quot;</p>
            </div>
            {pidePermiso ? (
              <Aviso tono="aviso">Esto implica un permiso para actuar, y una instrucción no puede darlo. Pídalo como autorización, con sus límites.</Aviso>
            ) : (
              <Aviso tono="info">Se aplica desde el siguiente mensaje. Sus reglas de seguridad siguen por encima.</Aviso>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
