"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Download, Droplets, Flame, FolderOpen, Home, Inbox, Landmark, Link2Off, PenLine, Phone, Search, Shield, Zap, X } from "lucide-react";
import { Aviso, Badge, Boton, Campo, Drawer, Modal, Paginacion, Skel, Vacio } from "@/components/ui";
import { useStore } from "@/lib/store";
import { TONO_FACTURA } from "@/lib/estados";
import { rutaArchivo } from "@/lib/mock/facturas";
import type { EstadoFactura, Factura, TipoSuministro } from "@/lib/types";
import { cuandoFue, eur, fechaCorta, norm } from "@/lib/format";

const IC: Record<TipoSuministro, typeof Zap> = { Luz: Zap, Gas: Flame, Agua: Droplets, "Teléfono e internet": Phone, Comunidad: Home, Impuestos: Landmark, Seguros: Shield };

const PESTANAS: { id: string; texto: string; estados?: EstadoFactura[] }[] = [
  { id: "aprobar", texto: "Para aprobar", estados: ["esperando aprobación"] },
  { id: "revision", texto: "En revisión", estados: ["en revisión"] },
  { id: "avisos", texto: "Avisos sin factura", estados: ["aviso sin factura"] },
  { id: "archivadas", texto: "Archivadas", estados: ["archivada"] },
  { id: "duplicadas", texto: "Duplicadas", estados: ["duplicada"] },
  { id: "todas", texto: "Todas" },
];

const EMPAREJADO: Record<string, string> = { cups: "por CUPS", contrato: "por contrato", "dirección": "por dirección", manual: "corregido por usted" };

