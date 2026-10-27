"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Droplets, Flame, Home, Landmark, MapPin, Pencil, Phone, Plus, Search, Shield, Trash2, Zap } from "lucide-react";
import { Aviso, Badge, Boton, Campo, Confirmar, Modal, Skel, Tilt, Vacio } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Inmueble, Suministro, TipoInmueble, TipoSuministro } from "@/lib/types";
import { norm } from "@/lib/format";

const IC: Record<TipoSuministro, typeof Zap> = { Luz: Zap, Gas: Flame, Agua: Droplets, "Teléfono e internet": Phone, Comunidad: Home, Impuestos: Landmark, Seguros: Shield };
const TIPOS: TipoInmueble[] = ["Vivienda", "Local", "Nave", "Garaje", "Oficina"];

function Contenido() {
  const sp = useSearchParams();
  const { listo, inmuebles, facturas, guardarSuministro, crearInmueble, eliminarInmueble, toast } = useStore();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"" | TipoInmueble>("");
  const [editar, setEditar] = useState<{ inm: Inmueble; s: Suministro } | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [borrar, setBorrar] = useState<Inmueble | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null);

  useEffect(() => {
    const id = sp.get("inm");
    if (id && listo) {
      setFoco(id);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    }
  }, [sp, listo]);

  const lista = useMemo(() => {
    const nq = norm(q);
    return inmuebles.filter((i) => (!tipo || i.tipo === tipo) && (!nq || norm(`${i.nombre} ${i.direccion} ${i.ciudad} ${i.suministros.map((s) => `${s.proveedor} ${s.cups ?? ""}`).join(" ")}`).includes(nq)));
  }, [inmuebles, q, tipo]);

  const cupsTotal = inmuebles.flatMap((i) => i.suministros).filter((s) => s.cups).length;
  const porCups = facturas.filter((f) => f.emparejado === "cups").length;

  const toggle = async (inm: Inmueble, s: Suministro) => {
    setOcupado(s.id);
    try {
      await guardarSuministro(inm.id, { ...s, pdfAdjunto: !s.pdfAdjunto });
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setOcupado(null);
  };

  return (
    <>
      <header className="cab-pagina fila-cab">
        <div>
          <span className="eyebrow">Inmuebles</span>
          <h1 className="tit-pagina">La lista con la que Sam sabe a qué carpeta va cada factura</h1>
          <p className="muted">
            {listo ? `${inmuebles.length} inmuebles, ${cupsTotal} suministros de luz y gas con su CUPS, ${porCups} facturas emparejadas por él sin una sola duda.` : "Cargando la lista..."}
          </p>
        </div>
        <Boton icono={<Plus size={17} />} onClick={() => setNuevo(true)} disabled={!listo}>
          Añadir inmueble
        </Boton>
      </header>

      <div className="toolbar">
        <label className="buscar">
          <Search size={16} />
          <input className="input" placeholder="Dirección, proveedor o CUPS" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar inmuebles" />
        </label>
        <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoInmueble | "")} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {!listo ? (
        <div className="inm-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card">
              <Skel alto={170} />
              <Skel alto={18} ancho="60%" className="mt" />
              <Skel alto={14} ancho="80%" className="mt" />
            </div>
          ))}
        </div>
      ) : lista.length === 0 ? (
        <Vacio icono={<Building2 size={22} />} titulo="Ningún inmueble coincide" texto="Pruebe con otra dirección o quite el filtro." />
      ) : (
        <div className="inm-grid">
          {lista.map((i, k) => {
            const pendientes = facturas.filter((f) => f.inmuebleId === i.id && f.estado !== "archivada" && f.estado !== "duplicada").length;
            return (
              <article key={i.id} id={i.id} className={`card inm ${foco === i.id ? "foco" : ""}`} style={{ animationDelay: `${k * 50}ms` }}>
                <Tilt className="inm-foto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.foto} alt={`Fachada de ${i.nombre}`} width={520} height={300} loading="lazy" />
                  <span className="inm-cod mono">{i.codigo}</span>
                  <span className="inm-tipo">{i.tipo}</span>
                </Tilt>
                <div className="inm-cab">
                  <div>
                    <h3>{i.nombre}</h3>
                    <small>
                      <MapPin size={13} /> {i.direccion}, {i.ciudad}
                    </small>
                  </div>
                  <button className="icon-btn sm" aria-label={`Quitar ${i.nombre}`} onClick={() => setBorrar(i)}>
                    <Trash2 size={15} />
                  </button>
                </div>
                {pendientes > 0 && <Badge tono="acento">{pendientes === 1 ? "1 factura pendiente" : `${pendientes} facturas pendientes`}</Badge>}
                <ul className="sums">
                  {i.suministros.map((s) => {
                    const Ic = IC[s.tipo];
                    return (
                      <li key={s.id} className="sum">
                        <span className="sum-ic">
                          <Ic size={15} />
                        </span>
                        <div className="sum-txt">
                          <strong>
                            {s.tipo} · {s.proveedor}
                          </strong>
                          {s.cups ? <small className="mono cups">CUPS {s.cups}</small> : <small className="mono muted">Contrato {s.contrato}</small>}
                          {s.tipo === "Teléfono e internet" && (
                            <label className="sum-pdf">
                              <input type="checkbox" className="switch" checked={s.pdfAdjunto} disabled={ocupado === s.id} onChange={() => toggle(i, s)} />
                              <span>{s.pdfAdjunto ? "Llega con PDF adjunto" : "Solo manda un aviso con enlace"}</span>
                            </label>
                          )}
                        </div>
                        <button className="icon-btn sm" aria-label={`Editar ${s.tipo} de ${i.nombre}`} onClick={() => setEditar({ inm: i, s })}>
                          <Pencil size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      )}

      <EditarSuministro
        dato={editar}
        onCerrar={() => setEditar(null)}
        onGuardar={async (s) => {
          if (editar) await guardarSuministro(editar.inm.id, s);
        }}
      />
      <NuevoInmueble abierto={nuevo} onCerrar={() => setNuevo(false)} onCrear={crearInmueble} />
      <Confirmar
        abierto={!!borrar}
        titulo="Quitar inmueble de la lista"
        texto={`Sam dejará de emparejar facturas con ${borrar?.nombre ?? ""}. Lo ya archivado sigue en su carpeta.`}
        accion="Quitar"
        cargando={ocupado === "borrar"}
        onCerrar={() => setBorrar(null)}
        onConfirmar={async () => {
          if (!borrar) return;
          setOcupado("borrar");
          try {
            await eliminarInmueble(borrar.id);
            setBorrar(null);
          } catch (e) {
            toast((e as Error).message, "error");
          }
          setOcupado(null);
        }}
      />
    </>
  );
}

function EditarSuministro({ dato, onCerrar, onGuardar }: { dato: { inm: Inmueble; s: Suministro } | null; onCerrar: () => void; onGuardar: (s: Suministro) => Promise<void> }) {
  const [proveedor, setProveedor] = useState("");
  const [cups, setCups] = useState("");
  const [contrato, setContrato] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  useEffect(() => {
    if (dato) {
      setProveedor(dato.s.proveedor);
      setCups(dato.s.cups ?? "");
      setContrato(dato.s.contrato);
      setError("");
    }
  }, [dato]);
  const conCups = dato?.s.tipo === "Luz" || dato?.s.tipo === "Gas";
  const guardar = async () => {
    if (!dato) return;
    setCargando(true);
    try {
      await onGuardar({ ...dato.s, proveedor: proveedor.trim() || dato.s.proveedor, cups: conCups ? cups.trim().toUpperCase() : undefined, contrato: contrato.trim() });
      onCerrar();
    } catch (e) {
      setError((e as Error).message);
    }
    setCargando(false);
  };
  return (
    <Modal
      abierto={!!dato}
      titulo={dato ? `${dato.s.tipo} · ${dato.inm.nombre}` : ""}
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <Boton cargando={cargando} onClick={guardar}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="form-col">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo etiqueta="Proveedor" ayuda={conCups ? "Si cambia de comercializadora, el CUPS sigue siendo el mismo." : undefined}>
          <input className="input" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
        </Campo>
        {conCups && (
          <Campo etiqueta="CUPS" ayuda="Viene en cualquier factura de luz o gas: ES, 16 cifras y 2 letras.">
            <input className="input mono" value={cups} onChange={(e) => setCups(e.target.value)} placeholder="ES0021000000000000XX" />
          </Campo>
        )}
        <Campo etiqueta="Número de contrato">
          <input className="input mono" value={contrato} onChange={(e) => setContrato(e.target.value)} />
        </Campo>
      </div>
    </Modal>
  );
}

function NuevoInmueble({ abierto, onCerrar, onCrear }: { abierto: boolean; onCerrar: () => void; onCrear: (d: { nombre: string; direccion: string; ciudad: string; tipo: TipoInmueble; cupsLuz?: string; proveedorLuz?: string }) => Promise<void> }) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [tipo, setTipo] = useState<TipoInmueble>("Vivienda");
  const [cups, setCups] = useState("");
  const [prov, setProv] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  useEffect(() => {
    if (abierto) {
      setNombre("");
      setDireccion("");
      setCiudad("");
      setCups("");
      setProv("");
      setError("");
    }
  }, [abierto]);
  const crear = async () => {
    if (nombre.trim().length < 3 || direccion.trim().length < 5) return setError("Ponga al menos un nombre corto y la dirección.");
    setCargando(true);
    try {
      await onCrear({ nombre: nombre.trim(), direccion: direccion.trim(), ciudad: ciudad.trim() || "Madrid", tipo, cupsLuz: cups.trim().toUpperCase() || undefined, proveedorLuz: prov.trim() || undefined });
      onCerrar();
    } catch (e) {
      setError((e as Error).message);
    }
    setCargando(false);
  };
  return (
    <Modal
      abierto={abierto}
      titulo="Añadir inmueble"
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <Boton cargando={cargando} onClick={crear}>
            Añadir
          </Boton>
        </>
      }
    >
      <div className="form-col">
        {error && <Aviso tono="error">{error}</Aviso>}
        <div className="form-grid">
          <Campo etiqueta="Nombre corto">
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Goya 40, 3º B" autoFocus />
          </Campo>
          <Campo etiqueta="Tipo">
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoInmueble)}>
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Dirección">
          <input className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle de Goya, 40, 3º B" />
        </Campo>
        <Campo etiqueta="Código postal y ciudad">
          <input className="input" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="28001 Madrid" />
        </Campo>
        <div className="form-grid">
          <Campo etiqueta="Comercializadora de luz" ayuda="Opcional">
            <input className="input" value={prov} onChange={(e) => setProv(e.target.value)} />
          </Campo>
          <Campo etiqueta="CUPS de la luz" ayuda="Opcional, pero ahorra dudas">
            <input className="input mono" value={cups} onChange={(e) => setCups(e.target.value)} placeholder="ES0021..." />
          </Campo>
        </div>
      </div>
    </Modal>
  );
}

export default function Inmuebles() {
  return (
    <Suspense fallback={null}>
      <Contenido />
    </Suspense>
  );
}
