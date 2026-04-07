# Controle Financeiro

Aplicação web para controle de receitas e despesas pessoais. Funciona como PWA (Progressive Web App) — pode ser instalada no celular como aplicativo nativo, funciona offline e salva todos os dados localmente no navegador.

---

## Sumário

- [Como executar](#como-executar)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Funcionalidades](#funcionalidades)
- [Guia de desenvolvimento](#guia-de-desenvolvimento)

---

## Como executar

O projeto usa ES Modules (`type="module"`), então **não abre corretamente ao clicar duas vezes no `index.html`**. É necessário um servidor HTTP local.

**Opção 1 — VS Code (recomendado):**
Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) e clique em **Go Live** no canto inferior direito.

**Opção 2 — Terminal com Python:**
```bash
python -m http.server 3000
```
Acesse `http://localhost:3000`.

**Opção 3 — Terminal com Node.js:**
```bash
npx serve .
```

> **PWA e service worker** só funcionam em HTTPS. Para testar a instalação no celular, use [Netlify Drop](https://app.netlify.com/drop) ou [GitHub Pages](https://pages.github.com).

---

## Estrutura de arquivos

```
projeto/
│
├── index.html              ← Estrutura HTML da aplicação
├── manifest.json           ← Configuração do PWA (ícone, nome, cor)
├── sw.js                   ← Service Worker (cache offline)
├── requirements.txt        ← Dependências de desenvolvimento Python
├── .venv                   ← Configurações do ambiente virtual
├── README.md               ← Este arquivo
│
└── src/
    ├── assets/
    │   ├── icon-192.png    ← Ícone do app (tela inicial do celular)
    │   └── icon-512.png    ← Ícone do app (splash screen)
    │
    ├── styles/
    │   ├── main.css        ← Todos os estilos, variáveis CSS e temas
    │   └── media.css       ← Responsividade (media queries)
    │
    └── js/
        ├── main.js         ← Ponto de entrada: eventos, orquestração, PWA
        │
        ├── core/
        │   ├── state.js    ← Estado global reativo (padrão Observer)
        │   └── storage.js  ← Abstração do localStorage
        │
        └── modules/
            ├── ui.js           ← Renderização da tabela e totais
            ├── dashboard.js    ← Análise de gastos por categoria
            ├── chart.js        ← Gráfico SVG de evolução do saldo
            ├── toast.js        ← Notificações e modal de confirmação
            ├── export.js       ← Exportação para CSV / Google Sheets
            ├── theme.js        ← Alternância tema claro/escuro
            ├── drawer.js       ← Menu lateral hambúrguer
            └── greeting.js     ← Saudação e modal de nome
```

---

## Funcionalidades

| Funcionalidade | Arquivo principal |
|---|---|
| Cadastro de lançamentos | `main.js` + `core/state.js` |
| Edição de lançamento | `main.js` + `modules/ui.js` |
| Exclusão com confirmação | `modules/toast.js` |
| Cards de resumo (entradas/saídas/saldo) | `modules/ui.js` |
| Análise de gastos por categoria | `modules/dashboard.js` |
| Expand de itens por categoria | `modules/dashboard.js` |
| Comparação entre meses | `modules/dashboard.js` |
| Gráfico de evolução do saldo | `modules/chart.js` |
| Exportar para Google Sheets (CSV) | `modules/export.js` |
| Tema claro / escuro | `modules/theme.js` |
| Menu lateral | `modules/drawer.js` |
| Saudação personalizada | `modules/greeting.js` |
| Notificações (toast) | `modules/toast.js` |
| Instalação como app (PWA) | `manifest.json` + `sw.js` + `main.js` |
| Funcionamento offline | `sw.js` |

---

