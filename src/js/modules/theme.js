// ==========================================
// MODULES / THEME.JS — Tema claro / escuro
// ==========================================
import { getSavedTheme, saveTheme } from "../core/storage.js";

/**
 * Aplica um tema ao documento e salva a preferência.
 * @param {"light"|"dark"} theme
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  saveTheme(theme);

  const icon = document.getElementById("theme-icon");
  if (icon) {
    icon.className = theme === "dark" ? "bx bx-sun" : "bx bx-moon";
  }
}

/** Alterna entre os temas claro e escuro. */
export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

/** Inicializa o tema e vincula o botão de alternância. */
export function initTheme() {
  applyTheme(getSavedTheme());

  const btn = document.getElementById("theme-toggle");
  if (btn) btn.addEventListener("click", toggleTheme);
}
