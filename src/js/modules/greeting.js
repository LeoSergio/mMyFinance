// ==========================================
// MODULES / GREETING.JS — Saudação ao usuário
// ==========================================
import { getUserName, saveUserName } from "../core/storage.js";

/** Retorna a saudação de acordo com o horário atual. */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Exibe o banner de boas-vindas com o nome do usuário.
 * @param {string} name
 */
function showWelcomeBanner(name) {
  const banner = document.getElementById("welcome-banner");
  const text   = document.getElementById("welcome-text");
  if (!banner || !text) return;

  text.textContent = `${getGreeting()}, ${name}! 👋`;
  banner.style.display = "flex";
}

/** Exibe o modal de coleta de nome caso o usuário ainda não tenha se identificado. */
function showNameModal() {
  const modal = document.getElementById("name-modal");
  const input = document.getElementById("name-input");
  const btn   = document.getElementById("name-submit");

  if (!modal) return;
  modal.classList.add("active");

  const submit = () => {
    const val = input.value.trim();
    if (!val) {
      input.classList.add("shake");
      setTimeout(() => input.classList.remove("shake"), 400);
      return;
    }
    saveUserName(val);
    modal.classList.remove("active");
    showWelcomeBanner(val);
  };

  btn.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  setTimeout(() => input.focus(), 300);
}

/** Inicializa a saudação: exibe o banner ou solicita o nome do usuário. */
export function initGreeting() {
  const name = getUserName();
  if (name) {
    showWelcomeBanner(name);
  } else {
    showNameModal();
  }
}
