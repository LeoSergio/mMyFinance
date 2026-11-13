// ==========================================
// MODULES / UI.JS — Renderização da interface
// ==========================================
import { categorizeItem } from "./dashboard.js";
import { getLocalDateString } from "../core/date.js";
import { getCategoryMeta } from "./category.js";

const tbody      = document.querySelector("tbody");
const incomesEl  = document.querySelector(".incomes");
const expensesEl = document.querySelector(".expenses");
const totalEl    = document.querySelector(".total");

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

export function clearTable() { tbody.innerHTML = ""; }

export function updateTotals(items) {
  const incomes  = items.filter((i) => i.type === "Entrada").reduce((a, i) => a + Number(i.amount), 0);
  const expenses = items.filter((i) => i.type !== "Entrada").reduce((a, i) => a + Number(i.amount), 0);
  const total    = incomes - expenses;

  incomesEl.textContent  = incomes.toFixed(2);
  expensesEl.textContent = expenses.toFixed(2);
  totalEl.textContent    = total.toFixed(2);

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
