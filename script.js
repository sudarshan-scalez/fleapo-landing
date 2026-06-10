const modal = document.querySelector("#contactModal");
const menu = document.querySelector(".menu");
const nav = document.querySelector(".nav-pill nav");
const form = document.querySelector("#contactForm");

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

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const counters = document.querySelectorAll("[data-count]");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix ?? "+";
    if (reducedMotion) {
      el.textContent = `${target}${suffix}`;
      observer.unobserve(el);
      return;
    }
    let value = 0;
    const step = Math.max(1, Math.round(target / 32));
    const tick = () => {
      value = Math.min(target, value + step);
      el.textContent = `${value}${suffix}`;
      if (value < target) requestAnimationFrame(tick);
    };
    tick();
    observer.unobserve(el);
  });
}, { threshold: 0.4 });

counters.forEach((counter) => observer.observe(counter));
