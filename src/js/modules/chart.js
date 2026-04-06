// ==========================================
// MODULES / CHART.JS — Gráfico de evolução do saldo
// ==========================================

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/**
 * Constrói o gráfico de linha de evolução mensal do saldo.
 * @param {Array} items
 */
export function buildChart(items) {
  const container = document.getElementById("balance-chart");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p class="dash-empty">Nenhum dado para exibir.</p>`;
    return;
  }

  // Agrupa saldo acumulado por mês
  const monthMap = {};
  [...items]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((item) => {
      const key = item.date.slice(0, 7);
      if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0 };
      if (item.type === "Entrada") monthMap[key].income += Number(item.amount);
      else monthMap[key].expense += Number(item.amount);
    });

  const months  = Object.keys(monthMap).sort();
  const incomes  = months.map((m) => monthMap[m].income);
  const expenses = months.map((m) => monthMap[m].expense);

  // Saldo acumulado mês a mês
  let acc = 0;
  const balances = months.map((m) => {
    acc += monthMap[m].income - monthMap[m].expense;
    return parseFloat(acc.toFixed(2));
  });

  const labels = months.map((m) => {
    const [, mo] = m.split("-");
    return MONTH_NAMES[Number(mo) - 1];
  });

  // SVG inline responsivo
  const W = 600, H = 220, PL = 70, PR = 20, PT = 20, PB = 40;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const allVals = [...balances, 0];
  const minVal  = Math.min(...allVals);
  const maxVal  = Math.max(...allVals);
  const range   = maxVal - minVal || 1;

  const toX = (i) => PL + (i / Math.max(months.length - 1, 1)) * innerW;
  const toY = (v) => PT + innerH - ((v - minVal) / range) * innerH;

  // Linha do saldo
  const points = balances.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  // Área preenchida abaixo da linha
  const areaPoints =
    `${toX(0)},${toY(minVal)} ` +
    balances.map((v, i) => `${toX(i)},${toY(v)}`).join(" ") +
    ` ${toX(months.length - 1)},${toY(minVal)}`;

  // Linha do zero
  const zeroY = toY(0);
  const zeroLine =
    zeroY >= PT && zeroY <= PT + innerH
      ? `<line x1="${PL}" y1="${zeroY}" x2="${W - PR}" y2="${zeroY}"
           stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4 3"/>`
      : "";

  // Labels do eixo Y (3 valores)
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal].map((v) => {
    const y = toY(v);
    const label = v >= 1000 || v <= -1000
      ? `R$${(v / 1000).toFixed(1)}k`
      : `R$${v.toFixed(0)}`;
    return `<text x="${PL - 6}" y="${y}" text-anchor="end" dominant-baseline="central"
              font-size="10" fill="var(--text-muted)">${label}</text>`;
  }).join("");

  // Labels do eixo X
  const xLabels = labels.map((lbl, i) =>
    `<text x="${toX(i)}" y="${H - 8}" text-anchor="middle"
       font-size="11" fill="var(--text-muted)">${lbl}</text>`
  ).join("");

  // Pontos interativos com tooltip
  const dots = balances.map((v, i) => {
    const x = toX(i), y = toY(v);
    const color = v >= 0 ? "var(--color-income)" : "var(--color-expense)";
    const label = `R$ ${v.toFixed(2)}`;
    // tooltip simples via title
    return `
      <g class="chart-dot" data-val="${label}" data-month="${labels[i]} — ${label}">
        <circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="var(--bg-card)" stroke-width="2"/>
        <title>${labels[i]}: ${label}</title>
      </g>`;
  }).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible;display:block">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="var(--color-accent)" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      <!-- Área -->
      <polygon points="${areaPoints}" fill="url(#area-grad)"/>

      <!-- Zero -->
      ${zeroLine}

      <!-- Eixo Y -->
      ${yLabels}

      <!-- Linha -->
      <polyline points="${points}" fill="none"
        stroke="var(--color-accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>

      <!-- Eixo X -->
      ${xLabels}

      <!-- Pontos -->
      ${dots}
    </svg>
  `;
}
