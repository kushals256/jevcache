const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const nav = document.querySelector(".nav");
const menuBtn = document.querySelector(".menu-btn");
const menu = document.querySelector(".nav-links");
const copyBtn = document.querySelector("[data-copy]");
const stage = document.querySelector(".stage");
const signal = document.querySelector(".signal");
const path = document.querySelector(".path");

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

copyBtn?.addEventListener("click", async () => {
  const text = copyBtn.getAttribute("data-copy") || "";
  try {
    await navigator.clipboard.writeText(text);
    const prev = copyBtn.textContent;
    copyBtn.textContent = "Copied";
    setTimeout(() => {
      copyBtn.textContent = prev;
    }, 1600);
  } catch {
    copyBtn.textContent = text;
  }
});

function showHit() {
  stage?.classList.add("hit");
  signal?.classList.add("flash");
}

function arm() {
  document.body.classList.add("ready");
  if (reduce) showHit();
  else setTimeout(showHit, 1100);
}

if (document.readyState === "complete") arm();
else window.addEventListener("load", arm);

if (path && "IntersectionObserver" in window && !reduce) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          path.classList.add("drawn");
          io.disconnect();
        }
      }
    },
    { threshold: 0.4 },
  );
  io.observe(path);
} else {
  path?.classList.add("drawn");
}
