// ==========================================
// CORE / STATE.JS — Estado global da aplicação
// ==========================================
import { getItems, saveItems } from "./storage.js";

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const state = {
  _items: [],
  _listeners: [],

  get items() {
    return [...this._items];
  },

  load() {
    let migrated = false;
    this._items = getItems().map((item) => {
      if (!item.id) {
        migrated = true;
        return { ...item, id: generateId() };
      }
      return item;
    });

    if (migrated) {
      saveItems(this._items);
    }

    this._notify();
  },

  add(item) {
    const newItem = {
      ...item,
      id: item.id || generateId(),
    };
    this._items.push(newItem);
    saveItems(this._items);
    this._notify();
    return newItem;
  },

  /**
   * Remove um item por ID ou índice (retrocompatível).
   * @param {string|number} idOrIndex
   */
  remove(idOrIndex) {
    if (typeof idOrIndex === "string") {
      this._items = this._items.filter((item) => item.id !== idOrIndex);
    } else {
      this._items.splice(idOrIndex, 1);
    }
    saveItems(this._items);
    this._notify();
  },

  /**
   * Atualiza um item por ID ou índice.
   * @param {string|number} idOrIndex
   * @param {Object} updatedItem
   */
  update(idOrIndex, updatedItem) {
    let index = -1;
    if (typeof idOrIndex === "string") {
      index = this._items.findIndex((item) => item.id === idOrIndex);
    } else {
      index = idOrIndex;
    }

    if (index !== -1 && this._items[index]) {
      this._items[index] = {
        ...this._items[index],
        ...updatedItem,
        id: this._items[index].id,
      };
      saveItems(this._items);
      this._notify();
    }
  },

  /**
   * Retorna um item pelo seu ID único.
   * @param {string} id
   * @returns {Object|undefined}
   */
  getById(id) {
    return this._items.find((item) => item.id === id);
  },

  /**
   * Remove todos os itens cadastrados.
   */
  clearAll() {
    this._items = [];
    saveItems(this._items);
    this._notify();
  },

  /**
   * Remove todos os itens de um determinado tipo.
   * @param {string} type - "Entrada", "Fixo" ou "Variavel"
   */
  removeByType(type) {
    this._items = this._items.filter((item) => item.type !== type);
    saveItems(this._items);
    this._notify();
  },

  subscribe(fn) {
    this._listeners.push(fn);
  },

  _notify() {
    this._listeners.forEach((fn) => fn(this.items));
  },
};

export default state;
