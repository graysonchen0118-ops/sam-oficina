"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { css, damp, hex, montar } from "./kit";
import { geometriaBarco, texturaPapel } from "./piezas";
import { mulberry32 } from "@/lib/format";

// Fondo de todo el sitio: barcos de papel hechos con documentos que navegan en capas,
// cada capa a su velocidad con el scroll y el puntero. Con la parada, se quedan quietos.
export default function Fondo({ detenido }: { detenido: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const parado = useRef(detenido);
  useEffect(() => {
    parado.current = detenido;
  }, [detenido]);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const k = montar(mount, { dpr: 1, suavizado: false });
    if (!k) return;
    const { scene, renderer, track, small, reduce } = k;
    renderer.setPixelRatio(small ? 0.9 : 0.8);
    scene.fog = new THREE.Fog(hex(css("--bg", "#f4f5f2")), 10, 34);
    const camera = new THREE.PerspectiveCamera(50, k.size().w / k.size().h, 0.1, 80);
    camera.position.set(0, 0, 16);
    k.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4d2e4, 1.4));
    const sol = new THREE.DirectionalLight(0xffffff, 0.8);
    sol.position.set(-4, 7, 8);
    scene.add(sol);

    const rnd = mulberry32(31);
    const barcoGeo = track(geometriaBarco());
    const papel = track(new THREE.MeshLambertMaterial({ map: texturaPapel(), side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    const azul = track(new THREE.MeshLambertMaterial({ color: hex(css("--accent", "#1f5f9e")), side: THREE.DoubleSide, transparent: true, opacity: 0.18 }));
    const hojaGeo = track(new THREE.PlaneGeometry(0.8, 1.05));
    const capas = [
      { n: small ? 9 : 16, geo: barcoGeo, mat: papel, esc: 1 },
      { n: small ? 5 : 9, geo: barcoGeo, mat: azul, esc: 1.5 },
      { n: small ? 6 : 12, geo: hojaGeo, mat: papel, esc: 1 },
    ];
    type Pieza = { base: THREE.Vector3; rot: number; vel: number; fase: number };
    const grupos = capas.map((c, ci) => {
      const mesh = new THREE.InstancedMesh(c.geo, c.mat, c.n);
      mesh.frustumCulled = false;
      const piezas: Pieza[] = [];
      for (let i = 0; i < c.n; i++)
        piezas.push({
          base: new THREE.Vector3((rnd() - 0.5) * 44, (rnd() - 0.5) * 28, -3 - rnd() * 16 - ci * 2.5),
          rot: (rnd() - 0.5) * 1.2,
          vel: 0.25 + rnd() * 0.35,
          fase: rnd() * 10,
        });
      scene.add(mesh);
      return { mesh, piezas, ci, esc: c.esc };
    });

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const ptr = { x: 0, y: 0 };
    const cur = { x: 0, y: 0, s: 0, marcha: parado.current ? 0 : 1 };
    const onMove = (ev: PointerEvent) => {
      ptr.x = (ev.clientX / window.innerWidth - 0.5) * 2;
      ptr.y = (ev.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    let empujon = 0;
    const onPulso = () => (empujon = 1);
    ["sam:tarea", "sam:aprobado", "sam:factura"].forEach((n) => window.addEventListener(n, onPulso));
    let reloj = 0;

    k.loop((dt) => {
      cur.x = damp(cur.x, ptr.x, 2, dt);
      cur.y = damp(cur.y, ptr.y, 2, dt);
      cur.s = damp(cur.s, window.scrollY, 5, dt);
      cur.marcha = damp(cur.marcha, parado.current || reduce ? 0 : 1, 1.6, dt);
      empujon = Math.max(0, empujon - dt * 0.7);
      reloj += dt * cur.marcha * (1 + empujon * 3);
      camera.position.x = cur.x * 1.2;
      camera.position.y = -cur.y * 0.7 - cur.s * 0.004;
      camera.lookAt(0, camera.position.y * 0.7, 0);
      grupos.forEach(({ mesh, piezas, ci, esc }) => {
        piezas.forEach((p, i) => {
          const avance = ((p.base.x + reloj * p.vel + 22) % 44) - 22;
          const prof = 1 + (p.base.z + 22) / 14;
          v.set(avance, p.base.y + cur.s * 0.0028 * prof + Math.sin(reloj * 0.8 + p.fase) * 0.18, p.base.z);
          if (ci === 2) e.set(Math.sin(reloj * 0.3 + p.fase) * 0.6, p.rot + reloj * 0.1, Math.cos(reloj * 0.25 + p.fase) * 0.4);
          else e.set(Math.sin(reloj * 1.1 + p.fase) * 0.06, p.rot * 0.4, Math.sin(reloj * 0.9 + i) * 0.08);
          q.setFromEuler(e);
          s.setScalar(esc * (ci === 2 ? 0.9 : 0.85));
          m4.compose(v, q, s);
          mesh.setMatrixAt(i, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
      });
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("pointermove", onMove);
      ["sam:tarea", "sam:aprobado", "sam:factura"].forEach((n) => window.removeEventListener(n, onPulso));
      k.dispose();
    };
  }, []);

  return <div ref={ref} className="bg-canvas" aria-hidden="true" />;
}
