// ==========================================
// MODULES / DRAWER.JS — Menu lateral (drawer)
// ==========================================

/** Inicializa o menu hambúrguer e seus eventos de abertura/fechamento. */
export function initDrawer() {
  const toggle  = document.getElementById("menu-toggle");
  const close   = document.getElementById("menu-close");
  const drawer  = document.getElementById("nav-drawer");
  const overlay = document.getElementById("nav-overlay");

  if (!toggle || !drawer) return;

  const open = () => {
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const shut = () => {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  };

  toggle.addEventListener("click", open);
  close.addEventListener("click", shut);
  overlay.addEventListener("click", shut);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") shut();
  });
}
