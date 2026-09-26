// ==========================================
// MODULES / INSIGHTS.JS — Análise inteligente
// ==========================================
// Gera insights contextuais baseados em heurísticas
// sobre os dados do usuário, sem nenhuma API externa.

import { categorizeItem } from "./dashboard.js";

// ── Helpers ───────────────────────────────────────────────────────

const monthKey   = (item) => item.date.slice(0, 7);
const fmt        = (v)    => `R$ ${Number(v).toFixed(2)}`;
const fmtPct     = (v)    => `${Math.abs(v).toFixed(1)}%`;

const CAT_LABELS = {
  alimentacao: "Alimentação", essencial: "Essenciais",
  transporte:  "Transporte",  saude:     "Saúde",
  lazer:       "Lazer",       outros:    "Outros",
};

// Agrupa itens por mês → { "2026-09": { income, expense, items[] } }
function buildMonthMap(items) {
  const map = {};
  items.forEach((item) => {
    const mk = monthKey(item);
    if (!map[mk]) map[mk] = { income: 0, expense: 0, items: [] };
    if (item.type === "Entrada") map[mk].income  += Number(item.amount);
    else                         map[mk].expense += Number(item.amount);
    map[mk].items.push(item);
  });
  return map;
}

// Gastos por categoria em um conjunto de items
function spendByCategory(items) {
  const spend = {};
  items.filter((i) => i.type !== "Entrada").forEach((i) => {
    const cat = i.category || categorizeItem(i.desc);
    spend[cat] = (spend[cat] || 0) + Number(i.amount);
  });
  return spend;
}

// ── Fábrica de regras de insight ─────────────────────────────────
// Cada função retorna null (sem insight) ou um objeto:
// { id, type: "success|warning|danger|info", icon, title, body, value? }

// 1. Saldo do mês atual (positivo ou negativo)
function insightSaldoAtual(monthMap, months) {
  const mk = months[months.length - 1];
  if (!mk) return null;
  const { income, expense } = monthMap[mk];
  if (income === 0) return null;

  const saldo = income - expense;
  const pct   = ((saldo / income) * 100).toFixed(1);

  if (saldo >= 0) {
    return {
      id: "saldo-atual", type: "success", icon: "bx-check-shield",
      title: "Saldo positivo este mês 🎉",
      body:  `Você está sobrando <strong>${fmt(saldo)}</strong> (${pct}% da renda). Continue assim!`,
      value: `+${fmt(saldo)}`,
    };
  }
  return {
    id: "saldo-atual", type: "danger", icon: "bx-error-circle",
    title: "Saldo negativo este mês",
    body:  `Suas despesas superaram a renda em <strong>${fmt(Math.abs(saldo))}</strong>. Revise seus gastos.`,
    value: fmt(saldo),
  };
}

// 2. Saldo negativo em meses consecutivos
function insightSaldoNegativoConsec(monthMap, months) {
  if (months.length < 2) return null;
  let consec = 0;
  for (let i = months.length - 1; i >= 0; i--) {
    const { income, expense } = monthMap[months[i]];
    if (income > 0 && expense > income) consec++;
    else break;
  }
  if (consec < 2) return null;
  return {
    id: "consec-negativo", type: "danger", icon: "bx-trending-down",
    title: `${consec} meses consecutivos no vermelho`,
    body:  `Você está gastando mais do que ganha há <strong>${consec} meses seguidos</strong>. É hora de revisar os gastos fixos.`,
    value: `${consec}x`,
  };
}

// 3. Categoria que mais cresceu em relação ao mês anterior
function insightCategoriaCresceu(monthMap, months) {
  if (months.length < 2) return null;
  const curr = months[months.length - 1];
  const prev = months[months.length - 2];
  const spCurr = spendByCategory(monthMap[curr].items);
  const spPrev = spendByCategory(monthMap[prev].items);

  let maxDiff = 0, maxCat = null;
  Object.keys(spCurr).forEach((cat) => {
    const prevVal = spPrev[cat] || 0;
    if (prevVal === 0) return;
    const diff = spCurr[cat] - prevVal;
    if (diff > maxDiff) { maxDiff = diff; maxCat = cat; }
  });

  if (!maxCat || maxDiff < 20) return null;
  const pct = ((maxDiff / (spPrev[maxCat] || 1)) * 100).toFixed(0);

  return {
    id: "cat-cresceu", type: "warning", icon: "bx-trending-up",
    title: `${CAT_LABELS[maxCat] || maxCat} cresceu ${pct}%`,
    body:  `Você gastou <strong>${fmt(maxDiff)} a mais</strong> em ${CAT_LABELS[maxCat] || maxCat} em relação ao mês passado.`,
    value: `+${fmtPct(pct)}`,
  };
}

