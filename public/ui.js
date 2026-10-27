// Ekran yardımcıları.

export const $ = (sel) => document.querySelector(sel);

export const store = {
  get(key) {
    try { return localStorage.getItem(`palaz.${key}`); } catch { return null; }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(`palaz.${key}`);
      else localStorage.setItem(`palaz.${key}`, value);
    } catch { /* gizli sekme vb. */ }
  },
};

// innerHTML'e giren kullanıcı metinleri için.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

export const vibrate = () => navigator.vibrate?.(12);

// Tema: "auto" sistemi izler, "light"/"dark" sabitler. index.html ilk boyamadan önce de uygular.
export const theme = () => store.get("theme") || "auto";
export function setTheme(mode) {
  store.set("theme", mode === "auto" ? null : mode);
  if (mode === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = mode;
  const dark = mode === "dark" || (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0B0C10" : "#E7E4DD");
}

let toastTimer;
export function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}
