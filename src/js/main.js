// ==========================================
// MAIN.JS — Ponto de entrada da aplicação
// ==========================================
import state                              from "./core/state.js";
import { initTheme }                      from "./modules/theme.js";
import { initDrawer }                     from "./modules/drawer.js";
import { initGreeting }                   from "./modules/greeting.js";
import { renderItem, clearTable, updateTotals, updateSelectedDate } from "./modules/ui.js";
import { buildDashboard, categorizeItem } from "./modules/dashboard.js";

// ── Elementos do formulário ────────────────────────────────────────
const descInput   = document.querySelector("#desc");
const amountInput = document.querySelector("#amount");
const dateInput   = document.querySelector("#date");
const typeSelect  = document.querySelector("#type");
const btnNew      = document.querySelector("#btnNew");

// ── Renderização reativa ───────────────────────────────────────────
/**
 * Re-renderiza toda a tabela e painéis sempre que o estado muda.
 * @param {Array} items
 */
function render(items) {
  clearTable();
  items.forEach((item, index) => renderItem(item, index, (i) => state.remove(i)));
  updateTotals(items);
  buildDashboard(items);
}

state.subscribe(render);

// ── Ação: incluir transação ────────────────────────────────────────
btnNew.addEventListener("click", () => {
  if (!descInput.value || !amountInput.value || !typeSelect.value || !dateInput.value) {
    alert("Preencha todos os campos!");
    return;
  }

  state.add({
    date:     dateInput.value,
    desc:     descInput.value,
    amount:   Math.abs(amountInput.value).toFixed(2),
    type:     typeSelect.value,
    category: categorizeItem(descInput.value),
  });

  descInput.value   = "";
  amountInput.value = "";
  dateInput.value   = "";
});

// ── Ação: exibir data selecionada ──────────────────────────────────
dateInput.addEventListener("change", () => updateSelectedDate(dateInput.value));

// ── Ação: imprimir ─────────────────────────────────────────────────
window.btnPrint = () => window.print();

// ── Inicialização ──────────────────────────────────────────────────
initTheme();
initDrawer();
initGreeting();
state.load();
