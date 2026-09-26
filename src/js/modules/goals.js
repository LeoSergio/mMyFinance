// ==========================================
// MODULES / GOALS.JS — Metas Financeiras
// ==========================================
import { getGoals, saveGoals } from "../core/storage.js";
import { showToast }           from "./toast.js";

// ── Ícones disponíveis para escolha ──────────────────────────────
const GOAL_ICONS = [
  { key: "bx-plane-alt",       label: "Viagem"      },
  { key: "bx-home",            label: "Casa"         },
  { key: "bx-car",             label: "Carro"        },
  { key: "bx-graduation",      label: "Educação"     },
  { key: "bx-heart",           label: "Saúde"        },
  { key: "bx-gift",            label: "Presente"     },
  { key: "bx-laptop",          label: "Tecnologia"   },
  { key: "bx-briefcase-alt-2", label: "Negócio"      },
  { key: "bx-shield",          label: "Reserva"      },
  { key: "bx-star",            label: "Sonho"        },
  { key: "bx-child",           label: "Família"      },
  { key: "bx-dumbbell",        label: "Bem-estar"    },
];

// Paleta de cores para as metas
const GOAL_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#a855f7", "#ec4899", "#14b8a6",
];

// ── Helpers ───────────────────────────────────────────────────────

const fmt     = (v)  => `R$ ${Number(v).toFixed(2)}`;
const genId   = ()   => `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function monthsBetween(fromDate, toDate) {
  const d1 = new Date(fromDate);
  const d2 = new Date(toDate);
  return Math.max(
    (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()),
    1
  );
}

function daysUntil(dateStr) {
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

// ── Renderização dos cards ────────────────────────────────────────

function renderGoalCard(goal) {
  const pct        = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  const remaining  = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const isComplete = goal.savedAmount >= goal.targetAmount;

  // Cálculos de prazo
  let deadlineInfo = "";
  let monthlyNeeded = null;
  let deadlineClass = "";

  if (goal.deadline) {
    const days   = daysUntil(goal.deadline);
    const months = monthsBetween(new Date().toISOString().slice(0, 10), goal.deadline);
    monthlyNeeded = remaining > 0 ? remaining / months : 0;

    if (isComplete) {
      deadlineInfo = `<span class="goal-deadline goal-deadline--done"><i class="bx bx-check-circle"></i> Meta concluída!</span>`;
    } else if (days < 0) {
      deadlineInfo = `<span class="goal-deadline goal-deadline--overdue"><i class="bx bx-error-circle"></i> Prazo encerrado</span>`;
      deadlineClass = "goal-card--overdue";
    } else if (days <= 30) {
      deadlineInfo = `<span class="goal-deadline goal-deadline--urgent"><i class="bx bx-time-five"></i> ${days} dia${days !== 1 ? "s" : ""} restante${days !== 1 ? "s" : ""}</span>`;
      deadlineClass = "goal-card--urgent";
    } else {
      const d = new Date(goal.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
      deadlineInfo = `<span class="goal-deadline"><i class="bx bx-calendar"></i> Até ${d}</span>`;
    }
  }

  const statusClass = isComplete ? "goal-card--complete" : deadlineClass;

  return `
    <div class="goal-card ${statusClass}" data-id="${goal.id}" style="--goal-color:${goal.color}">

      <!-- Cabeçalho -->
      <div class="goal-card-header">
        <div class="goal-icon-wrap">
          <i class="bx ${goal.icon}"></i>
        </div>
        <div class="goal-info">
          <h4 class="goal-name">${goal.name}</h4>
          ${deadlineInfo}
        </div>
        <div class="goal-actions-menu">
          <button class="goal-menu-btn" title="Opções" data-id="${goal.id}">
            <i class="bx bx-dots-vertical-rounded"></i>
          </button>
        </div>
      </div>

      <!-- Progresso visual -->
      <div class="goal-progress-section">
        <div class="goal-amounts">
          <div class="goal-saved">
            <span class="goal-amounts-label">Guardado</span>
            <span class="goal-amounts-value" style="color:var(--goal-color)">${fmt(goal.savedAmount)}</span>
          </div>
          <div class="goal-pct-display">
            <span class="goal-pct-value">${pct.toFixed(0)}%</span>
          </div>
          <div class="goal-target">
            <span class="goal-amounts-label">Meta</span>
            <span class="goal-amounts-value">${fmt(goal.targetAmount)}</span>
          </div>
        </div>

        <!-- Barra de progresso termômetro -->
        <div class="goal-bar-wrap" title="${pct.toFixed(1)}% concluído">
          <div class="goal-bar-fill ${isComplete ? "goal-bar--complete" : ""}"
               style="width:${pct.toFixed(2)}%; background: linear-gradient(90deg, ${goal.color}cc, ${goal.color})">
          </div>
        </div>
      </div>

      <!-- Parcela mensal -->
      ${!isComplete && monthlyNeeded !== null ? `
        <div class="goal-monthly-hint">
          <i class="bx bx-bulb"></i>
          Guarde <strong>${fmt(monthlyNeeded)}/mês</strong> para atingir a meta no prazo
        </div>
      ` : ""}
      ${!isComplete && !goal.deadline ? `
        <div class="goal-remaining-hint">
          <i class="bx bx-coin-stack"></i>
          Faltam <strong>${fmt(remaining)}</strong> para a meta
        </div>
      ` : ""}
      ${isComplete ? `
        <div class="goal-complete-banner">
          <i class="bx bxs-trophy"></i>
          <span>Parabéns! Meta alcançada! 🎉</span>
        </div>
      ` : ""}

      <!-- Botão contribuir -->
      ${!isComplete ? `
        <button class="goal-contribute-btn" data-id="${goal.id}">
          <i class="bx bx-plus-circle"></i> Contribuir
        </button>
      ` : `
        <div class="goal-complete-actions">
          <button class="goal-delete-btn goal-delete-btn--subtle" data-id="${goal.id}">
            <i class="bx bx-trash"></i> Arquivar meta
          </button>
        </div>
      `}
    </div>
  `;
}

// ── Modal: Criar / Editar meta ────────────────────────────────────

function openGoalModal(goalToEdit = null) {
  const isEdit = goalToEdit !== null;
  const g      = goalToEdit || { name: "", targetAmount: "", savedAmount: 0, deadline: "", icon: GOAL_ICONS[0].key, color: GOAL_COLORS[0] };

  document.getElementById("goal-modal")?.remove();

  const overlay = document.createElement("div");
  overlay.id        = "goal-modal";
  overlay.className = "confirm-overlay";

  overlay.innerHTML = `
    <div class="confirm-box goal-modal-box">
      <div class="goal-modal-header">
        <div class="goal-modal-icon" style="--goal-color:${g.color}">
          <i class="bx ${g.icon}"></i>
        </div>
        <div>
          <h3>${isEdit ? "Editar Meta" : "Nova Meta Financeira"}</h3>
          <p>${isEdit ? "Atualize os dados da sua meta" : "Defina seu objetivo e acompanhe o progresso"}</p>
        </div>
      </div>

      <div class="goal-form">

        <!-- Nome -->
        <div class="goal-field">
          <label class="goal-field-label" for="goal-name">
            <i class="bx bx-rename"></i> Nome da meta
          </label>
          <input type="text" id="goal-name" class="goal-field-input"
            placeholder="Ex: Viagem para Europa" maxlength="40"
            value="${g.name}">
        </div>

        <!-- Valor alvo -->
        <div class="goal-field-row">
          <div class="goal-field">
            <label class="goal-field-label" for="goal-target">
              <i class="bx bx-target-lock"></i> Valor alvo (R$)
            </label>
            <input type="number" id="goal-target" class="goal-field-input"
              placeholder="0,00" min="1" step="10"
              value="${g.targetAmount || ""}">
          </div>
          <div class="goal-field">
            <label class="goal-field-label" for="goal-saved">
              <i class="bx bx-wallet"></i> Já guardado (R$)
            </label>
            <input type="number" id="goal-saved" class="goal-field-input"
              placeholder="0,00" min="0" step="10"
              value="${g.savedAmount || ""}">
          </div>
        </div>

        <!-- Prazo -->
        <div class="goal-field">
          <label class="goal-field-label" for="goal-deadline">
            <i class="bx bx-calendar"></i> Prazo (opcional)
          </label>
          <input type="date" id="goal-deadline" class="goal-field-input"
            min="${new Date().toISOString().slice(0, 10)}"
            value="${g.deadline || ""}">
        </div>

        <!-- Ícone -->
        <div class="goal-field">
          <label class="goal-field-label">
            <i class="bx bx-shapes"></i> Ícone
          </label>
          <div class="goal-icon-picker" id="goal-icon-picker">
            ${GOAL_ICONS.map((ic) => `
              <button type="button"
                class="goal-icon-opt ${g.icon === ic.key ? "goal-icon-opt--active" : ""}"
                data-icon="${ic.key}" title="${ic.label}"
                style="${g.icon === ic.key ? "--goal-color:" + g.color : ""}">
                <i class="bx ${ic.key}"></i>
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Cor -->
        <div class="goal-field">
          <label class="goal-field-label">
            <i class="bx bx-palette"></i> Cor
          </label>
          <div class="goal-color-picker" id="goal-color-picker">
            ${GOAL_COLORS.map((c) => `
              <button type="button"
                class="goal-color-opt ${g.color === c ? "goal-color-opt--active" : ""}"
                data-color="${c}" title="${c}"
                style="background:${c}">
              </button>
            `).join("")}
          </div>
        </div>

      </div>

      <div class="confirm-actions" style="margin-top:1.5rem;">
        <button class="confirm-cancel" id="goal-modal-cancel">Cancelar</button>
        <button class="confirm-ok goal-save-btn" id="goal-modal-save">
          <i class="bx bx-save"></i> ${isEdit ? "Salvar alterações" : "Criar meta"}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => overlay.classList.add("confirm--visible"))
  );

  // Estado interno do modal
  let selectedIcon  = g.icon;
  let selectedColor = g.color;

  const previewIcon = overlay.querySelector(".goal-modal-icon i");

  // Picker de ícone
  overlay.querySelectorAll(".goal-icon-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      overlay.querySelectorAll(".goal-icon-opt").forEach((b) => {
        b.classList.remove("goal-icon-opt--active");
        b.style.removeProperty("--goal-color");
      });
      btn.classList.add("goal-icon-opt--active");
      btn.style.setProperty("--goal-color", selectedColor);
      selectedIcon = btn.dataset.icon;
      previewIcon.className = `bx ${selectedIcon}`;
    });
  });

  // Picker de cor
  overlay.querySelectorAll(".goal-color-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      overlay.querySelectorAll(".goal-color-opt").forEach((b) => b.classList.remove("goal-color-opt--active"));
      btn.classList.add("goal-color-opt--active");
      selectedColor = btn.dataset.color;
      overlay.querySelector(".goal-modal-icon").style.setProperty("--goal-color", selectedColor);
      // Atualiza botão ativo do icon picker
      const activeIcon = overlay.querySelector(".goal-icon-opt--active");
      if (activeIcon) activeIcon.style.setProperty("--goal-color", selectedColor);
    });
  });

  const close = () => {
    overlay.classList.remove("confirm--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector("#goal-modal-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#goal-modal-save").addEventListener("click", () => {
    const name        = document.getElementById("goal-name")?.value.trim();
    const targetInput = parseFloat(document.getElementById("goal-target")?.value || "0");
    const savedInput  = parseFloat(document.getElementById("goal-saved")?.value  || "0");
    const deadline    = document.getElementById("goal-deadline")?.value || "";

    if (!name) {
      document.getElementById("goal-name").style.borderColor = "var(--color-expense)";
      showToast("Informe o nome da meta!", "danger");
      return;
    }
    if (!targetInput || targetInput <= 0) {
      document.getElementById("goal-target").style.borderColor = "var(--color-expense)";
      showToast("Informe o valor alvo da meta!", "danger");
      return;
    }

    const goals = getGoals();
    if (isEdit) {
      const idx = goals.findIndex((g) => g.id === goalToEdit.id);
      if (idx !== -1) {
        goals[idx] = { ...goals[idx], name, targetAmount: targetInput, savedAmount: Math.min(savedInput, targetInput), deadline, icon: selectedIcon, color: selectedColor };
      }
    } else {
      goals.push({
        id:           genId(),
        name,
        targetAmount: targetInput,
        savedAmount:  Math.min(savedInput, targetInput),
        deadline,
        icon:         selectedIcon,
        color:        selectedColor,
        createdAt:    new Date().toISOString().slice(0, 10),
      });
    }

    saveGoals(goals);
    close();
    showToast(isEdit ? "Meta atualizada!" : "Meta criada com sucesso! 🎯", "success");
    document.dispatchEvent(new CustomEvent("goals-updated"));
  });

  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
}

// ── Modal: Contribuir ─────────────────────────────────────────────

function openContributeModal(goal) {
  document.getElementById("contribute-modal")?.remove();

  const overlay = document.createElement("div");
  overlay.id        = "contribute-modal";
  overlay.className = "confirm-overlay";

  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);

  overlay.innerHTML = `
    <div class="confirm-box goal-contribute-box">
      <div class="goal-modal-header">
        <div class="goal-modal-icon" style="--goal-color:${goal.color}">
          <i class="bx ${goal.icon}"></i>
        </div>
        <div>
          <h3>Contribuir para a meta</h3>
          <p><strong>${goal.name}</strong> — faltam R$ ${remaining.toFixed(2)}</p>
        </div>
      </div>

      <div class="goal-field" style="margin-top:1rem;">
        <label class="goal-field-label" for="contrib-amount">
          <i class="bx bx-plus-circle"></i> Valor a adicionar (R$)
        </label>
        <input type="number" id="contrib-amount" class="goal-field-input"
          placeholder="0,00" min="0.01" step="10" autofocus>
      </div>

      <div class="contrib-quick-btns">
        ${[50, 100, 200, 500].map((v) => `
          <button type="button" class="contrib-quick-btn" data-val="${v}">+R$ ${v}</button>
        `).join("")}
        <button type="button" class="contrib-quick-btn" data-val="${remaining.toFixed(2)}">Completar</button>
      </div>

      <div class="confirm-actions" style="margin-top:1.25rem;">
        <button class="confirm-cancel" id="contrib-cancel">Cancelar</button>
        <button class="confirm-ok" id="contrib-save" style="background:${goal.color}">
          <i class="bx bx-check"></i> Confirmar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => overlay.classList.add("confirm--visible"))
  );

  const input = overlay.querySelector("#contrib-amount");
  setTimeout(() => input?.focus(), 300);

  overlay.querySelectorAll(".contrib-quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.val;
      overlay.querySelectorAll(".contrib-quick-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const close = () => {
    overlay.classList.remove("confirm--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector("#contrib-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#contrib-save").addEventListener("click", () => {
    const amount = parseFloat(input.value || "0");
    if (!amount || amount <= 0) {
      input.style.borderColor = "var(--color-expense)";
      showToast("Informe um valor para contribuir!", "danger");
      return;
    }

    const goals = getGoals();
    const idx   = goals.findIndex((g) => g.id === goal.id);
    if (idx !== -1) {
      goals[idx].savedAmount = Math.min(
        goals[idx].savedAmount + amount,
        goals[idx].targetAmount
      );
      saveGoals(goals);

      const isNowComplete = goals[idx].savedAmount >= goals[idx].targetAmount;
      close();

      if (isNowComplete) {
        showToast(`🏆 Meta "${goal.name}" concluída! Parabéns!`, "success", null, 6000);
      } else {
        const newPct = ((goals[idx].savedAmount / goals[idx].targetAmount) * 100).toFixed(0);
        showToast(`✅ R$ ${amount.toFixed(2)} adicionado! (${newPct}% da meta)`, "success");
      }

      document.dispatchEvent(new CustomEvent("goals-updated"));
    }
  });

  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
}

