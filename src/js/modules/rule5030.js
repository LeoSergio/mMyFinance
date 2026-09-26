// ==========================================
// MODULES / RULE5030.JS — Método 50-30-20
// ==========================================
// Regra: 50% da renda → Necessidades
//        30% da renda → Desejos
//        20% da renda → Investimentos / Poupança

// Mapeamento de categorias para cada pilar
const PILLARS = [
  {
    key:        "necessidades",
    label:      "Necessidades",
    subtitle:   "Moradia, alimentação, saúde, transporte",
    target:     0.50,
    icon:       "bx bx-home-heart",
    color:      "var(--color-total)",
    colorRaw:   "#3b82f6",
    cats:       ["alimentacao", "essencial", "transporte", "saude"],
  },
  {
    key:        "desejos",
    label:      "Desejos",
    subtitle:   "Lazer, entretenimento, compras",
    target:     0.30,
    icon:       "bx bx-happy-alt",
    color:      "#a855f7",
    colorRaw:   "#a855f7",
    cats:       ["lazer", "outros"],
  },
  {
    key:        "investimentos",
    label:      "Investimentos",
    subtitle:   "Poupança, reservas, aplicações",
    target:     0.20,
    icon:       "bx bx-trending-up",
    color:      "var(--color-income)",
    colorRaw:   "#10b981",
    cats:       [], // calculado como: renda - (necessidades + desejos)
  },
];

const monthKey = (item) => item.date.slice(0, 7);

// ── Cálculos ──────────────────────────────────────────────────────

function calcPillars(items) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthItems   = items.filter((i) => monthKey(i) === currentMonth);

  const income = monthItems
    .filter((i) => i.type === "Entrada")
    .reduce((acc, i) => acc + Number(i.amount), 0);

  // Gastos por categoria no mês
  const catSpend = {};
  monthItems
    .filter((i) => i.type !== "Entrada")
    .forEach((i) => {
      const cat = i.category || "outros";
      catSpend[cat] = (catSpend[cat] || 0) + Number(i.amount);
    });

  // Agrupa por pilar
  const necessidades = PILLARS[0].cats.reduce((acc, c) => acc + (catSpend[c] || 0), 0);
  const desejos      = PILLARS[1].cats.reduce((acc, c) => acc + (catSpend[c] || 0), 0);
  const totalExp     = Object.values(catSpend).reduce((a, v) => a + v, 0);
  const investimentos = Math.max(income - totalExp, 0); // saldo positivo = guardado

  return { income, necessidades, desejos, investimentos, totalExp };
}

// ── Score de aderência (0-100) ────────────────────────────────────

function calcAdherence({ income, necessidades, desejos, investimentos }) {
  if (income <= 0) return null;

  const idealNec = income * 0.50;
  const idealDes = income * 0.30;
  const idealInv = income * 0.20;

  // Penalidade por desvio em cada pilar (quanto mais longe, menor o score)
  const devNec = Math.abs(necessidades - idealNec) / idealNec;
  const devDes = Math.abs(desejos      - idealDes) / idealDes;
  const devInv = Math.abs(investimentos - idealInv) / idealInv;

  const score = Math.max(0, 100 - ((devNec + devDes + devInv) / 3) * 100);
  return Math.round(score);
}

// ── Gauge SVG ────────────────────────────────────────────────────

