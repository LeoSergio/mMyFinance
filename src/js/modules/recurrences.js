// ==========================================
// MODULES / RECURRENCES.JS — Lançamentos Recorrentes
// ==========================================
// Cria lançamentos automaticamente na data correta.
// No boot, initRecurrences(state) verifica quais
// recorrências estão vencidas e insere os itens.

import { getRecurrences, saveRecurrences } from "../core/storage.js";
import { categorizeItem }                  from "./dashboard.js";
import { showToast }                       from "./toast.js";

// ── Frequências disponíveis ───────────────────────────────────────
export const FREQUENCIES = [
  { key: "daily",     label: "Diário",    icon: "bx-sun",          days: 1   },
  { key: "weekly",    label: "Semanal",   icon: "bx-calendar-week",days: 7   },
  { key: "biweekly",  label: "Quinzenal", icon: "bx-calendar-alt", days: 14  },
  { key: "monthly",   label: "Mensal",    icon: "bx-calendar",     days: 30  }, // usa lógica de mês
  { key: "yearly",    label: "Anual",     icon: "bx-calendar-star",days: 365 }, // usa lógica de ano
];

const FREQ_MAP = Object.fromEntries(FREQUENCIES.map((f) => [f.key, f]));

// ── Helpers de data ───────────────────────────────────────────────

