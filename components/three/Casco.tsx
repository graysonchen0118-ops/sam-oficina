"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { css, damp, hex, montar, sombraSuave } from "./kit";
import { crearAgua, crearVelero } from "./piezas";

// Escena de portada: el velero del estudio en su plano de formas, sobre el agua.
// Si se pulsa la parada de emergencia, las velas se arrían.
export default function Casco({ detenido }: { detenido: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const parado = useRef(detenido);
  const cambio = useRef<((v: boolean) => void) | null>(null);

  useEffect(() => {
    parado.current = detenido;
    cambio.current?.(detenido);
  }, [detenido]);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const k = montar(mount, { dpr: 1.5 });
    if (!k) return;
    const { scene, renderer, track, small, reduce } = k;
    if (!small) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    const camera = new THREE.PerspectiveCamera(36, k.size().w / k.size().h, 0.1, 120);
    const encuadre = (w: number, h: number) => {
      camera.aspect = w / h;
      if (w > 900) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    encuadre(k.size().w, k.size().h);
    k.onResize(encuadre);

    scene.fog = new THREE.Fog(hex(css("--bg", "#f4f5f2")), 18, 42);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c8da, 1.35));
    const sol = new THREE.DirectionalLight(0xfff4e2, 1.25);
    sol.position.set(-6, 9, 7);
    scene.add(sol);
    const contra = new THREE.DirectionalLight(0xbfd6f2, 0.5);
    contra.position.set(6, 3, -8);
    scene.add(contra);

    const velero = crearVelero(track, {
      casco: 0xf6f4ee,
      linea: hex(css("--accent-2", "#154778")),
      vela: 0xfbfaf6,
      acento: hex(css("--support", "#b8763a")),
      teca: 0xc89a66,
    });
    velero.grupo.scale.setScalar(small ? 0.8 : 0.98);
    scene.add(velero.grupo);
    const sombra = sombraSuave(6, 2.4, 0.22);
    sombra.position.y = 0.02;
    scene.add(sombra);

    const agua = crearAgua(track, 26, small ? 28 : 46, hex(css("--agua", "#a9c6e2")));
    scene.add(agua.mesh);

    // anillo que se abre en el agua cuando usted aprueba algo
    const anilloMat = track(new THREE.MeshBasicMaterial({ color: hex(css("--accent", "#1f5f9e")), transparent: true, opacity: 0, depthWrite: false }));
    const anillo = new THREE.Mesh(track(new THREE.RingGeometry(2.6, 2.75, 72).rotateX(-Math.PI / 2)), anilloMat);
    anillo.position.y = 0.08;
    scene.add(anillo);
    let pulsoT = 1;

    velero.arriar(parado.current);
    cambio.current = (v) => velero.arriar(v);
    const onParada = () => velero.arriar(true);
    const onMarcha = () => velero.arriar(false);
    const onPulso = () => (pulsoT = 0);
    window.addEventListener("sam:parada", onParada);
    window.addEventListener("sam:reanudar", onMarcha);
    window.addEventListener("sam:aprobado", onPulso);
    window.addEventListener("sam:tarea", onPulso);

    const ptr = { x: 0, y: 0 };
    const cur = { x: 0, y: 0, s: 0, calma: parado.current ? 0.25 : 1 };
    const onMove = (e: PointerEvent) => {
      ptr.x = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    k.loop((dt, t) => {
      cur.x = damp(cur.x, ptr.x, 2.2, dt);
      cur.y = damp(cur.y, ptr.y, 2.2, dt);
      cur.s = damp(cur.s, Math.min(window.scrollY, 600), 4, dt);
      cur.calma = damp(cur.calma, parado.current ? 0.25 : 1, 1.5, dt);
      const tt = reduce ? 0 : t;
      velero.update(dt, tt);
      agua.update(tt, cur.calma);
      velero.grupo.rotation.y = -0.55 + cur.x * 0.32 + (reduce ? 0 : Math.sin(tt * 0.25) * 0.06);
      velero.grupo.rotation.z = Math.sin(tt * 0.9) * 0.025 * cur.calma;
      velero.grupo.rotation.x = Math.sin(tt * 0.7) * 0.015 * cur.calma;
      velero.grupo.position.y = Math.sin(tt * 1.1) * 0.04 * cur.calma;
      camera.position.set(9.8 + cur.x * 0.6, 3.4 - cur.y * 0.4 + cur.s * 0.003, 10.8 - cur.s * 0.004);
      camera.lookAt(0, 2.3 - cur.s * 0.002, 0);
      pulsoT = Math.min(1, pulsoT + dt / 1.8);
      anillo.scale.setScalar(1 + pulsoT * 1.8);
      anilloMat.opacity = pulsoT >= 1 ? 0 : (1 - pulsoT) * 0.6;
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("sam:parada", onParada);
      window.removeEventListener("sam:reanudar", onMarcha);
      window.removeEventListener("sam:aprobado", onPulso);
      window.removeEventListener("sam:tarea", onPulso);
      window.removeEventListener("pointermove", onMove);
      cambio.current = null;
      k.dispose();
    };
  }, []);

  return <div ref={ref} className="hero-canvas" aria-hidden="true" />;
}