// 4. Categoria que mais caiu (positivo!)
function insightCategoriaCaiu(monthMap, months) {
  if (months.length < 2) return null;
  const curr = months[months.length - 1];
  const prev = months[months.length - 2];
  const spCurr = spendByCategory(monthMap[curr].items);
  const spPrev = spendByCategory(monthMap[prev].items);

  let maxDiff = 0, maxCat = null;
  Object.keys(spPrev).forEach((cat) => {
    const currVal = spCurr[cat] || 0;
    const diff    = spPrev[cat] - currVal;
    if (diff > maxDiff) { maxDiff = diff; maxCat = cat; }
  });

  if (!maxCat || maxDiff < 20) return null;
  const pct = ((maxDiff / spPrev[maxCat]) * 100).toFixed(0);

  return {
    id: "cat-caiu", type: "success", icon: "bx-happy",
    title: `Economia em ${CAT_LABELS[maxCat] || maxCat} 👍`,
    body:  `Você gastou <strong>${fmt(maxDiff)} a menos</strong> em ${CAT_LABELS[maxCat] || maxCat} este mês — uma redução de ${pct}%.`,
    value: `-${fmtPct(pct)}`,
  };
}

// 5. Ritmo de gastos vs dias restantes no mês
function insightRitmoDiario(monthMap, months) {
  const mk = months[months.length - 1];
  if (!mk) return null;
  const { income, expense } = monthMap[mk];
  if (income === 0) return null;

  const today  = new Date();
  const diaAtual = today.getDate();
  const diasNoMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const diasRestantes = diasNoMes - diaAtual;
  if (diasRestantes <= 0) return null;

  const gastoDiario    = expense / diaAtual;
  const projecaoFinal  = gastoDiario * diasNoMes;
  const saldoProjetado = income - projecaoFinal;

  if (saldoProjetado >= 0) return null; // sem alerta se projeção é positiva

  return {
    id: "ritmo-diario", type: "warning", icon: "bx-time-five",
    title: "Ritmo de gastos elevado ⚡",
    body:  `No ritmo atual (<strong>${fmt(gastoDiario)}/dia</strong>), você terminará o mês com saldo de <strong>${fmt(saldoProjetado)}</strong>.`,
    value: fmt(saldoProjetado),
  };
}

// 6. Taxa de poupança histórica
function insightTaxaPoupanca(monthMap, months) {
  if (months.length < 1) return null;
  const rates = months.map((mk) => {
    const { income, expense } = monthMap[mk];
    if (income <= 0) return null;
    return ((income - expense) / income) * 100;
  }).filter((r) => r !== null);

  if (rates.length === 0) return null;
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;

  if (avg >= 20) {
    return {
      id: "taxa-poupanca", type: "success", icon: "bx-coin-stack",
      title: "Ótima taxa de poupança!",
      body:  `Sua taxa média de poupança é <strong>${fmtPct(avg)}</strong> — acima dos 20% recomendados pela regra 50-30-20.`,
      value: `${fmtPct(avg)}`,
    };
  }
  if (avg < 0) {
    return {
      id: "taxa-poupanca", type: "danger", icon: "bx-coin-stack",
      title: "Taxa de poupança negativa",
      body:  `Sua taxa média de poupança é <strong>${fmtPct(avg)}</strong>. Você está consumindo suas reservas.`,
      value: `${avg.toFixed(1)}%`,
    };
  }
  return {
    id: "taxa-poupanca", type: "info", icon: "bx-coin-stack",
    title: `Taxa de poupança: ${fmtPct(avg)}`,
    body:  `Sua média de poupança é <strong>${fmtPct(avg)}</strong>. A meta é atingir 20% da renda guardados todo mês.`,
    value: `${fmtPct(avg)}`,
  };
}

// 7. Maior gasto avulso do mês
function insightMaiorGasto(monthMap, months) {
  const mk = months[months.length - 1];
  if (!mk) return null;
  const expenses = monthMap[mk].items.filter((i) => i.type !== "Entrada");
  if (expenses.length === 0) return null;

  const maior = expenses.reduce((max, i) =>
    Number(i.amount) > Number(max.amount) ? i : max
  );

  const pctDaRenda = monthMap[mk].income > 0
    ? ((Number(maior.amount) / monthMap[mk].income) * 100).toFixed(1)
    : null;

  return {
    id: "maior-gasto", type: pctDaRenda > 30 ? "warning" : "info",
    icon: "bx-receipt",
    title: "Maior despesa do mês",
    body:  `<strong>${maior.desc}</strong> foi seu maior gasto: <strong>${fmt(maior.amount)}</strong>${pctDaRenda ? ` (${pctDaRenda}% da renda)` : ""}.`,
    value: fmt(maior.amount),
  };
}

// 8. Melhor mês histórico (menor gasto)
function insightMelhorMes(monthMap, months) {
  if (months.length < 3) return null;
  const mk = months[months.length - 1];
  const curr = monthMap[mk];

  const historico = months.slice(0, -1).map((m) => monthMap[m]);
  const mediaExp  = historico.reduce((a, m) => a + m.expense, 0) / historico.length;

  if (curr.expense < mediaExp * 0.85) {
    const economia = mediaExp - curr.expense;
    return {
      id: "melhor-mes", type: "success", icon: "bx-trophy",
      title: "Melhor mês em gastos!",
      body:  `Você gastou <strong>${fmt(economia)} a menos</strong> do que sua média histórica. Seu menor mês de despesas!`,
      value: `-${fmt(economia)}`,
    };
  }
  return null;
}

