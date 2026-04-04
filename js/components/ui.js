const tbody = document.querySelector("tbody");
const incomesElement = document.querySelector(".incomes");
const expensesElement = document.querySelector(".expenses");
const totalElement = document.querySelector(".total");

// Renderiza uma linha da tabela
export const renderItem = (item, index, deleteCallback) => {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${item.desc}</td>
    <td>R$ ${item.amount}</td>
    <td class="columnType">${
      item.type === "Entrada"
        ? '<i class="bx bxs-chevron-up-circle"></i>'
        : '<i class="bx bxs-chevron-down-circle"></i>'
    }</td>
    <td class="columnAction">
      <button class="btn-delete" data-index="${index}"><i class='bx bx-trash'></i></button>
    </td>
  `;

  tbody.appendChild(tr);

  // Atribui o evento de deletar dinamicamente ao botão recém-criado
  const btnDelete = tr.querySelector('.btn-delete');
  btnDelete.addEventListener('click', () => deleteCallback(index));
};

export const clearTable = () => {
  tbody.innerHTML = "";
};

// Calcula e atualiza os cards de resumo
export const updateTotals = (items) => {
  const amountIncomes = items
    .filter((item) => item.type === "Entrada")
    .map((transaction) => Number(transaction.amount));

  const amountExpenses = items
    .filter((item) => item.type === "Saída")
    .map((transaction) => Number(transaction.amount));

  const totalIncomes = amountIncomes.reduce((acc, cur) => acc + cur, 0).toFixed(2);
  const totalExpenses = Math.abs(amountExpenses.reduce((acc, cur) => acc + cur, 0)).toFixed(2);
  const totalItems = (totalIncomes - totalExpenses).toFixed(2);

  incomesElement.innerHTML = totalIncomes;
  expensesElement.innerHTML = totalExpenses;
  totalElement.innerHTML = totalItems;
};