const genId  = () => `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const today  = () => new Date().toISOString().slice(0, 10);

/**
 * Calcula a próxima data de disparo com base na frequência.
 * Para "monthly" e "yearly" usa addMonth/addYear para preservar o dia do mês.
 */
function nextDate(fromDate, frequency) {
  const d = new Date(fromDate + "T00:00:00");
  switch (frequency) {
    case "daily":    d.setDate(d.getDate() + 1);      break;
    case "weekly":   d.setDate(d.getDate() + 7);      break;
    case "biweekly": d.setDate(d.getDate() + 14);     break;
    case "monthly":  d.setMonth(d.getMonth() + 1);    break;
    case "yearly":   d.setFullYear(d.getFullYear()+1);break;
    default:         d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

function freqLabel(frequency) {
  return FREQ_MAP[frequency]?.label ?? frequency;
}

function freqIcon(frequency) {
  return FREQ_MAP[frequency]?.icon ?? "bx-calendar";
}

// ── Inicialização: cria itens vencidos no state ───────────────────
/**
 * Deve ser chamado uma vez no boot, depois que state.load() for executado.
 * Percorre todas as recorrências ativas e, para cada uma cuja nextDate
 * já chegou (≤ hoje), insere o item no state e avança nextDate.
 * @param {object} state  — módulo state.js
 */
export function initRecurrences(state) {
  const list    = getRecurrences();
  const todayStr = today();
  let   created = 0;
  let   updated = false;

  list.forEach((rec) => {
    if (!rec.active) return;

    // Processa todos os vencimentos pendentes (pode ter pulado dias)
    while (rec.nextDate <= todayStr) {
      const item = {
        date:     rec.nextDate,
        desc:     rec.desc,
        amount:   rec.amount,
        type:     rec.type,
        category: rec.category || categorizeItem(rec.desc),
      };
      state.add(item);          // dispara notificação reativa
      rec.nextDate = nextDate(rec.nextDate, rec.frequency);
      created++;
      updated = true;

      // Guarda para não criar infinitamente em caso de bug de data
      if (rec.nextDate > todayStr) break;
    }
  });

  if (updated) {
    saveRecurrences(list);
    if (created === 1) {
      showToast("1 lançamento recorrente criado automaticamente.", "info", null, 5000);
    } else if (created > 1) {
      showToast(`${created} lançamentos recorrentes criados automaticamente.`, "info", null, 5000);
    }
  }
}

// ── Modal: Criar / Editar ─────────────────────────────────────────

function openRecModal(recToEdit = null) {
  const isEdit = recToEdit !== null;
  const r = recToEdit || {
    desc: "", amount: "", type: "Fixo", frequency: "monthly",
    startDate: today(), active: true,
  };

  document.getElementById("rec-modal")?.remove();

  const overlay = document.createElement("div");
  overlay.id        = "rec-modal";
  overlay.className = "confirm-overlay";

  overlay.innerHTML = `
    <div class="confirm-box rec-modal-box">
      <div class="rec-modal-header">
        <div class="rec-modal-icon"><i class="bx bx-refresh"></i></div>
        <div>
          <h3>${isEdit ? "Editar Recorrência" : "Nova Recorrência"}</h3>
          <p>Lançamento criado automaticamente na periodicidade escolhida</p>
        </div>
      </div>

      <div class="rec-form">

        <!-- Descrição -->
        <div class="rec-field">
          <label class="rec-field-label" for="rec-desc">
            <i class="bx bx-edit-alt"></i> Descrição
          </label>
          <input type="text" id="rec-desc" class="goal-field-input"
            placeholder="Ex: Aluguel, Netflix, Academia"
            maxlength="50" value="${r.desc}">
        </div>

        <!-- Valor + Tipo -->
        <div class="goal-field-row">
          <div class="rec-field">
            <label class="rec-field-label" for="rec-amount">
              <i class="bx bx-money"></i> Valor (R$)
            </label>
            <input type="number" id="rec-amount" class="goal-field-input"
              placeholder="0,00" min="0.01" step="0.01"
              value="${r.amount || ""}">
          </div>
          <div class="rec-field">
            <label class="rec-field-label" for="rec-type">
              <i class="bx bx-transfer"></i> Tipo
            </label>
            <select id="rec-type" class="goal-field-input">
              <option value="Entrada"  ${r.type==="Entrada"  ? "selected":""}>Entrada</option>
              <option value="Fixo"     ${r.type==="Fixo"     ? "selected":""}>Saída Fixa</option>
              <option value="Variavel" ${r.type==="Variavel" ? "selected":""}>Saída Variável</option>
            </select>
          </div>
        </div>

        <!-- Frequência -->
        <div class="rec-field">
          <label class="rec-field-label">
            <i class="bx bx-time"></i> Frequência
          </label>
          <div class="rec-freq-grid">
            ${FREQUENCIES.map((f) => `
              <label class="rec-freq-opt ${r.frequency === f.key ? "rec-freq-opt--active" : ""}">
                <input type="radio" name="rec-freq" value="${f.key}"
                  ${r.frequency === f.key ? "checked" : ""} hidden>
                <i class="bx ${f.icon}"></i>
                <span>${f.label}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <!-- Data de início / próximo disparo -->
        <div class="rec-field">
          <label class="rec-field-label" for="rec-start">
            <i class="bx bx-calendar-check"></i>
            ${isEdit ? "Próximo lançamento" : "Início (primeiro lançamento)"}
          </label>
          <input type="date" id="rec-start" class="goal-field-input"
            value="${isEdit ? r.nextDate : r.startDate}">
        </div>

      </div>

      <div class="confirm-actions" style="margin-top:1.5rem;">
        <button class="confirm-cancel" id="rec-modal-cancel">Cancelar</button>
        <button class="confirm-ok rec-save-btn" id="rec-modal-save">
          <i class="bx bx-save"></i> ${isEdit ? "Salvar" : "Criar recorrência"}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => overlay.classList.add("confirm--visible"))
  );

  // Highlight visual dos botões de frequência
  overlay.querySelectorAll(".rec-freq-opt").forEach((label) => {
    label.addEventListener("click", () => {
      overlay.querySelectorAll(".rec-freq-opt").forEach((l) => l.classList.remove("rec-freq-opt--active"));
      label.classList.add("rec-freq-opt--active");
    });
  });

  const close = () => {
    overlay.classList.remove("confirm--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector("#rec-modal-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#rec-modal-save").addEventListener("click", () => {
    const desc   = document.getElementById("rec-desc")?.value.trim();
    const amount = parseFloat(document.getElementById("rec-amount")?.value || "0");
    const type   = document.getElementById("rec-type")?.value;
    const freq   = overlay.querySelector("input[name='rec-freq']:checked")?.value || "monthly";
    const start  = document.getElementById("rec-start")?.value;

    if (!desc) {
      document.getElementById("rec-desc").style.borderColor = "var(--color-expense)";
      showToast("Informe a descrição!", "danger"); return;
    }
    if (!amount || amount <= 0) {
      document.getElementById("rec-amount").style.borderColor = "var(--color-expense)";
      showToast("Informe o valor!", "danger"); return;
    }
    if (!start) {
      document.getElementById("rec-start").style.borderColor = "var(--color-expense)";
      showToast("Informe a data de início!", "danger"); return;
    }

    const list = getRecurrences();

    if (isEdit) {
      const idx = list.findIndex((r) => r.id === recToEdit.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], desc, amount: Math.abs(amount).toFixed(2), type,
          frequency: freq, nextDate: start, category: categorizeItem(desc) };
      }
    } else {
      list.push({
        id:        genId(),
        desc,
        amount:    Math.abs(amount).toFixed(2),
        type,
        frequency: freq,
        startDate: start,
        nextDate:  start,
        category:  categorizeItem(desc),
        active:    true,
        createdAt: today(),
      });
    }

    saveRecurrences(list);
    close();
    showToast(
      isEdit ? "Recorrência atualizada!" : `Recorrência criada! Próximo: ${start}`,
      "success"
    );
    document.dispatchEvent(new CustomEvent("recurrences-updated"));
  });

  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
}

// ── Renderização de um item da lista ─────────────────────────────

function renderRecItem(rec) {
  const typeLabel = rec.type === "Entrada" ? "Entrada"
    : rec.type === "Fixo" ? "Saída Fixa" : "Saída Variável";
  const isIncome  = rec.type === "Entrada";
  const nextFmt   = new Date(rec.nextDate + "T00:00:00")
    .toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });

  return `
    <div class="rec-item ${rec.active ? "" : "rec-item--paused"}" data-id="${rec.id}">

      <!-- Ícone de frequência -->
      <div class="rec-item-icon">
        <i class="bx ${freqIcon(rec.frequency)}"></i>
      </div>

      <!-- Info principal -->
      <div class="rec-item-info">
        <div class="rec-item-top">
          <span class="rec-item-desc">${rec.desc}</span>
          <span class="rec-item-amount ${isIncome ? "rec-income" : "rec-expense"}">
            ${isIncome ? "+" : "-"} R$ ${Number(rec.amount).toFixed(2)}
          </span>
        </div>
        <div class="rec-item-meta">
          <span class="rec-freq-badge">
            <i class="bx bx-refresh"></i> ${freqLabel(rec.frequency)}
          </span>
          <span class="rec-type-badge rec-type-badge--${rec.type.toLowerCase()}">${typeLabel}</span>
          ${rec.active
            ? `<span class="rec-next-date"><i class="bx bx-calendar-event"></i> próximo: ${nextFmt}</span>`
            : `<span class="rec-paused-badge"><i class="bx bx-pause-circle"></i> Pausado</span>`
          }
        </div>
      </div>

      <!-- Ações -->
      <div class="rec-item-actions">
        <button class="rec-toggle-btn" data-id="${rec.id}" title="${rec.active ? "Pausar" : "Reativar"}">
          <i class="bx ${rec.active ? "bx-pause" : "bx-play"}"></i>
        </button>
        <button class="rec-edit-btn" data-id="${rec.id}" title="Editar">
          <i class="bx bx-edit"></i>
        </button>
        <button class="rec-delete-btn" data-id="${rec.id}" title="Excluir">
          <i class="bx bx-trash"></i>
        </button>
      </div>
    </div>
  `;
}

// ── Função principal ──────────────────────────────────────────────

export function buildRecurrences() {
  const container = document.getElementById("recurrences-section");
  if (!container) return;

  const list   = getRecurrences();
  const active = list.filter((r) => r.active).length;
  const paused = list.filter((r) => !r.active).length;

  container.innerHTML = `
    <div class="rec-header">
      <div class="rec-title-group">
        <h3 class="dash-title">
          <i class="bx bx-refresh"></i> Lançamentos Recorrentes
        </h3>
        ${list.length > 0 ? `
          <span class="rec-summary-badge">
            ${active} ativo${active !== 1 ? "s" : ""}${paused > 0 ? ` · ${paused} pausado${paused !== 1 ? "s" : ""}` : ""}
          </span>
        ` : ""}
      </div>
      <button class="goals-add-btn" id="btn-new-rec">
        <i class="bx bx-plus-circle"></i> Nova recorrência
      </button>
    </div>

    ${list.length === 0 ? `
      <div class="goals-empty">
        <div class="goals-empty-icon"><i class="bx bx-refresh"></i></div>
        <h4>Nenhuma recorrência cadastrada</h4>
        <p>Automatize lançamentos que se repetem todo mês: aluguel, salário, assinaturas.</p>
        <button class="goals-add-btn goals-add-btn--center" id="btn-new-rec-empty">
          <i class="bx bx-plus-circle"></i> Criar primeira recorrência
        </button>
      </div>
    ` : `
      <div class="rec-list">
        ${list.map(renderRecItem).join("")}
      </div>
      <p class="rec-info-hint">
        <i class="bx bx-info-circle"></i>
        Os lançamentos são criados automaticamente quando você abre o app na data programada.
      </p>
    `}
  `;

  // Eventos
  document.getElementById("btn-new-rec")?.addEventListener("click", () => openRecModal());
  document.getElementById("btn-new-rec-empty")?.addEventListener("click", () => openRecModal());

  container.querySelectorAll(".rec-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id   = btn.dataset.id;
      const list = getRecurrences();
      const idx  = list.findIndex((r) => r.id === id);
      if (idx !== -1) {
        list[idx].active = !list[idx].active;
        saveRecurrences(list);
        const msg = list[idx].active ? "Recorrência reativada!" : "Recorrência pausada.";
        showToast(msg, "info");
        document.dispatchEvent(new CustomEvent("recurrences-updated"));
      }
    });
  });

  container.querySelectorAll(".rec-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id  = btn.dataset.id;
      const rec = getRecurrences().find((r) => r.id === id);
      if (rec) openRecModal(rec);
    });
  });

  container.querySelectorAll(".rec-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id  = btn.dataset.id;
      const rec = getRecurrences().find((r) => r.id === id);
      if (!rec) return;

      // Reutiliza o confirm do toast.js via CustomEvent não — importa direto
      if (!confirm(`Excluir a recorrência "${rec.desc}"?`)) return;
      const updated = getRecurrences().filter((r) => r.id !== id);
      saveRecurrences(updated);
      showToast("Recorrência excluída.", "info");
      document.dispatchEvent(new CustomEvent("recurrences-updated"));
    });
  });
}
