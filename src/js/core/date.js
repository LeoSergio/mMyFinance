// ==========================================
// CORE / DATE.JS — Helpers de data com fuso horário local
// ==========================================

/**
 * Retorna a data no formato YYYY-MM-DD respeitando o fuso horário local.
 * Evita o bug de adiantamento de dia que ocorre com toISOString() em horários noturnos.
 * @param {Date} [d=new Date()]
 * @returns {string} ex: "2026-11-13"
 */
export function getLocalDateString(d = new Date()) {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o mês no formato YYYY-MM respeitando o fuso horário local.
 * @param {Date} [d=new Date()]
 * @returns {string} ex: "2026-11"
 */
export function getLocalMonthString(d = new Date()) {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

