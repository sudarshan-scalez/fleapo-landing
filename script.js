const modal = document.querySelector("#contactModal");
const menu = document.querySelector(".menu");
const nav = document.querySelector(".nav-pill nav");
const form = document.querySelector("#contactForm");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".open-modal").forEach((button) => {
  button.addEventListener("click", () => modal.showModal());
});

modal.querySelectorAll(".close").forEach((btn) =>
  btn.addEventListener("click", () => modal.close())
);

/* ── Mailchimp submission (JSONP, no redirect) ────────────── */
const MC_URL = "https://fleapo.us4.list-manage.com/subscribe/post-json";
// No f_id: the saved form config still marks the old Company field required.
// Omitting it validates against the audience's own field settings instead.
const MC_PARAMS = "u=e15f0379c2077a0cf596534b4&id=10e1e0cd05";
const formMsg = document.querySelector("#formMsg");
const formSubmit = document.querySelector("#formSubmit");

const setFormMsg = (text, type) => {
  formMsg.textContent = text;
  formMsg.className = `form-msg ${type}`;
};

/* ── Inline Calendly hand-off after a successful lead ─────── */
const CALENDLY_URL = "https://calendly.com/pm-fleapo/fleapo-discovery-call-clone";
const bookingView = document.querySelector("#bookingView");
const calendlyInline = document.querySelector("#calendlyInline");

const showBooking = (fullname, email) => {
  form.hidden = true;
  bookingView.hidden = false;
  if (calendlyInline.dataset.loaded) return;
  const url = new URL(CALENDLY_URL);
  url.searchParams.set("hide_gdpr_banner", "1");
  // Use Calendly's default light theme: its "Enter Details" step always renders
  // white input boxes, so a custom dark text_color would make typed/prefilled
  // text invisible (white-on-white). Light theme keeps dark text on white inputs.
  url.searchParams.set("primary_color", "00e5ff");
  if (fullname) url.searchParams.set("name", fullname);
  if (email) url.searchParams.set("email", email);
  const init = () => {
    if (!window.Calendly) return false;
    window.Calendly.initInlineWidget({ url: url.toString(), parentElement: calendlyInline });
    calendlyInline.dataset.loaded = "1";
    return true;
  };
  if (!init()) {
    const timer = setInterval(() => { if (init()) clearInterval(timer); }, 150);
    setTimeout(() => clearInterval(timer), 8000);
  }
};

// Reset to the form view whenever the modal is reopened.
modal.addEventListener("close", () => {
  form.hidden = false;
  bookingView.hidden = true;
  setFormMsg("", "");
});

// When the visitor finishes booking in the embed, send them to the confirmation page.
window.addEventListener("message", (e) => {
  if (e.origin.includes("calendly.com") && e.data?.event === "calendly.event_scheduled") {
    window.location.href = "/confirmation";
  }
});

const validateForm = () => {
  for (const field of form.querySelectorAll("[required]")) {
    if (!field.value.trim()) {
      field.focus();
      setFormMsg(`Please fill in “${field.closest("label").firstChild.textContent.replace(" *", "").trim()}”.`, "error");
      return false;
    }
  }
  const email = form.EMAIL.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    form.EMAIL.focus();
    setFormMsg("Please enter a valid email address.", "error");
    return false;
  }
  const phone = form.PHONE.value.replace(/[\s()-]/g, "");
  if (!/^\+?\d{7,15}$/.test(phone)) {
    form.PHONE.focus();
    setFormMsg("Please enter a valid phone number (include country code).", "error");
    return false;
  }
  if (!form.querySelectorAll('input[name="goal"]:checked').length) {
    setFormMsg("Please select at least one thing you'd like to achieve with AI.", "error");
    return false;
  }
  return true;
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateForm()) return;

  const fullname = form.fullname.value.trim();
  const [fname, ...rest] = fullname.split(/\s+/);
  const goals = [...form.querySelectorAll('input[name="goal"]:checked')].map((c) => c.value).join(", ");
  const params = new URLSearchParams({
    EMAIL: form.EMAIL.value.trim(),
    FNAME: fname,
    LNAME: rest.join(" ") || fname,
    PHONE: form.PHONE.value.trim(),
    WEBSITE: form.WEBSITE.value.trim(),
    MMERGE7: form.MMERGE7.value,
    GOALS: goals,
    CSIZE: form.CSIZE.value,
    MMERGE10: form.MMERGE10.value,
  });
  const honeypot = form.querySelector('[name^="b_"]');
  if (honeypot.value) return; // bot

  formSubmit.disabled = true;
  formSubmit.textContent = "Sending…";
  setFormMsg("", "");

  const cb = `mcCallback_${Date.now()}`;
  const script = document.createElement("script");
  const cleanup = () => {
    delete window[cb];
    script.remove();
    formSubmit.disabled = false;
    formSubmit.textContent = "Submit →";
  };
  window[cb] = (res) => {
    cleanup();
    // "already subscribed" still means a valid lead — treat as success and book.
    const alreadyIn = /already subscribed/i.test(res.msg || "");
    if (res.result === "success" || alreadyIn) {
      showBooking(fullname, form.EMAIL.value.trim());
      form.reset();
    } else {
      const msg = (res.msg || "Something went wrong. Please try again.").replace(/^\d+\s*-\s*/, "");
      setFormMsg(msg, "error");
    }
  };
  script.onerror = () => {
    cleanup();
    setFormMsg("Network error — please try again, or email info@fleapo.com.", "error");
  };
  script.src = `${MC_URL}?${MC_PARAMS}&c=${cb}&${params.toString()}`;
  document.body.appendChild(script);
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
