"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, CheckCheck, Clock3, Hourglass, ReceiptText, Route, X } from "lucide-react";
import { Casco } from "@/components/three/Scenes";
import { Conversacion } from "@/components/Conversacion";
import { Badge, Skel, Tilt, Vacio } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CARRILES, SERVICIOS } from "@/lib/ruta";
import { FOTOS } from "@/lib/photos";
import { cuandoFue, haceCuanto, horaMadrid } from "@/lib/format";

const PROYECTOS_FOTO = [
  { nombre: "Altair 38 m · velero", foto: FOTOS.velero, texto: "Ensayos de canal y prueba de mar" },
  { nombre: "Nereida 52 m · motor", foto: FOTOS.plano, texto: "Interiores y planos de formas" },
  { nombre: "Bruma 28 m · refit", foto: FOTOS.astillero, texto: "Varada y pintura" },
  { nombre: "Levante 62 m · concepto", foto: FOTOS.marina, texto: "Contrato y confidencialidad" },
];

export default function Inicio() {
  const { listo, tareas, facturas, operaciones, tick, parada, aprobar, rechazar, toast } = useStore();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const pendientes = tareas.filter((t) => t.estado === "esperando aprobación");
  const semana = tick - 7 * 86400e3;
  const kpis = [
    { et: "Esperan su visto bueno", v: pendientes.length, ic: Hourglass, tono: "k-acento" },
    { et: "En curso", v: tareas.filter((t) => t.estado === "en curso" || t.estado === "esperando respuesta").length, ic: Clock3, tono: "k-info" },
    { et: "Hechas en 7 días", v: tareas.filter((t) => t.estado === "hecha" && new Date(t.actualizada).getTime() > semana).length, ic: CheckCheck, tono: "k-ok" },
    { et: "Facturas archivadas", v: facturas.filter((f) => f.estado === "archivada").length, ic: ReceiptText, tono: "k-apoyo" },
  ];
  const hoy = operaciones.filter((o) => new Date(o.t).getTime() > tick - 86400e3);
  const porCarril = (c: "ue" | "general" | "reglas") => hoy.filter((o) => o.carril === c).length;
  const ultimos = useMemo(
    () =>
      tareas
        .flatMap((t) => t.historial.slice(-1).map((h) => ({ ...h, ref: t.ref, titulo: t.titulo, id: t.id })))
        .sort((a, b) => b.t.localeCompare(a.t))
        .slice(0, 7),
    [tareas],
  );
  const h = listo ? horaMadrid(tick) : 10;
  const saludo = h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";

  const decidir = async (id: string, si: boolean) => {
    setOcupado(id);
    try {
      if (si) await aprobar(id);
      else await rechazar(id);
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setOcupado(null);
  };

  return (
    <>
      <section className="hero">
        <div className="hero-escena">
          <Casco detenido={parada.activa} />
        </div>
        <div className="hero-txt">
          <span className="eyebrow">{saludo}</span>
          {listo ? (
            <h1>{parada.activa ? "Sam está detenido y no hará nada hasta que usted lo diga" : pendientes.length ? `Sam tiene ${pendientes.length} cosas esperando su visto bueno` : "Sam lo tiene todo al día"}</h1>
          ) : (
            <div className="hero-skel">
              <Skel alto={34} ancho="90%" />
              <Skel alto={34} ancho="60%" />
            </div>
          )}
          <p>Escríbale como a alguien del estudio. Sam decide qué IA hace cada cosa, con la UE para todo lo que trae datos o planos, y no mueve nada sin su permiso.</p>
          <div className="hero-btns">
            <a className="btn btn-primario" href="#aprobar">
              Revisar lo pendiente <ArrowRight size={17} />
            </a>
            <Link className="btn btn-secundario" href="/ruta">
              <Route size={17} /> Cómo elige la IA
            </Link>
          </div>
          <div className="hero-carriles">
            {(["ue", "general", "reglas"] as const).map((c) => (
              <span key={c} className={`hc hc-${c}`}>
                <i />
                {CARRILES[c].nombre}
                <strong className="mono">{listo ? porCarril(c) : "·"}</strong>
              </span>
            ))}
            <small>operaciones en las últimas 24 h</small>
          </div>
        </div>
      </section>

      <section className="kpis">
        {kpis.map((k, i) => {
          const Ic = k.ic;
          return (
            <div key={k.et} className={`kpi ${k.tono}`} style={{ animationDelay: `${i * 60}ms` }}>
              <span className="kpi-ic">
                <Ic size={19} />
              </span>
              <div>{listo ? <strong className="mono">{k.v}</strong> : <Skel alto={26} ancho={44} />}</div>
              <small>{k.et}</small>
            </div>
          );
        })}
      </section>

      <div className="grid g-inicio">
        <Conversacion />
        <section className="card" id="aprobar">
          <div className="card-head">
            <div>
              <h2>Esperan su visto bueno</h2>
              <p>Nada de esto sale ni se archiva hasta que usted lo apruebe.</p>
            </div>
            <Link className="enlace" href="/tareas?estado=esperando%20aprobaci%C3%B3n">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          {!listo ? (
            <div className="form-col">
              {[0, 1, 2, 3].map((i) => (
                <Skel key={i} alto={64} />
              ))}
            </div>
          ) : pendientes.length === 0 ? (
            <Vacio icono={<CheckCheck size={22} />} titulo="Nada pendiente" texto="Cuando Sam prepare algo que cambie un archivo o salga del estudio, aparecerá aquí." />
          ) : (
            <ul className="pend">
              {pendientes.slice(0, 6).map((t, i) => (
                <li key={t.id} className="pend-item" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="pend-txt">
                    <Link href={`/tareas?ref=${t.ref}`} className="pend-tit">
                      {t.titulo}
                    </Link>
                    <span className="pend-meta">
                      <Badge tono={CARRILES[t.carril].tono}>{CARRILES[t.carril].corto}</Badge>
                      <span>{SERVICIOS[t.servicio].nombre}</span>
                      <span className="muted">· {haceCuanto(t.creada, tick)}</span>
                    </span>
                  </div>
                  <div className="pend-acc">
                    <button className="icon-btn ok" aria-label={`Aprobar ${t.titulo}`} disabled={ocupado === t.id || parada.activa} onClick={() => decidir(t.id, true)}>
                      <Check size={17} />
                    </button>
                    <button className="icon-btn no" aria-label={`Rechazar ${t.titulo}`} disabled={ocupado === t.id} onClick={() => decidir(t.id, false)}>
                      <X size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="sec-tit" style={{ marginTop: 22 }}>
            Lo último
          </div>
          <ol className="linea">
            {!listo
              ? [0, 1, 2].map((i) => (
                  <li key={i}>
                    <Skel alto={36} />
                  </li>
                ))
              : ultimos.map((u) => (
                  <li key={u.id + u.t} className={`li-${u.quien === "Código" ? "codigo" : u.quien === "Usted" ? "usted" : "sam"}`}>
                    <span className="li-quien">{u.quien}</span>
                    <div>
                      <p>{u.texto}</p>
                      <small>
                        <span className="mono">{u.ref}</span> · {cuandoFue(u.t, tick)}
                      </small>
                    </div>
                  </li>
                ))}
          </ol>
        </section>
      </div>

      <section className="proyectos">
        <div className="card-head">
          <div>
            <span className="eyebrow">Proyectos abiertos</span>
            <h2 className="h2">Lo que Sam está moviendo en cada barco</h2>
          </div>
        </div>
        <div className="proy-grid">
          {PROYECTOS_FOTO.map((p, i) => {
            const n = tareas.filter((t) => t.proyecto === p.nombre);
            return (
              <Link key={p.nombre} href={`/tareas?proyecto=${encodeURIComponent(p.nombre)}`} className="proy-link" style={{ animationDelay: `${i * 70}ms` }}>
                <Tilt className="proy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.foto} alt={p.texto} width={480} height={320} loading="lazy" />
                  <div className="proy-txt">
                    <strong>{p.nombre}</strong>
                    <small>{p.texto}</small>
                    <span className="proy-n">{listo ? `${n.filter((t) => t.estado !== "hecha" && t.estado !== "cancelada").length} abiertas · ${n.length} en total` : "..."}</span>
                  </div>
                </Tilt>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
