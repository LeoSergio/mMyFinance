import { getItensBD, setItensBD } from './api/storage.js';
import { renderItem, clearTable, updateTotals } from './components/ui.js';

// Elementos do DOM
const descItem = document.querySelector("#desc");
const amount = document.querySelector("#amount");
const type = document.querySelector("#type");
const btnNew = document.querySelector("#btnNew");

// Estado da Aplicação
let items = getItensBD();

// Função para atualizar a tela toda
const loadItens = () => {
  clearTable();
  items.forEach((item, index) => {
    // Passamos a função deleteItem como callback para a UI
    renderItem(item, index, deleteItem);
  });
  updateTotals(items);
};

// Função para deletar item
const deleteItem = (index) => {
  items.splice(index, 1);
  setItensBD(items);
  loadItens();
};

// Evento de adicionar novo item
btnNew.addEventListener('click', () => {
  if (descItem.value === "" || amount.value === "" || type.value === "") {
    return alert("Preencha todos os campos!");
  }

  items.push({
    desc: descItem.value,
    amount: Math.abs(amount.value).toFixed(2),
    type: type.value,
  });

  setItensBD(items);
  loadItens();

  descItem.value = "";
  amount.value = "";
});

// Expõe a função de impressão para o escopo global (para o onclick do HTML)
window.btnPrint = () => {
  window.print();
};

// Inicializa o app
loadItens();