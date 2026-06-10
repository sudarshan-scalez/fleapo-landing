const modal = document.querySelector("#contactModal");
const menu = document.querySelector(".menu");
const nav = document.querySelector(".nav-pill nav");
const form = document.querySelector("#contactForm");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".open-modal").forEach((button) => {
  button.addEventListener("click", () => modal.showModal());
});

modal.querySelector(".close").addEventListener("click", () => modal.close());

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const body = [
    `Name: ${data.get("name")}`,
    `Company: ${data.get("company")}`,
    `Role: ${data.get("role")}`,
    `What they want to build: ${data.get("brief")}`,
    `Journey stage: ${data.get("stage")}`,
    `Timeline: ${data.get("timeline")}`,
  ].join("\n");
  window.location.href = `mailto:info@fleapo.com?subject=${encodeURIComponent(
    `New enquiry from ${data.get("name")} (${data.get("company")})`
  )}&body=${encodeURIComponent(body)}`;
  modal.close();
  form.reset();
});

menu.addEventListener("click", () => {
  nav.classList.toggle("open");
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

document.querySelectorAll(".faq-list details").forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    document.querySelectorAll(".faq-list details").forEach((other) => {
      if (other !== detail) other.open = false;
    });
  });
});

/* ── Leap tabs ↔ capability cards ─────────────────────────── */
const tabs = [...document.querySelectorAll(".tabs [data-leap]")];
const capabilitiesWrap = document.querySelector(".capabilities");
const capabilityCards = [...capabilitiesWrap.querySelectorAll("article")];

const activateLeap = (index) => {
  tabs.forEach((tab, i) => {
    tab.classList.toggle("active", i === index);
    tab.setAttribute("aria-selected", i === index ? "true" : "false");
  });
  capabilityCards.forEach((card, i) => card.classList.toggle("active", i === index));
  capabilitiesWrap.classList.add("has-focus");
};

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => {
    activateLeap(i);
    if (window.matchMedia("(max-width: 900px)").matches) {
      capabilityCards[i].scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    }
  });
});
capabilityCards.forEach((card, i) => {
  card.addEventListener("click", () => activateLeap(i));
});
activateLeap(0);

/* ── Animated counters (eased) ────────────────────────────── */
const counters = document.querySelectorAll("[data-count]");
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.count);
    const prefix = el.dataset.prefix ?? "";
    const suffix = el.dataset.suffix ?? "+";
    counterObserver.unobserve(el);
    if (reducedMotion) {
      el.textContent = `${prefix}${target}${suffix}`;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      el.textContent = `${prefix}${Math.round(target * easeOutCubic(progress))}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.4 });
counters.forEach((counter) => counterObserver.observe(counter));

/* ── Scroll-reveal ────────────────────────────────────────── */
const supportsIO = "IntersectionObserver" in window;
const revealTargets = supportsIO ? document.querySelectorAll(
  ".band .section-label, .band h2, .band .lead, .gap-card, .capabilities article, " +
  ".diagnosis p, .diagnosis .primary, .proof-copy, .report, .case-card, .trust-banner, " +
  ".founder-copy, .portrait, .community, .faq > div:first-child, .faq-list, " +
  ".final-cta h2, .final-cta p, .final-cta .primary"
) : [];
let staggerParent = null;
let staggerIndex = 0;
revealTargets.forEach((el) => {
  if (el.parentElement !== staggerParent) {
    staggerParent = el.parentElement;
    staggerIndex = 0;
  }
  el.classList.add("reveal");
  el.style.setProperty("--reveal-i", staggerIndex++);
});
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    el.classList.add("in");
    revealObserver.unobserve(el);
    // Drop reveal classes once the entrance finishes so card hover
    // transitions aren't slowed by the reveal's duration/delay.
    el.addEventListener(
      "transitionend",
      () => {
        el.classList.remove("reveal", "in");
        el.style.removeProperty("--reveal-i");
      },
      { once: true }
    );
    if (reducedMotion) {
      el.classList.remove("reveal", "in");
      el.style.removeProperty("--reveal-i");
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
revealTargets.forEach((el) => revealObserver.observe(el));

/* ── Nav scrollspy ────────────────────────────────────────── */
const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
const spyTargets = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) =>
      link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)
    );
  });
}, { rootMargin: "-40% 0px -55% 0px" });
spyTargets.forEach((section) => spyObserver.observe(section));
