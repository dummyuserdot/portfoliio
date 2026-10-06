"use client";

/**
 * SpiderScrollAnimation
 * ---------------------
 * A fixed, click-through overlay with one real-time 3D spider (Three.js)
 * hanging from a silk thread. Its vertical position is driven by page scroll
 * progress (0..1) through a critically-damped spring, so it moves down when you
 * scroll down, up when you scroll up, and settles naturally when you stop.
 *
 * - Three.js is loaded lazily (dynamic import) after first paint: zero impact
 *   on your initial bundle / LCP.
 * - No React state, no re-renders: everything runs in one rAF loop.
 * - Fully cleaned up on unmount (listeners, rAF, geometries, materials, GL).
 * - Renders nothing if WebGL is unavailable.
 */

import { useEffect, useRef } from "react";
import type * as ThreeNS from "three";

type Three = typeof ThreeNS;
type RoomEnvCtor = typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment;

/* ------------------------------ tuning knobs ------------------------------ */
const CONFIG = {
  /** Spider travels between these fractions of the viewport height. */
  topFraction: 0.16,
  bottomFraction: 0.84,
  /** Scroll-follow spring (higher = snappier). Damping is derived (≈critical). */
  stiffness: 60,
  /** Overlay column width in px (desktop / mobile). */
  columnDesktop: 260,
  columnMobile: 150,
  /** Spider scale (desktop / mobile). 1 = ~180px leg span. */
  scaleDesktop: 0.85,
  scaleMobile: 0.5,
  /** Show the small web fan where the thread is anchored (top of screen). */
  anchorWeb: true,
  /** Delay before Three.js starts loading (ms) so first paint is never blocked. */
  loadDelay: 400,
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* -------------------------------------------------------------------------- */

export default function SpiderScrollAnimation() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const timer = window.setTimeout(async () => {
      try {
        const [THREE, envMod] = await Promise.all([
          import("three"),
          import("three/examples/jsm/environments/RoomEnvironment.js"),
        ]);
        if (disposed) return;
        cleanup = mountSpider(THREE, envMod.RoomEnvironment, host);
      } catch (err) {
        // WebGL unavailable or chunk failed: fail silently, site stays intact.
        console.warn("[SpiderScrollAnimation] disabled:", err);
      }
    }, CONFIG.loadDelay);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed right-0 top-0 z-40 h-dvh w-[150px] select-none overflow-hidden md:w-[260px] print:hidden"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                               Three.js scene                               */
/* -------------------------------------------------------------------------- */

function mountSpider(THREE: Three, RoomEnvironment: RoomEnvCtor, host: HTMLDivElement) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = reduced ? 0.3 : 1;

  /* ---- theme-aware thread colour (reads page background once) ---- */
  const lightBg = (() => {
    const read = (el: Element) => getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.map(Number);
    let c = read(document.body);
    if (!c || (c.length >= 4 && c[3] === 0)) c = read(document.documentElement);
    if (!c || (c.length >= 4 && c[3] === 0)) return false;
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 150;
  })();
  const threadColor = lightBg ? 0x2b2f38 : 0xdfe7f2;

  /* ---- renderer ---- */
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "display:block;width:100%;height:100%;opacity:0;transition:opacity 1.2s ease;";
  host.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.7;

  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 6000);

  /* ---- lights ---- */
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-120, 200, 300);
  const rim = new THREE.DirectionalLight(0x7fb2ff, 2.4);
  rim.position.set(160, -80, -260);
  const fill = new THREE.AmbientLight(0xffffff, 0.18);
  scene.add(key, rim, fill);

  /* ---- materials ---- */
  const abdomenTex = makeAbdomenTexture(THREE);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x24272f,
    roughness: 0.4,
    metalness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
  });
  const abdomenMat = bodyMat.clone();
  abdomenMat.map = abdomenTex;
  abdomenMat.color.set(0xffffff);
  const legMat = new THREE.MeshPhysicalMaterial({
    color: 0x1d2027,
    roughness: 0.5,
    metalness: 0.2,
    clearcoat: 0.5,
    clearcoatRoughness: 0.35,
  });
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x050507,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    emissive: 0x1a2a44,
    emissiveIntensity: 0.6,
  });

  /* ---- spider model (local units ≈ px at scale 1; head points -Y) ---- */
  const pivot = new THREE.Group(); // origin = thread attachment point
  const model = new THREE.Group();
  model.position.y = -40; // abdomen top (y=+40) lands on pivot origin
  pivot.add(model);
  scene.add(pivot);

  const sphereGeo = new THREE.SphereGeometry(1, 40, 28);
  const lowSphereGeo = new THREE.SphereGeometry(1, 12, 10);

  const cephalo = new THREE.Mesh(sphereGeo, bodyMat);
  cephalo.scale.set(11, 13, 8.5);
  cephalo.position.set(0, -15, 1);
  const abdomen = new THREE.Mesh(sphereGeo, abdomenMat);
  abdomen.position.set(0, 17, 0);
  const abdomenBase = new THREE.Vector3(17, 23, 15);
  abdomen.scale.copy(abdomenBase);
  model.add(cephalo, abdomen);

  // eyes (snapped to the cephalothorax surface)
  const surfaceZ = (x: number, y: number) =>
    1 + 8.5 * Math.sqrt(Math.max(0, 1 - (x / 11) ** 2 - ((y + 15) / 13) ** 2));
  const eyeSpec: [number, number, number][] = [
    [3.4, -24.5, 2.1],
    [7, -21.5, 1.5],
    [2.2, -19.5, 1.2],
    [5.4, -16.5, 1.0],
  ];
  for (const [ex, ey, r] of eyeSpec) {
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(lowSphereGeo, eyeMat);
      e.scale.setScalar(r);
      e.position.set(s * ex, ey, surfaceZ(ex, ey) + r * 0.25);
      model.add(e);
    }
  }

  // fangs + pedipalps
  const fangGeo = new THREE.ConeGeometry(1.6, 8, 10);
  const palpGeo = new THREE.CylinderGeometry(1.1, 1.8, 1, 8);
  for (const s of [-1, 1]) {
    const fang = new THREE.Mesh(fangGeo, legMat);
    fang.position.set(s * 3, -31, 2.5);
    fang.rotation.z = Math.PI + s * 0.18;
    model.add(fang);

    const palp = new THREE.Mesh(palpGeo, legMat);
    palp.scale.set(1, 11, 1);
    palp.position.set(s * 7, -29, 3.5);
    palp.rotation.z = -s * 0.35;
    const tip = new THREE.Mesh(lowSphereGeo, legMat);
    tip.scale.setScalar(2.1);
    tip.position.set(s * 8.9, -34, 3.5);
    model.add(palp, tip);
  }

  /* ---- legs: 8 × (femur, tibia, tarsus) ---- */
  const segGeos = [
    new THREE.CylinderGeometry(1.9, 2.8, 1, 10),
    new THREE.CylinderGeometry(1.3, 1.9, 1, 10),
    new THREE.CylinderGeometry(0.45, 1.2, 1, 8),
  ];
  const jointRadii = [1.9, 1.3, 0.5];
  const UP = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();
  const placeSeg = (m: ThreeNS.Mesh, a: ThreeNS.Vector3, b: ThreeNS.Vector3) => {
    tmp.subVectors(b, a);
    const len = tmp.length() || 1e-4;
    m.position.copy(a).addScaledVector(tmp, 0.5);
    m.quaternion.setFromUnitVectors(UP, tmp.multiplyScalar(1 / len));
    m.scale.set(1, len, 1);
  };

  const rowAngle = [-62, -22, 20, 55].map((d) => (d * Math.PI) / 180);
  const rowHipY = [-22, -17, -12, -8];
  const rowLen = [1.1, 0.95, 0.9, 1.1];

  interface Leg {
    s: number;
    base: number;
    len: number;
    phase: number;
    hip: ThreeNS.Vector3;
    knee: ThreeNS.Vector3;
    ankle: ThreeNS.Vector3;
    foot: ThreeNS.Vector3;
    segs: ThreeNS.Mesh[];
    joints: ThreeNS.Mesh[];
  }
  const legs: Leg[] = [];
  for (const s of [-1, 1]) {
    for (let row = 0; row < 4; row++) {
      const segs = segGeos.map((g) => {
        const m = new THREE.Mesh(g, legMat);
        model.add(m);
        return m;
      });
      const joints = jointRadii.map((r) => {
        const m = new THREE.Mesh(lowSphereGeo, legMat);
        m.scale.setScalar(r);
        model.add(m);
        return m;
      });
      legs.push({
        s,
        base: rowAngle[row],
        len: rowLen[row],
        phase: ((row + (s > 0 ? 0 : 1)) % 2) * Math.PI + row * 0.35,
        hip: new THREE.Vector3(s * 7, rowHipY[row], 2),
        knee: new THREE.Vector3(),
        ankle: new THREE.Vector3(),
        foot: new THREE.Vector3(),
        segs,
        joints,
      });
    }
  }

  const poseLeg = (l: Leg, gait: number, energy: number) => {
    const swing = Math.sin(gait + l.phase) * (0.035 + 0.2 * energy) * motion;
    const lift = Math.max(0, Math.cos(gait + l.phase)) * (1.5 + 9 * energy) * motion;
    const ang = l.base + swing;
    const a1 = ang * 0.7;
    const L1 = 26 * l.len;
    const L2 = 34 * l.len;
    const L3 = 28 * l.len;

    l.knee.set(l.hip.x + l.s * Math.cos(a1) * L1, l.hip.y + Math.sin(a1) * L1, l.hip.z + 17 + lift);
    l.ankle.set(
      l.knee.x + l.s * Math.cos(ang) * L2,
      l.knee.y + Math.sin(ang) * L2,
      4 + lift * 0.3
    );
    l.foot.set(
      l.ankle.x + l.s * Math.cos(ang + 0.35) * L3,
      l.ankle.y + Math.sin(ang + 0.35) * L3,
      -6
    );

    placeSeg(l.segs[0], l.hip, l.knee);
    placeSeg(l.segs[1], l.knee, l.ankle);
    placeSeg(l.segs[2], l.ankle, l.foot);
    l.joints[0].position.copy(l.knee);
    l.joints[1].position.copy(l.ankle);
    l.joints[2].position.copy(l.foot);
  };

  /* ---- silk thread (two strands) ---- */
  const N = 40;
  const makeThread = (opacity: number) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((N + 1) * 3), 3));
    const mat = new THREE.LineBasicMaterial({
      color: threadColor,
      transparent: true,
      opacity,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    scene.add(line);
    return line;
  };
  const threadMain = makeThread(0.6);
  const threadAux = makeThread(0.3);

  /* ---- anchor web fan ---- */
  let anchorWeb: ThreeNS.LineSegments | null = null;
  const buildAnchorWeb = (W: number, H: number) => {
    if (anchorWeb) {
      scene.remove(anchorWeb);
      anchorWeb.geometry.dispose();
      (anchorWeb.material as ThreeNS.Material).dispose();
      anchorWeb = null;
    }
    if (!CONFIG.anchorWeb) return;
    const ax = 0;
    const ay = H / 2 + 12;
    const degs = [-70, -45, -22, 0, 22, 45, 70];
    const maxR = 120;
    const dirs = degs.map((d) => {
      const r = (d * Math.PI) / 180;
      const len = Math.abs(d) < 1 ? maxR : Math.min(maxR, (W / 2 - 8) / Math.sin(Math.abs(r)));
      return { x: Math.sin(r), y: -Math.cos(r), len };
    });
    const pts: number[] = [];
    const seg = (x1: number, y1: number, x2: number, y2: number) => pts.push(x1, y1, 0, x2, y2, 0);
    for (const d of dirs) seg(ax, ay, ax + d.x * d.len, ay + d.y * d.len);
    for (const f of [0.38, 0.62, 0.86]) {
      for (let i = 0; i < dirs.length - 1; i++) {
        const a = dirs[i];
        const b = dirs[i + 1];
        const x1 = ax + a.x * a.len * f;
        const y1 = ay + a.y * a.len * f;
        const x2 = ax + b.x * b.len * f;
        const y2 = ay + b.y * b.len * f;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2 - (5 + f * 7); // gentle sag
        let px = x1;
        let py = y1;
        for (let k = 1; k <= 8; k++) {
          const t = k / 8;
          const nx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t * t * x2;
          const ny = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t * t * y2;
          seg(px, py, nx, ny);
          px = nx;
          py = ny;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    anchorWeb = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: threadColor, transparent: true, opacity: 0.2 })
    );
    anchorWeb.frustumCulled = false;
    scene.add(anchorWeb);
  };

  /* ---- sizing ---- */
  let W = 1;
  let H = 1;
  let spiderScale = CONFIG.scaleDesktop;
  const resize = () => {
    W = Math.max(1, host.clientWidth);
    H = Math.max(1, host.clientHeight);
    const small = W < 200;
    spiderScale = small ? CONFIG.scaleMobile : CONFIG.scaleDesktop;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.set(0, 0, H / 2 / Math.tan((FOV * Math.PI) / 360));
    camera.far = camera.position.z * 3;
    camera.updateProjectionMatrix();
    pivot.scale.setScalar(spiderScale);
    buildAnchorWeb(W, H);
  };

  /* ---- scroll progress ---- */
  let scrollY = window.scrollY;
  let maxScroll = 1;
  const recalcScroll = () => {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };
  const onScroll = () => {
    scrollY = window.scrollY;
  };
  const onResize = () => {
    resize();
    recalcScroll();
  };

  resize();
  recalcScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("load", recalcScroll);
  const ro = new ResizeObserver(() => {
    recalcScroll();
    resize();
  });
  ro.observe(host);
  const roBody = new ResizeObserver(recalcScroll);
  roBody.observe(document.body);

  /* ---- simulation state ---- */
  const K = CONFIG.stiffness;
  const C = 2 * Math.sqrt(K) * 0.95;
  let y = H * CONFIG.topFraction; // spring position (px, from viewport top)
  let vy = 0;
  let theta = 0; // pendulum angle (rad)
  let omega = 0;
  let energy = 0;
  let gait = 0;
  let t = 0;
  let last = performance.now();
  let raf = 0;
  let lost = false;
  let firstFrame = true;

  const tp = threadMain.geometry.attributes.position as ThreeNS.BufferAttribute;
  const ta = threadAux.geometry.attributes.position as ThreeNS.BufferAttribute;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (document.hidden || lost) {
      last = now;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    t += dt;

    // scroll → normalised progress → spring-smoothed target
    const p = clamp(scrollY / maxScroll, 0, 1);
    const target = H * (CONFIG.topFraction + (CONFIG.bottomFraction - CONFIG.topFraction) * p);
    const acc = -K * (y - target) - C * vy;
    vy += acc * dt;
    y += vy * dt;

    energy += (clamp(Math.abs(vy) / 700, 0, 1) - energy) * Math.min(1, dt * 6);
    gait += dt * (1.2 + energy * 9);

    // pendulum swing, kicked by scroll acceleration, damped
    const w0 = 3.2;
    const zeta = 0.35;
    const alpha =
      -w0 * w0 * theta - 2 * zeta * w0 * omega - clamp(acc, -20000, 20000) * 0.00004 * motion;
    omega += alpha * dt;
    theta = clamp(theta + omega * dt, -0.35, 0.35);

    // attachment point (world coords, origin = canvas centre)
    const attachX = theta * 120;
    const attachY = H / 2 - y;
    pivot.position.set(attachX, attachY, 0);
    pivot.rotation.z = theta * 0.6;
    pivot.rotation.y = (Math.sin(t * 0.35) * 0.28 + clamp(vy * 0.0004, -0.2, 0.2)) * motion;
    pivot.rotation.x = -0.2 + clamp(vy * 0.0002, -0.25, 0.25) * motion;

    abdomen.scale.set(
      abdomenBase.x,
      abdomenBase.y * (1 + Math.sin(t * 1.6) * 0.012 * motion),
      abdomenBase.z
    );

    for (const l of legs) poseLeg(l, gait, energy);

    // thread: anchored above the viewport, always ends exactly at the spider
    const ax = 0;
    const ay = H / 2 + 12;
    const bow = clamp(-omega * 18, -14, 14);
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const env = Math.sin(Math.PI * s);
      const px = ax + (attachX - ax) * s;
      const py = ay + (attachY - ay) * s;
      const shimmer = Math.sin(s * 14 - t * 3) * 0.7 * (0.4 + energy) * env * motion;
      tp.setXYZ(i, px + bow * env + shimmer, py, 0);
      ta.setXYZ(i, px + bow * 1.15 * env + 1.1 + shimmer * -0.8, py, -0.5);
    }
    tp.needsUpdate = true;
    ta.needsUpdate = true;

    if (anchorWeb) anchorWeb.rotation.z = Math.sin(t * 0.5) * 0.008 * motion;

    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      canvas.style.opacity = "1";
    }
  };
  raf = requestAnimationFrame(tick);

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  /* ---- cleanup ---- */
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("load", recalcScroll);
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    ro.disconnect();
    roBody.disconnect();

    scene.traverse((o) => {
      const m = o as ThreeNS.Mesh;
      m.geometry?.dispose?.();
    });
    [bodyMat, abdomenMat, legMat, eyeMat, threadMain.material, threadAux.material].forEach((mat) =>
      (mat as ThreeNS.Material).dispose()
    );
    if (anchorWeb) (anchorWeb.material as ThreeNS.Material).dispose();
    abdomenTex.dispose();
    envTarget.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
}

/* Procedural abdomen markings: dark base, speckle, muted chevrons. */
function makeAbdomenTexture(THREE: Three) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1b1d23";
  g.fillRect(0, 0, 256, 256);

  // speckle
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${90 + Math.random() * 60},${90 + Math.random() * 60},${
      100 + Math.random() * 60
    },${Math.random() * 0.12})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // dorsal markings, centred on u = 0.25 (the +Z face of the sphere → x = 64)
  g.lineCap = "round";
  for (let k = 0; k < 7; k++) {
    const yy = 50 + k * 22;
    const w = 26 - k * 2.2;
    g.strokeStyle = `rgba(150,160,185,${0.34 - k * 0.03})`;
    g.lineWidth = 3.2 - k * 0.25;
    g.beginPath();
    g.moveTo(64 - w, yy);
    g.lineTo(64, yy + 13);
    g.lineTo(64 + w, yy);
    g.stroke();
  }
  g.strokeStyle = "rgba(150,160,185,0.18)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(64, 36);
  g.lineTo(64, 220);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}