import * as THREE from "three";

type Track = <T extends { dispose: () => void }>(x: T) => T;

// ---------------------------------------------------------------------------
// El velero del estudio, dibujado como lo dibuja un arquitecto naval: casco
// generado por secciones, con las cuadernas y la línea de flotación en trazo.
// La mayor y el foque se pueden arriar: es lo que hace la parada de emergencia.
// ---------------------------------------------------------------------------

const L = 6;
const B = 0.95;

function manga(u: number) {
  if (u <= 0.4) return B * (0.76 + 0.24 * Math.sin((Math.PI / 2) * (u / 0.4)));
  const k = (u - 0.4) / 0.6;
  return B * Math.pow(Math.max(0, 1 - k * k), 0.55);
}
const calado = (u: number) => 0.36 * Math.pow(Math.sin(Math.PI * (0.12 + 0.8 * u)), 0.8);
const francobordo = (u: number) => 0.42 + 0.14 * u * u;

/** punto de la sección u (0 popa, 1 proa) en el parámetro s (0 quilla, 1 cubierta) */
function seccion(u: number, s: number, lado: 1 | -1) {
  const bw = manga(u);
  const d = calado(u);
  const f = francobordo(u);
  const x = -L / 2 + u * L;
  if (s <= 0.72) {
    const th = (s / 0.72) * (Math.PI / 2);
    return new THREE.Vector3(x, -d * Math.pow(Math.cos(th), 1.5), lado * bw * Math.sin(th));
  }
  const k = (s - 0.72) / 0.28;
  return new THREE.Vector3(x, f * k, lado * bw * (1 - 0.04 * k));
}

export interface Velero {
  grupo: THREE.Group;
  arriar: (si: boolean) => void;
  update: (dt: number, t: number) => void;
}

