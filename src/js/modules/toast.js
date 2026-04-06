// ==========================================
// MODULES / TOAST.JS — Notificações e confirmações
// ==========================================

let toastTimeout = null;

export function showToast(message, type = "info", action = null, duration = 4000) {
  document.getElementById("app-toast")?.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const icons = { info: "bx-info-circle", success: "bx-check-circle", danger: "bx-error-circle" };

  const toast = document.createElement("div");
  toast.id        = "app-toast";
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <i class="bx ${icons[type] || "bx-info-circle"} toast-icon"></i>
    <span class="toast-msg">${message}</span>
    ${action ? `<button class="toast-action">${action.label}</button>` : ""}
    <button class="toast-close"><i class="bx bx-x"></i></button>
  `;

  // Sempre filho direto do body para não herdar stacking context de transforms
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("toast--visible")));

  const dismiss = () => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  };

  if (action) {
    toast.querySelector(".toast-action").addEventListener("click", () => {
      action.fn(); dismiss(); clearTimeout(toastTimeout);
    });
  }
  toast.querySelector(".toast-close").addEventListener("click", () => {
    dismiss(); clearTimeout(toastTimeout);
  });

  toastTimeout = setTimeout(dismiss, duration);
}

export function showConfirm(message, onConfirm) {
  document.getElementById("app-confirm")?.remove();

  const overlay = document.createElement("div");
  overlay.id        = "app-confirm";
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-icon"><i class="bx bx-trash"></i></div>
      <p class="confirm-msg">${message}</p>
      <div class="confirm-actions">
        <button class="confirm-cancel">Cancelar</button>
        <button class="confirm-ok">Excluir</button>
      </div>
    </div>
  `;

  // Sempre filho direto do body
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("confirm--visible")));

  const close = () => {
    overlay.classList.remove("confirm--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector(".confirm-cancel").addEventListener("click", close);
  overlay.querySelector(".confirm-ok").addEventListener("click", () => { onConfirm(); close(); });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  const escHandler = (e) => {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", escHandler); }
  };
  document.addEventListener("keydown", escHandler);
}
