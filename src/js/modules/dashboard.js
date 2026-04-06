// ==========================================
// MODULES / DASHBOARD.JS — Análise de gastos
// ==========================================

const CATEGORIES = [
  { key: "alimentacao", label: "Alimentação", icon: "bx bx-food-menu", keywords: ["comida","alimenta","mercado","supermercado","restaurante","lanche","almoço","jantar","café","padaria","pizza","hamburguer","ifood","delivery"] },
  { key: "essencial",   label: "Essenciais",  icon: "bx bx-home",       keywords: ["aluguel","luz","agua","energia","internet","telefone","condominio","iptu","gas","plano"] },
  { key: "transporte",  label: "Transporte",  icon: "bx bx-car",        keywords: ["combustivel","gasolina","uber","99","onibus","metro","passagem","pedagio","estacionamento","manutenção","carro","moto"] },
  { key: "saude",       label: "Saúde",       icon: "bx bx-plus-medical", keywords: ["medico","farmacia","remedio","consulta","exame","plano de saude","dentista","academia","gym"] },
  { key: "lazer",       label: "Lazer",       icon: "bx bx-game",       keywords: ["cinema","streaming","netflix","spotify","show","viagem","hotel","passeio","jogo","diversao"] },
  { key: "outros",      label: "Outros",      icon: "bx bx-dots-horizontal", keywords: [] },
];

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const normalize  = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const monthKey   = (item) => item.date.slice(0, 7);
const monthLabel = (key)  => { const [y,m] = key.split("-"); return `${MONTH_NAMES[Number(m)-1]} ${y}`; };

export function categorizeItem(desc) {
  const lower = normalize(desc);
  for (const cat of CATEGORIES) {
    if (cat.key === "outros") continue;
    if (cat.keywords.some((kw) => lower.includes(normalize(kw)))) return cat.key;
  }
  return "outros";
}

function buildTotals(expenses) {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c.key, { total: 0, items: [] }]));
  expenses.forEach((item) => {
    const cat = item.category || categorizeItem(item.desc);
    if (!totals[cat]) totals[cat] = { total: 0, items: [] };
    totals[cat].total += Number(item.amount);
    totals[cat].items.push(item);
  });
  return totals;
}

function renderCategoryCard(cat, total, catItems, grandTotal, isExpanded) {
  const pct = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : 0;
  const itemRows = catItems
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .map((i) => {
      const d = new Date(i.date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
      return `<div class="dash-item-row">
        <span class="dash-item-desc">${i.desc}</span>
        <span class="dash-item-meta">${d}</span>
        <span class="dash-item-amount">R$ ${Number(i.amount).toFixed(2)}</span>
      </div>`;
    }).join("");

  return `
    <div class="dash-card${isExpanded ? " dash-card--open" : ""}" data-cat="${cat.key}">
      <div class="dash-card-toggle">
        <div class="dash-card-header">
          <i class="${cat.icon}"></i>
          <span>${cat.label}</span>
        </div>
        <div class="dash-card-right">
          <span class="dash-amount">R$ ${total.toFixed(2)}</span>
          <i class="bx bx-chevron-down dash-chevron"></i>
        </div>
      </div>
      <div class="dash-bar-wrap">
        <div class="dash-bar" style="width:${pct}%"></div>
      </div>
      <div class="dash-pct">${pct}%</div>
      <div class="dash-items-list">
        ${catItems.length > 0 ? itemRows : '<p class="dash-items-empty">Nenhum item.</p>'}
      </div>
    </div>`;
}

function renderComparison(items, months) {
  if (months.length < 2) return "";
  const recent = months.slice(-3);

  const rows = CATEGORIES.map((cat) => {
    const cols = recent.map((mk) => {
      const exp = items.filter((i) => monthKey(i) === mk && (i.type === "Fixo" || i.type === "Variavel"));
      return exp.filter((i) => (i.category || categorizeItem(i.desc)) === cat.key)
                .reduce((acc, i) => acc + Number(i.amount), 0);
    });
    if (cols.every((v) => v === 0)) return "";

    const cells = cols.map((v, idx) => {
      let trend = "";
      if (idx > 0 && cols[idx - 1] > 0) {
        const diff = v - cols[idx - 1];
        trend = diff > 0
          ? `<span class="trend trend--up"><i class="bx bx-trending-up"></i> +R$ ${diff.toFixed(2)}</span>`
          : diff < 0
          ? `<span class="trend trend--down"><i class="bx bx-trending-down"></i> -R$ ${Math.abs(diff).toFixed(2)}</span>`
          : `<span class="trend trend--eq">—</span>`;
      }
      return `<td><span class="cmp-value">${v > 0 ? "R$ "+v.toFixed(2) : "—"}</span>${trend}</td>`;
    }).join("");

    return `<tr><td class="cmp-cat"><i class="${cat.icon}"></i> ${cat.label}</td>${cells}</tr>`;
  }).join("");

  const headers = recent.map((mk) => `<th>${monthLabel(mk)}</th>`).join("");

  return `
    <div class="cmp-section">
      <h4 class="cmp-title"><i class="bx bx-git-compare"></i> Comparação entre meses</h4>
      <div class="cmp-table-wrap">
        <table class="cmp-table">
          <thead><tr><th>Categoria</th>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

const expandedCats = new Set();

function bindToggleEvents(container) {
  container.querySelectorAll(".dash-card-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const card = toggle.closest(".dash-card");
      const key  = card.dataset.cat;
      expandedCats.has(key) ? expandedCats.delete(key) : expandedCats.add(key);
      card.classList.toggle("dash-card--open");
    });
  });
}

export function buildDashboard(items) {
  const container = document.getElementById("dashboard");
  if (!container) return;

  const expenses = items.filter((i) => i.type === "Fixo" || i.type === "Variavel");

  if (expenses.length === 0) {
    container.innerHTML = `<p class="dash-empty">Nenhum gasto registrado ainda.</p>`;
    return;
  }

  const totals     = buildTotals(expenses);
  const grandTotal = Object.values(totals).reduce((acc, v) => acc + v.total, 0);
  const months     = [...new Set(items.map(monthKey))].sort();

  const sorted = CATEGORIES
    .map((c) => ({ ...c, ...totals[c.key] }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const cards = sorted.map((cat) =>
    renderCategoryCard(cat, cat.total, cat.items, grandTotal, expandedCats.has(cat.key))
  ).join("");

  container.innerHTML = `
    <h3 class="dash-title"><i class="bx bx-bar-chart-alt-2"></i> Análise de Gastos</h3>
    <div class="dash-grid">${cards}</div>
    ${renderComparison(items, months)}
  `;

  bindToggleEvents(container);
}
