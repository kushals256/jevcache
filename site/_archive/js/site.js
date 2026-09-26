const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const nav = document.querySelector(".nav");
const menuBtn = document.querySelector(".menu-btn");
const menu = document.querySelector(".nav-links");
const copyBtns = document.querySelectorAll("[data-copy], [data-copy-target]");
const stage = document.querySelector(".stage");

window.addEventListener("scroll", () => {
  nav?.classList.toggle("scrolled", window.scrollY > 24);
}, { passive: true });

menuBtn?.addEventListener("click", () => {
  const open = menu?.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
});

menu?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    menu.classList.remove("open");
    menuBtn?.setAttribute("aria-expanded", "false");
  });
});

copyBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const target = btn.getAttribute("data-copy-target");
    const text = target
      ? (document.querySelector(target)?.textContent || "").trim()
      : btn.getAttribute("data-copy") || "";
    const prev = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Copy failed";
    }
    setTimeout(() => {
      btn.textContent = prev;
    }, 1600);
  });
});

function setCount(sel, value) {
  const el = document.querySelector(sel);
  if (el && Number.isFinite(value)) el.textContent = value.toLocaleString("en-US");
}

fetch("https://api.github.com/repos/kushals256/jevcache")
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => setCount("[data-stars]", d?.stargazers_count))
  .catch(() => {});

fetch("https://api.npmjs.org/downloads/point/last-month/@kushalicious/jevcache")
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => setCount("[data-installs]", d?.downloads))
  .catch(() => {});

function showHit() {
  stage?.classList.add("hit");
}

function arm() {
  document.body.classList.add("ready");
  if (reduce) showHit();
  else setTimeout(showHit, 1100);
}

if (document.readyState === "complete") arm();
else window.addEventListener("load", arm);
