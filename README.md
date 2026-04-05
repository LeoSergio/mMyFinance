# Controle Financeiro

Aplicação web para controle de receitas e despesas pessoais, com categorização automática, dashboard de análise e suporte a tema claro/escuro.

## Estrutura do projeto

```
projeto/
├── index.html               ← Ponto de entrada HTML
├── README.md
└── src/
    ├── styles/
    │   ├── main.css         ← Estilos globais e variáveis CSS
    │   └── media.css        ← Responsividade (media queries)
    └── js/
        ├── main.js          ← Ponto de entrada JS (inicialização e eventos)
        ├── core/
        │   ├── storage.js   ← Abstração do localStorage
        │   └── state.js     ← Estado global reativo (subscribe/notify)
        └── modules/
            ├── ui.js        ← Renderização da tabela e totais
            ├── dashboard.js ← Categorização e análise de gastos
            ├── theme.js     ← Alternância de tema claro/escuro
            ├── drawer.js    ← Menu lateral hambúrguer
            └── greeting.js  ← Modal de nome e banner de boas-vindas
```

## Como executar

Por usar ES Modules (`type="module"`), o projeto precisa ser servido via servidor HTTP. Não abre corretamente ao abrir o `index.html` direto no navegador.

**Opção 1 — VS Code:** instale a extensão *Live Server* e clique em "Go Live".

**Opção 2 — Terminal:**
```bash
# Python
python -m http.server 3000

# Node.js (npx)
npx serve .
```

Acesse `http://localhost:3000` no navegador.

## Funcionalidades

- Cadastro de entradas e saídas (fixas e variáveis)
- Cálculo automático de saldo
- Categorização automática por palavras-chave na descrição
- Dashboard com barras de progresso por categoria
- Tema claro/escuro com persistência
- Saudação personalizada com nome salvo
- Menu lateral responsivo
- Impressão da tabela