function buildGauge(score) {
  if (score === null) return `
    <div class="rule-gauge-empty">
      <i class="bx bx-info-circle"></i>
      <span>Adicione receitas do mês para ver o score</span>
    </div>`;

  const r = 52;
  const cx = 64, cy = 64;
  const circum  = 2 * Math.PI * r;
  const dashArr = circum * 0.75;          // 3/4 do círculo (270°)
  const dashOff = circum * 0.25 / 2;     // centraliza o arco
  const fill    = dashArr * (1 - score / 100);

  // Cor do score
  let scoreColor = "#10b981"; // verde
  if (score < 50) scoreColor = "#ef4444";
  else if (score < 75) scoreColor = "#f59e0b";

  let label = "Excelente";
  if (score < 40) label = "Precisa de atenção";
  else if (score < 60) label = "Em progresso";
  else if (score < 80) label = "Bom";

  return `
    <div class="rule-gauge-wrap">
      <svg class="rule-gauge-svg" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <!-- trilha -->
        <circle
          cx="${cx}" cy="${cy}" r="${r}"
          fill="none"
          stroke="var(--border-color)"
          stroke-width="10"
          stroke-dasharray="${dashArr} ${circum}"
          stroke-dashoffset="-${dashOff}"
          stroke-linecap="round"
          transform="rotate(135 ${cx} ${cy})"
        />
        <!-- preenchimento animado -->
        <circle
          cx="${cx}" cy="${cy}" r="${r}"
          fill="none"
          stroke="${scoreColor}"
          stroke-width="10"
          stroke-dasharray="${dashArr} ${circum}"
          stroke-dashoffset="${dashOff + fill}"
          stroke-linecap="round"
          transform="rotate(135 ${cx} ${cy})"
          class="rule-gauge-arc"
          style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1);"
        />
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="rule-gauge-score" fill="${scoreColor}">${score}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="rule-gauge-label-svg" fill="var(--text-muted)">/100</text>
      </svg>
      <p class="rule-gauge-desc" style="color:${scoreColor}">${label}</p>
    </div>
  `;
}

// ── Card de pilar ─────────────────────────────────────────────────

function buildPillarCard(pillar, spent, income) {
  const hasIncome  = income > 0;
  const targetAmt  = hasIncome ? income * pillar.target : 0;
  const pctTarget  = pillar.target * 100;             // ex: 50
  const pctReal    = hasIncome ? (spent / income) * 100 : 0;
  const pctBar     = hasIncome ? Math.min((spent / targetAmt) * 100, 100) : 0;
  const isOver     = hasIncome && spent > targetAmt;
  const diff       = Math.abs(spent - targetAmt);

  let statusIcon  = "bx-check-circle";
  let statusClass = "pillar-ok";
  let statusMsg   = `R$ ${diff.toFixed(2)} abaixo do ideal`;
  if (!hasIncome) {
    statusIcon  = "bx-minus-circle";
    statusClass = "pillar-neutral";
    statusMsg   = "Aguardando receita do mês";
  } else if (isOver) {
    statusIcon  = "bx-error-circle";
    statusClass = "pillar-over";
    statusMsg   = `R$ ${diff.toFixed(2)} acima do ideal`;
  } else if (pctBar >= 80) {
    statusIcon  = "bx-error";
    statusClass = "pillar-warn";
    statusMsg   = `Próximo do limite (${pctBar.toFixed(0)}%)`;
  }

  return `
    <div class="pillar-card ${statusClass}">
      <div class="pillar-card-top">
        <div class="pillar-icon-wrap" style="--pillar-color:${pillar.color}">
          <i class="${pillar.icon}"></i>
        </div>
        <div class="pillar-info">
          <span class="pillar-label">${pillar.label}</span>
          <span class="pillar-subtitle">${pillar.subtitle}</span>
        </div>
        <span class="pillar-pct-badge" style="--pillar-color:${pillar.color}">${pctTarget}%</span>
      </div>

      <div class="pillar-amounts">
        <div class="pillar-amount-real">
          <span class="pillar-amount-label">Realizado</span>
          <span class="pillar-amount-value" style="color:${pillar.color}">
            R$ ${spent.toFixed(2)}
          </span>
          <span class="pillar-pct-real">${pctReal.toFixed(1)}% da renda</span>
        </div>
        <div class="pillar-amount-ideal">
          <span class="pillar-amount-label">Ideal</span>
          <span class="pillar-amount-value pillar-ideal-value">
            R$ ${targetAmt.toFixed(2)}
          </span>
        </div>
      </div>

      <div class="pillar-bar-wrap" title="${pctBar.toFixed(1)}% do limite">
        <div class="pillar-bar-fill ${statusClass}-bar" style="width:${pctBar.toFixed(1)}%; --pillar-color:${pillar.color}"></div>
        <div class="pillar-bar-target"></div>
      </div>

      <div class="pillar-status">
        <i class="bx ${statusIcon}"></i>
        <span>${statusMsg}</span>
      </div>
    </div>
  `;
}

