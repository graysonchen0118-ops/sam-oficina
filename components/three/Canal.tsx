"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Carril } from "@/lib/types";
import { css, damp, hex, lienzoTexto, montar, sombraSuave } from "./kit";
import { crearAgua, geometriaBarco, texturaPapel } from "./piezas";

export interface Viaje {
  id: number;
  carril: Carril;
  /** el documento va por un carril que no le corresponde: así decidiría una IA que no leyó la página que importa */
  riesgo: boolean;
}

// El canal de Sam: un faro a la entrada, que es Sam, y tres canales balizados.
// Cada documento es un barco de papel; el código lo manda a su canal antes de abrirlo.
export default function Canal({ viaje }: { viaje: Viaje | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pendiente = useRef<Viaje | null>(viaje);
  const lanzar = useRef<((v: Viaje) => void) | null>(null);

  useEffect(() => {
    if (!viaje) return;
    if (lanzar.current) lanzar.current(viaje);
    else pendiente.current = viaje;
  }, [viaje]);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const k = montar(mount, { dpr: 1.5 });
    if (!k) return;
    const { scene, renderer, track, small, reduce } = k;
    if (!small) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    const camera = new THREE.PerspectiveCamera(40, k.size().w / k.size().h, 0.1, 100);
    k.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    scene.fog = new THREE.Fog(hex(css("--bg", "#f4f5f2")), 22, 48);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbccbdd, 1.4));
    const sol = new THREE.DirectionalLight(0xfff3df, 1.1);
    sol.position.set(-5, 9, 6);
    scene.add(sol);

    const agua = crearAgua(track, 24, small ? 26 : 40, hex(css("--agua", "#a9c6e2")));
    scene.add(agua.mesh);

    const colores: Record<Carril, number> = {
      ue: hex(css("--accent", "#1f5f9e")),
      general: hex(css("--support", "#b8763a")),
      reglas: hex(css("--slate", "#5b6678")),
    };
    const destino: Record<Carril, THREE.Vector3> = {
      ue: new THREE.Vector3(-3.7, 0, -4.1),
      general: new THREE.Vector3(0, 0, -5),
      reglas: new THREE.Vector3(3.7, 0, -4.1),
    };
    const curvas: Record<Carril, THREE.CatmullRomCurve3> = {
      ue: new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 4.8), new THREE.Vector3(0, 0, 2.2), new THREE.Vector3(-1.7, 0, -0.6), new THREE.Vector3(-3.3, 0, -2.6), destino.ue.clone().add(new THREE.Vector3(0, 0, 0.9))]),
      general: new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 4.8), new THREE.Vector3(0, 0, 2.2), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -3), destino.general.clone().add(new THREE.Vector3(0, 0, 0.9))]),
      reglas: new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 4.8), new THREE.Vector3(0, 0, 2.2), new THREE.Vector3(1.7, 0, -0.6), new THREE.Vector3(3.3, 0, -2.6), destino.reglas.clone().add(new THREE.Vector3(0, 0, 0.9))]),
    };

    // balizas a lo largo de cada canal
    const boyaGeo = track(new THREE.CylinderGeometry(0.09, 0.13, 0.42, 10));
    const topeGeo = track(new THREE.SphereGeometry(0.1, 10, 8));
    (Object.keys(curvas) as Carril[]).forEach((c) => {
      const mat = track(new THREE.MeshLambertMaterial({ color: colores[c] }));
      for (let i = 2; i <= 9; i++) {
        const u = 0.36 + (i / 10) * 0.6;
        const p = curvas[c].getPointAt(Math.min(0.98, u));
        const tan = curvas[c].getTangentAt(Math.min(0.98, u));
        const lado = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(0.55);
        [1, -1].forEach((sg) => {
          const b = new THREE.Mesh(boyaGeo, mat);
          b.position.copy(p).addScaledVector(lado, sg).setY(0.16);
          scene.add(b);
          const t = new THREE.Mesh(topeGeo, mat);
          t.position.copy(b.position).setY(0.42);
          scene.add(t);
        });
      }
      // muelle con su letrero
      const muelle = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 0.2, 1.1)), track(new THREE.MeshLambertMaterial({ color: 0xd9c2a0 })));
      muelle.position.copy(destino[c]).setY(0.1);
      scene.add(muelle);
      const borde = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 0.05, 0.12)), track(new THREE.MeshLambertMaterial({ color: colores[c] })));
      borde.position.copy(destino[c]).add(new THREE.Vector3(0, 0.22, 0.5));
      scene.add(borde);
      const lienzo = lienzoTexto(320, 120);
      track(lienzo.tex);
      const nombres: Record<Carril, [string, string]> = { ue: ["Carril UE", "GPT y lectura en la UE"], general: ["Carril general", "Claude y búsqueda"], reglas: ["Sin IA", "Reglas del código"] };
      lienzo.pintar(nombres[c][0], nombres[c][1], css(c === "ue" ? "--accent" : c === "general" ? "--support" : "--slate", "#1f5f9e"));
      const cartel = new THREE.Mesh(track(new THREE.PlaneGeometry(2.1, 0.79)), track(new THREE.MeshBasicMaterial({ map: lienzo.tex, toneMapped: false, side: THREE.DoubleSide })));
      cartel.position.copy(destino[c]).add(new THREE.Vector3(0, 1.15, -0.35));
      scene.add(cartel);
      const poste = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6)), track(new THREE.MeshLambertMaterial({ color: 0x8a7a64 })));
      poste.position.copy(destino[c]).add(new THREE.Vector3(0, 0.55, -0.4));
      scene.add(poste);
    });

    // el faro: Sam
    const faro = new THREE.Group();
    faro.position.set(2.5, 0, 3.0);
    scene.add(faro);
    const torre = new THREE.Mesh(track(new THREE.CylinderGeometry(0.28, 0.42, 2.2, 18)), track(new THREE.MeshLambertMaterial({ color: 0xf7f5ef })));
    torre.position.y = 1.1;
    faro.add(torre);
    const franja = new THREE.Mesh(track(new THREE.CylinderGeometry(0.33, 0.36, 0.32, 18)), track(new THREE.MeshLambertMaterial({ color: colores.ue })));
    franja.position.y = 1.2;
    faro.add(franja);
    const linterna = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 14)), track(new THREE.MeshBasicMaterial({ color: 0xfff1c2 })));
    linterna.position.y = 2.38;
    faro.add(linterna);
    const tejado = new THREE.Mesh(track(new THREE.ConeGeometry(0.3, 0.32, 14)), track(new THREE.MeshLambertMaterial({ color: colores.ue })));
    tejado.position.y = 2.69;
    faro.add(tejado);
    const hazMat = track(new THREE.MeshBasicMaterial({ color: 0xfff1c2, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    const haz = new THREE.Mesh(track(new THREE.ConeGeometry(0.9, 5, 20, 1, true).rotateZ(Math.PI / 2).translate(2.5, 0, 0)), hazMat);
    haz.position.y = 2.38;
    faro.add(haz);
    const sombraFaro = sombraSuave(1.4, 1.4, 0.3);
    sombraFaro.position.set(2.5, 0.03, 3.0);
    scene.add(sombraFaro);

    // barco de papel
    const barcoMat = track(new THREE.MeshLambertMaterial({ map: texturaPapel(), side: THREE.DoubleSide }));
    const barco = new THREE.Mesh(track(geometriaBarco()), barcoMat);
    barco.scale.setScalar(0.95);
    barco.visible = false;
    scene.add(barco);
    // barcos amarrados para que el canal se vea vivo
    (Object.keys(destino) as Carril[]).forEach((c, i) => {
      const b = new THREE.Mesh(barco.geometry, track(new THREE.MeshLambertMaterial({ map: texturaPapel(), side: THREE.DoubleSide })));
      b.scale.setScalar(0.45);
      b.position.copy(destino[c]).add(new THREE.Vector3(i % 2 ? 0.75 : -0.75, 0.05, 0.75));
      b.rotation.y = Math.PI / 2;
      scene.add(b);
    });

    const alertaMat = track(new THREE.MeshBasicMaterial({ color: hex(css("--err", "#cf4a3f")), transparent: true, opacity: 0, depthWrite: false }));
    const alerta = new THREE.Mesh(track(new THREE.RingGeometry(0.75, 0.9, 48).rotateX(-Math.PI / 2)), alertaMat);
    scene.add(alerta);
    const okMat = track(new THREE.MeshBasicMaterial({ color: hex(css("--ok", "#1d8f5f")), transparent: true, opacity: 0, depthWrite: false }));
    const ok = new THREE.Mesh(track(new THREE.RingGeometry(0.75, 0.9, 48).rotateX(-Math.PI / 2)), okMat);
    scene.add(ok);

    let actual: { v: Viaje; inicio: number } | null = null;
    let finT = -1;
    const papelColor = new THREE.Color(0xffffff);
    const rojo = new THREE.Color(hex(css("--err", "#cf4a3f"))).lerp(new THREE.Color(0xffffff), 0.35);
    const iniciar = (v: Viaje) => {
      actual = { v, inicio: performance.now() };
      finT = -1;
      barco.visible = true;
      barcoMat.color.copy(papelColor);
      alertaMat.opacity = 0;
      okMat.opacity = 0;
    };
    lanzar.current = iniciar;
    if (pendiente.current) iniciar(pendiente.current);

    const ptr = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      ptr.y = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const DUR = 4.2;
    k.loop((dt, t) => {
      cur.x = damp(cur.x, Math.max(-1, Math.min(1, ptr.x)), 2, dt);
      cur.y = damp(cur.y, Math.max(-1, Math.min(1, ptr.y)), 2, dt);
      const tt = reduce ? 0 : t;
      agua.update(tt, 0.8);
      haz.rotation.y = reduce ? -2.2 : tt * 0.6;
      // en un marco alto o estrecho, la cámara se aleja para que quepan los tres canales
      const lejos = Math.max(1, 1.25 / Math.max(0.3, camera.aspect));
      camera.position.set(cur.x * 1.2, (7.6 - cur.y * 0.4) * lejos, 8.6 * lejos);
      camera.lookAt(0, 0, -1.1);

      if (actual) {
        const p = Math.min(1, (performance.now() - actual.inicio) / 1000 / DUR);
        // espera un instante en la bifurcación: es donde el código decide
        const tramo = p < 0.3 ? (p / 0.3) * 0.32 : p < 0.42 ? 0.32 : 0.32 + ((p - 0.42) / 0.58) * 0.68;
        const curva = curvas[actual.v.carril];
        const pos = curva.getPointAt(Math.min(0.999, tramo));
        const tan = curva.getTangentAt(Math.min(0.999, tramo));
        barco.position.set(pos.x, 0.06 + Math.sin(tt * 3) * 0.03, pos.z);
        barco.rotation.set(0, Math.atan2(-tan.z, tan.x), Math.sin(tt * 2.4) * 0.06);
        if (actual.v.riesgo && tramo > 0.36) barcoMat.color.lerp(rojo, 0.06);
        if (p >= 1 && finT < 0) finT = tt;
        if (finT >= 0) {
          const q = Math.min(1, (tt - finT) / 1.6);
          const anillo = actual.v.riesgo ? alerta : ok;
          const mat = actual.v.riesgo ? alertaMat : okMat;
          anillo.position.copy(destino[actual.v.carril]).setY(0.25).add(new THREE.Vector3(0, 0, 0.9));
          anillo.scale.setScalar(1 + q * 1.4);
          mat.opacity = (1 - q) * 0.75;
          if (q >= 1 && actual.v.riesgo) finT = tt;
        }
      }
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("pointermove", onMove);
      lanzar.current = null;
      k.dispose();
    };
  }, []);

  return <div ref={ref} className="canal-canvas" aria-hidden="true" />;
}
