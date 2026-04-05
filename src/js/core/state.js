// ==========================================
// CORE / STATE.JS — Estado global da aplicação
// ==========================================
import { getItems, saveItems } from "./storage.js";

/**
 * Estado reativo simples.
 * Acesse os itens via state.items e use os métodos para mutação.
 */
const state = {
  _items: [],
  _listeners: [],

  /** Retorna uma cópia dos itens atuais. */
  get items() {
    return [...this._items];
  },

  /** Carrega os itens do localStorage para a memória. */
  load() {
    this._items = getItems();
    this._notify();
  },

  /**
   * Adiciona um novo item e persiste.
   * @param {Object} item
   */
  add(item) {
    this._items.push(item);
    saveItems(this._items);
    this._notify();
  },

  /**
   * Remove um item pelo índice e persiste.
   * @param {number} index
   */
  remove(index) {
    this._items.splice(index, 1);
    saveItems(this._items);
    this._notify();
  },

  /**
   * Registra um callback chamado a cada mudança de estado.
   * @param {Function} fn
   */
  subscribe(fn) {
    this._listeners.push(fn);
  },

  _notify() {
    this._listeners.forEach((fn) => fn(this.items));
  },
};

export default state;
