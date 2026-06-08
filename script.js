const modal = document.querySelector("#contactModal");
const menu = document.querySelector(".menu");
const nav = document.querySelector(".nav-pill nav");

document.querySelectorAll(".open-modal").forEach((button) => {
  button.addEventListener("click", () => modal.showModal());
});

menu.addEventListener("click", () => {
  nav.classList.toggle("open");
});

document.querySelectorAll(".faq-list details").forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    document.querySelectorAll(".faq-list details").forEach((other) => {
      if (other !== detail) other.open = false;
    });
  });
});

const counters = document.querySelectorAll("[data-count]");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.count);
    const suffix = el.textContent.includes("K") ? "K+" : "+";
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
