"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Cpu, FileText, Lock, Play, Search, ShieldCheck } from "lucide-react";
import { Canal } from "@/components/three/Scenes";
import type { Viaje } from "@/components/three/Canal";
import { Badge, Paginacion, Skel, Vacio } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CARRILES, ORIGENES, SERVICIOS } from "@/lib/ruta";
import type { Carril, Origen, ServicioId } from "@/lib/types";
import { cuandoFue, minus, norm } from "@/lib/format";

interface Muestra {
  id: string;
  nombre: string;
  origen: Origen;
  paginas: number;
  dentro: string;
  /** lo que diría una IA que solo lee las primeras páginas para clasificar */
  iaDiria: Carril;
  iaLee: string;
  soloReglas?: boolean;
}

const MUESTRAS: Muestra[] = [
  { id: "luz", nombre: "Factura de luz · Velázquez 112", origen: "factura-proveedor", paginas: 4, dentro: "Página 3: copia de la escritura del piso, con nombres y DNI.", iaDiria: "general", iaLee: "Lee las páginas 1 y 2 para ahorrar: importe, consumo, dirección. Concluye: sin datos personales." },
  { id: "plano", nombre: "Plano de formas · Altair rev. 4", origen: "plano-armador", paginas: 2, dentro: "Ningún dato personal, pero es el casco de un armador.", iaDiria: "general", iaLee: "Busca nombres, DNI y teléfonos. No encuentra ninguno. Concluye: sin datos personales." },
  { id: "presupuesto", nombre: "Presupuesto del astillero", origen: "adjunto-tercero", paginas: 3, dentro: "Precios, plazos y la firma de la jefa de obra.", iaDiria: "ue", iaLee: "Ve una firma con nombre en la página 1. Concluye: lleva datos personales." },
  { id: "poliza", nombre: "Póliza del seguro del garaje", origen: "sharepoint", paginas: 6, dentro: "Datos del tomador en la página 1.", iaDiria: "ue", iaLee: "Ve los datos del tomador en la página 1. Concluye: lleva datos personales." },
  { id: "emparejar", nombre: "Emparejar una factura con su inmueble", origen: "factura-proveedor", paginas: 0, dentro: "CUPS y contrato contra la lista de inmuebles.", iaDiria: "reglas", iaLee: "No hace falta ninguna IA: es una comparación exacta.", soloReglas: true },
  { id: "parrafo", nombre: "Párrafo suyo para la web", origen: "texto-usted", paginas: 0, dentro: "Texto que usted escribe en el mensaje, sin adjuntos.", iaDiria: "general", iaLee: "Texto corto sin adjuntos. Concluye: sin datos personales." },
  { id: "ferry", nombre: "Horario del ferry a Palma", origen: "publico", paginas: 0, dentro: "Información pública.", iaDiria: "general", iaLee: "Consulta pública. Concluye: sin datos personales." },
];

const ICONO_SERV: Record<ServicioId, typeof Cpu> = { "gpt-ue": ShieldCheck, "lectura-ue": FileText, claude: Bot, busqueda: Search, reglas: Cpu };