export function crearVelero(track: Track, c: { casco: number; linea: number; vela: number; acento: number; teca: number }): Velero {
  const g = new THREE.Group();
  const NU = 30;
  const NS = 14;

  // casco: una malla por banda
  const cascoMat = track(new THREE.MeshLambertMaterial({ color: c.casco, side: THREE.DoubleSide }));
  [1, -1].forEach((lado) => {
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * 0.995;
      for (let j = 0; j <= NS; j++) {
        const p = seccion(u, j / NS, lado as 1 | -1);
        pos.push(p.x, p.y, p.z);
      }
    }
    for (let i = 0; i < NU; i++)
      for (let j = 0; j < NS; j++) {
        const a = i * (NS + 1) + j;
        const b = a + NS + 1;
        if (lado === 1) idx.push(a, b, a + 1, b, b + 1, a + 1);
        else idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(track(geo), cascoMat));
  });

  // espejo de popa
  {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= NS; j++) pts.push(seccion(0, j / NS, 1));
    for (let j = NS; j >= 0; j--) pts.push(seccion(0, j / NS, -1));
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.z, p.y)));
    const geo = track(new THREE.ShapeGeometry(shape));
    const m = new THREE.Mesh(geo, track(new THREE.MeshLambertMaterial({ color: c.casco, side: THREE.DoubleSide })));
    m.rotation.y = -Math.PI / 2;
    m.position.x = -L / 2;
    g.add(m);
  }

  // cubierta de teca
  {
    const s = new THREE.Shape();
    for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * 0.995;
      const p = seccion(u, 1, 1);
      if (i === 0) s.moveTo(p.x, p.z);
      else s.lineTo(p.x, p.z);
    }
    for (let i = NU; i >= 0; i--) {
      const u = (i / NU) * 0.995;
      const p = seccion(u, 1, -1);
      s.lineTo(p.x, p.z);
    }
    const geo = track(new THREE.ShapeGeometry(s, 4));
    // la cubierta sigue el arrufo
    const pa = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let k = 0; k < pa.count; k++) {
      const x = pa.getX(k);
      const u = (x + L / 2) / L;
      pa.setXYZ(k, x, francobordo(Math.min(1, Math.max(0, u))) - 0.005, pa.getY(k));
    }
    geo.computeVertexNormals();
    const deck = new THREE.Mesh(geo, track(new THREE.MeshLambertMaterial({ color: c.teca, side: THREE.DoubleSide })));
    g.add(deck);
    // bañera y cabina
    const cab = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.22, 0.95)), track(new THREE.MeshLambertMaterial({ color: c.casco })));
    cab.position.set(-0.2, francobordo(0.47) + 0.1, 0);
    g.add(cab);
    const vidrio = new THREE.Mesh(track(new THREE.BoxGeometry(1.0, 0.06, 0.98)), track(new THREE.MeshPhongMaterial({ color: 0x24344a, shininess: 90 })));
    vidrio.position.set(-0.1, francobordo(0.47) + 0.15, 0);
    g.add(vidrio);
  }

  // líneas: cuadernas, flotación, arrufo y perfil de quilla, como en un plano de formas
  const lineaMat = track(new THREE.LineBasicMaterial({ color: c.linea, transparent: true, opacity: 0.9 }));
  const lineas: number[] = [];
  const seg = (a: THREE.Vector3, b: THREE.Vector3, off = 0.004) => {
    const n = (v: THREE.Vector3) => v.clone().multiplyScalar(1 + off);
    const A = n(a);
    const Bv = n(b);
    lineas.push(A.x, A.y, A.z, Bv.x, Bv.y, Bv.z);
  };
  for (let i = 1; i < NU; i += 2) {
    const u = (i / NU) * 0.995;
    ([1, -1] as const).forEach((lado) => {
      for (let j = 0; j < NS; j++) seg(seccion(u, j / NS, lado), seccion(u, (j + 1) / NS, lado));
    });
  }
  ([1, -1] as const).forEach((lado) => {
    for (let i = 0; i < NU; i++) {
      const u0 = (i / NU) * 0.995;
      const u1 = ((i + 1) / NU) * 0.995;
      seg(seccion(u0, 0.72, lado), seccion(u1, 0.72, lado));
      seg(seccion(u0, 1, lado), seccion(u1, 1, lado));
      seg(seccion(u0, 0.36, lado), seccion(u1, 0.36, lado));
    }
  });
  for (let i = 0; i < NU; i++) seg(seccion((i / NU) * 0.995, 0, 1), seccion(((i + 1) / NU) * 0.995, 0, 1));
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute("position", new THREE.Float32BufferAttribute(lineas, 3));
  g.add(new THREE.LineSegments(track(lgeo), lineaMat));

  // flotación marcada en acento
  {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= NU; i++) pts.push(seccion((i / NU) * 0.995, 0.72, 1).multiplyScalar(1.006));
    for (let i = NU; i >= 0; i--) pts.push(seccion((i / NU) * 0.995, 0.72, -1).multiplyScalar(1.006));
    const geo = track(new THREE.BufferGeometry().setFromPoints(pts));
    g.add(new THREE.Line(geo, track(new THREE.LineBasicMaterial({ color: c.acento }))));
  }

  // orza con bulbo y timón
  const apendMat = track(new THREE.MeshLambertMaterial({ color: 0x3b4658 }));
  const orza = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 1.25, 0.07)), apendMat);
  orza.position.set(-0.05, -calado(0.47) - 0.6, 0);
  orza.rotation.z = 0.08;
  g.add(orza);
  const bulbo = new THREE.Mesh(track(new THREE.SphereGeometry(0.17, 18, 12)), apendMat);
  bulbo.scale.set(3.6, 1, 1.1);
  bulbo.position.set(-0.15, -calado(0.47) - 1.25, 0);
  g.add(bulbo);
  const timon = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.8, 0.05)), apendMat);
  timon.position.set(-2.35, -0.45, 0);
  timon.rotation.z = 0.12;
  g.add(timon);

  // aparejo
  const palo = new THREE.Mesh(track(new THREE.CylinderGeometry(0.035, 0.05, 5.6, 10)), track(new THREE.MeshPhongMaterial({ color: 0xc9ccd2, shininess: 70 })));
  const xPalo = 0.55;
  const yCub = francobordo((xPalo + L / 2) / L);
  palo.position.set(xPalo, yCub + 2.8, 0);
  g.add(palo);
  const botavara = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 8)), track(new THREE.MeshPhongMaterial({ color: 0xc9ccd2 })));
  botavara.rotation.z = Math.PI / 2;
  botavara.position.set(xPalo - 1.25, yCub + 0.62, 0);
  g.add(botavara);
  const jarcia = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(xPalo, yCub + 5.5, 0), new THREE.Vector3(2.92, francobordo(1), 0), new THREE.Vector3(xPalo, yCub + 5.5, 0), new THREE.Vector3(-2.9, francobordo(0) + 0.05, 0)]));
  g.add(new THREE.LineSegments(jarcia, track(new THREE.LineBasicMaterial({ color: 0x8a93a3 }))));

  const velaMat = track(new THREE.MeshLambertMaterial({ color: c.vela, side: THREE.DoubleSide, transparent: true, opacity: 0.97 }));
  // mayor: origen en el puño de amura, para arriarla hacia la botavara
  const mayorGeo = (() => {
    const pos: number[] = [];
    const idx: number[] = [];
    const N = 10;
    const alto = 4.75;
    const base = 2.35;
    for (let i = 0; i <= N; i++) {
      const v = i / N;
      const ancho = base * (1 - v) + 0.12 * v;
      for (let j = 0; j <= 4; j++) {
        const h = j / 4;
        const bolsa = Math.sin(Math.PI * h) * 0.16 * (1 - v * 0.7);
        pos.push(-ancho * h, v * alto, bolsa);
      }
    }
    for (let i = 0; i < N; i++)
      for (let j = 0; j < 4; j++) {
        const a = i * 5 + j;
        idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return track(geo);
  })();
  const mayor = new THREE.Mesh(mayorGeo, velaMat);
  mayor.position.set(xPalo - 0.04, yCub + 0.66, 0);
  g.add(mayor);

  const foqueGeo = (() => {
    const tack = new THREE.Vector3(2.85, francobordo(1) + 0.05, 0);
    const head = new THREE.Vector3(xPalo + 0.2, yCub + 4.6, 0);
    const clew = new THREE.Vector3(0.95, yCub + 0.35, 0.28);
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), head.clone().sub(tack), clew.clone().sub(tack)]);
    geo.computeVertexNormals();
    return track(geo);
  })();
  const foque = new THREE.Mesh(foqueGeo, velaMat);
  foque.position.set(2.85, francobordo(1) + 0.05, 0);
  g.add(foque);

  let izada = 1;
  let objetivo = 1;
  return {
    grupo: g,
    arriar: (si) => (objetivo = si ? 0.05 : 1),
    update: (dt, t) => {
      izada += (objetivo - izada) * (1 - Math.exp(-2.2 * dt));
      mayor.scale.y = Math.max(0.03, izada);
      foque.scale.set(Math.max(0.05, izada), Math.max(0.05, izada), Math.max(0.05, izada));
      mayor.rotation.y = -0.12 + Math.sin(t * 0.7) * 0.03 * izada;
    },
  };
}

