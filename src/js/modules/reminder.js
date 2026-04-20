// ==========================================
// MODULES / REMINDER.JS — Lembretes via notificação
// ==========================================

const REMINDERS_KEY = "app_reminders";

// ── Storage ───────────────────────────────────────────────────────

export function getReminders() {
  return JSON.parse(localStorage.getItem(REMINDERS_KEY)) ?? [];
}

function saveReminders(list) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
}

// ── Agenda lembrete para item com data futura ─────────────────────

/**
 * Cria um lembrete se o item tiver data posterior a hoje.
 * @param {{ date: string, desc: string, amount: string, type: string }} item
 * @param {number} index - índice do item no array de state
 */
export function scheduleReminder(item, index) {
  const today = new Date().toISOString().slice(0, 10);
  if (item.date <= today) return;

  const list = getReminders();
  const id   = `${index}-${item.date}-${item.desc}`;

  // Evita duplicata
  if (list.find((r) => r.id === id)) return;

  list.push({
    id,
    index,
    date:      item.date,
    desc:      item.desc,
    amount:    item.amount,
    type:      item.type,
    notified:  false,
  });

  saveReminders(list);
}

// ── Remove lembrete de item excluído ──────────────────────────────

export function removeReminderByIndex(index) {
  const list = getReminders().filter((r) => r.index !== index);
  saveReminders(list);
}

// ── Permissão ─────────────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied")  return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// ── Dispara notificação ───────────────────────────────────────────

async function fireNotification(reminder) {
  const typeLabel =
    reminder.type === "Entrada"  ? "Entrada" :
    reminder.type === "Fixo"     ? "Saída Fixa" : "Saída Variável";

  const title   = "💰 Lembrete — Controle Financeiro";
  const body    = `${typeLabel}: ${reminder.desc}  •  R$ ${Number(reminder.amount).toFixed(2)}`;
  const options = {
    body,
    icon:    "./src/assets/icon-192.png",
    badge:   "./src/assets/icon-192.png",
    tag:     reminder.id,
    vibrate: [200, 100, 200],
    data:    { url: "./index.html" },
    actions: [
      { action: "abrir", title: "Abrir app" },
      { action: "ok",    title: "Dispensar"  },
    ],
  };

  // Usa service worker para notificação persistente (melhor no mobile)
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      reg.showNotification(title, options);
      return;
    }
  }

  // Fallback direto
  new Notification(title, options);
}

// ── Verifica lembretes pendentes ──────────────────────────────────

export async function checkReminders() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const today   = new Date().toISOString().slice(0, 10);
  const list    = getReminders();
  let   changed = false;

  for (const r of list) {
    if (!r.notified && r.date <= today) {
      await fireNotification(r);
      r.notified = true;
      changed    = true;
    }
  }

  if (changed) saveReminders(list);
}

// ── Inicialização ─────────────────────────────────────────────────

export async function initReminders() {
  if (!("Notification" in window)) return false;

  const granted = await requestNotificationPermission();

  if (granted) {
    await checkReminders();
    // Verifica a cada hora enquanto o app estiver aberto
    setInterval(checkReminders, 60 * 60 * 1000);
  }

  return granted;
}
