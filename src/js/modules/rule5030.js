// ==========================================
// MODULES / RULE5030.JS — Método Orçamentário Flexível (50-30-20 ou Personalizado)
// ==========================================
import { getLocalMonthString } from "../core/date.js";
import { showToast } from "./toast.js";

const RATIOS_STORAGE_KEY = "app_rule_ratios";

export const DEFAULT_RATIOS = {
  nec: 50,
  des: 30,
  inv: 20,
};

const PRESETS = [
  { label: "Clássica", desc: "Equilíbrio geral", nec: 50, des: 30, inv: 20 },
  { label: "Custo Alto", desc: "Moradia/contas pesadas", nec: 60, des: 20, inv: 20 },
  { label: "Reestruturação", desc: "Fase de aperto/dívidas", nec: 70, des: 20, inv: 10 },
  { label: "Aceleração", desc: "Foco em independência", nec: 40, des: 30, inv: 30 },
];

export function getRatios() {
  try {
    const saved = JSON.parse(localStorage.getItem(RATIOS_STORAGE_KEY));
    if (saved && Number(saved.nec) + Number(saved.des) + Number(saved.inv) === 100) {
      return {
        nec: Number(saved.nec),
        des: Number(saved.des),
        inv: Number(saved.inv),
      };
    }
  } catch {}
  return { ...DEFAULT_RATIOS };
}

export function saveRatios(ratios) {
  localStorage.setItem(RATIOS_STORAGE_KEY, JSON.stringify(ratios));
}

function getPillarsConfig(ratios) {
  return [
    {
      key:      "necessidades",
      label:    "Necessidades",
      subtitle: "Moradia, alimentação, saúde, transporte, educação",
      target:   ratios.nec / 100,
      icon:     "bx bx-home-heart",
      color:    "var(--color-total)",
      colorRaw: "#3b82f6",
    },
    {
      key:      "desejos",
      label:    "Desejos",
      subtitle: "Lazer, entretenimento, compras, estilo de vida",
      target:   ratios.des / 100,
      icon:     "bx bx-happy-alt",
      color:    "#a855f7",
      colorRaw: "#a855f7",
    },
    {
      key:      "investimentos",
      label:    "Investimentos",
      subtitle: "Aportes, poupança, reservas, saldo guardado",
      target:   ratios.inv / 100,
      icon:     "bx bx-trending-up",
      color:    "var(--color-income)",
      colorRaw: "#10b981",
    },
  ];
}

const monthKey = (item) => item.date.slice(0, 7);

// ── Cálculos de Alta Precisão ─────────────────────────────────────

function calcPillars(items) {
  const currentMonth = getLocalMonthString();
  const monthItems   = items.filter((i) => monthKey(i) === currentMonth);

  const income = monthItems
    .filter((i) => i.type === "Entrada")
    .reduce((acc, i) => acc + Number(i.amount), 0);

  let necessidades = 0;
  let desejos = 0;
  let aportesInvestimentos = 0;

  const NECESSIDADE_CATS = new Set([
    "alimentacao", "essencial", "transporte", "saude", "educacao"
  ]);

  monthItems
    .filter((i) => i.type !== "Entrada")
    .forEach((i) => {
      const cat = (i.category || "outros").toLowerCase();
      const amt = Number(i.amount);

      if (cat === "investimentos" || cat === "investimento") {
        aportesInvestimentos += amt;
      } else if (NECESSIDADE_CATS.has(cat)) {
        necessidades += amt;
      } else {
        desejos += amt;
      }
    });

  const totalGastosConsumo = necessidades + desejos;
  const sobraLivre = Math.max(income - (totalGastosConsumo + aportesInvestimentos), 0);
  const investimentos = aportesInvestimentos + sobraLivre;
  const totalExp = necessidades + desejos + aportesInvestimentos;

  return { income, necessidades, desejos, investimentos, totalExp, aportesInvestimentos };
}

// ── Score de aderência justo (0-100) ──────────────────────────────

