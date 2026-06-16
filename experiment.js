/* ── Experiment layer: 3D + interactive behaviour ───────────
   Runs alongside script.js. All effects are progressive: if THREE
   is missing, the device is touch, or reduced-motion is on, the page
   falls back to the standard styles.css experience. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ── Hero neural-network particle field (Three.js) ──────────── */
function initHero3D() {
  const canvas = document.getElementById("bg3d");
  if (!canvas || reduced || !window.THREE) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 17;

  const group = new THREE.Group();
  scene.add(group);

  const COUNT = window.innerWidth < 768 ? 70 : 130;
  const SPREAD = { x: 15, y: 9.5, z: 8 };
  const LINK_DIST = 3.4;

  const nodes = [];
  const posArr = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const p = new THREE.Vector3(
      (Math.random() * 2 - 1) * SPREAD.x,
      (Math.random() * 2 - 1) * SPREAD.y,
      (Math.random() * 2 - 1) * SPREAD.z
    );
    const v = new THREE.Vector3(
      (Math.random() * 2 - 1) * 0.006,
      (Math.random() * 2 - 1) * 0.006,
      (Math.random() * 2 - 1) * 0.006
    );
    nodes.push({ p, v });
    posArr.set([p.x, p.y, p.z], i * 3);
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  const points = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.11,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  group.add(points);

  const segArr = new Float32Array(COUNT * COUNT * 3);
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute("position", new THREE.BufferAttribute(segArr, 3));
  const lines = new THREE.LineSegments(
    lGeo,
    new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  group.add(lines);

  let mx = 0, my = 0;
  window.addEventListener("mousemove", (e) => {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || 700;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) tick();
  });

  function tick() {
    if (!running) return;
    // drift nodes inside the box, bounce at edges
    for (let i = 0; i < COUNT; i++) {
      const n = nodes[i];
      n.p.add(n.v);
      if (Math.abs(n.p.x) > SPREAD.x) n.v.x *= -1;
      if (Math.abs(n.p.y) > SPREAD.y) n.v.y *= -1;
      if (Math.abs(n.p.z) > SPREAD.z) n.v.z *= -1;
      posArr.set([n.p.x, n.p.y, n.p.z], i * 3);
    }
    pGeo.attributes.position.needsUpdate = true;

    // rebuild links between nearby nodes
    let s = 0;
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const a = nodes[i].p, b = nodes[j].p;
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
          segArr.set([a.x, a.y, a.z, b.x, b.y, b.z], s);
          s += 6;
        }
      }
    }
    lGeo.setDrawRange(0, s / 3);
    lGeo.attributes.position.needsUpdate = true;

    group.rotation.y += 0.0006;
    // gentle parallax toward the cursor
    camera.position.x += (mx * 2.2 - camera.position.x) * 0.04;
    camera.position.y += (-my * 1.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* ── Cursor follower ring ───────────────────────────────────── */
function initCursor() {
  const dot = document.querySelector(".cursor-dot");
  if (!dot || !finePointer || reduced) return;
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  window.addEventListener("mousemove", (e) => {
    tx = e.clientX; ty = e.clientY;
    dot.classList.add("is-active");
  });
  (function loop() {
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
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

initHero3D();
initCursor();
initTilt();
initMagnetic();