// 9. Despesas fixas pesadas (>60% da renda)
function insightDespesasFixas(monthMap, months) {
  const mk = months[months.length - 1];
  if (!mk) return null;
  const { income, items } = monthMap[mk];
  if (income === 0) return null;

  const fixo = items
    .filter((i) => i.type === "Fixo")
    .reduce((acc, i) => acc + Number(i.amount), 0);

  const pct = (fixo / income) * 100;
  if (pct < 50) return null;

  return {
    id: "despesas-fixas", type: pct > 70 ? "danger" : "warning",
    icon: "bx-lock-alt",
    title: `Despesas fixas: ${pct.toFixed(0)}% da renda`,
    body:  `Suas saídas fixas consomem <strong>${fmt(fixo)}</strong> (${pct.toFixed(0)}% da renda). Pouco espaço para imprevistos.`,
    value: `${pct.toFixed(0)}%`,
  };
}

// 10. Mês sem receita registrada
function insightSemReceita(monthMap, months) {
  const mk = months[months.length - 1];
  if (!mk) return null;
  const { income, expense } = monthMap[mk];
  if (income > 0 || expense === 0) return null;

  return {
    id: "sem-receita", type: "info", icon: "bx-wallet-alt",
    title: "Nenhuma receita registrada",
    body:  "Você tem despesas registradas este mês, mas nenhuma entrada. Adicione sua renda para ativar análises completas.",
    value: null,
  };
}

// ── Engine principal ──────────────────────────────────────────────

function runInsightEngine(items) {
  if (items.length === 0) return [];

  const monthMap = buildMonthMap(items);
  const months   = Object.keys(monthMap).sort();

  const runners = [
    insightSaldoAtual,
    insightSaldoNegativoConsec,
    insightCategoriaCresceu,
    insightCategoriaCaiu,
    insightRitmoDiario,
    insightTaxaPoupanca,
    insightMaiorGasto,
    insightMelhorMes,
    insightDespesasFixas,
    insightSemReceita,
  ];

  return runners
    .map((fn) => { try { return fn(monthMap, months); } catch { return null; } })
    .filter(Boolean);
}

// ── Renderização ──────────────────────────────────────────────────

const TYPE_META = {
  success: { icon: "bx-check-circle",  border: "var(--color-income)",  bg: "rgba(16,185,129,0.07)"  },
  warning: { icon: "bx-error",         border: "#f59e0b",              bg: "rgba(245,158,11,0.07)"  },
  danger:  { icon: "bx-error-circle",  border: "var(--color-expense)", bg: "rgba(239,68,68,0.07)"   },
  info:    { icon: "bx-info-circle",   border: "var(--color-accent)",  bg: "rgba(99,102,241,0.07)"  },
};

function renderInsightCard(insight, index) {
  const meta = TYPE_META[insight.type] || TYPE_META.info;
  return `
    <div
      class="insight-card insight-card--${insight.type}"
      style="--insight-border:${meta.border}; --insight-bg:${meta.bg}; animation-delay:${index * 60}ms"
    >
      <div class="insight-card-left">
        <div class="insight-icon-wrap">
          <i class="bx ${insight.icon}"></i>
        </div>
      </div>
      <div class="insight-card-body">
        <p class="insight-title">${insight.title}</p>
        <p class="insight-body">${insight.body}</p>
      </div>
      ${insight.value ? `
        <div class="insight-value-wrap">
          <span class="insight-value">${insight.value}</span>
        </div>
      ` : ""}
    </div>
  `;
}

// ── Função exportada ──────────────────────────────────────────────

export function buildInsights(items) {
  const container = document.getElementById("insights-section");
  if (!container) return;

  const insights = runInsightEngine(items);

  if (insights.length === 0) {
    container.innerHTML = `
      <div class="insights-header">
        <h3 class="dash-title"><i class="bx bx-brain"></i> Análise Inteligente</h3>
      </div>
      <div class="insights-empty">
        <i class="bx bx-data"></i>
        <p>Adicione lançamentos para ver análises inteligentes dos seus dados.</p>
      </div>
    `;
    return;
  }

  // Ordena: danger → warning → success → info
  const order = { danger: 0, warning: 1, success: 2, info: 3 };
  const sorted = [...insights].sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));

  container.innerHTML = `
    <div class="insights-header">
      <div class="insights-title-group">
        <h3 class="dash-title">
          <i class="bx bx-brain"></i> Análise Inteligente
        </h3>
        <span class="insights-count-badge">${sorted.length} ${sorted.length === 1 ? "insight" : "insights"}</span>
      </div>
    </div>
    <div class="insights-grid">
      ${sorted.map((ins, i) => renderInsightCard(ins, i)).join("")}
    </div>
  `;
}