// ── Menu de opções do card ────────────────────────────────────────

function openGoalMenu(goal, btnEl) {
  document.getElementById("goal-options-menu")?.remove();

  const rect = btnEl.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.id        = "goal-options-menu";
  menu.className = "goal-options-menu";
  menu.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 6}px;
    right: ${window.innerWidth - rect.right}px;
    z-index: 99990;
  `;

  menu.innerHTML = `
    <button class="goal-menu-item" id="goal-opt-edit">
      <i class="bx bx-edit"></i> Editar meta
    </button>
    <button class="goal-menu-item goal-menu-item--danger" id="goal-opt-delete">
      <i class="bx bx-trash"></i> Excluir meta
    </button>
  `;

  document.body.appendChild(menu);

  const closeMenu = () => menu.remove();
  setTimeout(() => document.addEventListener("click", closeMenu, { once: true }), 50);

  menu.querySelector("#goal-opt-edit").addEventListener("click", () => {
    closeMenu();
    openGoalModal(goal);
  });

  menu.querySelector("#goal-opt-delete").addEventListener("click", () => {
    closeMenu();
    const goals = getGoals().filter((g) => g.id !== goal.id);
    saveGoals(goals);
    showToast("Meta excluída.", "info");
    document.dispatchEvent(new CustomEvent("goals-updated"));
  });
}

// ── Função principal ──────────────────────────────────────────────

export function buildGoals() {
  const container = document.getElementById("goals-section");
  if (!container) return;

  const goals = getGoals();
  const total = goals.length;
  const done  = goals.filter((g) => g.savedAmount >= g.targetAmount).length;

  container.innerHTML = `
    <div class="goals-header">
      <div class="goals-title-group">
        <h3 class="dash-title">
          <i class="bx bx-bullseye"></i> Metas Financeiras
        </h3>
        ${total > 0 ? `
          <span class="goals-summary-badge">
            ${done}/${total} concluída${done !== 1 ? "s" : ""}
          </span>
        ` : ""}
      </div>
      <button class="goals-add-btn" id="btn-new-goal">
        <i class="bx bx-plus-circle"></i> Nova meta
      </button>
    </div>

    ${total === 0 ? `
      <div class="goals-empty">
        <div class="goals-empty-icon"><i class="bx bx-bullseye"></i></div>
        <h4>Nenhuma meta ainda</h4>
        <p>Defina objetivos financeiros para ter um propósito para o seu dinheiro.</p>
        <button class="goals-add-btn goals-add-btn--center" id="btn-new-goal-empty">
          <i class="bx bx-plus-circle"></i> Criar primeira meta
        </button>
      </div>
    ` : `
      <div class="goals-grid">
        ${goals.map(renderGoalCard).join("")}
      </div>
    `}
  `;

  // Eventos do header
  document.getElementById("btn-new-goal")?.addEventListener("click", () => openGoalModal());
  document.getElementById("btn-new-goal-empty")?.addEventListener("click", () => openGoalModal());

  // Eventos dos cards
  container.querySelectorAll(".goal-contribute-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id   = btn.dataset.id;
      const goal = getGoals().find((g) => g.id === id);
      if (goal) openContributeModal(goal);
    });
  });

  container.querySelectorAll(".goal-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id    = btn.dataset.id;
      const goals = getGoals().filter((g) => g.id !== id);
      saveGoals(goals);
      showToast("Meta arquivada.", "info");
      document.dispatchEvent(new CustomEvent("goals-updated"));
    });
  });

  container.querySelectorAll(".goal-menu-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id   = btn.dataset.id;
      const goal = getGoals().find((g) => g.id === id);
      if (goal) openGoalMenu(goal, btn);
    });
  });
}