function calcAdherence({ income, necessidades, desejos, investimentos }, ratios) {
  if (income <= 0) return null;

  const idealNec = income * (ratios.nec / 100);
  const idealDes = income * (ratios.des / 100);
  const idealInv = income * (ratios.inv / 100);

  // Necessidades: dentro da meta = 100; exceder = penalidade
  const scoreNec = necessidades <= idealNec
    ? 100
    : Math.max(0, 100 - ((necessidades - idealNec) / (idealNec || 1)) * 100);

  // Desejos: dentro da meta = 100 (economizar em supérfluos é mérito, não penalidade!)
  const scoreDes = desejos <= idealDes
    ? 100
    : Math.max(0, 100 - ((desejos - idealDes) / (idealDes || 1)) * 100);

  // Investimentos: atingiu ou superou a meta = 100; abaixo = proporcional
  const scoreInv = idealInv <= 0
    ? 100
    : Math.min(100, (investimentos / idealInv) * 100);

  const score = Math.round((scoreNec + scoreDes + scoreInv) / 3);
  return Math.max(0, Math.min(100, score));
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
  const dashArr = circum * 0.75;
  const dashOff = circum * 0.25 / 2;
  const fill    = dashArr * (1 - score / 100);

  let scoreColor = "#10b981";
  if (score < 50) scoreColor = "#ef4444";
  else if (score < 75) scoreColor = "#f59e0b";

  let label = "Excelente";
  if (score < 40) label = "Precisa de atenção";
  else if (score < 60) label = "Em progresso";
  else if (score < 80) label = "Bom";

  return `
    <div class="rule-gauge-wrap">
      <svg class="rule-gauge-svg" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
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
  const pctTarget  = Math.round(pillar.target * 100);
  const pctReal    = hasIncome ? (spent / income) * 100 : 0;
  const pctBar     = targetAmt > 0 ? Math.min((spent / targetAmt) * 100, 100) : 0;
  const isOver     = hasIncome && spent > targetAmt;
  const diff       = Math.abs(spent - targetAmt);

  let statusIcon  = "bx-check-circle";
  let statusClass = "pillar-ok";
  let statusMsg   = `R$ ${diff.toFixed(2)} abaixo do teto`;

  if (!hasIncome) {
    statusIcon  = "bx-minus-circle";
    statusClass = "pillar-neutral";
    statusMsg   = "Aguardando receita do mês";
  } else if (pillar.key === "investimentos") {
    if (spent >= targetAmt) {
      statusIcon  = "bx-check-circle";
      statusClass = "pillar-ok";
      statusMsg   = `Meta atingida! (+R$ ${diff.toFixed(2)})`;
    } else {
      statusIcon  = "bx-time-five";
      statusClass = "pillar-warn";
      statusMsg   = `Faltam R$ ${diff.toFixed(2)} para a meta`;
    }
  } else if (isOver) {
    statusIcon  = "bx-error-circle";
    statusClass = "pillar-over";
    statusMsg   = `R$ ${diff.toFixed(2)} acima do ideal`;
  } else if (pctBar >= 85) {
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
          <span class="pillar-amount-label">Ideal (${pctTarget}%)</span>
          <span class="pillar-amount-value pillar-ideal-value">
            R$ ${targetAmt.toFixed(2)}
          </span>
        </div>
      </div>

      <div class="pillar-bar-wrap" title="${pctBar.toFixed(1)}% do planejado">
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

function buildTip({ income, necessidades, desejos, investimentos }, ratios) {
  if (income <= 0) return "";

  const necPct = (necessidades / income) * 100;
  const desPct = (desejos / income) * 100;
  const invPct = (investimentos / income) * 100;

  let tip = "";
  let tipType = "info";

  if (necPct > ratios.nec + 5) {
    tip = `💡 Suas necessidades consomem <strong>${necPct.toFixed(0)}%</strong> da renda — acima do teto de ${ratios.nec}%. Tente renegociar despesas fixas ou ajustar a regra se o seu custo de vida for estruturalmente mais alto.`;
    tipType = "warn";
  } else if (desPct > ratios.des + 5) {
    tip = `💡 Seus desejos consomem <strong>${desPct.toFixed(0)}%</strong> da renda — acima da meta de ${ratios.des}%. Reduzir pequenos gastos de lazer pode liberar mais recursos para seus investimentos.`;
    tipType = "warn";
  } else if (invPct < ratios.inv && income > 0) {
    tip = `💡 Você guardou <strong>${invPct.toFixed(0)}%</strong> da renda (meta: ${ratios.inv}%). Pequenos ajustes nos desejos ajudarão você a fechar o mês na meta estipulada.`;
    tipType = "warn";
  } else if (invPct >= ratios.inv && necPct <= ratios.nec) {
    tip = `🎉 Excelente! Você está cumprindo a regra ${ratios.nec}-${ratios.des}-${ratios.inv} com louvor. Continue nesse ritmo para acelerar seus objetivos!`;
    tipType = "success";
  } else {
    tip = `📊 Bom equilíbrio! Acompanhe seus lançamentos para manter os gastos alinhados com suas metas financeiras.`;
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

// ── Modal de Configuração de Proporções ────────────────────────────

function openRuleConfigModal(items) {
  const existing = document.getElementById("rule-config-modal");
  if (existing) existing.remove();

  const currentRatios = getRatios();

  const overlay = document.createElement("div");
  overlay.id = "rule-config-modal";
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-box rule-modal-box">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
        <h3 style="font-size:1.1rem; margin:0; display:flex; align-items:center; gap:0.4rem; color:var(--text-primary);">
          <i class="bx bx-slider-alt" style="color:var(--color-accent);"></i> Ajustar Proporções da Regra
        </h3>
        <button id="rule-modal-close-x" style="background:none; border:none; font-size:1.3rem; color:var(--text-muted); cursor:pointer;">
          <i class="bx bx-x"></i>
        </button>
      </div>

      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">
        Adapte a estratégia à sua realidade atual. A soma das 3 partes deve totalizar <strong>100%</strong>.
      </p>

      <p class="rule-presets-title">Estratégias sugeridas:</p>
      <div class="rule-presets-grid">
        ${PRESETS.map((p) => `
          <button class="rule-preset-btn" data-nec="${p.nec}" data-des="${p.des}" data-inv="${p.inv}">
            <strong>${p.nec} / ${p.des} / ${p.inv} — ${p.label}</strong>
            <span style="font-size:0.72rem; color:var(--text-muted);">${p.desc}</span>
          </button>
        `).join("")}
      </div>

      <div class="rule-ratios-form">
        <div class="rule-ratio-row">
          <label class="rule-ratio-label" for="ratio-input-nec">
            <i class="bx bx-home-heart" style="color:var(--color-total);"></i> Necessidades (%)
          </label>
          <div class="rule-ratio-input-wrap">
            <input type="number" id="ratio-input-nec" class="rule-ratio-input" min="0" max="100" value="${currentRatios.nec}">
            <span>%</span>
          </div>
        </div>

        <div class="rule-ratio-row">
          <label class="rule-ratio-label" for="ratio-input-des">
            <i class="bx bx-happy-alt" style="color:#a855f7;"></i> Desejos (%)
          </label>
          <div class="rule-ratio-input-wrap">
            <input type="number" id="ratio-input-des" class="rule-ratio-input" min="0" max="100" value="${currentRatios.des}">
            <span>%</span>
          </div>
        </div>

        <div class="rule-ratio-row">
          <label class="rule-ratio-label" for="ratio-input-inv">
            <i class="bx bx-trending-up" style="color:var(--color-income);"></i> Investimentos (%)
          </label>
          <div class="rule-ratio-input-wrap">
            <input type="number" id="ratio-input-inv" class="rule-ratio-input" min="0" max="100" value="${currentRatios.inv}">
            <span>%</span>
          </div>
        </div>
      </div>

      <div class="rule-total-bar">
        <span>Soma total:</span>
        <span id="rule-total-val" class="rule-total-val--valid">100%</span>
      </div>

      <div class="confirm-actions">
        <button class="confirm-cancel" id="rule-modal-cancel">Cancelar</button>
        <button class="confirm-ok" id="rule-modal-save">Salvar Regra</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("confirm--visible")));

  const inputNec = overlay.querySelector("#ratio-input-nec");
  const inputDes = overlay.querySelector("#ratio-input-des");
  const inputInv = overlay.querySelector("#ratio-input-inv");
  const totalValEl = overlay.querySelector("#rule-total-val");
  const saveBtn = overlay.querySelector("#rule-modal-save");

  const close = () => {
    overlay.classList.remove("confirm--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  const updateTotal = () => {
    const n = Number(inputNec.value) || 0;
    const d = Number(inputDes.value) || 0;
    const i = Number(inputInv.value) || 0;
    const sum = n + d + i;

    totalValEl.textContent = `${sum}%`;
    if (sum === 100) {
      totalValEl.className = "rule-total-val--valid";
      saveBtn.disabled = false;
      saveBtn.style.opacity = "1";
    } else {
      totalValEl.className = "rule-total-val--invalid";
      saveBtn.disabled = true;
      saveBtn.style.opacity = "0.5";
    }
  };

  [inputNec, inputDes, inputInv].forEach((inp) => inp.addEventListener("input", updateTotal));

  overlay.querySelectorAll(".rule-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      inputNec.value = btn.dataset.nec;
      inputDes.value = btn.dataset.des;
      inputInv.value = btn.dataset.inv;
      updateTotal();
    });
  });

  overlay.querySelector("#rule-modal-close-x").addEventListener("click", close);
  overlay.querySelector("#rule-modal-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  saveBtn.addEventListener("click", () => {
    const n = Number(inputNec.value) || 0;
    const d = Number(inputDes.value) || 0;
    const i = Number(inputInv.value) || 0;

    if (n + d + i !== 100) {
      showToast("A soma das faixas deve ser exatamente 100%!", "danger");
      return;
    }

    saveRatios({ nec: n, des: d, inv: i });
    close();
    buildRule5030(items);
    showToast(`Regra ${n}-${d}-${i} configurada com sucesso!`, "success");
  });
}

// ── Função principal ──────────────────────────────────────────────

export function buildRule5030(items) {
  const container = document.getElementById("rule5030-section");
  if (!container) return;

  const ratios  = getRatios();
  const pillars = getPillarsConfig(ratios);

  const { income, necessidades, desejos, investimentos } = calcPillars(items);
  const score = calcAdherence({ income, necessidades, desejos, investimentos }, ratios);

  const currentMonth = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });
  const ruleTitle = `Método ${ratios.nec}-${ratios.des}-${ratios.inv}`;

  const spentMap = {
    necessidades,
    desejos,
    investimentos,
  };

  const cards = pillars.map((p) => buildPillarCard(p, spentMap[p.key], income)).join("");

  container.innerHTML = `
    <div class="rule-header">
      <div class="rule-title-group">
        <h3 class="dash-title">
          <i class="bx bx-doughnut-chart"></i> ${ruleTitle}
        </h3>
        <span class="budget-month-badge">
          <i class="bx bx-calendar"></i> ${currentMonth}
        </span>
      </div>
      <div class="rule-actions">
        <button id="btn-config-rule" class="rule-config-btn" title="Personalizar proporções">
          <i class="bx bx-slider-alt"></i> Ajustar Regra
        </button>
        <a
          href="https://www.nubank.com.br/dicas/regra-50-30-20/"
          target="_blank"
          rel="noopener"
          class="rule-learn-link"
          title="Saiba mais sobre a estratégia orçamentária"
        >
          <i class="bx bx-info-circle"></i> O que é?
        </a>
      </div>
    </div>

    <div class="rule-body">
      <!-- Score gauge -->
      <div class="rule-gauge-section">
        ${buildGauge(score)}
        <div class="rule-gauge-meta">
          <p class="rule-gauge-subtitle">Score de aderência à sua regra</p>
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

    ${buildTip({ income, necessidades, desejos, investimentos }, ratios)}
  `;

  document.getElementById("btn-config-rule")?.addEventListener("click", () => {
    openRuleConfigModal(items);
  });
}
