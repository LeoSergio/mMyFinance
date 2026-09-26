// ==========================================
// MODULES / BUDGET.JS — Orçamento por categoria
// ==========================================
import { getBudgets, saveBudgets } from "../core/storage.js";
import { showToast }               from "./toast.js";

const BUDGET_CATEGORIES = [
  { key: "alimentacao", label: "Alimentação",  icon: "bx bx-food-menu"       },
  { key: "essencial",   label: "Essenciais",   icon: "bx bx-home"            },
  { key: "transporte",  label: "Transporte",   icon: "bx bx-car"             },
  { key: "saude",       label: "Saúde",        icon: "bx bx-plus-medical"    },
  { key: "lazer",       label: "Lazer",        icon: "bx bx-game"            },
  { key: "outros",      label: "Outros",       icon: "bx bx-dots-horizontal" },
];

const monthKey = (item) => item.date.slice(0, 7);

function calcSpentByCategory(items) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const spent = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.key, 0]));

  items
    .filter((i) => monthKey(i) === currentMonth && i.type !== "Entrada")
    .forEach((i) => {
      const cat = i.category || "outros";
      if (spent[cat] !== undefined) spent[cat] += Number(i.amount);
      else spent["outros"] += Number(i.amount);
    });

  return spent;
}

export function checkBudgetAlerts(spent, budgets) {
  BUDGET_CATEGORIES.forEach((cat) => {
    const limit = budgets[cat.key];
    if (!limit || limit <= 0) return;

    const pct      = (spent[cat.key] / limit) * 100;
    const stateKey = `budget_alerted_${cat.key}_${new Date().toISOString().slice(0, 7)}`;
    const alerted  = localStorage.getItem(stateKey) || "none";

    if (pct >= 100 && alerted !== "over") {
      localStorage.setItem(stateKey, "over");
      showToast(`🚨 Limite de ${cat.label} ultrapassado!`, "danger", null, 6000);
    } else if (pct >= 80 && pct < 100 && alerted === "none") {
      localStorage.setItem(stateKey, "warn");
      showToast(`⚠️ Você usou ${pct.toFixed(0)}% do orçamento de ${cat.label}.`, "info", null, 5000);
    }
  });
}

function renderBudgetCard(cat, spent, limit) {
  const hasLimit    = limit && limit > 0;
  const pct         = hasLimit ? Math.min((spent / limit) * 100, 100) : 0;
  const isOverflow  = hasLimit && spent > limit;
  const overflowAmt = hasLimit ? Math.max(spent - limit, 0) : 0;

  let statusClass = "budget-ok";
  let statusLabel = "";
  if (hasLimit) {
    if (pct >= 100)     { statusClass = "budget-over"; statusLabel = "Ultrapassado"; }
    else if (pct >= 80) { statusClass = "budget-warn"; statusLabel = "Atenção";      }
    else                { statusClass = "budget-ok";   statusLabel = "";              }
  }

  const spentFmt = `R$ ${spent.toFixed(2)}`;
  const limitFmt = hasLimit ? `R$ ${Number(limit).toFixed(2)}` : "—";

  return `
    <div class="budget-card ${statusClass}" data-cat="${cat.key}">
      <div class="budget-card-top">
        <div class="budget-cat-info">
          <i class="${cat.icon}"></i>
          <span class="budget-cat-label">${cat.label}</span>
        </div>
        ${statusLabel ? `<span class="budget-status-badge">${statusLabel}</span>` : ""}
      </div>

      <div class="budget-values">
        <span class="budget-spent">${spentFmt}</span>
        <span class="budget-separator"> / </span>
        <span class="budget-limit">${limitFmt}</span>
      </div>

      ${hasLimit ? `
        <div class="budget-bar-wrap" title="${pct.toFixed(1)}% utilizado">
          <div class="budget-bar-fill" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="budget-bar-labels">
          <span class="budget-bar-pct">${pct.toFixed(0)}%</span>
          ${isOverflow ? `<span class="budget-overflow-label">+R$ ${overflowAmt.toFixed(2)} excedido</span>` : ""}
        </div>
      ` : `
        <p class="budget-no-limit"><i class="bx bx-info-circle"></i> Sem limite definido</p>
      `}
    </div>
  `;
}

function openBudgetModal() {
  const budgets = getBudgets();

  const existing = document.getElementById("budget-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id        = "budget-modal";
  overlay.className = "confirm-overlay";

  overlay.innerHTML = `
    <div class="confirm-box budget-modal-box">
      <div class="budget-modal-header">
        <div class="budget-modal-icon"><i class="bx bx-target-lock"></i></div>
        <div>
          <h3>Definir Orçamentos</h3>
          <p>Limite de gasto mensal por categoria</p>
        </div>
      </div>
      <div class="budget-fields">
        ${BUDGET_CATEGORIES.map((cat) => `
          <div class="budget-field-row">
            <label class="budget-field-label" for="budget-input-${cat.key}">
              <i class="${cat.icon}"></i>
              ${cat.label}
            </label>
            <div class="budget-field-input-wrap">
              <span class="budget-currency">R$</span>
              <input
                type="number"
                id="budget-input-${cat.key}"
                class="budget-field-input"
                placeholder="0,00"
                min="0"
                step="10"
                value="${budgets[cat.key] ? Number(budgets[cat.key]).toFixed(2) : ""}"
              >
            </div>
          </div>
        `).join("")}
      </div>
      <div class="confirm-actions" style="margin-top:1.5rem;">
        <button class="confirm-cancel" id="budget-modal-cancel">Cancelar</button>
        <button class="confirm-ok budget-save-btn" id="budget-modal-save">
          <i class="bx bx-save"></i> Salvar
        </button>
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

  overlay.querySelector("#budget-modal-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#budget-modal-save").addEventListener("click", () => {
    const updated = {};
    BUDGET_CATEGORIES.forEach((cat) => {
      const val = parseFloat(
        document.getElementById(`budget-input-${cat.key}`)?.value || "0"
      );
      if (!isNaN(val) && val > 0) updated[cat.key] = val;
    });
    saveBudgets(updated);
    close();
    showToast("Orçamentos salvos com sucesso!", "success");
    document.dispatchEvent(new CustomEvent("budgets-updated"));
  });

  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
}

export function buildBudgetSection(items) {
  const container = document.getElementById("budget-section");
  if (!container) return;

  const budgets     = getBudgets();
  const spent       = calcSpentByCategory(items);
  const hasBudgets  = Object.keys(budgets).length > 0;

  if (hasBudgets) checkBudgetAlerts(spent, budgets);

  const currentMonth = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const cards = BUDGET_CATEGORIES
    .map((cat) => renderBudgetCard(cat, spent[cat.key] || 0, budgets[cat.key]))
    .join("");

  container.innerHTML = `
    <div class="budget-header">
      <div class="budget-title-group">
        <h3 class="dash-title">
          <i class="bx bx-target-lock"></i> Orçamento por Categoria
        </h3>
        <span class="budget-month-badge">
          <i class="bx bx-calendar"></i> ${currentMonth}
        </span>
      </div>
      <button class="budget-config-btn" id="btn-open-budget-modal">
        <i class="bx bx-cog"></i> Definir limites
      </button>
    </div>
    <div class="budget-grid">${cards}</div>
  `;

  document.getElementById("btn-open-budget-modal")
    ?.addEventListener("click", openBudgetModal);
}