export default function Ruta() {
  const { listo, reglas, cambiarRegla, operaciones, tick, toast } = useStore();
  const [sel, setSel] = useState<Muestra>(MUESTRAS[0]);
  const [modo, setModo] = useState<"origen" | "ia">("origen");
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [paso, setPaso] = useState(-1);
  const [resultado, setResultado] = useState<null | { carril: Carril; riesgo: boolean; muestra: Muestra; modo: "origen" | "ia" }>(null);
  const [fCarril, setFCarril] = useState<"" | Carril>("");
  const [fServ, setFServ] = useState<"" | ServicioId>("");
  const [q, setQ] = useState("");
  const [pag, setPag] = useState(1);
  const [cambiando, setCambiando] = useState<string | null>(null);

  const carrilSam = (m: Muestra): Carril => (m.soloReglas ? "reglas" : reglas.find((r) => r.origen === m.origen)?.carril ?? "ue");
  const sensible = (m: Muestra) => carrilSam(m) === "ue";

  const pasos = useMemo(() => {
    if (modo === "origen")
      return [
        { t: "Llega", d: `${sel.nombre}${sel.paginas ? `, ${sel.paginas} páginas` : ""}` },
        { t: "El código mira el origen", d: `${ORIGENES[sel.origen]}. Sin abrir el documento.` },
        { t: "Carril fijado", d: sel.soloReglas ? "Se resuelve con una regla. Ninguna IA lo ve." : `${CARRILES[carrilSam(sel)].nombre}. ${CARRILES[carrilSam(sel)].texto}.` },
        { t: "La IA del carril propone", d: sel.soloReglas ? "No hay IA en este paso." : `Solo la IA de ese carril lo lee entero y devuelve una propuesta en formato fijo.` },
        { t: "El código comprueba y actúa", d: "Lista cerrada de acciones, permiso vigente y parada, justo antes de hacer nada." },
      ];
    return [
      { t: "Llega", d: `${sel.nombre}${sel.paginas ? `, ${sel.paginas} páginas` : ""}` },
      { t: "Una IA lo abre para clasificarlo", d: sel.iaLee },
      { t: "La IA elige el carril", d: `${CARRILES[sel.iaDiria].nombre}.` },
      { t: "La IA de ese carril lo procesa", d: sel.iaDiria === "general" && sensible(sel) ? "El documento entero viaja a un servicio que su regla dejaba fuera." : "Lo procesa entero." },
      { t: "Resultado", d: sel.iaDiria === carrilSam(sel) ? "Esta vez acertó." : "El error ya no tiene vuelta atrás: lo ha leído quien no debía." },
    ];
  }, [modo, sel, reglas]);

  const lanzar = () => {
    const carril = modo === "origen" ? carrilSam(sel) : sel.iaDiria;
    const riesgo = modo === "ia" && sel.iaDiria !== carrilSam(sel) && sensible(sel);
    setViaje({ id: Date.now(), carril, riesgo });
    setResultado(null);
    setPaso(0);
    [1, 2, 3, 4].forEach((i) => setTimeout(() => setPaso(i), i * 820));
    setTimeout(() => setResultado({ carril, riesgo, muestra: sel, modo }), 4300);
  };

  const filtradas = useMemo(() => {
    const nq = norm(q);
    return operaciones.filter((o) => (!fCarril || o.carril === fCarril) && (!fServ || o.servicio === fServ) && (!nq || norm(`${o.tareaRef} ${o.decision} ${ORIGENES[o.origen]}`).includes(nq)));
  }, [operaciones, fCarril, fServ, q]);
  const POR = 10;
  const pagina = filtradas.slice((pag - 1) * POR, pag * POR);

  const regla = async (origen: Origen, carril: Carril) => {
    setCambiando(origen);
    try {
      await cambiarRegla(origen, carril);
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setCambiando(null);
  };

  return (
    <>
      <header className="cab-pagina">
        <span className="eyebrow">Ruta de IA</span>
        <h1 className="tit-pagina">Quién puede leer cada cosa lo decide el código, antes de que la abra nadie</h1>
        <p className="muted">Para saber si un documento lleva datos personales hay que leerlo, y si lo lee una IA ya lo ha visto. Por eso Sam fija el carril por el origen. Pruébelo con un documento.</p>
      </header>

      <section className="card sim">
        <div className="sim-escena">
          <Canal viaje={viaje} />
          <div className="sim-leyenda">
            {(["ue", "general", "reglas"] as const).map((c) => (
              <span key={c} className={`hc hc-${c}`}>
                <i />
                {CARRILES[c].nombre}
              </span>
            ))}
          </div>
        </div>
        <div className="sim-panel">
          <div className="sim-col">
          <div className="sec-tit">1. Elija un documento</div>
          <div className="muestras" role="radiogroup" aria-label="Documento de prueba">
            {MUESTRAS.map((m) => (
              <button key={m.id} role="radio" aria-checked={sel.id === m.id} className={`muestra ${sel.id === m.id ? "on" : ""}`} onClick={() => setSel(m)}>
                <strong>{m.nombre}</strong>
                <small>{m.dentro}</small>
              </button>
            ))}
          </div>
          <div className="sec-tit">2. Quién decide el carril</div>
          <div className="modo" role="radiogroup" aria-label="Quién decide">
            <button role="radio" aria-checked={modo === "origen"} className={`modo-op ${modo === "origen" ? "on" : ""}`} onClick={() => setModo("origen")}>
              <Cpu size={16} /> Sam, por el origen
            </button>
            <button role="radio" aria-checked={modo === "ia"} className={`modo-op ${modo === "ia" ? "on rojo" : ""}`} onClick={() => setModo("ia")}>
              <Bot size={16} /> Una IA, leyendo
            </button>
          </div>
          <button className="btn btn-primario ancho" onClick={lanzar} disabled={paso >= 0 && paso < 4 && !resultado}>
            <Play size={16} /> <span>Enviar a Sam</span>
          </button>
          </div>
          <div className="sim-col">
          <div className="sec-tit">3. Lo que pasa</div>
          <ol className="pasos-sim">
            {pasos.map((p, i) => (
              <li key={p.t} className={`${paso >= i ? "on" : ""} ${modo === "ia" && i >= 1 && paso >= i ? "ia" : ""}`}>
                <span className="ps-n">{i + 1}</span>
                <div>
                  <strong>{p.t}</strong>
                  <small>{p.d}</small>
                </div>
              </li>
            ))}
          </ol>
          {resultado && (
            <div className={`resultado ${resultado.riesgo ? "r-mal" : "r-bien"}`} role="status">
              {resultado.riesgo ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              <div>
                <strong>{resultado.riesgo ? `Ha acabado en el ${minus(CARRILES[resultado.carril].nombre)}` : `Ha llegado a ${CARRILES[resultado.carril].nombre}`}</strong>
                <p>
                  {resultado.riesgo
                    ? resultado.muestra.id === "luz"
                      ? "La IA leyó dos páginas y dijo que no había datos personales. La escritura de la página 3 ya ha salido del carril UE."
                      : "No había datos personales, así que la IA lo dejó pasar. Pero era el plano de un armador, y ya ha salido del carril UE."
                    : resultado.modo === "origen"
                      ? resultado.carril === "ue"
                        ? "El documento entero se quedó en la UE. Nadie tuvo que leerlo para decidirlo."
                        : resultado.carril === "reglas"
                          ? "Ninguna IA lo ha visto: una regla exacta basta."
                          : "Texto limpio o público: puede ir al carril general sin riesgo."
                      : "Esta vez la IA acertó. El problema es que no siempre lee la página que importa."}
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </section>

      <div className="grid g-2">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Reglas de origen</h2>
              <p>Las fijas no se pueden cambiar desde aquí. Las demás, sí, y Sam las aplica desde el siguiente documento.</p>
            </div>
          </div>
          <ul className="reglas">
            {reglas.map((r) => (
              <li key={r.origen} className="regla">
                <div className="regla-txt">
                  <strong>{r.nombre}</strong>
                  <small>{r.descripcion}</small>
                </div>
                {r.fija ? (
                  <span className="regla-fija">
                    <Lock size={13} /> <Badge tono={CARRILES[r.carril].tono}>{CARRILES[r.carril].corto}</Badge>
                  </span>
                ) : (
                  <select className="select regla-sel" value={r.carril} disabled={cambiando === r.origen} onChange={(e) => regla(r.origen, e.target.value as Carril)} aria-label={`Carril para ${r.nombre}`}>
                    <option value="ue">Carril UE</option>
                    <option value="general">Carril general</option>
                  </select>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Servicios conectados</h2>
              <p>Todos desde las cuentas de Microsoft 365 y Azure del estudio. Si el principal cae, el respaldo cumple las mismas reglas.</p>
            </div>
          </div>
          <ul className="servicios">
            {Object.values(SERVICIOS).map((s) => {
              const Ic = ICONO_SERV[s.id];
              const n = operaciones.filter((o) => o.servicio === s.id).length;
              return (
                <li key={s.id} className={`serv serv-${s.carril}`}>
                  <span className="serv-ic">
                    <Ic size={18} />
                  </span>
                  <div>
                    <strong>{s.nombre}</strong>
                    <small>{s.para}</small>
                    <small className="muted">{s.donde}</small>
                  </div>
                  <span className="serv-n mono">{listo ? n : "·"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Registro de operaciones de IA</h2>
            <p>Cada operación con su servicio, su carril, la versión de las instrucciones y lo que decidió el código.</p>
          </div>
        </div>
        <div className="toolbar">
          <label className="buscar">
            <Search size={16} />
            <input className="input" placeholder="Buscar por tarea o decisión" value={q} onChange={(e) => (setQ(e.target.value), setPag(1))} aria-label="Buscar en el registro" />
          </label>
          <select className="select" value={fCarril} onChange={(e) => (setFCarril(e.target.value as Carril | ""), setPag(1))} aria-label="Filtrar por carril">
            <option value="">Todos los carriles</option>
            <option value="ue">Carril UE</option>
            <option value="general">Carril general</option>
            <option value="reglas">Sin IA</option>
          </select>
          <select className="select" value={fServ} onChange={(e) => (setFServ(e.target.value as ServicioId | ""), setPag(1))} aria-label="Filtrar por servicio">
            <option value="">Todos los servicios</option>
            {Object.values(SERVICIOS).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        {!listo ? (
          <div className="form-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skel key={i} alto={44} />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <Vacio icono={<Search size={22} />} titulo="Sin operaciones" texto="Ninguna operación coincide con esos filtros." />
        ) : (
          <div className="tabla">
            <div className="t-fila t-head t-ops">
              <span>Hora</span>
              <span>Tarea</span>
              <span>Servicio</span>
              <span>Decisión</span>
              <span>Resultado</span>
            </div>
            {pagina.map((o) => (
              <div key={o.id} className="t-fila t-ops">
                <span className="muted">{cuandoFue(o.t, tick)}</span>
                <span className="mono">{o.tareaRef}</span>
                <span>
                  <Badge tono={CARRILES[o.carril].tono}>{CARRILES[o.carril].corto}</Badge> {SERVICIOS[o.servicio].nombre}
                </span>
                <span className="t-dec">
                  {o.decision}
                  <small className="muted"> · {ORIGENES[o.origen]} · {o.version}</small>
                </span>
                <span>
                  <Badge tono={o.resultado === "propuesta válida" ? "ok" : o.resultado === "a revisión" ? "aviso" : o.resultado === "servicio de respaldo" ? "info" : "error"}>{o.resultado}</Badge>
                </span>
              </div>
            ))}
          </div>
        )}
        <Paginacion pagina={pag} total={filtradas.length} porPagina={POR} onCambio={setPag} />
      </section>
    </>
  );
}
