// ==========================================
// MODULES / CATEGORY.JS — Gestão dinâmica de categorias
// ==========================================

const CUSTOM_CATS_KEY = "app_custom_categories";

export const DEFAULT_CATEGORIES = [
  { key: "alimentacao", label: "Alimentação", icon: "bx bx-food-menu", keywords: ["comida","alimenta","mercado","supermercado","restaurante","lanche","almoço","jantar","café","padaria","pizza","hamburguer","ifood","delivery","salgado","açougue","feira"] },
  { key: "essencial",   label: "Moradia / Contas", icon: "bx bx-home", keywords: ["aluguel","luz","agua","energia","internet","telefone","condominio","iptu","gas","plano","casa"] },
  { key: "transporte",  label: "Transporte", icon: "bx bx-car", keywords: ["combustivel","gasolina","uber","99","onibus","metro","passagem","pedagio","estacionamento","manutenção","carro","moto","ipva","etanol"] },
  { key: "saude",       label: "Saúde", icon: "bx bx-plus-medical", keywords: ["medico","farmacia","remedio","consulta","exame","plano de saude","dentista","academia","gym","saude","hospital"] },
  { key: "educacao",    label: "Educação", icon: "bx bx-book-open", keywords: ["curso","livro","escola","faculdade","udemy","alura","mensalidade"] },
  { key: "lazer",       label: "Lazer", icon: "bx bx-game", keywords: ["cinema","streaming","netflix","spotify","show","viagem","hotel","passeio","jogo","diversao","bar","festa"] },
  { key: "compras",     label: "Compras", icon: "bx bx-shopping-bag", keywords: ["roupa","calcado","eletronico","amazon","shopee","mercado livre","shopping"] },
  { key: "investimentos", label: "Investimentos", icon: "bx bx-trending-up", keywords: ["investimento","poupanca","cdb","acao","fundo","tesouro","reserva"] },
  { key: "salario",     label: "Salário / Renda", icon: "bx bx-wallet", keywords: ["salario","adiantamento","remuneracao","freela","renda","prolabore","comissao","dividendo","lucro"] },
  { key: "outros",      label: "Outros", icon: "bx bx-dots-horizontal", keywords: [] },
];

const normalize = (str) =>
  String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Retorna as categorias personalizadas salvas pelo usuário.
 * @returns {Array<string>}
 */
export function getCustomCategories() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY)) ?? [];
  } catch {
    return [];
  }
}

/**
 * Salva uma nova categoria personalizada.
 * @param {string} name
 */
export function addCustomCategory(name) {
  const clean = name.trim();
  if (!clean) return;
  const list = getCustomCategories();
  const exists = list.some((c) => normalize(c) === normalize(clean)) ||
                 DEFAULT_CATEGORIES.some((c) => normalize(c.label) === normalize(clean) || c.key === clean);
  if (!exists) {
    list.push(clean);
    localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(list));
  }
}

/**
 * Retorna todas as categorias disponíveis (padrão + personalizadas).
 * @param {Array} [existingItems=[]]
 * @returns {Array<{ key: string, label: string, icon: string }>}
 */
export function getAllCategories(existingItems = []) {
  const list = [...DEFAULT_CATEGORIES];
  const customNames = new Set(getCustomCategories());

  // Inclui categorias encontradas nos itens cadastrados que não sejam padrão
  if (Array.isArray(existingItems)) {
    existingItems.forEach((item) => {
      if (item.category && !DEFAULT_CATEGORIES.some((c) => c.key === item.category || c.label === item.category)) {
        customNames.add(item.category);
      }
    });
  }

  customNames.forEach((name) => {
    list.push({
      key: name,
      label: name,
      icon: "bx bx-purchase-tag",
    });
  });

  return list;
}

/**
 * Sugere uma categoria com base na descrição e no tipo.
 * @param {string} desc
 * @param {string} type
 * @returns {string} chave da categoria
 */
export function suggestCategory(desc, type = "Saída") {
  const lower = normalize(desc);

  if (type === "Entrada") {
    if (lower.includes("invest") || lower.includes("rendimento") || lower.includes("dividendo")) {
      return "investimentos";
    }
    return "salario";
  }

  for (const cat of DEFAULT_CATEGORIES) {
    if (cat.key === "outros" || cat.key === "salario") continue;
    if (cat.keywords.some((kw) => lower.includes(normalize(kw)))) {
      return cat.key;
    }
  }

  return "outros";
}

/**
 * Retorna metadados de exibição para qualquer categoria.
 * @param {string} catKeyOrName
 * @returns {{ key: string, label: string, icon: string }}
 */
export function getCategoryMeta(catKeyOrName) {
  if (!catKeyOrName) {
    return { key: "outros", label: "Outros", icon: "bx bx-dots-horizontal" };
  }

  const found = DEFAULT_CATEGORIES.find(
    (c) => c.key === catKeyOrName || normalize(c.label) === normalize(catKeyOrName)
  );

  if (found) return found;

  return {
    key: catKeyOrName,
    label: catKeyOrName,
    icon: "bx bx-purchase-tag",
  };
}

