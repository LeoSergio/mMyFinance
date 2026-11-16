// ==========================================
// MODULES / UI.JS — Renderização da interface e filtros
// ==========================================
import { categorizeItem } from "./dashboard.js";
import { getLocalDateString } from "../core/date.js";
import { getCategoryMeta } from "./category.js";

const tbody      = document.querySelector("tbody");
const incomesEl  = document.querySelector(".incomes");
const expensesEl = document.querySelector(".expenses");
const totalEl    = document.querySelector(".total");

// Elementos de filtros e paginação
const searchInput     = document.querySelector("#filter-search-input");
const typeSelect      = document.querySelector("#filter-type-select");
const monthSelect     = document.querySelector("#filter-month-select");
const btnClearFilters = document.querySelector("#btn-clear-filters");
const countBadge      = document.querySelector("#transactions-count-badge");
const emptyMsg        = document.querySelector("#table-empty-msg");
const toggleWrap      = document.querySelector("#table-toggle-wrap");
const btnToggleExpand = document.querySelector("#btn-toggle-expand");
const btnToggleText   = document.querySelector("#btn-toggle-expand-text");
const btnToggleIcon   = document.querySelector("#btn-toggle-expand-icon");

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Estado dos filtros e visualização
const INITIAL_LIMIT = 6;
let isExpanded = false;
let currentSearch = "";
let currentType = "todos";
let currentMonth = "todos";
let isFiltersInitialized = false;

const normalize = (str) =>
  String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function formatMonthLabel(yyyyMm) {
  const [year, month] = yyyyMm.split("-");
  const monthIdx = Number(month) - 1;
  const name = MONTH_NAMES[monthIdx] || month;
  return `${name} ${year}`;
}

function updateMonthFilterOptions(items) {
  if (!monthSelect) return;

  const previousSelected = monthSelect.value || currentMonth;
  const months = [...new Set(items.map((i) => (i.date ? i.date.slice(0, 7) : "")))].filter(Boolean);
  months.sort((a, b) => b.localeCompare(a)); // mais recentes primeiro

  let optionsHtml = `<option value="todos">Todos os meses</option>`;
  months.forEach((m) => {
    optionsHtml += `<option value="${m}">${formatMonthLabel(m)}</option>`;
  });

  monthSelect.innerHTML = optionsHtml;

  if (months.includes(previousSelected) || previousSelected === "todos") {
    monthSelect.value = previousSelected;
    currentMonth = previousSelected;
  } else {
    monthSelect.value = "todos";
    currentMonth = "todos";
  }
}

export function renderItem(item, onDelete, onEdit) {
  const tr = document.createElement("tr");
  if (item.id) tr.dataset.id = item.id;

  const dateParts = item.date ? item.date.split("-") : [];
  const formattedDate =
    dateParts.length === 3
      ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
      : new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" });

  const isExpense     = item.type === "Fixo" || item.type === "Variavel";
  const typeLabel     = item.type === "Entrada" ? "Entrada" : item.type === "Fixo" ? "Fixa" : "Variável";

  // Badge de lembrete agendado para datas futuras
  const today        = getLocalDateString();
  const isFuture     = item.date > today;
  const reminderBadge = isFuture
    ? `<span class="badge-reminder"><i class="bx bx-bell"></i> agendado</span>`
    : "";

  const catMeta = getCategoryMeta(item.category || categorizeItem(item.desc));

  tr.innerHTML = `
    <td data-label="Data">${formattedDate}${reminderBadge}</td>
    <td data-label="Descrição">
      <div class="table-desc-wrap">
        <span class="table-desc-text">${item.desc}</span>
        <span class="table-cat-badge"><i class="${catMeta.icon}"></i> ${catMeta.label}</span>
      </div>
    </td>
    <td data-label="Valor" class="${isExpense ? "value-expense" : "value-income"}">
      ${isExpense ? "-" : "+"} R$ ${item.amount}
    </td>
    <td data-label="Tipo" class="columnType">
      <span class="badge badge-${item.type.toLowerCase()}">
        ${isExpense ? '<i class="bx bxs-chevron-down-circle"></i>' : '<i class="bx bxs-chevron-up-circle"></i>'}
        ${typeLabel}
      </span>
    </td>
    <td class="columnAction">
      <button class="btn-edit"   title="Editar" aria-label="Editar lançamento"><i class="bx bx-edit"></i></button>
      <button class="btn-delete" title="Excluir" aria-label="Excluir lançamento"><i class="bx bx-trash"></i></button>
    </td>
  `;

  tbody.appendChild(tr);
  const identifier = item.id || item;
  tr.querySelector(".btn-delete").addEventListener("click", () => onDelete(identifier));
  tr.querySelector(".btn-edit").addEventListener("click",   () => onEdit(identifier));
}

export function clearTable() {
  if (tbody) tbody.innerHTML = "";
}