// ── Dica contextual ───────────────────────────────────────────────

function buildTip({ income, necessidades, desejos, investimentos }) {
  if (income <= 0) return "";

  const necPct = (necessidades / income) * 100;
  const desPct = (desejos / income) * 100;
  const invPct = (investimentos / income) * 100;

  let tip = "";
  let tipType = "info";

  if (necPct > 60) {
    tip = `💡 Suas necessidades consomem <strong>${necPct.toFixed(0)}%</strong> da renda — acima dos 50% recomendados. Considere revisar planos fixos (aluguel, assinaturas) ou buscar uma renda adicional.`;
    tipType = "warn";
  } else if (desPct > 35) {
    tip = `💡 Seus desejos consomem <strong>${desPct.toFixed(0)}%</strong> da renda — acima dos 30% recomendados. Pequenos cortes no lazer podem liberar recursos para investimentos.`;
    tipType = "warn";
  } else if (invPct < 10 && income > 0) {
    tip = `💡 Você está guardando apenas <strong>${invPct.toFixed(0)}%</strong> da renda. Tente aumentar gradualmente até atingir os 20% recomendados pela regra.`;
    tipType = "warn";
  } else if (invPct >= 20 && necPct <= 50) {
    tip = `🎉 Parabéns! Você está seguindo bem a regra 50-30-20. Continue assim para construir segurança financeira!`;
    tipType = "success";
  } else {
    tip = `📊 Acompanhe sua evolução mês a mês para se aproximar cada vez mais da proporção ideal.`;
    tipType = "info";
  }

  const icons = { warn: "bx-bulb", success: "bx-trophy", info: "bx-info-circle" };
  return `
    <div class="rule-tip rule-tip--${tipType}">
      <i class="bx ${icons[tipType]}"></i>
      <p>${tip}</p>
    </div>
  `;
}

// ── Função principal ──────────────────────────────────────────────

export function buildRule5030(items) {
  const container = document.getElementById("rule5030-section");
  if (!container) return;

  const { income, necessidades, desejos, investimentos, totalExp } = calcPillars(items);
  const score = calcAdherence({ income, necessidades, desejos, investimentos });

  const currentMonth = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const spentMap = {
    necessidades,
    desejos,
    investimentos,
  };

  const cards = PILLARS.map((p) => buildPillarCard(p, spentMap[p.key], income)).join("");

  container.innerHTML = `
    <div class="rule-header">
      <div class="rule-title-group">
        <h3 class="dash-title">
          <i class="bx bx-doughnut-chart"></i> Método 50-30-20
        </h3>
        <span class="budget-month-badge">
          <i class="bx bx-calendar"></i> ${currentMonth}
        </span>
      </div>
      <a
        href="https://www.nubank.com.br/dicas/regra-50-30-20/"
        target="_blank"
        rel="noopener"
        class="rule-learn-link"
        title="Saiba mais sobre a regra 50-30-20"
      >
        <i class="bx bx-info-circle"></i> O que é isso?
      </a>
    </div>

    <div class="rule-body">
      <!-- Score gauge -->
      <div class="rule-gauge-section">
        ${buildGauge(score)}
        <div class="rule-gauge-meta">
          <p class="rule-gauge-subtitle">Score de aderência à regra</p>
          ${income > 0 ? `
            <div class="rule-income-info">
              <i class="bx bx-wallet"></i>
              <span>Renda: <strong>R$ ${income.toFixed(2)}</strong></span>
            </div>
          ` : ""}
        </div>
      </div>

      <!-- Pilares -->
      <div class="rule-pillars">${cards}</div>
    </div>

    ${buildTip({ income, necessidades, desejos, investimentos })}
  `;
}
