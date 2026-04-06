// ==========================================
// MODULES / EXPORT.JS — Exportar dados
// ==========================================

const TYPE_LABELS = { Entrada: "Entrada", Fixo: "Saída Fixa", Variavel: "Saída Variável" };
const CAT_LABELS  = {
  alimentacao: "Alimentação", essencial: "Essenciais", transporte: "Transporte",
  saude: "Saúde", lazer: "Lazer", outros: "Outros",
};

/**
 * Converte a lista de itens para CSV e faz o download.
 * O arquivo pode ser importado diretamente no Google Sheets:
 * Planilhas Google → Arquivo → Importar → Fazer upload do arquivo CSV.
 * @param {Array} items
 */
export function exportToCSV(items) {
  if (!items.length) {
    alert("Nenhum dado para exportar.");
    return;
  }

  const header = ["Data", "Descrição", "Valor (R$)", "Tipo", "Categoria"];

  const rows = [...items]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => {
      const date = new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
      const val  = (item.type === "Entrada" ? "" : "-") + Number(item.amount).toFixed(2);
      const type = TYPE_LABELS[item.type] || item.type;
      const cat  = CAT_LABELS[item.category] || item.category || "Outros";
      // Escapa aspas duplas dentro dos campos
      const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
      return [escape(date), escape(item.desc), val, escape(type), escape(cat)].join(",");
    });

  // Linha de totais no final
  const totalIncome  = items.filter((i) => i.type === "Entrada").reduce((a, i) => a + Number(i.amount), 0);
  const totalExpense = items.filter((i) => i.type !== "Entrada").reduce((a, i) => a + Number(i.amount), 0);
  rows.push(""); // linha em branco
  rows.push(`"","Total Entradas",${totalIncome.toFixed(2)},"",""`);
  rows.push(`"","Total Saídas",-${totalExpense.toFixed(2)},"",""`);
  rows.push(`"","Saldo",${(totalIncome - totalExpense).toFixed(2)},"",""`);

  // BOM para o Google Sheets reconhecer UTF-8 corretamente
  const BOM = "\uFEFF";
  const csv = BOM + [header.join(","), ...rows].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `controle-financeiro-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