export default function Facturas() {
  const { listo, facturas, inmuebles, tareas, tick, aprobar, rechazar, corregirInmueble, resolverAviso, llegaFactura, parada, toast } = useStore();
  const [pestana, setPestana] = useState("aprobar");
  const [q, setQ] = useState("");
  const [inm, setInm] = useState("");
  const [tipo, setTipo] = useState<"" | TipoSuministro>("");
  const [pag, setPag] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [corregir, setCorregir] = useState<Factura | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [llegando, setLlegando] = useState(false);

  const porId = useMemo(() => new Map(inmuebles.map((i) => [i.id, i])), [inmuebles]);
  const filtradas = useMemo(() => {
    const p = PESTANAS.find((x) => x.id === pestana);
    const nq = norm(q);
    return facturas.filter((f) => (!p?.estados || p.estados.includes(f.estado)) && (!inm || f.inmuebleId === inm) && (!tipo || f.tipo === tipo) && (!nq || norm(`${f.proveedor} ${f.numero} ${f.cups ?? ""} ${f.direccionTexto}`).includes(nq)));
  }, [facturas, pestana, q, inm, tipo]);
  const POR = 10;
  const pagina = filtradas.slice((pag - 1) * POR, pag * POR);
  const factura = facturas.find((f) => f.id === abierta);
  const tarea = factura ? tareas.find((t) => t.id === factura.tareaId) : undefined;

  // la misma vivienda, escrita de tres maneras en sus facturas
  const ejemplo = useMemo(() => {
    const fs = facturas.filter((f) => f.inmuebleId === "inm-01" && f.cups && (f.tipo === "Luz" || f.tipo === "Gas"));
    return { textos: Array.from(new Set(fs.map((f) => f.direccionTexto))).slice(0, 3), cups: fs.find((f) => f.tipo === "Luz")?.cups };
  }, [facturas]);

  const accion = async (fn: () => Promise<void>, id: string) => {
    setOcupado(id);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setOcupado(null);
  };

  const nueva = async () => {
    setLlegando(true);
    try {
      await llegaFactura();
      setPestana("aprobar");
      setPag(1);
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setLlegando(false);
  };

  return (
    <>
      <header className="cab-pagina fila-cab">
        <div>
          <span className="eyebrow">Facturas de inmuebles</span>
          <h1 className="tit-pagina">Cada factura en la carpeta de su inmueble, y ninguna archivada a ciegas</h1>
        </div>
        <Boton tono="secundario" icono={<Inbox size={17} />} cargando={llegando} onClick={nueva} disabled={!listo || parada.activa}>
          Simular que llega una
        </Boton>
      </header>

      <div className="grid g-fact">
        <section className="card">
          <div className="tabs tabs-scroll" role="tablist">
            {PESTANAS.map((p) => {
              const n = p.estados ? facturas.filter((f) => p.estados!.includes(f.estado)).length : facturas.length;
              return (
                <button key={p.id} role="tab" aria-selected={pestana === p.id} className={`tab ${pestana === p.id ? "on" : ""} ${p.id === "avisos" ? "tab-rojo" : ""}`} onClick={() => (setPestana(p.id), setPag(1))}>
                  {p.texto} {listo && <em className="tab-n">{n}</em>}
                </button>
              );
            })}
          </div>
          <div className="toolbar">
            <label className="buscar">
              <Search size={16} />
              <input className="input" placeholder="Proveedor, número o CUPS" value={q} onChange={(e) => (setQ(e.target.value), setPag(1))} aria-label="Buscar facturas" />
            </label>
            <select className="select" value={inm} onChange={(e) => (setInm(e.target.value), setPag(1))} aria-label="Filtrar por inmueble">
              <option value="">Todos los inmuebles</option>
              {inmuebles.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
            <select className="select" value={tipo} onChange={(e) => (setTipo(e.target.value as TipoSuministro | ""), setPag(1))} aria-label="Filtrar por tipo">
              <option value="">Todos los tipos</option>
              {(Object.keys(IC) as TipoSuministro[]).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          {!listo ? (
            <div className="form-col">
              {Array.from({ length: 6 }, (_, i) => (
                <Skel key={i} alto={78} />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <Vacio icono={<FolderOpen size={22} />} titulo={pestana === "aprobar" ? "Nada para aprobar" : "Sin facturas aquí"} texto={pestana === "aprobar" ? "Cuando llegue una factura que Sam no puede archivar solo, aparecerá aquí." : "Ninguna factura coincide con esos filtros."} />
          ) : (
            <ul className="facturas">
              {pagina.map((f, i) => {
                const Ic = IC[f.tipo];
                const im = f.inmuebleId ? porId.get(f.inmuebleId) : undefined;
                return (
                  <li key={f.id} className={`fac fac-${f.estado.replace(/\s/g, "-")}`} style={{ animationDelay: `${i * 30}ms` }}>
                    <button className="fac-main" onClick={() => setAbierta(f.id)}>
                      <span className={`fac-ic fi-${f.tipo === "Luz" ? "luz" : f.tipo === "Gas" ? "gas" : f.tipo === "Agua" ? "agua" : "otro"}`}>
                        <Ic size={18} />
                      </span>
                      <span className="fac-txt">
                        <strong>
                          {f.proveedor} · {f.tipo}
                        </strong>
                        <small>
                          {im ? im.nombre : "Sin inmueble"}
                          {f.emparejado && im && <em className={`emp emp-${f.emparejado}`}>{EMPAREJADO[f.emparejado]}</em>}
                        </small>
                        <small className="fac-dir">Escrita en la factura: &quot;{f.direccionTexto}&quot;</small>
                      </span>
                      <span className="fac-der">
                        <strong className="mono">{f.estado === "aviso sin factura" ? "Sin PDF" : eur(f.importe)}</strong>
                        <Badge tono={TONO_FACTURA[f.estado]}>{f.estado}</Badge>
                        <small className="muted">{cuandoFue(f.recibida, tick)}</small>
                      </span>
                    </button>
                    {f.estado === "esperando aprobación" && f.tareaId && (
                      <div className="fac-acc">
                        <Boton className="btn-sm" icono={<Check size={15} />} cargando={ocupado === f.id + "a"} disabled={parada.activa} onClick={() => accion(() => aprobar(f.tareaId!), f.id + "a")}>
                          Aprobar archivo
                        </Boton>
                        <Boton className="btn-sm" tono="secundario" icono={<PenLine size={15} />} onClick={() => setCorregir(f)} disabled={parada.activa}>
                          Otro inmueble
                        </Boton>
                        <Boton className="btn-sm" tono="ghost" icono={<X size={15} />} cargando={ocupado === f.id + "r"} onClick={() => accion(() => rechazar(f.tareaId!), f.id + "r")}>
                          Rechazar
                        </Boton>
                        {im && <small className="fac-ruta">Irá a: {rutaArchivo(im, f)}</small>}
                      </div>
                    )}
                    {f.estado === "en revisión" && (
                      <div className="fac-acc">
                        <small className="fac-motivo">{f.motivo}</small>
                        <Boton className="btn-sm" tono="secundario" icono={<PenLine size={15} />} onClick={() => setCorregir(f)} disabled={parada.activa}>
                          Asignar inmueble y archivar
                        </Boton>
                      </div>
                    )}
                    {f.estado === "aviso sin factura" && (
                      <div className="fac-acc">
                        <small className="fac-motivo">
                          <Link2Off size={14} /> {f.motivo}
                        </small>
                        <Boton className="btn-sm" tono="secundario" icono={<Download size={15} />} cargando={ocupado === f.id + "d"} disabled={parada.activa} onClick={() => accion(() => resolverAviso(f.id), f.id + "d")}>
                          Ya la he descargado
                        </Boton>
                        <Link className="enlace" href={`/inmuebles?inm=${f.inmuebleId}`}>
                          Pasar este suministro a PDF adjunto
                        </Link>
                      </div>
                    )}
                    {f.estado === "duplicada" && (
                      <div className="fac-acc">
                        <small className="fac-motivo">{f.motivo}</small>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Paginacion pagina={pag} total={filtradas.length} porPagina={POR} onCambio={setPag} />
        </section>

        <aside className="card cups-card">
          <span className="eyebrow">Por qué el CUPS</span>
          <h2 className="h3">La misma vivienda, escrita de tres maneras</h2>
          <p className="muted">Así llegó Velázquez 112 en sus propias facturas. Emparejar por dirección es adivinar.</p>
          <ul className="variantes">
            {!listo
              ? [0, 1, 2].map((i) => (
                  <li key={i}>
                    <Skel alto={20} />
                  </li>
                ))
              : ejemplo.textos.map((t) => (
                  <li key={t} className="mono">
                    {t}
                  </li>
                ))}
          </ul>
          <div className="cups-fijo">
            <small>CUPS de la luz, en todas</small>
            <strong className="mono">{ejemplo.cups ?? "..."}</strong>
          </div>
          <p className="muted">
            El número de contrato cambia cada vez que se cambia de comercializadora. El CUPS es del punto de suministro y no cambia nunca, así que Sam empareja la luz y el gas por él. El agua y el teléfono no tienen CUPS: ahí Sam usa el contrato y, si duda, se lo pregunta.
          </p>
          <Link className="enlace" href="/inmuebles">
            Ver los CUPS de cada inmueble
          </Link>
        </aside>
      </div>

      <Drawer
        abierto={!!factura}
        titulo={factura ? `${factura.proveedor} · ${factura.tipo}` : ""}
        sub={factura && <Badge tono={TONO_FACTURA[factura.estado]}>{factura.estado}</Badge>}
        onCerrar={() => setAbierta(null)}
      >
        {factura && (
          <div className="form-col">
            {factura.motivo && <Aviso tono={factura.estado === "archivada" ? "ok" : factura.estado === "esperando aprobación" ? "info" : "aviso"}>{factura.motivo}</Aviso>}
            <div className="datos">
              <div className="dato">
                <small>Número</small>
                <strong className="mono">{factura.numero}</strong>
              </div>
              <div className="dato">
                <small>Importe</small>
                <strong className="mono">{factura.paginas ? eur(factura.importe) : "Sin PDF"}</strong>
              </div>
              <div className="dato">
                <small>Emitida</small>
                <strong>{fechaCorta(factura.emision)}</strong>
              </div>
              <div className="dato">
                <small>Periodo</small>
                <strong>{factura.periodo}</strong>
              </div>
              {factura.cups && (
                <div className="dato ancho">
                  <small>CUPS</small>
                  <strong className="mono">{factura.cups}</strong>
                </div>
              )}
              <div className="dato">
                <small>Contrato</small>
                <strong className="mono">{factura.contrato ?? "No consta"}</strong>
              </div>
              <div className="dato">
                <small>Inmueble</small>
                <strong>
                  {factura.inmuebleId ? porId.get(factura.inmuebleId)?.nombre : "Sin asignar"} {factura.emparejado && <em className={`emp emp-${factura.emparejado}`}>{EMPAREJADO[factura.emparejado]}</em>}
                </strong>
              </div>
              <div className="dato ancho">
                <small>Dirección tal y como viene</small>
                <strong className="mono">{factura.direccionTexto}</strong>
              </div>
              {factura.ruta && (
                <div className="dato ancho">
                  <small>Archivada en SharePoint</small>
                  <strong className="ruta-sp">{factura.ruta}</strong>
                </div>
              )}
            </div>
            {tarea && (
              <>
                <div className="sec-tit">
                  Lo que hizo Sam · <span className="mono">{tarea.ref}</span>
                </div>
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
              </>
            )}
          </div>
        )}
      </Drawer>

      <Corregir factura={corregir} onCerrar={() => setCorregir(null)} onGuardar={(id) => accion(() => corregirInmueble(corregir!.id, id), "corr")} />
    </>
  );
}

function Corregir({ factura, onCerrar, onGuardar }: { factura: Factura | null; onCerrar: () => void; onGuardar: (inmuebleId: string) => Promise<void> }) {
  const { inmuebles } = useStore();
  const [sel, setSel] = useState("");
  const [cargando, setCargando] = useState(false);
  const opciones = inmuebles.filter((i) => i.suministros.some((s) => s.tipo === factura?.tipo));
  return (
    <Modal
      abierto={!!factura}
      titulo="¿A qué inmueble va?"
      onCerrar={onCerrar}
      ancho={500}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <Boton
            cargando={cargando}
            disabled={!sel}
            onClick={async () => {
              setCargando(true);
              await onGuardar(sel);
              setCargando(false);
              setSel("");
              onCerrar();
            }}
          >
            Corregir y archivar
          </Boton>
        </>
      }
    >
      {factura && (
        <div className="form-col">
          <p className="muted">
            {factura.proveedor}, {factura.tipo.toLowerCase()}, escrita para &quot;{factura.direccionTexto}&quot;. Sam recordará la corrección para las próximas facturas de este contrato.
          </p>
          <Campo etiqueta="Inmueble">
            <select className="select" value={sel} onChange={(e) => setSel(e.target.value)}>
              <option value="">Elija un inmueble</option>
              {(opciones.length ? opciones : inmuebles).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.codigo} · {i.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      )}
    </Modal>
  );
}
