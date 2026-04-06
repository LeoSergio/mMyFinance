// ==========================================
// CORE / STATE.JS — Estado global da aplicação
// ==========================================
import { getItems, saveItems } from "./storage.js";

const state = {
  _items: [],
  _listeners: [],

  get items() { return [...this._items]; },

  load() {
    this._items = getItems();
    this._notify();
  },

  add(item) {
    this._items.push(item);
    saveItems(this._items);
    this._notify();
  },

  remove(index) {
    this._items.splice(index, 1);
    saveItems(this._items);
    this._notify();
  },

  /**
   * Atualiza um item existente pelo índice.
   * @param {number} index
   * @param {Object} updatedItem
   */
  update(index, updatedItem) {
    this._items[index] = { ...this._items[index], ...updatedItem };
    saveItems(this._items);
    this._notify();
  },

  subscribe(fn) { this._listeners.push(fn); },
  _notify()     { this._listeners.forEach((fn) => fn(this.items)); },
};

export default state;
