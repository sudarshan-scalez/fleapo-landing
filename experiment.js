/* ── Experiment layer: "Readiness Corridor" 3D scroll journey ──
   A fixed full-page Three.js scene. Scrolling flies the camera forward
   through a particle corridor that morphs (on the GPU) from scattered
   chaos (AI-curious) into an ordered glowing lattice (AI-native).
   Progressive: no THREE / no WebGL / reduced-motion all degrade gracefully. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const isMobile = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// piecewise-linear keyframe lookup: stops = [[p,val],...]
function ramp(p, stops) {
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) {
      const [p0, v0] = stops[i - 1], [p1, v1] = stops[i];
      return lerp(v0, v1, (p - p0) / (p1 - p0 || 1));
    }
  }
  return stops[stops.length - 1][1];
}

/* ── The corridor scene ─────────────────────────────────────── */
function initJourney() {
  const canvas = document.getElementById("bg3d");
  if (!canvas || !window.THREE) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile, powerPreference: "high-performance" });
  } catch (e) {
    canvas.style.display = "none";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080808, 0.05);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 240);
  camera.position.set(0, 0, 18);

  /* grid lattice (ordered destination) + chaos (scattered start) */
  const G = isMobile ? { nx: 12, ny: 6, nz: 16 } : { nx: 20, ny: 10, nz: 20 };
  const COUNT = G.nx * G.ny * G.nz;

  const chaos = new Float32Array(COUNT * 3);   // = "position" attribute
  const lattice = new Float32Array(COUNT * 3);
  const delay = new Float32Array(COUNT);
  const psize = new Float32Array(COUNT);
  const idxOf = (i, j, k) => i * G.ny * G.nz + j * G.nz + k;

  for (let i = 0; i < G.nx; i++)
    for (let j = 0; j < G.ny; j++)
      for (let k = 0; k < G.nz; k++) {
        const n = idxOf(i, j, k);
        // ordered lattice node (a long corridor-shaped grid at the far end)
        const lx = (i / (G.nx - 1) - 0.5) * 24 + (Math.random() - 0.5) * 0.5;
        const ly = (j / (G.ny - 1) - 0.5) * 14 + (Math.random() - 0.5) * 0.5;
        const lz = -12 - (k / (G.nz - 1)) * 46 + (Math.random() - 0.5) * 0.5;
        lattice.set([lx, ly, lz], n * 3);
        // scattered chaos start, spread down the corridor (kept back from the
        // camera so near points don't blow up into giant blobs)
        chaos.set([
          (Math.random() - 0.5) * 46,
          (Math.random() - 0.5) * 28,
          6 - Math.random() * 74,
        ], n * 3);
        delay[n] = (k / (G.nz - 1)) * 0.28;        // assemble front-to-back
        psize[n] = 0.6 + Math.random() * 0.9;
      }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(chaos, 3));
  pGeo.setAttribute("aLattice", new THREE.BufferAttribute(lattice, 3));
  pGeo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(psize, 1));

  const uniforms = {
    uMorph: { value: 0 },
    uSize: { value: isMobile ? 9 : 12 },
    uBright: { value: 0.6 },
    uFog: { value: 0.05 },
    uColor: { value: new THREE.Color(0x00e5ff) },
  };

  const points = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aLattice;
      attribute float aDelay;
      attribute float aSize;
      uniform float uMorph;
      uniform float uSize;
      uniform float uFog;
      varying float vFog;
      void main() {
        float m = clamp((uMorph - aDelay) / max(1.0 - aDelay, 0.0001), 0.0, 1.0);
        m = m * m * (3.0 - 2.0 * m);
        vec3 pos = mix(position, aLattice, m);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        gl_PointSize = min(aSize * uSize * (300.0 / max(dist, 0.1)), 38.0);
        float fd = uFog * dist;
        vFog = clamp(exp(-fd * fd), 0.0, 1.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform vec3 uColor;
      uniform float uBright;
      varying float vFog;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, a * vFog * uBright);
      }
    `,
  }));
  points.frustumCulled = false;
  scene.add(points);

  /* lattice edges that fade IN as the structure forms */
  const edges = [];
  for (let i = 0; i < G.nx; i++)
    for (let j = 0; j < G.ny; j++)
      for (let k = 0; k < G.nz; k++) {
        if (i < G.nx - 1) edges.push(idxOf(i, j, k), idxOf(i + 1, j, k));
        if (j < G.ny - 1) edges.push(idxOf(i, j, k), idxOf(i, j + 1, k));
      }
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute("position", new THREE.BufferAttribute(lattice, 3));
  eGeo.setIndex(edges);
  const eMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const latticeLines = new THREE.LineSegments(eGeo, eMat);
  latticeLines.frustumCulled = false;
  scene.add(latticeLines);

  /* recycled depth rings = vanishing-point corridor */
  const RING_N = isMobile ? 22 : 40;
  const RING_GAP = 6;
  const RING_SPAN = RING_N * RING_GAP;
  const ringGeo = new THREE.RingGeometry(9.5, 9.7, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00a9c8, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const rings = [];
  for (let i = 0; i < RING_N; i++) {
    const r = new THREE.Mesh(ringGeo, ringMat);
    r.position.z = 14 - i * RING_GAP;
    rings.push(r);
    scene.add(r);
  }

  /* finale bloom sprite at the lattice core */
  const glowTex = makeGlowTexture();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x00e5ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.set(40, 40, 1);
  core.position.set(0, 0, -42);
  scene.add(core);

  /* case-study beacons (pulse when their card reveals / on hover) */
  const beacons = [];
  const cards = [...document.querySelectorAll(".case-card")];
  cards.forEach((card, i) => {
    const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x00e5ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    b.scale.set(7, 7, 1);
    b.position.set((i - 1.5) * 7, (i % 2 ? 1 : -1) * 3, -34);
    b.userData.pulse = 0;
    beacons.push(b);
    scene.add(b);
    card.addEventListener("mouseenter", () => (b.userData.pulse = 1));
  });
  if ("IntersectionObserver" in window && cards.length) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { const k = cards.indexOf(e.target); if (beacons[k]) beacons[k].userData.pulse = 1; } });
    }, { threshold: 0.5 });
    cards.forEach((c) => io.observe(c));
  }

  /* mouse parallax + scroll progress (single smoothed source of truth) */
  let mx = 0, my = 0;
  if (finePointer && !reduced) {
    window.addEventListener("mousemove", (e) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }
  let target = 0, p = 0;
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  };
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  /* tab clicks nudge the journey forward */
  let boost = 0;
  document.querySelectorAll(".tabs [data-leap]").forEach((t) => {
    t.addEventListener("click", () => { boost = Math.min(boost + 0.04, 0.1); });
  });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* reduced motion → one static ordered-lattice frame, no loop */
  if (reduced) {
    uniforms.uMorph.value = 1;
    uniforms.uBright.value = 0.85;
    uniforms.uFog.value = 0.022;
    eMat.opacity = 0.22;
    camera.position.set(0, 0, -34);
    camera.lookAt(0, 0, -44);
    renderer.render(scene, camera);
    return;
  }

  // Apply a progress value (0..1) to the whole scene and render one frame.
  function frame(pv) {
    const morph = clamp(ramp(pv, [[0.06, 0], [0.34, 0.45], [0.72, 0.9], [0.96, 1]]), 0, 1);
    uniforms.uMorph.value = morph;
    uniforms.uFog.value = ramp(pv, [[0, 0.05], [0.6, 0.026], [1, 0.018]]);
    uniforms.uBright.value = ramp(pv, [[0, 0.55], [0.5, 0.7], [0.78, 1.05], [0.96, 1.5], [1, 1.2]]);
    scene.fog.density = uniforms.uFog.value;
    eMat.opacity = clamp((morph - 0.4) * 0.45, 0, 0.26);

    camera.position.z = ramp(pv, [[0, 18], [0.52, 2], [0.6, 0], [0.95, -36], [1, -40]]);
    camera.position.x += (mx * 3 - camera.position.x) * 0.06;
    camera.position.y += (-my * 2 - camera.position.y) * 0.06;
    camera.lookAt(camera.position.x * 0.4, camera.position.y * 0.4, camera.position.z - 12);

    for (const r of rings) {
      if (r.position.z > camera.position.z + 16) r.position.z -= RING_SPAN;
    }

    core.material.opacity = ramp(pv, [[0.9, 0], [0.97, 0.7], [1, 0.55]]);
    core.scale.setScalar(ramp(pv, [[0.9, 26], [1, 48]]));

    for (const b of beacons) {
      if (b.userData.pulse > 0.001) {
        b.userData.pulse *= 0.95;
        b.material.opacity = b.userData.pulse * 0.8;
        b.scale.setScalar(7 + (1 - b.userData.pulse) * 6);
      } else b.material.opacity *= 0.9;
    }

    points.rotation.y = mx * 0.05;
    renderer.render(scene, camera);
  }
  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  function tick() {
    if (!running) return;
    p += (target + boost - p) * 0.06;
    boost *= 0.94;
    frame(p);
    requestAnimationFrame(tick);
  }
  tick();

  // debug hook (experiment only): pause the loop and render one progress frame
  window.__journeyDebug = (pv) => { running = false; frame(pv); };
}

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(0,229,255,.8)");
  grad.addColorStop(1, "rgba(0,229,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

/* ── Cursor follower ring ───────────────────────────────────── */
function initCursor() {
  const dot = document.querySelector(".cursor-dot");
  if (!dot || !finePointer || reduced) return;
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; dot.classList.add("is-active"); });
  (function loop() {
    x += (tx - x) * 0.2; y += (ty - y) * 0.2;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll("a, button, summary, .check, .tabs button").forEach((el) => {
    el.addEventListener("mouseenter", () => dot.classList.add("is-lg"));
    el.addEventListener("mouseleave", () => dot.classList.remove("is-lg"));
  });
}

/* ── 3D tilt on cards ───────────────────────────────────────── */
function initTilt() {
  if (!finePointer || reduced) return;
  const MAX = 7;
  document.querySelectorAll(".case-card, .capabilities article, .gap-card, .report").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(900px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg) translateY(-6px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

/* ── Subtle magnetic pull on primary buttons ────────────────── */
function initMagnetic() {
  if (!finePointer || reduced) return;
  document.querySelectorAll(".primary").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      btn.style.transform = `translate(${(px * 8).toFixed(1)}px, ${(py * 6).toFixed(1)}px)`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
  });
}

initJourney();
initCursor();
initTilt();
initMagnetic();
