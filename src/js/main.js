// ==========================================
// MAIN.JS — Ponto de entrada da aplicação
// ==========================================
import state                              from "./core/state.js";
import { getLocalDateString }             from "./core/date.js";
import { initTheme }                      from "./modules/theme.js";
import { initDrawer }                     from "./modules/drawer.js";
import { initGreeting }                   from "./modules/greeting.js";
import { renderTransactionsTable, initTableFilters, updateTotals, updateSelectedDate } from "./modules/ui.js";
import { buildDashboard, categorizeItem } from "./modules/dashboard.js";
import { buildChart }                     from "./modules/chart.js";
import { showToast, showConfirm }         from "./modules/toast.js";
import { exportToCSV }                    from "./modules/export.js";
import { initReminders, scheduleReminder, removeReminder } from "./modules/reminder.js";
import { buildRule5030 }                     from "./modules/rule5030.js";
import { buildGoals }                        from "./modules/goals.js";
import { getAllCategories, addCustomCategory, suggestCategory } from "./modules/category.js";

// ── Elementos do formulário ───────────────────────────────────────
const descInput     = document.querySelector("#desc");
const amountInput   = document.querySelector("#amount");
const dateInput     = document.querySelector("#date");
const typeSelect    = document.querySelector("#type");
const categorySelect = document.querySelector("#category");
const btnNew        = document.querySelector("#btnNew");

// Data padrão = hoje (fuso horário local)
dateInput.value = getLocalDateString();

// ── Gestão de Categorias no Formulário ────────────────────────────
let userManuallyPickedCategory = false;

function renderCategoryOptions(selectedKey = null) {
  if (!categorySelect) return;
  const cats = getAllCategories(state.items);
  const currentVal = selectedKey || categorySelect.value;

  categorySelect.innerHTML = `
    ${cats.map((c) => `<option value="${c.key}">${c.label}</option>`).join("")}
    <option value="__new__">+ Nova Categoria...</option>
  `;

  if (currentVal && cats.some((c) => c.key === currentVal)) {
    categorySelect.value = currentVal;
  } else if (cats.length > 0) {
    categorySelect.value = cats[0].key;
  }
}

categorySelect?.addEventListener("change", () => {
  if (categorySelect.value === "__new__") {
    const newName = window.prompt("Nome da nova categoria:");
    if (newName && newName.trim()) {
      const cleanName = newName.trim();
      addCustomCategory(cleanName);
      renderCategoryOptions(cleanName);
      categorySelect.value = cleanName;
      userManuallyPickedCategory = true;
      showToast(`Categoria "${cleanName}" adicionada!`, "success");
    } else {
      renderCategoryOptions();
    }
    return;
  }
  userManuallyPickedCategory = true;
});

// Auto-sugestão ao digitar a descrição
descInput.addEventListener("input", () => {
  if (!userManuallyPickedCategory && categorySelect) {
    const suggested = suggestCategory(descInput.value, typeSelect.value);
    categorySelect.value = suggested;
  }
});

// Ajuste da sugestão ao mudar o tipo
typeSelect.addEventListener("change", () => {
  if (!userManuallyPickedCategory && categorySelect) {
    const suggested = suggestCategory(descInput.value, typeSelect.value);
    categorySelect.value = suggested;
  }
});

// ── Estado do modo edição ─────────────────────────────────────────
let editingId = null;

// ── Renderização reativa ──────────────────────────────────────────
function render(items) {
  renderTransactionsTable(items, handleDelete, handleEdit);
  updateTotals(items);
  buildDashboard(items);
  buildChart(items);
  buildRule5030(items);
  buildGoals();
  renderCategoryOptions(categorySelect?.value);
}

state.subscribe(render);

// ── Ação: incluir / salvar edição ─────────────────────────────────
btnNew.addEventListener("click", () => {
  if (!descInput.value || !amountInput.value || !typeSelect.value || !dateInput.value) {
    showToast("Preencha todos os campos!", "danger");
    return;
  }

  const selectedCategory = categorySelect?.value || suggestCategory(descInput.value, typeSelect.value);

  const item = {
    date:     dateInput.value,
    desc:     descInput.value,
    amount:   Math.abs(amountInput.value).toFixed(2),
    type:     typeSelect.value,
    category: selectedCategory,
  };

  const today    = getLocalDateString();
  const isFuture = item.date > today;

  if (editingId !== null) {
    // Remove lembrete antigo antes de atualizar
    removeReminder(editingId);
    state.update(editingId, item);
    // Agenda novo lembrete se data futura
    if (isFuture) scheduleReminder({ ...item, id: editingId });
    showToast("Lançamento atualizado!", "success");
    cancelEdit();
  } else {
    const createdItem = state.add(item);
    // Agenda lembrete e informa o usuário
    if (isFuture) {
      scheduleReminder(createdItem);
      showToast("Lançamento agendado! Você receberá um lembrete na data.", "info", null, 5000);
    } else {
      showToast("Lançamento adicionado!", "success");
    }
  }

  descInput.value   = "";
  amountInput.value = "";
  dateInput.value   = getLocalDateString();
  userManuallyPickedCategory = false;
  renderCategoryOptions();
});

