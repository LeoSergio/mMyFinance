// ==========================================
// MODULES / UI.JS — Renderização da interface
// ==========================================
import { categorizeItem } from "./dashboard.js";

const tbody      = document.querySelector("tbody");
const incomesEl  = document.querySelector(".incomes");
const expensesEl = document.querySelector(".expenses");
const totalEl    = document.querySelector(".total");

export function renderItem(item, index, onDelete, onEdit) {
  const tr = document.createElement("tr");
  const dateObj       = new Date(item.date);
  const formattedDate = dateObj.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const isExpense     = item.type === "Fixo" || item.type === "Variavel";
  const typeLabel     = item.type === "Entrada" ? "Entrada" : item.type === "Fixo" ? "Fixa" : "Variável";

  // Badge de lembrete agendado para datas futuras
  const today        = new Date().toISOString().slice(0, 10);
  const isFuture     = item.date > today;
  const reminderBadge = isFuture
    ? `<span class="badge-reminder"><i class="bx bx-bell"></i> agendado</span>`
    : "";

  tr.innerHTML = `
    <td data-label="Data">${formattedDate}${reminderBadge}</td>
    <td data-label="Descrição">${item.desc}</td>
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
      <button class="btn-edit"   title="Editar"><i class="bx bx-edit"></i></button>
      <button class="btn-delete" title="Excluir"><i class="bx bx-trash"></i></button>
    </td>
  `;

  tbody.appendChild(tr);
  tr.querySelector(".btn-delete").addEventListener("click", () => onDelete(index));
  tr.querySelector(".btn-edit").addEventListener("click",   () => onEdit(index));
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
  const d = new Date(dateValue);
  el.textContent = d.toLocaleDateString("pt-BR", {
    timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  el.parentElement.style.display = "flex";
}