/**
 * Renderiza a tabela de lançamentos com suporte a filtros e visualização compacta/expandida.
 * @param {Array} items
 * @param {Function} onDelete
 * @param {Function} onEdit
 */
export function renderTransactionsTable(items, onDelete, onEdit) {
  clearTable();

  // Ordena os itens por data decrescente (mais recentes primeiro)
  const sorted = [...items].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Atualiza as opções de meses
  updateMonthFilterOptions(sorted);

  // Aplica filtros ativos
  const hasFilterActive = currentSearch.trim() !== "" || currentType !== "todos" || currentMonth !== "todos";

  const filtered = sorted.filter((item) => {
    const matchSearch =
      !currentSearch ||
      normalize(item.desc).includes(normalize(currentSearch)) ||
      normalize(item.category || "").includes(normalize(currentSearch));

    const matchType = currentType === "todos" || item.type === currentType;
    const matchMonth = currentMonth === "todos" || (item.date && item.date.slice(0, 7) === currentMonth);

    return matchSearch && matchType && matchMonth;
  });

  // Atualiza botão de limpar filtros
  if (btnClearFilters) {
    btnClearFilters.style.display = hasFilterActive ? "inline-flex" : "none";
  }

  // Atualiza badge de contagem
  if (countBadge) {
    if (hasFilterActive) {
      countBadge.textContent = `${filtered.length} de ${items.length}`;
    } else {
      countBadge.textContent = `${items.length} ${items.length === 1 ? "item" : "itens"}`;
    }
  }

  // Se não houver itens resultantes
  if (filtered.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "flex";
    if (toggleWrap) toggleWrap.style.display = "none";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  // Paginação / Limite de visualização
  const visibleItems = isExpanded ? filtered : filtered.slice(0, INITIAL_LIMIT);
  visibleItems.forEach((item) => renderItem(item, onDelete, onEdit));

  // Botão Ver mais / Ver menos
  if (toggleWrap && btnToggleText && btnToggleIcon) {
    if (filtered.length > INITIAL_LIMIT) {
      toggleWrap.style.display = "flex";
      if (!isExpanded) {
        const remaining = filtered.length - INITIAL_LIMIT;
        btnToggleText.textContent = `Ver mais lançamentos (+${remaining})`;
        btnToggleIcon.className = "bx bx-chevron-down";
      } else {
        btnToggleText.textContent = "Ver menos lançamentos";
        btnToggleIcon.className = "bx bx-chevron-up";
      }
    } else {
      toggleWrap.style.display = "none";
    }
  }
}

/**
 * Inicializa os ouvintes dos filtros de tabela e do botão de expandir/recolher.
 * @param {Function} rerenderFn - Função a ser chamada quando os filtros mudarem
 */
export function initTableFilters(rerenderFn) {
  if (isFiltersInitialized) return;
  isFiltersInitialized = true;

  searchInput?.addEventListener("input", () => {
    currentSearch = searchInput.value;
    rerenderFn();
  });

  typeSelect?.addEventListener("change", () => {
    currentType = typeSelect.value;
    rerenderFn();
  });

  monthSelect?.addEventListener("change", () => {
    currentMonth = monthSelect.value;
    rerenderFn();
  });

  btnClearFilters?.addEventListener("click", () => {
    currentSearch = "";
    currentType = "todos";
    currentMonth = "todos";
    if (searchInput) searchInput.value = "";
    if (typeSelect) typeSelect.value = "todos";
    if (monthSelect) monthSelect.value = "todos";
    rerenderFn();
  });

  btnToggleExpand?.addEventListener("click", () => {
    isExpanded = !isExpanded;
    rerenderFn();

    // Se recolheu, rola suavemente para o início da seção
    if (!isExpanded) {
      const section = document.querySelector(".transactions-section");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

export function updateTotals(items) {
  const incomes  = items.filter((i) => i.type === "Entrada").reduce((a, i) => a + Number(i.amount), 0);
  const expenses = items.filter((i) => i.type !== "Entrada").reduce((a, i) => a + Number(i.amount), 0);
  const total    = incomes - expenses;

  if (incomesEl) incomesEl.textContent  = incomes.toFixed(2);
  if (expensesEl) expensesEl.textContent = expenses.toFixed(2);
  if (totalEl) totalEl.textContent    = total.toFixed(2);

  const totalCard = document.querySelector(".card-total h2");
  if (totalCard) totalCard.style.color = total < 0 ? "var(--color-expense)" : "var(--color-income)";
}

export function updateSelectedDate(dateValue) {
  const el = document.getElementById("selected-date-display");
  if (!el || !dateValue) return;
  const d = new Date(dateValue + "T00:00:00");
  el.textContent = d.toLocaleDateString("pt-BR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  el.parentElement.style.display = "flex";
}