// ---------------------------------------------------------------------------
// Un barco de papel hecho con una hoja impresa: así viaja cada documento.
// ---------------------------------------------------------------------------
export function geometriaBarco() {
  const B0 = [-0.45, 0, 0];
  const B1 = [0.45, 0, 0];
  const T0 = [0.95, 0.32, 0];
  const T3 = [-0.95, 0.32, 0];
  const lado = (z: number) => {
    const T1 = [0.5, 0.3, 0.22 * z];
    const T2 = [-0.5, 0.3, 0.22 * z];
    return [B0, B1, T1, B1, T0, T1, B0, T1, T2, B0, T2, T3];
  };
  const vela = [
    [-0.5, 0.3, 0],
    [0.5, 0.3, 0],
    [0, 0.98, 0],
  ];
  const v = [...lado(1), ...lado(-1), ...vela].flat();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  const uv: number[] = [];
  for (let i = 0; i < v.length; i += 3) uv.push((v[i] + 1) / 2, v[i + 1] / 1);
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

let texPapel: THREE.CanvasTexture | null = null;
/** papel impreso: renglones y un sello, como una factura vista de lejos */
export function texturaPapel() {
  if (texPapel) return texPapel;
  const cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 128;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#fbfaf6";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#c9cfd9";
  for (let y = 18; y < 120; y += 10) g.fillRect(12, y, y % 20 === 0 ? 70 : 100, 3);
  g.fillStyle = "#1f4f86";
  g.fillRect(12, 6, 40, 6);
  texPapel = new THREE.CanvasTexture(cv);
  texPapel.colorSpace = THREE.SRGBColorSpace;
  return texPapel;
}

/** agua: losa flotante con olas suaves y borde que se desvanece */
export function crearAgua(track: Track, tam: number, segs: number, color: number) {
  const geo = track(new THREE.PlaneGeometry(tam, tam, segs, segs).rotateX(-Math.PI / 2));
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const g = cv.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  r.addColorStop(0, "#fff");
  r.addColorStop(0.62, "#fff");
  r.addColorStop(1, "#000");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const alpha = track(new THREE.CanvasTexture(cv));
  const mat = track(new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x9fb8d6, transparent: true, alphaMap: alpha, depthWrite: false, flatShading: true }));
  const mesh = new THREE.Mesh(geo, mat);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const base = Float32Array.from(pos.array as Float32Array);
  return {
    mesh,
    update: (t: number, fuerza = 1) => {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        pos.setY(i, (Math.sin(x * 0.9 + t * 0.9) * 0.05 + Math.cos(z * 1.3 + t * 0.7) * 0.04) * fuerza);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}
