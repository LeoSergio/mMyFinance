// ==========================================
// CORE / STORAGE.JS — Persistência de dados
// ==========================================

const DB_KEY = "db_items";
const NAME_KEY = "user_name";
const THEME_KEY = "app_theme";

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
