# Guia de desenvolvimento

Esta seção explica cada funcionalidade mostrando como está implementada no código.

---

### 1. Estado global reativo — `core/state.js`

Usa o **padrão Observer**: qualquer módulo pode se inscrever para ser notificado quando os dados mudam. Elimina a necessidade de chamar funções de renderização manualmente em vários lugares.

```js
const state = {
  _items: [],
  _listeners: [],

  // Sempre retorna uma CÓPIA para evitar mutação externa
  get items() { return [...this._items]; },

  // Após qualquer mutação, _notify() avisa todos os inscritos
  add(item) {
    this._items.push(item);
    saveItems(this._items);  // persiste no localStorage
    this._notify();          // dispara re-renderização automática
  },

  update(index, updatedItem) {
    // spread: mantém campos existentes, sobrescreve apenas os alterados
    this._items[index] = { ...this._items[index], ...updatedItem };
    saveItems(this._items);
    this._notify();
  },

  subscribe(fn) { this._listeners.push(fn); },
  _notify()     { this._listeners.forEach((fn) => fn(this.items)); },
};
```

Em `main.js`, a função `render` é inscrita uma única vez e chamada automaticamente:

```js
function render(items) {
  clearTable();
  items.forEach((item, index) => renderItem(item, index, handleDelete, handleEdit));
  updateTotals(items);
  buildDashboard(items);
  buildChart(items);
}

state.subscribe(render);
```

---

### 2. Persistência — `core/storage.js`

Toda comunicação com `localStorage` passa por este módulo. Nenhum outro arquivo o acessa diretamente.

```js
const DB_KEY    = "db_items";
const NAME_KEY  = "user_name";
const THEME_KEY = "app_theme";

// Lê e faz parse do JSON; retorna array vazio se não existir
export const getItems = () =>
  JSON.parse(localStorage.getItem(DB_KEY)) ?? [];

// Serializa e salva toda a lista
export const saveItems = (items) =>
  localStorage.setItem(DB_KEY, JSON.stringify(items));
```

---

### 3. Cadastro e edição — `main.js`

O mesmo botão serve para criar e editar. A variável `editingIndex` controla o modo atual.

```js
let editingIndex = null; // null = criar; número = editar

btnNew.addEventListener("click", () => {
  const item = {
    date:     dateInput.value,
    desc:     descInput.value,
    amount:   Math.abs(amountInput.value).toFixed(2),
    type:     typeSelect.value,
    category: categorizeItem(descInput.value), // categorização automática
  };

  if (editingIndex !== null) {
    state.update(editingIndex, item); // atualiza item existente
    cancelEdit();
  } else {
    state.add(item);                  // adiciona novo item
  }
});

function handleEdit(index) {
  const item = state.items[index];

  // preenche o formulário com os dados do item
  descInput.value   = item.desc;
  amountInput.value = item.amount;
  dateInput.value   = item.date;
  typeSelect.value  = item.type;

  editingIndex = index;
  btnNew.innerHTML = '<i class="bx bx-save"></i> Salvar';
  btnNew.classList.add("btn--editing"); // visual verde

  // botão "Cancelar" criado dinamicamente, inserido após o btnNew
  if (!document.getElementById("btnCancelEdit")) {
    const btnCancel = document.createElement("button");
    btnCancel.id = "btnCancelEdit";
    btnCancel.className = "btn-cancel-edit";
    btnNew.insertAdjacentElement("afterend", btnCancel);
    btnCancel.addEventListener("click", cancelEdit);
  }
}
```

---

### 4. Exclusão com confirmação — `modules/toast.js`

```js
// main.js — chama o confirm antes de remover
function handleDelete(index) {
  const item = state.items[index];
  showConfirm(
    `Excluir "<strong>${item.desc}</strong>"?`,
    () => {
      state.remove(index);         // só executa se confirmar
      showToast("Lançamento excluído.", "info");
    }
  );
}
```

```js
// modules/toast.js — o overlay é sempre filho direto do body
// (evita herdar stacking context de elementos com CSS transform)
export function showConfirm(message, onConfirm) {
  document.body.appendChild(overlay);

  // double rAF: garante que o browser processe a inserção antes de animar
  requestAnimationFrame(() =>
    requestAnimationFrame(() => overlay.classList.add("confirm--visible"))
  );

  overlay.querySelector(".confirm-ok").addEventListener("click", () => {
    onConfirm(); // callback executado apenas aqui
    close();
  });
}
```

---

### 5. Notificações (toast) — `modules/toast.js`

```js
export function showToast(message, type = "info", action = null, duration = 4000) {
  document.getElementById("app-toast")?.remove(); // remove anterior

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`; // tipo define cor da borda esquerda

  document.body.appendChild(toast);

  // double rAF para a transição CSS de entrada funcionar corretamente
  requestAnimationFrame(() =>
    requestAnimationFrame(() => toast.classList.add("toast--visible"))
  );

  toastTimeout = setTimeout(dismiss, duration); // some após `duration` ms
}
```

Tipos: `"success"` (verde), `"danger"` (vermelho), `"info"` (roxo).

---

### 6. Expand por categoria — `modules/dashboard.js`

```js
// Set mantém quais categorias estão abertas entre re-renders
const expandedCats = new Set();

