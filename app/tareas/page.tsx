"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownUp, Ban, Check, Mail, MessageCircle, Monitor, Pause, Pencil, Play, Plus, Search, Trash2, X } from "lucide-react";
import { Avatar, Aviso, Badge, Boton, Campo, Confirmar, Drawer, Modal, Paginacion, Skel, Vacio } from "@/components/ui";
import { TONO_ESTADO } from "@/lib/estados";
import { useStore } from "@/lib/store";
import { ACCIONES, CARRILES, ORIGENES, SERVICIOS, carrilPara } from "@/lib/ruta";
import { PROYECTOS } from "@/lib/mock/estudio";
import type { Canal, Carril, EstadoTarea, Origen, Tarea, TipoAccion } from "@/lib/types";
import { cuandoFue, haceCuanto, norm } from "@/lib/format";


const PESTANAS: { id: string; texto: string; estados?: EstadoTarea[] }[] = [
  { id: "todas", texto: "Todas" },
  { id: "aprobar", texto: "Para aprobar", estados: ["esperando aprobación"] },
  { id: "abiertas", texto: "Abiertas", estados: ["pendiente", "en curso", "esperando respuesta", "en revisión", "detenida"] },
  { id: "hechas", texto: "Hechas", estados: ["hecha"] },
  { id: "cerradas", texto: "Canceladas y fallidas", estados: ["cancelada", "fallida"] },
];

const CANAL_IC: Record<Canal, typeof Mail> = { correo: Mail, whatsapp: MessageCircle, panel: Monitor };

