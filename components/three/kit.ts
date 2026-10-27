import * as THREE from "three";

// Lo que comparten todas las escenas: tamaño que sigue al contenedor, densidad de píxeles
// limitada, pausa cuando sale de pantalla o la pestaña se oculta, y limpieza al salir.
export interface Escena {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  small: boolean;
  reduce: boolean;
  size: () => { w: number; h: number };
  onResize: (fn: (w: number, h: number) => void) => void;
  loop: (fn: (dt: number, t: number) => void) => void;
  track: <T extends { dispose: () => void }>(x: T) => T;
  dispose: () => void;
}

export function montar(mount: HTMLElement, opts: { dpr?: number; suavizado?: boolean } = {}): Escena | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: opts.suavizado ?? true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const small = window.innerWidth < 768;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : opts.dpr ?? 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  let w = Math.max(1, mount.clientWidth);
  let h = Math.max(1, mount.clientHeight);
  renderer.setSize(w, h, false);
  const resizers: ((w: number, h: number) => void)[] = [];
  const ro = new ResizeObserver(() => {
    const nw = Math.max(1, mount.clientWidth);
    const nh = Math.max(1, mount.clientHeight);
    if (nw === w && nh === h) return;
    w = nw;
    h = nh;
    renderer.setSize(w, h, false);
    resizers.forEach((f) => f(w, h));
  });
  ro.observe(mount);

  let enPantalla = true;
  const io = new IntersectionObserver((e) => (enPantalla = e[0]?.isIntersecting ?? true), { rootMargin: "120px" });
  io.observe(mount);

  let raf = 0;
  let previo = performance.now();
  const arranque = previo;
  let fn: ((dt: number, t: number) => void) | null = null;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const actual = performance.now();
    const dt = Math.min((actual - previo) / 1000, 0.25);
    previo = actual;
    if (!enPantalla || document.visibilityState === "hidden") return;
    fn?.(dt, (actual - arranque) / 1000);
  };
  raf = requestAnimationFrame(tick);

  return {
    renderer,
    scene,
    small,
    reduce,
    size: () => ({ w, h }),
    onResize: (f) => resizers.push(f),
    loop: (f) => (fn = f),
    track,
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    },
  };
}

export const css = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

export const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

let texSombra: THREE.CanvasTexture | null = null;
/** sombra de contacto: un plano con degradado radial, mucho más barato que un mapa de sombras */
export function sombraSuave(w: number, d: number, opacidad = 0.35) {
  if (!texSombra) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, "rgba(0,0,0,1)");
    r.addColorStop(0.5, "rgba(0,0,0,0.42)");
    r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    texSombra = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, opacity: opacidad, depthWrite: false }));
  m.renderOrder = 1;
  return m;
}

let texHoja: THREE.CanvasTexture | null = null;
/** una hoja impresa: margen, título y renglones grises, como se ve un PDF de lejos */
export function texturaHoja() {
  if (texHoja) return texHoja;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 172;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 128, 172);
  g.fillStyle = "#2f3a55";
  g.fillRect(14, 16, 58, 7);
  g.fillStyle = "#b8c0cf";
  for (let y = 34; y < 150; y += 9) g.fillRect(14, y, y % 4 === 0 ? 76 : 100, 3);
  g.fillStyle = "#2f5bea";
  g.fillRect(14, 152, 30, 3);
  texHoja = new THREE.CanvasTexture(c);
  texHoja.colorSpace = THREE.SRGBColorSpace;
  return texHoja;
}

/** pantalla del panel o letrero: texto nítido dibujado en un canvas */
export function lienzoTexto(ancho = 256, alto = 160) {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const g = c.getContext("2d")!;
  const familia = () => getComputedStyle(document.body).fontFamily || "sans-serif";
  const pintar = (titulo: string, sub: string, fondo: string, tinta = "#ffffff") => {
    g.clearRect(0, 0, ancho, alto);
    g.fillStyle = fondo;
    g.fillRect(0, 0, ancho, alto);
    g.fillStyle = tinta;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `800 ${Math.round(alto * 0.24)}px ${familia()}`;
    g.fillText(titulo, ancho / 2, alto * (sub ? 0.4 : 0.5), ancho - 16);
    if (sub) {
      g.globalAlpha = 0.85;
      g.font = `600 ${Math.round(alto * 0.15)}px ${familia()}`;
      g.fillText(sub, ancho / 2, alto * 0.7, ancho - 16);
      g.globalAlpha = 1;
    }
    tex.needsUpdate = true;
  };
  return { tex, pintar };
}

export function hex(c: string) {
  return new THREE.Color(c).getHex();
}