function bindToggleEvents(container) {
  container.querySelectorAll(".dash-card-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const card = toggle.closest(".dash-card");
      const key  = card.dataset.cat; // ex: "alimentacao", "essencial"

      expandedCats.has(key) ? expandedCats.delete(key) : expandedCats.add(key);
      card.classList.toggle("dash-card--open");
      // CSS anima: max-height: 0 → max-height: 600px via transition
    });
  });
}
```

---

### 7. Comparação entre meses — `modules/dashboard.js`

Aparece automaticamente quando há dados de 2 ou mais meses.

```js
function renderComparison(items, months) {
  if (months.length < 2) return ""; // oculto com menos de 2 meses

  const recent = months.slice(-3);  // exibe os 3 meses mais recentes

  const cols = recent.map((mk) => {
    const exp = items.filter(
      (i) => monthKey(i) === mk && (i.type === "Fixo" || i.type === "Variavel")
    );
    return exp
      .filter((i) => (i.category || categorizeItem(i.desc)) === cat.key)
      .reduce((acc, i) => acc + Number(i.amount), 0);
  });

  // tendência: compara mês atual com o anterior
  const diff = cols[idx] - cols[idx - 1];
  trend = diff > 0
    ? `<span class="trend--up">+R$ ${diff.toFixed(2)}</span>`
    : `<span class="trend--down">-R$ ${Math.abs(diff).toFixed(2)}</span>`;
}
```

---

### 8. Gráfico SVG — `modules/chart.js`

Gráfico gerado em SVG puro, sem bibliotecas externas.

```js
const W = 600, H = 220, PL = 70, PR = 20, PT = 20, PB = 40;

// Converte valor financeiro → coordenada de pixel
const toX = (i) => PL + (i / Math.max(months.length - 1, 1)) * innerW;
const toY = (v) => PT + innerH - ((v - minVal) / range) * innerH;
// toY inverte o eixo: valor maior = posição menor no SVG (mais alto)

// Saldo ACUMULADO mês a mês
let acc = 0;
const balances = months.map((m) => {
  acc += monthMap[m].income - monthMap[m].expense;
  return parseFloat(acc.toFixed(2));
});

// Área preenchida: polígono que fecha embaixo da linha
const areaPoints =
  `${toX(0)},${toY(minVal)} ` +
  balances.map((v, i) => `${toX(i)},${toY(v)}`).join(" ") +
  ` ${toX(months.length - 1)},${toY(minVal)}`;
```

---

### 9. Exportação CSV — `modules/export.js`

```js
export function exportToCSV(items) {
  // BOM (Byte Order Mark): instrui o Google Sheets a usar UTF-8
  const BOM = "\uFEFF";
  const csv = BOM + [header.join(","), ...rows].join("\r\n");

  // padrão para forçar download via link temporário
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `controle-financeiro-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url); // libera memória após o download
}
```

Para importar: **Planilhas Google → Arquivo → Importar → Fazer upload** → selecione o `.csv`.

---

### 10. PWA — `manifest.json`, `sw.js` e `main.js`

`manifest.json` define como o app aparece instalado:

```json
{
  "display": "standalone",      // abre sem barra de endereço do browser
  "theme_color": "#6366f1",     // cor da barra de status no Android
  "background_color": "#0f0f1a" // cor do splash screen
}
```

`sw.js` serve arquivos do cache quando offline:

```js
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting(); // ativa imediatamente sem esperar aba fechar
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
```

Botão de instalação em `main.js`:

```js
// O navegador dispara este evento quando o PWA está elegível para instalação
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();               // impede o prompt automático do browser
  deferredInstallPrompt = e;        // guarda para usar no clique do botão
  btnInstall.style.display = "flex"; // só então exibe o botão
});

btnInstall.addEventListener("click", async () => {
  deferredInstallPrompt.prompt();   // abre o diálogo nativo
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === "accepted") {
    btnInstall.style.display = "none";
  }
});
```

---

### 11. Tema claro/escuro — `modules/theme.js`

Trocar o tema é apenas alterar o atributo `data-theme` no `<html>`. Todo o resto é CSS.

```js
export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  saveTheme(theme); // persiste preferência
}
```

```css
/* main.css */
:root, [data-theme="light"] {
  --bg-page:      #f0f2f5;
  --color-income: #10b981;
}

[data-theme="dark"] {
  --bg-page:      #0f0f1a;
  --color-income: #34d399;
}
```

---

### 12. Categorização automática — `modules/dashboard.js`

```js
const normalize = (str) =>
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// normalize remove acentos: "café" → "cafe"

export function categorizeItem(desc) {
  const lower = normalize(desc);
  for (const cat of CATEGORIES) {
    if (cat.key === "outros") continue;
    if (cat.keywords.some((kw) => lower.includes(normalize(kw)))) {
      return cat.key;
    }
  }
  return "outros"; // fallback se nenhuma palavra-chave bater
}
```

Para adicionar palavras-chave, edite o array `keywords` do objeto correspondente em `CATEGORIES` no início do arquivo `dashboard.js`.