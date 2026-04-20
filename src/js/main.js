// ==========================================
// MAIN.JS — Ponto de entrada da aplicação
// ==========================================
import state                              from "./core/state.js";
import { initTheme }                      from "./modules/theme.js";
import { initDrawer }                     from "./modules/drawer.js";
import { initGreeting }                   from "./modules/greeting.js";
import { renderItem, clearTable, updateTotals, updateSelectedDate } from "./modules/ui.js";
import { buildDashboard, categorizeItem } from "./modules/dashboard.js";
import { buildChart }                     from "./modules/chart.js";
import { showToast, showConfirm }         from "./modules/toast.js";
import { exportToCSV }                    from "./modules/export.js";
import { initReminders, scheduleReminder, removeReminderByIndex } from "./modules/reminder.js";

// ── Elementos do formulário ───────────────────────────────────────
const descInput   = document.querySelector("#desc");
const amountInput = document.querySelector("#amount");
const dateInput   = document.querySelector("#date");
const typeSelect  = document.querySelector("#type");
const btnNew      = document.querySelector("#btnNew");

// Data padrão = hoje
dateInput.value = new Date().toISOString().slice(0, 10);

// ── Estado do modo edição ─────────────────────────────────────────
let editingIndex = null;

// ── Renderização reativa ──────────────────────────────────────────
function render(items) {
  clearTable();
  items.forEach((item, index) =>
    renderItem(item, index, handleDelete, handleEdit)
  );
  updateTotals(items);
  buildDashboard(items);
  buildChart(items);
}

state.subscribe(render);

// ── Ação: incluir / salvar edição ─────────────────────────────────
btnNew.addEventListener("click", () => {
  if (!descInput.value || !amountInput.value || !typeSelect.value || !dateInput.value) {
    showToast("Preencha todos os campos!", "danger");
    return;
  }

  const item = {
    date:     dateInput.value,
    desc:     descInput.value,
    amount:   Math.abs(amountInput.value).toFixed(2),
    type:     typeSelect.value,
    category: categorizeItem(descInput.value),
  };

  const today    = new Date().toISOString().slice(0, 10);
  const isFuture = item.date > today;

  if (editingIndex !== null) {
    // Remove lembrete antigo antes de atualizar
    removeReminderByIndex(editingIndex);
    state.update(editingIndex, item);
    // Agenda novo lembrete se data futura
    if (isFuture) scheduleReminder(item, editingIndex);
    showToast("Lançamento atualizado!", "success");
    cancelEdit();
  } else {
    state.add(item);
    const newIndex = state.items.length - 1;
    // Agenda lembrete e informa o usuário
    if (isFuture) {
      scheduleReminder(item, newIndex);
      showToast("Lançamento agendado! Você receberá um lembrete na data.", "info", null, 5000);
    } else {
      showToast("Lançamento adicionado!", "success");
    }
  }

  descInput.value   = "";
  amountInput.value = "";
  dateInput.value   = new Date().toISOString().slice(0, 10);
});

// ── Ação: editar ──────────────────────────────────────────────────
function handleEdit(index) {
  const item = state.items[index];
  descInput.value   = item.desc;
  amountInput.value = item.amount;
  dateInput.value   = item.date;
  typeSelect.value  = item.type;

  editingIndex = index;
  btnNew.innerHTML  = '<i class="bx bx-save"></i> Salvar';
  btnNew.classList.add("btn--editing");

  if (!document.getElementById("btnCancelEdit")) {
    const btnCancel     = document.createElement("button");
    btnCancel.id        = "btnCancelEdit";
    btnCancel.innerHTML = '<i class="bx bx-x"></i> Cancelar';
    btnCancel.className = "btn-cancel-edit";
    btnNew.insertAdjacentElement("afterend", btnCancel);
    btnCancel.addEventListener("click", cancelEdit);
  }

  descInput.focus();
  descInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEdit() {
  editingIndex      = null;
  btnNew.innerHTML  = '<i class="bx bx-plus-circle"></i> Incluir';
  btnNew.classList.remove("btn--editing");
  descInput.value   = "";
  amountInput.value = "";
  dateInput.value   = new Date().toISOString().slice(0, 10);
  document.getElementById("btnCancelEdit")?.remove();
}

// ── Ação: excluir com confirmação ─────────────────────────────────
function handleDelete(index) {
  const item = state.items[index];
  showConfirm(
    `Excluir "<strong>${item.desc}</strong>"?`,
    () => {
      removeReminderByIndex(index);
      state.remove(index);
      showToast("Lançamento excluído.", "info");
    }
  );
}

// ── Ação: data selecionada ────────────────────────────────────────
dateInput.addEventListener("change", () => {
  updateSelectedDate(dateInput.value);

  // Avisa o usuário se selecionou data futura
  const today = new Date().toISOString().slice(0, 10);
  if (dateInput.value > today) {
    showToast("Data futura selecionada — um lembrete será enviado no dia do lançamento.", "info", null, 4000);
  }
});

// ── Ação: imprimir ────────────────────────────────────────────────
window.btnPrint = () => window.print();

// ── Ação: exportar CSV ────────────────────────────────────────────
window.btnExport = () => {
  exportToCSV(state.items);
  showToast("Arquivo CSV gerado! Importe no Google Sheets.", "success", null, 5000);
};

// ── PWA: registra service worker e botão de instalação ───────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

let deferredInstallPrompt = null;
const btnInstall = document.getElementById("btnInstall");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  btnInstall.style.display = "flex";
});

btnInstall.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === "accepted") {
    btnInstall.style.display = "none";
    showToast("App instalado com sucesso!", "success");
  }
  deferredInstallPrompt = null;
});

window.addEventListener("appinstalled", () => {
  btnInstall.style.display = "none";
  deferredInstallPrompt = null;
});

window.addEventListener("appinstalled", () => {
  console.log("O usuário instalou o MyFinance!");
  if (typeof gtag === "function") {
    gtag("event", "pwa_install", { app_name: "MyFinance", origem: "Instalação pelo Navegador" });
  }
});

// ── Inicialização ─────────────────────────────────────────────────
initTheme();
initDrawer();
initGreeting();
state.load();
initReminders();

// ── Banner de permissão de notificação ───────────────────────────
(function initNotificationBanner() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") return;
  if (localStorage.getItem("notif_banner_dismissed")) return;

  const banner  = document.getElementById("notification-banner");
  const btnAllow   = document.getElementById("btn-allow-notifications");
  const btnDismiss = document.getElementById("btn-dismiss-banner");

  if (!banner) return;
  banner.style.display = "flex";

  btnAllow.addEventListener("click", async () => {
    const granted = await Notification.requestPermission();
    banner.style.display = "none";
    if (granted === "granted") {
      showToast("Lembretes ativados!", "success");
      initReminders();
    } else {
      showToast("Permissão negada. Você pode ativar nas configurações do navegador.", "info", null, 5000);
    }
  });

  btnDismiss.addEventListener("click", () => {
    banner.style.display = "none";
    localStorage.setItem("notif_banner_dismissed", "1");
  });
})();