// ── Ação: editar ──────────────────────────────────────────────────
function handleEdit(id) {
  const item = typeof id === "object" ? id : state.getById(id);
  if (!item) return;

  descInput.value   = item.desc;
  amountInput.value = item.amount;
  dateInput.value   = item.date;
  typeSelect.value  = item.type;

  renderCategoryOptions(item.category);
  if (categorySelect) categorySelect.value = item.category;
  userManuallyPickedCategory = true;

  editingId = item.id;
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
  editingId         = null;
  btnNew.innerHTML  = '<i class="bx bx-plus-circle"></i> Incluir';
  btnNew.classList.remove("btn--editing");
  descInput.value   = "";
  amountInput.value = "";
  dateInput.value   = getLocalDateString();
  userManuallyPickedCategory = false;
  renderCategoryOptions();
  document.getElementById("btnCancelEdit")?.remove();
}

// ── Ação: excluir com confirmação ─────────────────────────────────
function handleDelete(id) {
  const item = typeof id === "object" ? id : state.getById(id);
  if (!item) return;

  showConfirm(
    `Excluir "<strong>${item.desc}</strong>"?`,
    () => {
      removeReminder(item.id);
      state.remove(item.id);
      showToast("Lançamento excluído.", "info");
    }
  );
}

// ── Ação: limpar dados por seleção ────────────────────────────────
window.btnClear = () => {
  const options = [
    { label: "Tudo",          value: "todos"    },
    { label: "Entradas",      value: "Entrada"  },
    { label: "Saídas Fixas",  value: "Fixo"     },
    { label: "Saídas Variáveis", value: "Variavel" },
  ];

  // Cria o modal de seleção
  const existing = document.getElementById("clear-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id        = "clear-modal";
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-icon" style="color:var(--color-expense)">
        <i class="bx bx-trash"></i>
      </div>
      <p class="confirm-msg">O que deseja limpar?</p>
      <div class="clear-options">
        ${options.map(o => `
          <button class="clear-option-btn" data-value="${o.value}">
            ${o.value === "todos" ? '<i class="bx bx-trash"></i>' : '<i class="bx bx-filter"></i>'}
            ${o.label}
          </button>
        `).join("")}
      </div>
      <div class="confirm-actions" style="margin-top:1rem">
        <button class="confirm-cancel">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => overlay.classList.add("confirm--visible"))
  );

  const close = () => {
    overlay.classList.remove("confirm--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector(".confirm-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelectorAll(".clear-option-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tipo = btn.dataset.value;
      close();

      const label = options.find(o => o.value === tipo).label;
      
      showConfirm(
        `Excluir permanentemente <strong>${label}</strong>?<br>
        <small style="color:var(--text-muted);font-size:0.8rem">Essa ação não pode ser desfeita.</small>`,
        () => {
          if (tipo === "todos") {
            state.clearAll();
          } else {
            state.removeByType(tipo);
          }
          showToast(`${label} removidas com sucesso.`, "success");
        }
      );
    });
  });

  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
};


// ── Ação: data selecionada ────────────────────────────────────────
dateInput.addEventListener("change", () => {
  updateSelectedDate(dateInput.value);

  // Avisa o usuário se selecionou data futura
  const today = getLocalDateString();
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
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      const promptUpdate = (worker) => {
        showToast("Nova versão do app disponível!", "info", {
          label: "Atualizar",
          fn: () => {
            if (worker) {
              worker.postMessage({ type: "SKIP_WAITING" });
            } else {
              window.location.reload();
            }
          },
        }, 12000);
      };

      if (reg.waiting) {
        promptUpdate(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            promptUpdate(newWorker);
          }
        });
      });
    } catch (err) {
      console.warn("Falha ao registrar ServiceWorker:", err);
    }
  });
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
renderCategoryOptions();
initTableFilters(() => renderTransactionsTable(state.items, handleDelete, handleEdit));
initReminders();

// Recarrega metas ao criar/editar/excluir
document.addEventListener("goals-updated", () => buildGoals());

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
