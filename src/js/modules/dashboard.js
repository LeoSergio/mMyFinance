// ==========================================
// MODULES / DASHBOARD.JS — Análise de gastos
// ==========================================

/** @type {Array<{key: string, label: string, icon: string, keywords: string[]}>} */
const CATEGORIES = [
  {
    key: "alimentacao",
    label: "Alimentação",
    icon: "bx bx-food-menu",
    keywords: [
      "comida", "alimenta", "mercado", "supermercado", "restaurante",
      "lanche", "almoço", "jantar", "café", "padaria", "pizza",
      "hamburguer", "ifood", "delivery",
    ],
  },
  {
    key: "essencial",
    label: "Essenciais",
    icon: "bx bx-home",
    keywords: [
      "aluguel", "luz", "agua", "energia", "internet", "telefone",
      "condominio", "iptu", "gas", "plano",
    ],
  },
  {
    key: "transporte",
    label: "Transporte",
    icon: "bx bx-car",
    keywords: [
      "combustivel", "gasolina", "uber", "99", "onibus", "metro",
      "passagem", "pedagio", "estacionamento", "manutenção", "carro", "moto",
    ],
  },
  {
    key: "saude",
    label: "Saúde",
    icon: "bx bx-plus-medical",
    keywords: [
      "medico", "farmacia", "remedio", "consulta", "exame",
      "plano de saude", "dentista", "academia", "gym",
    ],
  },
  {
    key: "lazer",
    label: "Lazer",
    icon: "bx bx-game",
    keywords: [
      "cinema", "streaming", "netflix", "spotify", "show",
      "viagem", "hotel", "passeio", "jogo", "diversao",
    ],
  },
  {
    key: "outros",
    label: "Outros",
    icon: "bx bx-dots-horizontal",
    keywords: [],
  },
];

/** Normaliza string removendo acentos e convertendo para minúsculas. */
const normalize = (str) =>
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Categoriza um item pela descrição.
 * @param {string} desc
 * @returns {string} chave da categoria
 */
export function categorizeItem(desc) {
  const lower = normalize(desc);
  for (const cat of CATEGORIES) {
    if (cat.key === "outros") continue;
    if (cat.keywords.some((kw) => lower.includes(normalize(kw)))) {
      return cat.key;
    }
  }
  return "outros";
}

/**
 * Constrói o dashboard de análise de gastos no DOM.
 * @param {Array} items
 */
export function buildDashboard(items) {
  const container = document.getElementById("dashboard");
  if (!container) return;

  const expenses = items.filter((i) => i.type === "Fixo" || i.type === "Variavel");

  if (expenses.length === 0) {
    container.innerHTML = `<p class="dash-empty">Nenhum gasto registrado ainda.</p>`;
    return;
  }

  const totals = Object.fromEntries(CATEGORIES.map((c) => [c.key, 0]));

  expenses.forEach((item) => {
    const cat = item.category || categorizeItem(item.desc);
    totals[cat] = (totals[cat] || 0) + Number(item.amount);
  });

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  const sorted = CATEGORIES.map((c) => ({ ...c, total: totals[c.key] || 0 }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  container.innerHTML = `
    <h3 class="dash-title"><i class="bx bx-bar-chart-alt-2"></i> Análise de Gastos</h3>
    <div class="dash-grid">
      ${sorted
        .map((cat) => {
          const pct = grandTotal > 0 ? ((cat.total / grandTotal) * 100).toFixed(1) : 0;
          return `
          <div class="dash-card">
            <div class="dash-card-header">
              <i class="${cat.icon}"></i>
              <span>${cat.label}</span>
            </div>
            <div class="dash-amount">R$ ${cat.total.toFixed(2)}</div>
            <div class="dash-bar-wrap">
              <div class="dash-bar" style="width: ${pct}%"></div>
            </div>
            <div class="dash-pct">${pct}%</div>
          </div>`;
        })
        .join("")}
    </div>
  `;
}