function Contenido() {
  const sp = useSearchParams();
  const { listo, tareas, contactos, tick, aprobar, rechazar, pausar, reanudarTarea, cancelar, eliminarTarea, crearTarea, editarTarea, parada, toast, reglas } = useStore();
  const [pestana, setPestana] = useState("todas");
  const [q, setQ] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [carril, setCarril] = useState<"" | Carril>("");
  const [orden, setOrden] = useState<"reciente" | "antigua" | "estado">("reciente");
  const [pag, setPag] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [editar, setEditar] = useState<Tarea | null>(null);
  const [borrar, setBorrar] = useState<Tarea | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    const ref = sp.get("ref");
    const est = sp.get("estado");
    const pr = sp.get("proyecto");
    if (est === "esperando aprobación") setPestana("aprobar");
    if (pr) setProyecto(pr);
    if (ref && listo) {
      const t = tareas.find((x) => x.ref === ref);
      if (t) setAbierta(t.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, listo]);

  const filtradas = useMemo(() => {
    const p = PESTANAS.find((x) => x.id === pestana);
    const nq = norm(q);
    const r = tareas.filter((t) => (!p?.estados || p.estados.includes(t.estado)) && (!proyecto || t.proyecto === proyecto) && (!carril || t.carril === carril) && (!nq || norm(`${t.ref} ${t.titulo} ${t.descripcion} ${t.destinatarios.join(" ")}`).includes(nq)));
    const peso: Record<EstadoTarea, number> = { "esperando aprobación": 0, detenida: 1, "en revisión": 2, pendiente: 3, "en curso": 4, "esperando respuesta": 5, fallida: 6, hecha: 7, cancelada: 8 };
    return [...r].sort((a, b) => (orden === "reciente" ? b.actualizada.localeCompare(a.actualizada) : orden === "antigua" ? a.creada.localeCompare(b.creada) : peso[a.estado] - peso[b.estado] || b.actualizada.localeCompare(a.actualizada)));
  }, [tareas, pestana, q, proyecto, carril, orden]);
  const POR = 12;
  const pagina = filtradas.slice((pag - 1) * POR, pag * POR);
  const tarea = tareas.find((t) => t.id === abierta);

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
      <header className="cab-pagina fila-cab">
        <div>
          <span className="eyebrow">Tareas</span>
          <h1 className="tit-pagina">Todo lo que usted ha pedido y lo que Sam ha hecho</h1>
        </div>
        <Boton icono={<Plus size={17} />} onClick={() => setNueva(true)} disabled={!listo}>
          Nueva tarea
        </Boton>
      </header>

      <section className="card">
        <div className="tabs tabs-scroll" role="tablist">
          {PESTANAS.map((p) => {
            const n = p.estados ? tareas.filter((t) => p.estados!.includes(t.estado)).length : tareas.length;
            return (
              <button key={p.id} role="tab" aria-selected={pestana === p.id} className={`tab ${pestana === p.id ? "on" : ""}`} onClick={() => (setPestana(p.id), setPag(1))}>
                {p.texto} {listo && <em className="tab-n">{n}</em>}
              </button>
            );
          })}
        </div>
        <div className="toolbar">
          <label className="buscar">
            <Search size={16} />
            <input className="input" placeholder="Buscar por referencia, título o destinatario" value={q} onChange={(e) => (setQ(e.target.value), setPag(1))} aria-label="Buscar tareas" />
          </label>
          <select className="select" value={proyecto} onChange={(e) => (setProyecto(e.target.value), setPag(1))} aria-label="Filtrar por proyecto">
            <option value="">Todos los proyectos</option>
            {PROYECTOS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select className="select" value={carril} onChange={(e) => (setCarril(e.target.value as Carril | ""), setPag(1))} aria-label="Filtrar por carril">
            <option value="">Todos los carriles</option>
            <option value="ue">Carril UE</option>
            <option value="general">Carril general</option>
            <option value="reglas">Sin IA</option>
          </select>
          <label className="orden">
            <ArrowDownUp size={15} />
            <select className="select" value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)} aria-label="Ordenar">
              <option value="reciente">Movimiento más reciente</option>
              <option value="antigua">Creación más antigua</option>
              <option value="estado">Por estado, lo urgente primero</option>
            </select>
          </label>
        </div>

        {!listo ? (
          <div className="form-col">
            {Array.from({ length: 7 }, (_, i) => (
              <Skel key={i} alto={56} />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <Vacio icono={<Search size={22} />} titulo="No hay tareas con esos filtros" texto="Pruebe con otra pestaña o quite algún filtro." accion={<button className="btn btn-secundario" onClick={() => (setQ(""), setProyecto(""), setCarril(""), setPestana("todas"))}>Quitar filtros</button>} />
        ) : (
          <div className="tabla">
            <div className="t-fila t-head t-tareas">
              <span>Tarea</span>
              <span>Proyecto</span>
              <span>Ruta</span>
              <span>Estado</span>
              <span>Movimiento</span>
            </div>
            {pagina.map((t, i) => {
              const Ic = CANAL_IC[t.canal];
              return (
                <button key={t.id} className="t-fila t-tareas t-click" onClick={() => setAbierta(t.id)} style={{ animationDelay: `${i * 25}ms` }}>
                  <span className="tt-tit">
                    <Ic size={15} className="muted" />
                    <span>
                      <strong>{t.titulo}</strong>
                      <small className="mono muted">{t.ref}</small>
                    </span>
                  </span>
                  <span className="tt-proy">{t.proyecto}</span>
                  <span className="tt-ruta">
                    <Badge tono={CARRILES[t.carril].tono}>{CARRILES[t.carril].corto}</Badge>
                    <small>{SERVICIOS[t.servicio].nombre}</small>
                  </span>
                  <span className="tt-est">
                    <Badge tono={TONO_ESTADO[t.estado]} punto>
                      {t.estado}
                    </Badge>
                  </span>
                  <span className="tt-mov muted">{haceCuanto(t.actualizada, tick)}</span>
                </button>
              );
            })}
          </div>
        )}
        <Paginacion pagina={pag} total={filtradas.length} porPagina={POR} onCambio={setPag} />
      </section>

      <Drawer
        abierto={!!tarea}
        titulo={tarea?.titulo ?? ""}
        sub={
          tarea && (
            <>
              <span className="mono">{tarea.ref}</span> · {tarea.proyecto} · <Badge tono={TONO_ESTADO[tarea.estado]}>{tarea.estado}</Badge>
            </>
          )
        }
        onCerrar={() => setAbierta(null)}
        pie={
          tarea && (
            <div className="pie-acciones">
              {tarea.estado === "esperando aprobación" && (
                <>
                  <Boton icono={<Check size={16} />} cargando={ocupado === tarea.id + "a"} disabled={parada.activa} onClick={() => accion(() => aprobar(tarea.id), tarea.id + "a")}>
                    Aprobar
                  </Boton>
                  <Boton tono="secundario" icono={<X size={16} />} cargando={ocupado === tarea.id + "r"} onClick={() => accion(() => rechazar(tarea.id), tarea.id + "r")}>
                    Rechazar
                  </Boton>
                </>
              )}
              {["pendiente", "en curso", "esperando aprobación", "esperando respuesta"].includes(tarea.estado) && (
                <Boton tono="secundario" icono={<Pause size={16} />} cargando={ocupado === tarea.id + "p"} onClick={() => accion(() => pausar(tarea.id), tarea.id + "p")}>
                  Pausar
                </Boton>
              )}
              {tarea.estado === "detenida" && !parada.activa && (
                <Boton tono="secundario" icono={<Play size={16} />} cargando={ocupado === tarea.id + "s"} onClick={() => accion(() => reanudarTarea(tarea.id), tarea.id + "s")}>
                  Reanudar
                </Boton>
              )}
              {!["hecha", "cancelada", "fallida"].includes(tarea.estado) && (
                <Boton tono="ghost" icono={<Ban size={16} />} cargando={ocupado === tarea.id + "c"} onClick={() => accion(() => cancelar(tarea.id), tarea.id + "c")}>
                  Cancelar
                </Boton>
              )}
              <button className="icon-btn" aria-label="Editar tarea" onClick={() => setEditar(tarea)}>
                <Pencil size={16} />
              </button>
              {["hecha", "cancelada", "fallida"].includes(tarea.estado) && (
                <button className="icon-btn" aria-label="Quitar del panel" onClick={() => setBorrar(tarea)}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )
        }
      >
        {tarea && (
          <div className="form-col">
            <p>{tarea.descripcion}</p>
            <div className="datos">
              <div className="dato">
                <small>Origen</small>
                <strong>{ORIGENES[tarea.origen]}</strong>
              </div>
              <div className="dato">
                <small>Carril y servicio</small>
                <strong>
                  {CARRILES[tarea.carril].nombre} · {SERVICIOS[tarea.servicio].nombre}
                </strong>
              </div>
              <div className="dato">
                <small>Acción</small>
                <strong>{ACCIONES[tarea.accion].nombre}</strong>
              </div>
              <div className="dato">
                <small>Canal</small>
                <strong>{tarea.canal === "whatsapp" ? "WhatsApp" : tarea.canal === "correo" ? "Correo" : "Panel"}</strong>
              </div>
              {tarea.destinatarios.length > 0 && (
                <div className="dato ancho">
                  <small>Destinatarios</small>
                  {tarea.destinatarios.map((d) => {
                    const c = contactos.find((x) => x.nombre === d);
                    return (
                      <span key={d} className="contacto">
                        {c && <Avatar src={c.foto} alt={c.nombre} size={34} />}
                        <span>
                          <strong>{d}</strong>
                          {c && (
                            <small>
                              {c.rol} · {c.empresa}
                            </small>
                          )}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
              {tarea.autorizacionId && (
                <div className="dato">
                  <small>Hecha por</small>
                  <strong>Autorización vigente, sin preguntar</strong>
                </div>
              )}
            </div>
            {ACCIONES[tarea.accion].cambia && tarea.estado === "esperando aprobación" && <Aviso tono="info">Esto cambia un archivo o sale del estudio, así que espera su aprobación. El permiso se vuelve a comprobar justo antes de hacerlo.</Aviso>}
            <div className="sec-tit">Historial</div>
            <ol className="linea">
              {tarea.historial.map((h, i) => (
                <li key={i} className={`li-${h.quien === "Código" ? "codigo" : h.quien === "Usted" ? "usted" : "sam"}`}>
                  <span className="li-quien">{h.quien}</span>
                  <div>
                    <p>{h.texto}</p>
                    <small>{cuandoFue(h.t, tick)}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Drawer>

      <NuevaTarea abierto={nueva} onCerrar={() => setNueva(false)} onCrear={async (d) => crearTarea(d)} reglasCarril={(a, o) => carrilPara(a, o, reglas)} />
      <EditarTarea tarea={editar} onCerrar={() => setEditar(null)} onGuardar={async (d) => {
          if (editar) await editarTarea(editar.id, d);
        }} />
      <Confirmar
        abierto={!!borrar}
        titulo="Quitar la tarea del panel"
        texto="Desaparece de esta lista. El registro de auditoría de lo que hizo Sam se conserva igual."
        accion="Quitar"
        cargando={ocupado === "borrar"}
        onCerrar={() => setBorrar(null)}
        onConfirmar={async () => {
          if (!borrar) return;
          await accion(() => eliminarTarea(borrar.id), "borrar");
          setBorrar(null);
          setAbierta(null);
        }}
      />
    </>
  );
}

function NuevaTarea({ abierto, onCerrar, onCrear, reglasCarril }: { abierto: boolean; onCerrar: () => void; onCrear: (d: { titulo: string; descripcion: string; proyecto: string; accion: TipoAccion; canal: Canal; origen: Origen }) => Promise<string>; reglasCarril: (a: TipoAccion, o: Origen) => Carril }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [proyecto, setProyecto] = useState(PROYECTOS[0]);
  const [accion, setAccion] = useState<TipoAccion>("resumir");
  const [origen, setOrigen] = useState<Origen>("texto-usted");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const { toast } = useStore();

  useEffect(() => {
    if (abierto) {
      setTitulo("");
      setDescripcion("");
      setError("");
    }
  }, [abierto]);

  const carril = reglasCarril(accion, origen);
  const guardar = async () => {
    if (titulo.trim().length < 4) return setError("Escriba qué tiene que hacer Sam.");
    setCargando(true);
    try {
      await onCrear({ titulo: titulo.trim(), descripcion: descripcion.trim() || titulo.trim(), proyecto, accion, canal: "panel", origen });
      toast("Tarea creada. Sam ya está con ella");
      onCerrar();
    } catch (e) {
      setError((e as Error).message);
    }
    setCargando(false);
  };

  return (
    <Modal
      abierto={abierto}
      titulo="Nueva tarea para Sam"
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <Boton cargando={cargando} onClick={guardar}>
            Crear tarea
          </Boton>
        </>
      }
    >
      <div className="form-col">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo etiqueta="Qué tiene que hacer">
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Resumir la oferta de la velería" autoFocus />
        </Campo>
        <Campo etiqueta="Detalle" ayuda="Opcional. Lo que usted le diría a alguien del estudio.">
          <textarea className="textarea" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
        <div className="form-grid">
          <Campo etiqueta="Proyecto">
            <select className="select" value={proyecto} onChange={(e) => setProyecto(e.target.value)}>
              {PROYECTOS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Tipo">
            <select className="select" value={accion} onChange={(e) => setAccion(e.target.value as TipoAccion)}>
              {(["resumir", "traducir", "redactar", "buscar", "borrador-tercero", "clasificar-correo"] as TipoAccion[]).map((a) => (
                <option key={a} value={a}>
                  {ACCIONES[a].nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo etiqueta="De dónde sale el material">
          <select className="select" value={origen} onChange={(e) => setOrigen(e.target.value as Origen)}>
            {(Object.keys(ORIGENES) as Origen[]).map((o) => (
              <option key={o} value={o}>
                {ORIGENES[o]}
              </option>
            ))}
          </select>
        </Campo>
        <div className={`ruta-previa rp-${carril}`}>
          <Badge tono={CARRILES[carril].tono}>{CARRILES[carril].nombre}</Badge>
          <span>{CARRILES[carril].texto}. Lo fija el origen, no la IA.</span>
        </div>
      </div>
    </Modal>
  );
}

function EditarTarea({ tarea, onCerrar, onGuardar }: { tarea: Tarea | null; onCerrar: () => void; onGuardar: (d: { titulo: string; descripcion: string; proyecto: string }) => Promise<void> }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (tarea) {
      setTitulo(tarea.titulo);
      setDescripcion(tarea.descripcion);
      setProyecto(tarea.proyecto);
      setError("");
    }
  }, [tarea]);
  const guardar = async () => {
    if (titulo.trim().length < 4) return setError("El título no puede quedar vacío.");
    setCargando(true);
    await onGuardar({ titulo: titulo.trim(), descripcion: descripcion.trim(), proyecto });
    setCargando(false);
    onCerrar();
  };
  return (
    <Modal
      abierto={!!tarea}
      titulo="Editar tarea"
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <Boton cargando={cargando} onClick={guardar}>
            Guardar cambios
          </Boton>
        </>
      }
    >
      <div className="form-col">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo etiqueta="Título">
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Detalle">
          <textarea className="textarea" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
        <Campo etiqueta="Proyecto">
          <select className="select" value={proyecto} onChange={(e) => setProyecto(e.target.value)}>
            {PROYECTOS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Campo>
      </div>
    </Modal>
  );
}

export default function Tareas() {
  return (
    <Suspense fallback={null}>
      <Contenido />
    </Suspense>
  );
}
