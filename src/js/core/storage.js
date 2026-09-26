// ==========================================
// CORE / STORAGE.JS — Persistência de dados
// ==========================================

const DB_KEY          = "db_items";
const NAME_KEY        = "user_name";
const THEME_KEY       = "app_theme";
const BUDGETS_KEY     = "app_budgets";
const GOALS_KEY       = "app_goals";
const RECURRENCES_KEY = "app_recurrences";

/**
 * Retorna todos os itens salvos no localStorage.
 * @returns {Array}
 */
export const getItems = () =>
  JSON.parse(localStorage.getItem(DB_KEY)) ?? [];

/**
 * Salva a lista de itens no localStorage.
 * @param {Array} items
 */
export const saveItems = (items) =>
  localStorage.setItem(DB_KEY, JSON.stringify(items));

/**
 * Retorna o nome do usuário salvo.
 * @returns {string|null}
 */
export const getUserName = () =>
  localStorage.getItem(NAME_KEY) || null;

/**
 * Salva o nome do usuário.
 * @param {string} name
 */
export const saveUserName = (name) =>
  localStorage.setItem(NAME_KEY, name.trim());

/**
 * Retorna o tema salvo (padrão: "light").
 * @returns {string}
 */
export const getSavedTheme = () =>
  localStorage.getItem(THEME_KEY) || "light";

/**
 * Salva o tema atual.
 * @param {string} theme
 */
export const saveTheme = (theme) =>
  localStorage.setItem(THEME_KEY, theme);

/**
 * Retorna o objeto de orçamentos salvos.
 * @returns {Object} ex: { alimentacao: 500, transporte: 300, ... }
 */
export const getBudgets = () =>
  JSON.parse(localStorage.getItem(BUDGETS_KEY)) ?? {};

/**
 * Salva o objeto de orçamentos.
 * @param {Object} budgets
 */
export const saveBudgets = (budgets) =>
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));

/**
 * Retorna a lista de metas financeiras salvas.
 * @returns {Array}
 */
export const getGoals = () =>
  JSON.parse(localStorage.getItem(GOALS_KEY)) ?? [];

/**
 * Salva a lista de metas financeiras.
 * @param {Array} goals
 */
export const saveGoals = (goals) =>
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));

/**
 * Retorna a lista de lançamentos recorrentes.
 * @returns {Array}
 */
export const getRecurrences = () =>
  JSON.parse(localStorage.getItem(RECURRENCES_KEY)) ?? [];

/**
 * Salva a lista de lançamentos recorrentes.
 * @param {Array} list
 */
export const saveRecurrences = (list) =>
  localStorage.setItem(RECURRENCES_KEY, JSON.stringify(list));
