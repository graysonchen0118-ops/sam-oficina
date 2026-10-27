"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, Home, ListChecks, Menu, MessageCircle, OctagonX, Play, ReceiptText, Route, Sailboat, ShieldCheck, UserRound, X } from "lucide-react";
import { Fondo } from "./three/Scenes";
import { Toasts } from "./ui";
import { Reanudar } from "./Reanudar";
import { VENTANA_MS, useStore } from "@/lib/store";
import { MARCA } from "@/lib/mock/estudio";
import { hora } from "@/lib/format";

const NAV = [
  { href: "/", texto: "Inicio", icono: Home },
  { href: "/tareas", texto: "Tareas", icono: ListChecks, cuenta: "aprobar" as const },
  { href: "/ruta", texto: "Ruta de IA", icono: Route },
  { href: "/facturas", texto: "Facturas de inmuebles", icono: ReceiptText, cuenta: "facturas" as const },
  { href: "/inmuebles", texto: "Inmuebles", icono: Building2 },
  { href: "/autonomia", texto: "Autonomía y control", icono: ShieldCheck },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [reanudar, setReanudar] = useState(false);
  const { tareas, facturas, listo, tick, parada, detener, ultimoWhatsapp } = useStore();
  const cuentas = {
    aprobar: tareas.filter((t) => t.estado === "esperando aprobación").length,
    facturas: facturas.filter((f) => f.estado === "esperando aprobación" || f.estado === "en revisión" || f.estado === "aviso sin factura").length,
  };
  const actual = NAV.find((n) => (n.href === "/" ? ruta === "/" : ruta.startsWith(n.href)));
  const ventana = listo && tick - new Date(ultimoWhatsapp).getTime() < VENTANA_MS;

  useEffect(() => setAbierto(false), [ruta]);

  return (
    <div className={`app ${parada.activa ? "detenido" : ""}`}>
      <Fondo detenido={parada.activa} />
      <aside className={`sidebar ${abierto ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Sailboat size={21} strokeWidth={2.3} />
          </span>
          <span className="brand-txt">
            <strong>{MARCA.nombre}</strong>
            <small>{MARCA.lema}</small>
          </span>
          <button className="icon-btn cerrar-menu" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        <nav className="nav">
          {NAV.map((n) => {
            const on = actual?.href === n.href;
            const cuenta = n.cuenta ? cuentas[n.cuenta] : 0;
            const Ic = n.icono;
            return (
              <Link key={n.href} href={n.href} className={`nav-item ${on ? "on" : ""}`}>
                <Ic size={19} />
                <span>{n.texto}</span>
                {listo && cuenta > 0 && <em className="cuenta">{cuenta}</em>}
              </Link>
            );
          })}
        </nav>
        <div className="side-foot">
          <div className={`senal ${ventana ? "" : "senal-cerrada"}`}>
            <span className="senal-ic">
              <MessageCircle size={16} />
            </span>
            <div>
              <small>Ventana de WhatsApp</small>
              <strong>{!listo ? "..." : ventana ? "Abierta" : "Cerrada: solo plantillas"}</strong>
            </div>
          </div>
          <div className="quien">
            <span className="quien-ic">
              <UserRound size={18} />
            </span>
            <div>
              <strong>Dirección del estudio</strong>
              <small>Único usuario autorizado</small>
            </div>
          </div>
        </div>
      </aside>
      <div className={`scrim ${abierto ? "show" : ""}`} onClick={() => setAbierto(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <div className="top-tit">
            <small>{MARCA.nombre}</small>
            <strong>{actual?.texto ?? MARCA.nombre}</strong>
          </div>
          <div className="top-der">
            <span className="reloj-chip">
              <span className={parada.activa ? "punto-rojo" : "punto-vivo"} /> {listo ? `Madrid ${hora(new Date(tick).toISOString())}` : "Conectando"}
            </span>
            {parada.activa ? (
              <button className="btn btn-primario btn-sm btn-reanudar" onClick={() => setReanudar(true)}>
                <Play size={16} />
                <span>Reanudar</span>
              </button>
            ) : (
              <button className="btn btn-sm btn-parar" onClick={() => detener("panel")} disabled={!listo} title="Para a Sam en el acto, sin pasar por ninguna IA">
                <OctagonX size={17} />
                <span>Parar a Sam</span>
              </button>
            )}
          </div>
        </header>
        {parada.activa && (
          <div className="banda-parada" role="status">
            <OctagonX size={18} />
            <span>
              <strong>Sam está detenido desde las {parada.desde ? hora(parada.desde) : ""}.</strong> Ninguna acción nueva, tareas congeladas y autorizaciones suspendidas. Solo usted puede reanudarlo.
            </span>
            <button className="btn btn-secundario btn-sm" onClick={() => setReanudar(true)}>
              Elegir qué reactivar
            </button>
          </div>
        )}
        <main className="content">{children}</main>
        <footer className="footer">
          <span>© 2026 {MARCA.nombre} · {MARCA.lema}</span>
          <span>Fotos: Unsplash</span>
        </footer>
      </div>
      <Reanudar abierto={reanudar} onCerrar={() => setReanudar(false)} />
      <Toasts />
    </div>
  );
}
